"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import {
  ShoppingBag, Plus, Pencil, Trash2, Search, Save, Upload, FileText, Package,
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
import { ApiResponse, NamedMaster, Product, UnitMaster } from "@/types";

const PAGE_SIZE = 25;

interface ProductListResponse {
  data: Product[];
  totalCount: number;
}

export default function ProductsPage() {
  const { data: permissions, isLoading: permLoading } = useCurrentUserPermissions();
  const qc = useQueryClient();

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [categoryFilter, setCategoryFilter] = useState<number | "">("");
  const [activeOnly, setActiveOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [nextCode, setNextCode] = useState<string>("");

  useEffect(() => { setPage(1); }, [debouncedSearch, categoryFilter, activeOnly]);

  const canManage = !!permissions?.manageProduct;

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["products", debouncedSearch, categoryFilter, activeOnly, page],
    queryFn: async (): Promise<ProductListResponse> => {
      const params: Record<string, any> = { page, pageSize: PAGE_SIZE };
      if (debouncedSearch) params.search = debouncedSearch;
      if (categoryFilter) params.productCategoryId = categoryFilter;
      if (activeOnly) params.activeOnly = true;
      const res = await api.get<ApiResponse<Product[]>>("/products", { params });
      return { data: res.data.data ?? [], totalCount: res.data.totalCount ?? 0 };
    },
    enabled: canManage,
  });

  const { data: categories } = useQuery({
    queryKey: ["masters", "product-categories", "active"],
    queryFn: async (): Promise<NamedMaster[]> => {
      const res = await api.get<ApiResponse<NamedMaster[]>>("/masters/product-categories/active");
      return res.data.data ?? [];
    },
    enabled: canManage,
  });

  const fetchNextCode = async () => {
    try {
      const r = await api.get<ApiResponse<string>>("/products/next-code");
      setNextCode(r.data.data ?? "");
    } catch { setNextCode(""); }
  };

  const toggleActive = useMutation({
    mutationFn: async ({ id, isActive }: { id: number; isActive: boolean }) => {
      await api.patch(`/products/${id}/active`, { isActive });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["products"] });
      toast.success("Status updated");
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || "Failed to update status"),
  });

  const removeProduct = useMutation({
    mutationFn: async (id: number) => { await api.delete(`/products/${id}`); },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["products"] });
      toast.success("Product deleted");
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || "Failed to delete"),
  });

  const openNew = async () => {
    setEditing(null);
    await fetchNextCode();
    setDialogOpen(true);
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
            <ShoppingBag className="w-5 h-5 text-primary-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Product Master</h1>
            <p className="text-sm text-muted-foreground">Finished goods catalogue with drawings and BOM linkage.</p>
          </div>
        </div>
        <Button onClick={openNew}>
          <Plus className="w-4 h-4 mr-2" /> New Product
        </Button>
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
                placeholder="Search by name, code or drawing…"
                className="pl-9"
              />
            </div>
          </div>
          <div className="md:col-span-4">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Category</Label>
            <select
              className="mt-1 w-full h-10 rounded-md border border-border bg-background px-3 text-sm"
              value={categoryFilter === "" ? "" : String(categoryFilter)}
              onChange={(e) => setCategoryFilter(e.target.value ? Number(e.target.value) : "")}
            >
              <option value="">All Categories</option>
              {(categories ?? []).map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2 flex items-center gap-2 pt-5">
            <Switch checked={activeOnly} onCheckedChange={setActiveOnly} id="active-only-prd" />
            <Label htmlFor="active-only-prd" className="text-sm">Active only</Label>
          </div>
          <div className="md:col-span-1 text-right text-xs text-muted-foreground pt-5">
            {isFetching ? "…" : totalCount}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="py-2.5 px-3">Product Code</th>
                <th className="py-2.5 px-3">Product Name</th>
                <th className="py-2.5 px-3">Category</th>
                <th className="py-2.5 px-3">Unit</th>
                <th className="py-2.5 px-3">Drawing No</th>
                <th className="py-2.5 px-3">Rev</th>
                <th className="py-2.5 px-3 text-center">Std BOM</th>
                <th className="py-2.5 px-3 text-center">Active</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr><td colSpan={9} className="py-8 text-center text-muted-foreground">Loading…</td></tr>
              )}
              {!isLoading && rows.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-muted-foreground">
                    <Package className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <div className="font-medium text-foreground">No products yet</div>
                    <div className="text-xs">Click "New Product" to create your first product.</div>
                  </td>
                </tr>
              )}
              {rows.map((p) => (
                <tr key={p.id} className="border-b border-border/60 hover:bg-muted/30 transition-colors">
                  <td className="py-2.5 px-3 font-mono text-xs">{p.productCode}</td>
                  <td className="py-2.5 px-3">
                    <div className="font-medium text-foreground">{p.productName}</div>
                    {p.description && <div className="text-xs text-muted-foreground truncate max-w-[260px]">{p.description}</div>}
                  </td>
                  <td className="py-2.5 px-3">{p.productCategoryName || "—"}</td>
                  <td className="py-2.5 px-3">{p.unitSymbol || p.unitName || "—"}</td>
                  <td className="py-2.5 px-3">
                    {p.drawingFileUrl ? (
                      <a href={p.drawingFileUrl} target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline">
                        {p.drawingNumber || "View"}
                      </a>
                    ) : p.drawingNumber || "—"}
                  </td>
                  <td className="py-2.5 px-3">{p.revisionNumber || "—"}</td>
                  <td className="py-2.5 px-3 text-center">
                    {p.standardBomAvailable ? (
                      <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300">Yes</span>
                    ) : (
                      <span className="text-xs text-muted-foreground">No</span>
                    )}
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
                        if (window.confirm(`Delete product "${p.productName}"? This cannot be undone.`)) {
                          removeProduct.mutate(p.id);
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

      <ProductDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        editing={editing}
        nextCode={nextCode}
        onSaved={() => { qc.invalidateQueries({ queryKey: ["products"] }); setDialogOpen(false); }}
      />
    </div>
  );
}

interface ProductFormState {
  productName: string;
  productCategoryId: number | "";
  unitId: number | "";
  drawingNumber: string;
  revisionNumber: string;
  drawingFileUrl: string;
  standardBomAvailable: boolean;
  description: string;
  isActive: boolean;
}

const EMPTY_PRODUCT_FORM: ProductFormState = {
  productName: "",
  productCategoryId: "",
  unitId: "",
  drawingNumber: "",
  revisionNumber: "",
  drawingFileUrl: "",
  standardBomAvailable: true,
  description: "",
  isActive: true,
};

function ProductDialog({ open, onClose, editing, nextCode, onSaved }: {
  open: boolean; onClose: () => void; editing: Product | null; nextCode: string; onSaved: () => void;
}) {
  const isEdit = !!editing;
  const [form, setForm] = useState<ProductFormState>(EMPTY_PRODUCT_FORM);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: categories } = useQuery({
    queryKey: ["masters", "product-categories", "active"],
    queryFn: async (): Promise<NamedMaster[]> => {
      const res = await api.get<ApiResponse<NamedMaster[]>>("/masters/product-categories/active");
      return res.data.data ?? [];
    },
    enabled: open,
  });

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
        productName: editing.productName,
        productCategoryId: editing.productCategoryId ?? "",
        unitId: editing.unitId ?? "",
        drawingNumber: editing.drawingNumber ?? "",
        revisionNumber: editing.revisionNumber ?? "",
        drawingFileUrl: editing.drawingFileUrl ?? "",
        standardBomAvailable: editing.standardBomAvailable,
        description: editing.description ?? "",
        isActive: editing.isActive,
      });
    } else {
      setForm(EMPTY_PRODUCT_FORM);
    }
  }, [open, editing]);

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        productName: form.productName.trim(),
        productCategoryId: form.productCategoryId || null,
        unitId: form.unitId || null,
        drawingNumber: form.drawingNumber.trim() || null,
        revisionNumber: form.revisionNumber.trim() || null,
        drawingFileUrl: form.drawingFileUrl || null,
        standardBomAvailable: form.standardBomAvailable,
        description: form.description.trim() || null,
        isActive: form.isActive,
      };
      if (isEdit && editing) await api.put(`/products/${editing.id}`, payload);
      else await api.post("/products", payload);
    },
    onSuccess: () => {
      toast.success(isEdit ? "Product updated" : "Product created");
      onSaved();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || "Failed to save product"),
  });

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await api.post<ApiResponse<{ url: string }>>("/products/upload-drawing", fd, {
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
    if (!form.productName.trim()) { toast.error("Product name is required"); return; }
    save.mutate();
  };

  return (
    <Dialog isOpen={open} onClose={onClose} title={isEdit ? "Edit Product" : "New Product"} size="xl">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Product Code</Label>
          <Input value={isEdit ? editing!.productCode : nextCode} disabled placeholder="Auto-generated" className="font-mono" />
        </div>
        <div className="space-y-2">
          <Label>Product Name *</Label>
          <Input
            value={form.productName}
            onChange={(e) => setForm((f) => ({ ...f, productName: e.target.value }))}
            placeholder="e.g. Ball Valve 1/2 inch"
          />
        </div>

        <div className="space-y-2">
          <Label>Category</Label>
          <select
            className="w-full h-10 rounded-md border border-border bg-background px-3 text-sm"
            value={form.productCategoryId === "" ? "" : String(form.productCategoryId)}
            onChange={(e) => setForm((f) => ({ ...f, productCategoryId: e.target.value ? Number(e.target.value) : "" }))}
          >
            <option value="">— None —</option>
            {(categories ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

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
            placeholder="DRG-001"
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
          <Switch checked={form.standardBomAvailable} onCheckedChange={(c) => setForm((f) => ({ ...f, standardBomAvailable: c }))} />
          <Label>Standard BOM Available</Label>
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label>Description</Label>
          <Textarea
            rows={3}
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            placeholder="Optional notes / specification"
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
