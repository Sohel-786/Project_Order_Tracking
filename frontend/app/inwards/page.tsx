"use client";

import { useMemo, useState, useRef } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import {
  ArrowDownLeft, Plus, Search, Eye, Power, Trash2, Upload, FileText, Paperclip, X,
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
import { InwardSourceType, InwardStatus, Party, PartyType } from "@/types";

// ─────────────────────────────────────── Types

interface InwardRow {
  id: number; inwardNo: string; grnNumber?: string | null; inwardDate: string;
  status: InwardStatus; remarks?: string | null;
  vendorId?: number | null; vendorName?: string | null;
  createdAt: string; isActive: boolean;
  createdByName?: string | null;
  lineCount: number; totalQty: number;
}

interface POInwardItem {
  purchaseOrderItemId: number; purchaseOrderId: number; poNo: string;
  vendorId: number; vendorName: string;
  itemId: number; itemCode: string; itemName: string;
  orderedQty: number; rate: number;
  orderNumber?: string | null;
  inwardedQty: number;
}

interface JWInwardItem {
  jobWorkItemId: number; jobWorkId: number; jwNo: string;
  toPartyId: number; toPartyName: string;
  itemId: number; itemCode: string; itemName: string;
  sentQty: number;
  orderNumber?: string | null;
  inwardedQty: number;
}

interface InwardLineDraft {
  key: string;
  sourceType: InwardSourceType;
  sourceRefId: number;
  refNo: string;
  itemCode: string;
  itemName: string;
  orderNumber?: string | null;
  pendingQty: number;
  quantity: number;
  rate: number;
  gstPercent: number | "";
  remarks?: string;
}

// ─────────────────────────────────────── Page

export default function InwardsPage() {
  const { data: permissions } = useCurrentUserPermissions();
  const qc = useQueryClient();

  const [search, setSearch] = useState("");
  const debounced = useDebouncedValue(search, 300);
  const [vendorId, setVendorId] = useState<number | "">("");
  const [activeOnly, setActiveOnly] = useState(true);
  const [page, setPage] = useState(1);
  const pageSize = DEFAULT_PAGE_SIZE;

  const [createOpen, setCreateOpen] = useState(false);
  const [viewId, setViewId] = useState<number | null>(null);

  const { data: vendors } = useQuery({
    queryKey: ["parties-active", PartyType.Vendor],
    queryFn: async (): Promise<Party[]> =>
      (await api.get("/parties/active", { params: { type: PartyType.Vendor } })).data.data ?? [],
    enabled: !!permissions?.viewInward,
  });

  const { data, isLoading } = useQuery({
    queryKey: ["inwards", { debounced, vendorId, activeOnly, page, pageSize }],
    queryFn: async (): Promise<{ data: InwardRow[]; totalCount: number }> => {
      const params: Record<string, unknown> = { page, pageSize };
      if (debounced) params.search = debounced;
      if (vendorId) params.vendorId = vendorId;
      if (activeOnly) params.activeOnly = true;
      const r = await api.get("/inwards", { params });
      return { data: r.data.data ?? [], totalCount: r.data.totalCount ?? 0 };
    },
    enabled: !!permissions?.viewInward,
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, isActive }: { id: number; isActive: boolean }) =>
      (await api.patch(`/inwards/${id}/active`, { isActive })).data,
    onSuccess: () => {
      toast.success("Updated");
      qc.invalidateQueries({ queryKey: ["inwards"] });
    },
    onError: (e: { response?: { data?: { message?: string } } }) =>
      toast.error(e?.response?.data?.message || "Update failed"),
  });

  if (!permissions) return <div className="p-6 text-muted-foreground">Loading…</div>;
  if (!permissions.viewInward) {
    return <div className="p-6 text-rose-600">You do not have permission to view Inwards.</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
            <ArrowDownLeft className="w-5 h-5 text-primary-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Inwards</h1>
            <p className="text-sm text-muted-foreground">Record goods received against purchase orders or job work returns.</p>
          </div>
        </div>
        {permissions.createInward && (
          <Button onClick={() => setCreateOpen(true)}><Plus className="w-4 h-4 mr-1" />New Inward</Button>
        )}
      </div>

      <Card className="p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[240px] space-y-1.5">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Search</Label>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
              <Input className="pl-9" placeholder="Search inward or GRN…" value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Vendor</Label>
            <select className="h-10 rounded-md border border-input bg-background px-3 text-sm min-w-[180px]"
              value={vendorId} onChange={(e) => { setVendorId(e.target.value ? Number(e.target.value) : ""); setPage(1); }}>
              <option value="">All vendors</option>
              {vendors?.map(v => <option key={v.id} value={v.id}>{v.partyName}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2 h-10 px-1">
            <Switch checked={activeOnly} onCheckedChange={(v) => { setActiveOnly(v); setPage(1); }} />
            <Label className="text-sm">Active only</Label>
          </div>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/30 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="text-left py-2.5 px-3">Inward No</th>
                <th className="text-left py-2.5 px-3">GRN</th>
                <th className="text-left py-2.5 px-3">Date</th>
                <th className="text-left py-2.5 px-3">Vendor</th>
                <th className="text-right py-2.5 px-3">Lines</th>
                <th className="text-right py-2.5 px-3">Total Qty</th>
                <th className="text-left py-2.5 px-3">Status</th>
                <th className="text-right py-2.5 px-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && <tr><td colSpan={8} className="py-6 text-center text-muted-foreground">Loading…</td></tr>}
              {!isLoading && !data?.data.length && (
                <tr><td colSpan={8} className="py-8 text-center text-muted-foreground">No inwards yet.</td></tr>
              )}
              {data?.data.map(row => (
                <tr key={row.id} className="border-t border-border/60 hover:bg-muted/30 transition-colors">
                  <td className="py-2.5 px-3 font-medium">{row.inwardNo}</td>
                  <td className="py-2.5 px-3 text-muted-foreground">{row.grnNumber || "—"}</td>
                  <td className="py-2.5 px-3 text-muted-foreground">{formatDate(row.inwardDate)}</td>
                  <td className="py-2.5 px-3">{row.vendorName || "—"}</td>
                  <td className="py-2.5 px-3 text-right">{row.lineCount}</td>
                  <td className="py-2.5 px-3 text-right tabular-nums">{Number(row.totalQty).toFixed(3)}</td>
                  <td className="py-2.5 px-3"><InwardStatusPill value={row.status} /></td>
                  <td className="py-2.5 px-3 text-right">
                    <div className="inline-flex items-center gap-1.5">
                      <Button size="sm" variant="outline" title="View" onClick={() => setViewId(row.id)}><Eye className="w-4 h-4" /></Button>
                      {permissions.editInward && (
                        <Button size="sm" variant="outline" title={row.isActive ? "Deactivate" : "Activate"}
                          onClick={() => {
                            if (row.isActive && !window.confirm(`Deactivate inward ${row.inwardNo}?`)) return;
                            toggleActive.mutate({ id: row.id, isActive: !row.isActive });
                          }}>
                          <Power className={`w-4 h-4 ${row.isActive ? "text-emerald-500" : "text-muted-foreground"}`} />
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

      {createOpen && permissions.createInward && (
        <CreateInwardDialog open={createOpen} vendors={vendors ?? []} onClose={() => setCreateOpen(false)} />
      )}
      {viewId !== null && <ViewInwardDialog id={viewId} onClose={() => setViewId(null)} />}
    </div>
  );
}

// ─────────────────────────────────────── Create

function CreateInwardDialog({ open, onClose, vendors }: { open: boolean; onClose: () => void; vendors: Party[] }) {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const [grnNumber, setGrnNumber] = useState("");
  const [inwardDate, setInwardDate] = useState(new Date().toISOString().slice(0, 10));
  const [vendorId, setVendorId] = useState<number | "">("");
  const [remarks, setRemarks] = useState("");
  const [attachmentUrls, setAttachmentUrls] = useState<string[]>([]);
  const [lines, setLines] = useState<InwardLineDraft[]>([]);
  const [sourceTab, setSourceTab] = useState<"PO" | "JW">("PO");
  const [pickerSearch, setPickerSearch] = useState("");
  const [uploading, setUploading] = useState(false);
  const debouncedPicker = useDebouncedValue(pickerSearch, 250);

  const { data: nextCode } = useQuery({
    queryKey: ["inwards", "next-code"],
    queryFn: async (): Promise<string> => (await api.get("/inwards/next-code")).data.data,
  });

  const { data: poItems } = useQuery({
    queryKey: ["po-approved-items-for-inward"],
    queryFn: async (): Promise<POInwardItem[]> =>
      (await api.get("/purchase-orders/approved-items-for-inward")).data.data ?? [],
  });

  const { data: jwItems } = useQuery({
    queryKey: ["jw-pending-items-for-inward"],
    queryFn: async (): Promise<JWInwardItem[]> =>
      (await api.get("/job-works/pending-items-for-inward")).data.data ?? [],
  });

  const usedPo = useMemo(() => new Set(lines.filter(l => l.sourceType === InwardSourceType.PO).map(l => l.sourceRefId)), [lines]);
  const usedJw = useMemo(() => new Set(lines.filter(l => l.sourceType === InwardSourceType.JobWork).map(l => l.sourceRefId)), [lines]);

  const filteredPo = useMemo(() => {
    if (!poItems) return [] as POInwardItem[];
    let list = poItems.filter(p => {
      const pending = Math.max(0, Number(p.orderedQty) - Number(p.inwardedQty));
      return pending > 0 && !usedPo.has(p.purchaseOrderItemId);
    });
    if (vendorId) list = list.filter(p => p.vendorId === vendorId);
    if (debouncedPicker) {
      const q = debouncedPicker.toLowerCase();
      list = list.filter(p =>
        p.itemCode.toLowerCase().includes(q) || p.itemName.toLowerCase().includes(q) ||
        p.poNo.toLowerCase().includes(q) || (p.orderNumber ?? "").toLowerCase().includes(q));
    }
    return list;
  }, [poItems, usedPo, vendorId, debouncedPicker]);

  const filteredJw = useMemo(() => {
    if (!jwItems) return [] as JWInwardItem[];
    let list = jwItems.filter(j => {
      const pending = Math.max(0, Number(j.sentQty) - Number(j.inwardedQty));
      return pending > 0 && !usedJw.has(j.jobWorkItemId);
    });
    if (vendorId) list = list.filter(j => j.toPartyId === vendorId);
    if (debouncedPicker) {
      const q = debouncedPicker.toLowerCase();
      list = list.filter(j =>
        j.itemCode.toLowerCase().includes(q) || j.itemName.toLowerCase().includes(q) ||
        j.jwNo.toLowerCase().includes(q) || (j.orderNumber ?? "").toLowerCase().includes(q));
    }
    return list;
  }, [jwItems, usedJw, vendorId, debouncedPicker]);

  const addPoLine = (p: POInwardItem) => {
    const pending = Math.max(0, Number(p.orderedQty) - Number(p.inwardedQty));
    setLines(prev => [...prev, {
      key: `po-${p.purchaseOrderItemId}`,
      sourceType: InwardSourceType.PO,
      sourceRefId: p.purchaseOrderItemId,
      refNo: p.poNo,
      itemCode: p.itemCode,
      itemName: p.itemName,
      orderNumber: p.orderNumber,
      pendingQty: pending,
      quantity: pending,
      rate: Number(p.rate) || 0,
      gstPercent: "",
    }]);
  };

  const addJwLine = (j: JWInwardItem) => {
    const pending = Math.max(0, Number(j.sentQty) - Number(j.inwardedQty));
    setLines(prev => [...prev, {
      key: `jw-${j.jobWorkItemId}`,
      sourceType: InwardSourceType.JobWork,
      sourceRefId: j.jobWorkItemId,
      refNo: j.jwNo,
      itemCode: j.itemCode,
      itemName: j.itemName,
      orderNumber: j.orderNumber,
      pendingQty: pending,
      quantity: pending,
      rate: 0,
      gstPercent: "",
    }]);
  };

  const updateLine = (key: string, patch: Partial<InwardLineDraft>) =>
    setLines(prev => prev.map(r => r.key === key ? { ...r, ...patch } : r));
  const removeLine = (key: string) => setLines(prev => prev.filter(r => r.key !== key));

  const uploadAttachment = async (file: File) => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const r = await api.post("/inwards/upload-attachment", fd, { headers: { "Content-Type": "multipart/form-data" } });
      const url = r.data.data?.url;
      if (url) {
        setAttachmentUrls(prev => [...prev, url]);
        toast.success("Attachment uploaded");
      }
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const create = useMutation({
    mutationFn: async () => {
      const body = {
        grnNumber: grnNumber || null,
        inwardDate: inwardDate || null,
        vendorId: vendorId === "" ? null : Number(vendorId),
        remarks: remarks || null,
        attachmentUrls: attachmentUrls.length ? attachmentUrls : null,
        lines: lines.map(l => ({
          sourceType: l.sourceType,
          sourceRefId: l.sourceRefId,
          quantity: Number(l.quantity),
          rate: Number(l.rate) || null,
          gstPercent: l.gstPercent === "" ? null : Number(l.gstPercent),
          remarks: l.remarks || null,
        })),
      };
      return (await api.post("/inwards", body)).data;
    },
    onSuccess: () => {
      toast.success("Inward created");
      qc.invalidateQueries({ queryKey: ["inwards"] });
      qc.invalidateQueries({ queryKey: ["po-approved-items-for-inward"] });
      qc.invalidateQueries({ queryKey: ["jw-pending-items-for-inward"] });
      qc.invalidateQueries({ queryKey: ["qc-pending-inward-lines"] });
      onClose();
    },
    onError: (e: { response?: { data?: { message?: string } }; message?: string }) =>
      toast.error(e?.response?.data?.message || e?.message || "Failed to create inward"),
  });

  const submit = () => {
    if (lines.length === 0) { toast.error("Add at least one line"); return; }
    for (const l of lines) {
      if (!l.quantity || l.quantity <= 0) { toast.error("All quantities must be > 0"); return; }
      if (l.quantity > l.pendingQty) {
        toast.error(`Quantity for ${l.itemCode} exceeds pending (${l.pendingQty.toFixed(3)})`);
        return;
      }
    }
    create.mutate();
  };

  return (
    <Dialog isOpen={open} onClose={onClose} title={`New Inward${nextCode ? `  ·  ${nextCode}` : ""}`} size="full">
      <div className="grid grid-cols-1 lg:grid-cols-6 gap-4 h-full">
        <Card className="lg:col-span-2 flex flex-col min-h-0 overflow-hidden">
          <div className="flex border-b border-border bg-muted/20">
            <button type="button" onClick={() => setSourceTab("PO")}
              className={`flex-1 py-2 text-xs font-semibold uppercase tracking-wider ${sourceTab === "PO" ? "text-primary-600 border-b-2 border-primary-500" : "text-muted-foreground"}`}>
              From PO
            </button>
            <button type="button" onClick={() => setSourceTab("JW")}
              className={`flex-1 py-2 text-xs font-semibold uppercase tracking-wider ${sourceTab === "JW" ? "text-primary-600 border-b-2 border-primary-500" : "text-muted-foreground"}`}>
              From Job Work
            </button>
          </div>
          <div className="px-3 py-2 border-b border-border bg-muted/10 text-[10px] text-muted-foreground">
            {vendorId ? "Filtered by selected vendor" : "Select vendor to filter sources"}
          </div>
          <div className="p-3 border-b border-border">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
              <Input className="pl-9" placeholder="Search ref / item / order…" value={pickerSearch} onChange={(e) => setPickerSearch(e.target.value)} />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {sourceTab === "PO" ? (
              filteredPo.length === 0 ? <p className="text-xs text-center p-4 text-muted-foreground">No pending PO items.</p> :
              filteredPo.map(p => {
                const pending = Math.max(0, Number(p.orderedQty) - Number(p.inwardedQty));
                return (
                  <button key={p.purchaseOrderItemId} type="button" onClick={() => addPoLine(p)}
                    className="w-full text-left text-xs px-3 py-2 my-0.5 rounded-md bg-background border border-border hover:bg-primary-50 dark:hover:bg-primary-900/30 hover:border-primary-300 transition-colors">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium">{p.itemCode}</span>
                      <span className="text-[10px] uppercase text-muted-foreground">PO {p.poNo}</span>
                    </div>
                    <div className="text-muted-foreground truncate">{p.itemName}</div>
                    <div className="text-[10px] mt-1 flex gap-2 flex-wrap">
                      <span className="text-amber-600 font-medium">Pending {pending.toFixed(3)}</span>
                      <span className="text-muted-foreground">{p.vendorName}</span>
                      {p.orderNumber && <span className="text-blue-600 dark:text-blue-300">· {p.orderNumber}</span>}
                    </div>
                  </button>
                );
              })
            ) : (
              filteredJw.length === 0 ? <p className="text-xs text-center p-4 text-muted-foreground">No pending job work items.</p> :
              filteredJw.map(j => {
                const pending = Math.max(0, Number(j.sentQty) - Number(j.inwardedQty));
                return (
                  <button key={j.jobWorkItemId} type="button" onClick={() => addJwLine(j)}
                    className="w-full text-left text-xs px-3 py-2 my-0.5 rounded-md bg-background border border-border hover:bg-primary-50 dark:hover:bg-primary-900/30 hover:border-primary-300 transition-colors">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium">{j.itemCode}</span>
                      <span className="text-[10px] uppercase text-muted-foreground">JW {j.jwNo}</span>
                    </div>
                    <div className="text-muted-foreground truncate">{j.itemName}</div>
                    <div className="text-[10px] mt-1 flex gap-2 flex-wrap">
                      <span className="text-amber-600 font-medium">Pending {pending.toFixed(3)}</span>
                      <span className="text-muted-foreground">{j.toPartyName}</span>
                      {j.orderNumber && <span className="text-blue-600 dark:text-blue-300">· {j.orderNumber}</span>}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </Card>

        <div className="lg:col-span-4 flex flex-col min-h-0">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
            <div className="space-y-1.5">
              <Label>GRN Number</Label>
              <Input value={grnNumber} onChange={(e) => setGrnNumber(e.target.value)} placeholder="Vendor GRN / challan no" />
            </div>
            <div className="space-y-1.5">
              <Label>Inward Date *</Label>
              <Input type="date" value={inwardDate} onChange={(e) => setInwardDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Vendor</Label>
              <select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={vendorId}
                onChange={(e) => setVendorId(e.target.value ? Number(e.target.value) : "")}>
                <option value="">Select vendor…</option>
                {vendors.map(v => <option key={v.id} value={v.id}>{v.partyName}</option>)}
              </select>
            </div>
            <div className="space-y-1.5 col-span-2 md:col-span-2">
              <Label>Remarks</Label>
              <Textarea rows={2} value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Optional remarks…" />
            </div>
            <div className="space-y-1.5">
              <Label>Attachments</Label>
              <div className="flex items-center gap-2">
                <input ref={fileRef} type="file" accept=".pdf,.png,.jpg,.jpeg,.webp" className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadAttachment(f); e.target.value = ""; }} />
                <Button variant="outline" type="button" onClick={() => fileRef.current?.click()} loading={uploading}>
                  <Upload className="w-4 h-4 mr-1" />Upload
                </Button>
                {attachmentUrls.length > 0 && (
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Paperclip className="w-3 h-3" />{attachmentUrls.length} file(s)
                  </span>
                )}
              </div>
            </div>
          </div>

          <Card className="flex-1 min-h-0 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/20">
              <h4 className="font-semibold text-sm">Lines ({lines.length})</h4>
              <span className="text-xs text-muted-foreground">
                Total Qty: {lines.reduce((s, l) => s + Number(l.quantity || 0), 0).toFixed(3)}
              </span>
            </div>
            <div className="flex-1 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/20 text-xs uppercase tracking-wider text-muted-foreground sticky top-0">
                  <tr>
                    <th className="text-left py-2 px-3">Source / Item</th>
                    <th className="text-left py-2 px-3">Order</th>
                    <th className="text-right py-2 px-3 w-24">Pending</th>
                    <th className="text-right py-2 px-3 w-28">Qty *</th>
                    <th className="text-right py-2 px-3 w-28">Rate</th>
                    <th className="text-right py-2 px-3 w-24">GST %</th>
                    <th className="text-left py-2 px-3">Remarks</th>
                    <th className="text-right py-2 px-3 w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {lines.length === 0 && (
                    <tr><td colSpan={8} className="py-12 text-center text-muted-foreground text-sm">Pick PO or Job Work items from the left panel.</td></tr>
                  )}
                  {lines.map(l => (
                    <tr key={l.key} className="border-t border-border/60">
                      <td className="py-2 px-3">
                        <div className="text-[10px] uppercase text-muted-foreground">{l.sourceType} · {l.refNo}</div>
                        <div className="font-medium">{l.itemCode}</div>
                        <div className="text-xs text-muted-foreground truncate max-w-[200px]">{l.itemName}</div>
                      </td>
                      <td className="py-2 px-3 text-xs text-muted-foreground">{l.orderNumber || "—"}</td>
                      <td className="py-2 px-3 text-right text-xs text-amber-600 font-medium tabular-nums">{l.pendingQty.toFixed(3)}</td>
                      <td className="py-2 px-3">
                        <Input type="number" step="0.001" min="0" max={l.pendingQty} className="h-8 text-right" value={l.quantity}
                          onChange={(e) => updateLine(l.key, { quantity: Number(e.target.value) })} />
                      </td>
                      <td className="py-2 px-3">
                        <Input type="number" step="0.01" min="0" className="h-8 text-right" value={l.rate}
                          onChange={(e) => updateLine(l.key, { rate: Number(e.target.value) })} />
                      </td>
                      <td className="py-2 px-3">
                        <Input type="number" step="0.01" min="0" className="h-8 text-right" value={l.gstPercent}
                          onChange={(e) => updateLine(l.key, { gstPercent: e.target.value === "" ? "" : Number(e.target.value) })} />
                      </td>
                      <td className="py-2 px-3">
                        <Input className="h-8" value={l.remarks ?? ""} onChange={(e) => updateLine(l.key, { remarks: e.target.value })} placeholder="—" />
                      </td>
                      <td className="py-2 px-3 text-right">
                        <Button size="sm" variant="ghost" className="text-rose-500" onClick={() => removeLine(l.key)}>
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
          <Plus className="w-4 h-4 mr-1" />Create Inward
        </Button>
      </div>
    </Dialog>
  );
}

// ─────────────────────────────────────── View

function ViewInwardDialog({ id, onClose }: { id: number; onClose: () => void }) {
  const { data, isLoading } = useQuery({
    queryKey: ["inward", id],
    queryFn: async () => (await api.get(`/inwards/${id}`)).data.data,
  });

  const attachmentUrls: string[] = useMemo(() => {
    try { return data?.attachmentUrlsJson ? JSON.parse(data.attachmentUrlsJson) : []; } catch { return []; }
  }, [data]);

  return (
    <Dialog isOpen onClose={onClose} title={data?.inwardNo ? `Inward · ${data.inwardNo}` : "Inward"} size="xl">
      {isLoading || !data ? (
        <p className="py-10 text-center text-muted-foreground">Loading…</p>
      ) : (
        <div className="space-y-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <InfoCell label="Inward No" value={data.inwardNo} />
            <InfoCell label="GRN" value={data.grnNumber || "—"} />
            <InfoCell label="Date" value={formatDate(data.inwardDate)} />
            <InfoCell label="Vendor" value={data.vendorName || "—"} />
            <InfoCell label="Status" value={<InwardStatusPill value={data.status} />} />
            <InfoCell label="Created" value={formatDate(data.createdAt)} />
            <InfoCell label="Active" value={data.isActive ? "Yes" : "No"} />
          </div>
          {data.remarks && <div className="text-sm"><span className="text-muted-foreground">Remarks: </span>{data.remarks}</div>}
          {attachmentUrls.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {attachmentUrls.map((u, i) => (
                <a key={i} href={u} target="_blank" rel="noreferrer" className="text-xs px-3 py-1.5 rounded-md border border-border bg-muted/30 hover:bg-muted flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5" />{u.split("/").pop()}
                </a>
              ))}
            </div>
          )}
          <Card className="overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/30 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="text-left py-2 px-3">Source</th>
                  <th className="text-left py-2 px-3">Item</th>
                  <th className="text-left py-2 px-3">Order / Product</th>
                  <th className="text-right py-2 px-3">Qty</th>
                  <th className="text-right py-2 px-3">Rate</th>
                  <th className="text-left py-2 px-3">QC</th>
                </tr>
              </thead>
              <tbody>
                {(data.lines ?? []).map((l: {
                  id: number; sourceType: InwardSourceType; itemCode?: string; itemName?: string;
                  quantity: number; rate?: number; isQCPending: boolean; isQCApproved: boolean;
                  orderNumberSnapshot?: string; productNameSnapshot?: string;
                }) => (
                  <tr key={l.id} className="border-t border-border/60">
                    <td className="py-2 px-3 text-xs">{l.sourceType}</td>
                    <td className="py-2 px-3">
                      <div className="font-medium">{l.itemCode}</div>
                      <div className="text-xs text-muted-foreground">{l.itemName}</div>
                    </td>
                    <td className="py-2 px-3 text-xs">
                      {l.orderNumberSnapshot ? (
                        <>
                          <div>{l.orderNumberSnapshot}</div>
                          <div className="text-muted-foreground">{l.productNameSnapshot}</div>
                        </>
                      ) : "—"}
                    </td>
                    <td className="py-2 px-3 text-right tabular-nums">{Number(l.quantity).toFixed(3)}</td>
                    <td className="py-2 px-3 text-right tabular-nums">{l.rate != null ? formatRate(l.rate) : "—"}</td>
                    <td className="py-2 px-3 text-xs">
                      {l.isQCApproved ? <span className="text-emerald-600">Approved</span>
                        : l.isQCPending ? <span className="text-amber-600">Pending</span>
                        : "—"}
                    </td>
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

function InwardStatusPill({ value }: { value: InwardStatus }) {
  const map: Record<string, string> = {
    Draft: "bg-slate-100 text-slate-700 dark:bg-slate-700/40 dark:text-slate-200",
    Submitted: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full ${map[value] ?? "bg-gray-100 text-gray-800"}`}>
      {value}
    </span>
  );
}
