"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import {
  Network, Plus, Pencil, Trash2, Search, Save, Eye, Layers,
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
import { SearchableSelect } from "@/components/ui/searchable-select";
import { MultiSelectSearch } from "@/components/ui/multi-select-search";
import {
  ApiResponse,
  Bom,
  BomStatus,
  Item,
  ProcessMaster,
  Product,
  UnitMaster,
} from "@/types";

interface BomListRow {
  id: number;
  productId: number;
  productName?: string | null;
  productCode?: string | null;
  bomVersion: string;
  status: BomStatus;
  remarks?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  itemCount: number;
}

interface BomItemFormRow {
  key: string;
  itemId: number | "";
  quantityPerProduct: number;
  unitId: number | "";
  remarks: string;
  processIds: number[];
}

interface BomFormState {
  productId: number | "";
  bomVersion: string;
  status: BomStatus;
  remarks: string;
  items: BomItemFormRow[];
}

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function emptyBomItemRow(sequence: number): BomItemFormRow {
  return {
    key: uid(),
    itemId: "",
    quantityPerProduct: 1,
    unitId: "",
    remarks: "",
    processIds: [],
  };
}

const EMPTY_BOM_FORM: BomFormState = {
  productId: "",
  bomVersion: "v1",
  status: BomStatus.Active,
  remarks: "",
  items: [emptyBomItemRow(1)],
};

function BomStatusPill({ status }: { status: BomStatus }) {
  const map: Record<BomStatus, string> = {
    [BomStatus.Draft]: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
    [BomStatus.Active]: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
    [BomStatus.Inactive]: "bg-slate-100 text-slate-700 dark:bg-slate-800/50 dark:text-slate-300",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full ${map[status]}`}>
      {status}
    </span>
  );
}

export default function BomsPage() {
  const { data: permissions, isLoading: permLoading } = useCurrentUserPermissions();
  const qc = useQueryClient();

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [productFilter, setProductFilter] = useState<number | "">("");
  const [activeOnly, setActiveOnly] = useState(false);

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [viewingId, setViewingId] = useState<number | null>(null);

  const canManage = !!permissions?.manageBom;

  const { data: products } = useQuery({
    queryKey: ["products", "active", "bom-filter"],
    queryFn: async (): Promise<Product[]> => {
      const res = await api.get<ApiResponse<Product[]>>("/products", { params: { activeOnly: true } });
      return res.data.data ?? [];
    },
    enabled: canManage,
  });

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["boms", debouncedSearch, productFilter, activeOnly],
    queryFn: async (): Promise<BomListRow[]> => {
      const params: Record<string, unknown> = {};
      if (debouncedSearch) params.search = debouncedSearch;
      if (productFilter) params.productId = productFilter;
      if (activeOnly) params.activeOnly = true;
      const res = await api.get<ApiResponse<BomListRow[]>>("/boms", { params });
      return res.data.data ?? [];
    },
    enabled: canManage,
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, isActive }: { id: number; isActive: boolean }) => {
      await api.patch(`/boms/${id}/active`, { isActive });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["boms"] });
      toast.success("Status updated");
    },
    onError: (e: { response?: { data?: { message?: string } } }) =>
      toast.error(e?.response?.data?.message || "Failed to update status"),
  });

  const removeBom = useMutation({
    mutationFn: async (id: number) => { await api.delete(`/boms/${id}`); },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["boms"] });
      toast.success("BOM deleted");
    },
    onError: (e: { response?: { data?: { message?: string } } }) =>
      toast.error(e?.response?.data?.message || "Failed to delete"),
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
            <Network className="w-5 h-5 text-primary-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">BOM Master</h1>
            <p className="text-sm text-muted-foreground">Bill of materials per product with item quantities and process flow.</p>
          </div>
        </div>
        <Button onClick={() => { setEditingId(null); setEditDialogOpen(true); }}>
          <Plus className="w-4 h-4 mr-2" /> New BOM
        </Button>
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
                placeholder="Search version or product…"
                className="pl-9"
              />
            </div>
          </div>
          <div className="md:col-span-4">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Product</Label>
            <select
              className="mt-1 w-full h-10 rounded-md border border-border bg-background px-3 text-sm"
              value={productFilter === "" ? "" : String(productFilter)}
              onChange={(e) => setProductFilter(e.target.value ? Number(e.target.value) : "")}
            >
              <option value="">All Products</option>
              {(products ?? []).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.productCode} — {p.productName}
                </option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2 flex items-center gap-2 pt-5">
            <Switch checked={activeOnly} onCheckedChange={setActiveOnly} id="active-only-bom" />
            <Label htmlFor="active-only-bom" className="text-sm">Active only</Label>
          </div>
          <div className="md:col-span-2 text-right text-xs text-muted-foreground pt-5">
            {isFetching ? "Refreshing…" : `${rows.length} record${rows.length === 1 ? "" : "s"}`}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="py-2.5 px-3">Product</th>
                <th className="py-2.5 px-3">Version</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3 text-center">Items</th>
                <th className="py-2.5 px-3 text-center">Active</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr><td colSpan={6} className="py-8 text-center text-muted-foreground">Loading…</td></tr>
              )}
              {!isLoading && rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-muted-foreground">
                    <Layers className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <div className="font-medium text-foreground">No BOMs yet</div>
                    <div className="text-xs">Click &quot;New BOM&quot; to define a bill of materials for a product.</div>
                  </td>
                </tr>
              )}
              {rows.map((b) => (
                <tr key={b.id} className="border-b border-border/60 hover:bg-muted/30 transition-colors">
                  <td className="py-2.5 px-3">
                    <div className="font-medium text-foreground">
                      {b.productCode ? `${b.productCode} — ` : ""}{b.productName || "—"}
                    </div>
                    {b.remarks && (
                      <div className="text-xs text-muted-foreground truncate max-w-[280px]">{b.remarks}</div>
                    )}
                  </td>
                  <td className="py-2.5 px-3 font-mono text-xs">{b.bomVersion}</td>
                  <td className="py-2.5 px-3"><BomStatusPill status={b.status} /></td>
                  <td className="py-2.5 px-3 text-center">{b.itemCount}</td>
                  <td className="py-2.5 px-3 text-center">
                    <Switch
                      checked={b.isActive}
                      onCheckedChange={(c) => toggleActive.mutate({ id: b.id, isActive: c })}
                    />
                  </td>
                  <td className="py-2.5 px-3 text-right space-x-1.5">
                    <Button
                      size="sm"
                      variant="outline"
                      title="View BOM"
                      onClick={() => { setViewingId(b.id); setViewDialogOpen(true); }}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => { setEditingId(b.id); setEditDialogOpen(true); }}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const label = `${b.productName ?? "Product"} · ${b.bomVersion}`;
                        if (window.confirm(`Delete BOM "${label}"? This cannot be undone.`)) {
                          removeBom.mutate(b.id);
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

      <BomViewDialog
        open={viewDialogOpen}
        bomId={viewingId}
        onClose={() => { setViewDialogOpen(false); setViewingId(null); }}
      />

      <BomEditDialog
        open={editDialogOpen}
        bomId={editingId}
        products={products ?? []}
        onClose={() => { setEditDialogOpen(false); setEditingId(null); }}
        onSaved={() => {
          qc.invalidateQueries({ queryKey: ["boms"] });
          setEditDialogOpen(false);
          setEditingId(null);
        }}
      />
    </div>
  );
}

function BomViewDialog({ open, bomId, onClose }: { open: boolean; bomId: number | null; onClose: () => void }) {
  const { data: bom, isLoading } = useQuery({
    queryKey: ["boms", bomId, "detail"],
    queryFn: async (): Promise<Bom> => {
      const res = await api.get<ApiResponse<Bom>>(`/boms/${bomId}`);
      return res.data.data as Bom;
    },
    enabled: open && !!bomId,
  });

  const title = bom
    ? `${bom.productCode ? `${bom.productCode} — ` : ""}${bom.productName ?? "Product"} · ${bom.bomVersion}`
    : "View BOM";

  return (
    <Dialog isOpen={open} onClose={onClose} title={title} size="xl">
      {isLoading && (
        <div className="py-8 text-center text-muted-foreground">Loading…</div>
      )}
      {!isLoading && bom && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div>
              <div className="text-xs text-muted-foreground uppercase tracking-wider">Status</div>
              <div className="mt-1"><BomStatusPill status={bom.status} /></div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground uppercase tracking-wider">Active</div>
              <div className="mt-1 font-medium">{bom.isActive ? "Yes" : "No"}</div>
            </div>
            <div className="md:col-span-2">
              <div className="text-xs text-muted-foreground uppercase tracking-wider">Remarks</div>
              <div className="mt-1">{bom.remarks || "—"}</div>
            </div>
          </div>

          <div className="overflow-x-auto rounded-md border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="text-left py-2 px-3 w-10">#</th>
                  <th className="text-left py-2 px-3">Item</th>
                  <th className="text-left py-2 px-3 w-28">Qty / Product</th>
                  <th className="text-left py-2 px-3 w-24">Unit</th>
                  <th className="text-left py-2 px-3">Process Flow</th>
                  <th className="text-left py-2 px-3">Remarks</th>
                </tr>
              </thead>
              <tbody>
                {(bom.items ?? []).length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-muted-foreground">No items</td>
                  </tr>
                )}
                {(bom.items ?? []).map((bi, idx) => (
                  <tr key={bi.id} className="border-t border-border/60 align-top">
                    <td className="py-2 px-3 text-muted-foreground">{idx + 1}</td>
                    <td className="py-2 px-3">
                      <div className="font-medium">{bi.itemName || "—"}</div>
                      {bi.itemCode && <div className="text-xs font-mono text-muted-foreground">{bi.itemCode}</div>}
                    </td>
                    <td className="py-2 px-3">{bi.quantityPerProduct}</td>
                    <td className="py-2 px-3">{bi.unitSymbol || bi.unitName || "—"}</td>
                    <td className="py-2 px-3">
                      {(bi.processFlow ?? []).length === 0 ? (
                        <span className="text-muted-foreground">—</span>
                      ) : (
                        <ol className="list-decimal list-inside space-y-0.5 text-xs">
                          {(bi.processFlow ?? []).map((pf) => (
                            <li key={pf.id}>
                              {pf.processName || `Process #${pf.processId}`}
                              {pf.processType ? ` (${pf.processType})` : ""}
                            </li>
                          ))}
                        </ol>
                      )}
                    </td>
                    <td className="py-2 px-3 text-muted-foreground">{bi.remarks || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end pt-2">
            <Button variant="outline" onClick={onClose}>Close</Button>
          </div>
        </div>
      )}
    </Dialog>
  );
}

function BomEditDialog({
  open,
  bomId,
  products,
  onClose,
  onSaved,
}: {
  open: boolean;
  bomId: number | null;
  products: Product[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = bomId != null;
  const [form, setForm] = useState<BomFormState>(EMPTY_BOM_FORM);
  const [saveError, setSaveError] = useState<string | null>(null);

  const { data: detail, isLoading: detailLoading } = useQuery({
    queryKey: ["boms", bomId, "edit"],
    queryFn: async (): Promise<Bom> => {
      const res = await api.get<ApiResponse<Bom>>(`/boms/${bomId}`);
      return res.data.data as Bom;
    },
    enabled: open && isEdit,
  });

  const { data: itemsMaster = [] } = useQuery({
    queryKey: ["items", "active", "bom-dialog"],
    queryFn: async (): Promise<Item[]> => {
      const res = await api.get<ApiResponse<Item[]>>("/items", { params: { activeOnly: true } });
      return res.data.data ?? [];
    },
    enabled: open,
  });

  const { data: units = [] } = useQuery({
    queryKey: ["masters", "units", "active", "bom-dialog"],
    queryFn: async (): Promise<UnitMaster[]> => {
      const res = await api.get<ApiResponse<UnitMaster[]>>("/masters/units/active");
      return res.data.data ?? [];
    },
    enabled: open,
  });

  const { data: processes = [] } = useQuery({
    queryKey: ["processes", "active", "bom-dialog"],
    queryFn: async (): Promise<ProcessMaster[]> => {
      const res = await api.get<ApiResponse<ProcessMaster[]>>("/processes", { params: { activeOnly: true } });
      return res.data.data ?? [];
    },
    enabled: open,
  });

  const itemOptions = useMemo(
    () =>
      itemsMaster.map((i) => ({
        value: i.id,
        label: `${i.itemCode} — ${i.itemName}`,
      })),
    [itemsMaster],
  );

  const unitOptions = useMemo(
    () =>
      units.map((u) => ({
        value: u.id,
        label: `${u.name}${u.symbol ? ` (${u.symbol})` : ""}`,
      })),
    [units],
  );

  const processOptions = useMemo(
    () =>
      processes.map((p) => ({
        value: p.id,
        label: `${p.processName}${p.processType ? ` · ${p.processType}` : ""}`,
      })),
    [processes],
  );

  const productOptions = useMemo(
    () =>
      products.map((p) => ({
        value: p.id,
        label: `${p.productCode} — ${p.productName}`,
      })),
    [products],
  );

  useEffect(() => {
    if (!open) return;
    setSaveError(null);
    if (isEdit && detail) {
      setForm({
        productId: detail.productId,
        bomVersion: detail.bomVersion,
        status: detail.status,
        remarks: detail.remarks ?? "",
        items: (detail.items ?? []).map((bi, idx) => ({
          key: uid(),
          itemId: bi.itemId,
          quantityPerProduct: bi.quantityPerProduct,
          unitId: bi.unitId ?? "",
          remarks: bi.remarks ?? "",
          processIds: (bi.processFlow ?? []).map((pf) => pf.processId),
        })),
      });
      if ((detail.items ?? []).length === 0) {
        setForm((f) => ({ ...f, items: [emptyBomItemRow(1)] }));
      }
    } else if (!isEdit) {
      setForm(EMPTY_BOM_FORM);
    }
  }, [open, isEdit, detail]);

  const updateItem = (key: string, patch: Partial<BomItemFormRow>) =>
    setForm((f) => ({
      ...f,
      items: f.items.map((row) => (row.key === key ? { ...row, ...patch } : row)),
    }));

  const addItem = () =>
    setForm((f) => ({
      ...f,
      items: [...f.items, emptyBomItemRow(f.items.length + 1)],
    }));

  const removeItem = (key: string) =>
    setForm((f) => {
      const filtered = f.items.filter((row) => row.key !== key);
      return { ...f, items: filtered.length ? filtered : f.items };
    });

  const buildPayload = () => ({
    productId: Number(form.productId),
    bomVersion: form.bomVersion.trim(),
    status: form.status,
    remarks: form.remarks.trim() || null,
    items: form.items.map((row, idx) => ({
      itemId: Number(row.itemId),
      quantityPerProduct: row.quantityPerProduct,
      unitId: row.unitId === "" ? null : row.unitId,
      sequence: idx + 1,
      remarks: row.remarks.trim() || null,
      processIds: row.processIds,
    })),
  });

  const save = useMutation({
    mutationFn: async () => {
      const payload = buildPayload();
      if (isEdit && bomId != null) {
        await api.put(`/boms/${bomId}`, payload);
      } else {
        await api.post("/boms", payload);
      }
    },
    onSuccess: () => {
      setSaveError(null);
      toast.success(isEdit ? "BOM updated" : "BOM created");
      onSaved();
    },
    onError: (e: { response?: { data?: { message?: string } } }) => {
      const msg = e?.response?.data?.message || "Failed to save BOM";
      setSaveError(msg);
      toast.error(msg);
    },
  });

  const submit = () => {
    setSaveError(null);
    if (!isEdit && form.productId === "") {
      toast.error("Product is required");
      return;
    }
    if (!form.bomVersion.trim()) {
      toast.error("BOM version is required");
      return;
    }
    for (let i = 0; i < form.items.length; i++) {
      const row = form.items[i];
      if (row.itemId === "") {
        toast.error(`Item is required on row ${i + 1}`);
        return;
      }
      if (!row.quantityPerProduct || row.quantityPerProduct <= 0) {
        toast.error(`Quantity per product must be greater than 0 on row ${i + 1}`);
        return;
      }
    }
    const itemIds = form.items.map((r) => r.itemId);
    if (new Set(itemIds).size !== itemIds.length) {
      toast.error("Duplicate items are not allowed in the same BOM");
      return;
    }
    save.mutate();
  };

  const loadingForm = isEdit && detailLoading;

  return (
    <Dialog
      isOpen={open}
      onClose={onClose}
      title={isEdit ? "Edit BOM" : "New BOM"}
      size="2xl"
    >
      {loadingForm ? (
        <div className="py-8 text-center text-muted-foreground">Loading…</div>
      ) : (
        <div className="space-y-4">
          {saveError && (
            <div className="rounded-md border border-rose-200 bg-rose-50 dark:bg-rose-950/30 dark:border-rose-900 px-3 py-2 text-sm text-rose-700 dark:text-rose-300">
              {saveError}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            <div className="md:col-span-6 space-y-2">
              <Label>Product *</Label>
              {isEdit ? (
                <Input
                  disabled
                  value={
                    detail
                      ? `${detail.productCode ? `${detail.productCode} — ` : ""}${detail.productName ?? ""}`
                      : ""
                  }
                />
              ) : (
                <SearchableSelect
                  options={productOptions}
                  value={form.productId}
                  onChange={(v) =>
                    setForm((f) => ({
                      ...f,
                      productId: typeof v === "string" ? Number(v) : v,
                    }))
                  }
                  placeholder="Select product…"
                  searchPlaceholder="Search by name or code…"
                />
              )}
            </div>
            <div className="md:col-span-3 space-y-2">
              <Label>BOM Version *</Label>
              <Input
                value={form.bomVersion}
                onChange={(e) => setForm((f) => ({ ...f, bomVersion: e.target.value }))}
                placeholder="v1"
                className="font-mono"
              />
            </div>
            <div className="md:col-span-3 space-y-2">
              <Label>Status</Label>
              <select
                className="w-full h-10 rounded-md border border-border bg-background px-3 text-sm"
                value={form.status}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as BomStatus }))}
              >
                <option value={BomStatus.Draft}>Draft</option>
                <option value={BomStatus.Active}>Active</option>
                <option value={BomStatus.Inactive}>Inactive</option>
              </select>
            </div>
            <div className="md:col-span-12 space-y-2">
              <Label>Remarks</Label>
              <Textarea
                rows={2}
                value={form.remarks}
                onChange={(e) => setForm((f) => ({ ...f, remarks: e.target.value }))}
                placeholder="Optional notes"
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <Label className="text-sm font-semibold">BOM Items</Label>
            <Button type="button" variant="outline" size="sm" onClick={addItem}>
              <Plus className="w-4 h-4 mr-1" /> Add row
            </Button>
          </div>

          <div className="overflow-x-auto rounded-md border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="text-left py-2 px-3 w-10">#</th>
                  <th className="text-left py-2 px-3 min-w-[220px]">Item *</th>
                  <th className="text-left py-2 px-3 w-28">Qty / Product *</th>
                  <th className="text-left py-2 px-3 w-32">Unit</th>
                  <th className="text-left py-2 px-3 min-w-[200px]">Processes</th>
                  <th className="text-left py-2 px-3 min-w-[140px]">Remarks</th>
                  <th className="text-right py-2 px-3 w-10"></th>
                </tr>
              </thead>
              <tbody>
                {form.items.map((row, idx) => (
                  <tr key={row.key} className="border-t border-border/60 align-top">
                    <td className="py-2 px-3 text-muted-foreground font-medium">{idx + 1}</td>
                    <td className="py-2 px-3">
                      <SearchableSelect
                        options={itemOptions}
                        value={row.itemId}
                        onChange={(v) =>
                          updateItem(row.key, {
                            itemId: typeof v === "string" ? Number(v) : v,
                          })
                        }
                        placeholder="Select item…"
                        searchPlaceholder="Search item…"
                      />
                    </td>
                    <td className="py-2 px-3">
                      <Input
                        type="number"
                        min={0}
                        step="any"
                        value={row.quantityPerProduct}
                        onChange={(e) =>
                          updateItem(row.key, {
                            quantityPerProduct: Number(e.target.value),
                          })
                        }
                      />
                    </td>
                    <td className="py-2 px-3">
                      <select
                        className="w-full h-10 rounded-md border border-border bg-background px-2 text-sm"
                        value={row.unitId === "" ? "" : String(row.unitId)}
                        onChange={(e) =>
                          updateItem(row.key, {
                            unitId: e.target.value === "" ? "" : Number(e.target.value),
                          })
                        }
                      >
                        <option value="">—</option>
                        {unitOptions.map((u) => (
                          <option key={u.value} value={u.value}>
                            {u.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-2 px-3">
                      <MultiSelectSearch
                        options={processOptions}
                        value={row.processIds}
                        onChange={(v) =>
                          updateItem(row.key, {
                            processIds: v.map((x) => Number(x)),
                          })
                        }
                        placeholder="Select processes"
                        searchPlaceholder="Search processes…"
                      />
                    </td>
                    <td className="py-2 px-3">
                      <Input
                        value={row.remarks}
                        onChange={(e) => updateItem(row.key, { remarks: e.target.value })}
                        placeholder="Optional"
                      />
                    </td>
                    <td className="py-2 px-3 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeItem(row.key)}
                        disabled={form.items.length <= 1}
                        title="Remove row"
                      >
                        <Trash2 className="w-4 h-4 text-rose-500" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-border">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={submit} disabled={save.isPending}>
              <Save className="w-4 h-4 mr-2" />
              {save.isPending ? "Saving…" : isEdit ? "Update" : "Create"}
            </Button>
          </div>
        </div>
      )}
    </Dialog>
  );
}
