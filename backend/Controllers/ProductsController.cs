using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using net_backend.Data;
using net_backend.DTOs;
using net_backend.Models;
using net_backend.Services;

namespace net_backend.Controllers
{
    [Route("api/products")]
    public class ProductsController : BaseController
    {
        private readonly ICodeGeneratorService _codes;
        private readonly IExcelService _excel;
        private readonly IWebHostEnvironment _env;

        public ProductsController(ApplicationDbContext context, ICodeGeneratorService codes, IExcelService excel, IWebHostEnvironment env)
            : base(context)
        {
            _codes = codes;
            _excel = excel;
            _env = env;
        }

        [HttpGet]
        public async Task<ActionResult<ApiResponse<IEnumerable<object>>>> GetAll(
            [FromQuery] string? search = null,
            [FromQuery] int? productCategoryId = null,
            [FromQuery] bool? activeOnly = null,
            [FromQuery] int? page = null,
            [FromQuery] int? pageSize = null)
        {
            if (!await HasPermissionAsync(nameof(UserPermission.ManageProduct)) && !await IsAdminAsync()) return Forbidden();

            var q = _context.Products.AsNoTracking()
                .Include(p => p.ProductCategory)
                .Include(p => p.Unit)
                .AsQueryable();

            if (productCategoryId.HasValue) q = q.Where(p => p.ProductCategoryId == productCategoryId);
            if (activeOnly == true)         q = q.Where(p => p.IsActive);

            if (!string.IsNullOrWhiteSpace(search))
            {
                var s = search.Trim().ToLower();
                q = q.Where(p =>
                    p.ProductName.ToLower().Contains(s) ||
                    p.ProductCode.ToLower().Contains(s) ||
                    (p.DrawingNumber ?? "").ToLower().Contains(s));
            }

            q = q.OrderByDescending(p => p.Id);
            var total = await q.CountAsync();
            if (page.HasValue && pageSize.HasValue && page.Value > 0 && pageSize.Value > 0)
                q = q.Skip((page.Value - 1) * pageSize.Value).Take(pageSize.Value);

            var items = await q.Select(p => new
            {
                p.Id,
                p.ProductCode,
                p.ProductName,
                p.ProductCategoryId,
                ProductCategoryName = p.ProductCategory != null ? p.ProductCategory.Name : null,
                p.UnitId,
                UnitName = p.Unit != null ? p.Unit.Name : null,
                UnitSymbol = p.Unit != null ? p.Unit.Symbol : null,
                p.DrawingNumber,
                p.RevisionNumber,
                p.DrawingFileUrl,
                p.StandardBomAvailable,
                p.Description,
                p.IsActive,
                p.CreatedAt,
                p.UpdatedAt,
                ActiveBomCount = _context.Boms.Count(b => b.ProductId == p.Id && b.IsActive),
            }).ToListAsync();

            return Ok(new ApiResponse<IEnumerable<object>> { Data = items, TotalCount = total });
        }

        [HttpGet("active")]
        public async Task<ActionResult<ApiResponse<IEnumerable<object>>>> GetActive()
        {
            var data = await _context.Products.AsNoTracking()
                .Where(p => p.IsActive)
                .OrderBy(p => p.ProductName)
                .Select(p => new { p.Id, p.ProductCode, p.ProductName })
                .ToListAsync();
            return Ok(new ApiResponse<IEnumerable<object>> { Data = data });
        }

        [HttpGet("{id:int}")]
        public async Task<ActionResult<ApiResponse<object>>> GetById(int id)
        {
            var p = await _context.Products.AsNoTracking()
                .Include(x => x.ProductCategory).Include(x => x.Unit)
                .FirstOrDefaultAsync(x => x.Id == id);
            if (p == null) return NotFoundResponse("Product not found.");
            return Ok(new ApiResponse<object> { Data = new
            {
                p.Id, p.ProductCode, p.ProductName,
                p.ProductCategoryId, ProductCategoryName = p.ProductCategory?.Name,
                p.UnitId, UnitName = p.Unit?.Name, UnitSymbol = p.Unit?.Symbol,
                p.DrawingNumber, p.RevisionNumber, p.DrawingFileUrl,
                p.StandardBomAvailable, p.Description,
                p.IsActive, p.CreatedAt, p.UpdatedAt,
            } });
        }

        [HttpGet("next-code")]
        public async Task<ActionResult<ApiResponse<string>>> PeekNextCode()
        {
            var seq = await _context.CodeSequences.FirstOrDefaultAsync(s => s.Key == "PRODUCT");
            var next = seq?.NextNumber ?? 1;
            return Ok(new ApiResponse<string> { Data = $"PRD-{next:D8}" });
        }

        public class CreateProductDto
        {
            public string ProductName { get; set; } = string.Empty;
            public int? ProductCategoryId { get; set; }
            public int? UnitId { get; set; }
            public string? DrawingNumber { get; set; }
            public string? RevisionNumber { get; set; }
            public string? DrawingFileUrl { get; set; }
            public bool StandardBomAvailable { get; set; } = true;
            public string? Description { get; set; }
            public bool IsActive { get; set; } = true;
        }

        [HttpPost]
        public async Task<ActionResult<ApiResponse<object>>> Create([FromBody] CreateProductDto body)
        {
            if (!await CanCreateMasterAsync(nameof(UserPermission.ManageProduct))) return Forbidden();
            if (string.IsNullOrWhiteSpace(body.ProductName)) return BadResponse("Product name is required.");

            body.ProductName = body.ProductName.Trim();
            if (await _context.Products.AnyAsync(p => p.ProductName.ToLower() == body.ProductName.ToLower()))
                return BadResponse("Product with this name already exists.");

            var code = await _codes.GenerateCodeAsync("PRODUCT");
            var p = new Product
            {
                ProductCode = code,
                ProductName = body.ProductName,
                ProductCategoryId = body.ProductCategoryId,
                UnitId = body.UnitId,
                DrawingNumber = body.DrawingNumber?.Trim(),
                RevisionNumber = body.RevisionNumber?.Trim(),
                DrawingFileUrl = body.DrawingFileUrl,
                StandardBomAvailable = body.StandardBomAvailable,
                Description = body.Description?.Trim(),
                IsActive = body.IsActive,
                CreatedBy = CurrentUserId,
            };
            _context.Products.Add(p);
            await _context.SaveChangesAsync();
            return await GetById(p.Id);
        }

        [HttpPut("{id:int}")]
        public async Task<ActionResult<ApiResponse<object>>> Update(int id, [FromBody] CreateProductDto body)
        {
            if (!await CanEditMasterAsync(nameof(UserPermission.ManageProduct))) return Forbidden();
            var p = await _context.Products.FirstOrDefaultAsync(x => x.Id == id);
            if (p == null) return NotFoundResponse("Product not found.");

            if (!string.IsNullOrWhiteSpace(body.ProductName))
            {
                var newName = body.ProductName.Trim();
                if (!string.Equals(newName, p.ProductName, StringComparison.OrdinalIgnoreCase) &&
                    await _context.Products.AnyAsync(x => x.Id != id && x.ProductName.ToLower() == newName.ToLower()))
                    return BadResponse("Product with this name already exists.");
                p.ProductName = newName;
            }
            p.ProductCategoryId = body.ProductCategoryId;
            p.UnitId = body.UnitId;
            p.DrawingNumber = body.DrawingNumber?.Trim();
            p.RevisionNumber = body.RevisionNumber?.Trim();
            p.DrawingFileUrl = body.DrawingFileUrl;
            p.StandardBomAvailable = body.StandardBomAvailable;
            p.Description = body.Description?.Trim();
            p.IsActive = body.IsActive;
            p.UpdatedAt = DateTime.Now;
            await _context.SaveChangesAsync();
            return await GetById(id);
        }

        [HttpPatch("{id:int}/active")]
        public async Task<ActionResult<ApiResponse<object>>> ToggleActive(int id, [FromBody] UpdateMasterRequest body)
        {
            if (!await CanEditMasterAsync(nameof(UserPermission.ManageProduct))) return Forbidden();
            var p = await _context.Products.FirstOrDefaultAsync(x => x.Id == id);
            if (p == null) return NotFoundResponse("Product not found.");
            p.IsActive = body.IsActive;
            p.UpdatedAt = DateTime.Now;
            await _context.SaveChangesAsync();
            return Ok(new ApiResponse<object> { Data = new { id, isActive = p.IsActive } });
        }

        [HttpDelete("{id:int}")]
        public async Task<ActionResult<ApiResponse<object>>> Delete(int id)
        {
            if (!await CanEditMasterAsync(nameof(UserPermission.ManageProduct))) return Forbidden();
            var p = await _context.Products.FirstOrDefaultAsync(x => x.Id == id);
            if (p == null) return NotFoundResponse("Product not found.");

            var hasUsage = await _context.Boms.AnyAsync(b => b.ProductId == id)
                        || await _context.OrderItems.AnyAsync(oi => oi.ProductId == id);
            if (hasUsage) return BadResponse("Cannot delete – product has BOM or order history. Deactivate it instead.");

            _context.Products.Remove(p);
            await _context.SaveChangesAsync();
            return Ok(new ApiResponse<object> { Data = new { id } });
        }

        [HttpPost("upload-drawing")]
        public async Task<ActionResult<ApiResponse<object>>> UploadDrawing([FromForm] IFormFile? file)
        {
            if (!await CanCreateMasterAsync(nameof(UserPermission.ManageProduct))) return Forbidden();
            file ??= Request.Form.Files.FirstOrDefault();
            if (file == null || file.Length == 0) return BadResponse("No file uploaded.");

            var allowed = new[] { ".pdf", ".png", ".jpg", ".jpeg", ".webp", ".dwg", ".dxf" };
            var ext = Path.GetExtension(file.FileName)?.ToLowerInvariant() ?? "";
            if (!allowed.Contains(ext)) return BadResponse("Unsupported file type.");

            var webRoot = _env.WebRootPath ?? Path.Combine(_env.ContentRootPath, "wwwroot");
            var dir = Path.Combine(webRoot, "storage", "products");
            Directory.CreateDirectory(dir);

            var fileName = $"prd_{DateTime.Now:yyyyMMddHHmmss}_{Guid.NewGuid().ToString("N").Substring(0, 8)}{ext}";
            var fullPath = Path.Combine(dir, fileName);
            await using (var fs = System.IO.File.Create(fullPath))
                await file.CopyToAsync(fs);
            return Ok(new ApiResponse<object> { Data = new { url = $"/storage/products/{fileName}" } });
        }
    }
}
