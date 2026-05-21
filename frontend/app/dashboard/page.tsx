"use client";

import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { useCurrentUserPermissions } from "@/hooks/use-settings";
import { Card } from "@/components/ui/card";
import { LayoutDashboard, FileText, ShoppingCart, ArrowLeftRight, ClipboardCheck, Briefcase, Factory, Truck, Clock, CheckCircle2, AlertTriangle } from "lucide-react";

interface DashboardMetrics {
  orders: { totalOrders: number; pendingOrders: number; completedOrders: number; delayedOrders: number };
  procurement: { pendingPI: number; pendingPO: number; pendingInward: number };
  qc: { qcPending: number; qcFailedToday: number; reworkPending: number };
  jobWork: { machining: number; powderCoating: number; polishing: number; other: number };
  production: { readyForProduction: number; inProductionToday: number; producedToday: number };
  delivery: { readyToDispatch: number; partiallyDelivered: number; fullyDelivered: number };
}

interface RecentOrderRow {
  id: number; orderNumber: string; orderDate: string; requiredDeliveryDate?: string | null;
  status: string; customer?: string | null;
  totalOrderedQty: number; totalProducedQty: number; totalDeliveredQty: number;
}

const cardClass = "p-5 rounded-2xl bg-card border border-border shadow-sm transition-shadow hover:shadow-md";

export default function DashboardPage() {
  const { data: permissions } = useCurrentUserPermissions();
  const { data: metrics, isLoading } = useQuery({
    queryKey: ["dashboard", "metrics"],
    queryFn: async (): Promise<DashboardMetrics> => {
      const res = await api.get("/dashboard/metrics");
      return res.data.data;
    },
    enabled: permissions?.viewDashboard,
  });

  const { data: recentOrders } = useQuery({
    queryKey: ["dashboard", "recent-orders"],
    queryFn: async (): Promise<RecentOrderRow[]> => {
      const res = await api.get("/dashboard/recent-orders", { params: { take: 10 } });
      return res.data.data ?? [];
    },
    enabled: permissions?.viewDashboard,
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
            <LayoutDashboard className="w-5 h-5 text-primary-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
            <p className="text-sm text-muted-foreground">End-to-end snapshot of current orders, procurement, production and delivery.</p>
          </div>
        </div>
      </div>

      {/* Orders */}
      <section>
        <h2 className="text-lg font-semibold text-foreground mb-3">Orders</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Tile icon={ShoppingCart} title="Total Orders" value={metrics?.orders.totalOrders} color="blue" />
          <Tile icon={Clock} title="Pending" value={metrics?.orders.pendingOrders} color="amber" />
          <Tile icon={CheckCircle2} title="Completed" value={metrics?.orders.completedOrders} color="emerald" />
          <Tile icon={AlertTriangle} title="Delayed" value={metrics?.orders.delayedOrders} color="rose" />
        </div>
      </section>

      {/* Procurement */}
      <section>
        <h2 className="text-lg font-semibold text-foreground mb-3">Procurement</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <Tile icon={FileText} title="Pending PI" value={metrics?.procurement.pendingPI} color="amber" />
          <Tile icon={ShoppingCart} title="Pending PO" value={metrics?.procurement.pendingPO} color="orange" />
          <Tile icon={ArrowLeftRight} title="Pending Inward" value={metrics?.procurement.pendingInward} color="indigo" />
        </div>
      </section>

      {/* Quality Control */}
      <section>
        <h2 className="text-lg font-semibold text-foreground mb-3">Quality Check</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <Tile icon={ClipboardCheck} title="QC Pending" value={metrics?.qc.qcPending} color="purple" />
          <Tile icon={AlertTriangle} title="QC Failed Today" value={metrics?.qc.qcFailedToday} color="rose" />
          <Tile icon={ArrowLeftRight} title="Rework Pending" value={metrics?.qc.reworkPending} color="amber" />
        </div>
      </section>

      {/* Job Work */}
      <section>
        <h2 className="text-lg font-semibold text-foreground mb-3">Job Work</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Tile icon={Briefcase} title="Machining" value={metrics?.jobWork.machining} color="teal" />
          <Tile icon={Briefcase} title="Powder Coating" value={metrics?.jobWork.powderCoating} color="violet" />
          <Tile icon={Briefcase} title="Polishing" value={metrics?.jobWork.polishing} color="indigo" />
          <Tile icon={Briefcase} title="Other" value={metrics?.jobWork.other} color="slate" />
        </div>
      </section>

      {/* Production */}
      <section>
        <h2 className="text-lg font-semibold text-foreground mb-3">Production</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <Tile icon={Factory} title="Ready for Production" value={metrics?.production.readyForProduction} color="emerald" />
          <Tile icon={Factory} title="In Production Today" value={metrics?.production.inProductionToday} color="blue" />
          <Tile icon={CheckCircle2} title="Produced Today" value={metrics?.production.producedToday} color="primary" />
        </div>
      </section>

      {/* Delivery */}
      <section>
        <h2 className="text-lg font-semibold text-foreground mb-3">Delivery</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <Tile icon={Truck} title="Ready to Dispatch" value={metrics?.delivery.readyToDispatch} color="orange" />
          <Tile icon={Truck} title="Partially Delivered" value={metrics?.delivery.partiallyDelivered} color="amber" />
          <Tile icon={CheckCircle2} title="Fully Delivered" value={metrics?.delivery.fullyDelivered} color="emerald" />
        </div>
      </section>

      {/* Recent Orders */}
      <section className={cardClass}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">Recent Orders</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="py-2 pr-3">Order #</th>
                <th className="py-2 pr-3">Date</th>
                <th className="py-2 pr-3">Customer</th>
                <th className="py-2 pr-3 text-right">Ordered</th>
                <th className="py-2 pr-3 text-right">Produced</th>
                <th className="py-2 pr-3 text-right">Delivered</th>
                <th className="py-2 pr-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {!recentOrders?.length && (
                <tr><td colSpan={7} className="py-6 text-center text-muted-foreground">{isLoading ? "Loading…" : "No orders yet."}</td></tr>
              )}
              {recentOrders?.map(o => (
                <tr key={o.id} className="border-b border-border/60 hover:bg-muted/30 transition-colors">
                  <td className="py-2 pr-3 font-medium">{o.orderNumber}</td>
                  <td className="py-2 pr-3 text-muted-foreground">{new Date(o.orderDate).toLocaleDateString()}</td>
                  <td className="py-2 pr-3">{o.customer || "—"}</td>
                  <td className="py-2 pr-3 text-right">{o.totalOrderedQty}</td>
                  <td className="py-2 pr-3 text-right">{o.totalProducedQty}</td>
                  <td className="py-2 pr-3 text-right">{o.totalDeliveredQty}</td>
                  <td className="py-2 pr-3"><StatusPill status={o.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Tile({ icon: Icon, title, value, color = "blue" }: { icon: any; title: string; value?: number; color?: string }) {
  const colorClasses: Record<string, string> = {
    blue:     "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400",
    amber:    "bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400",
    emerald:  "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400",
    rose:     "bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400",
    indigo:   "bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400",
    purple:   "bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400",
    orange:   "bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400",
    teal:     "bg-teal-50 dark:bg-teal-900/20 text-teal-600 dark:text-teal-400",
    violet:   "bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400",
    slate:    "bg-slate-50 dark:bg-slate-900/20 text-slate-600 dark:text-slate-400",
    primary:  "bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400",
  };
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold mt-1 text-foreground">{value ?? 0}</p>
        </div>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colorClasses[color] ?? colorClasses.blue}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </Card>
  );
}

function StatusPill({ status }: { status: string }) {
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
