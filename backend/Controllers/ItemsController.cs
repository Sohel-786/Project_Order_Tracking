using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using net_backend.Data;
using net_backend.DTOs;
using net_backend.Models;
using net_backend.Services;

namespace net_backend.Controllers
{
    [Route("api/items")]
    public class ItemsController : BaseController
    {
        private readonly ICodeGeneratorService _codes;
        private readonly IWebHostEnvironment _env;
        private readonly IExcelService _excel;

        public ItemsController(ApplicationDbContext context, ICodeGeneratorService codes, IWebHostEnvironment env, IExcelService excel)
            : base(context)
        {
            _codes = codes;
            _env = env;
            _excel = excel;
        }

        // ───────── List

        [HttpGet]
        public async Task<ActionResult<ApiResponse<IEnumerable<ItemDto>>>> GetAll(
            [FromQuery] string? search = null,
            [FromQuery] int? itemCategoryId = null,
            [FromQuery] int? itemTypeId = null,
            [FromQuery] int? itemGroupId = null,
            [FromQuery] int? materialId = null,
            [FromQuery] bool? activeOnly = null,
            [FromQuery] int? page = null,
            [FromQuery] int? pageSize = null)
        {
            if (!await HasPermissionAsync(nameof(UserPermission.ManageItem)) && !await IsAdminAsync()) return Forbidden();

            var q = _context.Items.AsNoTracking()
                .Include(i => i.ItemCategory)
                .Include(i => i.ItemType)
                .Include(i => i.ItemGroup)
                .Include(i => i.Material)
                .Include(i => i.Unit)
                .AsQueryable();

            if (itemCategoryId.HasValue) q = q.Where(i => i.ItemCategoryId == itemCategoryId);
            if (itemTypeId.HasValue)     q = q.Where(i => i.ItemTypeId == itemTypeId);
            if (itemGroupId.HasValue)    q = q.Where(i => i.ItemGroupId == itemGroupId);
            if (materialId.HasValue)     q = q.Where(i => i.MaterialId == materialId);
            if (activeOnly == true)      q = q.Where(i => i.IsActive);

            if (!string.IsNullOrWhiteSpace(search))
            {
                var s = search.Trim().ToLower();
                q = q.Where(i =>
                    i.ItemName.ToLower().Contains(s) ||
                    i.ItemCode.ToLower().Contains(s) ||
                    (i.DrawingNumber ?? "").ToLower().Contains(s));
            }

            q = q.OrderByDescending(i => i.Id);
            var total = await q.CountAsync();
            if (page.HasValue && pageSize.HasValue && page.Value > 0 && pageSize.Value > 0)
                q = q.Skip((page.Value - 1) * pageSize.Value).Take(pageSize.Value);

            var data = await q.Select(i => ToDto(i)).ToListAsync();
            return Ok(new ApiResponse<IEnumerable<ItemDto>> { Data = data, TotalCount = total });
        }

        [HttpGet("active")]
        public async Task<ActionResult<ApiResponse<IEnumerable<ItemDto>>>> GetActive()
        {
            var data = await _context.Items.AsNoTracking()
                .Include(i => i.Unit)
                .Where(i => i.IsActive)
                .OrderBy(i => i.ItemName)
                .Select(i => ToDto(i)).ToListAsync();
            return Ok(new ApiResponse<IEnumerable<ItemDto>> { Data = data });
        }

        [HttpGet("{id:int}")]
        public async Task<ActionResult<ApiResponse<ItemDto>>> GetById(int id)
        {
            var i = await _context.Items.AsNoTracking()
                .Include(i => i.ItemCategory)
                .Include(i => i.ItemType)
                .Include(i => i.ItemGroup)
                .Include(i => i.Material)
                .Include(i => i.Unit)
                .FirstOrDefaultAsync(x => x.Id == id);
            if (i == null) return NotFoundResponse("Item not found.");
            return Ok(new ApiResponse<ItemDto> { Data = ToDto(i) });
        }

        [HttpGet("next-code")]
        public async Task<ActionResult<ApiResponse<string>>> PeekNextCode()
        {
            var seq = await _context.CodeSequences.FirstOrDefaultAsync(s => s.Key == "ITEM");
            var next = seq?.NextNumber ?? 1;
            return Ok(new ApiResponse<string> { Data = $"ITM-{next:D8}" });
        }

        // ───────── Create / update

        [HttpPost]
        public async Task<ActionResult<ApiResponse<ItemDto>>> Create([FromBody] CreateItemDto body)
        {
            if (!await CanCreateMasterAsync(nameof(UserPermission.ManageItem))) return Forbidden();
            if (string.IsNullOrWhiteSpace(body.ItemName)) return BadResponse("Item name is required.");

            body.ItemName = body.ItemName.Trim();
            if (await _context.Items.AnyAsync(i => i.ItemName.ToLower() == body.ItemName.ToLower()))
                return BadResponse("Item with this name already exists.");

            var code = await _codes.GenerateCodeAsync("ITEM");
            var item = new Item
            {
                ItemCode = code,
                ItemName = body.ItemName,
                ItemCategoryId   = body.ItemCategoryId,
                ItemTypeId       = body.ItemTypeId,
                ItemGroupId      = body.ItemGroupId,
                MaterialId       = body.MaterialId,
                UnitId           = body.UnitId,
                DrawingNumber    = body.DrawingNumber?.Trim(),
                RevisionNumber   = body.RevisionNumber?.Trim(),
                DrawingFileUrl   = body.DrawingFileUrl,
                ValidationRequired = body.ValidationRequired,
                Description      = body.Description?.Trim(),
                IsActive         = body.IsActive,
                CreatedBy        = CurrentUserId,
            };
            _context.Items.Add(item);
            await _context.SaveChangesAsync();

            return await GetById(item.Id);
        }

        [HttpPut("{id:int}")]
        public async Task<ActionResult<ApiResponse<ItemDto>>> Update(int id, [FromBody] UpdateItemDto body)
        {
            if (!await CanEditMasterAsync(nameof(UserPermission.ManageItem))) return Forbidden();
            var item = await _context.Items.FirstOrDefaultAsync(i => i.Id == id);
            if (item == null) return NotFoundResponse("Item not found.");

            if (!string.IsNullOrWhiteSpace(body.ItemName))
            {
                var newName = body.ItemName.Trim();
                if (!string.Equals(newName, item.ItemName, StringComparison.OrdinalIgnoreCase) &&
                    await _context.Items.AnyAsync(i => i.Id != id && i.ItemName.ToLower() == newName.ToLower()))
                    return BadResponse("Item with this name already exists.");
                item.ItemName = newName;
            }
            item.ItemCategoryId   = body.ItemCategoryId;
            item.ItemTypeId       = body.ItemTypeId;
            item.ItemGroupId      = body.ItemGroupId;
            item.MaterialId       = body.MaterialId;
            item.UnitId           = body.UnitId;
            item.DrawingNumber    = body.DrawingNumber?.Trim();
            item.RevisionNumber   = body.RevisionNumber?.Trim();
            item.DrawingFileUrl   = body.DrawingFileUrl;
            item.ValidationRequired = body.ValidationRequired;
            item.Description      = body.Description?.Trim();
            item.IsActive         = body.IsActive;
            item.UpdatedAt        = DateTime.Now;

            await _context.SaveChangesAsync();
            return await GetById(item.Id);
        }

        [HttpPatch("{id:int}/active")]
        public async Task<ActionResult<ApiResponse<object>>> ToggleActive(int id, [FromBody] UpdateMasterRequest body)
        {
            if (!await CanEditMasterAsync(nameof(UserPermission.ManageItem))) return Forbidden();
            var item = await _context.Items.FirstOrDefaultAsync(i => i.Id == id);
            if (item == null) return NotFoundResponse("Item not found.");
            item.IsActive = body.IsActive;
            item.UpdatedAt = DateTime.Now;
            await _context.SaveChangesAsync();
            return Ok(new ApiResponse<object> { Data = new { id, isActive = item.IsActive } });
        }

        [HttpDelete("{id:int}")]
        public async Task<ActionResult<ApiResponse<object>>> Delete(int id)
        {
            if (!await CanEditMasterAsync(nameof(UserPermission.ManageItem))) return Forbidden();
            var item = await _context.Items.FirstOrDefaultAsync(i => i.Id == id);
            if (item == null) return NotFoundResponse("Item not found.");

            var hasUsage = await _context.BomItems.AnyAsync(b => b.ItemId == id)
                        || await _context.PurchaseIndentItems.AnyAsync(p => p.ItemId == id)
                        || await _context.InwardLines.AnyAsync(l => l.ItemId == id);
            if (hasUsage) return BadResponse("Cannot delete – item has transaction history. Deactivate it instead.");

            _context.Items.Remove(item);
            await _context.SaveChangesAsync();
            return Ok(new ApiResponse<object> { Data = new { id } });
        }

        // ───────── Drawing upload

        [HttpPost("upload-drawing")]
        public async Task<ActionResult<ApiResponse<object>>> UploadDrawing([FromForm] IFormFile? file)
        {
            if (!await CanCreateMasterAsync(nameof(UserPermission.ManageItem))) return Forbidden();
            file ??= Request.Form.Files.FirstOrDefault();
            if (file == null || file.Length == 0) return BadResponse("No file uploaded.");

            var allowed = new[] { ".pdf", ".png", ".jpg", ".jpeg", ".webp", ".dwg", ".dxf" };
            var ext = Path.GetExtension(file.FileName)?.ToLowerInvariant() ?? "";
            if (!allowed.Contains(ext)) return BadResponse("Unsupported file type.");

            var webRoot = _env.WebRootPath ?? Path.Combine(_env.ContentRootPath, "wwwroot");
            var dir = Path.Combine(webRoot, "storage", "items");
            Directory.CreateDirectory(dir);

            var fileName = $"itm_{DateTime.Now:yyyyMMddHHmmss}_{Guid.NewGuid().ToString("N").Substring(0, 8)}{ext}";
            var fullPath = Path.Combine(dir, fileName);
            await using (var fs = System.IO.File.Create(fullPath))
                await file.CopyToAsync(fs);

            var url = $"/storage/items/{fileName}";
            return Ok(new ApiResponse<object> { Data = new { url } });
        }

        // ───────── Export

        [HttpGet("export")]
        public async Task<IActionResult> Export()
        {
            if (!await HasPermissionAsync(nameof(UserPermission.ExportMaster))) return Forbidden();
            var rows = await _context.Items.AsNoTracking()
                .Include(i => i.ItemCategory).Include(i => i.ItemType).Include(i => i.ItemGroup)
                .Include(i => i.Material).Include(i => i.Unit)
                .OrderBy(i => i.ItemName).ToListAsync();
            var bytes = _excel.GenerateExcel(rows.Select(i => new
            {
                ItemCode      = i.ItemCode,
                ItemName      = i.ItemName,
                ItemCategory  = i.ItemCategory?.Name,
                ItemType      = i.ItemType?.Name,
                ItemGroup     = i.ItemGroup?.Name,
                Material      = i.Material?.Name,
                Unit          = i.Unit?.Name,
                DrawingNumber = i.DrawingNumber,
                Revision      = i.RevisionNumber,
                Description   = i.Description,
                IsActive      = i.IsActive ? "Yes" : "No",
            }), "Items", $"Item Master — {DateTime.Now:dd-MMM-yyyy hh:mm tt}");
            return File(bytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", $"items_{DateTime.Now:yyyyMMdd_HHmm}.xlsx");
        }

        // ───────── Helpers
        private static ItemDto ToDto(Item i) => new()
        {
            Id = i.Id,
            ItemCode = i.ItemCode,
            ItemName = i.ItemName,
            ItemCategoryId = i.ItemCategoryId,
            ItemCategoryName = i.ItemCategory?.Name,
            ItemTypeId = i.ItemTypeId,
            ItemTypeName = i.ItemType?.Name,
            ItemGroupId = i.ItemGroupId,
            ItemGroupName = i.ItemGroup?.Name,
            MaterialId = i.MaterialId,
            MaterialName = i.Material?.Name,
            UnitId = i.UnitId,
            UnitName = i.Unit?.Name,
            UnitSymbol = i.Unit?.Symbol,
            DrawingNumber = i.DrawingNumber,
            RevisionNumber = i.RevisionNumber,
            DrawingFileUrl = i.DrawingFileUrl,
            ValidationRequired = i.ValidationRequired,
            Description = i.Description,
            IsActive = i.IsActive,
            CreatedAt = i.CreatedAt,
            UpdatedAt = i.UpdatedAt,
        };
    }
}
