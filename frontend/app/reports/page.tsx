"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import {
  BarChart3,
  Download,
  Loader2,
  FileSpreadsheet,
  Package,
} from "lucide-react";
import api from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { SearchableSelect, SearchableSelectOption } from "@/components/ui/searchable-select";
import { AccessDenied } from "@/components/ui/access-denied";
import { useCurrentUserPermissions } from "@/hooks/use-settings";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { formatDate } from "@/lib/utils";

interface OrderListRow {
  id: number;
  orderNumber: string;
  orderDate: string;
  customerName?: string | null;
  status: string;
}

interface OrderLedgerRow {
  orderNumber: string;
  orderDate: string;
  customerName?: string | null;
  productName?: string | null;
  productCode?: string | null;
  quantityOrdered: number;
  itemName?: string | null;
  itemCode?: string | null;
  requiredQty?: number | null;
  stage: string;
  documentNo: string;
  activityDate: string;
  quantity: number;
  status?: string | null;
  partyName?: string | null;
  remarks?: string | null;
}

export default function ReportsPage() {
  const { data: permissions, isLoading: permsLoading } = useCurrentUserPermissions();
  const canView = !!permissions?.viewReports;

  if (!permsLoading && !canView) {
    return (
      <AccessDenied actionLabel="Go to Dashboard" actionHref="/dashboard" message="You do not have permission to view Reports." />
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
          <BarChart3 className="w-5 h-5 text-primary-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Reports</h1>
          <p className="text-sm text-muted-foreground">Operational reports for orders, procurement, production and delivery.</p>
        </div>
      </div>

      <Tabs defaultValue="order-ledger">
        <TabsList>
          <TabsTrigger value="order-ledger">Order Ledger</TabsTrigger>
        </TabsList>
        <TabsContent value="order-ledger">
          <OrderLedgerTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─────────────────────────────────────── Order Ledger

function OrderLedgerTab() {
  const [orderId, setOrderId] = useState<number | "">("");
  const [orderSearch, setOrderSearch] = useState("");
  const [downloading, setDownloading] = useState(false);
  const debouncedSearch = useDebouncedValue(orderSearch, 300);

  const { data: orderOptionsRaw } = useQuery({
    queryKey: ["orders", "reports-picker", debouncedSearch],
    queryFn: async (): Promise<OrderListRow[]> => {
      const res = await api.get("/orders", {
        params: { activeOnly: true, search: debouncedSearch || undefined, page: 1, pageSize: 50 },
      });
      return res.data.data ?? [];
    },
    staleTime: 30_000,
  });

  const orderOptions = useMemo<SearchableSelectOption[]>(
    () => (orderOptionsRaw ?? []).map((o) => ({ value: o.id, label: `${o.orderNumber} — ${o.customerName ?? "—"} (${o.status})` })),
    [orderOptionsRaw],
  );

  const { data: rows, isFetching } = useQuery({
    queryKey: ["reports", "order-ledger", orderId],
    queryFn: async (): Promise<OrderLedgerRow[]> => {
      const res = await api.get(`/reports/order-ledger/${orderId}`);
      return res.data.data ?? [];
    },
    enabled: !!orderId,
  });

  // Group rows by item name+code (or product) for display; preserve activity-date order within each group.
  const grouped = useMemo(() => {
    const map = new Map<string, { key: string; productName?: string | null; productCode?: string | null; items: OrderLedgerRow[] }>();
    (rows ?? []).forEach((r) => {
      const itemKey = `${r.productCode ?? ""}|${r.productName ?? ""}`;
      if (!map.has(itemKey)) {
        map.set(itemKey, { key: itemKey, productName: r.productName, productCode: r.productCode, items: [] });
      }
      map.get(itemKey)!.items.push(r);
    });
    return Array.from(map.values());
  }, [rows]);

  const onExport = async () => {
    if (!orderId) return toast.error("Pick an order to export.");
    setDownloading(true);
    try {
      const res = await api.get(`/reports/order-ledger/${orderId}/export`, { responseType: "blob" });
      const blob = new Blob([res.data], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `order_ledger_${orderId}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Excel downloaded");
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Export failed");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="mt-4 space-y-4">
      <Card className="p-4">
        <div className="flex flex-col md:flex-row md:items-end gap-3">
          <div className="flex-1 max-w-2xl">
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
          <div className="md:pb-0">
            <Button onClick={onExport} disabled={!orderId || downloading}>
              {downloading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
              Export Excel
            </Button>
          </div>
        </div>
      </Card>

      {!orderId && (
        <Card className="p-10 text-center text-muted-foreground">
          Pick an order above to view its ledger.
        </Card>
      )}

      {isFetching && orderId && (
        <Card className="p-10 text-center text-muted-foreground">
          <Loader2 className="w-5 h-5 inline animate-spin mr-2" />
          Loading ledger…
        </Card>
      )}

      {!isFetching && orderId && (!rows || rows.length === 0) && (
        <Card className="p-10 text-center text-muted-foreground">
          No ledger activity yet for this order.
        </Card>
      )}

      {!isFetching && rows && rows.length > 0 && (
        <div className="space-y-5">
          {grouped.map((g) => (
            <Card key={g.key} className="overflow-hidden">
              <div className="px-4 py-3 border-b border-border/60 bg-muted/30 flex items-center gap-2">
                <Package className="w-4 h-4 text-primary-600" />
                <div className="text-sm font-semibold text-foreground">{g.productName ?? "—"}</div>
                {g.productCode && <span className="text-xs text-muted-foreground">({g.productCode})</span>}
                <span className="ml-auto inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <FileSpreadsheet className="w-3 h-3" />
                  {g.items.length} row{g.items.length === 1 ? "" : "s"}
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="text-left py-2 px-3">Activity Date</th>
                      <th className="text-left py-2 px-3">Stage</th>
                      <th className="text-left py-2 px-3">Document No</th>
                      <th className="text-left py-2 px-3">Item</th>
                      <th className="text-right py-2 px-3">Required</th>
                      <th className="text-right py-2 px-3">Quantity</th>
                      <th className="text-left py-2 px-3">Party</th>
                      <th className="text-left py-2 px-3">Status</th>
                      <th className="text-left py-2 px-3">Remarks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {g.items.map((r, idx) => (
                      <tr key={idx} className="border-t border-border/60 hover:bg-muted/30">
                        <td className="py-2 px-3 text-muted-foreground">{formatDate(r.activityDate)}</td>
                        <td className="py-2 px-3"><StagePill stage={r.stage} /></td>
                        <td className="py-2 px-3 font-medium text-foreground">{r.documentNo || "—"}</td>
                        <td className="py-2 px-3">
                          {r.itemName ? (
                            <>
                              <div className="text-sm">{r.itemName}</div>
                              <div className="text-xs text-muted-foreground">{r.itemCode}</div>
                            </>
                          ) : "—"}
                        </td>
                        <td className="py-2 px-3 text-right">{r.requiredQty != null ? Number(r.requiredQty).toFixed(2) : "—"}</td>
                        <td className="py-2 px-3 text-right font-semibold">{Number(r.quantity).toFixed(2)}</td>
                        <td className="py-2 px-3">{r.partyName ?? "—"}</td>
                        <td className="py-2 px-3 text-muted-foreground">{r.status ?? "—"}</td>
                        <td className="py-2 px-3 text-muted-foreground max-w-[18rem] truncate">{r.remarks ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function StagePill({ stage }: { stage: string }) {
  const colorMap: Array<[RegExp, string]> = [
    [/^Purchase Indent/i, "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"],
    [/^Purchase Order/i,  "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300"],
    [/^Job Work/i,        "bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300"],
    [/^Inward/i,          "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300"],
    [/^QC/i,              "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300"],
    [/^Production/i,      "bg-primary-100 text-primary-800 dark:bg-primary-900/30 dark:text-primary-300"],
    [/^Delivery/i,        "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300"],
  ];
  const cls = colorMap.find(([rx]) => rx.test(stage))?.[1] ?? "bg-gray-100 text-gray-800";
  return <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full ${cls}`}>{stage}</span>;
}
