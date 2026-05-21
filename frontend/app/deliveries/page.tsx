"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient, useMutation, keepPreviousData } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import {
  Truck,
  Search,
  Plus,
  Save,
  Loader2,
  ClipboardList,
  PackageCheck,
  Paperclip,
  X,
  ExternalLink,
} from "lucide-react";
import api from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import {
  SearchableSelect,
  SearchableSelectOption,
} from "@/components/ui/searchable-select";
import { AccessDenied } from "@/components/ui/access-denied";
import { useCurrentUserPermissions } from "@/hooks/use-settings";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { formatDate } from "@/lib/utils";
import { Order } from "@/types";

// ─────────────────────────────────────── List row (server projection)

interface DeliveryListRow {
  id: number;
  challanNo: string;
  dispatchDate: string;
  vehicleNo?: string | null;
  driverName?: string | null;
  driverContact?: string | null;
  status: string;
  remarks?: string | null;
  orderId: number;
  orderNumber?: string | null;
  customerId: number;
  customerName?: string | null;
  itemCount: number;
  totalQty: number;
  createdAt: string;
  createdByName?: string | null;
  isActive: boolean;
}

interface OrderListRow {
  id: number;
  orderNumber: string;
  orderDate: string;
  customerName?: string | null;
  status: string;
}

// ─────────────────────────────────────── Page

export default function DeliveriesPage() {
  const { data: permissions, isLoading: permsLoading } = useCurrentUserPermissions();
  const canView = !!permissions?.viewDelivery;
  const canCreate = !!permissions?.createDelivery;

  const [search, setSearch] = useState("");
  const [orderFilter, setOrderFilter] = useState<number | "">("");
  const [orderSearch, setOrderSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const debouncedOrderSearch = useDebouncedValue(orderSearch, 300);
  const [openDialog, setOpenDialog] = useState(false);

  const { data: orderOptionsForFilter } = useQuery({
    queryKey: ["orders", "search", debouncedOrderSearch],
    queryFn: async (): Promise<OrderListRow[]> => {
      const res = await api.get("/orders", {
        params: { activeOnly: true, search: debouncedOrderSearch || undefined, page: 1, pageSize: 25 },
      });
      return res.data.data ?? [];
    },
    enabled: canView,
    staleTime: 30_000,
  });

  const { data: rows, isLoading } = useQuery({
    queryKey: ["deliveries", { search: debouncedSearch, orderId: orderFilter }],
    queryFn: async (): Promise<DeliveryListRow[]> => {
      const res = await api.get("/deliveries", {
        params: {
          search: debouncedSearch || undefined,
          orderId: orderFilter || undefined,
          page: 1,
          pageSize: 100,
        },
      });
      return res.data.data ?? [];
    },
    placeholderData: keepPreviousData,
    enabled: canView,
  });

  const orderFilterOptions = useMemo<SearchableSelectOption[]>(() => {
    const opts: SearchableSelectOption[] = [{ value: "", label: "All orders" }];
    (orderOptionsForFilter ?? []).forEach((o) => {
      opts.push({ value: o.id, label: `${o.orderNumber} — ${o.customerName ?? ""}` });
    });
    return opts;
  }, [orderOptionsForFilter]);

  if (!permsLoading && !canView) {
    return (
      <AccessDenied actionLabel="Go to Dashboard" actionHref="/dashboard" message="You do not have permission to view Delivery Challans." />
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
            <Truck className="w-5 h-5 text-primary-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Delivery Challans</h1>
            <p className="text-sm text-muted-foreground">
              Dispatch finished products against an order. Quantities are bounded by what has been produced.
            </p>
          </div>
        </div>
        {canCreate && (
          <Button onClick={() => setOpenDialog(true)}>
            <Plus className="w-4 h-4 mr-2" /> New Delivery Challan
          </Button>
        )}
      </div>

      <Card className="p-4">
        <div className="flex flex-col md:flex-row md:items-end gap-3">
          <div className="flex-1 space-y-1">
            <Label>Search</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search challan no or order #"
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          <div className="w-full md:w-80 space-y-1">
            <Label>Filter by Order</Label>
            <SearchableSelect
              options={orderFilterOptions}
              value={orderFilter}
              onChange={(v) => setOrderFilter(v === "" ? "" : Number(v))}
              placeholder="All orders"
              searchPlaceholder="Search orders…"
              onSearchChange={(t) => setOrderSearch(t)}
            />
          </div>
        </div>
      </Card>

      <Card className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="text-left py-2.5 px-4">Challan No</th>
              <th className="text-left py-2.5 px-4">Date</th>
              <th className="text-left py-2.5 px-4">Order #</th>
              <th className="text-left py-2.5 px-4">Customer</th>
              <th className="text-left py-2.5 px-4">Vehicle</th>
              <th className="text-left py-2.5 px-4">Driver</th>
              <th className="text-right py-2.5 px-4">Items</th>
              <th className="text-right py-2.5 px-4">Total Qty</th>
              <th className="text-left py-2.5 px-4">Status</th>
              <th className="text-right py-2.5 px-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={10} className="text-center py-10 text-muted-foreground">
                  <Loader2 className="w-5 h-5 animate-spin inline mr-2" />
                  Loading…
                </td>
              </tr>
            )}
            {!isLoading && !rows?.length && (
              <tr>
                <td colSpan={10} className="text-center py-10 text-muted-foreground">
                  No delivery challans yet.
                </td>
              </tr>
            )}
            {rows?.map((r) => (
              <tr key={r.id} className="border-t border-border/60 hover:bg-muted/30 transition-colors">
                <td className="py-2 px-4 font-medium text-foreground">{r.challanNo}</td>
                <td className="py-2 px-4 text-muted-foreground">{formatDate(r.dispatchDate)}</td>
                <td className="py-2 px-4">{r.orderNumber ?? "—"}</td>
                <td className="py-2 px-4">{r.customerName ?? "—"}</td>
                <td className="py-2 px-4">{r.vehicleNo ?? "—"}</td>
                <td className="py-2 px-4">{r.driverName ?? "—"}</td>
                <td className="py-2 px-4 text-right">{r.itemCount}</td>
                <td className="py-2 px-4 text-right font-semibold">{r.totalQty}</td>
                <td className="py-2 px-4"><DeliveryStatusPill status={r.status} /></td>
                <td className="py-2 px-4 text-right">
                  <ActiveToggle id={r.id} isActive={r.isActive} disabled={!permissions?.editDelivery} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <NewDeliveryDialog open={openDialog} onClose={() => setOpenDialog(false)} canSubmit={canCreate} />
    </div>
  );
}

function ActiveToggle({ id, isActive, disabled }: { id: number; isActive: boolean; disabled?: boolean }) {
  const qc = useQueryClient();
  const mut = useMutation({
    mutationFn: async (next: boolean) => {
      await api.patch(`/deliveries/${id}/active`, { isActive: next });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["deliveries"] });
      toast.success("Updated");
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || "Failed to update"),
  });
  return (
    <div className="inline-flex items-center gap-2">
      <Switch
        checked={isActive}
        disabled={disabled || mut.isPending}
        onCheckedChange={(c) => mut.mutate(c)}
      />
      <span className="text-xs text-muted-foreground">{isActive ? "Active" : "Inactive"}</span>
    </div>
  );
}

function DeliveryStatusPill({ status }: { status: string }) {
  const colorMap: Record<string, string> = {
    Draft:      "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
    Dispatched: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full ${colorMap[status] ?? "bg-gray-100 text-gray-800"}`}>
      {status}
    </span>
  );
}

// ─────────────────────────────────────── New Delivery Dialog

function NewDeliveryDialog({
  open,
  onClose,
  canSubmit,
}: {
  open: boolean;
  onClose: () => void;
  canSubmit: boolean;
}) {
  const qc = useQueryClient();
  const [orderId, setOrderId] = useState<number | "">("");
  const [orderSearchTerm, setOrderSearchTerm] = useState("");
  const [dispatchDate, setDispatchDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [vehicleNo, setVehicleNo] = useState("");
  const [driverName, setDriverName] = useState("");
  const [driverContact, setDriverContact] = useState("");
  const [remarks, setRemarks] = useState("");
  const [dispatchByItem, setDispatchByItem] = useState<Record<number, { qty: number; remarks: string }>>({});
  const [attachments, setAttachments] = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setOrderId("");
      setOrderSearchTerm("");
      setDispatchDate(new Date().toISOString().slice(0, 10));
      setVehicleNo("");
      setDriverName("");
      setDriverContact("");
      setRemarks("");
      setDispatchByItem({});
      setAttachments([]);
    }
  }, [open]);

  const { data: orderOptionsRaw } = useQuery({
    queryKey: ["orders", "picker-dc", orderSearchTerm],
    queryFn: async (): Promise<OrderListRow[]> => {
      const res = await api.get("/orders", {
        params: {
          activeOnly: true,
          search: orderSearchTerm || undefined,
          page: 1,
          pageSize: 50,
        },
      });
      return res.data.data ?? [];
    },
    enabled: open,
    staleTime: 20_000,
  });

  const orderOptions = useMemo<SearchableSelectOption[]>(
    () =>
      (orderOptionsRaw ?? []).map((o) => ({
        value: o.id,
        label: `${o.orderNumber} — ${o.customerName ?? "—"} (${o.status})`,
      })),
    [orderOptionsRaw],
  );

  const { data: order } = useQuery({
    queryKey: ["order", orderId],
    queryFn: async (): Promise<Order> => {
      const res = await api.get(`/orders/${orderId}`);
      return res.data.data;
    },
    enabled: open && !!orderId,
  });

  // initialise dispatch state when order changes
  useEffect(() => {
    if (!order) {
      setDispatchByItem({});
      return;
    }
    setDispatchByItem((prev) => {
      const next: Record<number, { qty: number; remarks: string }> = {};
      order.items.forEach((i) => {
        next[i.id] = prev[i.id] ?? { qty: 0, remarks: "" };
      });
      return next;
    });
  }, [order]);

  // attachment upload
  const uploadMut = useMutation({
    mutationFn: async (file: File): Promise<string> => {
      const form = new FormData();
      form.append("file", file);
      const res = await api.post("/deliveries/upload-attachment", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return res.data.data.url as string;
    },
    onSuccess: (url) => {
      setAttachments((a) => [...a, url]);
      toast.success("Attachment uploaded");
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || "Upload failed"),
  });

  const createMut = useMutation({
    mutationFn: async () => {
      const body = {
        orderId,
        dispatchDate,
        vehicleNo: vehicleNo?.trim() || null,
        driverName: driverName?.trim() || null,
        driverContact: driverContact?.trim() || null,
        remarks: remarks?.trim() || null,
        attachmentUrls: attachments,
        items: Object.entries(dispatchByItem)
          .filter(([, v]) => Number(v.qty) > 0)
          .map(([k, v]) => ({
            orderItemId: Number(k),
            dispatchQuantity: Number(v.qty),
            remarks: v.remarks?.trim() || null,
          })),
      };
      const res = await api.post("/deliveries", body);
      return res.data.data;
    },
    onSuccess: () => {
      toast.success("Delivery challan saved");
      qc.invalidateQueries({ queryKey: ["deliveries"] });
      qc.invalidateQueries({ queryKey: ["order", orderId] });
      onClose();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || "Failed to save delivery"),
  });

  const onSubmit = () => {
    if (!orderId) return toast.error("Pick an order.");
    if (!order) return toast.error("Order detail not loaded yet.");
    const items = Object.entries(dispatchByItem).filter(([, v]) => Number(v.qty) > 0);
    if (items.length === 0) return toast.error("Add a dispatch quantity for at least one item.");
    // bounds validation
    for (const [k, v] of items) {
      const oi = order.items.find((i) => i.id === Number(k));
      if (!oi) continue;
      const pending = oi.producedQty - oi.deliveredQty;
      if (Number(v.qty) > pending) {
        return toast.error(`${oi.productName}: dispatch (${v.qty}) exceeds pending dispatch (${pending}).`);
      }
    }
    createMut.mutate();
  };

  return (
    <Dialog isOpen={open} onClose={onClose} title="New Delivery Challan" size="3xl">
      <div className="space-y-6">
        {/* Order picker */}
        <Card className="p-4 space-y-4">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-primary-600" /> Order
          </h3>
          <SearchableSelect
            options={orderOptions}
            value={orderId}
            onChange={(v) => setOrderId(v === "" ? "" : Number(v))}
            placeholder="Pick an order…"
            searchPlaceholder="Search by order # or customer…"
            onSearchChange={(t) => setOrderSearchTerm(t)}
          />
          {order && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <KeyValue label="Order #" value={order.orderNumber} />
              <KeyValue label="Customer" value={order.customerName ?? "—"} />
              <KeyValue label="Order Date" value={formatDate(order.orderDate)} />
              <KeyValue label="Required Delivery" value={order.requiredDeliveryDate ? formatDate(order.requiredDeliveryDate) : "—"} />
            </div>
          )}
        </Card>

        {/* Dispatch header */}
        {order && (
          <Card className="p-4 space-y-4">
            <h3 className="text-sm font-semibold">Dispatch Information</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="space-y-1">
                <Label>Dispatch Date</Label>
                <Input type="date" value={dispatchDate} onChange={(e) => setDispatchDate(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Vehicle No</Label>
                <Input value={vehicleNo} onChange={(e) => setVehicleNo(e.target.value)} placeholder="GJ01-AB-1234" />
              </div>
              <div className="space-y-1">
                <Label>Driver Name</Label>
                <Input value={driverName} onChange={(e) => setDriverName(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Driver Contact</Label>
                <Input value={driverContact} onChange={(e) => setDriverContact(e.target.value)} placeholder="+91 …" />
              </div>
              <div className="space-y-1 col-span-2 md:col-span-4">
                <Label>Remarks</Label>
                <Textarea rows={2} value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Optional notes" />
              </div>
            </div>
          </Card>
        )}

        {/* Dispatch items */}
        {order && (
          <Card className="p-4 space-y-3">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <PackageCheck className="w-4 h-4 text-primary-600" /> Items
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="text-left py-1.5">Product</th>
                    <th className="text-right py-1.5">Ordered</th>
                    <th className="text-right py-1.5">Produced</th>
                    <th className="text-right py-1.5">Delivered</th>
                    <th className="text-right py-1.5">Pending Dispatch</th>
                    <th className="text-right py-1.5 w-36">Dispatch Qty</th>
                    <th className="text-left py-1.5 w-56">Item Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {order.items.map((i) => {
                    const pending = i.producedQty - i.deliveredQty;
                    const row = dispatchByItem[i.id] ?? { qty: 0, remarks: "" };
                    return (
                      <tr key={i.id} className="border-t border-border/60">
                        <td className="py-2">
                          <div className="font-medium">{i.productName}</div>
                          <div className="text-xs text-muted-foreground">{i.productCode}</div>
                        </td>
                        <td className="py-2 text-right">{i.quantityOrdered}</td>
                        <td className="py-2 text-right">{i.producedQty}</td>
                        <td className="py-2 text-right">{i.deliveredQty}</td>
                        <td className="py-2 text-right font-semibold">{pending}</td>
                        <td className="py-2 text-right">
                          <Input
                            type="number"
                            min={0}
                            max={pending}
                            value={row.qty}
                            className="h-9 text-right"
                            onChange={(e) =>
                              setDispatchByItem((prev) => ({
                                ...prev,
                                [i.id]: {
                                  ...row,
                                  qty: Math.max(0, Math.min(Number(e.target.value), pending)),
                                },
                              }))
                            }
                          />
                        </td>
                        <td className="py-2">
                          <Input
                            value={row.remarks}
                            className="h-9"
                            placeholder="Optional"
                            onChange={(e) =>
                              setDispatchByItem((prev) => ({
                                ...prev,
                                [i.id]: { ...row, remarks: e.target.value },
                              }))
                            }
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* Attachments */}
        {order && (
          <Card className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Paperclip className="w-4 h-4 text-primary-600" /> Attachments
              </h3>
              <input
                ref={fileRef}
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,.webp"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) uploadMut.mutate(f);
                  if (fileRef.current) fileRef.current.value = "";
                }}
              />
              <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={uploadMut.isPending}>
                {uploadMut.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                Upload
              </Button>
            </div>
            {attachments.length === 0 ? (
              <p className="text-xs text-muted-foreground">No attachments uploaded.</p>
            ) : (
              <ul className="space-y-2">
                {attachments.map((url, idx) => (
                  <li
                    key={url + idx}
                    className="flex items-center justify-between gap-2 rounded-md border border-border bg-muted/20 px-3 py-2 text-xs"
                  >
                    <span className="truncate flex items-center gap-2">
                      <Paperclip className="w-3 h-3 text-muted-foreground" />
                      {url.split("/").pop()}
                    </span>
                    <div className="flex items-center gap-1">
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                        title="Open"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                      <button
                        type="button"
                        className="p-1 rounded hover:bg-rose-100 dark:hover:bg-rose-900/30 text-rose-500"
                        onClick={() => setAttachments((a) => a.filter((u) => u !== url))}
                        title="Remove"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        )}
      </div>

      <div className="flex justify-end gap-2 pt-4 border-t border-border mt-4">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button onClick={onSubmit} disabled={!canSubmit || createMut.isPending}>
          {createMut.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          Save Delivery Challan
        </Button>
      </div>
    </Dialog>
  );
}

function KeyValue({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="space-y-0.5">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="text-sm font-medium text-foreground">{value}</div>
    </div>
  );
}
