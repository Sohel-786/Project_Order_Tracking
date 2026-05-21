"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import {
  Layers, Plus, Pencil, Trash2, Save, Search, Tag, FolderTree, Boxes, ShoppingBag, Hammer, Ruler,
} from "lucide-react";
import api from "@/lib/api";
import { useCurrentUserPermissions } from "@/hooks/use-settings";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { AccessDenied } from "@/components/ui/access-denied";
import { ApiResponse, NamedMaster, UnitMaster, UserPermission } from "@/types";

interface MasterConfig {
  key: string;
  label: string;
  slug: string;
  icon: any;
  permKey: keyof UserPermission;
  hasSymbol?: boolean;
}

const MASTERS: MasterConfig[] = [
  { key: "item-types",         label: "Item Type",        slug: "item-types",         icon: Tag,         permKey: "manageItemType" },
  { key: "item-categories",    label: "Item Category",    slug: "item-categories",    icon: FolderTree,  permKey: "manageItemCategory" },
  { key: "item-groups",        label: "Item Group",       slug: "item-groups",        icon: Boxes,       permKey: "manageItemGroup" },
  { key: "product-categories", label: "Product Category", slug: "product-categories", icon: ShoppingBag, permKey: "manageProductCategory" },
  { key: "materials",          label: "Material",         slug: "materials",          icon: Hammer,      permKey: "manageMaterial" },
  { key: "units",              label: "Unit",             slug: "units",              icon: Ruler,       permKey: "manageUnit", hasSymbol: true },
];

export default function MastersPage() {
  const { data: permissions, isLoading: permLoading } = useCurrentUserPermissions();

  const allowed = useMemo(
    () => MASTERS.filter((m) => !!permissions?.[m.permKey]),
    [permissions]
  );

  const defaultTab = allowed[0]?.key;
  const anyAllowed = allowed.length > 0;

  if (!permLoading && !anyAllowed) {
    return <AccessDenied actionLabel="Go to Dashboard" actionHref="/dashboard" />;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
          <Layers className="w-5 h-5 text-primary-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Other Masters</h1>
          <p className="text-sm text-muted-foreground">Lookup lists used across Item and Product masters.</p>
        </div>
      </div>

      {defaultTab && (
        <Tabs defaultValue={defaultTab}>
          <TabsList className="flex flex-wrap h-auto">
            {allowed.map((m) => {
              const Icon = m.icon;
              return (
                <TabsTrigger key={m.key} value={m.key} className="gap-2">
                  <Icon className="w-4 h-4" /> {m.label}
                </TabsTrigger>
              );
            })}
          </TabsList>
          {allowed.map((m) => (
            <TabsContent key={m.key} value={m.key}>
              <MasterTab config={m} />
            </TabsContent>
          ))}
        </Tabs>
      )}
    </div>
  );
}

interface MasterRow extends NamedMaster {
  symbol?: string | null;
}

function MasterTab({ config }: { config: MasterConfig }) {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<MasterRow | null>(null);

  const queryKey = ["masters", config.slug, "all"];

  const { data, isLoading, isFetching } = useQuery({
    queryKey,
    queryFn: async (): Promise<MasterRow[]> => {
      const res = await api.get<ApiResponse<MasterRow[]>>(`/masters/${config.slug}`);
      return res.data.data ?? [];
    },
  });

  const remove = useMutation({
    mutationFn: async (id: number) => { await api.delete(`/masters/${config.slug}/${id}`); },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey });
      toast.success(`${config.label} deleted`);
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || "Failed to delete"),
  });

  const rows = useMemo(() => {
    const all = data ?? [];
    const s = search.trim().toLowerCase();
    if (!s) return all;
    return all.filter((r) =>
      r.name.toLowerCase().includes(s) ||
      (r.symbol ?? "").toLowerCase().includes(s)
    );
  }, [data, search]);

  return (
    <div className="mt-4 space-y-4">
      <Card className="p-4 space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="relative w-full max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={`Search ${config.label.toLowerCase()}…`}
              className="pl-9"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {isFetching ? "Refreshing…" : `${rows.length} record${rows.length === 1 ? "" : "s"}`}
            </span>
            <Button size="sm" onClick={() => { setEditing(null); setDialogOpen(true); }}>
              <Plus className="w-4 h-4 mr-2" /> New {config.label}
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="py-2.5 px-3">{config.label}</th>
                {config.hasSymbol && <th className="py-2.5 px-3">Symbol</th>}
                <th className="py-2.5 px-3 text-center">Active</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={config.hasSymbol ? 4 : 3} className="py-8 text-center text-muted-foreground">Loading…</td>
                </tr>
              )}
              {!isLoading && rows.length === 0 && (
                <tr>
                  <td colSpan={config.hasSymbol ? 4 : 3} className="py-10 text-center text-muted-foreground">
                    <Layers className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <div className="font-medium text-foreground">No {config.label.toLowerCase()} yet</div>
                    <div className="text-xs">Click "New {config.label}" to add your first entry.</div>
                  </td>
                </tr>
              )}
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-border/60 hover:bg-muted/30 transition-colors">
                  <td className="py-2.5 px-3 font-medium text-foreground">{r.name}</td>
                  {config.hasSymbol && (
                    <td className="py-2.5 px-3 font-mono text-xs text-muted-foreground">{r.symbol || "—"}</td>
                  )}
                  <td className="py-2.5 px-3 text-center">
                    {r.isActive ? (
                      <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300">Active</span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300">Inactive</span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-right space-x-1.5">
                    <Button size="sm" variant="outline" onClick={() => { setEditing(r); setDialogOpen(true); }}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        if (window.confirm(`Delete ${config.label.toLowerCase()} "${r.name}"? This cannot be undone.`)) {
                          remove.mutate(r.id);
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
      </Card>

      <MasterDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        config={config}
        editing={editing}
        onSaved={() => { qc.invalidateQueries({ queryKey }); setDialogOpen(false); }}
      />
    </div>
  );
}

interface MasterFormState {
  name: string;
  symbol: string;
  isActive: boolean;
}

function MasterDialog({ open, onClose, config, editing, onSaved }: {
  open: boolean;
  onClose: () => void;
  config: MasterConfig;
  editing: MasterRow | null;
  onSaved: () => void;
}) {
  const isEdit = !!editing;
  const [form, setForm] = useState<MasterFormState>({ name: "", symbol: "", isActive: true });

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setForm({ name: editing.name, symbol: editing.symbol ?? "", isActive: editing.isActive });
    } else {
      setForm({ name: "", symbol: "", isActive: true });
    }
  }, [open, editing]);

  const save = useMutation({
    mutationFn: async () => {
      const trimmedName = form.name.trim();
      const trimmedSymbol = form.symbol.trim();
      if (isEdit && editing) {
        const payload: Record<string, any> = { name: trimmedName, isActive: form.isActive };
        if (config.hasSymbol) payload.symbol = trimmedSymbol || null;
        await api.put(`/masters/${config.slug}/${editing.id}`, payload);
      } else {
        const payload: Record<string, any> = { name: trimmedName };
        if (config.hasSymbol) payload.symbol = trimmedSymbol || null;
        await api.post(`/masters/${config.slug}`, payload);
      }
    },
    onSuccess: () => {
      toast.success(isEdit ? `${config.label} updated` : `${config.label} created`);
      onSaved();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || "Failed to save"),
  });

  const submit = () => {
    if (!form.name.trim()) { toast.error("Name is required"); return; }
    save.mutate();
  };

  return (
    <Dialog isOpen={open} onClose={onClose} title={`${isEdit ? "Edit" : "New"} ${config.label}`} size="md">
      <div className="grid grid-cols-1 gap-4">
        <div className="space-y-2">
          <Label>Name *</Label>
          <Input
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder={`e.g. ${config.label} name`}
          />
        </div>
        {config.hasSymbol && (
          <div className="space-y-2">
            <Label>Symbol</Label>
            <Input
              value={form.symbol}
              onChange={(e) => setForm((f) => ({ ...f, symbol: e.target.value }))}
              placeholder="e.g. kg, mm, pcs"
              maxLength={20}
            />
            <p className="text-xs text-muted-foreground">Short label displayed on tables (optional).</p>
          </div>
        )}
        {isEdit && (
          <div className="flex items-center gap-2">
            <Switch checked={form.isActive} onCheckedChange={(c) => setForm((f) => ({ ...f, isActive: c }))} />
            <Label>Active</Label>
          </div>
        )}
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
