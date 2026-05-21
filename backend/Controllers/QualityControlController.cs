using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using net_backend.Data;
using net_backend.DTOs;
using net_backend.Models;
using net_backend.Services;

namespace net_backend.Controllers
{
    [Route("api/quality-control")]
    public class QualityControlController : BaseController
    {
        private readonly ICodeGeneratorService _codes;
        private readonly IWebHostEnvironment _env;
        public QualityControlController(ApplicationDbContext context, ICodeGeneratorService codes, IWebHostEnvironment env) : base(context)
        {
            _codes = codes; _env = env;
        }

        public class CreateQcItemDto
        {
            public int InwardLineId { get; set; }
            /// <summary>Total quantity considered for this row. Often equals inward line quantity, but may be split.</summary>
            public decimal Quantity { get; set; } = 1m;
        }

        public class CreateQcDto
        {
            public int PartyId { get; set; }
            public InwardSourceType SourceType { get; set; } = InwardSourceType.PO;
            public string? Remarks { get; set; }
            public List<string>? AttachmentUrls { get; set; }
            public List<CreateQcItemDto> Items { get; set; } = new();
        }

        public class QcDecisionDto
        {
            public int QcItemId { get; set; }
            public decimal ApprovedQty { get; set; }
            public decimal ReworkQty { get; set; }
            public decimal RejectedQty { get; set; }
            public string? Remarks { get; set; }
        }

        [HttpGet]
        public async Task<ActionResult<ApiResponse<IEnumerable<object>>>> GetAll(
            [FromQuery] QcStatus? status = null, [FromQuery] string? search = null,
            [FromQuery] bool? activeOnly = null, [FromQuery] int? page = null, [FromQuery] int? pageSize = null)
        {
            if (!await HasPermissionAsync(nameof(UserPermission.ViewQC)) && !await IsAdminAsync()) return Forbidden();
            var q = _context.QcEntries.AsNoTracking().Include(e => e.Party).Include(e => e.Creator).Include(e => e.Approver).AsQueryable();
            if (status.HasValue)    q = q.Where(e => e.Status == status);
            if (activeOnly == true) q = q.Where(e => e.IsActive);
            if (!string.IsNullOrWhiteSpace(search)) q = q.Where(e => e.QcNo.ToLower().Contains(search.Trim().ToLower()));
            q = q.OrderByDescending(e => e.Id);
            var total = await q.CountAsync();
            if (page.HasValue && pageSize.HasValue && page.Value > 0 && pageSize.Value > 0)
                q = q.Skip((page.Value - 1) * pageSize.Value).Take(pageSize.Value);

            var list = await q.Select(e => new
            {
                e.Id, e.QcNo, e.Status, e.SourceType, e.Remarks, e.CreatedAt, e.ApprovedAt, e.IsActive,
                e.PartyId, PartyName = e.Party != null ? e.Party.PartyName : null,
                CreatedByName = e.Creator != null ? e.Creator.FirstName + " " + e.Creator.LastName : null,
                ApprovedByName = e.Approver != null ? e.Approver.FirstName + " " + e.Approver.LastName : null,
                ItemCount = _context.QcItems.Count(qi => qi.QcEntryId == e.Id),
            }).ToListAsync();
            return Ok(new ApiResponse<IEnumerable<object>> { Data = list, TotalCount = total });
        }

        [HttpGet("{id:int}")]
        public async Task<ActionResult<ApiResponse<object>>> GetById(int id)
        {
            var e = await _context.QcEntries.AsNoTracking()
                .Include(e => e.Party)
                .Include(e => e.Items).ThenInclude(qi => qi.InwardLine).ThenInclude(l => l!.Item)
                .Include(e => e.Items).ThenInclude(qi => qi.InwardLine).ThenInclude(l => l!.Inward)
                .FirstOrDefaultAsync(e => e.Id == id);
            if (e == null) return NotFoundResponse("QC entry not found.");
            return Ok(new ApiResponse<object> { Data = new
            {
                e.Id, e.QcNo, e.Status, e.SourceType, e.Remarks, e.AttachmentUrlsJson, e.CreatedAt, e.UpdatedAt, e.ApprovedAt, e.IsActive,
                e.PartyId, PartyName = e.Party?.PartyName,
                Items = e.Items.Select(qi => new
                {
                    qi.Id, qi.InwardLineId,
                    InwardNo = qi.InwardLine?.Inward?.InwardNo,
                    qi.Quantity, qi.ApprovedQty, qi.ReworkQty, qi.RejectedQty, qi.Decision, qi.Remarks,
                    ItemCode = qi.InwardLine?.ItemCodeSnapshot ?? qi.InwardLine?.Item?.ItemCode,
                    ItemName = qi.InwardLine?.ItemNameSnapshot ?? qi.InwardLine?.Item?.ItemName,
                    OrderNumber = qi.InwardLine?.OrderNumberSnapshot,
                    ProductName = qi.InwardLine?.ProductNameSnapshot,
                }),
            }});
        }

        [HttpGet("next-code")]
        public async Task<ActionResult<ApiResponse<string>>> NextCode()
        {
            var seq = await _context.CodeSequences.FirstOrDefaultAsync(s => s.Key == "QC");
            var next = seq?.NextNumber ?? 1;
            return Ok(new ApiResponse<string> { Data = $"QC-{next:D4}" });
        }

        // List of inward lines still pending QC
        [HttpGet("pending-inward-lines")]
        public async Task<ActionResult<ApiResponse<IEnumerable<object>>>> PendingLines([FromQuery] InwardSourceType? sourceType = null)
        {
            var q = _context.InwardLines.AsNoTracking()
                .Include(l => l.Inward).ThenInclude(i => i!.Vendor)
                .Include(l => l.Item)
                .Where(l => l.IsQCPending && l.Inward!.IsActive);
            if (sourceType.HasValue) q = q.Where(l => l.SourceType == sourceType);
            var data = await q.OrderByDescending(l => l.Id).Select(l => new
            {
                l.Id, InwardId = l.InwardId, InwardNo = l.Inward!.InwardNo,
                l.SourceType, l.SourceRefId,
                l.Quantity,
                AlreadyQcQty = _context.QcItems.Where(qi => qi.InwardLineId == l.Id).Sum(qi => (decimal?)(qi.ApprovedQty + qi.ReworkQty + qi.RejectedQty)) ?? 0,
                VendorName = l.Inward.Vendor != null ? l.Inward.Vendor.PartyName : null,
                ItemCode = l.ItemCodeSnapshot ?? l.Item!.ItemCode,
                ItemName = l.ItemNameSnapshot ?? l.Item!.ItemName,
                OrderNumber = l.OrderNumberSnapshot,
                ProductName = l.ProductNameSnapshot,
            }).ToListAsync();
            return Ok(new ApiResponse<IEnumerable<object>> { Data = data });
        }

        [HttpPost]
        public async Task<ActionResult<ApiResponse<object>>> Create([FromBody] CreateQcDto body)
        {
            if (!await HasPermissionAsync(nameof(UserPermission.CreateQC)) && !await IsAdminAsync()) return Forbidden();
            if (body.Items.Count == 0) return BadResponse("At least one line is required.");
            if (body.PartyId <= 0)     return BadResponse("Party is required.");

            await using var tx = await _context.Database.BeginTransactionAsync();
            try
            {
                var qcNo = await _codes.GenerateCodeAsync("QC");
                var entry = new QualityControlEntry
                {
                    QcNo = qcNo,
                    PartyId = body.PartyId,
                    SourceType = body.SourceType,
                    Remarks = body.Remarks?.Trim(),
                    Status = QcStatus.Pending,
                    AttachmentUrlsJson = body.AttachmentUrls != null && body.AttachmentUrls.Count > 0
                        ? System.Text.Json.JsonSerializer.Serialize(body.AttachmentUrls) : null,
                    CreatedBy = CurrentUserId,
                    IsActive = true,
                };
                _context.QcEntries.Add(entry);
                await _context.SaveChangesAsync();

                foreach (var it in body.Items)
                {
                    if (it.Quantity <= 0) return BadResponse("Quantity must be > 0.");
                    var line = await _context.InwardLines.FirstOrDefaultAsync(l => l.Id == it.InwardLineId);
                    if (line == null) return BadResponse($"Inward line {it.InwardLineId} not found.");

                    var alreadyQc = await _context.QcItems
                        .Where(qi => qi.InwardLineId == line.Id)
                        .SumAsync(qi => (decimal?)(qi.ApprovedQty + qi.ReworkQty + qi.RejectedQty)) ?? 0;
                    if (alreadyQc + it.Quantity > line.Quantity)
                        return BadResponse($"QC quantity exceeds remaining inward quantity for line {line.Id}.");

                    _context.QcItems.Add(new QualityControlItem
                    {
                        QcEntryId = entry.Id,
                        InwardLineId = line.Id,
                        Quantity = it.Quantity,
                        Decision = QcItemDecision.Pending,
                    });
                }
                await _context.SaveChangesAsync();
                await tx.CommitAsync();
                return await GetById(entry.Id);
            }
            catch (Exception ex)
            {
                await tx.RollbackAsync();
                return StatusCode(500, new ApiResponse<object> { Success = false, Message = ex.Message });
            }
        }

        [HttpPost("{id:int}/decision")]
        public async Task<ActionResult<ApiResponse<object>>> SetDecision(int id, [FromBody] List<QcDecisionDto> body)
        {
            if (!await HasPermissionAsync(nameof(UserPermission.EditQC)) && !await IsAdminAsync()) return Forbidden();
            var entry = await _context.QcEntries.Include(e => e.Items).FirstOrDefaultAsync(e => e.Id == id);
            if (entry == null) return NotFoundResponse("QC entry not found.");
            if (entry.Status != QcStatus.Pending) return BadResponse("Only pending QC entries can be edited.");

            foreach (var d in body)
            {
                var item = entry.Items.FirstOrDefault(x => x.Id == d.QcItemId);
                if (item == null) continue;
                var total = d.ApprovedQty + d.ReworkQty + d.RejectedQty;
                if (total > item.Quantity) return BadResponse($"Sum of decisions exceeds row quantity for item {item.Id}.");
                item.ApprovedQty = d.ApprovedQty;
                item.ReworkQty   = d.ReworkQty;
                item.RejectedQty = d.RejectedQty;
                item.Decision    = total == 0 ? QcItemDecision.Pending
                                  : (d.ApprovedQty == item.Quantity ? QcItemDecision.Approved
                                  : (d.RejectedQty == item.Quantity ? QcItemDecision.Rejected
                                  : (d.ReworkQty   == item.Quantity ? QcItemDecision.Rework
                                  : QcItemDecision.Pending)));
                item.Remarks = d.Remarks?.Trim();
            }
            entry.UpdatedAt = DateTime.Now;
            await _context.SaveChangesAsync();
            return await GetById(id);
        }

        [HttpPost("{id:int}/finalize")]
        public async Task<ActionResult<ApiResponse<object>>> Finalize(int id)
        {
            if (!await HasPermissionAsync(nameof(UserPermission.ApproveQC)) && !await IsAdminAsync()) return Forbidden();
            var entry = await _context.QcEntries
                .Include(e => e.Items).ThenInclude(qi => qi.InwardLine)
                .FirstOrDefaultAsync(e => e.Id == id);
            if (entry == null) return NotFoundResponse("QC entry not found.");
            if (entry.Status != QcStatus.Pending) return BadResponse("Only pending QC entries can be finalised.");
            if (entry.Items.Any(i => (i.ApprovedQty + i.ReworkQty + i.RejectedQty) <= 0))
                return BadResponse("All items must have a non-zero decision.");

            entry.Status = QcStatus.Approved;
            entry.ApprovedBy = CurrentUserId;
            entry.ApprovedAt = DateTime.Now;
            entry.UpdatedAt = DateTime.Now;

            var planUpdates = new HashSet<int>();
            var orderItemUpdates = new HashSet<int>();
            foreach (var qi in entry.Items)
            {
                var line = qi.InwardLine!;
                line.IsQCPending = false;
                line.IsQCApproved = qi.ApprovedQty > 0;

                // Find related plan via the inward source (PO/JW)
                OrderBomItemPlan? plan = null;
                if (line.SourceType == InwardSourceType.PO)
                {
                    var pii = await _context.PurchaseOrderItems.Include(p => p.PurchaseIndentItem).FirstOrDefaultAsync(p => p.Id == line.SourceRefId);
                    if (pii?.PurchaseIndentItem?.OrderBomItemPlanId is int pid)
                        plan = await _context.OrderBomItemPlans.FirstOrDefaultAsync(p => p.Id == pid);
                }
                else
                {
                    var jwi = await _context.JobWorkItems.Include(j => j.PurchaseIndentItem).FirstOrDefaultAsync(j => j.Id == line.SourceRefId);
                    if (jwi?.PurchaseIndentItem?.OrderBomItemPlanId is int pid)
                        plan = await _context.OrderBomItemPlans.FirstOrDefaultAsync(p => p.Id == pid);
                }

                if (plan != null)
                {
                    plan.QcApprovedQty += qi.ApprovedQty;
                    plan.QcReworkQty   += qi.ReworkQty;
                    plan.QcRejectedQty += qi.RejectedQty;
                    plan.ReadyQty      += qi.ApprovedQty;
                    plan.LastActivityAt = DateTime.Now;
                    plan.FirstActivityAt ??= DateTime.Now;
                    planUpdates.Add(plan.Id);
                }
            }
            await _context.SaveChangesAsync();

            // Recompute aggregate per affected order item
            var affectedOrderItemIds = await _context.OrderBomItemPlans
                .Where(p => planUpdates.Contains(p.Id))
                .Select(p => p.OrderItemId).Distinct().ToListAsync();
            foreach (var oiId in affectedOrderItemIds)
                await OrdersController.RecomputeOrderItemAggregatesAsync(_context, oiId);

            return await GetById(id);
        }

        [HttpPatch("{id:int}/active")]
        public async Task<ActionResult<ApiResponse<object>>> ToggleActive(int id, [FromBody] UpdateMasterRequest body)
        {
            if (!await HasPermissionAsync(nameof(UserPermission.EditQC)) && !await IsAdminAsync()) return Forbidden();
            var e = await _context.QcEntries.FirstOrDefaultAsync(x => x.Id == id);
            if (e == null) return NotFoundResponse("QC entry not found.");
            e.IsActive = body.IsActive;
            e.UpdatedAt = DateTime.Now;
            await _context.SaveChangesAsync();
            return Ok(new ApiResponse<object> { Data = new { id, isActive = e.IsActive } });
        }

        [HttpPost("upload-attachment")]
        public async Task<ActionResult<ApiResponse<object>>> UploadAttachment([FromForm] IFormFile? file)
        {
            if (!await HasPermissionAsync(nameof(UserPermission.CreateQC)) && !await IsAdminAsync()) return Forbidden();
            file ??= Request.Form.Files.FirstOrDefault();
            if (file == null || file.Length == 0) return BadResponse("No file uploaded.");
            var ext = Path.GetExtension(file.FileName)?.ToLowerInvariant() ?? "";
            var allowed = new[] { ".pdf", ".png", ".jpg", ".jpeg", ".webp" };
            if (!allowed.Contains(ext)) return BadResponse("Unsupported file type.");
            var webRoot = _env.WebRootPath ?? Path.Combine(_env.ContentRootPath, "wwwroot");
            var dir = Path.Combine(webRoot, "storage", "qc");
            Directory.CreateDirectory(dir);
            var fileName = $"qc_{DateTime.Now:yyyyMMddHHmmss}_{Guid.NewGuid().ToString("N").Substring(0, 8)}{ext}";
            var fullPath = Path.Combine(dir, fileName);
            await using (var fs = System.IO.File.Create(fullPath)) await file.CopyToAsync(fs);
            return Ok(new ApiResponse<object> { Data = new { url = $"/storage/qc/{fileName}" } });
        }
    }
}
