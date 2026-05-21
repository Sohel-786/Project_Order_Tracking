using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using net_backend.Data;
using net_backend.DTOs;
using net_backend.Models;
using net_backend.Services;

namespace net_backend.Controllers
{
    [Route("api/parties")]
    public class PartiesController : BaseController
    {
        private readonly IExcelService _excel;

        public PartiesController(ApplicationDbContext context, IExcelService excel) : base(context)
        {
            _excel = excel;
        }

        // ─────────────────────────────────────── List / single

        [HttpGet]
        public async Task<ActionResult<ApiResponse<IEnumerable<Party>>>> GetAll(
            [FromQuery] string? search = null,
            [FromQuery] PartyType? type = null,
            [FromQuery] bool? activeOnly = null,
            [FromQuery] int? page = null,
            [FromQuery] int? pageSize = null)
        {
            if (!await HasPermissionAsync(nameof(UserPermission.ManageParty)) && !await IsAdminAsync()) return Forbidden();

            var q = _context.Parties.AsNoTracking().AsQueryable();
            if (type.HasValue) q = q.Where(p => p.PartyType == type.Value);
            if (activeOnly == true) q = q.Where(p => p.IsActive);

            if (!string.IsNullOrWhiteSpace(search))
            {
                var s = search.Trim().ToLower();
                q = q.Where(p =>
                    p.PartyName.ToLower().Contains(s) ||
                    (p.ContactPerson ?? "").ToLower().Contains(s) ||
                    (p.MobileNumber ?? "").Contains(s) ||
                    (p.Email ?? "").ToLower().Contains(s) ||
                    (p.GstNo ?? "").ToLower().Contains(s));
            }

            q = q.OrderBy(p => p.PartyName);
            var total = await q.CountAsync();
            if (page.HasValue && pageSize.HasValue && page.Value > 0 && pageSize.Value > 0)
                q = q.Skip((page.Value - 1) * pageSize.Value).Take(pageSize.Value);

            var items = await q.ToListAsync();
            return Ok(new ApiResponse<IEnumerable<Party>> { Data = items, TotalCount = total });
        }

        [HttpGet("active")]
        public async Task<ActionResult<ApiResponse<IEnumerable<Party>>>> GetActive([FromQuery] PartyType? type = null)
        {
            var q = _context.Parties.AsNoTracking().Where(p => p.IsActive);
            if (type.HasValue) q = q.Where(p => p.PartyType == type.Value);
            var data = await q.OrderBy(p => p.PartyName).ToListAsync();
            return Ok(new ApiResponse<IEnumerable<Party>> { Data = data });
        }

        [HttpGet("{id:int}")]
        public async Task<ActionResult<ApiResponse<Party>>> GetById(int id)
        {
            var party = await _context.Parties.AsNoTracking().FirstOrDefaultAsync(p => p.Id == id);
            if (party == null) return NotFoundResponse("Party not found.");
            return Ok(new ApiResponse<Party> { Data = party });
        }

        // ─────────────────────────────────────── Create / Update

        [HttpPost]
        public async Task<ActionResult<ApiResponse<Party>>> Create([FromBody] Party request)
        {
            if (!await CanCreateMasterAsync(nameof(UserPermission.ManageParty))) return Forbidden();
            if (string.IsNullOrWhiteSpace(request.PartyName)) return BadResponse("Party name is required.");
            request.PartyName = request.PartyName.Trim();

            var exists = await _context.Parties.AnyAsync(p => p.PartyType == request.PartyType && p.PartyName.ToLower() == request.PartyName.ToLower());
            if (exists) return BadResponse("A party with this name and type already exists.");

            request.CreatedAt = DateTime.Now;
            request.UpdatedAt = DateTime.Now;
            _context.Parties.Add(request);
            await _context.SaveChangesAsync();
            return Ok(new ApiResponse<Party> { Data = request, Message = "Party created." });
        }

        [HttpPut("{id:int}")]
        public async Task<ActionResult<ApiResponse<Party>>> Update(int id, [FromBody] Party request)
        {
            if (!await CanEditMasterAsync(nameof(UserPermission.ManageParty))) return Forbidden();

            var party = await _context.Parties.FirstOrDefaultAsync(p => p.Id == id);
            if (party == null) return NotFoundResponse("Party not found.");

            if (!string.IsNullOrWhiteSpace(request.PartyName))
            {
                var newName = request.PartyName.Trim();
                if (!string.Equals(newName, party.PartyName, StringComparison.OrdinalIgnoreCase))
                {
                    var clash = await _context.Parties.AnyAsync(p => p.Id != id && p.PartyType == request.PartyType && p.PartyName.ToLower() == newName.ToLower());
                    if (clash) return BadResponse("A party with this name and type already exists.");
                }
                party.PartyName = newName;
            }

            party.PartyType    = request.PartyType;
            party.ContactPerson= request.ContactPerson?.Trim();
            party.MobileNumber = request.MobileNumber?.Trim();
            party.Email        = request.Email?.Trim();
            party.GstNo        = request.GstNo?.Trim();
            party.GstDate      = request.GstDate;
            party.Address      = request.Address?.Trim();
            party.IsActive     = request.IsActive;
            party.UpdatedAt    = DateTime.Now;

            await _context.SaveChangesAsync();
            return Ok(new ApiResponse<Party> { Data = party });
        }

        [HttpPatch("{id:int}/active")]
        public async Task<ActionResult<ApiResponse<Party>>> ToggleActive(int id, [FromBody] UpdateMasterRequest body)
        {
            if (!await CanEditMasterAsync(nameof(UserPermission.ManageParty))) return Forbidden();
            var party = await _context.Parties.FirstOrDefaultAsync(p => p.Id == id);
            if (party == null) return NotFoundResponse("Party not found.");

            // Block deactivation if party is referenced in active transactions
            if (party.IsActive && !body.IsActive)
            {
                var hasUsage =
                    await _context.Orders.AnyAsync(o => o.IsActive && o.CustomerId == id) ||
                    await _context.PurchaseOrders.AnyAsync(po => po.IsActive && po.VendorId == id) ||
                    await _context.JobWorks.AnyAsync(j => j.IsActive && j.ToPartyId == id) ||
                    await _context.Inwards.AnyAsync(i => i.IsActive && i.VendorId == id) ||
                    await _context.QcEntries.AnyAsync(q => q.IsActive && q.PartyId == id) ||
                    await _context.DeliveryChallans.AnyAsync(d => d.IsActive && d.CustomerId == id);
                if (hasUsage) return BadResponse("Cannot deactivate – this party is referenced in active transactions.");
            }

            party.IsActive  = body.IsActive;
            party.UpdatedAt = DateTime.Now;
            await _context.SaveChangesAsync();
            return Ok(new ApiResponse<Party> { Data = party });
        }

        [HttpDelete("{id:int}")]
        public async Task<ActionResult<ApiResponse<object>>> Delete(int id)
        {
            if (!await CanEditMasterAsync(nameof(UserPermission.ManageParty))) return Forbidden();
            var party = await _context.Parties.FirstOrDefaultAsync(p => p.Id == id);
            if (party == null) return NotFoundResponse("Party not found.");

            var hasUsage =
                await _context.Orders.AnyAsync(o => o.CustomerId == id) ||
                await _context.PurchaseOrders.AnyAsync(po => po.VendorId == id) ||
                await _context.JobWorks.AnyAsync(j => j.ToPartyId == id) ||
                await _context.Inwards.AnyAsync(i => i.VendorId == id) ||
                await _context.QcEntries.AnyAsync(q => q.PartyId == id) ||
                await _context.DeliveryChallans.AnyAsync(d => d.CustomerId == id);
            if (hasUsage) return BadResponse("Cannot delete – this party has transaction history. Deactivate it instead.");

            _context.Parties.Remove(party);
            await _context.SaveChangesAsync();
            return Ok(new ApiResponse<object> { Data = new { id }, Message = "Party deleted." });
        }

        // ─────────────────────────────────────── Excel export

        [HttpGet("export")]
        public async Task<IActionResult> Export([FromQuery] PartyType? type = null)
        {
            if (!await HasPermissionAsync(nameof(UserPermission.ExportMaster))) return Forbidden();

            var q = _context.Parties.AsNoTracking().AsQueryable();
            if (type.HasValue) q = q.Where(p => p.PartyType == type.Value);
            var list = await q.OrderBy(p => p.PartyName).ToListAsync();

            var rows = list.Select(p => new
            {
                PartyName = p.PartyName,
                PartyType = p.PartyType.ToString(),
                ContactPerson = p.ContactPerson,
                MobileNumber = p.MobileNumber,
                Email = p.Email,
                GstNo = p.GstNo,
                GstDate = p.GstDate,
                Address = p.Address,
                IsActive = p.IsActive ? "Yes" : "No",
            });

            var bytes = _excel.GenerateExcel(rows, "Parties", $"Party Master Export — {DateTime.Now:dd-MMM-yyyy hh:mm tt}");
            return File(bytes,
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                $"parties_{DateTime.Now:yyyyMMdd_HHmm}.xlsx");
        }
    }
}
