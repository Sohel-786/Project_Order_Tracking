using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using net_backend.Data;
using net_backend.DTOs;
using net_backend.Models;
using net_backend.Services;

namespace net_backend.Controllers
{
    [Route("api/orders")]
    public class OrdersController : BaseController
    {
        private readonly ICodeGeneratorService _codes;

        public OrdersController(ApplicationDbContext context, ICodeGeneratorService codes) : base(context)
        {
            _codes = codes;
        }

        // ───────── DTOs

        public class CreateOrderItemDto
        {
            public int ProductId { get; set; }
            public int QuantityOrdered { get; set; } = 1;
            /// <summary>Existing BOM id to use; if null and InlineBom is provided, it will be created and linked.</summary>
            public int? BomId { get; set; }
            public BomController.CreateBomDto? InlineBom { get; set; }
            public string? Remarks { get; set; }
        }

        public class CreateOrderDto
        {
            public int CustomerId { get; set; }
            public DateTime? OrderDate { get; set; }
            public DateTime? RequiredDeliveryDate { get; set; }
            public string? Notes { get; set; }
            public List<CreateOrderItemDto> Items { get; set; } = new();
        }

        // ───────── List / single

        [HttpGet]
        public async Task<ActionResult<ApiResponse<IEnumerable<object>>>> GetAll(
            [FromQuery] string? search = null,
            [FromQuery] OrderStatus? status = null,
            [FromQuery] int? customerId = null,
            [FromQuery] bool? activeOnly = null,
            [FromQuery] int? page = null,
            [FromQuery] int? pageSize = null)
        {
            if (!await HasPermissionAsync(nameof(UserPermission.ViewOrder)) && !await IsAdminAsync()) return Forbidden();

            var q = _context.Orders.AsNoTracking().Include(o => o.Customer).AsQueryable();
            if (status.HasValue)     q = q.Where(o => o.Status == status);
            if (customerId.HasValue) q = q.Where(o => o.CustomerId == customerId);
            if (activeOnly == true)  q = q.Where(o => o.IsActive);
            if (!string.IsNullOrWhiteSpace(search))
            {
                var s = search.Trim().ToLower();
                q = q.Where(o => o.OrderNumber.ToLower().Contains(s) ||
                                 (o.Customer != null && o.Customer.PartyName.ToLower().Contains(s)));
            }
            q = q.OrderByDescending(o => o.Id);
            var total = await q.CountAsync();
            if (page.HasValue && pageSize.HasValue && page.Value > 0 && pageSize.Value > 0)
                q = q.Skip((page.Value - 1) * pageSize.Value).Take(pageSize.Value);

            var list = await q.Select(o => new
            {
                o.Id, o.OrderNumber, o.OrderDate, o.RequiredDeliveryDate, o.Notes, o.Status, o.IsActive, o.CreatedAt, o.UpdatedAt,
                o.CustomerId,
                CustomerName = o.Customer != null ? o.Customer.PartyName : null,
                ItemCount = _context.OrderItems.Count(oi => oi.OrderId == o.Id),
                TotalOrderedQty = _context.OrderItems.Where(oi => oi.OrderId == o.Id).Sum(oi => (int?)oi.QuantityOrdered) ?? 0,
                TotalProducedQty = _context.OrderItems.Where(oi => oi.OrderId == o.Id).Sum(oi => (int?)oi.ProducedQty) ?? 0,
                TotalDeliveredQty = _context.OrderItems.Where(oi => oi.OrderId == o.Id).Sum(oi => (int?)oi.DeliveredQty) ?? 0,
            }).ToListAsync();

            return Ok(new ApiResponse<IEnumerable<object>> { Data = list, TotalCount = total });
        }

        [HttpGet("{id:int}")]
        public async Task<ActionResult<ApiResponse<object>>> GetById(int id)
        {
            var o = await _context.Orders.AsNoTracking()
                .Include(o => o.Customer)
                .Include(o => o.Items).ThenInclude(oi => oi.Product)
                .Include(o => o.Items).ThenInclude(oi => oi.Bom)
                .Include(o => o.Items).ThenInclude(oi => oi.BomPlan).ThenInclude(p => p.Item)
                .Include(o => o.Items).ThenInclude(oi => oi.BomPlan).ThenInclude(p => p.Unit)
                .FirstOrDefaultAsync(o => o.Id == id);
            if (o == null) return NotFoundResponse("Order not found.");

            return Ok(new ApiResponse<object> { Data = new
            {
                o.Id, o.OrderNumber, o.OrderDate, o.RequiredDeliveryDate, o.Notes, o.Status, o.IsActive, o.CreatedAt, o.UpdatedAt,
                o.CustomerId,
                CustomerName = o.Customer?.PartyName,
                CustomerContact = o.Customer?.MobileNumber,
                Items = o.Items.Select(oi => new
                {
                    oi.Id, oi.ProductId,
                    ProductCode = oi.Product?.ProductCode,
                    ProductName = oi.Product?.ProductName,
                    oi.QuantityOrdered, oi.ProducedQty, oi.DeliveredQty,
                    oi.BomId,
                    BomVersion = oi.Bom?.BomVersion,
                    oi.Remarks,
                    BomPlan = oi.BomPlan.OrderBy(p => p.Sequence).Select(p => new
                    {
                        p.Id, p.BomItemId, p.ItemId,
                        ItemCode = p.Item?.ItemCode,
                        ItemName = p.Item?.ItemName,
                        p.RequiredQuantity,
                        p.UnitId,
                        UnitSymbol = p.Unit?.Symbol,
                        p.Sequence,
                        p.IndentedQty, p.OrderedQty, p.InwardedQty,
                        p.QcApprovedQty, p.QcReworkQty, p.QcRejectedQty,
                        p.JobWorkSentQty, p.ReadyQty, p.ConsumedQty,
                        p.FirstActivityAt, p.LastActivityAt,
                    }),
                }),
            }});
        }

        [HttpGet("next-code")]
        public async Task<ActionResult<ApiResponse<string>>> NextCode()
        {
            var seq = await _context.CodeSequences.FirstOrDefaultAsync(s => s.Key == "ORDER");
            var next = seq?.NextNumber ?? 1;
            return Ok(new ApiResponse<string> { Data = $"ORD-{next:D6}" });
        }

        // ───────── Create

        [HttpPost]
        public async Task<ActionResult<ApiResponse<object>>> Create([FromBody] CreateOrderDto body)
        {
            if (!await HasPermissionAsync(nameof(UserPermission.CreateOrder)) && !await IsAdminAsync()) return Forbidden();
            if (body.CustomerId <= 0)   return BadResponse("Customer is required.");
            if (body.Items.Count == 0)  return BadResponse("At least one order item is required.");

            var customer = await _context.Parties.FirstOrDefaultAsync(p => p.Id == body.CustomerId);
            if (customer == null) return BadResponse("Customer not found.");

            await using var tx = await _context.Database.BeginTransactionAsync();
            try
            {
                var orderNo = await _codes.GenerateCodeAsync("ORDER");
                var order = new Order
                {
                    OrderNumber = orderNo,
                    OrderDate = body.OrderDate ?? DateTime.Now,
                    CustomerId = body.CustomerId,
                    RequiredDeliveryDate = body.RequiredDeliveryDate,
                    Notes = body.Notes?.Trim(),
                    Status = OrderStatus.Pending,
                    CreatedBy = CurrentUserId,
                };
                _context.Orders.Add(order);
                await _context.SaveChangesAsync();

                foreach (var oi in body.Items)
                {
                    if (oi.QuantityOrdered <= 0) return BadResponse("Quantity ordered must be > 0.");
                    var product = await _context.Products.FirstOrDefaultAsync(p => p.Id == oi.ProductId);
                    if (product == null) return BadResponse($"Product {oi.ProductId} not found.");

                    int? bomId = oi.BomId;
                    if (!bomId.HasValue && oi.InlineBom != null)
                    {
                        oi.InlineBom.ProductId = product.Id;
                        if (string.IsNullOrWhiteSpace(oi.InlineBom.BomVersion))
                        {
                            var nextVersion = await _context.Boms.CountAsync(b => b.ProductId == product.Id) + 1;
                            oi.InlineBom.BomVersion = $"v{nextVersion}";
                        }
                        var bom = new Bom
                        {
                            ProductId = product.Id,
                            BomVersion = oi.InlineBom.BomVersion.Trim(),
                            Status = oi.InlineBom.Status,
                            Remarks = oi.InlineBom.Remarks?.Trim(),
                            IsActive = true,
                            CreatedBy = CurrentUserId,
                        };
                        _context.Boms.Add(bom);
                        await _context.SaveChangesAsync();

                        int seq = 0;
                        foreach (var it in oi.InlineBom.Items)
                        {
                            seq++;
                            var bi = new BomItem
                            {
                                BomId = bom.Id,
                                ItemId = it.ItemId,
                                QuantityPerProduct = it.QuantityPerProduct,
                                UnitId = it.UnitId,
                                Sequence = it.Sequence == 0 ? seq : it.Sequence,
                                Remarks = it.Remarks?.Trim(),
                            };
                            _context.BomItems.Add(bi);
                            await _context.SaveChangesAsync();
                            int procSeq = 0;
                            foreach (var pid in it.ProcessIds.Distinct())
                            {
                                procSeq++;
                                _context.BomItemProcesses.Add(new BomItemProcess { BomItemId = bi.Id, ProcessId = pid, Sequence = procSeq });
                            }
                        }
                        await _context.SaveChangesAsync();
                        bomId = bom.Id;
                    }

                    if (!bomId.HasValue) return BadResponse($"Either an existing BOM or an inline BOM is required for product '{product.ProductName}'.");

                    var orderItem = new OrderItem
                    {
                        OrderId = order.Id,
                        ProductId = product.Id,
                        QuantityOrdered = oi.QuantityOrdered,
                        BomId = bomId,
                        Remarks = oi.Remarks?.Trim(),
                        ProductCodeSnapshot = product.ProductCode,
                        ProductNameSnapshot = product.ProductName,
                    };
                    _context.OrderItems.Add(orderItem);
                    await _context.SaveChangesAsync();

                    // Materialise BOM plan
                    var bomItems = await _context.BomItems
                        .Include(b => b.Item)
                        .Where(b => b.BomId == bomId).OrderBy(b => b.Sequence).ToListAsync();
                    foreach (var bi in bomItems)
                    {
                        var plan = new OrderBomItemPlan
                        {
                            OrderItemId = orderItem.Id,
                            BomItemId = bi.Id,
                            ItemId = bi.ItemId,
                            RequiredQuantity = bi.QuantityPerProduct * oi.QuantityOrdered,
                            UnitId = bi.UnitId,
                            Sequence = bi.Sequence,
                            ItemNameSnapshot = bi.Item?.ItemName,
                            ItemCodeSnapshot = bi.Item?.ItemCode,
                        };
                        _context.OrderBomItemPlans.Add(plan);
                    }
                    await _context.SaveChangesAsync();
                }

                await tx.CommitAsync();
                return await GetById(order.Id);
            }
            catch (Exception ex)
            {
                await tx.RollbackAsync();
                return StatusCode(500, new ApiResponse<object> { Success = false, Message = ex.Message });
            }
        }

        // ───────── Update (limited; cannot change items once any procurement has started)

        public class UpdateOrderDto
        {
            public int CustomerId { get; set; }
            public DateTime? OrderDate { get; set; }
            public DateTime? RequiredDeliveryDate { get; set; }
            public string? Notes { get; set; }
        }

        [HttpPut("{id:int}")]
        public async Task<ActionResult<ApiResponse<object>>> Update(int id, [FromBody] UpdateOrderDto body)
        {
            if (!await HasPermissionAsync(nameof(UserPermission.EditOrder)) && !await IsAdminAsync()) return Forbidden();
            var order = await _context.Orders.FirstOrDefaultAsync(o => o.Id == id);
            if (order == null) return NotFoundResponse("Order not found.");

            order.CustomerId = body.CustomerId > 0 ? body.CustomerId : order.CustomerId;
            order.OrderDate  = body.OrderDate ?? order.OrderDate;
            order.RequiredDeliveryDate = body.RequiredDeliveryDate;
            order.Notes = body.Notes?.Trim();
            order.UpdatedAt = DateTime.Now;
            await _context.SaveChangesAsync();
            return await GetById(id);
        }

        [HttpPatch("{id:int}/active")]
        public async Task<ActionResult<ApiResponse<object>>> ToggleActive(int id, [FromBody] UpdateMasterRequest body)
        {
            if (!await HasPermissionAsync(nameof(UserPermission.EditOrder)) && !await IsAdminAsync()) return Forbidden();
            var order = await _context.Orders.FirstOrDefaultAsync(o => o.Id == id);
            if (order == null) return NotFoundResponse("Order not found.");
            order.IsActive = body.IsActive;
            order.UpdatedAt = DateTime.Now;
            await _context.SaveChangesAsync();
            return Ok(new ApiResponse<object> { Data = new { id, isActive = order.IsActive } });
        }

        // ───────── Order plan lookup (used by PI/PO/Production creation)

        [HttpGet("plans/by-order/{orderId:int}")]
        public async Task<ActionResult<ApiResponse<IEnumerable<object>>>> GetOrderPlans(int orderId)
        {
            var plans = await _context.OrderBomItemPlans.AsNoTracking()
                .Include(p => p.OrderItem).ThenInclude(oi => oi!.Product)
                .Include(p => p.Item)
                .Include(p => p.Unit)
                .Where(p => p.OrderItem != null && p.OrderItem.OrderId == orderId)
                .OrderBy(p => p.OrderItemId).ThenBy(p => p.Sequence)
                .ToListAsync();
            return Ok(new ApiResponse<IEnumerable<object>> { Data = plans.Select(p => new
            {
                p.Id, p.OrderItemId, p.BomItemId, p.ItemId,
                ItemCode = p.Item?.ItemCode,
                ItemName = p.Item?.ItemName,
                ProductId = p.OrderItem?.ProductId,
                ProductName = p.OrderItem?.Product?.ProductName,
                p.RequiredQuantity, p.UnitId, UnitSymbol = p.Unit?.Symbol,
                p.IndentedQty, p.OrderedQty, p.InwardedQty,
                p.QcApprovedQty, p.QcReworkQty, p.QcRejectedQty,
                p.JobWorkSentQty, p.ReadyQty, p.ConsumedQty,
                PendingIndent = Math.Max(0, p.RequiredQuantity - p.IndentedQty),
                PendingOrder = Math.Max(0, p.IndentedQty - p.OrderedQty),
                PendingInward = Math.Max(0, p.OrderedQty - p.InwardedQty),
                PendingQc = Math.Max(0, p.InwardedQty - (p.QcApprovedQty + p.QcReworkQty + p.QcRejectedQty)),
            }) });
        }

        // ───────── Recompute order item status (called after any movement)
        public static async Task RecomputeOrderItemAggregatesAsync(ApplicationDbContext context, int orderItemId)
        {
            var item = await context.OrderItems.Include(oi => oi.Order)
                .FirstOrDefaultAsync(oi => oi.Id == orderItemId);
            if (item == null) return;

            // ProducedQty / DeliveredQty come from Production/Delivery line totals
            item.ProducedQty = await context.ProductionEntries
                .Where(p => p.OrderItemId == orderItemId && p.IsActive)
                .SumAsync(p => (int?)p.ProducedQty) ?? 0;
            item.DeliveredQty = await context.DeliveryChallanItems
                .Where(d => d.OrderItemId == orderItemId && d.DeliveryChallan!.IsActive)
                .SumAsync(d => (int?)d.DispatchQuantity) ?? 0;
            await context.SaveChangesAsync();

            // Recompute order status
            if (item.Order == null) return;
            var allItems = await context.OrderItems.AsNoTracking().Where(oi => oi.OrderId == item.OrderId).ToListAsync();
            var totalOrdered  = allItems.Sum(x => x.QuantityOrdered);
            var totalProduced = allItems.Sum(x => x.ProducedQty);
            var totalDelivered = allItems.Sum(x => x.DeliveredQty);

            OrderStatus newStatus;
            if (totalDelivered >= totalOrdered && totalOrdered > 0)        newStatus = OrderStatus.FullyDelivered;
            else if (totalDelivered > 0)                                    newStatus = OrderStatus.PartiallyDelivered;
            else if (totalProduced > 0)                                     newStatus = OrderStatus.InProduction;
            else
            {
                var planQ = context.OrderBomItemPlans.AsNoTracking()
                    .Where(p => p.OrderItem != null && p.OrderItem.OrderId == item.OrderId);
                var hasMovement = await planQ.AnyAsync(p => p.IndentedQty > 0 || p.OrderedQty > 0 || p.InwardedQty > 0 || p.ReadyQty > 0);
                newStatus = hasMovement ? OrderStatus.InProcurement : OrderStatus.Pending;
            }

            var order = await context.Orders.FirstOrDefaultAsync(o => o.Id == item.OrderId);
            if (order != null && order.Status != newStatus)
            {
                order.Status = newStatus;
                order.UpdatedAt = DateTime.Now;
                await context.SaveChangesAsync();
            }
        }
    }
}
