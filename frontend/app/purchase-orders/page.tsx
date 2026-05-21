"use client";

import { useMemo, useState, useRef } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import {
  ShoppingCart, Plus, Search, Check, X, Eye, Power, Trash2, Upload, FileText, Paperclip,
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
import { formatDate, formatRate } from "@/lib/utils";
import { PoStatus, GstType, Party, PartyType } from "@/types";

// ─────────────────────────────────────── Types

interface PORow {
  id: number; poNo: string; vendorId: number; vendorName?: string | null;
  deliveryDate?: string | null; quotationNo?: string | null;
  gstType?: GstType | null; gstPercent?: number | null; purchaseType?: string | null;
  status: PoStatus; remarks?: string | null;
  createdAt: string; approvedAt?: string | null; isActive: boolean;
  createdByName?: string | null; approvedByName?: string | null;
  itemCount: number; totalQty: number; totalValue: number;
}

interface ApprovedPIItem {
  id: number; piId: number; piNo: string; piPriority: string;
  itemId: number; itemName: string; itemCode: string;
  quantity: number;
  orderId?: number | null; orderNumber?: string | null;
  alreadyOrderedQty: number;
  jobWorkSentQty: number;
}

interface POItemDraft {
  key: string;
  purchaseIndentItemId: number;
  piNo: string;
  itemCode: string;
  itemName: string;
  orderNumber?: string | null;
  pendingQty: number;
  quantity: number;
  rate: number;
}

// ─────────────────────────────────────── Page

export default function PurchaseOrdersPage() {
  const { data: permissions } = useCurrentUserPermissions();
  const qc = useQueryClient();

  const [search, setSearch] = useState("");
  const debounced = useDebouncedValue(search, 300);
  const [status, setStatus] = useState<"" | PoStatus>("");
  const [activeOnly, setActiveOnly] = useState(true);
  const [page, setPage] = useState(1);
  const pageSize = DEFAULT_PAGE_SIZE;

  const [createOpen, setCreateOpen] = useState(false);
  const [viewId, setViewId] = useState<number | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["purchase-orders", { debounced, status, activeOnly, page, pageSize }],
    queryFn: async (): Promise<{ data: PORow[]; totalCount: number }> => {
      const params: Record<string, any> = { page, pageSize };
      if (debounced) params.search = debounced;
      if (status)    params.status = status;
      if (activeOnly) params.activeOnly = true;
      const r = await api.get("/purchase-orders", { params });
      return { data: r.data.data ?? [], totalCount: r.data.totalCount ?? 0 };
    },
    enabled: !!permissions?.viewPO,
  });

  const approve = useMutation({
    mutationFn: async (id: number) => (await api.post(`/purchase-orders/${id}/approve`)).data,
    onSuccess: () => { toast.success("PO approved"); qc.invalidateQueries({ queryKey: ["purchase-orders"] }); },
    onError: (e: any) => toast.error(e?.response?.data?.message || "Approve failed"),
  });
  const reject = useMutation({
    mutationFn: async ({ id, reason }: { id: number; reason: string }) =>
      (await api.post(`/purchase-orders/${id}/reject`, { reason })).data,
    onSuccess: () => { toast.success("PO rejected"); qc.invalidateQueries({ queryKey: ["purchase-orders"] }); },
    onError: (e: any) => toast.error(e?.response?.data?.message || "Reject failed"),
  });
  const toggleActive = useMutation({
    mutationFn: async ({ id, isActive }: { id: number; isActive: boolean }) =>
      (await api.patch(`/purchase-orders/${id}/active`, { isActive })).data,
    onSuccess: () => { toast.success("Updated"); qc.invalidateQueries({ queryKey: ["purchase-orders"] }); },
    onError: (e: any) => toast.error(e?.response?.data?.message || "Update failed"),
  });

  if (!permissions) return <div className="p-6 text-muted-foreground">Loading…</div>;
  if (!permissions.viewPO) return <div className="p-6 text-rose-600">You do not have permission to view Purchase Orders.</div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
            <ShoppingCart className="w-5 h-5 text-primary-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Purchase Orders</h1>
            <p className="text-sm text-muted-foreground">Place orders with vendors for approved purchase indents.</p>
          </div>
        </div>
        {permissions.createPO && (
          <Button onClick={() => setCreateOpen(true)}><Plus className="w-4 h-4 mr-1" />New Purchase Order</Button>
        )}
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[240px] space-y-1.5">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Search</Label>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
              <Input className="pl-9" placeholder="Search PO No or vendor…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Status</Label>
            <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={status} onChange={(e) => { setStatus(e.target.value as any); setPage(1); }}>
              <option value="">All</option>
              <option value={PoStatus.Pending}>Pending</option>
              <option value={PoStatus.Approved}>Approved</option>
              <option value={PoStatus.Rejected}>Rejected</option>
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
                <th className="text-left py-2.5 px-3">PO No</th>
                <th className="text-left py-2.5 px-3">Vendor</th>
                <th className="text-left py-2.5 px-3">Delivery</th>
                <th className="text-left py-2.5 px-3">Quotation</th>
                <th className="text-left py-2.5 px-3">GST</th>
                <th className="text-right py-2.5 px-3">Items</th>
                <th className="text-right py-2.5 px-3">Total Qty</th>
                <th className="text-right py-2.5 px-3">Total Value</th>
                <th className="text-left py-2.5 px-3">Status</th>
                <th className="text-right py-2.5 px-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && <tr><td colSpan={10} className="py-6 text-center text-muted-foreground">Loading…</td></tr>}
              {!isLoading && !data?.data.length && (
                <tr><td colSpan={10} className="py-8 text-center text-muted-foreground">No purchase orders yet.</td></tr>
              )}
              {data?.data.map(po => (
                <tr key={po.id} className="border-t border-border/60 hover:bg-muted/30 transition-colors">
                  <td className="py-2.5 px-3 font-medium">{po.poNo}</td>
                  <td className="py-2.5 px-3">{po.vendorName || "—"}</td>
                  <td className="py-2.5 px-3 text-muted-foreground">{formatDate(po.deliveryDate)}</td>
                  <td className="py-2.5 px-3 text-muted-foreground text-xs">{po.quotationNo || "—"}</td>
                  <td className="py-2.5 px-3 text-xs text-muted-foreground">{po.gstType ? `${po.gstType} ${po.gstPercent ?? "-"}%` : "—"}</td>
                  <td className="py-2.5 px-3 text-right">{po.itemCount}</td>
                  <td className="py-2.5 px-3 text-right tabular-nums">{Number(po.totalQty).toFixed(3)}</td>
                  <td className="py-2.5 px-3 text-right tabular-nums">{formatRate(po.totalValue)}</td>
                  <td className="py-2.5 px-3"><POStatusPill value={po.status} /></td>
                  <td className="py-2.5 px-3 text-right">
                    <div className="inline-flex items-center gap-1.5">
                      <Button size="sm" variant="outline" title="View" onClick={() => setViewId(po.id)}><Eye className="w-4 h-4" /></Button>
                      {permissions.approvePO && po.status === PoStatus.Pending && (
                        <>
                          <Button size="sm" variant="outline" className="text-emerald-600" title="Approve" onClick={() => approve.mutate(po.id)}>
                            <Check className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="outline" className="text-rose-600" title="Reject"
                            onClick={() => {
                              const reason = window.prompt(`Reject PO ${po.poNo}? Enter reason:`);
                              if (reason !== null) reject.mutate({ id: po.id, reason });
                            }}>
                            <X className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                      {permissions.editPO && (
                        <Button size="sm" variant="outline" title={po.isActive ? "Deactivate" : "Activate"}
                          onClick={() => {
                            if (po.isActive && !window.confirm(`Deactivate PO ${po.poNo}?`)) return;
                            toggleActive.mutate({ id: po.id, isActive: !po.isActive });
                          }}>
                          <Power className={`w-4 h-4 ${po.isActive ? "text-emerald-500" : "text-muted-foreground"}`} />
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

      {createOpen && <CreatePODialog open={createOpen} onClose={() => setCreateOpen(false)} />}
      {viewId !== null && <ViewPODialog id={viewId} onClose={() => setViewId(null)} />}
    </div>
  );
}

// ─────────────────────────────────────── Create

function CreatePODialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const [vendorId, setVendorId] = useState<number | "">("");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [quotationNo, setQuotationNo] = useState("");
  const [quotationUrls, setQuotationUrls] = useState<string[]>([]);
  const [gstType, setGstType] = useState<GstType | "">("");
  const [gstPercent, setGstPercent] = useState<number | "">("");
  const [purchaseType, setPurchaseType] = useState("Regular");
  const [remarks, setRemarks] = useState("");
  const [items, setItems] = useState<POItemDraft[]>([]);
  const [uploading, setUploading] = useState(false);

  const { data: nextCode } = useQuery({
    queryKey: ["purchase-orders", "next-code"],
    queryFn: async (): Promise<string> => (await api.get("/purchase-orders/next-code")).data.data,
  });

  const { data: vendors } = useQuery({
    queryKey: ["parties-active", PartyType.Vendor],
    queryFn: async (): Promise<Party[]> => (await api.get("/parties/active", { params: { type: PartyType.Vendor } })).data.data ?? [],
  });

  const { data: approvedItems } = useQuery({
    queryKey: ["pi-approved-items", "PurchaseOrder"],
    queryFn: async (): Promise<ApprovedPIItem[]> => (await api.get("/purchase-indents/approved-items", { params: { indentFor: "PurchaseOrder" } })).data.data ?? [],
  });

  const [search, setSearch] = useState("");
  const debounced = useDebouncedValue(search, 250);
  const filteredAvailable = useMemo(() => {
    if (!approvedItems) return [] as ApprovedPIItem[];
    const used = new Set(items.map(i => i.purchaseIndentItemId));
    let list = approvedItems.filter(a => !used.has(a.id) && Number(a.quantity) - Number(a.alreadyOrderedQty) > 0);
    if (debounced) {
      const q = debounced.toLowerCase();
      list = list.filter(a => a.itemCode.toLowerCase().includes(q) || a.itemName.toLowerCase().includes(q) || a.piNo.toLowerCase().includes(q) || (a.orderNumber ?? "").toLowerCase().includes(q));
    }
    return list;
  }, [approvedItems, items, debounced]);

  const addRow = (a: ApprovedPIItem) => {
    const pending = Math.max(0, Number(a.quantity) - Number(a.alreadyOrderedQty));
    setItems(prev => [...prev, {
      key: `pi-${a.id}`,
      purchaseIndentItemId: a.id,
      piNo: a.piNo,
      itemCode: a.itemCode,
      itemName: a.itemName,
      orderNumber: a.orderNumber,
      pendingQty: pending,
      quantity: pending,
      rate: 0,
    }]);
  };
  const removeRow = (key: string) => setItems(prev => prev.filter(r => r.key !== key));
  const updateRow = (key: string, patch: Partial<POItemDraft>) => setItems(prev => prev.map(r => r.key === key ? { ...r, ...patch } : r));

  const uploadQuotation = async (file: File) => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const r = await api.post("/purchase-orders/upload-quotation", fd, { headers: { "Content-Type": "multipart/form-data" } });
      const url = r.data.data?.url;
      if (url) {
        setQuotationUrls(prev => [...prev, url]);
        toast.success("Quotation uploaded");
      }
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const create = useMutation({
    mutationFn: async () => {
      if (!vendorId) throw new Error("Vendor is required");
      if (items.length === 0) throw new Error("Add at least one item");
      const body = {
        vendorId: Number(vendorId),
        deliveryDate: deliveryDate || null,
        quotationNo: quotationNo || null,
        quotationUrls: quotationUrls.length ? quotationUrls : null,
        gstType: gstType || null,
        gstPercent: gstPercent === "" ? null : Number(gstPercent),
        purchaseType: purchaseType || "Regular",
        remarks: remarks || null,
        items: items.map(i => ({
          purchaseIndentItemId: i.purchaseIndentItemId,
          quantity: Number(i.quantity),
          rate: Number(i.rate),
        })),
      };
      const r = await api.post("/purchase-orders", body);
      return r.data;
    },
    onSuccess: () => {
      toast.success("Purchase order created");
      qc.invalidateQueries({ queryKey: ["purchase-orders"] });
      qc.invalidateQueries({ queryKey: ["pi-approved-items"] });
      onClose();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || e?.message || "Failed to create PO"),
  });

  const submit = () => {
    if (!vendorId) { toast.error("Vendor is required"); return; }
    if (items.length === 0) { toast.error("Add at least one item"); return; }
    for (const i of items) {
      if (!i.quantity || i.quantity <= 0) { toast.error("Quantity must be > 0"); return; }
      if (i.quantity > i.pendingQty) { toast.error(`Quantity for ${i.itemCode} exceeds pending (${i.pendingQty})`); return; }
      if (i.rate < 0) { toast.error("Rate cannot be negative"); return; }
    }
    create.mutate();
  };

  const totalValue = items.reduce((s, i) => s + Number(i.quantity || 0) * Number(i.rate || 0), 0);

  return (
    <Dialog isOpen={open} onClose={onClose} title={`New Purchase Order${nextCode ? `  ·  ${nextCode}` : ""}`} size="full">
      <div className="grid grid-cols-1 lg:grid-cols-6 gap-4 h-full">
        {/* Left: pending PI items */}
        <Card className="lg:col-span-2 flex flex-col min-h-0 overflow-hidden">
          <div className="px-3 py-2 border-b border-border bg-muted/20">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Approved PI items (pending order)</h4>
          </div>
          <div className="p-3 border-b border-border">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
              <Input className="pl-9" placeholder="Search PI / item / order…" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {filteredAvailable.length === 0 && <p className="text-xs text-center p-4 text-muted-foreground">No pending PI items.</p>}
            {filteredAvailable.map(a => {
              const pending = Math.max(0, Number(a.quantity) - Number(a.alreadyOrderedQty));
              return (
                <button key={a.id} onClick={() => addRow(a)}
                  className="w-full text-left text-xs px-3 py-2 my-0.5 rounded-md bg-background border border-border hover:bg-primary-50 dark:hover:bg-primary-900/30 hover:border-primary-300 transition-colors">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">{a.itemCode}</span>
                    <span className="text-[10px] uppercase text-muted-foreground">PI {a.piNo}</span>
                  </div>
                  <div className="text-muted-foreground truncate">{a.itemName}</div>
                  <div className="text-[10px] mt-1 flex gap-2 flex-wrap">
                    <span className="text-amber-600 font-medium">Pending {pending.toFixed(3)}</span>
                    <span className="text-muted-foreground">PI Qty {Number(a.quantity).toFixed(3)}</span>
                    <span className="text-muted-foreground">Ordered {Number(a.alreadyOrderedQty).toFixed(3)}</span>
                    {a.orderNumber && <span className="text-blue-600 dark:text-blue-300">· {a.orderNumber}</span>}
                  </div>
                </button>
              );
            })}
          </div>
        </Card>

        {/* Right: header + items */}
        <div className="lg:col-span-4 flex flex-col min-h-0">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
            <div className="space-y-1.5">
              <Label>Vendor *</Label>
              <select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={vendorId} onChange={(e) => setVendorId(e.target.value ? Number(e.target.value) : "")}>
                <option value="">Select vendor…</option>
                {vendors?.map(v => <option key={v.id} value={v.id}>{v.partyName}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Delivery Date</Label>
              <Input type="date" value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Quotation No</Label>
              <Input value={quotationNo} onChange={(e) => setQuotationNo(e.target.value)} placeholder="e.g. Q-1023" />
            </div>
            <div className="space-y-1.5">
              <Label>GST Type</Label>
              <select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={gstType} onChange={(e) => setGstType(e.target.value as any)}>
                <option value="">—</option>
                <option value={GstType.CGST_SGST}>CGST + SGST</option>
                <option value={GstType.IGST}>IGST</option>
                <option value={GstType.UGST}>UGST</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>GST %</Label>
              <Input type="number" step="0.01" min="0" value={gstPercent} onChange={(e) => setGstPercent(e.target.value === "" ? "" : Number(e.target.value))} placeholder="e.g. 18" />
            </div>
            <div className="space-y-1.5">
              <Label>Purchase Type</Label>
              <select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={purchaseType} onChange={(e) => setPurchaseType(e.target.value)}>
                <option value="Regular">Regular</option>
                <option value="Urgent">Urgent</option>
                <option value="Critical">Critical</option>
              </select>
            </div>
            <div className="space-y-1.5 col-span-2 md:col-span-2">
              <Label>Remarks</Label>
              <Textarea rows={2} value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Optional remarks…" />
            </div>
            <div className="space-y-1.5">
              <Label>Quotation Upload</Label>
              <div className="flex items-center gap-2">
                <input ref={fileRef} type="file" accept=".pdf,.png,.jpg,.jpeg,.webp" className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadQuotation(f); e.target.value = ""; }} />
                <Button variant="outline" type="button" onClick={() => fileRef.current?.click()} loading={uploading}>
                  <Upload className="w-4 h-4 mr-1" />Upload
                </Button>
                {quotationUrls.length > 0 && <span className="text-xs text-muted-foreground flex items-center gap-1"><Paperclip className="w-3 h-3" />{quotationUrls.length} file(s)</span>}
              </div>
              {quotationUrls.length > 0 && (
                <div className="text-xs space-y-1 mt-1">
                  {quotationUrls.map((u, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <a href={u} target="_blank" rel="noreferrer" className="text-primary-600 truncate hover:underline">{u.split("/").pop()}</a>
                      <button type="button" className="text-rose-500" onClick={() => setQuotationUrls(prev => prev.filter((_, i) => i !== idx))}><X className="w-3 h-3" /></button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <Card className="flex-1 min-h-0 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/20">
              <h4 className="font-semibold text-sm">Items ({items.length})</h4>
              <span className="text-xs text-muted-foreground">Total Value: <span className="font-medium text-foreground">{formatRate(totalValue)}</span></span>
            </div>
            <div className="flex-1 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/20 text-xs uppercase tracking-wider text-muted-foreground sticky top-0">
                  <tr>
                    <th className="text-left py-2 px-3">PI / Item</th>
                    <th className="text-left py-2 px-3">Order</th>
                    <th className="text-right py-2 px-3 w-28">Pending</th>
                    <th className="text-right py-2 px-3 w-32">Quantity *</th>
                    <th className="text-right py-2 px-3 w-32">Rate *</th>
                    <th className="text-right py-2 px-3 w-32">Amount</th>
                    <th className="text-right py-2 px-3 w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {items.length === 0 && (
                    <tr><td colSpan={7} className="py-12 text-center text-muted-foreground text-sm">Pick PI items from the left panel to add them here.</td></tr>
                  )}
                  {items.map(it => (
                    <tr key={it.key} className="border-t border-border/60">
                      <td className="py-2 px-3">
                        <div className="text-[10px] uppercase text-muted-foreground">{it.piNo}</div>
                        <div className="font-medium">{it.itemCode}</div>
                        <div className="text-xs text-muted-foreground truncate max-w-[280px]">{it.itemName}</div>
                      </td>
                      <td className="py-2 px-3 text-xs text-muted-foreground">{it.orderNumber || "—"}</td>
                      <td className="py-2 px-3 text-right text-xs text-amber-600 font-medium tabular-nums">{it.pendingQty.toFixed(3)}</td>
                      <td className="py-2 px-3">
                        <Input type="number" step="0.001" min="0" max={it.pendingQty} className="h-8 text-right" value={it.quantity}
                          onChange={(e) => updateRow(it.key, { quantity: Number(e.target.value) })} />
                      </td>
                      <td className="py-2 px-3">
                        <Input type="number" step="0.01" min="0" className="h-8 text-right" value={it.rate}
                          onChange={(e) => updateRow(it.key, { rate: Number(e.target.value) })} />
                      </td>
                      <td className="py-2 px-3 text-right tabular-nums">{formatRate(Number(it.quantity || 0) * Number(it.rate || 0))}</td>
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
          <Plus className="w-4 h-4 mr-1" />Create Purchase Order
        </Button>
      </div>
    </Dialog>
  );
}

// ─────────────────────────────────────── View

function ViewPODialog({ id, onClose }: { id: number; onClose: () => void }) {
  const { data, isLoading } = useQuery({
    queryKey: ["purchase-order", id],
    queryFn: async (): Promise<any> => (await api.get(`/purchase-orders/${id}`)).data.data,
  });
  const quotationUrls: string[] = useMemo(() => {
    try { return data?.quotationUrlsJson ? JSON.parse(data.quotationUrlsJson) : []; } catch { return []; }
  }, [data]);
  return (
    <Dialog isOpen={true} onClose={onClose} title={data?.poNo ? `PO · ${data.poNo}` : "Purchase Order"} size="xl">
      {isLoading || !data ? (
        <p className="py-10 text-center text-muted-foreground">Loading…</p>
      ) : (
        <div className="space-y-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <InfoCell label="PO No" value={data.poNo} />
            <InfoCell label="Vendor" value={data.vendorName || "—"} />
            <InfoCell label="Vendor GST" value={data.vendorGst || "—"} />
            <InfoCell label="Status" value={<POStatusPill value={data.status} />} />
            <InfoCell label="Delivery Date" value={formatDate(data.deliveryDate)} />
            <InfoCell label="Quotation No" value={data.quotationNo || "—"} />
            <InfoCell label="GST" value={data.gstType ? `${data.gstType} ${data.gstPercent ?? "-"}%` : "—"} />
            <InfoCell label="Purchase Type" value={data.purchaseType || "—"} />
            <InfoCell label="Created" value={`${formatDate(data.createdAt)} · ${data.createdByName || "—"}`} />
            <InfoCell label="Approved" value={data.approvedAt ? `${formatDate(data.approvedAt)} · ${data.approvedByName || "—"}` : "—"} />
            <InfoCell label="Document" value={data.documentNo ? `${data.documentNo} · ${data.revisionNo ?? ""}` : "—"} />
            <InfoCell label="Active" value={data.isActive ? "Yes" : "No"} />
          </div>
          {quotationUrls.length > 0 && (
            <div className="space-y-2">
              <Label>Quotations</Label>
              <div className="flex flex-wrap gap-2">
                {quotationUrls.map((u, i) => (
                  <a key={i} href={u} target="_blank" rel="noreferrer" className="text-xs px-3 py-1.5 rounded-md border border-border bg-muted/30 hover:bg-muted flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5" />{u.split("/").pop()}
                  </a>
                ))}
              </div>
            </div>
          )}
          {data.remarks && <div className="text-sm"><span className="text-muted-foreground">Remarks: </span>{data.remarks}</div>}
          <Card className="overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/30 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="text-left py-2 px-3">PI · Item</th>
                  <th className="text-left py-2 px-3">Order / Product</th>
                  <th className="text-right py-2 px-3">Qty</th>
                  <th className="text-right py-2 px-3">Rate</th>
                  <th className="text-right py-2 px-3">Amount</th>
                </tr>
              </thead>
              <tbody>
                {(data.items ?? []).map((it: any) => (
                  <tr key={it.id} className="border-t border-border/60">
                    <td className="py-2 px-3">
                      <div className="text-[10px] uppercase text-muted-foreground">{it.piNo}</div>
                      <div className="font-medium">{it.itemCodeSnapshot || it.itemCode}</div>
                      <div className="text-xs text-muted-foreground">{it.itemNameSnapshot || it.itemName}</div>
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
                    <td className="py-2 px-3 text-right tabular-nums">{formatRate(it.rate)}</td>
                    <td className="py-2 px-3 text-right tabular-nums">{formatRate(Number(it.quantity) * Number(it.rate))}</td>
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

function POStatusPill({ value }: { value: PoStatus }) {
  const map: Record<string, string> = {
    Pending:  "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
    Approved: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
    Rejected: "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300",
  };
  return <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full ${map[value] ?? "bg-gray-100 text-gray-800"}`}>{value}</span>;
}
