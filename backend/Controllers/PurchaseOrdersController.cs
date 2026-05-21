using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using net_backend.Data;
using net_backend.DTOs;
using net_backend.Models;
using net_backend.Services;

namespace net_backend.Controllers
{
    [Route("api/purchase-orders")]
    public class PurchaseOrdersController : BaseController
    {
        private readonly ICodeGeneratorService _codes;
        private readonly IWebHostEnvironment _env;

        public PurchaseOrdersController(ApplicationDbContext context, ICodeGeneratorService codes, IWebHostEnvironment env) : base(context)
        {
            _codes = codes;
            _env = env;
        }

        public class CreatePoItemDto
        {
            public int PurchaseIndentItemId { get; set; }
            public decimal Quantity { get; set; } = 1m;
            public decimal Rate { get; set; }
        }

        public class CreatePoDto
        {
            public int VendorId { get; set; }
            public DateTime? DeliveryDate { get; set; }
            public string? QuotationNo { get; set; }
            public List<string>? QuotationUrls { get; set; }
            public GstType? GstType { get; set; }
            public decimal? GstPercent { get; set; }
            public string? PurchaseType { get; set; }
            public string? Remarks { get; set; }
            public List<CreatePoItemDto> Items { get; set; } = new();
        }

        // ───────── List

        [HttpGet]
        public async Task<ActionResult<ApiResponse<IEnumerable<object>>>> GetAll(
            [FromQuery] string? search = null,
            [FromQuery] PoStatus? status = null,
            [FromQuery] int? vendorId = null,
            [FromQuery] bool? activeOnly = null,
            [FromQuery] int? page = null,
            [FromQuery] int? pageSize = null)
        {
            if (!await HasPermissionAsync(nameof(UserPermission.ViewPO)) && !await IsAdminAsync()) return Forbidden();

            var q = _context.PurchaseOrders.AsNoTracking()
                .Include(p => p.Vendor).Include(p => p.Creator).Include(p => p.Approver).AsQueryable();
            if (status.HasValue)     q = q.Where(p => p.Status == status);
            if (vendorId.HasValue)   q = q.Where(p => p.VendorId == vendorId);
            if (activeOnly == true)  q = q.Where(p => p.IsActive);
            if (!string.IsNullOrWhiteSpace(search))
                q = q.Where(p => p.PoNo.ToLower().Contains(search.Trim().ToLower()) ||
                                 (p.Vendor != null && p.Vendor.PartyName.ToLower().Contains(search.Trim().ToLower())));
            q = q.OrderByDescending(p => p.Id);
            var total = await q.CountAsync();
            if (page.HasValue && pageSize.HasValue && page.Value > 0 && pageSize.Value > 0)
                q = q.Skip((page.Value - 1) * pageSize.Value).Take(pageSize.Value);

            var list = await q.Select(p => new
            {
                p.Id, p.PoNo, p.VendorId, VendorName = p.Vendor != null ? p.Vendor.PartyName : null,
                p.DeliveryDate, p.QuotationNo, p.GstType, p.GstPercent, p.PurchaseType, p.Status, p.Remarks,
                p.DocumentNo, p.RevisionNo, p.RevisionDate, p.CreatedAt, p.ApprovedAt, p.IsActive,
                CreatedByName = p.Creator != null ? p.Creator.FirstName + " " + p.Creator.LastName : null,
                ApprovedByName = p.Approver != null ? p.Approver.FirstName + " " + p.Approver.LastName : null,
                ItemCount = _context.PurchaseOrderItems.Count(poi => poi.PurchaseOrderId == p.Id),
                TotalQty = _context.PurchaseOrderItems.Where(poi => poi.PurchaseOrderId == p.Id).Sum(poi => (decimal?)poi.Quantity) ?? 0,
                TotalValue = _context.PurchaseOrderItems.Where(poi => poi.PurchaseOrderId == p.Id).Sum(poi => (decimal?)(poi.Quantity * poi.Rate)) ?? 0,
            }).ToListAsync();

            return Ok(new ApiResponse<IEnumerable<object>> { Data = list, TotalCount = total });
        }

        [HttpGet("{id:int}")]
        public async Task<ActionResult<ApiResponse<object>>> GetById(int id)
        {
            var po = await _context.PurchaseOrders.AsNoTracking()
                .Include(p => p.Vendor).Include(p => p.Creator).Include(p => p.Approver)
                .Include(p => p.Items).ThenInclude(it => it.PurchaseIndentItem).ThenInclude(pi => pi!.Item)
                .Include(p => p.Items).ThenInclude(it => it.PurchaseIndentItem).ThenInclude(pi => pi!.PurchaseIndent)
                .FirstOrDefaultAsync(p => p.Id == id);
            if (po == null) return NotFoundResponse("PO not found.");

            return Ok(new ApiResponse<object> { Data = new
            {
                po.Id, po.PoNo, po.VendorId,
                VendorName = po.Vendor?.PartyName, VendorContact = po.Vendor?.MobileNumber, VendorGst = po.Vendor?.GstNo,
                po.DeliveryDate, po.QuotationNo, po.QuotationUrlsJson,
                po.GstType, po.GstPercent, po.PurchaseType, po.Status, po.Remarks,
                po.DocumentNo, po.RevisionNo, po.RevisionDate, po.CreatedAt, po.UpdatedAt, po.ApprovedAt, po.IsActive,
                CreatedByName = po.Creator != null ? po.Creator.FirstName + " " + po.Creator.LastName : null,
                ApprovedByName = po.Approver != null ? po.Approver.FirstName + " " + po.Approver.LastName : null,
                Items = po.Items.Select(it => new
                {
                    it.Id, it.PurchaseIndentItemId,
                    PiNo = it.PurchaseIndentItem?.PurchaseIndent?.PiNo,
                    it.Quantity, it.Rate,
                    ItemId = it.PurchaseIndentItem?.ItemId,
                    ItemCode = it.PurchaseIndentItem?.Item?.ItemCode,
                    ItemName = it.PurchaseIndentItem?.Item?.ItemName,
                    it.ItemNameSnapshot, it.ItemCodeSnapshot,
                    it.OrderNumberSnapshot, it.ProductNameSnapshot,
                }),
            }});
        }

        [HttpGet("next-code")]
        public async Task<ActionResult<ApiResponse<string>>> NextCode()
        {
            var seq = await _context.CodeSequences.FirstOrDefaultAsync(s => s.Key == "PO");
            var next = seq?.NextNumber ?? 1;
            return Ok(new ApiResponse<string> { Data = $"PO-{next:D4}" });
        }

        // ───────── Create

        [HttpPost]
        public async Task<ActionResult<ApiResponse<object>>> Create([FromBody] CreatePoDto body)
        {
            if (!await HasPermissionAsync(nameof(UserPermission.CreatePO)) && !await IsAdminAsync()) return Forbidden();
            if (body.VendorId <= 0)    return BadResponse("Vendor is required.");
            if (body.Items.Count == 0) return BadResponse("At least one item is required.");

            await using var tx = await _context.Database.BeginTransactionAsync();
            try
            {
                var poNo = await _codes.GenerateCodeAsync("PO");
                var docCtl = await GetAppliedDocumentControlAsync(DocumentType.PurchaseOrder);

                var po = new PurchaseOrder
                {
                    PoNo = poNo,
                    VendorId = body.VendorId,
                    DeliveryDate = body.DeliveryDate,
                    QuotationNo = body.QuotationNo?.Trim(),
                    QuotationUrlsJson = body.QuotationUrls != null && body.QuotationUrls.Count > 0
                        ? System.Text.Json.JsonSerializer.Serialize(body.QuotationUrls) : null,
                    GstType = body.GstType,
                    GstPercent = body.GstPercent,
                    PurchaseType = body.PurchaseType ?? "Regular",
                    Remarks = body.Remarks?.Trim(),
                    Status = PoStatus.Pending,
                    DocumentNo = docCtl?.DocumentNo,
                    RevisionNo = docCtl?.RevisionNo,
                    RevisionDate = docCtl?.RevisionDate,
                    CreatedBy = CurrentUserId,
                    IsActive = true,
                };
                _context.PurchaseOrders.Add(po);
                await _context.SaveChangesAsync();

                foreach (var li in body.Items)
                {
                    if (li.Quantity <= 0) return BadResponse("Quantity must be > 0.");
                    if (li.Rate < 0)      return BadResponse("Rate cannot be negative.");

                    var piItem = await _context.PurchaseIndentItems.Include(p => p.PurchaseIndent).Include(p => p.Item).Include(p => p.OrderItem).ThenInclude(o => o!.Order).Include(p => p.OrderItem).ThenInclude(o => o!.Product)
                        .FirstOrDefaultAsync(p => p.Id == li.PurchaseIndentItemId);
                    if (piItem == null) return BadResponse($"PI item {li.PurchaseIndentItemId} not found.");
                    if (piItem.PurchaseIndent == null ||
                        piItem.PurchaseIndent.Status != PurchaseIndentStatus.Approved ||
                        piItem.PurchaseIndent.IndentFor != PurchaseIndentFor.PurchaseOrder ||
                        !piItem.PurchaseIndent.IsActive)
                        return BadResponse($"PI item {li.PurchaseIndentItemId} is not approved for purchase.");

                    var alreadyOrdered = await _context.PurchaseOrderItems
                        .Where(poi => poi.PurchaseIndentItemId == piItem.Id
                                   && poi.PurchaseOrder!.IsActive
                                   && poi.PurchaseOrder.Status != PoStatus.Rejected)
                        .SumAsync(poi => (decimal?)poi.Quantity) ?? 0;
                    if (alreadyOrdered + li.Quantity > piItem.Quantity)
                        return BadResponse($"Cannot order more than PI quantity ({piItem.Quantity}) for item {piItem.ItemNameSnapshot}.");

                    _context.PurchaseOrderItems.Add(new PurchaseOrderItem
                    {
                        PurchaseOrderId = po.Id,
                        PurchaseIndentItemId = piItem.Id,
                        Quantity = li.Quantity,
                        Rate = li.Rate,
                        ItemNameSnapshot = piItem.ItemNameSnapshot ?? piItem.Item?.ItemName,
                        ItemCodeSnapshot = piItem.ItemCodeSnapshot ?? piItem.Item?.ItemCode,
                        OrderNumberSnapshot = piItem.OrderNumberSnapshot ?? piItem.OrderItem?.Order?.OrderNumber,
                        ProductNameSnapshot = piItem.ProductNameSnapshot ?? piItem.OrderItem?.Product?.ProductName,
                    });
                }
                await _context.SaveChangesAsync();
                await tx.CommitAsync();
                return await GetById(po.Id);
            }
            catch (Exception ex)
            {
                await tx.RollbackAsync();
                return StatusCode(500, new ApiResponse<object> { Success = false, Message = ex.Message });
            }
        }

        // ───────── Approve / Reject

        [HttpPost("{id:int}/approve")]
        public async Task<ActionResult<ApiResponse<object>>> Approve(int id)
        {
            if (!await HasPermissionAsync(nameof(UserPermission.ApprovePO)) && !await IsAdminAsync()) return Forbidden();
            var po = await _context.PurchaseOrders.Include(p => p.Items).ThenInclude(it => it.PurchaseIndentItem).FirstOrDefaultAsync(p => p.Id == id);
            if (po == null) return NotFoundResponse("PO not found.");
            if (po.Status != PoStatus.Pending) return BadResponse("Only pending POs can be approved.");
            po.Status = PoStatus.Approved;
            po.ApprovedBy = CurrentUserId;
            po.ApprovedAt = DateTime.Now;
            po.UpdatedAt = DateTime.Now;

            foreach (var it in po.Items)
            {
                if (it.PurchaseIndentItem?.OrderBomItemPlanId is int planId)
                {
                    var plan = await _context.OrderBomItemPlans.FirstOrDefaultAsync(p => p.Id == planId);
                    if (plan != null)
                    {
                        plan.OrderedQty += it.Quantity;
                        plan.LastActivityAt = DateTime.Now;
                        plan.FirstActivityAt ??= DateTime.Now;
                    }
                }
            }
            await _context.SaveChangesAsync();

            var orderItemIds = po.Items.Where(i => i.PurchaseIndentItem?.OrderItemId != null)
                                       .Select(i => i.PurchaseIndentItem!.OrderItemId!.Value).Distinct();
            foreach (var oiId in orderItemIds)
                await OrdersController.RecomputeOrderItemAggregatesAsync(_context, oiId);

            return await GetById(id);
        }

        [HttpPost("{id:int}/reject")]
        public async Task<ActionResult<ApiResponse<object>>> Reject(int id, [FromBody] PurchaseIndentsController.RejectDto? body = null)
        {
            if (!await HasPermissionAsync(nameof(UserPermission.ApprovePO)) && !await IsAdminAsync()) return Forbidden();
            var po = await _context.PurchaseOrders.FirstOrDefaultAsync(p => p.Id == id);
            if (po == null) return NotFoundResponse("PO not found.");
            if (po.Status != PoStatus.Pending) return BadResponse("Only pending POs can be rejected.");
            po.Status = PoStatus.Rejected;
            po.Remarks = string.IsNullOrWhiteSpace(body?.Reason) ? po.Remarks : $"{po.Remarks}\nRejected: {body.Reason}";
            po.UpdatedAt = DateTime.Now;
            await _context.SaveChangesAsync();
            return await GetById(id);
        }

        [HttpPatch("{id:int}/active")]
        public async Task<ActionResult<ApiResponse<object>>> ToggleActive(int id, [FromBody] UpdateMasterRequest body)
        {
            if (!await HasPermissionAsync(nameof(UserPermission.EditPO)) && !await IsAdminAsync()) return Forbidden();
            var po = await _context.PurchaseOrders.FirstOrDefaultAsync(p => p.Id == id);
            if (po == null) return NotFoundResponse("PO not found.");
            po.IsActive = body.IsActive;
            po.UpdatedAt = DateTime.Now;
            await _context.SaveChangesAsync();
            return Ok(new ApiResponse<object> { Data = new { id, isActive = po.IsActive } });
        }

        [HttpGet("approved-items-for-inward")]
        public async Task<ActionResult<ApiResponse<IEnumerable<object>>>> ApprovedItemsForInward()
        {
            var data = await _context.PurchaseOrderItems.AsNoTracking()
                .Include(it => it.PurchaseOrder).ThenInclude(po => po!.Vendor)
                .Include(it => it.PurchaseIndentItem).ThenInclude(pi => pi!.Item)
                .Include(it => it.PurchaseIndentItem).ThenInclude(pi => pi!.OrderItem).ThenInclude(o => o!.Order)
                .Where(it => it.PurchaseOrder!.IsActive && it.PurchaseOrder.Status == PoStatus.Approved)
                .Select(it => new
                {
                    PurchaseOrderItemId = it.Id,
                    PurchaseOrderId = it.PurchaseOrderId,
                    PoNo = it.PurchaseOrder!.PoNo,
                    VendorId = it.PurchaseOrder.VendorId,
                    VendorName = it.PurchaseOrder.Vendor!.PartyName,
                    ItemId = it.PurchaseIndentItem!.ItemId,
                    ItemCode = it.PurchaseIndentItem.Item!.ItemCode,
                    ItemName = it.PurchaseIndentItem.Item.ItemName,
                    OrderedQty = it.Quantity,
                    Rate = it.Rate,
                    OrderNumber = it.PurchaseIndentItem.OrderItem != null ? it.PurchaseIndentItem.OrderItem.Order!.OrderNumber : null,
                    InwardedQty = _context.InwardLines.Where(l => l.SourceType == InwardSourceType.PO && l.SourceRefId == it.Id && l.Inward!.IsActive).Sum(l => (decimal?)l.Quantity) ?? 0,
                })
                .ToListAsync();
            return Ok(new ApiResponse<IEnumerable<object>> { Data = data });
        }

        // ───────── Quotation upload
        [HttpPost("upload-quotation")]
        public async Task<ActionResult<ApiResponse<object>>> UploadQuotation([FromForm] IFormFile? file)
        {
            if (!await HasPermissionAsync(nameof(UserPermission.CreatePO)) && !await IsAdminAsync()) return Forbidden();
            file ??= Request.Form.Files.FirstOrDefault();
            if (file == null || file.Length == 0) return BadResponse("No file uploaded.");

            var allowed = new[] { ".pdf", ".png", ".jpg", ".jpeg", ".webp" };
            var ext = Path.GetExtension(file.FileName)?.ToLowerInvariant() ?? "";
            if (!allowed.Contains(ext)) return BadResponse("Unsupported file type.");

            var webRoot = _env.WebRootPath ?? Path.Combine(_env.ContentRootPath, "wwwroot");
            var dir = Path.Combine(webRoot, "storage", "po-quotations");
            Directory.CreateDirectory(dir);
            var fileName = $"po_{DateTime.Now:yyyyMMddHHmmss}_{Guid.NewGuid().ToString("N").Substring(0, 8)}{ext}";
            var fullPath = Path.Combine(dir, fileName);
            await using (var fs = System.IO.File.Create(fullPath))
                await file.CopyToAsync(fs);
            return Ok(new ApiResponse<object> { Data = new { url = $"/storage/po-quotations/{fileName}" } });
        }

        private async Task<DocumentControl?> GetAppliedDocumentControlAsync(DocumentType type) =>
            await _context.DocumentControls.AsNoTracking()
                .FirstOrDefaultAsync(d => d.DocumentType == type && d.IsApplied && d.IsActive);
    }
}
