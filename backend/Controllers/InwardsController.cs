using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using net_backend.Data;
using net_backend.DTOs;
using net_backend.Models;
using net_backend.Services;

namespace net_backend.Controllers
{
    [Route("api/inwards")]
    public class InwardsController : BaseController
    {
        private readonly ICodeGeneratorService _codes;
        private readonly IWebHostEnvironment _env;
        public InwardsController(ApplicationDbContext context, ICodeGeneratorService codes, IWebHostEnvironment env) : base(context)
        {
            _codes = codes;
            _env = env;
        }

        public class CreateInwardLineDto
        {
            public InwardSourceType SourceType { get; set; }
            /// <summary>For PO: PurchaseOrderItem.Id; For JobWork: JobWorkItem.Id.</summary>
            public int SourceRefId { get; set; }
            public decimal Quantity { get; set; } = 1m;
            public int? UnitId { get; set; }
            public decimal? Rate { get; set; }
            public decimal? GstPercent { get; set; }
            public string? Remarks { get; set; }
        }

        public class CreateInwardDto
        {
            public string? GrnNumber { get; set; }
            public DateTime? InwardDate { get; set; }
            public int? VendorId { get; set; }
            public string? Remarks { get; set; }
            public List<string>? AttachmentUrls { get; set; }
            public List<CreateInwardLineDto> Lines { get; set; } = new();
        }

        [HttpGet]
        public async Task<ActionResult<ApiResponse<IEnumerable<object>>>> GetAll(
            [FromQuery] string? search = null,
            [FromQuery] int? vendorId = null,
            [FromQuery] InwardStatus? status = null,
            [FromQuery] bool? activeOnly = null,
            [FromQuery] int? page = null,
            [FromQuery] int? pageSize = null)
        {
            if (!await HasPermissionAsync(nameof(UserPermission.ViewInward)) && !await IsAdminAsync()) return Forbidden();
            var q = _context.Inwards.AsNoTracking().Include(i => i.Vendor).Include(i => i.Creator).AsQueryable();
            if (vendorId.HasValue) q = q.Where(i => i.VendorId == vendorId);
            if (status.HasValue) q = q.Where(i => i.Status == status);
            if (activeOnly == true) q = q.Where(i => i.IsActive);
            if (!string.IsNullOrWhiteSpace(search))
                q = q.Where(i => i.InwardNo.ToLower().Contains(search.Trim().ToLower()) ||
                                 (i.GrnNumber ?? "").ToLower().Contains(search.Trim().ToLower()));
            q = q.OrderByDescending(i => i.Id);
            var total = await q.CountAsync();
            if (page.HasValue && pageSize.HasValue && page.Value > 0 && pageSize.Value > 0)
                q = q.Skip((page.Value - 1) * pageSize.Value).Take(pageSize.Value);

            var list = await q.Select(i => new
            {
                i.Id, i.InwardNo, i.GrnNumber, i.InwardDate, i.Status, i.Remarks,
                i.VendorId, VendorName = i.Vendor != null ? i.Vendor.PartyName : null,
                i.CreatedAt, i.IsActive,
                CreatedByName = i.Creator != null ? i.Creator.FirstName + " " + i.Creator.LastName : null,
                LineCount = _context.InwardLines.Count(l => l.InwardId == i.Id),
                TotalQty = _context.InwardLines.Where(l => l.InwardId == i.Id).Sum(l => (decimal?)l.Quantity) ?? 0,
            }).ToListAsync();
            return Ok(new ApiResponse<IEnumerable<object>> { Data = list, TotalCount = total });
        }

        [HttpGet("{id:int}")]
        public async Task<ActionResult<ApiResponse<object>>> GetById(int id)
        {
            var i = await _context.Inwards.AsNoTracking().Include(x => x.Vendor).Include(x => x.Creator)
                .Include(x => x.Lines).ThenInclude(l => l.Item).Include(x => x.Lines).ThenInclude(l => l.Unit)
                .FirstOrDefaultAsync(x => x.Id == id);
            if (i == null) return NotFoundResponse("Inward not found.");
            return Ok(new ApiResponse<object> { Data = new
            {
                i.Id, i.InwardNo, i.GrnNumber, i.InwardDate, i.Status, i.Remarks,
                i.VendorId, VendorName = i.Vendor?.PartyName,
                i.AttachmentUrlsJson, i.CreatedAt, i.UpdatedAt, i.IsActive,
                Lines = i.Lines.Select(l => new
                {
                    l.Id, l.ItemId, ItemCode = l.Item?.ItemCode, ItemName = l.Item?.ItemName,
                    l.SourceType, l.SourceRefId, l.Quantity, l.UnitId, UnitSymbol = l.Unit?.Symbol,
                    l.Rate, l.GstPercent, l.Remarks,
                    l.IsQCPending, l.IsQCApproved,
                    l.ItemNameSnapshot, l.ItemCodeSnapshot, l.DrawingNoSnapshot, l.RevisionNoSnapshot,
                    l.OrderNumberSnapshot, l.ProductNameSnapshot,
                }),
            }});
        }

        [HttpGet("next-code")]
        public async Task<ActionResult<ApiResponse<string>>> NextCode()
        {
            var seq = await _context.CodeSequences.FirstOrDefaultAsync(s => s.Key == "INWARD");
            var next = seq?.NextNumber ?? 1;
            return Ok(new ApiResponse<string> { Data = $"INW-{next:D4}" });
        }

        [HttpPost]
        public async Task<ActionResult<ApiResponse<object>>> Create([FromBody] CreateInwardDto body)
        {
            if (!await HasPermissionAsync(nameof(UserPermission.CreateInward)) && !await IsAdminAsync()) return Forbidden();
            if (body.Lines.Count == 0) return BadResponse("At least one line is required.");

            await using var tx = await _context.Database.BeginTransactionAsync();
            try
            {
                var inwNo = await _codes.GenerateCodeAsync("INWARD");
                var inw = new Inward
                {
                    InwardNo = inwNo,
                    GrnNumber = body.GrnNumber?.Trim(),
                    InwardDate = body.InwardDate ?? DateTime.Now,
                    VendorId = body.VendorId,
                    Status = InwardStatus.Submitted,
                    Remarks = body.Remarks?.Trim(),
                    AttachmentUrlsJson = body.AttachmentUrls != null && body.AttachmentUrls.Count > 0
                        ? System.Text.Json.JsonSerializer.Serialize(body.AttachmentUrls) : null,
                    CreatedBy = CurrentUserId,
                    IsActive = true,
                };
                _context.Inwards.Add(inw);
                await _context.SaveChangesAsync();

                foreach (var li in body.Lines)
                {
                    if (li.Quantity <= 0) return BadResponse("Quantity must be > 0.");
                    int itemId; OrderItem? oi = null; OrderBomItemPlan? plan = null; Order? ord = null; Product? prod = null; Item? item;

                    if (li.SourceType == InwardSourceType.PO)
                    {
                        var poi = await _context.PurchaseOrderItems
                            .Include(p => p.PurchaseOrder).ThenInclude(po => po!.Vendor)
                            .Include(p => p.PurchaseIndentItem).ThenInclude(pi => pi!.Item)
                            .Include(p => p.PurchaseIndentItem).ThenInclude(pi => pi!.OrderItem).ThenInclude(o => o!.Order)
                            .Include(p => p.PurchaseIndentItem).ThenInclude(pi => pi!.OrderItem).ThenInclude(o => o!.Product)
                            .FirstOrDefaultAsync(p => p.Id == li.SourceRefId);
                        if (poi == null) return BadResponse($"Purchase order item {li.SourceRefId} not found.");
                        if (poi.PurchaseOrder!.Status != PoStatus.Approved || !poi.PurchaseOrder.IsActive)
                            return BadResponse($"PO {poi.PurchaseOrder.PoNo} is not approved.");

                        // Quantity check
                        var prevInwarded = await _context.InwardLines
                            .Where(l => l.SourceType == InwardSourceType.PO && l.SourceRefId == poi.Id && l.Inward!.IsActive)
                            .SumAsync(l => (decimal?)l.Quantity) ?? 0;
                        if (prevInwarded + li.Quantity > poi.Quantity)
                            return BadResponse($"Inward quantity exceeds PO order quantity ({poi.Quantity}) for item {poi.ItemNameSnapshot}.");

                        item = poi.PurchaseIndentItem!.Item;
                        itemId = poi.PurchaseIndentItem.ItemId;
                        oi = poi.PurchaseIndentItem.OrderItem; ord = oi?.Order; prod = oi?.Product;
                        plan = poi.PurchaseIndentItem.OrderBomItemPlanId.HasValue
                            ? await _context.OrderBomItemPlans.FirstOrDefaultAsync(p => p.Id == poi.PurchaseIndentItem.OrderBomItemPlanId)
                            : null;
                    }
                    else // JobWork
                    {
                        var jwi = await _context.JobWorkItems
                            .Include(j => j.JobWork).ThenInclude(jw => jw!.ToParty)
                            .Include(j => j.Item)
                            .Include(j => j.PurchaseIndentItem).ThenInclude(pi => pi!.OrderItem).ThenInclude(o => o!.Order)
                            .Include(j => j.PurchaseIndentItem).ThenInclude(pi => pi!.OrderItem).ThenInclude(o => o!.Product)
                            .FirstOrDefaultAsync(j => j.Id == li.SourceRefId);
                        if (jwi == null) return BadResponse($"Job work item {li.SourceRefId} not found.");
                        if (!jwi.JobWork!.IsActive) return BadResponse("Job work is inactive.");

                        var prevInwarded = await _context.InwardLines
                            .Where(l => l.SourceType == InwardSourceType.JobWork && l.SourceRefId == jwi.Id && l.Inward!.IsActive)
                            .SumAsync(l => (decimal?)l.Quantity) ?? 0;
                        if (prevInwarded + li.Quantity > jwi.Quantity)
                            return BadResponse($"Inward quantity exceeds Job Work quantity ({jwi.Quantity}) for item {jwi.ItemNameSnapshot}.");

                        item = jwi.Item;
                        itemId = jwi.ItemId;
                        oi = jwi.PurchaseIndentItem?.OrderItem; ord = oi?.Order; prod = oi?.Product;
                        plan = jwi.PurchaseIndentItem?.OrderBomItemPlanId.HasValue == true
                            ? await _context.OrderBomItemPlans.FirstOrDefaultAsync(p => p.Id == jwi.PurchaseIndentItem.OrderBomItemPlanId)
                            : null;
                    }

                    var line = new InwardLine
                    {
                        InwardId = inw.Id,
                        ItemId = itemId,
                        SourceType = li.SourceType,
                        SourceRefId = li.SourceRefId,
                        Quantity = li.Quantity,
                        UnitId = li.UnitId ?? item?.UnitId,
                        Rate = li.Rate,
                        GstPercent = li.GstPercent,
                        Remarks = li.Remarks?.Trim(),
                        IsQCPending = true,
                        IsQCApproved = false,
                        ItemNameSnapshot = item?.ItemName,
                        ItemCodeSnapshot = item?.ItemCode,
                        DrawingNoSnapshot = item?.DrawingNumber,
                        RevisionNoSnapshot = item?.RevisionNumber,
                        OrderNumberSnapshot = ord?.OrderNumber,
                        ProductNameSnapshot = prod?.ProductName,
                    };
                    _context.InwardLines.Add(line);

                    if (plan != null)
                    {
                        plan.InwardedQty += li.Quantity;
                        plan.LastActivityAt = DateTime.Now;
                        plan.FirstActivityAt ??= DateTime.Now;
                    }
                }
                await _context.SaveChangesAsync();
                await tx.CommitAsync();
                return await GetById(inw.Id);
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
            if (!await HasPermissionAsync(nameof(UserPermission.EditInward)) && !await IsAdminAsync()) return Forbidden();
            var i = await _context.Inwards.FirstOrDefaultAsync(x => x.Id == id);
            if (i == null) return NotFoundResponse("Inward not found.");
            i.IsActive = body.IsActive;
            i.UpdatedAt = DateTime.Now;
            await _context.SaveChangesAsync();
            return Ok(new ApiResponse<object> { Data = new { id, isActive = i.IsActive } });
        }

        [HttpPost("upload-attachment")]
        public async Task<ActionResult<ApiResponse<object>>> UploadAttachment([FromForm] IFormFile? file)
        {
            if (!await HasPermissionAsync(nameof(UserPermission.CreateInward)) && !await IsAdminAsync()) return Forbidden();
            file ??= Request.Form.Files.FirstOrDefault();
            if (file == null || file.Length == 0) return BadResponse("No file uploaded.");
            var ext = Path.GetExtension(file.FileName)?.ToLowerInvariant() ?? "";
            var allowed = new[] { ".pdf", ".png", ".jpg", ".jpeg", ".webp" };
            if (!allowed.Contains(ext)) return BadResponse("Unsupported file type.");

            var webRoot = _env.WebRootPath ?? Path.Combine(_env.ContentRootPath, "wwwroot");
            var dir = Path.Combine(webRoot, "storage", "inwards");
            Directory.CreateDirectory(dir);
            var fileName = $"inw_{DateTime.Now:yyyyMMddHHmmss}_{Guid.NewGuid().ToString("N").Substring(0, 8)}{ext}";
            var fullPath = Path.Combine(dir, fileName);
            await using (var fs = System.IO.File.Create(fullPath)) await file.CopyToAsync(fs);
            return Ok(new ApiResponse<object> { Data = new { url = $"/storage/inwards/{fileName}" } });
        }
    }
}
