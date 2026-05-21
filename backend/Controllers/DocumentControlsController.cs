using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using net_backend.Data;
using net_backend.DTOs;
using net_backend.Models;

namespace net_backend.Controllers
{
    [Route("api/document-controls")]
    public class DocumentControlsController : BaseController
    {
        public DocumentControlsController(ApplicationDbContext context) : base(context) { }

        /// <summary>List document controls, optionally filtered by type.</summary>
        [HttpGet]
        public async Task<ActionResult<ApiResponse<IEnumerable<DocumentControlDto>>>> GetAll([FromQuery] DocumentType? documentType)
        {
            if (!await HasPermissionAsync(nameof(UserPermission.ManageDocumentControl))) return Forbidden();

            var query = _context.DocumentControls
                .Where(d => d.IsActive)
                .AsQueryable();
            if (documentType.HasValue)
                query = query.Where(d => d.DocumentType == documentType.Value);

            var list = await query
                .OrderBy(d => d.DocumentType)
                .ThenByDescending(d => d.RevisionDate)
                .Select(d => new DocumentControlDto
                {
                    Id = d.Id,
                    DocumentType = d.DocumentType,
                    DocumentNo = d.DocumentNo,
                    RevisionNo = d.RevisionNo,
                    RevisionDate = d.RevisionDate,
                    IsApplied = d.IsApplied,
                    IsActive = d.IsActive
                })
                .ToListAsync();

            return Ok(new ApiResponse<IEnumerable<DocumentControlDto>> { Data = list });
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<ApiResponse<DocumentControlDto>>> GetById(int id)
        {
            if (!await HasPermissionAsync(nameof(UserPermission.ManageDocumentControl))) return Forbidden();

            var dc = await _context.DocumentControls.FindAsync(id);
            if (dc == null || !dc.IsActive) return NotFound();

            return Ok(new ApiResponse<DocumentControlDto>
            {
                Data = new DocumentControlDto
                {
                    Id = dc.Id,
                    DocumentType = dc.DocumentType,
                    DocumentNo = dc.DocumentNo,
                    RevisionNo = dc.RevisionNo,
                    RevisionDate = dc.RevisionDate,
                    IsApplied = dc.IsApplied,
                    IsActive = dc.IsActive
                }
            });
        }

        [HttpPost]
        public async Task<ActionResult<ApiResponse<DocumentControlDto>>> Create([FromBody] CreateDocumentControlDto dto)
        {
            if (!await HasPermissionAsync(nameof(UserPermission.ManageDocumentControl))) return Forbidden();

            var dc = new DocumentControl
            {
                DocumentType = dto.DocumentType,
                DocumentNo = (dto.DocumentNo ?? "").Trim(),
                RevisionNo = (dto.RevisionNo ?? "").Trim(),
                RevisionDate = dto.RevisionDate,
                IsApplied = false,
                IsActive = true
            };
            if (string.IsNullOrEmpty(dc.DocumentNo) || string.IsNullOrEmpty(dc.RevisionNo))
                return BadRequest(new ApiResponse<DocumentControlDto> { Success = false, Message = "Document No and Revision No are required." });

            _context.DocumentControls.Add(dc);
            await _context.SaveChangesAsync();

            return StatusCode(201, new ApiResponse<DocumentControlDto>
            {
                Data = new DocumentControlDto
                {
                    Id = dc.Id,
                    DocumentType = dc.DocumentType,
                    DocumentNo = dc.DocumentNo,
                    RevisionNo = dc.RevisionNo,
                    RevisionDate = dc.RevisionDate,
                    IsApplied = dc.IsApplied,
                    IsActive = dc.IsActive
                }
            });
        }

        [HttpPut("{id}")]
        public async Task<ActionResult<ApiResponse<bool>>> Update(int id, [FromBody] UpdateDocumentControlDto dto)
        {
            if (!await HasPermissionAsync(nameof(UserPermission.ManageDocumentControl))) return Forbidden();

            var dc = await _context.DocumentControls.FindAsync(id);
            if (dc == null || !dc.IsActive) return NotFound();

            dc.DocumentNo = (dto.DocumentNo ?? "").Trim();
            dc.RevisionNo = (dto.RevisionNo ?? "").Trim();
            dc.RevisionDate = dto.RevisionDate;
            if (string.IsNullOrEmpty(dc.DocumentNo) || string.IsNullOrEmpty(dc.RevisionNo))
                return BadRequest(new ApiResponse<bool> { Success = false, Message = "Document No and Revision No are required." });

            await _context.SaveChangesAsync();
            return Ok(new ApiResponse<bool> { Data = true });
        }

        /// <summary>Set this revision as the applied one for its DocumentType. Only one can be applied per type; others are unapplied.</summary>
        [HttpPost("{id}/apply")]
        public async Task<ActionResult<ApiResponse<bool>>> Apply(int id)
        {
            if (!await HasPermissionAsync(nameof(UserPermission.ManageDocumentControl))) return Forbidden();

            var dc = await _context.DocumentControls.FindAsync(id);
            if (dc == null || !dc.IsActive) return NotFound();

            var sameType = await _context.DocumentControls
                .Where(d => d.DocumentType == dc.DocumentType && d.IsActive)
                .ToListAsync();
            foreach (var d in sameType)
                d.IsApplied = (d.Id == id);
            await _context.SaveChangesAsync();

            return Ok(new ApiResponse<bool> { Data = true });
        }

        [HttpDelete("{id}")]
        public async Task<ActionResult<ApiResponse<bool>>> Delete(int id)
        {
            if (!await HasPermissionAsync(nameof(UserPermission.ManageDocumentControl))) return Forbidden();

            var dc = await _context.DocumentControls.FindAsync(id);
            if (dc == null) return NotFound();

            dc.IsActive = false;
            if (dc.IsApplied)
            {
                dc.IsApplied = false;
                var next = await _context.DocumentControls
                    .Where(d => d.DocumentType == dc.DocumentType && d.IsActive && d.Id != id)
                    .OrderByDescending(d => d.RevisionDate)
                    .FirstOrDefaultAsync();
                if (next != null) next.IsApplied = true;
            }
            await _context.SaveChangesAsync();
            return Ok(new ApiResponse<bool> { Data = true });
        }
    }
}
