using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using net_backend.Data;
using net_backend.DTOs;
using net_backend.Models;
using net_backend.Services;

namespace net_backend.Controllers
{
    /// <summary>
    /// Generic CRUD endpoints for single-name sub-masters:
    /// Item Type, Item Category, Item Group, Product Category, Material, Unit.
    /// </summary>
    [Route("api/masters")]
    public class MasterController : BaseController
    {
        private readonly IExcelService _excel;
        public MasterController(ApplicationDbContext context, IExcelService excel) : base(context)
        {
            _excel = excel;
        }

        // ───────── Item Types
        [HttpGet("item-types")]            public Task<ActionResult<ApiResponse<IEnumerable<object>>>> ListItemTypes()        => ListNamedAsync(_context.ItemTypes,        nameof(UserPermission.ManageItemType));
        [HttpGet("item-types/active")]     public Task<ActionResult<ApiResponse<IEnumerable<object>>>> ActiveItemTypes()      => ListActiveAsync(_context.ItemTypes);
        [HttpPost("item-types")]           public Task<ActionResult<ApiResponse<object>>> CreateItemType([FromBody] ItemType x)        => CreateAsync(_context.ItemTypes,         x, nameof(UserPermission.ManageItemType));
        [HttpPut("item-types/{id:int}")]   public Task<ActionResult<ApiResponse<object>>> UpdateItemType(int id, [FromBody] UpdateMasterRequest b) => UpdateAsync(_context.ItemTypes, id, b, nameof(UserPermission.ManageItemType));
        [HttpDelete("item-types/{id:int}")]public Task<ActionResult<ApiResponse<object>>> DeleteItemType(int id) => DeleteAsync(_context.ItemTypes, id, nameof(UserPermission.ManageItemType), idx => _context.Items.AnyAsync(i => i.ItemTypeId == idx));

        // ───────── Item Categories
        [HttpGet("item-categories")]            public Task<ActionResult<ApiResponse<IEnumerable<object>>>> ListItemCategories()    => ListNamedAsync(_context.ItemCategories, nameof(UserPermission.ManageItemCategory));
        [HttpGet("item-categories/active")]     public Task<ActionResult<ApiResponse<IEnumerable<object>>>> ActiveItemCategories()  => ListActiveAsync(_context.ItemCategories);
        [HttpPost("item-categories")]           public Task<ActionResult<ApiResponse<object>>> CreateItemCategory([FromBody] ItemCategory x)    => CreateAsync(_context.ItemCategories, x, nameof(UserPermission.ManageItemCategory));
        [HttpPut("item-categories/{id:int}")]   public Task<ActionResult<ApiResponse<object>>> UpdateItemCategory(int id, [FromBody] UpdateMasterRequest b) => UpdateAsync(_context.ItemCategories, id, b, nameof(UserPermission.ManageItemCategory));
        [HttpDelete("item-categories/{id:int}")]public Task<ActionResult<ApiResponse<object>>> DeleteItemCategory(int id) => DeleteAsync(_context.ItemCategories, id, nameof(UserPermission.ManageItemCategory), idx => _context.Items.AnyAsync(i => i.ItemCategoryId == idx));

        // ───────── Item Groups
        [HttpGet("item-groups")]            public Task<ActionResult<ApiResponse<IEnumerable<object>>>> ListItemGroups()    => ListNamedAsync(_context.ItemGroups,     nameof(UserPermission.ManageItemGroup));
        [HttpGet("item-groups/active")]     public Task<ActionResult<ApiResponse<IEnumerable<object>>>> ActiveItemGroups()  => ListActiveAsync(_context.ItemGroups);
        [HttpPost("item-groups")]           public Task<ActionResult<ApiResponse<object>>> CreateItemGroup([FromBody] ItemGroup x)    => CreateAsync(_context.ItemGroups, x, nameof(UserPermission.ManageItemGroup));
        [HttpPut("item-groups/{id:int}")]   public Task<ActionResult<ApiResponse<object>>> UpdateItemGroup(int id, [FromBody] UpdateMasterRequest b) => UpdateAsync(_context.ItemGroups, id, b, nameof(UserPermission.ManageItemGroup));
        [HttpDelete("item-groups/{id:int}")]public Task<ActionResult<ApiResponse<object>>> DeleteItemGroup(int id) => DeleteAsync(_context.ItemGroups, id, nameof(UserPermission.ManageItemGroup), idx => _context.Items.AnyAsync(i => i.ItemGroupId == idx));

        // ───────── Product Categories
        [HttpGet("product-categories")]            public Task<ActionResult<ApiResponse<IEnumerable<object>>>> ListProductCategories()    => ListNamedAsync(_context.ProductCategories, nameof(UserPermission.ManageProductCategory));
        [HttpGet("product-categories/active")]     public Task<ActionResult<ApiResponse<IEnumerable<object>>>> ActiveProductCategories()  => ListActiveAsync(_context.ProductCategories);
        [HttpPost("product-categories")]           public Task<ActionResult<ApiResponse<object>>> CreateProductCategory([FromBody] ProductCategory x)    => CreateAsync(_context.ProductCategories, x, nameof(UserPermission.ManageProductCategory));
        [HttpPut("product-categories/{id:int}")]   public Task<ActionResult<ApiResponse<object>>> UpdateProductCategory(int id, [FromBody] UpdateMasterRequest b) => UpdateAsync(_context.ProductCategories, id, b, nameof(UserPermission.ManageProductCategory));
        [HttpDelete("product-categories/{id:int}")]public Task<ActionResult<ApiResponse<object>>> DeleteProductCategory(int id) => DeleteAsync(_context.ProductCategories, id, nameof(UserPermission.ManageProductCategory), idx => _context.Products.AnyAsync(p => p.ProductCategoryId == idx));

        // ───────── Materials
        [HttpGet("materials")]            public Task<ActionResult<ApiResponse<IEnumerable<object>>>> ListMaterials()    => ListNamedAsync(_context.Materials, nameof(UserPermission.ManageMaterial));
        [HttpGet("materials/active")]     public Task<ActionResult<ApiResponse<IEnumerable<object>>>> ActiveMaterials()  => ListActiveAsync(_context.Materials);
        [HttpPost("materials")]           public Task<ActionResult<ApiResponse<object>>> CreateMaterial([FromBody] Material x)    => CreateAsync(_context.Materials, x, nameof(UserPermission.ManageMaterial));
        [HttpPut("materials/{id:int}")]   public Task<ActionResult<ApiResponse<object>>> UpdateMaterial(int id, [FromBody] UpdateMasterRequest b) => UpdateAsync(_context.Materials, id, b, nameof(UserPermission.ManageMaterial));
        [HttpDelete("materials/{id:int}")]public Task<ActionResult<ApiResponse<object>>> DeleteMaterial(int id) => DeleteAsync(_context.Materials, id, nameof(UserPermission.ManageMaterial), idx => _context.Items.AnyAsync(i => i.MaterialId == idx));

        // ───────── Units
        [HttpGet("units")]
        public async Task<ActionResult<ApiResponse<IEnumerable<object>>>> ListUnits()
        {
            if (!await HasPermissionAsync(nameof(UserPermission.ManageUnit)) && !await IsAdminAsync()) return Forbidden();
            var data = await _context.Units.AsNoTracking().OrderBy(u => u.Name)
                .Select(u => new { u.Id, u.Name, u.Symbol, u.IsActive }).ToListAsync();
            return Ok(new ApiResponse<IEnumerable<object>> { Data = data });
        }
        [HttpGet("units/active")]
        public async Task<ActionResult<ApiResponse<IEnumerable<object>>>> ActiveUnits()
        {
            var data = await _context.Units.AsNoTracking().Where(u => u.IsActive).OrderBy(u => u.Name)
                .Select(u => new { u.Id, u.Name, u.Symbol }).ToListAsync();
            return Ok(new ApiResponse<IEnumerable<object>> { Data = data });
        }
        [HttpPost("units")]
        public async Task<ActionResult<ApiResponse<object>>> CreateUnit([FromBody] Unit body)
        {
            if (!await CanCreateMasterAsync(nameof(UserPermission.ManageUnit))) return Forbidden();
            if (string.IsNullOrWhiteSpace(body.Name)) return BadResponse("Name is required.");
            var name = body.Name.Trim();
            if (await _context.Units.AnyAsync(u => u.Name.ToLower() == name.ToLower())) return BadResponse("Unit already exists.");
            var u = new Unit { Name = name, Symbol = body.Symbol?.Trim(), IsActive = true };
            _context.Units.Add(u);
            await _context.SaveChangesAsync();
            return Ok(new ApiResponse<object> { Data = u });
        }
        [HttpPut("units/{id:int}")]
        public async Task<ActionResult<ApiResponse<object>>> UpdateUnit(int id, [FromBody] UpdateMasterRequest body)
        {
            if (!await CanEditMasterAsync(nameof(UserPermission.ManageUnit))) return Forbidden();
            var u = await _context.Units.FirstOrDefaultAsync(x => x.Id == id);
            if (u == null) return NotFoundResponse("Unit not found.");
            if (!string.IsNullOrWhiteSpace(body.Name))
            {
                var newName = body.Name.Trim();
                if (!string.Equals(newName, u.Name, StringComparison.OrdinalIgnoreCase) &&
                    await _context.Units.AnyAsync(x => x.Id != id && x.Name.ToLower() == newName.ToLower()))
                    return BadResponse("Unit already exists.");
                u.Name = newName;
            }
            if (body.Symbol != null) u.Symbol = body.Symbol.Trim();
            u.IsActive = body.IsActive;
            await _context.SaveChangesAsync();
            return Ok(new ApiResponse<object> { Data = u });
        }
        [HttpDelete("units/{id:int}")]
        public async Task<ActionResult<ApiResponse<object>>> DeleteUnit(int id)
        {
            if (!await CanEditMasterAsync(nameof(UserPermission.ManageUnit))) return Forbidden();
            var u = await _context.Units.FirstOrDefaultAsync(x => x.Id == id);
            if (u == null) return NotFoundResponse("Unit not found.");
            var hasUsage = await _context.Items.AnyAsync(i => i.UnitId == id)
                        || await _context.Products.AnyAsync(p => p.UnitId == id)
                        || await _context.BomItems.AnyAsync(b => b.UnitId == id);
            if (hasUsage) return BadResponse("Cannot delete – unit is in use.");
            _context.Units.Remove(u);
            await _context.SaveChangesAsync();
            return Ok(new ApiResponse<object> { Data = new { id } });
        }

        // ─────────────── Helpers (generic) ───────────────

        private async Task<ActionResult<ApiResponse<IEnumerable<object>>>> ListNamedAsync<T>(DbSet<T> set, string permission) where T : NamedMaster
        {
            if (!await HasPermissionAsync(permission) && !await IsAdminAsync()) return Forbidden();
            var data = await set.AsNoTracking().OrderBy(x => x.Name)
                .Select(x => new { x.Id, x.Name, x.IsActive }).ToListAsync();
            return Ok(new ApiResponse<IEnumerable<object>> { Data = data });
        }

        private async Task<ActionResult<ApiResponse<IEnumerable<object>>>> ListActiveAsync<T>(DbSet<T> set) where T : NamedMaster
        {
            var data = await set.AsNoTracking().Where(x => x.IsActive).OrderBy(x => x.Name)
                .Select(x => new { x.Id, x.Name }).ToListAsync();
            return Ok(new ApiResponse<IEnumerable<object>> { Data = data });
        }

        private async Task<ActionResult<ApiResponse<object>>> CreateAsync<T>(DbSet<T> set, T entity, string permission) where T : NamedMaster
        {
            if (!await CanCreateMasterAsync(permission)) return Forbidden();
            if (string.IsNullOrWhiteSpace(entity.Name)) return BadResponse("Name is required.");
            entity.Name = entity.Name.Trim();
            if (await set.AnyAsync(x => x.Name.ToLower() == entity.Name.ToLower()))
                return BadResponse("Already exists.");
            entity.IsActive = true;
            set.Add(entity);
            await _context.SaveChangesAsync();
            return Ok(new ApiResponse<object> { Data = entity });
        }

        private async Task<ActionResult<ApiResponse<object>>> UpdateAsync<T>(DbSet<T> set, int id, UpdateMasterRequest body, string permission) where T : NamedMaster
        {
            if (!await CanEditMasterAsync(permission)) return Forbidden();
            var entity = await set.FirstOrDefaultAsync(x => x.Id == id);
            if (entity == null) return NotFoundResponse("Not found.");
            if (!string.IsNullOrWhiteSpace(body.Name))
            {
                var newName = body.Name.Trim();
                if (!string.Equals(newName, entity.Name, StringComparison.OrdinalIgnoreCase) &&
                    await set.AnyAsync(x => x.Id != id && x.Name.ToLower() == newName.ToLower()))
                    return BadResponse("Already exists.");
                entity.Name = newName;
            }
            entity.IsActive = body.IsActive;
            await _context.SaveChangesAsync();
            return Ok(new ApiResponse<object> { Data = entity });
        }

        private async Task<ActionResult<ApiResponse<object>>> DeleteAsync<T>(DbSet<T> set, int id, string permission, Func<int, Task<bool>> isInUse) where T : NamedMaster
        {
            if (!await CanEditMasterAsync(permission)) return Forbidden();
            var entity = await set.FirstOrDefaultAsync(x => x.Id == id);
            if (entity == null) return NotFoundResponse("Not found.");
            if (await isInUse(id)) return BadResponse("Cannot delete – referenced by other records.");
            set.Remove(entity);
            await _context.SaveChangesAsync();
            return Ok(new ApiResponse<object> { Data = new { id } });
        }
    }
}
