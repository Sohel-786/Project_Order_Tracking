using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using net_backend.Data;
using net_backend.DTOs;
using net_backend.Models;
using net_backend.Services;

namespace net_backend.Controllers
{
    [Route("api/deliveries")]
    public class DeliveriesController : BaseController
    {
        private readonly ICodeGeneratorService _codes;
        private readonly IWebHostEnvironment _env;
        public DeliveriesController(ApplicationDbContext context, ICodeGeneratorService codes, IWebHostEnvironment env) : base(context)
        {
            _codes = codes; _env = env;
        }

        public class CreateDeliveryItemDto
        {
            public int OrderItemId { get; set; }
            public int DispatchQuantity { get; set; }
            public string? Remarks { get; set; }
        }

        public class CreateDeliveryDto
        {
            public int OrderId { get; set; }
            public DateTime? DispatchDate { get; set; }
            public string? VehicleNo { get; set; }
            public string? DriverName { get; set; }
            public string? DriverContact { get; set; }
            public string? Remarks { get; set; }
            public List<string>? AttachmentUrls { get; set; }
            public List<CreateDeliveryItemDto> Items { get; set; } = new();
        }

        [HttpGet]
        public async Task<ActionResult<ApiResponse<IEnumerable<object>>>> GetAll(
            [FromQuery] string? search = null,
            [FromQuery] int? orderId = null,
            [FromQuery] int? customerId = null,
            [FromQuery] bool? activeOnly = null,
            [FromQuery] int? page = null,
            [FromQuery] int? pageSize = null)
        {
            if (!await HasPermissionAsync(nameof(UserPermission.ViewDelivery)) && !await IsAdminAsync()) return Forbidden();
            var q = _context.DeliveryChallans.AsNoTracking()
                .Include(d => d.Order).Include(d => d.Customer).Include(d => d.Creator).AsQueryable();
            if (orderId.HasValue)    q = q.Where(d => d.OrderId == orderId);
            if (customerId.HasValue) q = q.Where(d => d.CustomerId == customerId);
            if (activeOnly == true)  q = q.Where(d => d.IsActive);
            if (!string.IsNullOrWhiteSpace(search))
            {
                var s = search.Trim().ToLower();
                q = q.Where(d => d.ChallanNo.ToLower().Contains(s) ||
                                 (d.Order != null && d.Order.OrderNumber.ToLower().Contains(s)));
            }
            q = q.OrderByDescending(d => d.Id);
            var total = await q.CountAsync();
            if (page.HasValue && pageSize.HasValue && page.Value > 0 && pageSize.Value > 0)
                q = q.Skip((page.Value - 1) * pageSize.Value).Take(pageSize.Value);

            var list = await q.Select(d => new
            {
                d.Id, d.ChallanNo, d.DispatchDate, d.VehicleNo, d.DriverName, d.DriverContact, d.Status, d.Remarks,
                d.OrderId, OrderNumber = d.Order != null ? d.Order.OrderNumber : null,
                d.CustomerId, CustomerName = d.Customer != null ? d.Customer.PartyName : null,
                d.DocumentNo, d.RevisionNo, d.RevisionDate, d.CreatedAt, d.IsActive,
                CreatedByName = d.Creator != null ? d.Creator.FirstName + " " + d.Creator.LastName : null,
                ItemCount = _context.DeliveryChallanItems.Count(i => i.DeliveryChallanId == d.Id),
                TotalQty = _context.DeliveryChallanItems.Where(i => i.DeliveryChallanId == d.Id).Sum(i => (int?)i.DispatchQuantity) ?? 0,
            }).ToListAsync();
            return Ok(new ApiResponse<IEnumerable<object>> { Data = list, TotalCount = total });
        }

        [HttpGet("{id:int}")]
        public async Task<ActionResult<ApiResponse<object>>> GetById(int id)
        {
            var d = await _context.DeliveryChallans.AsNoTracking()
                .Include(x => x.Order).Include(x => x.Customer)
                .Include(x => x.Items).ThenInclude(i => i.Product)
                .Include(x => x.Items).ThenInclude(i => i.OrderItem)
                .FirstOrDefaultAsync(x => x.Id == id);
            if (d == null) return NotFoundResponse("Delivery challan not found.");
            return Ok(new ApiResponse<object> { Data = new
            {
                d.Id, d.ChallanNo, d.DispatchDate, d.VehicleNo, d.DriverName, d.DriverContact, d.Status, d.Remarks,
                d.OrderId, OrderNumber = d.Order?.OrderNumber,
                d.CustomerId, CustomerName = d.Customer?.PartyName,
                d.AttachmentUrlsJson, d.DocumentNo, d.RevisionNo, d.RevisionDate, d.CreatedAt, d.UpdatedAt, d.IsActive,
                Items = d.Items.Select(i => new
                {
                    i.Id, i.OrderItemId, i.ProductId,
                    ProductCode = i.Product?.ProductCode, ProductName = i.Product?.ProductName,
                    i.DispatchQuantity, i.Remarks, i.ProductNameSnapshot, i.ProductCodeSnapshot,
                }),
            }});
        }

        [HttpGet("next-code")]
        public async Task<ActionResult<ApiResponse<string>>> NextCode()
        {
            var seq = await _context.CodeSequences.FirstOrDefaultAsync(s => s.Key == "DC");
            var next = seq?.NextNumber ?? 1;
            return Ok(new ApiResponse<string> { Data = $"DC-{next:D4}" });
        }

        [HttpPost]
        public async Task<ActionResult<ApiResponse<object>>> Create([FromBody] CreateDeliveryDto body)
        {
            if (!await HasPermissionAsync(nameof(UserPermission.CreateDelivery)) && !await IsAdminAsync()) return Forbidden();
            if (body.OrderId <= 0)     return BadResponse("Order is required.");
            if (body.Items.Count == 0) return BadResponse("At least one delivery item is required.");

            var order = await _context.Orders.Include(o => o.Customer).FirstOrDefaultAsync(o => o.Id == body.OrderId);
            if (order == null) return BadResponse("Order not found.");

            await using var tx = await _context.Database.BeginTransactionAsync();
            try
            {
                var dcNo = await _codes.GenerateCodeAsync("DC");
                var docCtl = await _context.DocumentControls.AsNoTracking().FirstOrDefaultAsync(d => d.DocumentType == DocumentType.DeliveryChallan && d.IsApplied && d.IsActive);

                var d = new DeliveryChallan
                {
                    ChallanNo = dcNo,
                    DispatchDate = body.DispatchDate ?? DateTime.Now,
                    OrderId = order.Id,
                    CustomerId = order.CustomerId,
                    VehicleNo = body.VehicleNo?.Trim(),
                    DriverName = body.DriverName?.Trim(),
                    DriverContact = body.DriverContact?.Trim(),
                    Status = DeliveryStatus.Dispatched,
                    Remarks = body.Remarks?.Trim(),
                    AttachmentUrlsJson = body.AttachmentUrls != null && body.AttachmentUrls.Count > 0
                        ? System.Text.Json.JsonSerializer.Serialize(body.AttachmentUrls) : null,
                    DocumentNo = docCtl?.DocumentNo, RevisionNo = docCtl?.RevisionNo, RevisionDate = docCtl?.RevisionDate,
                    CreatedBy = CurrentUserId,
                    IsActive = true,
                };
                _context.DeliveryChallans.Add(d);
                await _context.SaveChangesAsync();

                var touchedOrderItemIds = new HashSet<int>();
                foreach (var li in body.Items)
                {
                    if (li.DispatchQuantity <= 0) return BadResponse("Dispatch quantity must be > 0.");
                    var oi = await _context.OrderItems.Include(o => o.Product).FirstOrDefaultAsync(o => o.Id == li.OrderItemId);
                    if (oi == null) return BadResponse($"OrderItem {li.OrderItemId} not found.");
                    if (oi.OrderId != order.Id) return BadResponse($"OrderItem {li.OrderItemId} does not belong to the selected order.");

                    var pendingDispatch = oi.ProducedQty - oi.DeliveredQty;
                    if (li.DispatchQuantity > pendingDispatch)
                        return BadResponse($"Cannot dispatch more than produced (pending dispatch = {pendingDispatch}) for {oi.Product?.ProductName}.");

                    _context.DeliveryChallanItems.Add(new DeliveryChallanItem
                    {
                        DeliveryChallanId = d.Id,
                        OrderItemId = oi.Id,
                        ProductId = oi.ProductId,
                        DispatchQuantity = li.DispatchQuantity,
                        Remarks = li.Remarks?.Trim(),
                        ProductCodeSnapshot = oi.Product?.ProductCode,
                        ProductNameSnapshot = oi.Product?.ProductName,
                    });
                    touchedOrderItemIds.Add(oi.Id);
                }
                await _context.SaveChangesAsync();
                await tx.CommitAsync();

                foreach (var oiId in touchedOrderItemIds)
                    await OrdersController.RecomputeOrderItemAggregatesAsync(_context, oiId);
                return await GetById(d.Id);
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
            if (!await HasPermissionAsync(nameof(UserPermission.EditDelivery)) && !await IsAdminAsync()) return Forbidden();
            var d = await _context.DeliveryChallans.Include(x => x.Items).FirstOrDefaultAsync(x => x.Id == id);
            if (d == null) return NotFoundResponse("Delivery challan not found.");
            d.IsActive = body.IsActive;
            d.UpdatedAt = DateTime.Now;
            await _context.SaveChangesAsync();
            foreach (var oiId in d.Items.Select(i => i.OrderItemId).Distinct())
                await OrdersController.RecomputeOrderItemAggregatesAsync(_context, oiId);
            return Ok(new ApiResponse<object> { Data = new { id, isActive = d.IsActive } });
        }

        [HttpPost("upload-attachment")]
        public async Task<ActionResult<ApiResponse<object>>> UploadAttachment([FromForm] IFormFile? file)
        {
            if (!await HasPermissionAsync(nameof(UserPermission.CreateDelivery)) && !await IsAdminAsync()) return Forbidden();
            file ??= Request.Form.Files.FirstOrDefault();
            if (file == null || file.Length == 0) return BadResponse("No file uploaded.");
            var ext = Path.GetExtension(file.FileName)?.ToLowerInvariant() ?? "";
            var allowed = new[] { ".pdf", ".png", ".jpg", ".jpeg", ".webp" };
            if (!allowed.Contains(ext)) return BadResponse("Unsupported file type.");
            var webRoot = _env.WebRootPath ?? Path.Combine(_env.ContentRootPath, "wwwroot");
            var dir = Path.Combine(webRoot, "storage", "deliveries");
            Directory.CreateDirectory(dir);
            var fileName = $"dc_{DateTime.Now:yyyyMMddHHmmss}_{Guid.NewGuid().ToString("N").Substring(0, 8)}{ext}";
            var fullPath = Path.Combine(dir, fileName);
            await using (var fs = System.IO.File.Create(fullPath)) await file.CopyToAsync(fs);
            return Ok(new ApiResponse<object> { Data = new { url = $"/storage/deliveries/{fileName}" } });
        }
    }
}
