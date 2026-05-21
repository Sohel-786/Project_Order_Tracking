"use client";

import { useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import {
  Briefcase, Plus, Search, Eye, Power, Trash2, Upload, FileText, Paperclip, X, CheckCircle2,
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
import { JobWorkStatus, Party, PartyType, ProcessMaster, ProcessType } from "@/types";

// ─────────────────────────────────────── Types

interface JWRow {
  id: number; jobWorkNo: string; status: JobWorkStatus;
  outwardDate: string; expectedReturnDate?: string | null; inwardDate?: string | null;
  remarks?: string | null;
  toPartyId: number; toPartyName?: string | null;
  processId?: number | null; processName?: string | null;
  createdAt: string; isActive: boolean; createdByName?: string | null;
  itemCount: number; totalQty: number;
}

interface ApprovedPIItem {
  id: number; piId: number; piNo: string; piPriority: string;
  itemId: number; itemName: string; itemCode: string;
  quantity: number;
  orderId?: number | null; orderNumber?: string | null;
  alreadyOrderedQty: number;
  jobWorkSentQty: number;
}

interface JWItemDraft {
  key: string;
  purchaseIndentItemId: number;
  piNo: string;
  itemCode: string; itemName: string;
  orderNumber?: string | null;
  pendingQty: number;
  quantity: number;
  rate: number;
  gstPercent: number;
  remarks?: string;
}

// ─────────────────────────────────────── Page

export default function JobWorksPage() {
  const { data: permissions } = useCurrentUserPermissions();
  const qc = useQueryClient();

  const [search, setSearch] = useState("");
  const debounced = useDebouncedValue(search, 300);
  const [status, setStatus] = useState<"" | JobWorkStatus>("");
  const [activeOnly, setActiveOnly] = useState(true);
  const [page, setPage] = useState(1);
  const pageSize = DEFAULT_PAGE_SIZE;
  const [createOpen, setCreateOpen] = useState(false);
  const [viewId, setViewId] = useState<number | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["job-works", { debounced, status, activeOnly, page, pageSize }],
    queryFn: async (): Promise<{ data: JWRow[]; totalCount: number }> => {
      const params: Record<string, any> = { page, pageSize };
      if (debounced) params.search = debounced;
      if (status)    params.status = status;
      if (activeOnly) params.activeOnly = true;
      const r = await api.get("/job-works", { params });
      return { data: r.data.data ?? [], totalCount: r.data.totalCount ?? 0 };
    },
    enabled: !!permissions?.viewJobWork,
  });

  const markCompleted = useMutation({
    mutationFn: async (id: number) => (await api.post(`/job-works/${id}/mark-completed`)).data,
    onSuccess: () => { toast.success("Job work marked completed"); qc.invalidateQueries({ queryKey: ["job-works"] }); },
    onError: (e: any) => toast.error(e?.response?.data?.message || "Failed"),
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, isActive }: { id: number; isActive: boolean }) =>
      (await api.patch(`/job-works/${id}/active`, { isActive })).data,
    onSuccess: () => { toast.success("Updated"); qc.invalidateQueries({ queryKey: ["job-works"] }); },
    onError: (e: any) => toast.error(e?.response?.data?.message || "Update failed"),
  });

  if (!permissions) return <div className="p-6 text-muted-foreground">Loading…</div>;
  if (!permissions.viewJobWork) return <div className="p-6 text-rose-600">You do not have permission to view Job Work.</div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
            <Briefcase className="w-5 h-5 text-primary-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Job Work</h1>
            <p className="text-sm text-muted-foreground">Send approved PI items out for outside processing and track returns.</p>
          </div>
        </div>
        {permissions.createJobWork && (
          <Button onClick={() => setCreateOpen(true)}><Plus className="w-4 h-4 mr-1" />New Job Work</Button>
        )}
      </div>

      <Card className="p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[240px] space-y-1.5">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Search</Label>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
              <Input className="pl-9" placeholder="Search JW No or party…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Status</Label>
            <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={status} onChange={(e) => { setStatus(e.target.value as any); setPage(1); }}>
              <option value="">All</option>
              <option value={JobWorkStatus.Pending}>Pending</option>
              <option value={JobWorkStatus.InTransit}>In Transit</option>
              <option value={JobWorkStatus.Completed}>Completed</option>
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
                <th className="text-left py-2.5 px-3">JW No</th>
                <th className="text-left py-2.5 px-3">To Party</th>
                <th className="text-left py-2.5 px-3">Process</th>
                <th className="text-left py-2.5 px-3">Outward</th>
                <th className="text-left py-2.5 px-3">Expected Return</th>
                <th className="text-left py-2.5 px-3">Status</th>
                <th className="text-right py-2.5 px-3">Items</th>
                <th className="text-right py-2.5 px-3">Total Qty</th>
                <th className="text-right py-2.5 px-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && <tr><td colSpan={9} className="py-6 text-center text-muted-foreground">Loading…</td></tr>}
              {!isLoading && !data?.data.length && (
                <tr><td colSpan={9} className="py-8 text-center text-muted-foreground">No job works yet.</td></tr>
              )}
              {data?.data.map(j => (
                <tr key={j.id} className="border-t border-border/60 hover:bg-muted/30 transition-colors">
                  <td className="py-2.5 px-3 font-medium">{j.jobWorkNo}</td>
                  <td className="py-2.5 px-3">{j.toPartyName || "—"}</td>
                  <td className="py-2.5 px-3 text-muted-foreground">{j.processName || "—"}</td>
                  <td className="py-2.5 px-3 text-muted-foreground">{formatDate(j.outwardDate)}</td>
                  <td className="py-2.5 px-3 text-muted-foreground">{formatDate(j.expectedReturnDate)}</td>
                  <td className="py-2.5 px-3"><JWStatusPill value={j.status} /></td>
                  <td className="py-2.5 px-3 text-right">{j.itemCount}</td>
                  <td className="py-2.5 px-3 text-right tabular-nums">{Number(j.totalQty).toFixed(3)}</td>
                  <td className="py-2.5 px-3 text-right">
                    <div className="inline-flex items-center gap-1.5">
                      <Button size="sm" variant="outline" title="View" onClick={() => setViewId(j.id)}><Eye className="w-4 h-4" /></Button>
                      {permissions.editJobWork && j.status !== JobWorkStatus.Completed && (
                        <Button size="sm" variant="outline" className="text-emerald-600" title="Mark Completed"
                          onClick={() => { if (window.confirm(`Mark ${j.jobWorkNo} as Completed?`)) markCompleted.mutate(j.id); }}>
                          <CheckCircle2 className="w-4 h-4" />
                        </Button>
                      )}
                      {permissions.editJobWork && (
                        <Button size="sm" variant="outline" title={j.isActive ? "Deactivate" : "Activate"}
                          onClick={() => {
                            if (j.isActive && !window.confirm(`Deactivate JW ${j.jobWorkNo}?`)) return;
                            toggleActive.mutate({ id: j.id, isActive: !j.isActive });
                          }}>
                          <Power className={`w-4 h-4 ${j.isActive ? "text-emerald-500" : "text-muted-foreground"}`} />
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

      {createOpen && <CreateJWDialog open={createOpen} onClose={() => setCreateOpen(false)} />}
      {viewId !== null && <ViewJWDialog id={viewId} onClose={() => setViewId(null)} />}
    </div>
  );
}

// ─────────────────────────────────────── Create

function CreateJWDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const [toPartyId, setToPartyId] = useState<number | "">("");
  const [processId, setProcessId] = useState<number | "">("");
  const [outwardDate, setOutwardDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [expectedReturn, setExpectedReturn] = useState<string>("");
  const [description, setDescription] = useState("");
  const [remarks, setRemarks] = useState("");
  const [attachments, setAttachments] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [items, setItems] = useState<JWItemDraft[]>([]);
  const [pickSearch, setPickSearch] = useState("");
  const debouncedPick = useDebouncedValue(pickSearch, 250);

  const { data: nextCode } = useQuery({
    queryKey: ["job-works", "next-code"],
    queryFn: async (): Promise<string> => (await api.get("/job-works/next-code")).data.data,
  });

  const { data: parties } = useQuery({
    queryKey: ["parties-active", PartyType.JobWorkVendor],
    queryFn: async (): Promise<Party[]> => (await api.get("/parties/active", { params: { type: PartyType.JobWorkVendor } })).data.data ?? [],
  });

  const { data: processes } = useQuery({
    queryKey: ["processes-active", ProcessType.JobWork],
    queryFn: async (): Promise<ProcessMaster[]> => (await api.get("/processes/active", { params: { type: ProcessType.JobWork } })).data.data ?? [],
  });

  const { data: approvedItems } = useQuery({
    queryKey: ["pi-approved-items", "JobWork"],
    queryFn: async (): Promise<ApprovedPIItem[]> => (await api.get("/purchase-indents/approved-items", { params: { indentFor: "JobWork" } })).data.data ?? [],
  });

  const filteredAvailable = useMemo(() => {
    if (!approvedItems) return [] as ApprovedPIItem[];
    const used = new Set(items.map(i => i.purchaseIndentItemId));
    let list = approvedItems.filter(a => !used.has(a.id) && Number(a.quantity) - Number(a.jobWorkSentQty) > 0);
    if (debouncedPick) {
      const q = debouncedPick.toLowerCase();
      list = list.filter(a => a.itemCode.toLowerCase().includes(q) || a.itemName.toLowerCase().includes(q) || a.piNo.toLowerCase().includes(q) || (a.orderNumber ?? "").toLowerCase().includes(q));
    }
    return list;
  }, [approvedItems, items, debouncedPick]);

  const upload = async (file: File) => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const r = await api.post("/job-works/upload-attachment", fd, { headers: { "Content-Type": "multipart/form-data" } });
      const url = r.data.data?.url;
      if (url) { setAttachments(prev => [...prev, url]); toast.success("Attachment uploaded"); }
    } catch (e: any) { toast.error(e?.response?.data?.message || "Upload failed"); }
    finally { setUploading(false); }
  };

  const addRow = (a: ApprovedPIItem) => {
    const pending = Math.max(0, Number(a.quantity) - Number(a.jobWorkSentQty));
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
      gstPercent: 0,
      remarks: "",
    }]);
  };
  const remove = (key: string) => setItems(prev => prev.filter(r => r.key !== key));
  const update = (key: string, patch: Partial<JWItemDraft>) => setItems(prev => prev.map(r => r.key === key ? { ...r, ...patch } : r));

  const create = useMutation({
    mutationFn: async () => {
      const body = {
        toPartyId: Number(toPartyId),
        processId: processId === "" ? null : Number(processId),
        outwardDate: outwardDate || null,
        expectedReturnDate: expectedReturn || null,
        description: description || null,
        remarks: remarks || null,
        attachmentUrls: attachments.length ? attachments : null,
        items: items.map(i => ({
          purchaseIndentItemId: i.purchaseIndentItemId,
          quantity: Number(i.quantity),
          rate: Number(i.rate) || null,
          gstPercent: Number(i.gstPercent) || null,
          remarks: i.remarks || null,
        })),
      };
      const r = await api.post("/job-works", body);
      return r.data;
    },
    onSuccess: () => {
      toast.success("Job work created");
      qc.invalidateQueries({ queryKey: ["job-works"] });
      qc.invalidateQueries({ queryKey: ["pi-approved-items"] });
      qc.invalidateQueries({ queryKey: ["jw-pending-for-inward"] });
      onClose();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || "Failed to create JW"),
  });

  const submit = () => {
    if (!toPartyId) { toast.error("To Party is required"); return; }
    if (items.length === 0) { toast.error("Add at least one item"); return; }
    for (const i of items) {
      if (!i.quantity || i.quantity <= 0) { toast.error("Quantity must be > 0"); return; }
      if (i.quantity > i.pendingQty) { toast.error(`Quantity for ${i.itemCode} exceeds pending (${i.pendingQty})`); return; }
    }
    create.mutate();
  };

  return (
    <Dialog isOpen={open} onClose={onClose} title={`New Job Work${nextCode ? `  ·  ${nextCode}` : ""}`} size="full">
      <div className="grid grid-cols-1 lg:grid-cols-6 gap-4 h-full">
        {/* Left: approved JW PI items */}
        <Card className="lg:col-span-2 flex flex-col min-h-0 overflow-hidden">
          <div className="px-3 py-2 border-b border-border bg-muted/20">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Approved Job Work PI items</h4>
          </div>
          <div className="p-3 border-b border-border">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
              <Input className="pl-9" placeholder="Search PI / item / order…" value={pickSearch} onChange={(e) => setPickSearch(e.target.value)} />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {filteredAvailable.length === 0 && <p className="text-xs text-center p-4 text-muted-foreground">No pending JW-purpose PI items.</p>}
            {filteredAvailable.map(a => {
              const pending = Math.max(0, Number(a.quantity) - Number(a.jobWorkSentQty));
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
                    <span className="text-muted-foreground">Sent {Number(a.jobWorkSentQty).toFixed(3)}</span>
                    {a.orderNumber && <span className="text-blue-600 dark:text-blue-300">· {a.orderNumber}</span>}
                  </div>
                </button>
              );
            })}
          </div>
        </Card>

        {/* Right */}
        <div className="lg:col-span-4 flex flex-col min-h-0">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
            <div className="space-y-1.5">
              <Label>To Party *</Label>
              <select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={toPartyId} onChange={(e) => setToPartyId(e.target.value ? Number(e.target.value) : "")}>
                <option value="">Select job work vendor…</option>
                {parties?.map(p => <option key={p.id} value={p.id}>{p.partyName}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Process</Label>
              <select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={processId} onChange={(e) => setProcessId(e.target.value ? Number(e.target.value) : "")}>
                <option value="">—</option>
                {processes?.map(p => <option key={p.id} value={p.id}>{p.processName}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Outward Date *</Label>
              <Input type="date" value={outwardDate} onChange={(e) => setOutwardDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Expected Return Date</Label>
              <Input type="date" value={expectedReturn} onChange={(e) => setExpectedReturn(e.target.value)} />
            </div>
            <div className="space-y-1.5 col-span-2 md:col-span-2">
              <Label>Description</Label>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Short description of work scope…" />
            </div>
            <div className="space-y-1.5 col-span-2 md:col-span-2">
              <Label>Remarks</Label>
              <Textarea rows={2} value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Optional remarks…" />
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
                    <th className="text-left py-2 px-3">PI / Item</th>
                    <th className="text-left py-2 px-3">Order</th>
                    <th className="text-right py-2 px-3 w-24">Pending</th>
                    <th className="text-right py-2 px-3 w-28">Qty *</th>
                    <th className="text-right py-2 px-3 w-24">Rate</th>
                    <th className="text-right py-2 px-3 w-20">GST %</th>
                    <th className="text-left py-2 px-3">Remarks</th>
                    <th className="text-right py-2 px-3 w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {items.length === 0 && (
                    <tr><td colSpan={8} className="py-12 text-center text-muted-foreground text-sm">Pick PI items from the left panel to add them here.</td></tr>
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
                          onChange={(e) => update(it.key, { quantity: Number(e.target.value) })} />
                      </td>
                      <td className="py-2 px-3">
                        <Input type="number" step="0.01" min="0" className="h-8 text-right" value={it.rate}
                          onChange={(e) => update(it.key, { rate: Number(e.target.value) })} />
                      </td>
                      <td className="py-2 px-3">
                        <Input type="number" step="0.01" min="0" className="h-8 text-right" value={it.gstPercent}
                          onChange={(e) => update(it.key, { gstPercent: Number(e.target.value) })} />
                      </td>
                      <td className="py-2 px-3">
                        <Input className="h-8" value={it.remarks ?? ""} onChange={(e) => update(it.key, { remarks: e.target.value })} placeholder="—" />
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
          <Plus className="w-4 h-4 mr-1" />Create Job Work
        </Button>
      </div>
    </Dialog>
  );
}

// ─────────────────────────────────────── View

function ViewJWDialog({ id, onClose }: { id: number; onClose: () => void }) {
  const { data, isLoading } = useQuery({
    queryKey: ["job-work", id],
    queryFn: async (): Promise<any> => (await api.get(`/job-works/${id}`)).data.data,
  });
  const attachments: string[] = useMemo(() => {
    try { return data?.attachmentUrlsJson ? JSON.parse(data.attachmentUrlsJson) : []; } catch { return []; }
  }, [data]);
  return (
    <Dialog isOpen={true} onClose={onClose} title={data?.jobWorkNo ? `JW · ${data.jobWorkNo}` : "Job Work"} size="xl">
      {isLoading || !data ? (
        <p className="py-10 text-center text-muted-foreground">Loading…</p>
      ) : (
        <div className="space-y-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <InfoCell label="JW No" value={data.jobWorkNo} />
            <InfoCell label="To Party" value={data.toPartyName || "—"} />
            <InfoCell label="Process" value={data.processName || "—"} />
            <InfoCell label="Status" value={<JWStatusPill value={data.status} />} />
            <InfoCell label="Outward Date" value={formatDate(data.outwardDate)} />
            <InfoCell label="Expected Return" value={formatDate(data.expectedReturnDate)} />
            <InfoCell label="Returned" value={formatDate(data.inwardDate)} />
            <InfoCell label="Active" value={data.isActive ? "Yes" : "No"} />
            <InfoCell label="Created" value={`${formatDate(data.createdAt)} · ${data.createdByName || "—"}`} />
            <InfoCell label="Document" value={data.documentNo ? `${data.documentNo} · ${data.revisionNo ?? ""}` : "—"} />
          </div>
          {data.description && <div className="text-sm"><span className="text-muted-foreground">Description: </span>{data.description}</div>}
          {data.remarks && <div className="text-sm"><span className="text-muted-foreground">Remarks: </span>{data.remarks}</div>}
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
          <Card className="overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/30 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="text-left py-2 px-3">PI · Item</th>
                  <th className="text-left py-2 px-3">Order / Product</th>
                  <th className="text-right py-2 px-3">Qty</th>
                  <th className="text-right py-2 px-3">Rate</th>
                  <th className="text-right py-2 px-3">GST %</th>
                  <th className="text-left py-2 px-3">Remarks</th>
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
                      {it.orderNumberSnapshot ? (<>
                        <div className="font-medium">{it.orderNumberSnapshot}</div>
                        <div className="text-muted-foreground">{it.productNameSnapshot}</div>
                      </>) : <span className="text-muted-foreground italic">—</span>}
                    </td>
                    <td className="py-2 px-3 text-right tabular-nums">{Number(it.quantity).toFixed(3)}</td>
                    <td className="py-2 px-3 text-right tabular-nums">{it.rate != null ? formatRate(it.rate) : "—"}</td>
                    <td className="py-2 px-3 text-right tabular-nums">{it.gstPercent != null ? `${it.gstPercent}%` : "—"}</td>
                    <td className="py-2 px-3 text-xs text-muted-foreground">{it.remarks || "—"}</td>
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

function JWStatusPill({ value }: { value: JobWorkStatus }) {
  const map: Record<string, string> = {
    Pending:   "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
    InTransit: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
    Completed: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
  };
  return <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full ${map[value] ?? "bg-gray-100 text-gray-800"}`}>{value}</span>;
}
