using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using net_backend.Data;
using net_backend.DTOs;
using net_backend.Models;

namespace net_backend.Controllers
{
    /// <summary>
    /// End-to-end traceability for a single order: Order → Product → BOM → BOM Items → PI → PO → Inward → QC → Job Work → Ready → Production → Delivery.
    /// Selecting one order returns the complete tree and a Gantt-friendly time series per BOM item.
    /// </summary>
    [Route("api/traceability")]
    public class TraceabilityController : BaseController
    {
        public TraceabilityController(ApplicationDbContext context) : base(context) { }

        [HttpGet("orders/{orderId:int}")]
        public async Task<ActionResult<ApiResponse<object>>> GetOrderTrace(int orderId)
        {
            if (!await HasPermissionAsync(nameof(UserPermission.ViewTraceability)) && !await IsAdminAsync()) return Forbidden();

            var order = await _context.Orders.AsNoTracking()
                .Include(o => o.Customer)
                .Include(o => o.Items).ThenInclude(oi => oi.Product)
                .Include(o => o.Items).ThenInclude(oi => oi.Bom)
                .Include(o => o.Items).ThenInclude(oi => oi.BomPlan).ThenInclude(p => p.Item)
                .Include(o => o.Items).ThenInclude(oi => oi.BomPlan).ThenInclude(p => p.Unit)
                .FirstOrDefaultAsync(o => o.Id == orderId);
            if (order == null) return NotFoundResponse("Order not found.");

            // Production / delivery
            var productionEntries = await _context.ProductionEntries.AsNoTracking()
                .Include(p => p.Consumptions).ThenInclude(c => c.OrderBomItemPlan)
                .Where(p => p.OrderId == orderId).ToListAsync();
            var deliveries = await _context.DeliveryChallans.AsNoTracking()
                .Include(d => d.Items)
                .Where(d => d.OrderId == orderId).ToListAsync();

            // For each plan, gather PI / PO / Inward / QC / JW history rows
            var planIds = order.Items.SelectMany(x => x.BomPlan).Select(p => p.Id).ToList();
            var piItems = await _context.PurchaseIndentItems.AsNoTracking()
                .Include(it => it.PurchaseIndent)
                .Where(it => it.OrderBomItemPlanId.HasValue && planIds.Contains(it.OrderBomItemPlanId.Value))
                .ToListAsync();
            var piItemIds = piItems.Select(p => p.Id).ToList();
            var poItems = await _context.PurchaseOrderItems.AsNoTracking()
                .Include(it => it.PurchaseOrder).ThenInclude(po => po!.Vendor)
                .Where(it => piItemIds.Contains(it.PurchaseIndentItemId))
                .ToListAsync();
            var jwItems = await _context.JobWorkItems.AsNoTracking()
                .Include(it => it.JobWork).ThenInclude(j => j!.ToParty)
                .Include(it => it.JobWork).ThenInclude(j => j!.Process)
                .Where(it => it.PurchaseIndentItemId.HasValue && piItemIds.Contains(it.PurchaseIndentItemId.Value))
                .ToListAsync();
            var poItemIds = poItems.Select(p => p.Id).ToList();
            var jwItemIds = jwItems.Select(j => j.Id).ToList();
            var inwardLines = await _context.InwardLines.AsNoTracking()
                .Include(l => l.Inward).ThenInclude(i => i!.Vendor)
                .Where(l =>
                    (l.SourceType == InwardSourceType.PO && poItemIds.Contains(l.SourceRefId!.Value)) ||
                    (l.SourceType == InwardSourceType.JobWork && jwItemIds.Contains(l.SourceRefId!.Value)))
                .ToListAsync();
            var inwardLineIds = inwardLines.Select(l => l.Id).ToList();
            var qcItems = await _context.QcItems.AsNoTracking()
                .Include(qi => qi.QcEntry)
                .Where(qi => inwardLineIds.Contains(qi.InwardLineId))
                .ToListAsync();

            // Build response
            var result = new
            {
                Order = new
                {
                    order.Id, order.OrderNumber, order.OrderDate, order.RequiredDeliveryDate, order.Status, order.Notes,
                    Customer = order.Customer != null ? new { order.Customer.Id, order.Customer.PartyName, order.Customer.MobileNumber, order.Customer.Email } : null,
                },
                Products = order.Items.Select(oi => new
                {
                    OrderItemId = oi.Id,
                    Product = oi.Product != null ? new { oi.Product.Id, oi.Product.ProductCode, oi.Product.ProductName } : null,
                    oi.QuantityOrdered, oi.ProducedQty, oi.DeliveredQty,
                    Bom = oi.Bom != null ? new { oi.Bom.Id, oi.Bom.BomVersion, oi.Bom.Status } : null,
                    Items = oi.BomPlan.OrderBy(p => p.Sequence).Select(p =>
                    {
                        var pis = piItems.Where(pi => pi.OrderBomItemPlanId == p.Id).ToList();
                        var poIds = pis.Select(x => x.Id).ToList();
                        var pos = poItems.Where(po => poIds.Contains(po.PurchaseIndentItemId)).ToList();
                        var jws = jwItems.Where(jw => jw.PurchaseIndentItemId.HasValue && poIds.Contains(jw.PurchaseIndentItemId.Value)).ToList();
                        var poItmIds = pos.Select(po => po.Id).ToList();
                        var jwItmIds = jws.Select(jw => jw.Id).ToList();
                        var ins = inwardLines.Where(l =>
                            (l.SourceType == InwardSourceType.PO && l.SourceRefId.HasValue && poItmIds.Contains(l.SourceRefId.Value)) ||
                            (l.SourceType == InwardSourceType.JobWork && l.SourceRefId.HasValue && jwItmIds.Contains(l.SourceRefId.Value))).ToList();
                        var inIds = ins.Select(x => x.Id).ToList();
                        var qcs = qcItems.Where(q => inIds.Contains(q.InwardLineId)).ToList();

                        return new
                        {
                            PlanId = p.Id,
                            Item = p.Item != null ? new { p.Item.Id, p.Item.ItemCode, p.Item.ItemName } : null,
                            p.RequiredQuantity, p.Sequence,
                            UnitSymbol = p.Unit?.Symbol,
                            Counters = new
                            {
                                p.IndentedQty, p.OrderedQty, p.InwardedQty, p.QcApprovedQty, p.QcReworkQty, p.QcRejectedQty,
                                p.JobWorkSentQty, p.ReadyQty, p.ConsumedQty,
                            },
                            // Gantt-friendly: linear ordered timeline
                            Timeline = BuildTimeline(p, pis, pos, ins, qcs, jws),
                        };
                    }),
                }),
                Production = productionEntries.Select(p => new
                {
                    p.Id, p.ProductionNo, p.ProductionDate, p.OrderItemId, p.ProducedQty, p.PlannedQty, p.Status,
                    Consumptions = p.Consumptions.Select(c => new
                    {
                        c.ItemNameSnapshot, c.ItemCodeSnapshot, c.QuantityConsumed, c.OrderBomItemPlanId,
                    }),
                }),
                Deliveries = deliveries.Select(d => new
                {
                    d.Id, d.ChallanNo, d.DispatchDate, d.VehicleNo, d.Status,
                    Items = d.Items.Select(i => new { i.OrderItemId, i.ProductNameSnapshot, i.DispatchQuantity }),
                }),
            };
            return Ok(new ApiResponse<object> { Data = result });
        }

        private static List<object> BuildTimeline(
            OrderBomItemPlan plan,
            List<PurchaseIndentItem> pis,
            List<PurchaseOrderItem> pos,
            List<InwardLine> ins,
            List<QualityControlItem> qcs,
            List<JobWorkItem> jws)
        {
            var events = new List<(DateTime At, string Stage, object Payload)>();
            events.Add((plan.FirstActivityAt ?? DateTime.MinValue, "Plan", new { Required = plan.RequiredQuantity }));
            foreach (var pi in pis)
                events.Add((pi.PurchaseIndent?.CreatedAt ?? DateTime.MinValue, "PI", new { pi.PurchaseIndent?.PiNo, pi.Quantity, pi.PurchaseIndent?.Status }));
            foreach (var po in pos)
                events.Add((po.PurchaseOrder?.CreatedAt ?? DateTime.MinValue, "PO", new { po.PurchaseOrder?.PoNo, po.Quantity, po.Rate, Status = po.PurchaseOrder?.Status, Vendor = po.PurchaseOrder?.Vendor?.PartyName }));
            foreach (var jw in jws)
                events.Add((jw.JobWork?.OutwardDate ?? DateTime.MinValue, "JobWork", new { jw.JobWork?.JobWorkNo, jw.Quantity, Process = jw.JobWork?.Process?.ProcessName, ToParty = jw.JobWork?.ToParty?.PartyName, Status = jw.JobWork?.Status }));
            foreach (var inw in ins)
                events.Add((inw.Inward?.InwardDate ?? DateTime.MinValue, "Inward", new { inw.Inward?.InwardNo, inw.Quantity, Source = inw.SourceType.ToString(), Vendor = inw.Inward?.Vendor?.PartyName }));
            foreach (var qc in qcs)
                events.Add((qc.QcEntry?.CreatedAt ?? DateTime.MinValue, "QC", new { qc.QcEntry?.QcNo, qc.ApprovedQty, qc.ReworkQty, qc.RejectedQty, qc.Decision }));

            return events
                .Where(e => e.At != DateTime.MinValue)
                .OrderBy(e => e.At)
                .Select(e => (object)new { at = e.At, stage = e.Stage, data = e.Payload })
                .ToList();
        }
    }
}
