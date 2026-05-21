using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using net_backend.Data;
using net_backend.DTOs;
using net_backend.Models;
using net_backend.Services;

namespace net_backend.Controllers
{
    [Route("api/job-works")]
    public class JobWorksController : BaseController
    {
        private readonly ICodeGeneratorService _codes;
        private readonly IWebHostEnvironment _env;
        public JobWorksController(ApplicationDbContext context, ICodeGeneratorService codes, IWebHostEnvironment env) : base(context)
        {
            _codes = codes;
            _env = env;
        }

        public class CreateJwItemDto
        {
            /// <summary>Source PI item (must be from a PI with IndentFor=JobWork and approved).</summary>
            public int PurchaseIndentItemId { get; set; }
            public decimal Quantity { get; set; } = 1m;
            public decimal? Rate { get; set; }
            public decimal? GstPercent { get; set; }
            public string? Remarks { get; set; }
        }

        public class CreateJwDto
        {
            public int ToPartyId { get; set; }
            public int? ProcessId { get; set; }
            public DateTime? OutwardDate { get; set; }
            public DateTime? ExpectedReturnDate { get; set; }
            public string? Description { get; set; }
            public string? Remarks { get; set; }
            public List<string>? AttachmentUrls { get; set; }
            public List<CreateJwItemDto> Items { get; set; } = new();
        }

        [HttpGet]
        public async Task<ActionResult<ApiResponse<IEnumerable<object>>>> GetAll(
            [FromQuery] string? search = null, [FromQuery] JobWorkStatus? status = null,
            [FromQuery] int? toPartyId = null, [FromQuery] bool? activeOnly = null,
            [FromQuery] int? page = null, [FromQuery] int? pageSize = null)
        {
            if (!await HasPermissionAsync(nameof(UserPermission.ViewJobWork)) && !await IsAdminAsync()) return Forbidden();
            var q = _context.JobWorks.AsNoTracking().Include(j => j.ToParty).Include(j => j.Process).Include(j => j.Creator).AsQueryable();
            if (status.HasValue)    q = q.Where(j => j.Status == status);
            if (toPartyId.HasValue) q = q.Where(j => j.ToPartyId == toPartyId);
            if (activeOnly == true) q = q.Where(j => j.IsActive);
            if (!string.IsNullOrWhiteSpace(search))
                q = q.Where(j => j.JobWorkNo.ToLower().Contains(search.Trim().ToLower()) ||
                                 (j.ToParty != null && j.ToParty.PartyName.ToLower().Contains(search.Trim().ToLower())));
            q = q.OrderByDescending(j => j.Id);
            var total = await q.CountAsync();
            if (page.HasValue && pageSize.HasValue && page.Value > 0 && pageSize.Value > 0)
                q = q.Skip((page.Value - 1) * pageSize.Value).Take(pageSize.Value);

            var list = await q.Select(j => new
            {
                j.Id, j.JobWorkNo, j.Status, j.OutwardDate, j.ExpectedReturnDate, j.InwardDate, j.Remarks,
                j.ToPartyId, ToPartyName = j.ToParty != null ? j.ToParty.PartyName : null,
                j.ProcessId, ProcessName = j.Process != null ? j.Process.ProcessName : null,
                j.DocumentNo, j.RevisionNo, j.RevisionDate, j.CreatedAt, j.IsActive,
                CreatedByName = j.Creator != null ? j.Creator.FirstName + " " + j.Creator.LastName : null,
                ItemCount = _context.JobWorkItems.Count(ji => ji.JobWorkId == j.Id),
                TotalQty = _context.JobWorkItems.Where(ji => ji.JobWorkId == j.Id).Sum(ji => (decimal?)ji.Quantity) ?? 0,
            }).ToListAsync();
            return Ok(new ApiResponse<IEnumerable<object>> { Data = list, TotalCount = total });
        }

        [HttpGet("{id:int}")]
        public async Task<ActionResult<ApiResponse<object>>> GetById(int id)
        {
            var j = await _context.JobWorks.AsNoTracking()
                .Include(j => j.ToParty).Include(j => j.Process).Include(j => j.Creator)
                .Include(j => j.Items).ThenInclude(ji => ji.Item)
                .Include(j => j.Items).ThenInclude(ji => ji.PurchaseIndentItem).ThenInclude(pi => pi!.PurchaseIndent)
                .FirstOrDefaultAsync(j => j.Id == id);
            if (j == null) return NotFoundResponse("Job work not found.");
            return Ok(new ApiResponse<object> { Data = new
            {
                j.Id, j.JobWorkNo, j.Status, j.OutwardDate, j.ExpectedReturnDate, j.InwardDate, j.Description, j.Remarks,
                j.ToPartyId, ToPartyName = j.ToParty?.PartyName,
                j.ProcessId, ProcessName = j.Process?.ProcessName,
                j.AttachmentUrlsJson, j.DocumentNo, j.RevisionNo, j.RevisionDate, j.CreatedAt, j.UpdatedAt, j.IsActive,
                CreatedByName = j.Creator != null ? j.Creator.FirstName + " " + j.Creator.LastName : null,
                Items = j.Items.Select(ji => new
                {
                    ji.Id, ji.PurchaseIndentItemId, PiNo = ji.PurchaseIndentItem?.PurchaseIndent?.PiNo,
                    ji.ItemId, ItemCode = ji.Item?.ItemCode, ItemName = ji.Item?.ItemName,
                    ji.Quantity, ji.Rate, ji.GstPercent, ji.Remarks,
                    ji.ItemNameSnapshot, ji.ItemCodeSnapshot, ji.OrderNumberSnapshot, ji.ProductNameSnapshot,
                }),
            }});
        }

        [HttpGet("next-code")]
        public async Task<ActionResult<ApiResponse<string>>> NextCode()
        {
            var seq = await _context.CodeSequences.FirstOrDefaultAsync(s => s.Key == "JW");
            var next = seq?.NextNumber ?? 1;
            return Ok(new ApiResponse<string> { Data = $"JW-{next:D4}" });
        }

        [HttpPost]
        public async Task<ActionResult<ApiResponse<object>>> Create([FromBody] CreateJwDto body)
        {
            if (!await HasPermissionAsync(nameof(UserPermission.CreateJobWork)) && !await IsAdminAsync()) return Forbidden();
            if (body.ToPartyId <= 0) return BadResponse("Job-work party is required.");
            if (body.Items.Count == 0) return BadResponse("At least one item is required.");

            await using var tx = await _context.Database.BeginTransactionAsync();
            try
            {
                var jwNo = await _codes.GenerateCodeAsync("JW");
                var docCtl = await _context.DocumentControls.AsNoTracking().FirstOrDefaultAsync(d => d.DocumentType == DocumentType.JobWork && d.IsApplied && d.IsActive);
                var jw = new JobWork
                {
                    JobWorkNo = jwNo,
                    ToPartyId = body.ToPartyId,
                    ProcessId = body.ProcessId,
                    OutwardDate = body.OutwardDate ?? DateTime.Now,
                    ExpectedReturnDate = body.ExpectedReturnDate,
                    Description = body.Description?.Trim(),
                    Remarks = body.Remarks?.Trim(),
                    Status = JobWorkStatus.InTransit,
                    AttachmentUrlsJson = body.AttachmentUrls != null && body.AttachmentUrls.Count > 0
                        ? System.Text.Json.JsonSerializer.Serialize(body.AttachmentUrls) : null,
                    DocumentNo = docCtl?.DocumentNo, RevisionNo = docCtl?.RevisionNo, RevisionDate = docCtl?.RevisionDate,
                    CreatedBy = CurrentUserId,
                    IsActive = true,
                };
                _context.JobWorks.Add(jw);
                await _context.SaveChangesAsync();

                foreach (var li in body.Items)
                {
                    if (li.Quantity <= 0) return BadResponse("Quantity must be > 0.");
                    var piItem = await _context.PurchaseIndentItems
                        .Include(pi => pi.PurchaseIndent)
                        .Include(pi => pi.Item)
                        .Include(pi => pi.OrderItem).ThenInclude(o => o!.Order)
                        .Include(pi => pi.OrderItem).ThenInclude(o => o!.Product)
                        .FirstOrDefaultAsync(pi => pi.Id == li.PurchaseIndentItemId);
                    if (piItem == null) return BadResponse($"PI item {li.PurchaseIndentItemId} not found.");
                    if (piItem.PurchaseIndent == null ||
                        piItem.PurchaseIndent.Status != PurchaseIndentStatus.Approved ||
                        piItem.PurchaseIndent.IndentFor != PurchaseIndentFor.JobWork ||
                        !piItem.PurchaseIndent.IsActive)
                        return BadResponse($"PI item {li.PurchaseIndentItemId} is not approved for job work.");

                    var alreadySent = await _context.JobWorkItems
                        .Where(j => j.PurchaseIndentItemId == piItem.Id && j.JobWork!.IsActive)
                        .SumAsync(j => (decimal?)j.Quantity) ?? 0;
                    if (alreadySent + li.Quantity > piItem.Quantity)
                        return BadResponse($"Cannot send more than PI quantity ({piItem.Quantity}) for item {piItem.ItemNameSnapshot}.");

                    _context.JobWorkItems.Add(new JobWorkItem
                    {
                        JobWorkId = jw.Id,
                        PurchaseIndentItemId = piItem.Id,
                        ItemId = piItem.ItemId,
                        Quantity = li.Quantity,
                        Rate = li.Rate,
                        GstPercent = li.GstPercent,
                        Remarks = li.Remarks?.Trim(),
                        ItemNameSnapshot = piItem.ItemNameSnapshot ?? piItem.Item?.ItemName,
                        ItemCodeSnapshot = piItem.ItemCodeSnapshot ?? piItem.Item?.ItemCode,
                        OrderNumberSnapshot = piItem.OrderNumberSnapshot ?? piItem.OrderItem?.Order?.OrderNumber,
                        ProductNameSnapshot = piItem.ProductNameSnapshot ?? piItem.OrderItem?.Product?.ProductName,
                    });

                    if (piItem.OrderBomItemPlanId.HasValue)
                    {
                        var plan = await _context.OrderBomItemPlans.FirstOrDefaultAsync(p => p.Id == piItem.OrderBomItemPlanId);
                        if (plan != null)
                        {
                            plan.JobWorkSentQty += li.Quantity;
                            plan.LastActivityAt = DateTime.Now;
                            plan.FirstActivityAt ??= DateTime.Now;
                        }
                    }
                }
                await _context.SaveChangesAsync();
                await tx.CommitAsync();
                return await GetById(jw.Id);
            }
            catch (Exception ex)
            {
                await tx.RollbackAsync();
                return StatusCode(500, new ApiResponse<object> { Success = false, Message = ex.Message });
            }
        }

        [HttpPost("{id:int}/mark-completed")]
        public async Task<ActionResult<ApiResponse<object>>> MarkCompleted(int id)
        {
            if (!await HasPermissionAsync(nameof(UserPermission.EditJobWork)) && !await IsAdminAsync()) return Forbidden();
            var jw = await _context.JobWorks.FirstOrDefaultAsync(x => x.Id == id);
            if (jw == null) return NotFoundResponse("Job work not found.");
            jw.Status = JobWorkStatus.Completed;
            jw.InwardDate = DateTime.Now;
            jw.UpdatedAt = DateTime.Now;
            await _context.SaveChangesAsync();
            return Ok(new ApiResponse<object> { Data = new { id, status = jw.Status } });
        }

        [HttpPatch("{id:int}/active")]
        public async Task<ActionResult<ApiResponse<object>>> ToggleActive(int id, [FromBody] UpdateMasterRequest body)
        {
            if (!await HasPermissionAsync(nameof(UserPermission.EditJobWork)) && !await IsAdminAsync()) return Forbidden();
            var jw = await _context.JobWorks.FirstOrDefaultAsync(x => x.Id == id);
            if (jw == null) return NotFoundResponse("Job work not found.");
            jw.IsActive = body.IsActive;
            jw.UpdatedAt = DateTime.Now;
            await _context.SaveChangesAsync();
            return Ok(new ApiResponse<object> { Data = new { id, isActive = jw.IsActive } });
        }

        // Pending JW items for Inward dropdown (qty > already inwarded)
        [HttpGet("pending-items-for-inward")]
        public async Task<ActionResult<ApiResponse<IEnumerable<object>>>> PendingForInward()
        {
            var data = await _context.JobWorkItems.AsNoTracking()
                .Include(j => j.JobWork).ThenInclude(jw => jw!.ToParty)
                .Include(j => j.Item)
                .Include(j => j.PurchaseIndentItem).ThenInclude(pi => pi!.OrderItem).ThenInclude(o => o!.Order)
                .Where(j => j.JobWork!.IsActive)
                .Select(j => new
                {
                    JobWorkItemId = j.Id, JobWorkId = j.JobWorkId, JwNo = j.JobWork!.JobWorkNo,
                    ToPartyId = j.JobWork.ToPartyId, ToPartyName = j.JobWork.ToParty!.PartyName,
                    j.ItemId, ItemCode = j.Item!.ItemCode, ItemName = j.Item.ItemName,
                    SentQty = j.Quantity,
                    OrderNumber = j.PurchaseIndentItem != null && j.PurchaseIndentItem.OrderItem != null
                                  ? j.PurchaseIndentItem.OrderItem.Order!.OrderNumber : null,
                    InwardedQty = _context.InwardLines.Where(l => l.SourceType == InwardSourceType.JobWork && l.SourceRefId == j.Id && l.Inward!.IsActive).Sum(l => (decimal?)l.Quantity) ?? 0,
                })
                .ToListAsync();
            return Ok(new ApiResponse<IEnumerable<object>> { Data = data });
        }

        [HttpPost("upload-attachment")]
        public async Task<ActionResult<ApiResponse<object>>> UploadAttachment([FromForm] IFormFile? file)
        {
            if (!await HasPermissionAsync(nameof(UserPermission.CreateJobWork)) && !await IsAdminAsync()) return Forbidden();
            file ??= Request.Form.Files.FirstOrDefault();
            if (file == null || file.Length == 0) return BadResponse("No file uploaded.");
            var ext = Path.GetExtension(file.FileName)?.ToLowerInvariant() ?? "";
            var allowed = new[] { ".pdf", ".png", ".jpg", ".jpeg", ".webp" };
            if (!allowed.Contains(ext)) return BadResponse("Unsupported file type.");
            var webRoot = _env.WebRootPath ?? Path.Combine(_env.ContentRootPath, "wwwroot");
            var dir = Path.Combine(webRoot, "storage", "job-works");
            Directory.CreateDirectory(dir);
            var fileName = $"jw_{DateTime.Now:yyyyMMddHHmmss}_{Guid.NewGuid().ToString("N").Substring(0, 8)}{ext}";
            var fullPath = Path.Combine(dir, fileName);
            await using (var fs = System.IO.File.Create(fullPath)) await file.CopyToAsync(fs);
            return Ok(new ApiResponse<object> { Data = new { url = $"/storage/job-works/{fileName}" } });
        }
    }
}
