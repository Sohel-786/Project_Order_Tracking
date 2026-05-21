"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import {
  Package, Plus, Pencil, Trash2, Search, Save, Upload, FileText, Download,
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
import { ApiResponse, Item, NamedMaster, UnitMaster } from "@/types";

const PAGE_SIZE = 25;

interface ItemListResponse {
  data: Item[];
  totalCount: number;
}

export default function ItemsPage() {
  const { data: permissions, isLoading: permLoading } = useCurrentUserPermissions();
  const qc = useQueryClient();

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [itemCategoryId, setItemCategoryId] = useState<number | "">("");
  const [itemTypeId, setItemTypeId] = useState<number | "">("");
  const [itemGroupId, setItemGroupId] = useState<number | "">("");
  const [materialId, setMaterialId] = useState<number | "">("");
  const [activeOnly, setActiveOnly] = useState(false);
  const [page, setPage] = useState(1);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Item | null>(null);
  const [nextCode, setNextCode] = useState<string>("");

  useEffect(() => { setPage(1); }, [debouncedSearch, itemCategoryId, itemTypeId, itemGroupId, materialId, activeOnly]);

  const canManage = !!permissions?.manageItem;

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["items", debouncedSearch, itemCategoryId, itemTypeId, itemGroupId, materialId, activeOnly, page],
    queryFn: async (): Promise<ItemListResponse> => {
      const params: Record<string, any> = { page, pageSize: PAGE_SIZE };
      if (debouncedSearch) params.search = debouncedSearch;
      if (itemCategoryId) params.itemCategoryId = itemCategoryId;
      if (itemTypeId) params.itemTypeId = itemTypeId;
      if (itemGroupId) params.itemGroupId = itemGroupId;
      if (materialId) params.materialId = materialId;
      if (activeOnly) params.activeOnly = true;
      const res = await api.get<ApiResponse<Item[]>>("/items", { params });
      return { data: res.data.data ?? [], totalCount: res.data.totalCount ?? 0 };
    },
    enabled: canManage,
  });

  const { data: itemCategories } = useNamedMaster("item-categories", canManage);
  const { data: itemTypes } = useNamedMaster("item-types", canManage);
  const { data: itemGroups } = useNamedMaster("item-groups", canManage);
  const { data: materials } = useNamedMaster("materials", canManage);

  const fetchNextCode = async () => {
    try {
      const r = await api.get<ApiResponse<string>>("/items/next-code");
      setNextCode(r.data.data ?? "");
    } catch { setNextCode(""); }
  };

  const toggleActive = useMutation({
    mutationFn: async ({ id, isActive }: { id: number; isActive: boolean }) => {
      await api.patch(`/items/${id}/active`, { isActive });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["items"] });
      toast.success("Status updated");
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || "Failed to update status"),
  });

  const removeItem = useMutation({
    mutationFn: async (id: number) => { await api.delete(`/items/${id}`); },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["items"] });
      toast.success("Item deleted");
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || "Failed to delete"),
  });

  const openNew = async () => {
    setEditing(null);
    await fetchNextCode();
    setDialogOpen(true);
  };

  const handleExport = async () => {
    try {
      const res = await api.get("/items/export", { responseType: "blob" });
      const blob = new Blob([res.data], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `items_${new Date().toISOString().slice(0, 10)}.xlsx`;
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
            <Package className="w-5 h-5 text-primary-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Item Master</h1>
            <p className="text-sm text-muted-foreground">Raw materials, components and consumables consumed by BOMs.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleExport}>
            <Download className="w-4 h-4 mr-2" /> Export
          </Button>
          <Button onClick={openNew}>
            <Plus className="w-4 h-4 mr-2" /> New Item
          </Button>
        </div>
      </div>

      <Card className="p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
          <div className="md:col-span-4">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Search</Label>
            <div className="relative mt-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, code, drawing…"
                className="pl-9"
              />
            </div>
          </div>
          <FilterSelect label="Category" value={itemCategoryId} onChange={setItemCategoryId} options={itemCategories} />
          <FilterSelect label="Type" value={itemTypeId} onChange={setItemTypeId} options={itemTypes} />
          <FilterSelect label="Group" value={itemGroupId} onChange={setItemGroupId} options={itemGroups} />
          <FilterSelect label="Material" value={materialId} onChange={setMaterialId} options={materials} />
          <div className="md:col-span-1 flex items-center gap-2 pt-5">
            <Switch checked={activeOnly} onCheckedChange={setActiveOnly} id="ao-itm" />
            <Label htmlFor="ao-itm" className="text-xs">Active</Label>
          </div>
        </div>

        <div className="flex justify-between items-center text-xs text-muted-foreground">
          <span>{isFetching ? "Refreshing…" : `${totalCount} record${totalCount === 1 ? "" : "s"}`}</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="py-2.5 px-3">Item Code</th>
                <th className="py-2.5 px-3">Item Name</th>
                <th className="py-2.5 px-3">Category</th>
                <th className="py-2.5 px-3">Type</th>
                <th className="py-2.5 px-3">Group</th>
                <th className="py-2.5 px-3">Material</th>
                <th className="py-2.5 px-3">Unit</th>
                <th className="py-2.5 px-3">Drawing</th>
                <th className="py-2.5 px-3">Rev</th>
                <th className="py-2.5 px-3 text-center">Validation</th>
                <th className="py-2.5 px-3 text-center">Active</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr><td colSpan={12} className="py-8 text-center text-muted-foreground">Loading…</td></tr>
              )}
              {!isLoading && rows.length === 0 && (
                <tr>
                  <td colSpan={12} className="py-10 text-center text-muted-foreground">
                    <Package className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <div className="font-medium text-foreground">No items yet</div>
                    <div className="text-xs">Click "New Item" to add your first raw material or component.</div>
                  </td>
                </tr>
              )}
              {rows.map((i) => (
                <tr key={i.id} className="border-b border-border/60 hover:bg-muted/30 transition-colors">
                  <td className="py-2.5 px-3 font-mono text-xs">{i.itemCode}</td>
                  <td className="py-2.5 px-3">
                    <div className="font-medium text-foreground">{i.itemName}</div>
                    {i.description && <div className="text-xs text-muted-foreground truncate max-w-[200px]">{i.description}</div>}
                  </td>
                  <td className="py-2.5 px-3">{i.itemCategoryName || "—"}</td>
                  <td className="py-2.5 px-3">{i.itemTypeName || "—"}</td>
                  <td className="py-2.5 px-3">{i.itemGroupName || "—"}</td>
                  <td className="py-2.5 px-3">{i.materialName || "—"}</td>
                  <td className="py-2.5 px-3">{i.unitSymbol || i.unitName || "—"}</td>
                  <td className="py-2.5 px-3">
                    {i.drawingFileUrl ? (
                      <a href={i.drawingFileUrl} target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline">
                        {i.drawingNumber || "View"}
                      </a>
                    ) : i.drawingNumber || "—"}
                  </td>
                  <td className="py-2.5 px-3">{i.revisionNumber || "—"}</td>
                  <td className="py-2.5 px-3 text-center">
                    {i.validationRequired ? (
                      <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">Required</span>
                    ) : <span className="text-xs text-muted-foreground">—</span>}
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <Switch
                      checked={i.isActive}
                      onCheckedChange={(c) => toggleActive.mutate({ id: i.id, isActive: c })}
                    />
                  </td>
                  <td className="py-2.5 px-3 text-right space-x-1.5 whitespace-nowrap">
                    <Button size="sm" variant="outline" onClick={() => { setEditing(i); setDialogOpen(true); }}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        if (window.confirm(`Delete item "${i.itemName}"? This cannot be undone.`)) {
                          removeItem.mutate(i.id);
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

        <TablePagination page={page} pageSize={PAGE_SIZE} totalCount={totalCount} onPageChange={setPage} />
      </Card>

      <ItemDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        editing={editing}
        nextCode={nextCode}
        onSaved={() => { qc.invalidateQueries({ queryKey: ["items"] }); setDialogOpen(false); }}
      />
    </div>
  );
}

function useNamedMaster(slug: string, enabled: boolean) {
  return useQuery({
    queryKey: ["masters", slug, "active"],
    queryFn: async (): Promise<NamedMaster[]> => {
      const res = await api.get<ApiResponse<NamedMaster[]>>(`/masters/${slug}/active`);
      return res.data.data ?? [];
    },
    enabled,
  });
}

function FilterSelect({ label, value, onChange, options }: {
  label: string;
  value: number | "";
  onChange: (v: number | "") => void;
  options?: NamedMaster[];
}) {
  return (
    <div className="md:col-span-1.5 min-w-0 col-span-1" style={{ gridColumn: "span 1 / span 1" }}>
      <Label className="text-xs uppercase tracking-wider text-muted-foreground">{label}</Label>
      <select
        className="mt-1 w-full h-10 rounded-md border border-border bg-background px-2 text-xs"
        value={value === "" ? "" : String(value)}
        onChange={(e) => onChange(e.target.value ? Number(e.target.value) : "")}
      >
        <option value="">All</option>
        {(options ?? []).map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
      </select>
    </div>
  );
}

interface ItemFormState {
  itemName: string;
  itemCategoryId: number | "";
  itemTypeId: number | "";
  itemGroupId: number | "";
  materialId: number | "";
  unitId: number | "";
  drawingNumber: string;
  revisionNumber: string;
  drawingFileUrl: string;
  validationRequired: boolean;
  description: string;
  isActive: boolean;
}

const EMPTY_ITEM_FORM: ItemFormState = {
  itemName: "",
  itemCategoryId: "",
  itemTypeId: "",
  itemGroupId: "",
  materialId: "",
  unitId: "",
  drawingNumber: "",
  revisionNumber: "",
  drawingFileUrl: "",
  validationRequired: false,
  description: "",
  isActive: true,
};

function ItemDialog({ open, onClose, editing, nextCode, onSaved }: {
  open: boolean; onClose: () => void; editing: Item | null; nextCode: string; onSaved: () => void;
}) {
  const isEdit = !!editing;
  const [form, setForm] = useState<ItemFormState>(EMPTY_ITEM_FORM);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: itemCategories } = useNamedMaster("item-categories", open);
  const { data: itemTypes } = useNamedMaster("item-types", open);
  const { data: itemGroups } = useNamedMaster("item-groups", open);
  const { data: materials } = useNamedMaster("materials", open);
  const { data: units } = useQuery({
    queryKey: ["masters", "units", "active"],
    queryFn: async (): Promise<UnitMaster[]> => {
      const res = await api.get<ApiResponse<UnitMaster[]>>("/masters/units/active");
      return res.data.data ?? [];
    },
    enabled: open,
  });

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setForm({
        itemName: editing.itemName,
        itemCategoryId: editing.itemCategoryId ?? "",
        itemTypeId: editing.itemTypeId ?? "",
        itemGroupId: editing.itemGroupId ?? "",
        materialId: editing.materialId ?? "",
        unitId: editing.unitId ?? "",
        drawingNumber: editing.drawingNumber ?? "",
        revisionNumber: editing.revisionNumber ?? "",
        drawingFileUrl: editing.drawingFileUrl ?? "",
        validationRequired: editing.validationRequired,
        description: editing.description ?? "",
        isActive: editing.isActive,
      });
    } else {
      setForm(EMPTY_ITEM_FORM);
    }
  }, [open, editing]);

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        itemName: form.itemName.trim(),
        itemCategoryId: form.itemCategoryId || null,
        itemTypeId: form.itemTypeId || null,
        itemGroupId: form.itemGroupId || null,
        materialId: form.materialId || null,
        unitId: form.unitId || null,
        drawingNumber: form.drawingNumber.trim() || null,
        revisionNumber: form.revisionNumber.trim() || null,
        drawingFileUrl: form.drawingFileUrl || null,
        validationRequired: form.validationRequired,
        description: form.description.trim() || null,
        isActive: form.isActive,
      };
      if (isEdit && editing) await api.put(`/items/${editing.id}`, payload);
      else await api.post("/items", payload);
    },
    onSuccess: () => {
      toast.success(isEdit ? "Item updated" : "Item created");
      onSaved();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || "Failed to save item"),
  });

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await api.post<ApiResponse<{ url: string }>>("/items/upload-drawing", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const url = res.data.data?.url || "";
      if (url) {
        setForm((f) => ({ ...f, drawingFileUrl: url }));
        toast.success("Drawing uploaded");
      }
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const submit = () => {
    if (!form.itemName.trim()) { toast.error("Item name is required"); return; }
    save.mutate();
  };

  return (
    <Dialog isOpen={open} onClose={onClose} title={isEdit ? "Edit Item" : "New Item"} size="xl">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Item Code</Label>
          <Input value={isEdit ? editing!.itemCode : nextCode} disabled placeholder="Auto-generated" className="font-mono" />
        </div>
        <div className="space-y-2">
          <Label>Item Name *</Label>
          <Input
            value={form.itemName}
            onChange={(e) => setForm((f) => ({ ...f, itemName: e.target.value }))}
            placeholder="e.g. Stainless Steel Bar 12mm"
          />
        </div>

        <SelectField
          label="Item Category"
          value={form.itemCategoryId}
          onChange={(v) => setForm((f) => ({ ...f, itemCategoryId: v }))}
          options={itemCategories}
        />
        <SelectField
          label="Item Type"
          value={form.itemTypeId}
          onChange={(v) => setForm((f) => ({ ...f, itemTypeId: v }))}
          options={itemTypes}
        />
        <SelectField
          label="Item Group"
          value={form.itemGroupId}
          onChange={(v) => setForm((f) => ({ ...f, itemGroupId: v }))}
          options={itemGroups}
        />
        <SelectField
          label="Material"
          value={form.materialId}
          onChange={(v) => setForm((f) => ({ ...f, materialId: v }))}
          options={materials}
        />
        <div className="space-y-2">
          <Label>Unit</Label>
          <select
            className="w-full h-10 rounded-md border border-border bg-background px-3 text-sm"
            value={form.unitId === "" ? "" : String(form.unitId)}
            onChange={(e) => setForm((f) => ({ ...f, unitId: e.target.value ? Number(e.target.value) : "" }))}
          >
            <option value="">— None —</option>
            {(units ?? []).map((u) => <option key={u.id} value={u.id}>{u.name}{u.symbol ? ` (${u.symbol})` : ""}</option>)}
          </select>
        </div>
        <div className="space-y-2">
          <Label>Drawing Number</Label>
          <Input
            value={form.drawingNumber}
            onChange={(e) => setForm((f) => ({ ...f, drawingNumber: e.target.value }))}
            placeholder="DRG-ITM-001"
          />
        </div>
        <div className="space-y-2">
          <Label>Revision</Label>
          <Input
            value={form.revisionNumber}
            onChange={(e) => setForm((f) => ({ ...f, revisionNumber: e.target.value }))}
            placeholder="R0"
          />
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label>Drawing File</Label>
          <div className="flex items-center gap-3">
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,.webp,.dwg,.dxf"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f); }}
            />
            <Button type="button" variant="outline" onClick={() => fileRef.current?.click()} disabled={uploading}>
              <Upload className="w-4 h-4 mr-2" /> {uploading ? "Uploading…" : "Upload Drawing"}
            </Button>
            {form.drawingFileUrl && (
              <a href={form.drawingFileUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-primary-600 hover:underline inline-flex items-center gap-1">
                <FileText className="w-4 h-4" /> View current
              </a>
            )}
          </div>
        </div>

        <div className="md:col-span-2 flex items-center gap-2">
          <Switch checked={form.validationRequired} onCheckedChange={(c) => setForm((f) => ({ ...f, validationRequired: c }))} />
          <Label>Validation (QC) required on inward</Label>
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label>Description</Label>
          <Textarea
            rows={3}
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            placeholder="Optional specification / notes"
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
          <Save className="w-4 h-4 mr-2" /> {save.isPending ? "Saving…" : isEdit ? "Update" : "Create"}
        </Button>
      </div>
    </Dialog>
  );
}

function SelectField({ label, value, onChange, options }: {
  label: string;
  value: number | "";
  onChange: (v: number | "") => void;
  options?: NamedMaster[];
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <select
        className="w-full h-10 rounded-md border border-border bg-background px-3 text-sm"
        value={value === "" ? "" : String(value)}
        onChange={(e) => onChange(e.target.value ? Number(e.target.value) : "")}
      >
        <option value="">— None —</option>
        {(options ?? []).map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
      </select>
    </div>
  );
}
