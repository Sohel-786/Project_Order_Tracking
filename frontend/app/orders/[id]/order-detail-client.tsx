"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRightCircle,
  Boxes,
  Briefcase,
  CalendarClock,
  ClipboardCheck,
  Factory,
  FileText,
  Hammer,
  History,
  Pencil,
  Phone,
  ShoppingCart,
  Truck,
  Workflow,
} from "lucide-react";

import api from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AccessDenied } from "@/components/ui/access-denied";
import { useCurrentUserPermissions } from "@/hooks/use-settings";
import { Order, OrderStatus } from "@/types";
import { cn, formatDate, formatDateTime } from "@/lib/utils";
import { OrderStatusPill } from "@/components/orders/status-pill";
import { EditOrderDialog } from "@/components/orders/edit-order-dialog";

// ─────────────────────────────────────────────── Traceability types

interface TraceTimelineEvent {
  at: string;
  stage: "Plan" | "PI" | "PO" | "Inward" | "QC" | "JobWork" | string;
  data: Record<string, any> | null;
}

interface TracePlanCounters {
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

interface TraceProduct {
  orderItemId: number;
  product: { id: number; productCode: string; productName: string } | null;
  quantityOrdered: number;
  producedQty: number;
  deliveredQty: number;
  bom: { id: number; bomVersion: string; status: string } | null;
  items: Array<{
    planId: number;
    item: { id: number; itemCode: string; itemName: string } | null;
    requiredQuantity: number;
    sequence: number;
    unitSymbol?: string | null;
    counters: TracePlanCounters;
    timeline: TraceTimelineEvent[];
  }>;
}

interface TraceResponse {
  order: {
    id: number;
    orderNumber: string;
    orderDate: string;
    requiredDeliveryDate?: string | null;
    status: OrderStatus;
    notes?: string | null;
    customer: {
      id: number;
      partyName: string;
      mobileNumber?: string | null;
      email?: string | null;
    } | null;
  };
  products: TraceProduct[];
  production: Array<{
    id: number;
    productionNo: string;
    productionDate: string;
    orderItemId: number;
    producedQty: number;
    plannedQty: number;
    status: string;
  }>;
  deliveries: Array<{
    id: number;
    challanNo: string;
    dispatchDate: string;
    vehicleNo?: string | null;
    status: string;
  }>;
}

// ─────────────────────────────────────────────── Linked record buckets

interface LinkedRow {
  key: string;
  primary: string;
  meta?: string;
  status?: string;
  at?: string;
}

function flattenLinkedRecords(trace: TraceResponse | undefined) {
  const buckets = {
    PI: new Map<string, LinkedRow>(),
    PO: new Map<string, LinkedRow>(),
    Inward: new Map<string, LinkedRow>(),
    QC: new Map<string, LinkedRow>(),
    JobWork: new Map<string, LinkedRow>(),
  };

  if (!trace) return buckets;

  trace.products.forEach((prod) => {
    prod.items.forEach((plan) => {
      plan.timeline.forEach((ev) => {
        const d = ev.data ?? {};
        switch (ev.stage) {
          case "PI": {
            const piNo = d.piNo ?? d.PiNo ?? "";
            if (!piNo) return;
            if (buckets.PI.has(piNo)) return;
            buckets.PI.set(piNo, {
              key: piNo,
              primary: piNo,
              meta: d.quantity != null ? `Qty ${d.quantity}` : undefined,
              status: d.status ?? undefined,
              at: ev.at,
            });
            break;
          }
          case "PO": {
            const poNo = d.poNo ?? d.PoNo ?? "";
            if (!poNo) return;
            if (buckets.PO.has(poNo)) return;
            buckets.PO.set(poNo, {
              key: poNo,
              primary: poNo,
              meta: d.vendor ? `${d.vendor}${d.quantity != null ? ` · Qty ${d.quantity}` : ""}` : d.quantity != null ? `Qty ${d.quantity}` : undefined,
              status: d.status ?? undefined,
              at: ev.at,
            });
            break;
          }
          case "Inward": {
            const inwardNo = d.inwardNo ?? d.InwardNo ?? "";
            if (!inwardNo) return;
            if (buckets.Inward.has(inwardNo)) return;
            buckets.Inward.set(inwardNo, {
              key: inwardNo,
              primary: inwardNo,
              meta: d.vendor ? `${d.vendor}${d.quantity != null ? ` · Qty ${d.quantity}` : ""}` : d.quantity != null ? `Qty ${d.quantity}` : undefined,
              status: d.source ?? undefined,
              at: ev.at,
            });
            break;
          }
          case "QC": {
            const qcNo = d.qcNo ?? d.QcNo ?? "";
            if (!qcNo) return;
            if (buckets.QC.has(qcNo)) return;
            const approved = d.approvedQty ?? 0;
            const rework = d.reworkQty ?? 0;
            const rejected = d.rejectedQty ?? 0;
            buckets.QC.set(qcNo, {
              key: qcNo,
              primary: qcNo,
              meta: `Approved ${approved} · Rework ${rework} · Rejected ${rejected}`,
              status: d.decision ?? undefined,
              at: ev.at,
            });
            break;
          }
          case "JobWork": {
            const jwNo = d.jobWorkNo ?? d.JobWorkNo ?? "";
            if (!jwNo) return;
            if (buckets.JobWork.has(jwNo)) return;
            buckets.JobWork.set(jwNo, {
              key: jwNo,
              primary: jwNo,
              meta: d.toParty
                ? `${d.toParty}${d.process ? ` · ${d.process}` : ""}${d.quantity != null ? ` · Qty ${d.quantity}` : ""}`
                : d.process ?? undefined,
              status: d.status ?? undefined,
              at: ev.at,
            });
            break;
          }
          default:
            break;
        }
      });
    });
  });

  return buckets;
}

// ─────────────────────────────────────────────── Component

export default function OrderDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const orderId = Number(params?.id);
  const { data: permissions, isLoading: permsLoading } = useCurrentUserPermissions();
  const [editOpen, setEditOpen] = useState(false);

  const { data: order, isLoading: orderLoading } = useQuery({
    queryKey: ["orders", orderId],
    queryFn: async (): Promise<Order> => {
      const r = await api.get(`/orders/${orderId}`);
      return r.data?.data;
    },
    enabled: !!permissions?.viewOrder && Number.isFinite(orderId),
  });

  const { data: trace } = useQuery({
    queryKey: ["traceability", "orders", orderId],
    queryFn: async (): Promise<TraceResponse> => {
      const r = await api.get(`/traceability/orders/${orderId}`);
      return r.data?.data;
    },
    enabled: !!permissions?.viewTraceability && Number.isFinite(orderId),
  });

  const linked = useMemo(() => flattenLinkedRecords(trace), [trace]);

  if (permsLoading) {
    return (
      <div className="p-6">
        <div className="h-24 rounded-2xl bg-muted animate-pulse" />
      </div>
    );
  }
  if (!permissions?.viewOrder) {
    return (
      <AccessDenied
        message="You do not have permission to view Sales Orders."
        actionLabel="Go to Dashboard"
        actionHref="/dashboard"
      />
    );
  }
  if (!Number.isFinite(orderId)) {
    return (
      <AccessDenied
        message="Invalid order id."
        actionLabel="Back to Orders"
        actionHref="/orders"
      />
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => router.push("/orders")}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Back
          </Button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
              <ShoppingCart className="w-5 h-5 text-primary-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                {order?.orderNumber ?? (orderLoading ? "Loading…" : "Order")}
              </h1>
              <p className="text-sm text-muted-foreground">Detailed order view with traceability.</p>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          {permissions?.editOrder && order && (
            <Button variant="outline" onClick={() => setEditOpen(true)}>
              <Pencil className="w-4 h-4 mr-2" /> Edit Order Details
            </Button>
          )}
          {permissions?.viewTraceability && (
            <Button
              onClick={() => router.push(`/traceability/${orderId}`)}
              className="bg-primary-500 hover:bg-primary-600"
            >
              <Workflow className="w-4 h-4 mr-2" /> View Traceability
            </Button>
          )}
        </div>
      </div>

      {orderLoading && !order && (
        <Card className="p-10 text-center text-muted-foreground">Loading order…</Card>
      )}

      {order && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Main column */}
          <div className="lg:col-span-8 space-y-6">
            <OrderHeaderCard order={order} />

            <div>
              <h2 className="text-base font-semibold text-foreground mb-3 flex items-center gap-2">
                <Boxes className="w-4 h-4 text-primary-600" /> Order Items ({order.items?.length ?? 0})
              </h2>
              <div className="space-y-5">
                {(order.items ?? []).map((item, idx) => (
                  <OrderItemCard key={item.id} item={item} index={idx} />
                ))}
                {(!order.items || order.items.length === 0) && (
                  <Card className="p-6 text-center text-muted-foreground">
                    No items linked to this order.
                  </Card>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-4 space-y-5">
            <LinkedRecordsCard
              icon={FileText}
              title="Purchase Indents"
              rows={Array.from(linked.PI.values())}
              tone="blue"
            />
            <LinkedRecordsCard
              icon={ShoppingCart}
              title="Purchase Orders"
              rows={Array.from(linked.PO.values())}
              tone="indigo"
            />
            <LinkedRecordsCard
              icon={ArrowRightCircle}
              title="Inwards"
              rows={Array.from(linked.Inward.values())}
              tone="amber"
            />
            <LinkedRecordsCard
              icon={ClipboardCheck}
              title="Quality Checks"
              rows={Array.from(linked.QC.values())}
              tone="purple"
            />
            <LinkedRecordsCard
              icon={Briefcase}
              title="Job Works"
              rows={Array.from(linked.JobWork.values())}
              tone="teal"
            />
            <LinkedRecordsCard
              icon={Factory}
              title="Production Entries"
              rows={(trace?.production ?? []).map((p) => ({
                key: String(p.id),
                primary: p.productionNo,
                meta: `Planned ${p.plannedQty} · Produced ${p.producedQty}`,
                status: p.status,
                at: p.productionDate,
              }))}
              tone="emerald"
            />
            <LinkedRecordsCard
              icon={Truck}
              title="Delivery Challans"
              rows={(trace?.deliveries ?? []).map((d) => ({
                key: String(d.id),
                primary: d.challanNo,
                meta: d.vehicleNo ? `Vehicle ${d.vehicleNo}` : undefined,
                status: d.status,
                at: d.dispatchDate,
              }))}
              tone="rose"
            />
          </div>
        </div>
      )}

      {order && (
        <EditOrderDialog
          open={editOpen}
          onClose={() => setEditOpen(false)}
          order={{
            id: order.id,
            orderNumber: order.orderNumber,
            customerId: order.customerId,
            orderDate: order.orderDate,
            requiredDeliveryDate: order.requiredDeliveryDate,
            notes: order.notes,
          }}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────── Header Card

function OrderHeaderCard({ order }: { order: Order }) {
  return (
    <Card className="p-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Order Number</div>
          <div className="text-3xl font-bold text-foreground mt-1 font-mono tracking-tight">
            {order.orderNumber}
          </div>
          <div className="mt-2">
            <OrderStatusPill status={order.status} size="md" />
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-3 text-sm">
          <div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Order Date</div>
            <div className="font-medium text-foreground mt-0.5 flex items-center gap-1">
              <CalendarClock className="w-3.5 h-3.5 text-muted-foreground" />
              {formatDate(order.orderDate)}
            </div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Required By</div>
            <div className="font-medium text-foreground mt-0.5 flex items-center gap-1">
              <CalendarClock className="w-3.5 h-3.5 text-muted-foreground" />
              {order.requiredDeliveryDate ? formatDate(order.requiredDeliveryDate) : "—"}
            </div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Created</div>
            <div className="font-medium text-foreground mt-0.5">
              {formatDateTime(order.createdAt)}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="rounded-lg border border-border bg-muted/30 p-4">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Customer</div>
          <div className="font-semibold text-foreground mt-1">{order.customerName ?? "—"}</div>
          {order.customerContact && (
            <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5" /> {order.customerContact}
            </div>
          )}
        </div>
        <div className="rounded-lg border border-border bg-muted/30 p-4">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Notes</div>
          <div className="text-sm text-foreground whitespace-pre-wrap mt-1">
            {order.notes?.trim() || <span className="text-muted-foreground">No notes.</span>}
          </div>
        </div>
      </div>
    </Card>
  );
}

// ─────────────────────────────────────────────── Order Item Card

function OrderItemCard({ item, index }: { item: Order["items"][number]; index: number }) {
  const ordered = item.quantityOrdered;
  const produced = item.producedQty;
  const delivered = item.deliveredQty;
  const producedPct = ordered > 0 ? Math.min(100, (produced / ordered) * 100) : 0;
  const deliveredPct = ordered > 0 ? Math.min(100, (delivered / ordered) * 100) : 0;

  return (
    <Card className="p-5 space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-600 dark:text-primary-300 font-semibold">
            #{index + 1}
          </div>
          <div>
            <div className="font-semibold text-foreground">
              {item.productName ?? "Product"}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5 font-mono">
              {item.productCode ?? "—"}
            </div>
            {item.remarks && (
              <div className="text-xs text-muted-foreground mt-1 italic">{item.remarks}</div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <BomBadge version={item.bomVersion ?? null} />
          <Counter label="Ordered" value={ordered} tone="slate" />
          <Counter label="Produced" value={produced} tone="blue" subtle={producedPct} />
          <Counter label="Delivered" value={delivered} tone="emerald" subtle={deliveredPct} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
        <ProgressBar label="Production progress" value={produced} max={ordered} color="blue" />
        <ProgressBar label="Delivery progress" value={delivered} max={ordered} color="emerald" />
      </div>

      <div>
        <h4 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
          <Hammer className="w-4 h-4 text-primary-600" />
          BOM Plan ({item.bomPlan?.length ?? 0} items)
        </h4>
        <div className="overflow-x-auto rounded-md border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-[11px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="text-left py-2 px-3 w-10">#</th>
                <th className="text-left py-2 px-3">Item Code</th>
                <th className="text-left py-2 px-3">Item Name</th>
                <th className="text-right py-2 px-3">Required</th>
                <th className="text-left py-2 px-3 w-16">Unit</th>
                <BomCountHeader label="Indented" tone="amber" />
                <BomCountHeader label="Ordered" tone="orange" />
                <BomCountHeader label="Inwarded" tone="indigo" />
                <BomCountHeader label="QC Approved" tone="purple" />
                <BomCountHeader label="Rework" tone="rose" />
                <BomCountHeader label="Ready" tone="emerald" />
                <BomCountHeader label="Consumed" tone="blue" />
              </tr>
            </thead>
            <tbody>
              {(item.bomPlan ?? []).map((plan) => {
                const req = plan.requiredQuantity || 0;
                return (
                  <tr key={plan.id} className="border-t border-border/60 align-top">
                    <td className="py-2 px-3 text-muted-foreground">{plan.sequence}</td>
                    <td className="py-2 px-3 font-mono text-xs">{plan.itemCode ?? "—"}</td>
                    <td className="py-2 px-3">
                      <div className="font-medium text-foreground">{plan.itemName ?? "—"}</div>
                    </td>
                    <td className="py-2 px-3 text-right tabular-nums font-semibold">{req}</td>
                    <td className="py-2 px-3 text-xs text-muted-foreground">
                      {plan.unitSymbol ?? "—"}
                    </td>
                    <BomCountCell value={plan.indentedQty} required={req} tone="amber" />
                    <BomCountCell value={plan.orderedQty} required={req} tone="orange" />
                    <BomCountCell value={plan.inwardedQty} required={req} tone="indigo" />
                    <BomCountCell value={plan.qcApprovedQty} required={req} tone="purple" />
                    <BomCountCell value={plan.qcReworkQty} required={req} tone="rose" />
                    <BomCountCell value={plan.readyQty} required={req} tone="emerald" />
                    <BomCountCell value={plan.consumedQty} required={req} tone="blue" />
                  </tr>
                );
              })}
              {(!item.bomPlan || item.bomPlan.length === 0) && (
                <tr>
                  <td colSpan={12} className="py-6 text-center text-muted-foreground">
                    No BOM plan generated.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </Card>
  );
}

function BomBadge({ version }: { version: string | null }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-md border border-border bg-muted/40 px-2 py-1 text-xs font-mono">
      <Hammer className="w-3 h-3 text-primary-600" />
      BOM {version ?? "—"}
    </span>
  );
}

function Counter({
  label,
  value,
  tone,
  subtle,
}: {
  label: string;
  value: number;
  tone: "slate" | "blue" | "emerald";
  subtle?: number;
}) {
  const toneMap: Record<string, string> = {
    slate: "bg-slate-100 text-slate-800 dark:bg-slate-900/40 dark:text-slate-200",
    blue: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
    emerald: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
  };
  return (
    <div className="text-right">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={cn("inline-flex items-baseline rounded-md px-2 py-0.5 mt-0.5 tabular-nums font-semibold", toneMap[tone])}>
        {value}
        {subtle != null && <span className="ml-1 text-[10px] font-normal opacity-80">{subtle.toFixed(0)}%</span>}
      </div>
    </div>
  );
}

function ProgressBar({
  label,
  value,
  max,
  color,
}: {
  label: string;
  value: number;
  max: number;
  color: "blue" | "emerald";
}) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  const colorMap = {
    blue: "bg-blue-500",
    emerald: "bg-emerald-500",
  } as const;
  return (
    <div>
      <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-1">
        <span>{label}</span>
        <span className="tabular-nums">
          {value}/{max} <span className="opacity-70">({pct.toFixed(0)}%)</span>
        </span>
      </div>
      <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
        <div
          className={cn("h-full transition-all", colorMap[color])}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

const BOM_TONE: Record<string, { text: string; bar: string }> = {
  amber: { text: "text-amber-700 dark:text-amber-300", bar: "bg-amber-400/70" },
  orange: { text: "text-orange-700 dark:text-orange-300", bar: "bg-orange-400/70" },
  indigo: { text: "text-indigo-700 dark:text-indigo-300", bar: "bg-indigo-400/70" },
  purple: { text: "text-purple-700 dark:text-purple-300", bar: "bg-purple-400/70" },
  rose: { text: "text-rose-700 dark:text-rose-300", bar: "bg-rose-400/70" },
  emerald: { text: "text-emerald-700 dark:text-emerald-300", bar: "bg-emerald-400/70" },
  blue: { text: "text-blue-700 dark:text-blue-300", bar: "bg-blue-400/70" },
};

function BomCountHeader({ label, tone }: { label: string; tone: keyof typeof BOM_TONE }) {
  return (
    <th className={cn("text-right py-2 px-3 whitespace-nowrap", BOM_TONE[tone].text)}>
      {label}
    </th>
  );
}

function BomCountCell({
  value,
  required,
  tone,
}: {
  value: number;
  required: number;
  tone: keyof typeof BOM_TONE;
}) {
  const pct = required > 0 ? Math.min(100, (value / required) * 100) : 0;
  return (
    <td className="py-2 px-3 align-top">
      <div className={cn("text-right tabular-nums font-medium", BOM_TONE[tone].text)}>{value}</div>
      <div className="h-1 w-full bg-muted rounded-full mt-1 overflow-hidden">
        <div className={cn("h-full", BOM_TONE[tone].bar)} style={{ width: `${pct}%` }} />
      </div>
    </td>
  );
}

// ─────────────────────────────────────────────── Linked Records

const LINKED_TONE: Record<
  string,
  { icon: string; ring: string }
> = {
  blue: { icon: "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30", ring: "ring-blue-200/60 dark:ring-blue-900/40" },
  indigo: { icon: "text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30", ring: "ring-indigo-200/60 dark:ring-indigo-900/40" },
  amber: { icon: "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30", ring: "ring-amber-200/60 dark:ring-amber-900/40" },
  purple: { icon: "text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/30", ring: "ring-purple-200/60 dark:ring-purple-900/40" },
  teal: { icon: "text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-900/30", ring: "ring-teal-200/60 dark:ring-teal-900/40" },
  emerald: { icon: "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30", ring: "ring-emerald-200/60 dark:ring-emerald-900/40" },
  rose: { icon: "text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/30", ring: "ring-rose-200/60 dark:ring-rose-900/40" },
};

function LinkedRecordsCard({
  icon: Icon,
  title,
  rows,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  rows: LinkedRow[];
  tone: keyof typeof LINKED_TONE;
}) {
  const t = LINKED_TONE[tone] ?? LINKED_TONE.blue;
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", t.icon)}>
            <Icon className="w-4 h-4" />
          </div>
          <h3 className="font-semibold text-foreground text-sm">{title}</h3>
        </div>
        <span className="text-xs font-medium text-muted-foreground">{rows.length}</span>
      </div>
      {rows.length === 0 ? (
        <p className="text-xs text-muted-foreground italic">No linked records.</p>
      ) : (
        <ul className="space-y-2">
          {rows.map((row) => (
            <li
              key={row.key}
              className={cn(
                "rounded-md border border-border bg-muted/30 px-3 py-2 ring-1 ring-inset",
                t.ring,
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono font-semibold text-xs text-foreground truncate">
                  {row.primary}
                </span>
                {row.status && (
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                    {row.status}
                  </span>
                )}
              </div>
              {row.meta && (
                <div className="text-xs text-muted-foreground mt-0.5 truncate">{row.meta}</div>
              )}
              {row.at && (
                <div className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1">
                  <History className="w-3 h-3" /> {formatDate(row.at)}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
