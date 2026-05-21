"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import {
  ChevronRight,
  ClipboardList,
  Hammer,
  Layers,
  Loader2,
  Plus,
  Save,
  Trash2,
} from "lucide-react";

import { Dialog } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { MultiSelectSearch } from "@/components/ui/multi-select-search";

import api from "@/lib/api";
import {
  BomStatus,
  Item,
  Party,
  ProcessMaster,
  Product,
} from "@/types";

interface NewOrderDialogProps {
  open: boolean;
  onClose: () => void;
  onCreated?: (orderId: number) => void;
}

interface InlineBomItemRow {
  key: string;
  itemId: number | "";
  quantityPerProduct: number;
  unitId: number | "";
  sequence: number;
  processIds: number[];
  remarks: string;
}

interface InlineBomDraft {
  bomVersion: string;
  status: BomStatus;
  remarks: string;
  items: InlineBomItemRow[];
}

interface OrderItemRow {
  key: string;
  productId: number | "";
  quantityOrdered: number;
  mode: "existing" | "inline";
  bomId: number | "";
  remarks: string;
  inlineBom: InlineBomDraft;
}

interface BomLite {
  id: number;
  bomVersion: string;
  status: BomStatus;
  isActive: boolean;
  itemCount?: number;
}

interface UnitLite {
  id: number;
  name: string;
  symbol?: string | null;
}

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function emptyInlineBom(): InlineBomDraft {
  return {
    bomVersion: "v1",
    status: BomStatus.Active,
    remarks: "",
    items: [emptyInlineBomItem(1)],
  };
}

function emptyInlineBomItem(sequence: number): InlineBomItemRow {
  return {
    key: uid(),
    itemId: "",
    quantityPerProduct: 1,
    unitId: "",
    sequence,
    processIds: [],
    remarks: "",
  };
}

function emptyOrderItem(): OrderItemRow {
  return {
    key: uid(),
    productId: "",
    quantityOrdered: 1,
    mode: "existing",
    bomId: "",
    remarks: "",
    inlineBom: emptyInlineBom(),
  };
}

const today = () => new Date().toISOString().slice(0, 10);

export function NewOrderDialog({ open, onClose, onCreated }: NewOrderDialogProps) {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<"details" | "products">("details");
  const [orderDate, setOrderDate] = useState<string>(today());
  const [requiredDate, setRequiredDate] = useState<string>("");
  const [customerId, setCustomerId] = useState<number | "">("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<OrderItemRow[]>([emptyOrderItem()]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open) {
      setTab("details");
      setOrderDate(today());
      setRequiredDate("");
      setCustomerId("");
      setNotes("");
      setItems([emptyOrderItem()]);
      setErrors({});
    }
  }, [open]);

  // ───────────────────────────────── Lookups
  const { data: nextCode } = useQuery({
    queryKey: ["orders", "next-code"],
    queryFn: async (): Promise<string> => {
      const r = await api.get("/orders/next-code");
      return r.data?.data ?? "";
    },
    enabled: open,
    staleTime: 0,
  });

  const { data: customers = [] } = useQuery({
    queryKey: ["parties", "active", "Customer"],
    queryFn: async (): Promise<Party[]> => {
      const r = await api.get("/parties/active", { params: { type: "Customer" } });
      return r.data?.data ?? [];
    },
    enabled: open,
  });

  const { data: products = [] } = useQuery({
    queryKey: ["products", "active"],
    queryFn: async (): Promise<Product[]> => {
      const r = await api.get("/products/active");
      return r.data?.data ?? [];
    },
    enabled: open,
  });

  const { data: itemsMaster = [] } = useQuery({
    queryKey: ["items", "active"],
    queryFn: async (): Promise<Item[]> => {
      const r = await api.get("/items/active");
      return r.data?.data ?? [];
    },
    enabled: open,
  });

  const { data: units = [] } = useQuery({
    queryKey: ["masters", "units", "active"],
    queryFn: async (): Promise<UnitLite[]> => {
      const r = await api.get("/masters/units/active");
      return r.data?.data ?? [];
    },
    enabled: open,
  });

  const { data: processes = [] } = useQuery({
    queryKey: ["processes", "active"],
    queryFn: async (): Promise<ProcessMaster[]> => {
      const r = await api.get("/processes/active");
      return r.data?.data ?? [];
    },
    enabled: open,
  });

  // ───────────────────────────────── Mutations
  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      const r = await api.post("/orders", payload);
      return r.data?.data;
    },
    onSuccess: (data: any) => {
      toast.success("Order created");
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      onCreated?.(data?.id);
      onClose();
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message ?? "Failed to create order";
      toast.error(msg);
    },
  });

  // ───────────────────────────────── Helpers
  const updateItem = (key: string, patch: Partial<OrderItemRow>) =>
    setItems((prev) => prev.map((it) => (it.key === key ? { ...it, ...patch } : it)));

  const updateInlineBom = (key: string, patch: Partial<InlineBomDraft>) =>
    setItems((prev) =>
      prev.map((it) =>
        it.key === key ? { ...it, inlineBom: { ...it.inlineBom, ...patch } } : it,
      ),
    );

  const updateInlineBomItem = (
    rowKey: string,
    itemKey: string,
    patch: Partial<InlineBomItemRow>,
  ) =>
    setItems((prev) =>
      prev.map((it) => {
        if (it.key !== rowKey) return it;
        return {
          ...it,
          inlineBom: {
            ...it.inlineBom,
            items: it.inlineBom.items.map((bi) =>
              bi.key === itemKey ? { ...bi, ...patch } : bi,
            ),
          },
        };
      }),
    );

  const addItem = () => setItems((p) => [...p, emptyOrderItem()]);
  const removeItem = (key: string) =>
    setItems((p) => (p.length === 1 ? p : p.filter((it) => it.key !== key)));

  const addInlineBomItem = (rowKey: string) =>
    setItems((prev) =>
      prev.map((it) => {
        if (it.key !== rowKey) return it;
        return {
          ...it,
          inlineBom: {
            ...it.inlineBom,
            items: [
              ...it.inlineBom.items,
              emptyInlineBomItem(it.inlineBom.items.length + 1),
            ],
          },
        };
      }),
    );

  const removeInlineBomItem = (rowKey: string, itemKey: string) =>
    setItems((prev) =>
      prev.map((it) => {
        if (it.key !== rowKey) return it;
        const filtered = it.inlineBom.items.filter((bi) => bi.key !== itemKey);
        return {
          ...it,
          inlineBom: { ...it.inlineBom, items: filtered.length ? filtered : it.inlineBom.items },
        };
      }),
    );

  // ───────────────────────────────── Validation
  const validate = (): { ok: boolean; firstTab?: "details" | "products" } => {
    const e: Record<string, string> = {};
    let firstTab: "details" | "products" | undefined;

    if (!customerId) {
      e.customerId = "Customer is required.";
      firstTab = firstTab ?? "details";
    }
    if (!orderDate) {
      e.orderDate = "Order date is required.";
      firstTab = firstTab ?? "details";
    }

    if (!items.length) {
      e.items = "At least one product is required.";
      firstTab = firstTab ?? "products";
    }

    items.forEach((row, idx) => {
      if (!row.productId) {
        e[`row-${row.key}-product`] = "Product is required.";
        firstTab = firstTab ?? "products";
      }
      if (!row.quantityOrdered || row.quantityOrdered <= 0) {
        e[`row-${row.key}-qty`] = "Quantity must be > 0.";
        firstTab = firstTab ?? "products";
      }
      if (row.mode === "existing") {
        if (!row.bomId) {
          e[`row-${row.key}-bom`] = "Select a BOM or switch to Create New BOM.";
          firstTab = firstTab ?? "products";
        }
      } else {
        if (!row.inlineBom.bomVersion.trim()) {
          e[`row-${row.key}-bomVersion`] = "BOM version required.";
          firstTab = firstTab ?? "products";
        }
        const bomItems = row.inlineBom.items;
        if (!bomItems.length) {
          e[`row-${row.key}-bomItems`] = "At least one BOM item is required.";
          firstTab = firstTab ?? "products";
        }
        bomItems.forEach((bi) => {
          if (!bi.itemId) {
            e[`row-${row.key}-bi-${bi.key}-item`] = "Item required";
            firstTab = firstTab ?? "products";
          }
          if (!bi.quantityPerProduct || bi.quantityPerProduct <= 0) {
            e[`row-${row.key}-bi-${bi.key}-qty`] = "Qty > 0";
            firstTab = firstTab ?? "products";
          }
        });
        const dup = new Set<number>();
        const dupIds: number[] = [];
        bomItems.forEach((bi) => {
          if (typeof bi.itemId === "number") {
            if (dup.has(bi.itemId)) dupIds.push(bi.itemId);
            dup.add(bi.itemId);
          }
        });
        if (dupIds.length) {
          e[`row-${row.key}-bomDup`] = "Duplicate items in BOM are not allowed.";
          firstTab = firstTab ?? "products";
        }
      }
      void idx;
    });

    setErrors(e);
    return { ok: Object.keys(e).length === 0, firstTab };
  };

  const handleSubmit = () => {
    const { ok, firstTab } = validate();
    if (!ok) {
      if (firstTab) setTab(firstTab);
      toast.error("Please fix the highlighted errors.");
      return;
    }

    const payload = {
      customerId: customerId as number,
      orderDate,
      requiredDeliveryDate: requiredDate || null,
      notes: notes.trim() || null,
      items: items.map((row) => ({
        productId: row.productId as number,
        quantityOrdered: row.quantityOrdered,
        bomId: row.mode === "existing" ? (row.bomId as number) : null,
        inlineBom:
          row.mode === "inline"
            ? {
                productId: row.productId as number,
                bomVersion: row.inlineBom.bomVersion.trim(),
                status: row.inlineBom.status,
                remarks: row.inlineBom.remarks.trim() || null,
                items: row.inlineBom.items.map((bi, idx) => ({
                  itemId: bi.itemId as number,
                  quantityPerProduct: Number(bi.quantityPerProduct),
                  unitId: bi.unitId === "" ? null : (bi.unitId as number),
                  sequence: bi.sequence || idx + 1,
                  remarks: bi.remarks.trim() || null,
                  processIds: bi.processIds,
                })),
              }
            : null,
        remarks: row.remarks.trim() || null,
      })),
    };

    createMutation.mutate(payload);
  };

  const productOptions = useMemo(
    () =>
      products.map((p) => ({
        value: p.id,
        label: `${p.productCode} — ${p.productName}`,
      })),
    [products],
  );
  const customerOptions = useMemo(
    () =>
      customers.map((c) => ({
        value: c.id,
        label: `${c.partyName}${c.mobileNumber ? ` · ${c.mobileNumber}` : ""}`,
      })),
    [customers],
  );
  const itemOptions = useMemo(
    () =>
      itemsMaster.map((i) => ({
        value: i.id,
        label: `${i.itemCode} — ${i.itemName}`,
      })),
    [itemsMaster],
  );
  const unitOptions = useMemo(
    () => units.map((u) => ({ value: u.id, label: u.symbol ? `${u.name} (${u.symbol})` : u.name })),
    [units],
  );
  const processOptions = useMemo(
    () => processes.map((p) => ({ value: p.id, label: p.processName })),
    [processes],
  );

  return (
    <Dialog
      isOpen={open}
      onClose={() => {
        if (!createMutation.isPending) onClose();
      }}
      title="New Sales Order"
      size="full"
      closeButtonDisabled={createMutation.isPending}
      contentScroll={false}
    >
      <div className="flex flex-col h-full">
        <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="flex-1 flex flex-col min-h-0">
          <div className="px-6 pt-4">
            <TabsList>
              <TabsTrigger value="details" className="flex items-center gap-2">
                <ClipboardList className="w-4 h-4" /> Order Details
              </TabsTrigger>
              <TabsTrigger value="products" className="flex items-center gap-2">
                <Layers className="w-4 h-4" /> Products
                <span className="ml-1 inline-flex items-center justify-center rounded-full bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300 text-[10px] font-semibold w-5 h-5">
                  {items.length}
                </span>
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4">
            <TabsContent value="details" className="mt-0">
              <Card className="p-6 space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <div className="space-y-2">
                    <Label>Order Number</Label>
                    <Input value={nextCode ?? ""} disabled placeholder="ORD-…" />
                    <p className="text-[11px] text-muted-foreground">Auto-generated on save.</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Order Date *</Label>
                    <Input
                      type="date"
                      value={orderDate}
                      onChange={(e) => setOrderDate(e.target.value)}
                    />
                    {errors.orderDate && (
                      <p className="text-xs text-rose-500">{errors.orderDate}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Required Delivery Date</Label>
                    <Input
                      type="date"
                      value={requiredDate}
                      onChange={(e) => setRequiredDate(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Customer *</Label>
                  <SearchableSelect
                    options={customerOptions}
                    value={customerId}
                    onChange={(v) => setCustomerId(typeof v === "string" ? Number(v) : v)}
                    placeholder="Search and select a customer…"
                    searchPlaceholder="Search customer name, mobile…"
                  />
                  {errors.customerId && (
                    <p className="text-xs text-rose-500">{errors.customerId}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Textarea
                    rows={4}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Internal notes, customer PO reference, packaging instructions…"
                  />
                </div>

                <div className="flex justify-end">
                  <Button onClick={() => setTab("products")}>
                    Next: Products <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="products" className="mt-0 space-y-4">
              {items.map((row, idx) => (
                <OrderItemCard
                  key={row.key}
                  index={idx}
                  row={row}
                  errors={errors}
                  products={products}
                  productOptions={productOptions}
                  itemOptions={itemOptions}
                  unitOptions={unitOptions}
                  processOptions={processOptions}
                  onUpdate={(patch) => updateItem(row.key, patch)}
                  onRemove={() => removeItem(row.key)}
                  onUpdateInlineBom={(patch) => updateInlineBom(row.key, patch)}
                  onUpdateInlineBomItem={(itemKey, patch) =>
                    updateInlineBomItem(row.key, itemKey, patch)
                  }
                  onAddInlineBomItem={() => addInlineBomItem(row.key)}
                  onRemoveInlineBomItem={(itemKey) => removeInlineBomItem(row.key, itemKey)}
                  removable={items.length > 1}
                />
              ))}

              <div>
                <Button variant="outline" onClick={addItem}>
                  <Plus className="w-4 h-4 mr-1" /> Add Product
                </Button>
              </div>
            </TabsContent>
          </div>
        </Tabs>

        <div className="flex items-center justify-between gap-2 px-6 py-4 border-t border-border bg-muted/30">
          <p className="text-xs text-muted-foreground">
            {tab === "details"
              ? "Fill in order header, then move to Products."
              : `Products in this order: ${items.length}`}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} disabled={createMutation.isPending}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending}>
              {createMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              {createMutation.isPending ? "Creating…" : "Create Order"}
            </Button>
          </div>
        </div>
      </div>
    </Dialog>
  );
}

// ─────────────────────────────────────────────────────────── Order Item Card

interface OrderItemCardProps {
  index: number;
  row: OrderItemRow;
  errors: Record<string, string>;
  products: Product[];
  productOptions: { value: number; label: string }[];
  itemOptions: { value: number; label: string }[];
  unitOptions: { value: number; label: string }[];
  processOptions: { value: number; label: string }[];
  onUpdate: (patch: Partial<OrderItemRow>) => void;
  onRemove: () => void;
  onUpdateInlineBom: (patch: Partial<InlineBomDraft>) => void;
  onUpdateInlineBomItem: (itemKey: string, patch: Partial<InlineBomItemRow>) => void;
  onAddInlineBomItem: () => void;
  onRemoveInlineBomItem: (itemKey: string) => void;
  removable: boolean;
}

function OrderItemCard({
  index,
  row,
  errors,
  products,
  productOptions,
  itemOptions,
  unitOptions,
  processOptions,
  onUpdate,
  onRemove,
  onUpdateInlineBom,
  onUpdateInlineBomItem,
  onAddInlineBomItem,
  onRemoveInlineBomItem,
  removable,
}: OrderItemCardProps) {
  const productId = typeof row.productId === "number" ? row.productId : undefined;

  const { data: bomsForProduct = [], isFetching: bomsLoading } = useQuery({
    queryKey: ["boms", "by-product", productId],
    queryFn: async (): Promise<BomLite[]> => {
      if (!productId) return [];
      const r = await api.get(`/boms/by-product/${productId}`);
      return r.data?.data ?? [];
    },
    enabled: !!productId,
  });

  // Auto reset bomId if product changes
  useEffect(() => {
    if (row.mode === "existing" && row.bomId !== "") {
      const stillValid = bomsForProduct.some((b) => b.id === row.bomId);
      if (!stillValid && bomsForProduct.length > 0) onUpdate({ bomId: "" });
    }
  }, [bomsForProduct, row.bomId, row.mode]); // eslint-disable-line react-hooks/exhaustive-deps

  const product = products.find((p) => p.id === productId);
  const bomOptions = bomsForProduct.map((b) => ({
    value: b.id,
    label: `${b.bomVersion} · ${b.status}${b.itemCount != null ? ` · ${b.itemCount} items` : ""}`,
    disabled: !b.isActive,
  }));

  return (
    <Card className="p-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-600 dark:text-primary-300 font-semibold">
            #{index + 1}
          </div>
          <div>
            <h3 className="font-semibold text-foreground">
              {product ? `${product.productCode} — ${product.productName}` : "Select Product"}
            </h3>
            <p className="text-xs text-muted-foreground">
              Add a product and pick its BOM, or build a new BOM inline.
            </p>
          </div>
        </div>
        {removable && (
          <Button variant="ghost" size="sm" onClick={onRemove} title="Remove product">
            <Trash2 className="w-4 h-4 text-rose-500" />
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        <div className="md:col-span-6 space-y-2">
          <Label>Product *</Label>
          <SearchableSelect
            options={productOptions}
            value={row.productId}
            onChange={(v) => {
              const id = typeof v === "string" ? Number(v) : v;
              onUpdate({ productId: id, bomId: "" });
            }}
            placeholder="Search product…"
            searchPlaceholder="Search by name or code…"
          />
          {errors[`row-${row.key}-product`] && (
            <p className="text-xs text-rose-500">{errors[`row-${row.key}-product`]}</p>
          )}
        </div>
        <div className="md:col-span-2 space-y-2">
          <Label>Qty Ordered *</Label>
          <Input
            type="number"
            min={1}
            step={1}
            value={row.quantityOrdered}
            onChange={(e) =>
              onUpdate({ quantityOrdered: Math.max(0, parseInt(e.target.value || "0", 10)) })
            }
          />
          {errors[`row-${row.key}-qty`] && (
            <p className="text-xs text-rose-500">{errors[`row-${row.key}-qty`]}</p>
          )}
        </div>
        <div className="md:col-span-4 space-y-2">
          <Label>Remarks</Label>
          <Input
            value={row.remarks}
            onChange={(e) => onUpdate({ remarks: e.target.value })}
            placeholder="Optional"
          />
        </div>
      </div>

      <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Hammer className="w-4 h-4 text-primary-600" />
            <div>
              <div className="font-medium text-sm text-foreground">Bill of Material</div>
              <p className="text-xs text-muted-foreground">
                {row.mode === "existing"
                  ? "Pick an existing BOM for this product."
                  : "Build a new BOM that will be saved and linked to this order."}
              </p>
            </div>
          </div>
          <label className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">Create New BOM</span>
            <Switch
              checked={row.mode === "inline"}
              onCheckedChange={(c) => onUpdate({ mode: c ? "inline" : "existing" })}
            />
          </label>
        </div>

        {row.mode === "existing" ? (
          <div className="space-y-2">
            <Label>Existing BOM *</Label>
            <SearchableSelect
              options={bomOptions}
              value={row.bomId}
              onChange={(v) => onUpdate({ bomId: typeof v === "string" ? Number(v) : v })}
              placeholder={
                !productId
                  ? "Select a product first"
                  : bomsLoading
                    ? "Loading BOMs…"
                    : bomsForProduct.length === 0
                      ? "No BOMs for this product"
                      : "Select BOM version"
              }
              disabled={!productId || bomsLoading}
              searchPlaceholder="Search BOM version…"
            />
            {errors[`row-${row.key}-bom`] && (
              <p className="text-xs text-rose-500">{errors[`row-${row.key}-bom`]}</p>
            )}
          </div>
        ) : (
          <InlineBomBuilder
            row={row}
            errors={errors}
            itemOptions={itemOptions}
            unitOptions={unitOptions}
            processOptions={processOptions}
            onUpdate={onUpdateInlineBom}
            onUpdateItem={onUpdateInlineBomItem}
            onAddItem={onAddInlineBomItem}
            onRemoveItem={onRemoveInlineBomItem}
          />
        )}
      </div>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────── Inline BOM Builder

function InlineBomBuilder({
  row,
  errors,
  itemOptions,
  unitOptions,
  processOptions,
  onUpdate,
  onUpdateItem,
  onAddItem,
  onRemoveItem,
}: {
  row: OrderItemRow;
  errors: Record<string, string>;
  itemOptions: { value: number; label: string }[];
  unitOptions: { value: number; label: string }[];
  processOptions: { value: number; label: string }[];
  onUpdate: (patch: Partial<InlineBomDraft>) => void;
  onUpdateItem: (itemKey: string, patch: Partial<InlineBomItemRow>) => void;
  onAddItem: () => void;
  onRemoveItem: (itemKey: string) => void;
}) {
  const bom = row.inlineBom;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
        <div className="md:col-span-3 space-y-2">
          <Label>BOM Version *</Label>
          <Input
            value={bom.bomVersion}
            onChange={(e) => onUpdate({ bomVersion: e.target.value })}
            placeholder="v1"
          />
          {errors[`row-${row.key}-bomVersion`] && (
            <p className="text-xs text-rose-500">{errors[`row-${row.key}-bomVersion`]}</p>
          )}
        </div>
        <div className="md:col-span-3 space-y-2">
          <Label>Status</Label>
          <select
            className="w-full h-10 rounded-md border border-border bg-card px-3 text-sm"
            value={bom.status}
            onChange={(e) => onUpdate({ status: e.target.value as BomStatus })}
          >
            <option value={BomStatus.Active}>Active</option>
            <option value={BomStatus.Draft}>Draft</option>
            <option value={BomStatus.Inactive}>Inactive</option>
          </select>
        </div>
        <div className="md:col-span-6 space-y-2">
          <Label>BOM Remarks</Label>
          <Input
            value={bom.remarks}
            onChange={(e) => onUpdate({ remarks: e.target.value })}
            placeholder="Optional"
          />
        </div>
      </div>

      <div className="overflow-x-auto rounded-md border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="text-left py-2 px-3 w-10">#</th>
              <th className="text-left py-2 px-3 min-w-[240px]">Item *</th>
              <th className="text-left py-2 px-3 w-28">Qty / Product *</th>
              <th className="text-left py-2 px-3 w-32">Unit</th>
              <th className="text-left py-2 px-3 min-w-[240px]">Processes</th>
              <th className="text-left py-2 px-3 min-w-[180px]">Remarks</th>
              <th className="text-right py-2 px-3 w-10"></th>
            </tr>
          </thead>
          <tbody>
            {bom.items.map((bi, idx) => (
              <tr key={bi.key} className="border-t border-border/60 align-top">
                <td className="py-2 px-3 text-muted-foreground font-medium">{idx + 1}</td>
                <td className="py-2 px-3">
                  <SearchableSelect
                    options={itemOptions}
                    value={bi.itemId}
                    onChange={(v) =>
                      onUpdateItem(bi.key, { itemId: typeof v === "string" ? Number(v) : v })
                    }
                    placeholder="Select item…"
                    searchPlaceholder="Search item…"
                  />
                  {errors[`row-${row.key}-bi-${bi.key}-item`] && (
                    <p className="text-xs text-rose-500 mt-1">
                      {errors[`row-${row.key}-bi-${bi.key}-item`]}
                    </p>
                  )}
                </td>
                <td className="py-2 px-3">
                  <Input
                    type="number"
                    min={0}
                    step="any"
                    value={bi.quantityPerProduct}
                    onChange={(e) =>
                      onUpdateItem(bi.key, {
                        quantityPerProduct: Number(e.target.value),
                      })
                    }
                  />
                  {errors[`row-${row.key}-bi-${bi.key}-qty`] && (
                    <p className="text-xs text-rose-500 mt-1">
                      {errors[`row-${row.key}-bi-${bi.key}-qty`]}
                    </p>
                  )}
                </td>
                <td className="py-2 px-3">
                  <select
                    className="w-full h-10 rounded-md border border-border bg-card px-2 text-sm"
                    value={bi.unitId === "" ? "" : String(bi.unitId)}
                    onChange={(e) =>
                      onUpdateItem(bi.key, {
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
                    value={bi.processIds}
                    onChange={(v) => onUpdateItem(bi.key, { processIds: v.map((x) => Number(x)) })}
                    placeholder="Select processes"
                    searchPlaceholder="Search processes…"
                  />
                </td>
                <td className="py-2 px-3">
                  <Input
                    value={bi.remarks}
                    onChange={(e) => onUpdateItem(bi.key, { remarks: e.target.value })}
                    placeholder="Optional"
                  />
                </td>
                <td className="py-2 px-3 text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onRemoveItem(bi.key)}
                    disabled={bom.items.length === 1}
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

      {errors[`row-${row.key}-bomItems`] && (
        <p className="text-xs text-rose-500">{errors[`row-${row.key}-bomItems`]}</p>
      )}
      {errors[`row-${row.key}-bomDup`] && (
        <p className="text-xs text-rose-500">{errors[`row-${row.key}-bomDup`]}</p>
      )}

      <div>
        <Button variant="outline" size="sm" onClick={onAddItem}>
          <Plus className="w-4 h-4 mr-1" /> Add BOM Item
        </Button>
      </div>
    </div>
  );
}
