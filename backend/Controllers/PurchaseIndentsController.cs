using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using net_backend.Data;
using net_backend.DTOs;
using net_backend.Models;
using net_backend.Services;

namespace net_backend.Controllers
{
    [Route("api/purchase-indents")]
    public class PurchaseIndentsController : BaseController
    {
        private readonly ICodeGeneratorService _codes;

        public PurchaseIndentsController(ApplicationDbContext context, ICodeGeneratorService codes) : base(context)
        {
            _codes = codes;
        }

        public class CreatePiItemDto
        {
            public int? OrderItemId { get; set; }
            public int? OrderBomItemPlanId { get; set; }
            public int ItemId { get; set; }
            public decimal Quantity { get; set; } = 1m;
            public int? UnitId { get; set; }
            public string? Remarks { get; set; }
        }

        public class CreatePiDto
        {
            public PurchaseIndentFor IndentFor { get; set; } = PurchaseIndentFor.PurchaseOrder;
            public PurchaseIndentType Type { get; set; } = PurchaseIndentType.New;
            public PurchaseIndentPriority Priority { get; set; } = PurchaseIndentPriority.Normal;
            public string? Remarks { get; set; }
            public DateTime? ReqDateOfDelivery { get; set; }
            public bool MtcReq { get; set; }
            public List<CreatePiItemDto> Items { get; set; } = new();
        }

        // ───────── List

        [HttpGet]
        public async Task<ActionResult<ApiResponse<IEnumerable<object>>>> GetAll(
            [FromQuery] string? search = null,
            [FromQuery] PurchaseIndentStatus? status = null,
            [FromQuery] PurchaseIndentFor? indentFor = null,
            [FromQuery] bool? activeOnly = null,
            [FromQuery] int? page = null,
            [FromQuery] int? pageSize = null)
        {
            if (!await HasPermissionAsync(nameof(UserPermission.ViewPI)) && !await IsAdminAsync()) return Forbidden();

            var q = _context.PurchaseIndents.AsNoTracking()
                .Include(p => p.Creator)
                .Include(p => p.Approver)
                .AsQueryable();
            if (status.HasValue)    q = q.Where(p => p.Status == status);
            if (indentFor.HasValue) q = q.Where(p => p.IndentFor == indentFor);
            if (activeOnly == true) q = q.Where(p => p.IsActive);
            if (!string.IsNullOrWhiteSpace(search))
                q = q.Where(p => p.PiNo.ToLower().Contains(search.Trim().ToLower()));
            q = q.OrderByDescending(p => p.Id);
            var total = await q.CountAsync();
            if (page.HasValue && pageSize.HasValue && page.Value > 0 && pageSize.Value > 0)
                q = q.Skip((page.Value - 1) * pageSize.Value).Take(pageSize.Value);

            var list = await q.Select(p => new
            {
                p.Id, p.PiNo, p.IndentFor, p.Type, p.Priority, p.Status, p.Remarks, p.ReqDateOfDelivery, p.MtcReq,
                p.DocumentNo, p.RevisionNo, p.RevisionDate, p.CreatedAt, p.ApprovedAt, p.IsActive,
                CreatedByName = p.Creator != null ? p.Creator.FirstName + " " + p.Creator.LastName : null,
                ApprovedByName = p.Approver != null ? p.Approver.FirstName + " " + p.Approver.LastName : null,
                ItemCount = _context.PurchaseIndentItems.Count(pi => pi.PurchaseIndentId == p.Id),
                TotalQty = _context.PurchaseIndentItems.Where(pi => pi.PurchaseIndentId == p.Id).Sum(pi => (decimal?)pi.Quantity) ?? 0,
            }).ToListAsync();

            return Ok(new ApiResponse<IEnumerable<object>> { Data = list, TotalCount = total });
        }

        [HttpGet("{id:int}")]
        public async Task<ActionResult<ApiResponse<object>>> GetById(int id)
        {
            var pi = await _context.PurchaseIndents.AsNoTracking()
                .Include(p => p.Creator).Include(p => p.Approver)
                .Include(p => p.Items).ThenInclude(it => it.Item)
                .Include(p => p.Items).ThenInclude(it => it.Unit)
                .Include(p => p.Items).ThenInclude(it => it.OrderItem).ThenInclude(oi => oi!.Order)
                .Include(p => p.Items).ThenInclude(it => it.OrderItem).ThenInclude(oi => oi!.Product)
                .FirstOrDefaultAsync(p => p.Id == id);
            if (pi == null) return NotFoundResponse("Purchase indent not found.");

            return Ok(new ApiResponse<object> { Data = new
            {
                pi.Id, pi.PiNo, pi.IndentFor, pi.Type, pi.Priority, pi.Status, pi.Remarks, pi.ReqDateOfDelivery, pi.MtcReq,
                pi.DocumentNo, pi.RevisionNo, pi.RevisionDate, pi.CreatedAt, pi.UpdatedAt, pi.ApprovedAt, pi.IsActive,
                CreatedByName = pi.Creator != null ? pi.Creator.FirstName + " " + pi.Creator.LastName : null,
                ApprovedByName = pi.Approver != null ? pi.Approver.FirstName + " " + pi.Approver.LastName : null,
                Items = pi.Items.Select(it => new
                {
                    it.Id, it.ItemId,
                    it.OrderItemId, it.OrderBomItemPlanId,
                    OrderNumber = it.OrderItem?.Order?.OrderNumber,
                    ProductName = it.OrderItem?.Product?.ProductName,
                    ItemCode = it.Item?.ItemCode,
                    ItemName = it.Item?.ItemName,
                    it.Quantity, it.UnitId, UnitSymbol = it.Unit?.Symbol,
                    it.ItemNameSnapshot, it.ItemCodeSnapshot, it.DrawingNoSnapshot, it.RevisionNoSnapshot,
                    it.OrderNumberSnapshot, it.ProductNameSnapshot,
                    it.Remarks,
                }),
            }});
        }

        [HttpGet("next-code")]
        public async Task<ActionResult<ApiResponse<string>>> NextCode()
        {
            var seq = await _context.CodeSequences.FirstOrDefaultAsync(s => s.Key == "PI");
            var next = seq?.NextNumber ?? 1;
            return Ok(new ApiResponse<string> { Data = $"PI-{next:D4}" });
        }

        // ───────── Create

        [HttpPost]
        public async Task<ActionResult<ApiResponse<object>>> Create([FromBody] CreatePiDto body)
        {
            if (!await HasPermissionAsync(nameof(UserPermission.CreatePI)) && !await IsAdminAsync()) return Forbidden();
            if (body.Items.Count == 0) return BadResponse("At least one item is required.");

            await using var tx = await _context.Database.BeginTransactionAsync();
            try
            {
                var piNo = await _codes.GenerateCodeAsync("PI");
                var docCtl = await GetAppliedDocumentControlAsync(DocumentType.PurchaseIndent);

                var pi = new PurchaseIndent
                {
                    PiNo = piNo,
                    IndentFor = body.IndentFor,
                    Type = body.Type,
                    Priority = body.Priority,
                    Status = PurchaseIndentStatus.Pending,
                    Remarks = body.Remarks?.Trim(),
                    ReqDateOfDelivery = body.ReqDateOfDelivery,
                    MtcReq = body.MtcReq,
                    DocumentNo = docCtl?.DocumentNo,
                    RevisionNo = docCtl?.RevisionNo,
                    RevisionDate = docCtl?.RevisionDate,
                    CreatedBy = CurrentUserId,
                    IsActive = true,
                };
                _context.PurchaseIndents.Add(pi);
                await _context.SaveChangesAsync();

                foreach (var li in body.Items)
                {
                    if (li.Quantity <= 0) return BadResponse("Quantity must be > 0.");
                    var item = await _context.Items.FirstOrDefaultAsync(i => i.Id == li.ItemId);
                    if (item == null) return BadResponse($"Item {li.ItemId} not found.");

                    OrderItem? oi = null; OrderBomItemPlan? plan = null; Order? ord = null; Product? prod = null;
                    if (li.OrderBomItemPlanId.HasValue)
                    {
                        plan = await _context.OrderBomItemPlans
                            .Include(p => p.OrderItem).ThenInclude(o => o!.Order)
                            .Include(p => p.OrderItem).ThenInclude(o => o!.Product)
                            .FirstOrDefaultAsync(p => p.Id == li.OrderBomItemPlanId);
                        if (plan == null) return BadResponse("Order plan row not found.");
                        oi = plan.OrderItem; ord = oi?.Order; prod = oi?.Product;
                    }
                    else if (li.OrderItemId.HasValue)
                    {
                        oi = await _context.OrderItems.Include(o => o.Order).Include(o => o.Product).FirstOrDefaultAsync(o => o.Id == li.OrderItemId);
                        ord = oi?.Order; prod = oi?.Product;
                    }

                    var piItem = new PurchaseIndentItem
                    {
                        PurchaseIndentId = pi.Id,
                        OrderItemId = oi?.Id,
                        OrderBomItemPlanId = plan?.Id,
                        ItemId = item.Id,
                        Quantity = li.Quantity,
                        UnitId = li.UnitId ?? item.UnitId,
                        Remarks = li.Remarks?.Trim(),
                        ItemNameSnapshot = item.ItemName,
                        ItemCodeSnapshot = item.ItemCode,
                        DrawingNoSnapshot = item.DrawingNumber,
                        RevisionNoSnapshot = item.RevisionNumber,
                        OrderNumberSnapshot = ord?.OrderNumber,
                        ProductNameSnapshot = prod?.ProductName,
                    };
                    _context.PurchaseIndentItems.Add(piItem);
                }
                await _context.SaveChangesAsync();
                await tx.CommitAsync();
                return await GetById(pi.Id);
            }
            catch (Exception ex)
            {
                await tx.RollbackAsync();
                return StatusCode(500, new ApiResponse<object> { Success = false, Message = ex.Message });
            }
        }

        // ───────── Approve / Reject / Revert

        [HttpPost("{id:int}/approve")]
        public async Task<ActionResult<ApiResponse<object>>> Approve(int id)
        {
            if (!await HasPermissionAsync(nameof(UserPermission.ApprovePI)) && !await IsAdminAsync()) return Forbidden();
            var pi = await _context.PurchaseIndents.Include(p => p.Items).FirstOrDefaultAsync(p => p.Id == id);
            if (pi == null) return NotFoundResponse("PI not found.");
            if (pi.Status != PurchaseIndentStatus.Pending) return BadResponse("Only pending PIs can be approved.");

            pi.Status = PurchaseIndentStatus.Approved;
            pi.ApprovedBy = CurrentUserId;
            pi.ApprovedAt = DateTime.Now;
            pi.UpdatedAt = DateTime.Now;

            // Update plan IndentedQty
            foreach (var it in pi.Items)
            {
                if (it.OrderBomItemPlanId.HasValue)
                {
                    var plan = await _context.OrderBomItemPlans.FirstOrDefaultAsync(p => p.Id == it.OrderBomItemPlanId);
                    if (plan != null)
                    {
                        plan.IndentedQty += it.Quantity;
                        plan.LastActivityAt = DateTime.Now;
                        plan.FirstActivityAt ??= DateTime.Now;
                    }
                }
            }
            await _context.SaveChangesAsync();

            foreach (var oiId in pi.Items.Where(i => i.OrderItemId.HasValue).Select(i => i.OrderItemId!.Value).Distinct())
                await OrdersController.RecomputeOrderItemAggregatesAsync(_context, oiId);

            return await GetById(id);
        }

        [HttpPost("{id:int}/reject")]
        public async Task<ActionResult<ApiResponse<object>>> Reject(int id, [FromBody] RejectDto? body = null)
        {
            if (!await HasPermissionAsync(nameof(UserPermission.ApprovePI)) && !await IsAdminAsync()) return Forbidden();
            var pi = await _context.PurchaseIndents.FirstOrDefaultAsync(p => p.Id == id);
            if (pi == null) return NotFoundResponse("PI not found.");
            if (pi.Status != PurchaseIndentStatus.Pending) return BadResponse("Only pending PIs can be rejected.");
            pi.Status = PurchaseIndentStatus.Rejected;
            pi.Remarks = string.IsNullOrWhiteSpace(body?.Reason) ? pi.Remarks : $"{pi.Remarks}\nRejected: {body.Reason}";
            pi.UpdatedAt = DateTime.Now;
            await _context.SaveChangesAsync();
            return await GetById(id);
        }

        public class RejectDto { public string? Reason { get; set; } }

        [HttpPost("{id:int}/revert-to-pending")]
        public async Task<ActionResult<ApiResponse<object>>> RevertToPending(int id)
        {
            if (!await HasPermissionAsync(nameof(UserPermission.ApprovePI)) && !await IsAdminAsync()) return Forbidden();
            var pi = await _context.PurchaseIndents.Include(p => p.Items).FirstOrDefaultAsync(p => p.Id == id);
            if (pi == null) return NotFoundResponse("PI not found.");
            if (pi.Status != PurchaseIndentStatus.Approved) return BadResponse("Only approved PIs can revert.");
            var hasPoUsage = await _context.PurchaseOrderItems.AnyAsync(poi => poi.PurchaseIndentItem!.PurchaseIndentId == id);
            if (hasPoUsage) return BadResponse("Cannot revert – PI items are already used in a PO.");

            pi.Status = PurchaseIndentStatus.Pending;
            pi.ApprovedBy = null; pi.ApprovedAt = null;
            pi.UpdatedAt = DateTime.Now;

            foreach (var it in pi.Items)
            {
                if (it.OrderBomItemPlanId.HasValue)
                {
                    var plan = await _context.OrderBomItemPlans.FirstOrDefaultAsync(p => p.Id == it.OrderBomItemPlanId);
                    if (plan != null) plan.IndentedQty = Math.Max(0, plan.IndentedQty - it.Quantity);
                }
            }
            await _context.SaveChangesAsync();
            return await GetById(id);
        }

        [HttpPatch("{id:int}/active")]
        public async Task<ActionResult<ApiResponse<object>>> ToggleActive(int id, [FromBody] UpdateMasterRequest body)
        {
            if (!await HasPermissionAsync(nameof(UserPermission.EditPI)) && !await IsAdminAsync()) return Forbidden();
            var pi = await _context.PurchaseIndents.FirstOrDefaultAsync(p => p.Id == id);
            if (pi == null) return NotFoundResponse("PI not found.");
            pi.IsActive = body.IsActive;
            pi.UpdatedAt = DateTime.Now;
            await _context.SaveChangesAsync();
            return Ok(new ApiResponse<object> { Data = new { id, isActive = pi.IsActive } });
        }

        // ───────── Helpers
        private async Task<DocumentControl?> GetAppliedDocumentControlAsync(DocumentType type) =>
            await _context.DocumentControls.AsNoTracking()
                .FirstOrDefaultAsync(d => d.DocumentType == type && d.IsApplied && d.IsActive);

        // ───────── Approved PI items list — used by PO and Job Work creation
        [HttpGet("approved-items")]
        public async Task<ActionResult<ApiResponse<IEnumerable<object>>>> ApprovedItems([FromQuery] PurchaseIndentFor indentFor = PurchaseIndentFor.PurchaseOrder)
        {
            var data = await _context.PurchaseIndentItems.AsNoTracking()
                .Include(it => it.PurchaseIndent)
                .Include(it => it.Item)
                .Include(it => it.OrderItem).ThenInclude(o => o!.Order)
                .Where(it => it.PurchaseIndent!.IsActive && it.PurchaseIndent.Status == PurchaseIndentStatus.Approved
                          && it.PurchaseIndent.IndentFor == indentFor)
                .Select(it => new
                {
                    it.Id,
                    PiId = it.PurchaseIndentId,
                    PiNo = it.PurchaseIndent!.PiNo,
                    PiPriority = it.PurchaseIndent.Priority,
                    it.ItemId,
                    ItemName = it.Item!.ItemName,
                    ItemCode = it.Item.ItemCode,
                    it.Quantity,
                    OrderId = it.OrderItem != null ? it.OrderItem.OrderId : (int?)null,
                    OrderNumber = it.OrderItem != null ? it.OrderItem.Order!.OrderNumber : null,
                    AlreadyOrderedQty = _context.PurchaseOrderItems.Where(poi => poi.PurchaseIndentItemId == it.Id && poi.PurchaseOrder!.IsActive && poi.PurchaseOrder.Status != PoStatus.Rejected).Sum(poi => (decimal?)poi.Quantity) ?? 0,
                    JobWorkSentQty = _context.JobWorkItems.Where(j => j.PurchaseIndentItemId == it.Id && j.JobWork!.IsActive).Sum(j => (decimal?)j.Quantity) ?? 0,
                })
                .ToListAsync();
            return Ok(new ApiResponse<IEnumerable<object>> { Data = data });
        }
    }
}
