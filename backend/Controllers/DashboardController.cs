using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using net_backend.Data;
using net_backend.DTOs;
using net_backend.Models;

namespace net_backend.Controllers
{
    [Route("api/dashboard")]
    public class DashboardController : BaseController
    {
        public DashboardController(ApplicationDbContext context) : base(context) { }

        [HttpGet("metrics")]
        public async Task<ActionResult<ApiResponse<object>>> GetMetrics()
        {
            if (!await HasPermissionAsync(nameof(UserPermission.ViewDashboard))) return Forbidden();

            var today = DateTime.Today;

            // Orders
            var totalOrders     = await _context.Orders.CountAsync(o => o.IsActive);
            var pendingOrders   = await _context.Orders.CountAsync(o => o.IsActive && (o.Status == OrderStatus.Pending || o.Status == OrderStatus.InProcurement || o.Status == OrderStatus.InProduction));
            var completedOrders = await _context.Orders.CountAsync(o => o.IsActive && o.Status == OrderStatus.FullyDelivered);
            var delayedOrders   = await _context.Orders.CountAsync(o => o.IsActive
                                                && o.RequiredDeliveryDate.HasValue
                                                && o.RequiredDeliveryDate.Value.Date < today
                                                && o.Status != OrderStatus.FullyDelivered);

            // Procurement
            var pendingPI    = await _context.PurchaseIndents.CountAsync(p => p.IsActive && p.Status == PurchaseIndentStatus.Pending);
            var pendingPO    = await _context.PurchaseOrders.CountAsync(p => p.IsActive && p.Status == PoStatus.Pending);
            var pendingInward = await _context.PurchaseOrderItems.CountAsync(it =>
                it.PurchaseOrder!.IsActive &&
                it.PurchaseOrder.Status == PoStatus.Approved &&
                (_context.InwardLines.Where(l => l.SourceType == InwardSourceType.PO && l.SourceRefId == it.Id && l.Inward!.IsActive).Sum(l => (decimal?)l.Quantity) ?? 0) < it.Quantity);

            // QC
            var qcPending     = await _context.QcEntries.CountAsync(q => q.IsActive && q.Status == QcStatus.Pending);
            var qcFailedToday = await _context.QcItems.CountAsync(qi => qi.RejectedQty > 0 && qi.QcEntry!.CreatedAt.Date == today);
            var reworkPending = await _context.QcItems.CountAsync(qi => qi.ReworkQty > 0 && qi.QcEntry!.Status == QcStatus.Approved);

            // Job Work
            var jwUnderMachining   = await _context.JobWorks.CountAsync(j => j.IsActive && j.Status == JobWorkStatus.InTransit && j.Process != null && j.Process.ProcessName.ToLower().Contains("machin"));
            var jwUnderPowderCoat  = await _context.JobWorks.CountAsync(j => j.IsActive && j.Status == JobWorkStatus.InTransit && j.Process != null && j.Process.ProcessName.ToLower().Contains("coat"));
            var jwUnderPolishing   = await _context.JobWorks.CountAsync(j => j.IsActive && j.Status == JobWorkStatus.InTransit && j.Process != null && j.Process.ProcessName.ToLower().Contains("polish"));
            var jwUnderOther       = await _context.JobWorks.CountAsync(j => j.IsActive && j.Status == JobWorkStatus.InTransit);

            // Production
            var readyForProduction = await _context.OrderItems.CountAsync(oi => oi.Order!.IsActive && oi.ProducedQty < oi.QuantityOrdered);
            var inProductionToday  = await _context.ProductionEntries.CountAsync(p => p.IsActive && p.ProductionDate.Date == today);
            var producedToday      = await _context.ProductionEntries.Where(p => p.IsActive && p.ProductionDate.Date == today).SumAsync(p => (int?)p.ProducedQty) ?? 0;

            // Delivery
            var readyToDispatch = await _context.OrderItems.CountAsync(oi => oi.Order!.IsActive && oi.ProducedQty > oi.DeliveredQty);
            var partiallyDelivered = await _context.Orders.CountAsync(o => o.IsActive && o.Status == OrderStatus.PartiallyDelivered);
            var fullyDelivered     = await _context.Orders.CountAsync(o => o.IsActive && o.Status == OrderStatus.FullyDelivered);

            return Ok(new ApiResponse<object>
            {
                Data = new
                {
                    Orders = new { totalOrders, pendingOrders, completedOrders, delayedOrders },
                    Procurement = new { pendingPI, pendingPO, pendingInward },
                    QC = new { qcPending, qcFailedToday, reworkPending },
                    JobWork = new { machining = jwUnderMachining, powderCoating = jwUnderPowderCoat, polishing = jwUnderPolishing, other = jwUnderOther },
                    Production = new { readyForProduction, inProductionToday, producedToday },
                    Delivery = new { readyToDispatch, partiallyDelivered, fullyDelivered },
                }
            });
        }

        [HttpGet("recent-orders")]
        public async Task<ActionResult<ApiResponse<IEnumerable<object>>>> RecentOrders([FromQuery] int take = 10)
        {
            if (!await HasPermissionAsync(nameof(UserPermission.ViewDashboard))) return Forbidden();
            take = Math.Clamp(take, 1, 100);
            var data = await _context.Orders.AsNoTracking()
                .Include(o => o.Customer)
                .OrderByDescending(o => o.Id).Take(take)
                .Select(o => new
                {
                    o.Id, o.OrderNumber, o.OrderDate, o.RequiredDeliveryDate, o.Status,
                    Customer = o.Customer != null ? o.Customer.PartyName : null,
                    TotalOrderedQty = _context.OrderItems.Where(oi => oi.OrderId == o.Id).Sum(oi => (int?)oi.QuantityOrdered) ?? 0,
                    TotalProducedQty = _context.OrderItems.Where(oi => oi.OrderId == o.Id).Sum(oi => (int?)oi.ProducedQty) ?? 0,
                    TotalDeliveredQty = _context.OrderItems.Where(oi => oi.OrderId == o.Id).Sum(oi => (int?)oi.DeliveredQty) ?? 0,
                }).ToListAsync();
            return Ok(new ApiResponse<IEnumerable<object>> { Data = data });
        }

        [HttpGet("pending-pi")]
        public async Task<ActionResult<ApiResponse<IEnumerable<object>>>> PendingPI()
        {
            var data = await _context.PurchaseIndents.AsNoTracking().Include(p => p.Creator)
                .Where(p => p.IsActive && p.Status == PurchaseIndentStatus.Pending)
                .OrderByDescending(p => p.Id)
                .Select(p => new { p.Id, p.PiNo, p.IndentFor, p.Priority, p.CreatedAt, CreatedBy = p.Creator != null ? p.Creator.FirstName + " " + p.Creator.LastName : null }).ToListAsync();
            return Ok(new ApiResponse<IEnumerable<object>> { Data = data });
        }

        [HttpGet("pending-po")]
        public async Task<ActionResult<ApiResponse<IEnumerable<object>>>> PendingPO()
        {
            var data = await _context.PurchaseOrders.AsNoTracking().Include(p => p.Vendor).Include(p => p.Creator)
                .Where(p => p.IsActive && p.Status == PoStatus.Pending)
                .OrderByDescending(p => p.Id)
                .Select(p => new { p.Id, p.PoNo, VendorName = p.Vendor != null ? p.Vendor.PartyName : null, p.DeliveryDate, p.CreatedAt }).ToListAsync();
            return Ok(new ApiResponse<IEnumerable<object>> { Data = data });
        }

        [HttpGet("qc-pending")]
        public async Task<ActionResult<ApiResponse<IEnumerable<object>>>> QcPending()
        {
            var data = await _context.QcEntries.AsNoTracking().Include(q => q.Party).Include(q => q.Creator)
                .Where(q => q.IsActive && q.Status == QcStatus.Pending)
                .OrderByDescending(q => q.Id)
                .Select(q => new { q.Id, q.QcNo, Party = q.Party != null ? q.Party.PartyName : null, q.CreatedAt }).ToListAsync();
            return Ok(new ApiResponse<IEnumerable<object>> { Data = data });
        }
    }
}
