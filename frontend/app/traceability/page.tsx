"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ListTree,
  ShoppingCart,
  Factory,
  Truck,
  ChevronDown,
  ChevronRight,
  Calendar,
  Loader2,
  User,
} from "lucide-react";
import api from "@/lib/api";
import { Card } from "@/components/ui/card";
import { SearchableSelect, SearchableSelectOption } from "@/components/ui/searchable-select";
import { AccessDenied } from "@/components/ui/access-denied";
import { useCurrentUserPermissions } from "@/hooks/use-settings";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { formatDate } from "@/lib/utils";

// ─────────────────────────────────────── Types from API

interface OrderListRow {
  id: number;
  orderNumber: string;
  orderDate: string;
  customerName?: string | null;
  status: string;
}

interface TraceItem {
  id: number;
  itemCode?: string | null;
  itemName?: string | null;
}

interface TraceCounters {
  indentedQty: number;
  orderedQty: number;
  inwardedQty: number;
  qcApprovedQty: number;
  qcReworkQty: number;
  qcRejectedQty: number;
  jobWorkSentQty: number;
  readyQty: number;
  consumedQty: number;
}

interface TraceTimelineEvent {
  at: string;
  stage: string;
  data: Record<string, any>;
}

interface TracePlan {
  planId: number;
  item: TraceItem | null;
  requiredQuantity: number;
  sequence: number;
  unitSymbol?: string | null;
  counters: TraceCounters;
  timeline: TraceTimelineEvent[];
}

interface TraceProduct {
  orderItemId: number;
  product: { id: number; productCode: string; productName: string } | null;
  quantityOrdered: number;
  producedQty: number;
  deliveredQty: number;
  bom: { id: number; bomVersion: string; status: string } | null;
  items: TracePlan[];
}

interface TraceProduction {
  id: number;
  productionNo: string;
  productionDate: string;
  orderItemId: number;
  producedQty: number;
  plannedQty: number;
  status: string;
  consumptions: { itemNameSnapshot?: string | null; itemCodeSnapshot?: string | null; quantityConsumed: number; orderBomItemPlanId: number }[];
}

interface TraceDelivery {
  id: number;
  challanNo: string;
  dispatchDate: string;
  vehicleNo?: string | null;
  status: string;
  items: { orderItemId: number; productNameSnapshot?: string | null; dispatchQuantity: number }[];
}

interface TraceResponse {
  order: {
    id: number;
    orderNumber: string;
    orderDate: string;
    requiredDeliveryDate?: string | null;
    status: string;
    notes?: string | null;
    customer?: { id: number; partyName: string; mobileNumber?: string | null; email?: string | null } | null;
  };
  products: TraceProduct[];
  production: TraceProduction[];
  deliveries: TraceDelivery[];
}

// ─────────────────────────────────────── Page

export default function TraceabilityPage() {
  const { data: permissions, isLoading: permsLoading } = useCurrentUserPermissions();
  const canView = !!permissions?.viewTraceability;

  const [orderId, setOrderId] = useState<number | "">("");
  const [orderSearch, setOrderSearch] = useState("");
  const debouncedSearch = useDebouncedValue(orderSearch, 300);

  const { data: orderOptionsRaw } = useQuery({
    queryKey: ["orders", "trace-picker", debouncedSearch],
    queryFn: async (): Promise<OrderListRow[]> => {
      const res = await api.get("/orders", {
        params: { activeOnly: true, search: debouncedSearch || undefined, page: 1, pageSize: 50 },
      });
      return res.data.data ?? [];
    },
    enabled: canView,
    staleTime: 30_000,
  });

  const orderOptions = useMemo<SearchableSelectOption[]>(
    () => (orderOptionsRaw ?? []).map((o) => ({ value: o.id, label: `${o.orderNumber} — ${o.customerName ?? "—"} (${o.status})` })),
    [orderOptionsRaw],
  );

  const { data: trace, isFetching } = useQuery({
    queryKey: ["traceability", orderId],
    queryFn: async (): Promise<TraceResponse> => {
      const res = await api.get(`/traceability/orders/${orderId}`);
      return res.data.data;
    },
    enabled: canView && !!orderId,
  });

  if (!permsLoading && !canView) {
    return (
      <AccessDenied actionLabel="Go to Dashboard" actionHref="/dashboard" message="You do not have permission to view Traceability." />
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
          <ListTree className="w-5 h-5 text-primary-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Order Traceability</h1>
          <p className="text-sm text-muted-foreground">
            End-to-end view of an order: BOM, procurement, QC, job work, production and delivery.
          </p>
        </div>
      </div>

      <Card className="p-4">
        <div className="max-w-2xl">
          <SearchableSelect
            options={orderOptions}
            value={orderId}
            onChange={(v) => setOrderId(v === "" ? "" : Number(v))}
            placeholder="Pick an order…"
            searchPlaceholder="Search by order # or customer…"
            onSearchChange={(t) => setOrderSearch(t)}
            label="Order"
          />
        </div>
      </Card>

      {isFetching && (
        <div className="text-center py-12 text-muted-foreground">
          <Loader2 className="w-5 h-5 inline animate-spin mr-2" />
          Loading traceability…
        </div>
      )}

      {!orderId && !isFetching && (
        <Card className="p-10 text-center text-muted-foreground">
          Pick an order above to view its complete trace.
        </Card>
      )}

      {trace && <TraceView trace={trace} />}
    </div>
  );
}

// ─────────────────────────────────────── Trace View

function TraceView({ trace }: { trace: TraceResponse }) {
  const customerName = trace.order.customer?.partyName ?? "—";
  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="p-5">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KeyValue label="Order #" value={trace.order.orderNumber} />
          <KeyValue label="Customer" value={customerName} />
          <KeyValue label="Order Date" value={formatDate(trace.order.orderDate)} />
          <KeyValue label="Required Delivery" value={trace.order.requiredDeliveryDate ? formatDate(trace.order.requiredDeliveryDate) : "—"} />
          <KeyValue label="Status" value={<OrderStatusPill status={trace.order.status} />} />
          {trace.order.customer?.mobileNumber && <KeyValue label="Contact" value={trace.order.customer.mobileNumber} />}
          {trace.order.customer?.email && <KeyValue label="Email" value={trace.order.customer.email} />}
        </div>
        {trace.order.notes && (
          <p className="mt-4 text-sm text-muted-foreground border-t border-border/60 pt-3"><strong className="text-foreground">Notes:</strong> {trace.order.notes}</p>
        )}
      </Card>

      {/* Products */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground">Products & BOM Trace</h2>
        {trace.products.length === 0 && (
          <Card className="p-6 text-center text-muted-foreground">No products on this order.</Card>
        )}
        {trace.products.map((p) => (
          <ProductTraceCard key={p.orderItemId} product={p} />
        ))}
      </section>

      {/* Production */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Factory className="w-5 h-5 text-primary-600" /> Production
        </h2>
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="text-left py-2 px-4">Production No</th>
                <th className="text-left py-2 px-4">Date</th>
                <th className="text-right py-2 px-4">Planned</th>
                <th className="text-right py-2 px-4">Produced</th>
                <th className="text-left py-2 px-4">Status</th>
                <th className="text-left py-2 px-4">Consumptions</th>
              </tr>
            </thead>
            <tbody>
              {trace.production.length === 0 && (
                <tr><td colSpan={6} className="text-center py-6 text-muted-foreground">No production entries yet.</td></tr>
              )}
              {trace.production.map((pr) => (
                <tr key={pr.id} className="border-t border-border/60 hover:bg-muted/30">
                  <td className="py-2 px-4 font-medium">{pr.productionNo}</td>
                  <td className="py-2 px-4 text-muted-foreground">{formatDate(pr.productionDate)}</td>
                  <td className="py-2 px-4 text-right">{pr.plannedQty}</td>
                  <td className="py-2 px-4 text-right font-semibold">{pr.producedQty}</td>
                  <td className="py-2 px-4"><BasicPill text={pr.status} /></td>
                  <td className="py-2 px-4 text-xs text-muted-foreground">
                    {pr.consumptions.length === 0 ? "—" :
                      pr.consumptions.map((c, i) => (
                        <span key={i} className="inline-block mr-2">
                          {c.itemNameSnapshot} <span className="font-medium text-foreground">×{c.quantityConsumed}</span>
                          {i < pr.consumptions.length - 1 ? "," : ""}
                        </span>
                      ))
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </section>

      {/* Deliveries */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Truck className="w-5 h-5 text-primary-600" /> Deliveries
        </h2>
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="text-left py-2 px-4">Challan No</th>
                <th className="text-left py-2 px-4">Date</th>
                <th className="text-left py-2 px-4">Vehicle</th>
                <th className="text-left py-2 px-4">Items</th>
                <th className="text-right py-2 px-4">Total Qty</th>
                <th className="text-left py-2 px-4">Status</th>
              </tr>
            </thead>
            <tbody>
              {trace.deliveries.length === 0 && (
                <tr><td colSpan={6} className="text-center py-6 text-muted-foreground">No delivery challans yet.</td></tr>
              )}
              {trace.deliveries.map((d) => {
                const total = d.items.reduce((s, i) => s + i.dispatchQuantity, 0);
                return (
                  <tr key={d.id} className="border-t border-border/60 hover:bg-muted/30">
                    <td className="py-2 px-4 font-medium">{d.challanNo}</td>
                    <td className="py-2 px-4 text-muted-foreground">{formatDate(d.dispatchDate)}</td>
                    <td className="py-2 px-4">{d.vehicleNo ?? "—"}</td>
                    <td className="py-2 px-4 text-xs text-muted-foreground">
                      {d.items.map((i, idx) => (
                        <span key={idx} className="inline-block mr-2">
                          {i.productNameSnapshot} <span className="font-medium text-foreground">×{i.dispatchQuantity}</span>
                        </span>
                      ))}
                    </td>
                    <td className="py-2 px-4 text-right font-semibold">{total}</td>
                    <td className="py-2 px-4"><BasicPill text={d.status} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      </section>
    </div>
  );
}

// ─────────────────────────────────────── Product Trace

function ProductTraceCard({ product }: { product: TraceProduct }) {
  const [expanded, setExpanded] = useState(true);
  const orderedPct = product.quantityOrdered > 0 ? (product.producedQty / product.quantityOrdered) * 100 : 0;
  const dispatchedPct = product.quantityOrdered > 0 ? (product.deliveredQty / product.quantityOrdered) * 100 : 0;
  return (
    <Card className="p-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-primary-50 dark:bg-primary-900/30 flex items-center justify-center shrink-0">
            <ShoppingCart className="w-5 h-5 text-primary-600" />
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-foreground truncate">{product.product?.productName ?? "—"}</h3>
            <p className="text-xs text-muted-foreground">
              {product.product?.productCode} {product.bom ? `· BOM ${product.bom.bomVersion}` : ""}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="shrink-0 p-2 rounded-md hover:bg-muted text-muted-foreground"
          aria-label={expanded ? "Collapse" : "Expand"}
        >
          {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <Counter label="Ordered" value={product.quantityOrdered} accent />
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Produced</span>
            <span className="font-medium">{product.producedQty} / {product.quantityOrdered}</span>
          </div>
          <ProgressBar value={orderedPct} />
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Delivered</span>
            <span className="font-medium">{product.deliveredQty} / {product.quantityOrdered}</span>
          </div>
          <ProgressBar value={dispatchedPct} />
        </div>
      </div>

      {expanded && (
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-foreground border-t border-border/60 pt-3">BOM Items</h4>
          {product.items.length === 0 && (
            <p className="text-sm text-muted-foreground">No BOM plan rows.</p>
          )}
          <div className="space-y-3">
            {product.items.map((plan) => (
              <BomPlanRow key={plan.planId} plan={plan} />
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}

function BomPlanRow({ plan }: { plan: TracePlan }) {
  const c = plan.counters;
  const req = plan.requiredQuantity || 1;
  // Bars normalised against required quantity (clamped 0..100)
  const pct = (n: number) => Math.min(100, (n / req) * 100);
  return (
    <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-medium text-foreground">{plan.item?.itemName ?? "—"}</div>
          <div className="text-xs text-muted-foreground">
            {plan.item?.itemCode} · Required <strong className="text-foreground">{plan.requiredQuantity}</strong>{plan.unitSymbol ? ` ${plan.unitSymbol}` : ""}
          </div>
        </div>
      </div>

      {/* Counters as horizontal bars */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-2">
        <Bar label="Indented"     value={c.indentedQty}   pct={pct(c.indentedQty)} />
        <Bar label="Ordered"      value={c.orderedQty}    pct={pct(c.orderedQty)} />
        <Bar label="Inwarded"     value={c.inwardedQty}   pct={pct(c.inwardedQty)} />
        <Bar label="QC Approved"  value={c.qcApprovedQty} pct={pct(c.qcApprovedQty)} color="bg-emerald-500" />
        <Bar label="Rework"       value={c.qcReworkQty}   pct={pct(c.qcReworkQty)} color="bg-amber-500" />
        <Bar label="Rejected"     value={c.qcRejectedQty} pct={pct(c.qcRejectedQty)} color="bg-rose-500" />
        <Bar label="JobWork Sent" value={c.jobWorkSentQty} pct={pct(c.jobWorkSentQty)} color="bg-violet-500" />
        <Bar label="Ready"        value={c.readyQty}      pct={pct(c.readyQty)} color="bg-primary-600" />
        <Bar label="Consumed"     value={c.consumedQty}   pct={pct(c.consumedQty)} color="bg-slate-500" />
      </div>

      {/* Gantt-lite timeline */}
      {plan.timeline.length > 0 && (
        <div className="border-t border-border/60 pt-3 mt-1">
          <h5 className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Timeline</h5>
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {plan.timeline.map((ev, idx) => (
              <TimelineStep key={idx} event={ev} isLast={idx === plan.timeline.length - 1} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function TimelineStep({ event, isLast }: { event: TraceTimelineEvent; isLast: boolean }) {
  const stageStyles: Record<string, string> = {
    Plan:    "bg-slate-100 text-slate-700 dark:bg-slate-700/30 dark:text-slate-200 border-slate-200 dark:border-slate-700",
    PI:      "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 border-amber-200 dark:border-amber-800",
    PO:      "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300 border-orange-200 dark:border-orange-800",
    JobWork: "bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300 border-violet-200 dark:border-violet-800",
    Inward:  "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800",
    QC:      "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
    Ready:   "bg-primary-100 text-primary-800 dark:bg-primary-900/30 dark:text-primary-300 border-primary-200 dark:border-primary-800",
  };
  const style = stageStyles[event.stage] ?? stageStyles.Plan;
  const qty = event.data?.Quantity ?? event.data?.quantity ?? event.data?.Required ?? event.data?.required;
  const subLabel = event.data?.PiNo ?? event.data?.PoNo ?? event.data?.InwardNo ?? event.data?.QcNo ?? event.data?.JobWorkNo ?? event.data?.Vendor ?? event.data?.ToParty ?? event.data?.Process ?? "";
  return (
    <div className="flex items-center shrink-0">
      <div className={`rounded-md border px-3 py-2 text-xs min-w-[8rem] ${style}`}>
        <div className="flex items-center gap-1 font-semibold">
          <span>{event.stage}</span>
          {qty != null && <span className="ml-auto">×{Number(qty)}</span>}
        </div>
        <div className="flex items-center gap-1 text-[10px] opacity-80 mt-0.5">
          <Calendar className="w-3 h-3" />
          {formatDate(event.at)}
        </div>
        {subLabel && (
          <div className="flex items-center gap-1 text-[10px] opacity-80 truncate mt-0.5">
            <User className="w-3 h-3" />
            <span className="truncate">{String(subLabel)}</span>
          </div>
        )}
      </div>
      {!isLast && <ChevronRight className="w-3 h-3 mx-1 text-muted-foreground shrink-0" />}
    </div>
  );
}

// ─────────────────────────────────────── UI atoms

function Counter({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className={`rounded-md px-3 py-2 border border-border ${accent ? "bg-primary-50 dark:bg-primary-900/20" : "bg-card"}`}>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="text-lg font-bold text-foreground">{value}</div>
    </div>
  );
}

function Bar({ label, value, pct, color = "bg-primary-600" }: { label: string; value: number; pct: number; color?: string }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium text-foreground">{value}</span>
      </div>
      <div className="w-full h-1.5 rounded-full bg-primary-100 dark:bg-primary-900/30 overflow-hidden">
        <div className={`h-full ${color} rounded-full`} style={{ width: `${Math.min(100, Math.max(0, pct))}%` }} />
      </div>
    </div>
  );
}

function ProgressBar({ value, color = "bg-primary-600" }: { value: number; color?: string }) {
  return (
    <div className="w-full h-2 rounded-full bg-primary-100 dark:bg-primary-900/30 overflow-hidden">
      <div className={`h-full ${color} rounded-full`} style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </div>
  );
}

function KeyValue({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="space-y-0.5">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="text-sm font-medium text-foreground">{value}</div>
    </div>
  );
}

function OrderStatusPill({ status }: { status: string }) {
  const colorMap: Record<string, string> = {
    Pending:            "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
    InProcurement:      "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
    InProduction:       "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300",
    PartiallyDelivered: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
    FullyDelivered:     "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
    Cancelled:          "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full ${colorMap[status] ?? "bg-gray-100 text-gray-800"}`}>
      {status}
    </span>
  );
}

function BasicPill({ text }: { text: string }) {
  return <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300">{text}</span>;
}
