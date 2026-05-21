using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using net_backend.Data;
using net_backend.DTOs;
using net_backend.Models;

namespace net_backend.Controllers
{
    [Route("api/boms")]
    public class BomController : BaseController
    {
        public BomController(ApplicationDbContext context) : base(context) { }

        // ───────── DTOs

        public class BomItemDto
        {
            public int ItemId { get; set; }
            public decimal QuantityPerProduct { get; set; } = 1m;
            public int? UnitId { get; set; }
            public int Sequence { get; set; }
            public string? Remarks { get; set; }
            public List<int> ProcessIds { get; set; } = new();
        }

        public class CreateBomDto
        {
            public int ProductId { get; set; }
            public string BomVersion { get; set; } = "v1";
            public BomStatus Status { get; set; } = BomStatus.Active;
            public string? Remarks { get; set; }
            public List<BomItemDto> Items { get; set; } = new();
        }

        // ───────── List

        [HttpGet]
        public async Task<ActionResult<ApiResponse<IEnumerable<object>>>> GetAll(
            [FromQuery] int? productId = null,
            [FromQuery] bool? activeOnly = null,
            [FromQuery] string? search = null)
        {
            if (!await HasPermissionAsync(nameof(UserPermission.ManageBom)) && !await IsAdminAsync()) return Forbidden();

            var q = _context.Boms.AsNoTracking().Include(b => b.Product).AsQueryable();
            if (productId.HasValue) q = q.Where(b => b.ProductId == productId);
            if (activeOnly == true) q = q.Where(b => b.IsActive);
            if (!string.IsNullOrWhiteSpace(search))
            {
                var s = search.Trim().ToLower();
                q = q.Where(b => b.BomVersion.ToLower().Contains(s) ||
                                 (b.Product != null && b.Product.ProductName.ToLower().Contains(s)));
            }

            var list = await q.OrderByDescending(b => b.Id).Select(b => new
            {
                b.Id, b.ProductId,
                ProductName = b.Product != null ? b.Product.ProductName : null,
                ProductCode = b.Product != null ? b.Product.ProductCode : null,
                b.BomVersion, b.Status, b.Remarks, b.IsActive, b.CreatedAt, b.UpdatedAt,
                ItemCount = _context.BomItems.Count(bi => bi.BomId == b.Id),
            }).ToListAsync();
            return Ok(new ApiResponse<IEnumerable<object>> { Data = list });
        }

        [HttpGet("by-product/{productId:int}")]
        public async Task<ActionResult<ApiResponse<IEnumerable<object>>>> GetByProduct(int productId)
        {
            var list = await _context.Boms.AsNoTracking()
                .Where(b => b.ProductId == productId)
                .OrderByDescending(b => b.Id)
                .Select(b => new
                {
                    b.Id, b.ProductId, b.BomVersion, b.Status, b.IsActive, b.CreatedAt,
                    ItemCount = _context.BomItems.Count(bi => bi.BomId == b.Id),
                }).ToListAsync();
            return Ok(new ApiResponse<IEnumerable<object>> { Data = list });
        }

        [HttpGet("{id:int}")]
        public async Task<ActionResult<ApiResponse<object>>> GetById(int id)
        {
            var bom = await _context.Boms.AsNoTracking()
                .Include(b => b.Product)
                .Include(b => b.Items).ThenInclude(bi => bi.Item)
                .Include(b => b.Items).ThenInclude(bi => bi.Unit)
                .Include(b => b.Items).ThenInclude(bi => bi.ProcessFlow).ThenInclude(pf => pf.Process)
                .FirstOrDefaultAsync(b => b.Id == id);
            if (bom == null) return NotFoundResponse("BOM not found.");

            var result = new
            {
                bom.Id, bom.ProductId,
                ProductName = bom.Product?.ProductName,
                ProductCode = bom.Product?.ProductCode,
                bom.BomVersion, bom.Status, bom.Remarks, bom.IsActive, bom.CreatedAt, bom.UpdatedAt,
                Items = bom.Items.OrderBy(i => i.Sequence).Select(bi => new
                {
                    bi.Id,
                    bi.ItemId,
                    ItemName = bi.Item?.ItemName,
                    ItemCode = bi.Item?.ItemCode,
                    bi.QuantityPerProduct,
                    bi.UnitId,
                    UnitName = bi.Unit?.Name,
                    UnitSymbol = bi.Unit?.Symbol,
                    bi.Sequence,
                    bi.Remarks,
                    ProcessFlow = bi.ProcessFlow.OrderBy(pf => pf.Sequence).Select(pf => new
                    {
                        pf.Id, pf.ProcessId,
                        ProcessName = pf.Process?.ProcessName,
                        ProcessType = pf.Process?.ProcessType,
                        pf.Sequence,
                    }),
                }),
            };
            return Ok(new ApiResponse<object> { Data = result });
        }

        // ───────── Create

        [HttpPost]
        public async Task<ActionResult<ApiResponse<object>>> Create([FromBody] CreateBomDto body)
        {
            if (!await CanCreateMasterAsync(nameof(UserPermission.ManageBom))) return Forbidden();

            if (body.ProductId <= 0)        return BadResponse("Product is required.");
            if (string.IsNullOrWhiteSpace(body.BomVersion)) body.BomVersion = "v1";
            if (body.Items.Count == 0)      return BadResponse("At least one BOM item is required.");

            var product = await _context.Products.FirstOrDefaultAsync(p => p.Id == body.ProductId);
            if (product == null) return BadResponse("Product not found.");
            if (await _context.Boms.AnyAsync(b => b.ProductId == body.ProductId && b.BomVersion.ToLower() == body.BomVersion.Trim().ToLower()))
                return BadResponse("A BOM with this version already exists for the product.");

            // Validate items
            var dupItemIds = body.Items.GroupBy(x => x.ItemId).Where(g => g.Count() > 1).Select(g => g.Key).ToList();
            if (dupItemIds.Any()) return BadResponse("Duplicate item rows in BOM.");

            var itemIds = body.Items.Select(x => x.ItemId).Distinct().ToList();
            var validItems = await _context.Items.Where(i => itemIds.Contains(i.Id)).Select(i => i.Id).ToListAsync();
            var missing = itemIds.Except(validItems).ToList();
            if (missing.Any()) return BadResponse($"Item(s) not found: {string.Join(", ", missing)}");

            await using var tx = await _context.Database.BeginTransactionAsync();
            try
            {
                var bom = new Bom
                {
                    ProductId = body.ProductId,
                    BomVersion = body.BomVersion.Trim(),
                    Status = body.Status,
                    Remarks = body.Remarks?.Trim(),
                    IsActive = true,
                    CreatedBy = CurrentUserId,
                };
                _context.Boms.Add(bom);
                await _context.SaveChangesAsync();

                int seq = 0;
                foreach (var it in body.Items)
                {
                    seq++;
                    var bi = new BomItem
                    {
                        BomId = bom.Id,
                        ItemId = it.ItemId,
                        QuantityPerProduct = it.QuantityPerProduct,
                        UnitId = it.UnitId,
                        Sequence = it.Sequence == 0 ? seq : it.Sequence,
                        Remarks = it.Remarks?.Trim(),
                    };
                    _context.BomItems.Add(bi);
                    await _context.SaveChangesAsync();

                    int procSeq = 0;
                    foreach (var pid in it.ProcessIds.Distinct())
                    {
                        procSeq++;
                        _context.BomItemProcesses.Add(new BomItemProcess
                        {
                            BomItemId = bi.Id,
                            ProcessId = pid,
                            Sequence = procSeq,
                        });
                    }
                }
                await _context.SaveChangesAsync();
                await tx.CommitAsync();
                return await GetById(bom.Id);
            }
            catch (Exception ex)
            {
                await tx.RollbackAsync();
                return StatusCode(500, new ApiResponse<object> { Success = false, Message = ex.Message });
            }
        }

        // ───────── Update (full replace of items)

        [HttpPut("{id:int}")]
        public async Task<ActionResult<ApiResponse<object>>> Update(int id, [FromBody] CreateBomDto body)
        {
            if (!await CanEditMasterAsync(nameof(UserPermission.ManageBom))) return Forbidden();

            var bom = await _context.Boms.Include(b => b.Items).ThenInclude(bi => bi.ProcessFlow)
                .FirstOrDefaultAsync(b => b.Id == id);
            if (bom == null) return NotFoundResponse("BOM not found.");

            // BOMs linked to an Order are immutable (snapshot of usage is preserved via OrderBomItemPlan).
            var inOrders = await _context.OrderItems.AnyAsync(oi => oi.BomId == id);
            if (inOrders) return BadResponse("BOM is linked to one or more orders. Create a new version instead.");

            if (body.Items.Count == 0) return BadResponse("At least one BOM item is required.");

            await using var tx = await _context.Database.BeginTransactionAsync();
            try
            {
                bom.BomVersion = string.IsNullOrWhiteSpace(body.BomVersion) ? bom.BomVersion : body.BomVersion.Trim();
                bom.Status = body.Status;
                bom.Remarks = body.Remarks?.Trim();
                bom.UpdatedAt = DateTime.Now;

                // Delete old items (cascades to BomItemProcess)
                foreach (var bi in bom.Items.ToList())
                {
                    _context.BomItemProcesses.RemoveRange(bi.ProcessFlow);
                    _context.BomItems.Remove(bi);
                }
                await _context.SaveChangesAsync();

                int seq = 0;
                foreach (var it in body.Items)
                {
                    seq++;
                    var bi = new BomItem
                    {
                        BomId = bom.Id,
                        ItemId = it.ItemId,
                        QuantityPerProduct = it.QuantityPerProduct,
                        UnitId = it.UnitId,
                        Sequence = it.Sequence == 0 ? seq : it.Sequence,
                        Remarks = it.Remarks?.Trim(),
                    };
                    _context.BomItems.Add(bi);
                    await _context.SaveChangesAsync();

                    int procSeq = 0;
                    foreach (var pid in it.ProcessIds.Distinct())
                    {
                        procSeq++;
                        _context.BomItemProcesses.Add(new BomItemProcess { BomItemId = bi.Id, ProcessId = pid, Sequence = procSeq });
                    }
                }
                await _context.SaveChangesAsync();
                await tx.CommitAsync();
                return await GetById(id);
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
            if (!await CanEditMasterAsync(nameof(UserPermission.ManageBom))) return Forbidden();
            var bom = await _context.Boms.FirstOrDefaultAsync(b => b.Id == id);
            if (bom == null) return NotFoundResponse("BOM not found.");
            bom.IsActive = body.IsActive;
            bom.UpdatedAt = DateTime.Now;
            await _context.SaveChangesAsync();
            return Ok(new ApiResponse<object> { Data = new { id, isActive = bom.IsActive } });
        }

        [HttpDelete("{id:int}")]
        public async Task<ActionResult<ApiResponse<object>>> Delete(int id)
        {
            if (!await CanEditMasterAsync(nameof(UserPermission.ManageBom))) return Forbidden();
            var bom = await _context.Boms.FirstOrDefaultAsync(b => b.Id == id);
            if (bom == null) return NotFoundResponse("BOM not found.");

            var inUse = await _context.OrderItems.AnyAsync(oi => oi.BomId == id);
            if (inUse) return BadResponse("Cannot delete – BOM is linked to one or more orders.");

            _context.Boms.Remove(bom);
            await _context.SaveChangesAsync();
            return Ok(new ApiResponse<object> { Data = new { id } });
        }
    }
}
