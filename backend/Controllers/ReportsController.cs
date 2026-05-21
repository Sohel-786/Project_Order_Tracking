using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using net_backend.Data;
using net_backend.DTOs;
using net_backend.Models;
using net_backend.Services;

namespace net_backend.Controllers
{
    [Route("api/reports")]
    public class ReportsController : BaseController
    {
        private readonly IExcelService _excel;
        public ReportsController(ApplicationDbContext context, IExcelService excel) : base(context) { _excel = excel; }

        // ───────── Order Ledger
        [HttpGet("order-ledger/{orderId:int}")]
        public async Task<ActionResult<ApiResponse<IEnumerable<OrderLedgerRowDto>>>> OrderLedger(int orderId)
        {
            if (!await HasPermissionAsync(nameof(UserPermission.ViewReports))) return Forbidden();

            var rows = await BuildLedgerRowsAsync(orderId);
            return Ok(new ApiResponse<IEnumerable<OrderLedgerRowDto>> { Data = rows });
        }

        [HttpGet("order-ledger/{orderId:int}/export")]
        public async Task<IActionResult> OrderLedgerExport(int orderId)
        {
            if (!await HasPermissionAsync(nameof(UserPermission.ViewReports))) return Forbidden();

            var rows = await BuildLedgerRowsAsync(orderId);
            var order = await _context.Orders.AsNoTracking().Include(o => o.Customer).FirstOrDefaultAsync(o => o.Id == orderId);
            var title = order != null
                ? $"Order Ledger — {order.OrderNumber} | Customer: {order.Customer?.PartyName} | Date: {order.OrderDate:dd-MMM-yyyy}"
                : "Order Ledger";

            var bytes = _excel.GenerateExcel(rows, "Order Ledger", title);
            return File(bytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                $"order_ledger_{orderId}_{DateTime.Now:yyyyMMdd_HHmm}.xlsx");
        }

        private async Task<List<OrderLedgerRowDto>> BuildLedgerRowsAsync(int orderId)
        {
            var rows = new List<OrderLedgerRowDto>();
            var order = await _context.Orders.AsNoTracking()
                .Include(o => o.Customer)
                .Include(o => o.Items).ThenInclude(oi => oi.Product)
                .Include(o => o.Items).ThenInclude(oi => oi.BomPlan).ThenInclude(p => p.Item)
                .FirstOrDefaultAsync(o => o.Id == orderId);
            if (order == null) return rows;

            // Use snapshots where available to reflect the order's view at the time of activity.
            foreach (var oi in order.Items)
            {
                foreach (var p in oi.BomPlan)
                {
                    // PI rows
                    var pis = await _context.PurchaseIndentItems.AsNoTracking().Include(it => it.PurchaseIndent).Where(it => it.OrderBomItemPlanId == p.Id).ToListAsync();
                    foreach (var pi in pis)
                    {
                        rows.Add(new OrderLedgerRowDto
                        {
                            OrderNumber = order.OrderNumber, OrderDate = order.OrderDate, CustomerName = order.Customer?.PartyName,
                            ProductName = oi.Product?.ProductName, ProductCode = oi.Product?.ProductCode, QuantityOrdered = oi.QuantityOrdered,
                            ItemName = pi.ItemNameSnapshot, ItemCode = pi.ItemCodeSnapshot,
                            RequiredQty = p.RequiredQuantity,
                            Stage = "Purchase Indent",
                            DocumentNo = pi.PurchaseIndent?.PiNo ?? string.Empty,
                            ActivityDate = pi.PurchaseIndent?.CreatedAt ?? DateTime.MinValue,
                            Quantity = pi.Quantity,
                            Status = pi.PurchaseIndent?.Status.ToString(),
                            Remarks = pi.Remarks,
                        });

                        // PO rows from that PI item
                        var pos = await _context.PurchaseOrderItems.AsNoTracking().Include(po => po.PurchaseOrder).ThenInclude(po => po!.Vendor).Where(po => po.PurchaseIndentItemId == pi.Id).ToListAsync();
                        foreach (var po in pos)
                        {
                            rows.Add(new OrderLedgerRowDto
                            {
                                OrderNumber = order.OrderNumber, OrderDate = order.OrderDate, CustomerName = order.Customer?.PartyName,
                                ProductName = oi.Product?.ProductName, ProductCode = oi.Product?.ProductCode, QuantityOrdered = oi.QuantityOrdered,
                                ItemName = po.ItemNameSnapshot, ItemCode = po.ItemCodeSnapshot,
                                RequiredQty = p.RequiredQuantity,
                                Stage = "Purchase Order",
                                DocumentNo = po.PurchaseOrder?.PoNo ?? string.Empty,
                                ActivityDate = po.PurchaseOrder?.CreatedAt ?? DateTime.MinValue,
                                Quantity = po.Quantity,
                                Status = po.PurchaseOrder?.Status.ToString(),
                                PartyName = po.PurchaseOrder?.Vendor?.PartyName,
                            });

                            // Inward from PO line
                            var ins = await _context.InwardLines.AsNoTracking().Include(l => l.Inward).ThenInclude(i => i!.Vendor)
                                .Where(l => l.SourceType == InwardSourceType.PO && l.SourceRefId == po.Id).ToListAsync();
                            foreach (var inw in ins)
                            {
                                rows.Add(new OrderLedgerRowDto
                                {
                                    OrderNumber = order.OrderNumber, OrderDate = order.OrderDate, CustomerName = order.Customer?.PartyName,
                                    ProductName = oi.Product?.ProductName, ProductCode = oi.Product?.ProductCode, QuantityOrdered = oi.QuantityOrdered,
                                    ItemName = inw.ItemNameSnapshot, ItemCode = inw.ItemCodeSnapshot,
                                    RequiredQty = p.RequiredQuantity,
                                    Stage = "Inward",
                                    DocumentNo = inw.Inward?.InwardNo ?? string.Empty,
                                    ActivityDate = inw.Inward?.InwardDate ?? DateTime.MinValue,
                                    Quantity = inw.Quantity,
                                    PartyName = inw.Inward?.Vendor?.PartyName,
                                });

                                // QC for that inward line
                                var qcs = await _context.QcItems.AsNoTracking().Include(qi => qi.QcEntry).Where(qi => qi.InwardLineId == inw.Id).ToListAsync();
                                foreach (var qc in qcs)
                                {
                                    rows.Add(new OrderLedgerRowDto
                                    {
                                        OrderNumber = order.OrderNumber, OrderDate = order.OrderDate, CustomerName = order.Customer?.PartyName,
                                        ProductName = oi.Product?.ProductName, ProductCode = oi.Product?.ProductCode, QuantityOrdered = oi.QuantityOrdered,
                                        ItemName = inw.ItemNameSnapshot, ItemCode = inw.ItemCodeSnapshot,
                                        RequiredQty = p.RequiredQuantity,
                                        Stage = $"QC ({qc.Decision})",
                                        DocumentNo = qc.QcEntry?.QcNo ?? string.Empty,
                                        ActivityDate = qc.QcEntry?.CreatedAt ?? DateTime.MinValue,
                                        Quantity = qc.ApprovedQty + qc.ReworkQty + qc.RejectedQty,
                                        Status = $"A={qc.ApprovedQty} R={qc.ReworkQty} X={qc.RejectedQty}",
                                        Remarks = qc.Remarks,
                                    });
                                }
                            }
                        }

                        // Job Work from PI item
                        var jws = await _context.JobWorkItems.AsNoTracking().Include(j => j.JobWork).ThenInclude(jw => jw!.ToParty).Include(j => j.JobWork).ThenInclude(jw => jw!.Process).Where(j => j.PurchaseIndentItemId == pi.Id).ToListAsync();
                        foreach (var jw in jws)
                        {
                            rows.Add(new OrderLedgerRowDto
                            {
                                OrderNumber = order.OrderNumber, OrderDate = order.OrderDate, CustomerName = order.Customer?.PartyName,
                                ProductName = oi.Product?.ProductName, ProductCode = oi.Product?.ProductCode, QuantityOrdered = oi.QuantityOrdered,
                                ItemName = jw.ItemNameSnapshot, ItemCode = jw.ItemCodeSnapshot,
                                RequiredQty = p.RequiredQuantity,
                                Stage = $"Job Work ({jw.JobWork?.Process?.ProcessName})",
                                DocumentNo = jw.JobWork?.JobWorkNo ?? string.Empty,
                                ActivityDate = jw.JobWork?.OutwardDate ?? DateTime.MinValue,
                                Quantity = jw.Quantity,
                                PartyName = jw.JobWork?.ToParty?.PartyName,
                                Status = jw.JobWork?.Status.ToString(),
                            });
                        }
                    }
                }
            }

            // Production rows
            var prods = await _context.ProductionEntries.AsNoTracking()
                .Where(pe => pe.OrderId == order.Id && pe.IsActive)
                .OrderBy(pe => pe.ProductionDate).ToListAsync();
            foreach (var pr in prods)
            {
                rows.Add(new OrderLedgerRowDto
                {
                    OrderNumber = order.OrderNumber, OrderDate = order.OrderDate, CustomerName = order.Customer?.PartyName,
                    ProductName = pr.ProductNameSnapshot, ProductCode = pr.ProductCodeSnapshot, QuantityOrdered = 0,
                    Stage = "Production",
                    DocumentNo = pr.ProductionNo,
                    ActivityDate = pr.ProductionDate,
                    Quantity = pr.ProducedQty,
                    Status = pr.Status.ToString(),
                    Remarks = pr.Remarks,
                });
            }

            // Delivery rows
            var dcs = await _context.DeliveryChallans.AsNoTracking().Include(d => d.Items)
                .Where(d => d.OrderId == order.Id && d.IsActive)
                .OrderBy(d => d.DispatchDate).ToListAsync();
            foreach (var dc in dcs)
            {
                foreach (var di in dc.Items)
                {
                    rows.Add(new OrderLedgerRowDto
                    {
                        OrderNumber = order.OrderNumber, OrderDate = order.OrderDate, CustomerName = order.Customer?.PartyName,
                        ProductName = di.ProductNameSnapshot, ProductCode = di.ProductCodeSnapshot, QuantityOrdered = 0,
                        Stage = "Delivery",
                        DocumentNo = dc.ChallanNo,
                        ActivityDate = dc.DispatchDate,
                        Quantity = di.DispatchQuantity,
                        PartyName = order.Customer?.PartyName,
                        Status = dc.Status.ToString(),
                        Remarks = di.Remarks,
                    });
                }
            }

            return rows.OrderBy(r => r.ActivityDate).ThenBy(r => r.Stage).ToList();
        }
    }
}
