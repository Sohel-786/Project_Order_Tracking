"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import { Workflow, Plus, Pencil, Trash2, Search, Save, Lock } from "lucide-react";
import api from "@/lib/api";
import { useCurrentUserPermissions } from "@/hooks/use-settings";
import { useDebounce } from "@/hooks/use-debounce";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog } from "@/components/ui/dialog";
import { AccessDenied } from "@/components/ui/access-denied";
import { ApiResponse, ProcessMaster, ProcessType } from "@/types";

type ProcessTypeFilter = "" | ProcessType;

export default function ProcessesPage() {
  const { data: permissions, isLoading: permLoading } = useCurrentUserPermissions();
  const qc = useQueryClient();

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [typeFilter, setTypeFilter] = useState<ProcessTypeFilter>("");
  const [activeOnly, setActiveOnly] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ProcessMaster | null>(null);

  const canManage = !!permissions?.manageProcess;

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["processes", debouncedSearch, typeFilter, activeOnly],
    queryFn: async (): Promise<ProcessMaster[]> => {
      const params: Record<string, any> = {};
      if (debouncedSearch) params.search = debouncedSearch;
      if (typeFilter) params.type = typeFilter;
      if (activeOnly) params.activeOnly = true;
      const res = await api.get<ApiResponse<ProcessMaster[]>>("/processes", { params });
      return res.data.data ?? [];
    },
    enabled: canManage,
  });

  const removeProcess = useMutation({
    mutationFn: async (id: number) => { await api.delete(`/processes/${id}`); },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["processes"] });
      toast.success("Process deleted");
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || "Failed to delete"),
  });

  const rows = data ?? [];

  if (!permLoading && !canManage) {
    return <AccessDenied actionLabel="Go to Dashboard" actionHref="/dashboard" />;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
            <Workflow className="w-5 h-5 text-primary-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Process Master</h1>
            <p className="text-sm text-muted-foreground">Manufacturing and job-work processes used in BOMs. System processes are seeded and read-only.</p>
          </div>
        </div>
        <Button onClick={() => { setEditing(null); setDialogOpen(true); }}>
          <Plus className="w-4 h-4 mr-2" /> New Process
        </Button>
      </div>

      <Card className="p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
          <div className="md:col-span-6">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Search</Label>
            <div className="relative mt-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by process name…"
                className="pl-9"
              />
            </div>
          </div>
          <div className="md:col-span-3">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Type</Label>
            <select
              className="mt-1 w-full h-10 rounded-md border border-border bg-background px-3 text-sm"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as ProcessTypeFilter)}
            >
              <option value="">All Types</option>
              <option value={ProcessType.System}>System</option>
              <option value={ProcessType.JobWork}>Job Work</option>
            </select>
          </div>
          <div className="md:col-span-2 flex items-center gap-2 pt-5">
            <Switch checked={activeOnly} onCheckedChange={setActiveOnly} id="ao-proc" />
            <Label htmlFor="ao-proc" className="text-sm">Active only</Label>
          </div>
          <div className="md:col-span-1 text-right text-xs text-muted-foreground pt-5">
            {isFetching ? "…" : rows.length}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="py-2.5 px-3">Sequence</th>
                <th className="py-2.5 px-3">Process Name</th>
                <th className="py-2.5 px-3">Type</th>
                <th className="py-2.5 px-3 text-center">Mandatory</th>
                <th className="py-2.5 px-3 text-center">System</th>
                <th className="py-2.5 px-3 text-center">Active</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr><td colSpan={7} className="py-8 text-center text-muted-foreground">Loading…</td></tr>
              )}
              {!isLoading && rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-muted-foreground">
                    <Workflow className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <div className="font-medium text-foreground">No processes found</div>
                    <div className="text-xs">Click "New Process" to register a new job-work process.</div>
                  </td>
                </tr>
              )}
              {rows.map((p) => (
                <tr key={p.id} className="border-b border-border/60 hover:bg-muted/30 transition-colors">
                  <td className="py-2.5 px-3 text-muted-foreground font-mono text-xs">{p.sequenceNumber || "—"}</td>
                  <td className="py-2.5 px-3 font-medium text-foreground">{p.processName}</td>
                  <td className="py-2.5 px-3">
                    <ProcessTypePill type={p.processType} />
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    {p.isMandatory ? (
                      <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">Mandatory</span>
                    ) : <span className="text-xs text-muted-foreground">—</span>}
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    {p.isSystem ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                        <Lock className="w-3 h-3" /> System
                      </span>
                    ) : <span className="text-xs text-muted-foreground">—</span>}
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    {p.isActive ? (
                      <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300">Active</span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300">Inactive</span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-right space-x-1.5">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={p.isSystem}
                      title={p.isSystem ? "System processes cannot be edited" : "Edit"}
                      onClick={() => { setEditing(p); setDialogOpen(true); }}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={p.isSystem}
                      title={p.isSystem ? "System processes cannot be deleted" : "Delete"}
                      onClick={() => {
                        if (window.confirm(`Delete process "${p.processName}"? This cannot be undone.`)) {
                          removeProcess.mutate(p.id);
                        }
                      }}
                    >
                      <Trash2 className={`w-4 h-4 ${p.isSystem ? "" : "text-rose-500"}`} />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <ProcessDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        editing={editing}
        onSaved={() => { qc.invalidateQueries({ queryKey: ["processes"] }); setDialogOpen(false); }}
      />
    </div>
  );
}

function ProcessTypePill({ type }: { type: ProcessType }) {
  if (type === ProcessType.System) {
    return <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">System</span>;
  }
  return <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">Job Work</span>;
}

interface ProcessFormState {
  processName: string;
  processType: ProcessType;
  sequenceNumber: number;
  isMandatory: boolean;
  isActive: boolean;
}

const EMPTY_PROCESS_FORM: ProcessFormState = {
  processName: "",
  processType: ProcessType.JobWork,
  sequenceNumber: 0,
  isMandatory: false,
  isActive: true,
};

function ProcessDialog({ open, onClose, editing, onSaved }: { open: boolean; onClose: () => void; editing: ProcessMaster | null; onSaved: () => void }) {
  const isEdit = !!editing;
  const [form, setForm] = useState<ProcessFormState>(EMPTY_PROCESS_FORM);

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setForm({
        processName: editing.processName,
        processType: editing.processType === ProcessType.System ? ProcessType.JobWork : editing.processType,
        sequenceNumber: editing.sequenceNumber,
        isMandatory: editing.isMandatory,
        isActive: editing.isActive,
      });
    } else {
      setForm(EMPTY_PROCESS_FORM);
    }
  }, [open, editing]);

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        processName: form.processName.trim(),
        processType: form.processType,
        sequenceNumber: form.sequenceNumber,
        isMandatory: form.isMandatory,
        isActive: form.isActive,
      };
      if (isEdit && editing) await api.put(`/processes/${editing.id}`, payload);
      else await api.post("/processes", payload);
    },
    onSuccess: () => {
      toast.success(isEdit ? "Process updated" : "Process created");
      onSaved();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || "Failed to save process"),
  });

  const submit = () => {
    if (!form.processName.trim()) { toast.error("Process name is required"); return; }
    save.mutate();
  };

  return (
    <Dialog isOpen={open} onClose={onClose} title={isEdit ? "Edit Process" : "New Process"} size="md">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2 md:col-span-2">
          <Label>Process Name *</Label>
          <Input
            value={form.processName}
            onChange={(e) => setForm((f) => ({ ...f, processName: e.target.value }))}
            placeholder="e.g. Powder Coating"
          />
        </div>
        <div className="space-y-2">
          <Label>Process Type *</Label>
          <select
            className="w-full h-10 rounded-md border border-border bg-background px-3 text-sm"
            value={form.processType}
            onChange={(e) => setForm((f) => ({ ...f, processType: e.target.value as ProcessType }))}
          >
            <option value={ProcessType.JobWork}>Job Work</option>
          </select>
          <p className="text-xs text-muted-foreground">System processes are seeded automatically and cannot be created here.</p>
        </div>
        <div className="space-y-2">
          <Label>Sequence Number</Label>
          <Input
            type="number"
            min={0}
            value={form.sequenceNumber}
            onChange={(e) => setForm((f) => ({ ...f, sequenceNumber: Number(e.target.value) || 0 }))}
          />
        </div>
        <div className="md:col-span-2 flex items-center gap-2">
          <Switch checked={form.isMandatory} onCheckedChange={(c) => setForm((f) => ({ ...f, isMandatory: c }))} />
          <Label>Mandatory in every BOM item</Label>
        </div>
        <div className="md:col-span-2 flex items-center gap-2">
          <Switch checked={form.isActive} onCheckedChange={(c) => setForm((f) => ({ ...f, isActive: c }))} />
          <Label>Active</Label>
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-4 border-t border-border mt-4">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button onClick={submit} disabled={save.isPending}>
          <Save className="w-4 h-4 mr-2" /> {save.isPending ? "Saving…" : isEdit ? "Update" : "Create"}
        </Button>
      </div>
    </Dialog>
  );
}
