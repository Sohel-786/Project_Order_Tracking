using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using net_backend.Data;
using net_backend.DTOs;
using net_backend.Models;

namespace net_backend.Controllers
{
    [Route("api/processes")]
    public class ProcessesController : BaseController
    {
        public ProcessesController(ApplicationDbContext context) : base(context) { }

        public class ProcessDto
        {
            public string ProcessName { get; set; } = string.Empty;
            public ProcessType ProcessType { get; set; } = ProcessType.JobWork;
            public int SequenceNumber { get; set; }
            public bool IsMandatory { get; set; }
            public bool IsActive { get; set; } = true;
        }

        [HttpGet]
        public async Task<ActionResult<ApiResponse<IEnumerable<ProcessMaster>>>> GetAll(
            [FromQuery] ProcessType? type = null,
            [FromQuery] bool? activeOnly = null,
            [FromQuery] string? search = null)
        {
            if (!await HasPermissionAsync(nameof(UserPermission.ManageProcess)) && !await IsAdminAsync()) return Forbidden();
            var q = _context.Processes.AsNoTracking().AsQueryable();
            if (type.HasValue)      q = q.Where(p => p.ProcessType == type.Value);
            if (activeOnly == true) q = q.Where(p => p.IsActive);
            if (!string.IsNullOrWhiteSpace(search))
                q = q.Where(p => p.ProcessName.ToLower().Contains(search.Trim().ToLower()));
            var list = await q.OrderBy(p => p.SequenceNumber).ThenBy(p => p.ProcessName).ToListAsync();
            return Ok(new ApiResponse<IEnumerable<ProcessMaster>> { Data = list });
        }

        [HttpGet("active")]
        public async Task<ActionResult<ApiResponse<IEnumerable<ProcessMaster>>>> GetActive([FromQuery] ProcessType? type = null)
        {
            var q = _context.Processes.AsNoTracking().Where(p => p.IsActive);
            if (type.HasValue) q = q.Where(p => p.ProcessType == type.Value);
            var list = await q.OrderBy(p => p.SequenceNumber).ToListAsync();
            return Ok(new ApiResponse<IEnumerable<ProcessMaster>> { Data = list });
        }

        [HttpPost]
        public async Task<ActionResult<ApiResponse<ProcessMaster>>> Create([FromBody] ProcessDto body)
        {
            if (!await CanCreateMasterAsync(nameof(UserPermission.ManageProcess))) return Forbidden();
            if (string.IsNullOrWhiteSpace(body.ProcessName)) return BadResponse("Process name is required.");
            var name = body.ProcessName.Trim();
            if (await _context.Processes.AnyAsync(p => p.ProcessName.ToLower() == name.ToLower()))
                return BadResponse("Process with this name already exists.");
            // User-created processes default to JobWork type; System processes are seeded only.
            var entity = new ProcessMaster
            {
                ProcessName = name,
                ProcessType = body.ProcessType == ProcessType.System ? ProcessType.JobWork : body.ProcessType,
                SequenceNumber = body.SequenceNumber,
                IsMandatory = body.IsMandatory,
                IsSystem = false,
                IsActive = body.IsActive,
            };
            _context.Processes.Add(entity);
            await _context.SaveChangesAsync();
            return Ok(new ApiResponse<ProcessMaster> { Data = entity });
        }

        [HttpPut("{id:int}")]
        public async Task<ActionResult<ApiResponse<ProcessMaster>>> Update(int id, [FromBody] ProcessDto body)
        {
            if (!await CanEditMasterAsync(nameof(UserPermission.ManageProcess))) return Forbidden();
            var p = await _context.Processes.FirstOrDefaultAsync(x => x.Id == id);
            if (p == null) return NotFoundResponse("Process not found.");
            if (p.IsSystem) return BadResponse("System process cannot be modified.");

            if (!string.IsNullOrWhiteSpace(body.ProcessName))
            {
                var newName = body.ProcessName.Trim();
                if (!string.Equals(newName, p.ProcessName, StringComparison.OrdinalIgnoreCase) &&
                    await _context.Processes.AnyAsync(x => x.Id != id && x.ProcessName.ToLower() == newName.ToLower()))
                    return BadResponse("Process with this name already exists.");
                p.ProcessName = newName;
            }
            p.ProcessType = body.ProcessType == ProcessType.System ? p.ProcessType : body.ProcessType;
            p.SequenceNumber = body.SequenceNumber;
            p.IsMandatory = body.IsMandatory;
            p.IsActive = body.IsActive;
            p.UpdatedAt = DateTime.Now;
            await _context.SaveChangesAsync();
            return Ok(new ApiResponse<ProcessMaster> { Data = p });
        }

        [HttpDelete("{id:int}")]
        public async Task<ActionResult<ApiResponse<object>>> Delete(int id)
        {
            if (!await CanEditMasterAsync(nameof(UserPermission.ManageProcess))) return Forbidden();
            var p = await _context.Processes.FirstOrDefaultAsync(x => x.Id == id);
            if (p == null) return NotFoundResponse("Process not found.");
            if (p.IsSystem) return BadResponse("System process cannot be deleted.");

            var inUse = await _context.BomItemProcesses.AnyAsync(b => b.ProcessId == id)
                     || await _context.JobWorks.AnyAsync(j => j.ProcessId == id);
            if (inUse) return BadResponse("Cannot delete – process is referenced in a BOM or job work.");

            _context.Processes.Remove(p);
            await _context.SaveChangesAsync();
            return Ok(new ApiResponse<object> { Data = new { id } });
        }
    }
}
