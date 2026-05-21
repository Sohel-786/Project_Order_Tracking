"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import {
  ClipboardCheck, Plus, Search, Eye, Power, Trash2, Upload, FileText, Paperclip, X, Save, CheckCircle2,
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
import { InwardSourceType, QcStatus, QcItemDecision, Party } from "@/types";

// ─────────────────────────────────────── Types

interface QcRow {
  id: number; qcNo: string; status: QcStatus; sourceType: InwardSourceType;
  remarks?: string | null; createdAt: string; approvedAt?: string | null; isActive: boolean;
  partyId: number; partyName?: string | null;
  createdByName?: string | null; approvedByName?: string | null;
  itemCount: number;
}

interface PendingInwardLine {
  id: number;                 // inward line id
  inwardId: number; inwardNo: string;
  sourceType: InwardSourceType; sourceRefId: number;
  quantity: number;
  alreadyQcQty: number;
  vendorName?: string | null;
  itemCode: string; itemName: string;
  orderNumber?: string | null;
  productName?: string | null;
}

interface QcItemDraft {
  key: string;
  inwardLineId: number;
  inwardNo: string;
  itemCode: string; itemName: string;
  orderNumber?: string | null;
  rowQuantity: number;  // available remaining (qty - alreadyQc)
  quantity: number;     // selected for QC
}

interface QcItemView {
  id: number; inwardLineId: number; inwardNo?: string | null;
  quantity: number; approvedQty: number; reworkQty: number; rejectedQty: number;
  decision: QcItemDecision; remarks?: string | null;
  itemCode?: string | null; itemName?: string | null;
  orderNumber?: string | null; productName?: string | null;
}

// ─────────────────────────────────────── Page

export default function QualityControlPage() {
  const { data: permissions } = useCurrentUserPermissions();
  const qc = useQueryClient();

  const [search, setSearch] = useState("");
  const debounced = useDebouncedValue(search, 300);
  const [status, setStatus] = useState<"" | QcStatus>("");
  const [activeOnly, setActiveOnly] = useState(true);
  const [page, setPage] = useState(1);
  const pageSize = DEFAULT_PAGE_SIZE;
  const [createOpen, setCreateOpen] = useState(false);
  const [viewId, setViewId] = useState<number | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["qc-entries", { debounced, status, activeOnly, page, pageSize }],
    queryFn: async (): Promise<{ data: QcRow[]; totalCount: number }> => {
      const params: Record<string, any> = { page, pageSize };
      if (debounced) params.search = debounced;
      if (status)    params.status = status;
      if (activeOnly) params.activeOnly = true;
      const r = await api.get("/quality-control", { params });
      return { data: r.data.data ?? [], totalCount: r.data.totalCount ?? 0 };
    },
    enabled: !!permissions?.viewQC,
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, isActive }: { id: number; isActive: boolean }) =>
      (await api.patch(`/quality-control/${id}/active`, { isActive })).data,
    onSuccess: () => { toast.success("Updated"); qc.invalidateQueries({ queryKey: ["qc-entries"] }); },
    onError: (e: any) => toast.error(e?.response?.data?.message || "Update failed"),
  });

  if (!permissions) return <div className="p-6 text-muted-foreground">Loading…</div>;
  if (!permissions.viewQC) return <div className="p-6 text-rose-600">You do not have permission to view Quality Check.</div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
            <ClipboardCheck className="w-5 h-5 text-primary-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Quality Check</h1>
            <p className="text-sm text-muted-foreground">Inspect inwarded material, mark approved / rework / rejected, and finalise to push into ready stock.</p>
          </div>
        </div>
        {permissions.createQC && (
          <Button onClick={() => setCreateOpen(true)}><Plus className="w-4 h-4 mr-1" />New QC Entry</Button>
        )}
      </div>

      <Card className="p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[240px] space-y-1.5">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Search</Label>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
              <Input className="pl-9" placeholder="Search QC No…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Status</Label>
            <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={status} onChange={(e) => { setStatus(e.target.value as any); setPage(1); }}>
              <option value="">All</option>
              <option value={QcStatus.Pending}>Pending</option>
              <option value={QcStatus.Approved}>Approved</option>
              <option value={QcStatus.Rejected}>Rejected</option>
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
                <th className="text-left py-2.5 px-3">QC No</th>
                <th className="text-left py-2.5 px-3">Source</th>
                <th className="text-left py-2.5 px-3">Party</th>
                <th className="text-right py-2.5 px-3">Items</th>
                <th className="text-left py-2.5 px-3">Created By</th>
                <th className="text-left py-2.5 px-3">Approved By</th>
                <th className="text-left py-2.5 px-3">Status</th>
                <th className="text-right py-2.5 px-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && <tr><td colSpan={8} className="py-6 text-center text-muted-foreground">Loading…</td></tr>}
              {!isLoading && !data?.data.length && (
                <tr><td colSpan={8} className="py-8 text-center text-muted-foreground">No QC entries yet.</td></tr>
              )}
              {data?.data.map(q => (
                <tr key={q.id} className="border-t border-border/60 hover:bg-muted/30 transition-colors">
                  <td className="py-2.5 px-3 font-medium">{q.qcNo}</td>
                  <td className="py-2.5 px-3 text-xs"><span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700/40 text-slate-700 dark:text-slate-200">{q.sourceType}</span></td>
                  <td className="py-2.5 px-3">{q.partyName || "—"}</td>
                  <td className="py-2.5 px-3 text-right">{q.itemCount}</td>
                  <td className="py-2.5 px-3 text-muted-foreground">{q.createdByName || "—"}</td>
                  <td className="py-2.5 px-3 text-muted-foreground">{q.approvedByName || "—"}</td>
                  <td className="py-2.5 px-3"><QcStatusPill value={q.status} /></td>
                  <td className="py-2.5 px-3 text-right">
                    <div className="inline-flex items-center gap-1.5">
                      <Button size="sm" variant="outline" title="Decisions / View" onClick={() => setViewId(q.id)}><Eye className="w-4 h-4" /></Button>
                      {permissions.editQC && (
                        <Button size="sm" variant="outline" title={q.isActive ? "Deactivate" : "Activate"}
                          onClick={() => {
                            if (q.isActive && !window.confirm(`Deactivate QC ${q.qcNo}?`)) return;
                            toggleActive.mutate({ id: q.id, isActive: !q.isActive });
                          }}>
                          <Power className={`w-4 h-4 ${q.isActive ? "text-emerald-500" : "text-muted-foreground"}`} />
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

      {createOpen && <CreateQcDialog open={createOpen} onClose={() => setCreateOpen(false)} />}
      {viewId !== null && <QcDetailDialog id={viewId} onClose={() => setViewId(null)} />}
    </div>
  );
}

// ─────────────────────────────────────── Create

function CreateQcDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const [sourceType, setSourceType] = useState<InwardSourceType>(InwardSourceType.PO);
  const [partyId, setPartyId] = useState<number | "">("");
  const [remarks, setRemarks] = useState("");
  const [attachments, setAttachments] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [items, setItems] = useState<QcItemDraft[]>([]);
  const [pickSearch, setPickSearch] = useState("");
  const debouncedPick = useDebouncedValue(pickSearch, 250);

  const { data: nextCode } = useQuery({
    queryKey: ["qc-entries", "next-code"],
    queryFn: async (): Promise<string> => (await api.get("/quality-control/next-code")).data.data,
  });

  const { data: parties } = useQuery({
    queryKey: ["parties-active", "all"],
    queryFn: async (): Promise<Party[]> => (await api.get("/parties/active")).data.data ?? [],
  });

  const { data: lines } = useQuery({
    queryKey: ["qc-pending-lines", sourceType],
    queryFn: async (): Promise<PendingInwardLine[]> => {
      const r = await api.get("/quality-control/pending-inward-lines", { params: { sourceType } });
      return r.data.data ?? [];
    },
  });

  const available = useMemo(() => {
    if (!lines) return [] as PendingInwardLine[];
    const used = new Set(items.map(i => i.inwardLineId));
    let list = lines.filter(l => !used.has(l.id) && Number(l.quantity) - Number(l.alreadyQcQty) > 0);
    if (debouncedPick) {
      const q = debouncedPick.toLowerCase();
      list = list.filter(a => a.inwardNo.toLowerCase().includes(q) || a.itemCode.toLowerCase().includes(q) || a.itemName.toLowerCase().includes(q) || (a.vendorName ?? "").toLowerCase().includes(q));
    }
    return list;
  }, [lines, items, debouncedPick]);

  const upload = async (file: File) => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const r = await api.post("/quality-control/upload-attachment", fd, { headers: { "Content-Type": "multipart/form-data" } });
      const url = r.data.data?.url;
      if (url) { setAttachments(prev => [...prev, url]); toast.success("Attachment uploaded"); }
    } catch (e: any) { toast.error(e?.response?.data?.message || "Upload failed"); }
    finally { setUploading(false); }
  };

  const add = (l: PendingInwardLine) => {
    const remaining = Math.max(0, Number(l.quantity) - Number(l.alreadyQcQty));
    setItems(prev => [...prev, {
      key: `line-${l.id}`,
      inwardLineId: l.id,
      inwardNo: l.inwardNo,
      itemCode: l.itemCode,
      itemName: l.itemName,
      orderNumber: l.orderNumber,
      rowQuantity: remaining,
      quantity: remaining,
    }]);
  };
  const remove = (key: string) => setItems(prev => prev.filter(r => r.key !== key));
  const update = (key: string, patch: Partial<QcItemDraft>) => setItems(prev => prev.map(r => r.key === key ? { ...r, ...patch } : r));

  const create = useMutation({
    mutationFn: async () => {
      const body = {
        partyId: Number(partyId),
        sourceType,
        remarks: remarks || null,
        attachmentUrls: attachments.length ? attachments : null,
        items: items.map(i => ({ inwardLineId: i.inwardLineId, quantity: Number(i.quantity) })),
      };
      const r = await api.post("/quality-control", body);
      return r.data;
    },
    onSuccess: () => {
      toast.success("QC entry created");
      qc.invalidateQueries({ queryKey: ["qc-entries"] });
      qc.invalidateQueries({ queryKey: ["qc-pending-lines"] });
      onClose();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || "Failed to create QC entry"),
  });

  const submit = () => {
    if (!partyId) { toast.error("Party is required"); return; }
    if (items.length === 0) { toast.error("Add at least one line"); return; }
    for (const it of items) {
      if (!it.quantity || it.quantity <= 0) { toast.error("Quantity must be > 0"); return; }
      if (it.quantity > it.rowQuantity) { toast.error(`Quantity for ${it.itemCode} exceeds remaining (${it.rowQuantity})`); return; }
    }
    create.mutate();
  };

  return (
    <Dialog isOpen={open} onClose={onClose} title={`New QC Entry${nextCode ? `  ·  ${nextCode}` : ""}`} size="full">
      <div className="grid grid-cols-1 lg:grid-cols-6 gap-4 h-full">
        {/* Left: pending inward lines */}
        <Card className="lg:col-span-2 flex flex-col min-h-0 overflow-hidden">
          <div className="flex border-b border-border bg-muted/20">
            <button onClick={() => setSourceType(InwardSourceType.PO)} className={`flex-1 py-2 text-xs font-semibold uppercase tracking-wider ${sourceType === InwardSourceType.PO ? "text-primary-600 border-b-2 border-primary-500" : "text-muted-foreground"}`}>PO Inwards</button>
            <button onClick={() => setSourceType(InwardSourceType.JobWork)} className={`flex-1 py-2 text-xs font-semibold uppercase tracking-wider ${sourceType === InwardSourceType.JobWork ? "text-primary-600 border-b-2 border-primary-500" : "text-muted-foreground"}`}>JW Inwards</button>
          </div>
          <div className="p-3 border-b border-border">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
              <Input className="pl-9" placeholder="Search inward / item…" value={pickSearch} onChange={(e) => setPickSearch(e.target.value)} />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {available.length === 0 && <p className="text-xs text-center p-4 text-muted-foreground">No pending QC lines.</p>}
            {available.map(l => {
              const remaining = Math.max(0, Number(l.quantity) - Number(l.alreadyQcQty));
              return (
                <button key={l.id} onClick={() => add(l)}
                  className="w-full text-left text-xs px-3 py-2 my-0.5 rounded-md bg-background border border-border hover:bg-primary-50 dark:hover:bg-primary-900/30 hover:border-primary-300 transition-colors">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">{l.itemCode}</span>
                    <span className="text-[10px] uppercase text-muted-foreground">INW {l.inwardNo}</span>
                  </div>
                  <div className="text-muted-foreground truncate">{l.itemName}</div>
                  <div className="text-[10px] mt-1 flex gap-2 flex-wrap">
                    <span className="text-amber-600 font-medium">Remaining {remaining.toFixed(3)}</span>
                    <span className="text-muted-foreground">Inward Qty {Number(l.quantity).toFixed(3)}</span>
                    <span className="text-muted-foreground">QC'd {Number(l.alreadyQcQty).toFixed(3)}</span>
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">{l.vendorName || "—"}{l.orderNumber ? ` · ${l.orderNumber}` : ""}</div>
                </button>
              );
            })}
          </div>
        </Card>

        {/* Right */}
        <div className="lg:col-span-4 flex flex-col min-h-0">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
            <div className="space-y-1.5">
              <Label>Source Type</Label>
              <select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={sourceType} onChange={(e) => { setSourceType(e.target.value as InwardSourceType); setItems([]); }}>
                <option value={InwardSourceType.PO}>PO</option>
                <option value={InwardSourceType.JobWork}>Job Work</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Party *</Label>
              <select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={partyId} onChange={(e) => setPartyId(e.target.value ? Number(e.target.value) : "")}>
                <option value="">Select party…</option>
                {parties?.map(p => <option key={p.id} value={p.id}>{p.partyName} ({p.partyType})</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Attachments</Label>
              <div className="flex items-center gap-2">
                <input ref={fileRef} type="file" accept=".pdf,.png,.jpg,.jpeg,.webp" className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ""; }} />
                <Button variant="outline" type="button" onClick={() => fileRef.current?.click()} loading={uploading}>
                  <Upload className="w-4 h-4 mr-1" />Upload
                </Button>
                {attachments.length > 0 && <span className="text-xs text-muted-foreground flex items-center gap-1"><Paperclip className="w-3 h-3" />{attachments.length}</span>}
              </div>
              {attachments.length > 0 && (
                <div className="text-xs space-y-1 mt-1">
                  {attachments.map((u, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <a href={u} target="_blank" rel="noreferrer" className="text-primary-600 truncate hover:underline">{u.split("/").pop()}</a>
                      <button type="button" className="text-rose-500" onClick={() => setAttachments(prev => prev.filter((_, i) => i !== idx))}><X className="w-3 h-3" /></button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="space-y-1.5 col-span-2 md:col-span-3">
              <Label>Remarks</Label>
              <Textarea rows={2} value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Optional remarks…" />
            </div>
          </div>

          <Card className="flex-1 min-h-0 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/20">
              <h4 className="font-semibold text-sm">QC Items ({items.length})</h4>
              <span className="text-xs text-muted-foreground">Decisions can be entered after creation.</span>
            </div>
            <div className="flex-1 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/20 text-xs uppercase tracking-wider text-muted-foreground sticky top-0">
                  <tr>
                    <th className="text-left py-2 px-3">Inward / Item</th>
                    <th className="text-left py-2 px-3">Order</th>
                    <th className="text-right py-2 px-3 w-28">Remaining</th>
                    <th className="text-right py-2 px-3 w-32">Quantity *</th>
                    <th className="text-right py-2 px-3 w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {items.length === 0 && (
                    <tr><td colSpan={5} className="py-12 text-center text-muted-foreground text-sm">Pick pending inward lines from the left panel.</td></tr>
                  )}
                  {items.map(it => (
                    <tr key={it.key} className="border-t border-border/60">
                      <td className="py-2 px-3">
                        <div className="text-[10px] uppercase text-muted-foreground">INW {it.inwardNo}</div>
                        <div className="font-medium">{it.itemCode}</div>
                        <div className="text-xs text-muted-foreground truncate max-w-[280px]">{it.itemName}</div>
                      </td>
                      <td className="py-2 px-3 text-xs text-muted-foreground">{it.orderNumber || "—"}</td>
                      <td className="py-2 px-3 text-right text-xs text-amber-600 font-medium tabular-nums">{it.rowQuantity.toFixed(3)}</td>
                      <td className="py-2 px-3">
                        <Input type="number" step="0.001" min="0" max={it.rowQuantity} className="h-8 text-right" value={it.quantity}
                          onChange={(e) => update(it.key, { quantity: Number(e.target.value) })} />
                      </td>
                      <td className="py-2 px-3 text-right">
                        <Button size="sm" variant="ghost" className="text-rose-500" onClick={() => remove(it.key)}>
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
          <Plus className="w-4 h-4 mr-1" />Create QC Entry
        </Button>
      </div>
    </Dialog>
  );
}

// ─────────────────────────────────────── Detail / Decision dialog

function QcDetailDialog({ id, onClose }: { id: number; onClose: () => void }) {
  const qc = useQueryClient();
  const { data: permissions } = useCurrentUserPermissions();
  const canEdit = !!permissions?.editQC;
  const canFinalize = !!permissions?.approveQC;

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["qc-entry", id],
    queryFn: async (): Promise<any> => (await api.get(`/quality-control/${id}`)).data.data,
  });

  const [decisions, setDecisions] = useState<Record<number, { approvedQty: number; reworkQty: number; rejectedQty: number; remarks: string }>>({});

  useEffect(() => {
    if (!data?.items) return;
    const map: Record<number, any> = {};
    (data.items as QcItemView[]).forEach(it => {
      map[it.id] = {
        approvedQty: Number(it.approvedQty || 0),
        reworkQty:   Number(it.reworkQty   || 0),
        rejectedQty: Number(it.rejectedQty || 0),
        remarks:     it.remarks || "",
      };
    });
    setDecisions(map);
  }, [data]);

  const isPending = data?.status === QcStatus.Pending;

  const save = useMutation({
    mutationFn: async () => {
      const body = (data?.items as QcItemView[]).map(it => ({
        qcItemId: it.id,
        approvedQty: Number(decisions[it.id]?.approvedQty || 0),
        reworkQty:   Number(decisions[it.id]?.reworkQty   || 0),
        rejectedQty: Number(decisions[it.id]?.rejectedQty || 0),
        remarks:     decisions[it.id]?.remarks || null,
      }));
      const r = await api.post(`/quality-control/${id}/decision`, body);
      return r.data;
    },
    onSuccess: () => { toast.success("Decisions saved"); refetch(); qc.invalidateQueries({ queryKey: ["qc-entries"] }); },
    onError: (e: any) => toast.error(e?.response?.data?.message || "Failed to save decisions"),
  });

  const finalize = useMutation({
    mutationFn: async () => (await api.post(`/quality-control/${id}/finalize`)).data,
    onSuccess: () => { toast.success("QC finalised"); refetch(); qc.invalidateQueries({ queryKey: ["qc-entries"] }); },
    onError: (e: any) => toast.error(e?.response?.data?.message || "Failed to finalise"),
  });

  const updateDec = (qcItemId: number, patch: Partial<{ approvedQty: number; reworkQty: number; rejectedQty: number; remarks: string }>) =>
    setDecisions(prev => ({ ...prev, [qcItemId]: { ...prev[qcItemId], ...patch } }));

  const attachments: string[] = useMemo(() => {
    try { return data?.attachmentUrlsJson ? JSON.parse(data.attachmentUrlsJson) : []; } catch { return []; }
  }, [data]);

  return (
    <Dialog isOpen={true} onClose={onClose} title={data?.qcNo ? `QC · ${data.qcNo}` : "QC Entry"} size="full">
      {isLoading || !data ? (
        <p className="py-10 text-center text-muted-foreground">Loading…</p>
      ) : (
        <div className="space-y-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <InfoCell label="QC No" value={data.qcNo} />
            <InfoCell label="Source" value={data.sourceType} />
            <InfoCell label="Party" value={data.partyName || "—"} />
            <InfoCell label="Status" value={<QcStatusPill value={data.status} />} />
            <InfoCell label="Created" value={`${formatDate(data.createdAt)}`} />
            <InfoCell label="Approved" value={data.approvedAt ? formatDate(data.approvedAt) : "—"} />
            <InfoCell label="Active" value={data.isActive ? "Yes" : "No"} />
            <InfoCell label="Items" value={(data.items ?? []).length} />
          </div>
          {attachments.length > 0 && (
            <div className="space-y-2">
              <Label>Attachments</Label>
              <div className="flex flex-wrap gap-2">
                {attachments.map((u, i) => (
                  <a key={i} href={u} target="_blank" rel="noreferrer" className="text-xs px-3 py-1.5 rounded-md border border-border bg-muted/30 hover:bg-muted flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5" />{u.split("/").pop()}
                  </a>
                ))}
              </div>
            </div>
          )}
          {data.remarks && <div className="text-sm"><span className="text-muted-foreground">Remarks: </span>{data.remarks}</div>}

          <Card className="overflow-hidden">
            <div className="px-4 py-2.5 border-b border-border bg-muted/20 flex items-center justify-between">
              <h4 className="text-sm font-semibold">Items & Decisions</h4>
              <span className="text-xs text-muted-foreground">For each row: Approved + Rework + Rejected ≤ Quantity</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/20 text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="text-left py-2 px-3">Inward / Item</th>
                    <th className="text-left py-2 px-3">Order / Product</th>
                    <th className="text-right py-2 px-3 w-24">Quantity</th>
                    <th className="text-right py-2 px-3 w-32">Approved</th>
                    <th className="text-right py-2 px-3 w-32">Rework</th>
                    <th className="text-right py-2 px-3 w-32">Rejected</th>
                    <th className="text-left py-2 px-3 w-32">Decision</th>
                    <th className="text-left py-2 px-3">Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {(data.items as QcItemView[]).map(it => {
                    const d = decisions[it.id] ?? { approvedQty: 0, reworkQty: 0, rejectedQty: 0, remarks: "" };
                    const sum = Number(d.approvedQty || 0) + Number(d.reworkQty || 0) + Number(d.rejectedQty || 0);
                    const overflow = sum > Number(it.quantity);
                    const derivedDecision =
                      sum === 0 ? QcItemDecision.Pending :
                      Number(d.approvedQty) === Number(it.quantity) ? QcItemDecision.Approved :
                      Number(d.rejectedQty) === Number(it.quantity) ? QcItemDecision.Rejected :
                      Number(d.reworkQty) === Number(it.quantity) ? QcItemDecision.Rework :
                      QcItemDecision.Pending;
                    return (
                      <tr key={it.id} className="border-t border-border/60">
                        <td className="py-2 px-3">
                          <div className="text-[10px] uppercase text-muted-foreground">INW {it.inwardNo}</div>
                          <div className="font-medium">{it.itemCode}</div>
                          <div className="text-xs text-muted-foreground">{it.itemName}</div>
                        </td>
                        <td className="py-2 px-3 text-xs">
                          {it.orderNumber ? (<>
                            <div className="font-medium">{it.orderNumber}</div>
                            <div className="text-muted-foreground">{it.productName}</div>
                          </>) : <span className="text-muted-foreground italic">—</span>}
                        </td>
                        <td className="py-2 px-3 text-right tabular-nums">{Number(it.quantity).toFixed(3)}</td>
                        <td className="py-2 px-3">
                          <Input type="number" step="0.001" min="0" max={it.quantity} disabled={!canEdit || !isPending}
                            className={`h-8 text-right ${overflow ? "border-rose-500" : ""}`} value={d.approvedQty}
                            onChange={(e) => updateDec(it.id, { approvedQty: Number(e.target.value) })} />
                        </td>
                        <td className="py-2 px-3">
                          <Input type="number" step="0.001" min="0" max={it.quantity} disabled={!canEdit || !isPending}
                            className={`h-8 text-right ${overflow ? "border-rose-500" : ""}`} value={d.reworkQty}
                            onChange={(e) => updateDec(it.id, { reworkQty: Number(e.target.value) })} />
                        </td>
                        <td className="py-2 px-3">
                          <Input type="number" step="0.001" min="0" max={it.quantity} disabled={!canEdit || !isPending}
                            className={`h-8 text-right ${overflow ? "border-rose-500" : ""}`} value={d.rejectedQty}
                            onChange={(e) => updateDec(it.id, { rejectedQty: Number(e.target.value) })} />
                        </td>
                        <td className="py-2 px-3"><DecisionPill value={derivedDecision} /></td>
                        <td className="py-2 px-3">
                          <Input className="h-8" disabled={!canEdit || !isPending} value={d.remarks}
                            onChange={(e) => updateDec(it.id, { remarks: e.target.value })} placeholder="—" />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      <div className="flex justify-end gap-2 pt-4 border-t border-border mt-4">
        <Button variant="outline" onClick={onClose}>Close</Button>
        {data && isPending && canEdit && (
          <Button onClick={() => save.mutate()} loading={save.isPending} variant="outline">
            <Save className="w-4 h-4 mr-1" />Save Decisions
          </Button>
        )}
        {data && isPending && canFinalize && (
          <Button onClick={() => {
            if (!window.confirm("Finalise QC? This pushes approved qty into ready stock and cannot be undone.")) return;
            finalize.mutate();
          }} loading={finalize.isPending}>
            <CheckCircle2 className="w-4 h-4 mr-1" />Finalise
          </Button>
        )}
      </div>
    </Dialog>
  );
}

// ─────────────────────────────────────── Helpers

function InfoCell({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="font-medium mt-0.5">{value}</div>
    </div>
  );
}

function QcStatusPill({ value }: { value: QcStatus }) {
  const map: Record<string, string> = {
    Pending:  "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
    Approved: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
    Rejected: "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300",
  };
  return <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full ${map[value] ?? "bg-gray-100 text-gray-800"}`}>{value}</span>;
}

function DecisionPill({ value }: { value: QcItemDecision }) {
  const map: Record<string, string> = {
    Pending:  "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
    Approved: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
    Rework:   "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
    Rejected: "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300",
  };
  return <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full ${map[value] ?? "bg-gray-100 text-gray-800"}`}>{value}</span>;
}
