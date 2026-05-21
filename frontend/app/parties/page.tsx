"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import {
  Users, Plus, Pencil, Trash2, Search, Download, Save, Phone, Mail, Building2, FileText,
} from "lucide-react";
import api from "@/lib/api";
import { useCurrentUserPermissions } from "@/hooks/use-settings";
import { useDebounce } from "@/hooks/use-debounce";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog } from "@/components/ui/dialog";
import { AccessDenied } from "@/components/ui/access-denied";
import { TablePagination } from "@/components/ui/table-pagination";
import { Party, PartyType, ApiResponse } from "@/types";
import { formatDate, formatGst } from "@/lib/utils";

const PAGE_SIZE = 25;

type PartyTypeFilter = "" | PartyType;

interface PartyListResponse {
  data: Party[];
  totalCount: number;
}

export default function PartiesPage() {
  const { data: permissions, isLoading: permLoading } = useCurrentUserPermissions();
  const qc = useQueryClient();

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [typeFilter, setTypeFilter] = useState<PartyTypeFilter>("");
  const [activeOnly, setActiveOnly] = useState(false);
  const [page, setPage] = useState(1);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Party | null>(null);

  useEffect(() => { setPage(1); }, [debouncedSearch, typeFilter, activeOnly]);

  const canManage = !!permissions?.manageParty;

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["parties", debouncedSearch, typeFilter, activeOnly, page],
    queryFn: async (): Promise<PartyListResponse> => {
      const params: Record<string, any> = { page, pageSize: PAGE_SIZE };
      if (debouncedSearch) params.search = debouncedSearch;
      if (typeFilter) params.type = typeFilter;
      if (activeOnly) params.activeOnly = true;
      const res = await api.get<ApiResponse<Party[]>>("/parties", { params });
      return { data: res.data.data ?? [], totalCount: res.data.totalCount ?? 0 };
    },
    enabled: canManage,
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, isActive }: { id: number; isActive: boolean }) => {
      await api.patch(`/parties/${id}/active`, { isActive });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["parties"] });
      toast.success("Status updated");
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || "Failed to update status"),
  });

  const removeParty = useMutation({
    mutationFn: async (id: number) => { await api.delete(`/parties/${id}`); },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["parties"] });
      toast.success("Party deleted");
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || "Failed to delete"),
  });

  const handleExport = async () => {
    try {
      const params: Record<string, any> = {};
      if (typeFilter) params.type = typeFilter;
      const res = await api.get("/parties/export", { params, responseType: "blob" });
      const blob = new Blob([res.data], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `parties_${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Failed to export");
    }
  };

  const rows = data?.data ?? [];
  const totalCount = data?.totalCount ?? 0;

  if (!permLoading && !canManage) {
    return <AccessDenied actionLabel="Go to Dashboard" actionHref="/dashboard" />;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
            <Users className="w-5 h-5 text-primary-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Party Master</h1>
            <p className="text-sm text-muted-foreground">Manage customers, vendors and job-work vendors.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleExport}>
            <Download className="w-4 h-4 mr-2" /> Export
          </Button>
          <Button onClick={() => { setEditing(null); setDialogOpen(true); }}>
            <Plus className="w-4 h-4 mr-2" /> New Party
          </Button>
        </div>
      </div>

      <Card className="p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
          <div className="md:col-span-5">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Search</Label>
            <div className="relative mt-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, contact, mobile, email, GST…"
                className="pl-9"
              />
            </div>
          </div>
          <div className="md:col-span-3">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Party Type</Label>
            <select
              className="mt-1 w-full h-10 rounded-md border border-border bg-background px-3 text-sm"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as PartyTypeFilter)}
            >
              <option value="">All Types</option>
              <option value={PartyType.Customer}>Customer</option>
              <option value={PartyType.Vendor}>Vendor</option>
              <option value={PartyType.JobWorkVendor}>Job-Work Vendor</option>
            </select>
          </div>
          <div className="md:col-span-2 flex items-center gap-2 pt-5">
            <Switch checked={activeOnly} onCheckedChange={setActiveOnly} id="active-only" />
            <Label htmlFor="active-only" className="text-sm">Active only</Label>
          </div>
          <div className="md:col-span-2 text-right text-xs text-muted-foreground pt-5">
            {isFetching ? "Refreshing…" : `${totalCount} record${totalCount === 1 ? "" : "s"}`}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="py-2.5 px-3">Party Name</th>
                <th className="py-2.5 px-3">Type</th>
                <th className="py-2.5 px-3">Contact</th>
                <th className="py-2.5 px-3">Mobile</th>
                <th className="py-2.5 px-3">Email</th>
                <th className="py-2.5 px-3">GST</th>
                <th className="py-2.5 px-3 text-center">Active</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr><td colSpan={8} className="py-8 text-center text-muted-foreground">Loading…</td></tr>
              )}
              {!isLoading && rows.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-muted-foreground">
                    <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <div className="font-medium text-foreground">No parties yet</div>
                    <div className="text-xs">Click "New Party" to add your first customer or vendor.</div>
                  </td>
                </tr>
              )}
              {rows.map((p) => (
                <tr key={p.id} className="border-b border-border/60 hover:bg-muted/30 transition-colors">
                  <td className="py-2.5 px-3">
                    <div className="font-medium text-foreground">{p.partyName}</div>
                    {p.address && <div className="text-xs text-muted-foreground truncate max-w-[260px]">{p.address}</div>}
                  </td>
                  <td className="py-2.5 px-3"><PartyTypePill type={p.partyType} /></td>
                  <td className="py-2.5 px-3">{p.contactPerson || "—"}</td>
                  <td className="py-2.5 px-3">{p.mobileNumber || "—"}</td>
                  <td className="py-2.5 px-3 max-w-[200px] truncate">{p.email || "—"}</td>
                  <td className="py-2.5 px-3">
                    {p.gstNo ? (
                      <div>
                        <div className="font-mono text-xs">{formatGst(p.gstNo)}</div>
                        {p.gstDate && <div className="text-[11px] text-muted-foreground">since {formatDate(p.gstDate)}</div>}
                      </div>
                    ) : "—"}
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <Switch
                      checked={p.isActive}
                      onCheckedChange={(c) => toggleActive.mutate({ id: p.id, isActive: c })}
                    />
                  </td>
                  <td className="py-2.5 px-3 text-right space-x-1.5">
                    <Button size="sm" variant="outline" onClick={() => { setEditing(p); setDialogOpen(true); }}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        if (window.confirm(`Delete party "${p.partyName}"? This cannot be undone.`)) {
                          removeParty.mutate(p.id);
                        }
                      }}
                    >
                      <Trash2 className="w-4 h-4 text-rose-500" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <TablePagination
          page={page}
          pageSize={PAGE_SIZE}
          totalCount={totalCount}
          onPageChange={setPage}
        />
      </Card>

      <PartyDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        editing={editing}
        onSaved={() => { qc.invalidateQueries({ queryKey: ["parties"] }); setDialogOpen(false); }}
      />
    </div>
  );
}

function PartyTypePill({ type }: { type: PartyType }) {
  const map: Record<PartyType, string> = {
    [PartyType.Customer]: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
    [PartyType.Vendor]: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
    [PartyType.JobWorkVendor]: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  };
  const label: Record<PartyType, string> = {
    [PartyType.Customer]: "Customer",
    [PartyType.Vendor]: "Vendor",
    [PartyType.JobWorkVendor]: "Job-Work",
  };
  return <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full ${map[type]}`}>{label[type]}</span>;
}

interface PartyFormState {
  partyName: string;
  partyType: PartyType;
  contactPerson: string;
  mobileNumber: string;
  email: string;
  gstNo: string;
  gstDate: string;
  address: string;
  isActive: boolean;
}

const EMPTY_FORM: PartyFormState = {
  partyName: "",
  partyType: PartyType.Customer,
  contactPerson: "",
  mobileNumber: "",
  email: "",
  gstNo: "",
  gstDate: "",
  address: "",
  isActive: true,
};

function PartyDialog({ open, onClose, editing, onSaved }: { open: boolean; onClose: () => void; editing: Party | null; onSaved: () => void }) {
  const [form, setForm] = useState<PartyFormState>(EMPTY_FORM);
  const isEdit = !!editing;

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setForm({
        partyName: editing.partyName,
        partyType: editing.partyType,
        contactPerson: editing.contactPerson ?? "",
        mobileNumber: editing.mobileNumber ?? "",
        email: editing.email ?? "",
        gstNo: editing.gstNo ?? "",
        gstDate: (editing.gstDate ?? "").slice(0, 10),
        address: editing.address ?? "",
        isActive: editing.isActive,
      });
    } else {
      setForm(EMPTY_FORM);
    }
  }, [open, editing]);

  const save = useMutation({
    mutationFn: async () => {
      const payload: Partial<Party> = {
        partyName: form.partyName.trim(),
        partyType: form.partyType,
        contactPerson: form.contactPerson.trim() || null,
        mobileNumber: form.mobileNumber.trim() || null,
        email: form.email.trim() || null,
        gstNo: form.gstNo.trim() || null,
        gstDate: form.gstDate || null,
        address: form.address.trim() || null,
        isActive: form.isActive,
      };
      if (isEdit && editing) {
        await api.put(`/parties/${editing.id}`, payload);
      } else {
        await api.post("/parties", payload);
      }
    },
    onSuccess: () => {
      toast.success(isEdit ? "Party updated" : "Party created");
      onSaved();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || "Failed to save party"),
  });

  const submit = () => {
    if (!form.partyName.trim()) { toast.error("Party name is required"); return; }
    save.mutate();
  };

  return (
    <Dialog isOpen={open} onClose={onClose} title={isEdit ? "Edit Party" : "New Party"} size="lg">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2 md:col-span-2">
          <Label>Party Name *</Label>
          <div className="relative">
            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              className="pl-9"
              value={form.partyName}
              onChange={(e) => setForm((f) => ({ ...f, partyName: e.target.value }))}
              placeholder="e.g. ABC Industries Pvt Ltd"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Party Type *</Label>
          <select
            className="w-full h-10 rounded-md border border-border bg-background px-3 text-sm"
            value={form.partyType}
            onChange={(e) => setForm((f) => ({ ...f, partyType: e.target.value as PartyType }))}
          >
            <option value={PartyType.Customer}>Customer</option>
            <option value={PartyType.Vendor}>Vendor</option>
            <option value={PartyType.JobWorkVendor}>Job-Work Vendor</option>
          </select>
        </div>

        <div className="space-y-2">
          <Label>Contact Person</Label>
          <Input
            value={form.contactPerson}
            onChange={(e) => setForm((f) => ({ ...f, contactPerson: e.target.value }))}
            placeholder="Full name"
          />
        </div>

        <div className="space-y-2">
          <Label>Mobile</Label>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              className="pl-9"
              value={form.mobileNumber}
              onChange={(e) => setForm((f) => ({ ...f, mobileNumber: e.target.value }))}
              placeholder="+91 …"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Email</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              className="pl-9"
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              placeholder="party@example.com"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>GST Number</Label>
          <div className="relative">
            <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              className="pl-9 font-mono"
              value={form.gstNo}
              onChange={(e) => setForm((f) => ({ ...f, gstNo: e.target.value.toUpperCase() }))}
              placeholder="22AAAAA0000A1Z5"
              maxLength={20}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>GST Date</Label>
          <Input
            type="date"
            value={form.gstDate}
            onChange={(e) => setForm((f) => ({ ...f, gstDate: e.target.value }))}
          />
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label>Address</Label>
          <Textarea
            rows={3}
            value={form.address}
            onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
            placeholder="Full address with city, state and pin"
          />
        </div>

        <div className="md:col-span-2 flex items-center gap-2">
          <Switch checked={form.isActive} onCheckedChange={(c) => setForm((f) => ({ ...f, isActive: c }))} />
          <Label>Active</Label>
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-4 border-t border-border mt-4">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button onClick={submit} disabled={save.isPending}>
          <Save className="w-4 h-4 mr-2" />
          {save.isPending ? "Saving…" : isEdit ? "Update" : "Create"}
        </Button>
      </div>
    </Dialog>
  );
}
