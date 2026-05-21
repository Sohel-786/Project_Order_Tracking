using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using net_backend.Data;
using net_backend.DTOs;
using net_backend.Models;
using net_backend.Services;

namespace net_backend.Controllers
{
    [Route("api/productions")]
    public class ProductionController : BaseController
    {
        private readonly ICodeGeneratorService _codes;
        public ProductionController(ApplicationDbContext context, ICodeGeneratorService codes) : base(context) { _codes = codes; }

        public class CreateConsumptionDto
        {
            public int OrderBomItemPlanId { get; set; }
            public decimal QuantityConsumed { get; set; }
        }

        public class CreateProductionDto
        {
            public int OrderId { get; set; }
            public int OrderItemId { get; set; }
            public int PlannedQty { get; set; }
            public int ProducedQty { get; set; }
            public DateTime? ProductionDate { get; set; }
            public string? Remarks { get; set; }
            public List<CreateConsumptionDto> Consumptions { get; set; } = new();
        }

        [HttpGet]
        public async Task<ActionResult<ApiResponse<IEnumerable<object>>>> GetAll(
            [FromQuery] string? search = null,
            [FromQuery] int? orderId = null,
            [FromQuery] bool? activeOnly = null,
            [FromQuery] int? page = null,
            [FromQuery] int? pageSize = null)
        {
            if (!await HasPermissionAsync(nameof(UserPermission.ViewProduction)) && !await IsAdminAsync()) return Forbidden();
            var q = _context.ProductionEntries.AsNoTracking()
                .Include(p => p.Order).Include(p => p.Product).Include(p => p.Creator).AsQueryable();
            if (orderId.HasValue)   q = q.Where(p => p.OrderId == orderId);
            if (activeOnly == true) q = q.Where(p => p.IsActive);
            if (!string.IsNullOrWhiteSpace(search))
            {
                var s = search.Trim().ToLower();
                q = q.Where(p => p.ProductionNo.ToLower().Contains(s)
                              || (p.Order != null && p.Order.OrderNumber.ToLower().Contains(s)));
            }
            q = q.OrderByDescending(p => p.Id);
            var total = await q.CountAsync();
            if (page.HasValue && pageSize.HasValue && page.Value > 0 && pageSize.Value > 0)
                q = q.Skip((page.Value - 1) * pageSize.Value).Take(pageSize.Value);

            var list = await q.Select(p => new
            {
                p.Id, p.ProductionNo, p.ProductionDate, p.PlannedQty, p.ProducedQty, p.Status, p.Remarks,
                p.OrderId, OrderNumber = p.Order != null ? p.Order.OrderNumber : null,
                p.OrderItemId,
                p.ProductId, ProductName = p.Product != null ? p.Product.ProductName : null,
                p.CreatedAt, p.IsActive,
                CreatedByName = p.Creator != null ? p.Creator.FirstName + " " + p.Creator.LastName : null,
            }).ToListAsync();
            return Ok(new ApiResponse<IEnumerable<object>> { Data = list, TotalCount = total });
        }

        [HttpGet("{id:int}")]
        public async Task<ActionResult<ApiResponse<object>>> GetById(int id)
        {
            var p = await _context.ProductionEntries.AsNoTracking()
                .Include(x => x.Order).Include(x => x.Product).Include(x => x.OrderItem)
                .Include(x => x.Consumptions).ThenInclude(c => c.Item)
                .Include(x => x.Consumptions).ThenInclude(c => c.OrderBomItemPlan)
                .FirstOrDefaultAsync(x => x.Id == id);
            if (p == null) return NotFoundResponse("Production entry not found.");
            return Ok(new ApiResponse<object> { Data = new
            {
                p.Id, p.ProductionNo, p.ProductionDate, p.PlannedQty, p.ProducedQty, p.Status, p.Remarks,
                p.OrderId, OrderNumber = p.Order?.OrderNumber,
                p.OrderItemId,
                p.ProductId, ProductName = p.Product?.ProductName, ProductCode = p.Product?.ProductCode,
                p.CreatedAt, p.UpdatedAt, p.IsActive,
                Consumptions = p.Consumptions.Select(c => new
                {
                    c.Id, c.OrderBomItemPlanId, c.ItemId,
                    ItemCode = c.Item?.ItemCode, ItemName = c.Item?.ItemName,
                    c.QuantityConsumed,
                }),
            }});
        }

        [HttpGet("next-code")]
        public async Task<ActionResult<ApiResponse<string>>> NextCode()
        {
            var seq = await _context.CodeSequences.FirstOrDefaultAsync(s => s.Key == "PROD");
            var next = seq?.NextNumber ?? 1;
            return Ok(new ApiResponse<string> { Data = $"PRDN-{next:D4}" });
        }

        [HttpPost]
        public async Task<ActionResult<ApiResponse<object>>> Create([FromBody] CreateProductionDto body)
        {
            if (!await HasPermissionAsync(nameof(UserPermission.CreateProduction)) && !await IsAdminAsync()) return Forbidden();
            if (body.OrderItemId <= 0)  return BadResponse("OrderItem is required.");
            if (body.ProducedQty <= 0)  return BadResponse("Produced quantity must be > 0.");

            var orderItem = await _context.OrderItems.Include(o => o.Order).Include(o => o.Product)
                .FirstOrDefaultAsync(o => o.Id == body.OrderItemId);
            if (orderItem == null) return BadResponse("Order item not found.");
            if (orderItem.Order == null) return BadResponse("Order not found.");

            // Block over-production
            var producedSoFar = await _context.ProductionEntries.Where(p => p.OrderItemId == body.OrderItemId && p.IsActive).SumAsync(p => (int?)p.ProducedQty) ?? 0;
            if (producedSoFar + body.ProducedQty > orderItem.QuantityOrdered)
                return BadResponse($"Cannot produce more than ordered ({orderItem.QuantityOrdered}). Already produced {producedSoFar}.");

            await using var tx = await _context.Database.BeginTransactionAsync();
            try
            {
                var pNo = await _codes.GenerateCodeAsync("PROD");
                var entry = new ProductionEntry
                {
                    ProductionNo = pNo,
                    ProductionDate = body.ProductionDate ?? DateTime.Now,
                    OrderId = orderItem.OrderId,
                    OrderItemId = orderItem.Id,
                    ProductId = orderItem.ProductId,
                    PlannedQty = body.PlannedQty == 0 ? body.ProducedQty : body.PlannedQty,
                    ProducedQty = body.ProducedQty,
                    Status = ProductionStatus.Confirmed,
                    Remarks = body.Remarks?.Trim(),
                    OrderNumberSnapshot = orderItem.Order.OrderNumber,
                    ProductNameSnapshot = orderItem.Product?.ProductName,
                    ProductCodeSnapshot = orderItem.Product?.ProductCode,
                    CreatedBy = CurrentUserId,
                    IsActive = true,
                };
                _context.ProductionEntries.Add(entry);
                await _context.SaveChangesAsync();

                foreach (var c in body.Consumptions)
                {
                    if (c.QuantityConsumed <= 0) continue;
                    var plan = await _context.OrderBomItemPlans.Include(p => p.Item).FirstOrDefaultAsync(p => p.Id == c.OrderBomItemPlanId);
                    if (plan == null) return BadResponse($"BOM plan {c.OrderBomItemPlanId} not found.");
                    var available = plan.ReadyQty - plan.ConsumedQty;
                    if (c.QuantityConsumed > available)
                        return BadResponse($"Insufficient ready stock for {plan.ItemNameSnapshot}. Available: {available}, requested: {c.QuantityConsumed}");

                    _context.ProductionConsumptions.Add(new ProductionConsumption
                    {
                        ProductionEntryId = entry.Id,
                        OrderBomItemPlanId = plan.Id,
                        ItemId = plan.ItemId,
                        QuantityConsumed = c.QuantityConsumed,
                        ItemCodeSnapshot = plan.Item?.ItemCode,
                        ItemNameSnapshot = plan.Item?.ItemName,
                    });
                    plan.ConsumedQty += c.QuantityConsumed;
                    plan.LastActivityAt = DateTime.Now;
                }
                await _context.SaveChangesAsync();
                await tx.CommitAsync();

                await OrdersController.RecomputeOrderItemAggregatesAsync(_context, orderItem.Id);
                return await GetById(entry.Id);
            }
            catch (Exception ex)
            {
                await tx.RollbackAsync();
                return StatusCode(500, new ApiResponse<object> { Success = false, Message = ex.Message });
            }
        }

        [HttpPatch("{id:int}/active")]
        public async Task<ActionResult<ApiResponse<object>>> ToggleActive(int id, [FromBody] UpdateMasterRequest body)
        {
            if (!await HasPermissionAsync(nameof(UserPermission.EditProduction)) && !await IsAdminAsync()) return Forbidden();
            var p = await _context.ProductionEntries.FirstOrDefaultAsync(x => x.Id == id);
            if (p == null) return NotFoundResponse("Production entry not found.");
            p.IsActive = body.IsActive;
            p.UpdatedAt = DateTime.Now;
            await _context.SaveChangesAsync();
            await OrdersController.RecomputeOrderItemAggregatesAsync(_context, p.OrderItemId);
            return Ok(new ApiResponse<object> { Data = new { id, isActive = p.IsActive } });
        }
    }
}
