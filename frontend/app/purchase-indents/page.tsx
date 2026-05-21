"use client";

import { useMemo, useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import {
  FileText, Plus, Search, Check, X, Undo2, Eye, Power, ShoppingCart, Briefcase, Trash2, ChevronRight, ChevronDown,
} from "lucide-react";
import api from "@/lib/api";
import { useCurrentUserPermissions } from "@/hooks/use-settings";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Dialog } from "@/components/ui/dialog";
import { TablePagination } from "@/components/ui/table-pagination";
import { DEFAULT_PAGE_SIZE } from "@/lib/pagination";
import { formatDate } from "@/lib/utils";
import {
  PurchaseIndentFor, PurchaseIndentType, PurchaseIndentPriority, PurchaseIndentStatus,
} from "@/types";

// ─────────────────────────────────────── Types

interface PIRow {
  id: number; piNo: string; indentFor: PurchaseIndentFor; type: PurchaseIndentType;
  priority: PurchaseIndentPriority; status: PurchaseIndentStatus;
  remarks?: string | null; reqDateOfDelivery?: string | null; mtcReq: boolean;
  createdAt: string; approvedAt?: string | null; isActive: boolean;
  createdByName?: string | null; approvedByName?: string | null;
  itemCount: number; totalQty: number;
}

interface OrderRow {
  id: number; orderNumber: string; orderDate: string; customerName?: string | null; status: string;
}

interface OrderPlan {
  id: number; orderItemId: number; itemId: number;
  itemCode?: string | null; itemName?: string | null;
  productId?: number | null; productName?: string | null;
  requiredQuantity: number; unitId?: number | null; unitSymbol?: string | null;
  indentedQty: number; orderedQty: number;
  pendingIndent: number;
}

interface ItemRowDraft {
  key: string;
  itemId: number;
  itemCode?: string;
  itemName?: string;
  orderItemId?: number | null;
  orderBomItemPlanId?: number | null;
  orderNumber?: string | null;
  productName?: string | null;
  quantity: number;
  unitId?: number | null;
  unitSymbol?: string | null;
  remarks?: string;
}

interface ActiveItem {
  id: number; itemCode: string; itemName: string; unitId?: number | null; unitSymbol?: string | null;
}

// ─────────────────────────────────────── Page

export default function PurchaseIndentsPage() {
  const { data: permissions } = useCurrentUserPermissions();
  const qc = useQueryClient();

  const [search, setSearch] = useState("");
  const debounced = useDebouncedValue(search, 300);
  const [status, setStatus] = useState<"" | PurchaseIndentStatus>("");
  const [indentFor, setIndentFor] = useState<"" | PurchaseIndentFor>("");
  const [activeOnly, setActiveOnly] = useState(true);
  const [page, setPage] = useState(1);
  const pageSize = DEFAULT_PAGE_SIZE;

  const [createOpen, setCreateOpen] = useState(false);
  const [viewId, setViewId] = useState<number | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["purchase-indents", { debounced, status, indentFor, activeOnly, page, pageSize }],
    queryFn: async (): Promise<{ data: PIRow[]; totalCount: number }> => {
      const params: Record<string, any> = { page, pageSize };
      if (debounced) params.search = debounced;
      if (status)    params.status = status;
      if (indentFor) params.indentFor = indentFor;
      if (activeOnly) params.activeOnly = true;
      const r = await api.get("/purchase-indents", { params });
      return { data: r.data.data ?? [], totalCount: r.data.totalCount ?? 0 };
    },
    enabled: !!permissions?.viewPI,
  });

  const approve = useMutation({
    mutationFn: async (id: number) => (await api.post(`/purchase-indents/${id}/approve`)).data,
    onSuccess: () => { toast.success("PI approved"); qc.invalidateQueries({ queryKey: ["purchase-indents"] }); },
    onError: (e: any) => toast.error(e?.response?.data?.message || "Approve failed"),
  });

  const reject = useMutation({
    mutationFn: async ({ id, reason }: { id: number; reason: string }) =>
      (await api.post(`/purchase-indents/${id}/reject`, { reason })).data,
    onSuccess: () => { toast.success("PI rejected"); qc.invalidateQueries({ queryKey: ["purchase-indents"] }); },
    onError: (e: any) => toast.error(e?.response?.data?.message || "Reject failed"),
  });

  const revert = useMutation({
    mutationFn: async (id: number) => (await api.post(`/purchase-indents/${id}/revert-to-pending`)).data,
    onSuccess: () => { toast.success("PI reverted to pending"); qc.invalidateQueries({ queryKey: ["purchase-indents"] }); },
    onError: (e: any) => toast.error(e?.response?.data?.message || "Revert failed"),
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, isActive }: { id: number; isActive: boolean }) =>
      (await api.patch(`/purchase-indents/${id}/active`, { isActive })).data,
    onSuccess: () => { toast.success("Updated"); qc.invalidateQueries({ queryKey: ["purchase-indents"] }); },
    onError: (e: any) => toast.error(e?.response?.data?.message || "Update failed"),
  });

  if (!permissions) {
    return <div className="p-6 text-muted-foreground">Loading…</div>;
  }
  if (!permissions.viewPI) {
    return <div className="p-6 text-rose-600">You do not have permission to view Purchase Indents.</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
            <FileText className="w-5 h-5 text-primary-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Purchase Indents</h1>
            <p className="text-sm text-muted-foreground">Indent material requirements against orders, then route to PO or Job Work.</p>
          </div>
        </div>
        {permissions.createPI && (
          <Button onClick={() => setCreateOpen(true)}><Plus className="w-4 h-4 mr-1" />New Indent</Button>
        )}
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[240px] space-y-1.5">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Search</Label>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
              <Input className="pl-9" placeholder="Search PI number…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Status</Label>
            <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={status} onChange={(e) => { setStatus(e.target.value as any); setPage(1); }}>
              <option value="">All</option>
              <option value={PurchaseIndentStatus.Pending}>Pending</option>
              <option value={PurchaseIndentStatus.Approved}>Approved</option>
              <option value={PurchaseIndentStatus.Rejected}>Rejected</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Indent For</Label>
            <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={indentFor} onChange={(e) => { setIndentFor(e.target.value as any); setPage(1); }}>
              <option value="">All</option>
              <option value={PurchaseIndentFor.PurchaseOrder}>Purchase Order</option>
              <option value={PurchaseIndentFor.JobWork}>Job Work</option>
            </select>
          </div>
          <div className="flex items-center gap-2 h-10 px-1">
            <Switch checked={activeOnly} onCheckedChange={(v) => { setActiveOnly(v); setPage(1); }} />
            <Label className="text-sm">Active only</Label>
          </div>
        </div>
      </Card>

      {/* Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/30 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="text-left py-2.5 px-3">PI No</th>
                <th className="text-left py-2.5 px-3">Date</th>
                <th className="text-left py-2.5 px-3">Indent For</th>
                <th className="text-left py-2.5 px-3">Priority</th>
                <th className="text-right py-2.5 px-3">Items</th>
                <th className="text-right py-2.5 px-3">Total Qty</th>
                <th className="text-left py-2.5 px-3">Status</th>
                <th className="text-left py-2.5 px-3">Created By</th>
                <th className="text-left py-2.5 px-3">Approved By</th>
                <th className="text-right py-2.5 px-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr><td colSpan={10} className="py-6 text-center text-muted-foreground">Loading…</td></tr>
              )}
              {!isLoading && !data?.data.length && (
                <tr><td colSpan={10} className="py-8 text-center text-muted-foreground">No purchase indents yet.</td></tr>
              )}
              {data?.data.map(pi => (
                <tr key={pi.id} className="border-t border-border/60 hover:bg-muted/30 transition-colors">
                  <td className="py-2.5 px-3 font-medium text-foreground">{pi.piNo}</td>
                  <td className="py-2.5 px-3 text-muted-foreground">{formatDate(pi.createdAt)}</td>
                  <td className="py-2.5 px-3"><IndentForBadge value={pi.indentFor} /></td>
                  <td className="py-2.5 px-3"><PriorityBadge value={pi.priority} /></td>
                  <td className="py-2.5 px-3 text-right">{pi.itemCount}</td>
                  <td className="py-2.5 px-3 text-right tabular-nums">{Number(pi.totalQty).toFixed(3)}</td>
                  <td className="py-2.5 px-3"><PIStatusPill value={pi.status} /></td>
                  <td className="py-2.5 px-3 text-muted-foreground">{pi.createdByName || "—"}</td>
                  <td className="py-2.5 px-3 text-muted-foreground">{pi.approvedByName || "—"}</td>
                  <td className="py-2.5 px-3 text-right">
                    <div className="inline-flex items-center gap-1.5">
                      <Button size="sm" variant="outline" title="View" onClick={() => setViewId(pi.id)}><Eye className="w-4 h-4" /></Button>
                      {permissions.approvePI && pi.status === PurchaseIndentStatus.Pending && (
                        <>
                          <Button size="sm" variant="outline" className="text-emerald-600" title="Approve" onClick={() => approve.mutate(pi.id)}>
                            <Check className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="outline" className="text-rose-600" title="Reject"
                            onClick={() => {
                              const reason = window.prompt(`Reject PI ${pi.piNo}? Enter reason:`);
                              if (reason !== null) reject.mutate({ id: pi.id, reason });
                            }}>
                            <X className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                      {permissions.approvePI && pi.status === PurchaseIndentStatus.Approved && (
                        <Button size="sm" variant="outline" title="Revert to Pending"
                          onClick={() => {
                            if (window.confirm(`Revert PI ${pi.piNo} back to pending?`)) revert.mutate(pi.id);
                          }}>
                          <Undo2 className="w-4 h-4" />
                        </Button>
                      )}
                      {permissions.editPI && (
                        <Button size="sm" variant="outline" title={pi.isActive ? "Deactivate" : "Activate"}
                          onClick={() => {
                            if (pi.isActive && !window.confirm(`Deactivate PI ${pi.piNo}?`)) return;
                            toggleActive.mutate({ id: pi.id, isActive: !pi.isActive });
                          }}>
                          <Power className={`w-4 h-4 ${pi.isActive ? "text-emerald-500" : "text-muted-foreground"}`} />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <TablePagination page={page} pageSize={pageSize} totalCount={data?.totalCount ?? 0} onPageChange={setPage} />
      </Card>

      {createOpen && <CreatePIDialog open={createOpen} onClose={() => setCreateOpen(false)} />}
      {viewId !== null && <ViewPIDialog id={viewId} onClose={() => setViewId(null)} />}
    </div>
  );
}

// ─────────────────────────────────────── Create dialog

function CreatePIDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient();

  const [indentFor, setIndentFor] = useState<PurchaseIndentFor>(PurchaseIndentFor.PurchaseOrder);
  const [type, setType] = useState<PurchaseIndentType>(PurchaseIndentType.New);
  const [priority, setPriority] = useState<PurchaseIndentPriority>(PurchaseIndentPriority.Normal);
  const [reqDate, setReqDate] = useState<string>("");
  const [mtcReq, setMtcReq] = useState(false);
  const [remarks, setRemarks] = useState("");
  const [items, setItems] = useState<ItemRowDraft[]>([]);

  const { data: nextCode } = useQuery({
    queryKey: ["purchase-indents", "next-code"],
    queryFn: async (): Promise<string> => {
      const r = await api.get("/purchase-indents/next-code");
      return r.data.data;
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      const body = {
        indentFor, type, priority,
        reqDateOfDelivery: reqDate || null,
        mtcReq, remarks: remarks || null,
        items: items.map(i => ({
          itemId: i.itemId,
          orderItemId: i.orderItemId ?? null,
          orderBomItemPlanId: i.orderBomItemPlanId ?? null,
          quantity: Number(i.quantity),
          unitId: i.unitId ?? null,
          remarks: i.remarks ?? null,
        })),
      };
      const r = await api.post("/purchase-indents", body);
      return r.data;
    },
    onSuccess: () => {
      toast.success("Purchase indent created");
      qc.invalidateQueries({ queryKey: ["purchase-indents"] });
      onClose();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || "Failed to create PI"),
  });

  const addPlanRow = (plan: OrderPlan, orderNumber: string | null) => {
    const k = `plan-${plan.id}`;
    if (items.some(i => i.key === k)) {
      toast.error("Item already added");
      return;
    }
    setItems(prev => [...prev, {
      key: k,
      itemId: plan.itemId,
      itemCode: plan.itemCode ?? undefined,
      itemName: plan.itemName ?? undefined,
      orderItemId: plan.orderItemId,
      orderBomItemPlanId: plan.id,
      orderNumber,
      productName: plan.productName,
      quantity: Number(plan.pendingIndent) > 0 ? Number(plan.pendingIndent) : 0,
      unitId: plan.unitId,
      unitSymbol: plan.unitSymbol,
    }]);
  };

  const addStandaloneRow = (item: ActiveItem) => {
    const k = `std-${item.id}-${Date.now()}`;
    setItems(prev => [...prev, {
      key: k,
      itemId: item.id,
      itemCode: item.itemCode,
      itemName: item.itemName,
      orderItemId: null,
      orderBomItemPlanId: null,
      orderNumber: null,
      productName: null,
      quantity: 1,
      unitId: item.unitId ?? null,
      unitSymbol: item.unitSymbol ?? null,
    }]);
  };

  const updateRow = (key: string, patch: Partial<ItemRowDraft>) => {
    setItems(prev => prev.map(r => r.key === key ? { ...r, ...patch } : r));
  };

  const removeRow = (key: string) => setItems(prev => prev.filter(r => r.key !== key));

  const submit = () => {
    if (items.length === 0) { toast.error("Add at least one item"); return; }
    if (items.some(i => !i.quantity || i.quantity <= 0)) { toast.error("All quantities must be > 0"); return; }
    create.mutate();
  };

  return (
    <Dialog isOpen={open} onClose={onClose} title={`New Purchase Indent${nextCode ? `  ·  ${nextCode}` : ""}`} size="full">
      <div className="grid grid-cols-1 lg:grid-cols-6 gap-4 h-full">
        {/* Left: Order/Item picker */}
        <div className="lg:col-span-2 flex flex-col min-h-0">
          <OrderItemPicker onPickPlan={addPlanRow} onPickStandalone={addStandaloneRow} />
        </div>

        {/* Right: header + items */}
        <div className="lg:col-span-4 flex flex-col min-h-0">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
            <div className="space-y-1.5">
              <Label>Indent For *</Label>
              <select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={indentFor} onChange={(e) => setIndentFor(e.target.value as PurchaseIndentFor)}>
                <option value={PurchaseIndentFor.PurchaseOrder}>Purchase Order</option>
                <option value={PurchaseIndentFor.JobWork}>Job Work</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Type</Label>
              <select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={type} onChange={(e) => setType(e.target.value as PurchaseIndentType)}>
                <option value={PurchaseIndentType.New}>New</option>
                <option value={PurchaseIndentType.Repair}>Repair</option>
                <option value={PurchaseIndentType.Correction}>Correction</option>
                <option value={PurchaseIndentType.Modification}>Modification</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Priority</Label>
              <select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={priority} onChange={(e) => setPriority(e.target.value as PurchaseIndentPriority)}>
                <option value={PurchaseIndentPriority.Normal}>Normal</option>
                <option value={PurchaseIndentPriority.Urgent}>Urgent</option>
                <option value={PurchaseIndentPriority.Critical}>Critical</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Required Delivery Date</Label>
              <Input type="date" value={reqDate} onChange={(e) => setReqDate(e.target.value)} />
            </div>
            <div className="flex items-center gap-2 mt-6 col-span-2 md:col-span-1">
              <Switch checked={mtcReq} onCheckedChange={setMtcReq} />
              <Label>MTC required</Label>
            </div>
            <div className="space-y-1.5 col-span-2 md:col-span-3">
              <Label>Remarks</Label>
              <Textarea rows={2} value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Optional remarks…" />
            </div>
          </div>

          <Card className="flex-1 min-h-0 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/20">
              <h4 className="font-semibold text-sm">Items ({items.length})</h4>
              <span className="text-xs text-muted-foreground">Total Qty: {items.reduce((s, i) => s + Number(i.quantity || 0), 0).toFixed(3)}</span>
            </div>
            <div className="flex-1 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/20 text-xs uppercase tracking-wider text-muted-foreground sticky top-0">
                  <tr>
                    <th className="text-left py-2 px-3">Item</th>
                    <th className="text-left py-2 px-3">Order / Product</th>
                    <th className="text-right py-2 px-3 w-32">Quantity *</th>
                    <th className="text-left py-2 px-3 w-20">Unit</th>
                    <th className="text-left py-2 px-3">Remarks</th>
                    <th className="text-right py-2 px-3 w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {items.length === 0 && (
                    <tr><td colSpan={6} className="py-12 text-center text-muted-foreground text-sm">Pick items from the left panel to add them here.</td></tr>
                  )}
                  {items.map(it => (
                    <tr key={it.key} className="border-t border-border/60">
                      <td className="py-2 px-3">
                        <div className="font-medium">{it.itemName}</div>
                        <div className="text-xs text-muted-foreground">{it.itemCode}</div>
                      </td>
                      <td className="py-2 px-3 text-xs">
                        {it.orderNumber ? (
                          <>
                            <div className="font-medium">{it.orderNumber}</div>
                            <div className="text-muted-foreground">{it.productName}</div>
                          </>
                        ) : (
                          <span className="text-muted-foreground italic">Standalone</span>
                        )}
                      </td>
                      <td className="py-2 px-3">
                        <Input type="number" step="0.001" min="0" className="h-8 text-right" value={it.quantity}
                          onChange={(e) => updateRow(it.key, { quantity: Number(e.target.value) })} />
                      </td>
                      <td className="py-2 px-3 text-xs text-muted-foreground">{it.unitSymbol || "—"}</td>
                      <td className="py-2 px-3">
                        <Input className="h-8" value={it.remarks ?? ""} onChange={(e) => updateRow(it.key, { remarks: e.target.value })} placeholder="—" />
                      </td>
                      <td className="py-2 px-3 text-right">
                        <Button size="sm" variant="ghost" className="text-rose-500" onClick={() => removeRow(it.key)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-4 border-t border-border mt-4">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button onClick={submit} loading={create.isPending}>
          <Plus className="w-4 h-4 mr-1" />Create Purchase Indent
        </Button>
      </div>
    </Dialog>
  );
}

// ─────────────────────────────────────── Order tree picker (left of dialog)

function OrderItemPicker({ onPickPlan, onPickStandalone }: { onPickPlan: (plan: OrderPlan, orderNumber: string | null) => void; onPickStandalone: (item: ActiveItem) => void }) {
  const [tab, setTab] = useState<"order" | "standalone">("order");
  return (
    <Card className="flex-1 min-h-0 flex flex-col overflow-hidden">
      <div className="flex border-b border-border bg-muted/20">
        <button onClick={() => setTab("order")} className={`flex-1 py-2 text-xs font-semibold uppercase tracking-wider ${tab === "order" ? "text-primary-600 border-b-2 border-primary-500" : "text-muted-foreground"}`}>From Orders</button>
        <button onClick={() => setTab("standalone")} className={`flex-1 py-2 text-xs font-semibold uppercase tracking-wider ${tab === "standalone" ? "text-primary-600 border-b-2 border-primary-500" : "text-muted-foreground"}`}>Standalone</button>
      </div>
      {tab === "order" ? <OrdersTree onPickPlan={onPickPlan} /> : <StandaloneItemsPicker onPick={onPickStandalone} />}
    </Card>
  );
}

function OrdersTree({ onPickPlan }: { onPickPlan: (p: OrderPlan, orderNumber: string | null) => void }) {
  const [s, setS] = useState("");
  const debounced = useDebouncedValue(s, 250);
  const [expanded, setExpanded] = useState<number | null>(null);
  const { data: orders } = useQuery({
    queryKey: ["orders-active", { debounced }],
    queryFn: async (): Promise<OrderRow[]> => {
      const params: any = { activeOnly: true, pageSize: 50 };
      if (debounced) params.search = debounced;
      const r = await api.get("/orders", { params });
      return r.data.data ?? [];
    },
  });

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <div className="p-3 border-b border-border">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search orders…" value={s} onChange={(e) => setS(e.target.value)} />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {!orders?.length && <p className="p-4 text-center text-muted-foreground text-sm">No orders found.</p>}
        {orders?.map(o => (
          <OrderNode key={o.id} order={o} expanded={expanded === o.id} onToggle={() => setExpanded(expanded === o.id ? null : o.id)} onPickPlan={onPickPlan} />
        ))}
      </div>
    </div>
  );
}

function OrderNode({ order, expanded, onToggle, onPickPlan }: { order: OrderRow; expanded: boolean; onToggle: () => void; onPickPlan: (p: OrderPlan, orderNumber: string | null) => void }) {
  const { data: plans, isLoading } = useQuery({
    queryKey: ["order-plans", order.id],
    queryFn: async (): Promise<OrderPlan[]> => {
      const r = await api.get(`/orders/plans/by-order/${order.id}`);
      return r.data.data ?? [];
    },
    enabled: expanded,
  });
  return (
    <div className="border-b border-border/60">
      <button onClick={onToggle} className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-muted/40 text-left">
        {expanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium truncate">{order.orderNumber}</div>
          <div className="text-xs text-muted-foreground truncate">{order.customerName || "—"} · {formatDate(order.orderDate)}</div>
        </div>
      </button>
      {expanded && (
        <div className="bg-muted/10 px-2 pb-2">
          {isLoading && <p className="text-xs p-2 text-muted-foreground">Loading plans…</p>}
          {plans?.length === 0 && <p className="text-xs p-2 text-muted-foreground">No plan items in this order.</p>}
          {plans?.map(p => (
            <button key={p.id} onClick={() => onPickPlan(p, order.orderNumber)}
              className="w-full text-left text-xs px-3 py-2 my-0.5 rounded-md bg-background border border-border hover:bg-primary-50 dark:hover:bg-primary-900/30 hover:border-primary-300 transition-colors">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">{p.itemCode}</span>
                <span className="text-[10px] text-muted-foreground uppercase">Pending {Number(p.pendingIndent).toFixed(3)}</span>
              </div>
              <div className="text-muted-foreground truncate">{p.itemName}</div>
              <div className="text-[10px] mt-1 flex gap-2 flex-wrap text-muted-foreground">
                <span>Req {Number(p.requiredQuantity).toFixed(3)}</span>
                <span>· Indented {Number(p.indentedQty).toFixed(3)}</span>
                <span>· Ordered {Number(p.orderedQty).toFixed(3)}</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function StandaloneItemsPicker({ onPick }: { onPick: (item: ActiveItem) => void }) {
  const [s, setS] = useState("");
  const debounced = useDebouncedValue(s, 250);
  const { data } = useQuery({
    queryKey: ["items-active"],
    queryFn: async (): Promise<ActiveItem[]> => {
      const r = await api.get("/items/active");
      return r.data.data ?? [];
    },
  });
  const filtered = useMemo(() => {
    if (!data) return [];
    if (!debounced) return data.slice(0, 100);
    const q = debounced.toLowerCase();
    return data.filter(i => i.itemCode.toLowerCase().includes(q) || i.itemName.toLowerCase().includes(q)).slice(0, 100);
  }, [data, debounced]);
  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <div className="p-3 border-b border-border">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search items…" value={s} onChange={(e) => setS(e.target.value)} />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        {filtered.length === 0 && <p className="text-xs p-4 text-center text-muted-foreground">No items found.</p>}
        {filtered.map(i => (
          <button key={i.id} onClick={() => onPick(i)}
            className="w-full text-left text-xs px-3 py-2 my-0.5 rounded-md bg-background border border-border hover:bg-primary-50 dark:hover:bg-primary-900/30 hover:border-primary-300 transition-colors">
            <div className="font-medium">{i.itemCode}</div>
            <div className="text-muted-foreground truncate">{i.itemName}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────── View dialog (read-only details)

function ViewPIDialog({ id, onClose }: { id: number; onClose: () => void }) {
  const { data, isLoading } = useQuery({
    queryKey: ["purchase-indent", id],
    queryFn: async (): Promise<any> => (await api.get(`/purchase-indents/${id}`)).data.data,
  });

  return (
    <Dialog isOpen={true} onClose={onClose} title={data?.piNo ? `PI · ${data.piNo}` : "Purchase Indent"} size="xl">
      {isLoading || !data ? (
        <p className="py-10 text-center text-muted-foreground">Loading…</p>
      ) : (
        <div className="space-y-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <InfoCell label="PI No" value={data.piNo} />
            <InfoCell label="Indent For" value={data.indentFor} />
            <InfoCell label="Type" value={data.type} />
            <InfoCell label="Priority" value={data.priority} />
            <InfoCell label="Status" value={<PIStatusPill value={data.status} />} />
            <InfoCell label="MTC Required" value={data.mtcReq ? "Yes" : "No"} />
            <InfoCell label="Required Delivery" value={formatDate(data.reqDateOfDelivery)} />
            <InfoCell label="Created" value={`${formatDate(data.createdAt)} · ${data.createdByName || "—"}`} />
            <InfoCell label="Approved" value={data.approvedAt ? `${formatDate(data.approvedAt)} · ${data.approvedByName || "—"}` : "—"} />
            <InfoCell label="Document No" value={data.documentNo || "—"} />
            <InfoCell label="Revision" value={data.revisionNo ? `${data.revisionNo} (${formatDate(data.revisionDate)})` : "—"} />
            <InfoCell label="Active" value={data.isActive ? "Yes" : "No"} />
          </div>
          {data.remarks && <div className="text-sm"><span className="text-muted-foreground">Remarks: </span>{data.remarks}</div>}
          <Card className="overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/30 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="text-left py-2 px-3">Item</th>
                  <th className="text-left py-2 px-3">Order / Product</th>
                  <th className="text-right py-2 px-3">Qty</th>
                  <th className="text-left py-2 px-3">Unit</th>
                  <th className="text-left py-2 px-3">Remarks</th>
                </tr>
              </thead>
              <tbody>
                {(data.items ?? []).map((it: any) => (
                  <tr key={it.id} className="border-t border-border/60">
                    <td className="py-2 px-3">
                      <div className="font-medium">{it.itemNameSnapshot || it.itemName}</div>
                      <div className="text-xs text-muted-foreground">{it.itemCodeSnapshot || it.itemCode}</div>
                    </td>
                    <td className="py-2 px-3 text-xs">
                      {it.orderNumberSnapshot ? (
                        <>
                          <div className="font-medium">{it.orderNumberSnapshot}</div>
                          <div className="text-muted-foreground">{it.productNameSnapshot}</div>
                        </>
                      ) : (<span className="text-muted-foreground italic">Standalone</span>)}
                    </td>
                    <td className="py-2 px-3 text-right tabular-nums">{Number(it.quantity).toFixed(3)}</td>
                    <td className="py-2 px-3 text-muted-foreground text-xs">{it.unitSymbol || "—"}</td>
                    <td className="py-2 px-3 text-muted-foreground text-xs">{it.remarks || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>
      )}
      <div className="flex justify-end pt-4 border-t border-border mt-4">
        <Button variant="outline" onClick={onClose}>Close</Button>
      </div>
    </Dialog>
  );
}

function InfoCell({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="font-medium mt-0.5">{value}</div>
    </div>
  );
}

// ─────────────────────────────────────── Pills

function PIStatusPill({ value }: { value: PurchaseIndentStatus }) {
  const map: Record<string, string> = {
    Pending:  "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
    Approved: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
    Rejected: "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300",
  };
  return <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full ${map[value] ?? "bg-gray-100 text-gray-800"}`}>{value}</span>;
}

function IndentForBadge({ value }: { value: PurchaseIndentFor }) {
  const isPo = value === PurchaseIndentFor.PurchaseOrder;
  const Icon = isPo ? ShoppingCart : Briefcase;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full ${isPo ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300" : "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300"}`}>
      <Icon className="w-3 h-3" />{isPo ? "Purchase Order" : "Job Work"}
    </span>
  );
}

function PriorityBadge({ value }: { value: PurchaseIndentPriority }) {
  const map: Record<string, string> = {
    Normal:   "bg-slate-100 text-slate-700 dark:bg-slate-700/40 dark:text-slate-200",
    Urgent:   "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
    Critical: "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300",
  };
  return <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full ${map[value] ?? "bg-gray-100 text-gray-800"}`}>{value}</span>;
}
