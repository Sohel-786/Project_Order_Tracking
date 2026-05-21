"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient, useMutation, keepPreviousData } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import {
  Factory,
  Search,
  Plus,
  Save,
  Loader2,
  ClipboardList,
  Package,
  ArrowRight,
} from "lucide-react";
import api from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { SearchableSelect, SearchableSelectOption } from "@/components/ui/searchable-select";
import { AccessDenied } from "@/components/ui/access-denied";
import { useCurrentUserPermissions } from "@/hooks/use-settings";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { formatDate } from "@/lib/utils";
import { Order, OrderItem, ProductionEntry } from "@/types";

// ─────────────────────────────────────── List row (server projection)

interface ProductionListRow {
  id: number;
  productionNo: string;
  productionDate: string;
  plannedQty: number;
  producedQty: number;
  status: string;
  remarks?: string | null;
  orderId: number;
  orderNumber?: string | null;
  orderItemId: number;
  productId: number;
  productName?: string | null;
  createdByName?: string | null;
  createdAt: string;
  isActive: boolean;
}

interface OrderListRow {
  id: number;
  orderNumber: string;
  orderDate: string;
  customerName?: string | null;
  status: string;
}

// ─────────────────────────────────────── Page

export default function ProductionsPage() {
  const { data: permissions, isLoading: permsLoading } = useCurrentUserPermissions();
  const canView = !!permissions?.viewProduction;
  const canCreate = !!permissions?.createProduction;

  const [search, setSearch] = useState("");
  const [orderFilter, setOrderFilter] = useState<number | "">("");
  const [orderSearch, setOrderSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const debouncedOrderSearch = useDebouncedValue(orderSearch, 300);
  const [openDialog, setOpenDialog] = useState(false);

  // Orders search for the list filter (also reused inside dialog)
  const { data: orderOptionsForFilter } = useQuery({
    queryKey: ["orders", "search", debouncedOrderSearch],
    queryFn: async (): Promise<OrderListRow[]> => {
      const res = await api.get("/orders", {
        params: { activeOnly: true, search: debouncedOrderSearch || undefined, page: 1, pageSize: 25 },
      });
      return res.data.data ?? [];
    },
    enabled: canView,
    staleTime: 30_000,
  });

  const { data: rows, isLoading } = useQuery({
    queryKey: ["productions", { search: debouncedSearch, orderId: orderFilter }],
    queryFn: async (): Promise<ProductionListRow[]> => {
      const res = await api.get("/productions", {
        params: {
          search: debouncedSearch || undefined,
          orderId: orderFilter || undefined,
          page: 1,
          pageSize: 100,
        },
      });
      return res.data.data ?? [];
    },
    placeholderData: keepPreviousData,
    enabled: canView,
  });

  const orderFilterOptions = useMemo<SearchableSelectOption[]>(() => {
    const opts: SearchableSelectOption[] = [{ value: "", label: "All orders" }];
    (orderOptionsForFilter ?? []).forEach((o) => {
      opts.push({ value: o.id, label: `${o.orderNumber} — ${o.customerName ?? ""}` });
    });
    return opts;
  }, [orderOptionsForFilter]);

  if (!permsLoading && !canView) {
    return (
      <AccessDenied actionLabel="Go to Dashboard" actionHref="/dashboard" message="You do not have permission to view Production." />
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
            <Factory className="w-5 h-5 text-primary-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Production Entries</h1>
            <p className="text-sm text-muted-foreground">
              Log produced quantities against an order item and consume ready BOM stock automatically.
            </p>
          </div>
        </div>
        {canCreate && (
          <Button onClick={() => setOpenDialog(true)}>
            <Plus className="w-4 h-4 mr-2" /> New Production Entry
          </Button>
        )}
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row md:items-end gap-3">
          <div className="flex-1 space-y-1">
            <Label>Search</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search production no or order #"
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          <div className="w-full md:w-80 space-y-1">
            <Label>Filter by Order</Label>
            <SearchableSelect
              options={orderFilterOptions}
              value={orderFilter}
              onChange={(v) => setOrderFilter(v === "" ? "" : Number(v))}
              placeholder="All orders"
              searchPlaceholder="Search orders…"
              onSearchChange={(t) => setOrderSearch(t)}
            />
          </div>
        </div>
      </Card>

      {/* List */}
      <Card className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="text-left py-2.5 px-4">Production No</th>
              <th className="text-left py-2.5 px-4">Date</th>
              <th className="text-left py-2.5 px-4">Order #</th>
              <th className="text-left py-2.5 px-4">Product</th>
              <th className="text-right py-2.5 px-4">Planned</th>
              <th className="text-right py-2.5 px-4">Produced</th>
              <th className="text-left py-2.5 px-4">Status</th>
              <th className="text-left py-2.5 px-4">Created By</th>
              <th className="text-right py-2.5 px-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={9} className="text-center py-10 text-muted-foreground">
                  <Loader2 className="w-5 h-5 animate-spin inline mr-2" />
                  Loading…
                </td>
              </tr>
            )}
            {!isLoading && !rows?.length && (
              <tr>
                <td colSpan={9} className="text-center py-10 text-muted-foreground">
                  No production entries yet.
                </td>
              </tr>
            )}
            {rows?.map((r) => (
              <tr key={r.id} className="border-t border-border/60 hover:bg-muted/30 transition-colors">
                <td className="py-2 px-4 font-medium text-foreground">{r.productionNo}</td>
                <td className="py-2 px-4 text-muted-foreground">{formatDate(r.productionDate)}</td>
                <td className="py-2 px-4">{r.orderNumber ?? "—"}</td>
                <td className="py-2 px-4">{r.productName ?? "—"}</td>
                <td className="py-2 px-4 text-right">{r.plannedQty}</td>
                <td className="py-2 px-4 text-right font-semibold">{r.producedQty}</td>
                <td className="py-2 px-4"><ProductionStatusPill status={r.status} /></td>
                <td className="py-2 px-4 text-muted-foreground">{r.createdByName ?? "—"}</td>
                <td className="py-2 px-4 text-right">
                  <ActiveToggle id={r.id} isActive={r.isActive} disabled={!permissions?.editProduction} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <NewProductionDialog
        open={openDialog}
        onClose={() => setOpenDialog(false)}
        canSubmit={canCreate}
      />
    </div>
  );
}

// ─────────────────────────────────────── Active toggle (PATCH /active)

function ActiveToggle({ id, isActive, disabled }: { id: number; isActive: boolean; disabled?: boolean }) {
  const qc = useQueryClient();
  const mut = useMutation({
    mutationFn: async (next: boolean) => {
      await api.patch(`/productions/${id}/active`, { isActive: next });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["productions"] });
      toast.success("Updated");
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || "Failed to update"),
  });
  return (
    <div className="inline-flex items-center gap-2">
      <Switch
        checked={isActive}
        disabled={disabled || mut.isPending}
        onCheckedChange={(c) => mut.mutate(c)}
      />
      <span className="text-xs text-muted-foreground">{isActive ? "Active" : "Inactive"}</span>
    </div>
  );
}

// ─────────────────────────────────────── Status pill

function ProductionStatusPill({ status }: { status: string }) {
  const colorMap: Record<string, string> = {
    Draft:     "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
    Confirmed: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full ${colorMap[status] ?? "bg-gray-100 text-gray-800"}`}>
      {status}
    </span>
  );
}

// ─────────────────────────────────────── Plan row (from /orders/plans/by-order)

interface PlanRow {
  id: number;
  orderItemId: number;
  bomItemId: number;
  itemId: number;
  itemCode?: string | null;
  itemName?: string | null;
  productId?: number | null;
  productName?: string | null;
  requiredQuantity: number;
  unitId?: number | null;
  unitSymbol?: string | null;
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

// ─────────────────────────────────────── New Production Dialog

function NewProductionDialog({
  open,
  onClose,
  canSubmit,
}: {
  open: boolean;
  onClose: () => void;
  canSubmit: boolean;
}) {
  const qc = useQueryClient();
  const [orderId, setOrderId] = useState<number | "">("");
  const [orderItemId, setOrderItemId] = useState<number | "">("");
  const [plannedQty, setPlannedQty] = useState<number>(0);
  const [producedQty, setProducedQty] = useState<number>(0);
  const [productionDate, setProductionDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [remarks, setRemarks] = useState("");
  const [includeAllOrders, setIncludeAllOrders] = useState(false);
  const [orderSearchTerm, setOrderSearchTerm] = useState("");

  // consumption inputs: keyed by orderBomItemPlanId
  const [consumption, setConsumption] = useState<Record<number, number>>({});

  // reset when opened
  useEffect(() => {
    if (open) {
      setOrderId("");
      setOrderItemId("");
      setPlannedQty(0);
      setProducedQty(0);
      setProductionDate(new Date().toISOString().slice(0, 10));
      setRemarks("");
      setOrderSearchTerm("");
      setConsumption({});
      setIncludeAllOrders(false);
    }
  }, [open]);

  // Orders search (procurement-ready by default)
  const { data: orderOptionsRaw } = useQuery({
    queryKey: ["orders", "picker", orderSearchTerm, includeAllOrders],
    queryFn: async (): Promise<OrderListRow[]> => {
      const res = await api.get("/orders", {
        params: {
          activeOnly: true,
          status: includeAllOrders ? undefined : "InProcurement",
          search: orderSearchTerm || undefined,
          page: 1,
          pageSize: 50,
        },
      });
      return res.data.data ?? [];
    },
    enabled: open,
    staleTime: 20_000,
  });

  const orderOptions = useMemo<SearchableSelectOption[]>(
    () =>
      (orderOptionsRaw ?? []).map((o) => ({
        value: o.id,
        label: `${o.orderNumber} — ${o.customerName ?? "—"} (${o.status})`,
      })),
    [orderOptionsRaw],
  );

  // Selected order detail
  const { data: order } = useQuery({
    queryKey: ["order", orderId],
    queryFn: async (): Promise<Order> => {
      const res = await api.get(`/orders/${orderId}`);
      return res.data.data;
    },
    enabled: open && !!orderId,
  });

  const orderItem: OrderItem | undefined = useMemo(
    () => order?.items?.find((i) => i.id === orderItemId),
    [order, orderItemId],
  );

  const remaining = orderItem ? orderItem.quantityOrdered - orderItem.producedQty : 0;

  // BOM plans for selected order
  const { data: plans } = useQuery({
    queryKey: ["order-plans", orderId],
    queryFn: async (): Promise<PlanRow[]> => {
      const res = await api.get(`/orders/plans/by-order/${orderId}`);
      return res.data.data ?? [];
    },
    enabled: open && !!orderId,
  });

  // plans filtered to this OrderItem
  const itemPlans = useMemo(
    () => (plans ?? []).filter((p) => p.orderItemId === orderItemId),
    [plans, orderItemId],
  );

  // Auto-derive consumption from BOM when producedQty or item changes
  useEffect(() => {
    if (!itemPlans.length || !orderItem) {
      setConsumption({});
      return;
    }
    setConsumption((prev) => {
      const next: Record<number, number> = { ...prev };
      itemPlans.forEach((p) => {
        const perProduct = orderItem.quantityOrdered > 0 ? p.requiredQuantity / orderItem.quantityOrdered : 0;
        const wanted = perProduct * (producedQty || 0);
        const available = p.readyQty - p.consumedQty;
        next[p.id] = Math.max(0, Math.min(Number(wanted.toFixed(4)), available));
      });
      return next;
    });
  }, [itemPlans, producedQty, orderItem]);

  // Default plannedQty to remaining if user hasn't edited
  useEffect(() => {
    if (orderItem) setPlannedQty((q) => (q > 0 ? q : remaining));
  }, [orderItem, remaining]);

  const createMut = useMutation({
    mutationFn: async () => {
      const body = {
        orderId,
        orderItemId,
        plannedQty: Number(plannedQty) || 0,
        producedQty: Number(producedQty) || 0,
        productionDate,
        remarks: remarks?.trim() || null,
        consumptions: Object.entries(consumption)
          .map(([k, v]) => ({ orderBomItemPlanId: Number(k), quantityConsumed: Number(v) || 0 }))
          .filter((c) => c.quantityConsumed > 0),
      };
      const res = await api.post("/productions", body);
      return res.data.data as ProductionEntry;
    },
    onSuccess: () => {
      toast.success("Production entry saved");
      qc.invalidateQueries({ queryKey: ["productions"] });
      qc.invalidateQueries({ queryKey: ["order-plans", orderId] });
      qc.invalidateQueries({ queryKey: ["order", orderId] });
      onClose();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || "Failed to save production"),
  });

  const onSubmit = () => {
    if (!orderId) return toast.error("Pick an order.");
    if (!orderItemId) return toast.error("Pick an order item.");
    if (!producedQty || producedQty <= 0) return toast.error("Produced quantity must be > 0.");
    if (producedQty > remaining) return toast.error(`Cannot produce more than remaining (${remaining}).`);
    // validate consumption against availability
    for (const p of itemPlans) {
      const c = Number(consumption[p.id] || 0);
      const avail = p.readyQty - p.consumedQty;
      if (c > avail) {
        return toast.error(`"${p.itemName}" consumption (${c}) exceeds available (${avail}).`);
      }
    }
    createMut.mutate();
  };

  return (
    <Dialog isOpen={open} onClose={onClose} title="New Production Entry" size="3xl">
      <div className="space-y-6">
        {/* Order picker */}
        <Card className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-primary-600" /> Order
            </h3>
            <label className="inline-flex items-center gap-2 text-xs text-muted-foreground">
              <Switch checked={includeAllOrders} onCheckedChange={setIncludeAllOrders} />
              Include all active orders (not just InProcurement)
            </label>
          </div>
          <SearchableSelect
            options={orderOptions}
            value={orderId}
            onChange={(v) => {
              setOrderId(v === "" ? "" : Number(v));
              setOrderItemId("");
              setProducedQty(0);
              setPlannedQty(0);
              setConsumption({});
            }}
            placeholder="Pick an order…"
            searchPlaceholder="Search by order # or customer…"
            onSearchChange={(t) => setOrderSearchTerm(t)}
          />
          {order && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <KeyValue label="Order #" value={order.orderNumber} />
              <KeyValue label="Customer" value={order.customerName ?? "—"} />
              <KeyValue label="Order Date" value={formatDate(order.orderDate)} />
              <KeyValue label="Required Delivery" value={order.requiredDeliveryDate ? formatDate(order.requiredDeliveryDate) : "—"} />
            </div>
          )}
        </Card>

        {/* Order item picker */}
        {order && (
          <Card className="p-4 space-y-4">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Package className="w-4 h-4 text-primary-600" /> Order Item
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="text-left py-1.5 w-10"></th>
                    <th className="text-left py-1.5">Product</th>
                    <th className="text-right py-1.5">Ordered</th>
                    <th className="text-right py-1.5">Produced</th>
                    <th className="text-right py-1.5">Remaining</th>
                    <th className="text-left py-1.5 w-40">Progress</th>
                  </tr>
                </thead>
                <tbody>
                  {order.items.map((i) => {
                    const remn = i.quantityOrdered - i.producedQty;
                    const pct = i.quantityOrdered > 0 ? Math.min(100, (i.producedQty / i.quantityOrdered) * 100) : 0;
                    return (
                      <tr
                        key={i.id}
                        className={`border-t border-border/60 cursor-pointer hover:bg-muted/30 ${orderItemId === i.id ? "bg-primary-50 dark:bg-primary-900/30" : ""}`}
                        onClick={() => {
                          setOrderItemId(i.id);
                          setProducedQty(0);
                          setPlannedQty(0);
                        }}
                      >
                        <td className="py-2 pl-2">
                          <input
                            type="radio"
                            checked={orderItemId === i.id}
                            onChange={() => setOrderItemId(i.id)}
                            aria-label={`Pick ${i.productName}`}
                          />
                        </td>
                        <td className="py-2 font-medium">{i.productName} <span className="text-muted-foreground text-xs">({i.productCode})</span></td>
                        <td className="py-2 text-right">{i.quantityOrdered}</td>
                        <td className="py-2 text-right">{i.producedQty}</td>
                        <td className="py-2 text-right font-semibold">{remn}</td>
                        <td className="py-2">
                          <ProgressBar value={pct} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* Production form */}
        {orderItem && (
          <Card className="p-4 space-y-4">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Factory className="w-4 h-4 text-primary-600" /> Production
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="space-y-1">
                <Label>Production Date</Label>
                <Input type="date" value={productionDate} onChange={(e) => setProductionDate(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Planned Qty</Label>
                <Input type="number" min={0} value={plannedQty} onChange={(e) => setPlannedQty(Number(e.target.value))} />
              </div>
              <div className="space-y-1">
                <Label>Produced Qty <span className="text-rose-500">*</span></Label>
                <Input
                  type="number"
                  min={0}
                  max={remaining}
                  value={producedQty}
                  onChange={(e) => setProducedQty(Math.max(0, Math.min(Number(e.target.value), remaining)))}
                />
                <p className="text-xs text-muted-foreground">Remaining: {remaining}</p>
              </div>
              <div className="space-y-1 col-span-2 md:col-span-1">
                <Label>&nbsp;</Label>
                <div className="h-10 px-3 rounded-md border border-border bg-muted/30 flex items-center text-sm text-muted-foreground">
                  Order&nbsp;<ArrowRight className="w-3 h-3 inline" />&nbsp;Item&nbsp;<ArrowRight className="w-3 h-3 inline" />&nbsp;Production
                </div>
              </div>
              <div className="col-span-2 md:col-span-4 space-y-1">
                <Label>Remarks</Label>
                <Textarea rows={2} value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Optional notes" />
              </div>
            </div>
          </Card>
        )}

        {/* Consumption table */}
        {orderItem && (
          <Card className="p-4 space-y-3">
            <h3 className="text-sm font-semibold">Consumption (from BOM plan)</h3>
            <p className="text-xs text-muted-foreground">
              Quantities are pre-filled from the BOM but you can adjust below. Consumption is bounded by what is currently <em>Ready</em>.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="text-left py-1.5">Item</th>
                    <th className="text-right py-1.5">Required (for produced qty)</th>
                    <th className="text-right py-1.5">Ready</th>
                    <th className="text-right py-1.5">Already Consumed</th>
                    <th className="text-right py-1.5">Available</th>
                    <th className="text-right py-1.5 w-40">Quantity Consumed</th>
                  </tr>
                </thead>
                <tbody>
                  {itemPlans.length === 0 && (
                    <tr>
                      <td colSpan={6} className="text-center py-4 text-muted-foreground text-xs">
                        No BOM plan rows for this order item.
                      </td>
                    </tr>
                  )}
                  {itemPlans.map((p) => {
                    const perProduct = orderItem.quantityOrdered > 0 ? p.requiredQuantity / orderItem.quantityOrdered : 0;
                    const required = perProduct * (producedQty || 0);
                    const available = p.readyQty - p.consumedQty;
                    const current = consumption[p.id] ?? 0;
                    const shortfall = current < required;
                    return (
                      <tr key={p.id} className="border-t border-border/60">
                        <td className="py-2">
                          <div className="font-medium">{p.itemName}</div>
                          <div className="text-xs text-muted-foreground">{p.itemCode}{p.unitSymbol ? ` · ${p.unitSymbol}` : ""}</div>
                        </td>
                        <td className="py-2 text-right">
                          <span className={shortfall ? "text-rose-600 font-medium" : ""}>{required.toFixed(2)}</span>
                        </td>
                        <td className="py-2 text-right">{p.readyQty}</td>
                        <td className="py-2 text-right">{p.consumedQty}</td>
                        <td className="py-2 text-right font-semibold">{available}</td>
                        <td className="py-2 text-right">
                          <Input
                            type="number"
                            min={0}
                            max={available}
                            value={current}
                            className="h-9 text-right"
                            onChange={(e) =>
                              setConsumption((prev) => ({
                                ...prev,
                                [p.id]: Math.max(0, Math.min(Number(e.target.value), available)),
                              }))
                            }
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>

      {/* Footer */}
      <div className="flex justify-end gap-2 pt-4 border-t border-border mt-4">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button onClick={onSubmit} disabled={!canSubmit || createMut.isPending}>
          {createMut.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          Save Production Entry
        </Button>
      </div>
    </Dialog>
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

function ProgressBar({ value, color = "bg-primary-600" }: { value: number; color?: string }) {
  return (
    <div className="w-full h-2 rounded-full bg-primary-100 dark:bg-primary-900/30 overflow-hidden">
      <div className={`h-full ${color} rounded-full`} style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </div>
  );
}
