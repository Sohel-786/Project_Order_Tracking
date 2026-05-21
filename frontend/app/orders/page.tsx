"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import {
  Eye,
  Pencil,
  Plus,
  RefreshCcw,
  Search,
  ShoppingCart,
  XCircle,
} from "lucide-react";

import api from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { AccessDenied } from "@/components/ui/access-denied";
import { TablePagination } from "@/components/ui/table-pagination";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useCurrentUserPermissions } from "@/hooks/use-settings";
import { OrderStatus, Party } from "@/types";
import { formatDate } from "@/lib/utils";
import {
  ORDER_STATUS_OPTIONS,
  OrderStatusPill,
} from "@/components/orders/status-pill";
import { NewOrderDialog } from "@/components/orders/new-order-dialog";
import { EditOrderDialog } from "@/components/orders/edit-order-dialog";

interface OrderListRow {
  id: number;
  orderNumber: string;
  orderDate: string;
  requiredDeliveryDate?: string | null;
  notes?: string | null;
  status: OrderStatus;
  isActive: boolean;
  customerId: number;
  customerName?: string | null;
  itemCount: number;
  totalOrderedQty: number;
  totalProducedQty: number;
  totalDeliveredQty: number;
}

const PAGE_SIZE = 25;

export default function OrdersPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: permissions, isLoading: permsLoading } = useCurrentUserPermissions();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "">("");
  const [customerFilter, setCustomerFilter] = useState<number | "">("");
  const [activeOnly, setActiveOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [newOpen, setNewOpen] = useState(false);
  const [editing, setEditing] = useState<OrderListRow | null>(null);

  const debouncedSearch = useDebouncedValue(search, 250);

  const { data: customers = [] } = useQuery({
    queryKey: ["parties", "active", "Customer"],
    queryFn: async (): Promise<Party[]> => {
      const r = await api.get("/parties/active", { params: { type: "Customer" } });
      return r.data?.data ?? [];
    },
    enabled: !!permissions?.viewOrder,
  });

  const { data, isFetching, refetch } = useQuery({
    queryKey: [
      "orders",
      { search: debouncedSearch, status: statusFilter, customerId: customerFilter, activeOnly, page },
    ],
    queryFn: async (): Promise<{ rows: OrderListRow[]; totalCount: number }> => {
      const params: Record<string, any> = {
        page,
        pageSize: PAGE_SIZE,
      };
      if (debouncedSearch.trim()) params.search = debouncedSearch.trim();
      if (statusFilter) params.status = statusFilter;
      if (customerFilter) params.customerId = customerFilter;
      if (activeOnly) params.activeOnly = true;
      const r = await api.get("/orders", { params });
      return { rows: r.data?.data ?? [], totalCount: r.data?.totalCount ?? 0 };
    },
    enabled: !!permissions?.viewOrder,
    placeholderData: (prev) => prev,
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: number; isActive: boolean }) => {
      const r = await api.patch(`/orders/${id}/active`, { isActive });
      return r.data?.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      toast.success("Order updated");
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? "Failed to update"),
  });

  const customerOptions = useMemo(
    () => customers.map((c) => ({ id: c.id, label: c.partyName })),
    [customers],
  );

  const rows = data?.rows ?? [];
  const totalCount = data?.totalCount ?? 0;
  const showingFrom = totalCount === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const showingTo = Math.min(page * PAGE_SIZE, totalCount);

  const hasActiveFilters =
    !!debouncedSearch.trim() || !!statusFilter || !!customerFilter || activeOnly;

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("");
    setCustomerFilter("");
    setActiveOnly(false);
    setPage(1);
  };

  if (permsLoading) {
    return (
      <div className="p-6">
        <div className="h-24 rounded-2xl bg-muted animate-pulse" />
      </div>
    );
  }

  if (!permissions?.viewOrder) {
    return (
      <AccessDenied
        message="You do not have permission to view Sales Orders."
        actionLabel="Go to Dashboard"
        actionHref="/dashboard"
      />
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
            <ShoppingCart className="w-5 h-5 text-primary-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Sales Orders</h1>
            <p className="text-sm text-muted-foreground">
              Track customer orders end-to-end: BOM, procurement, QC, production and delivery.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCcw className={`w-4 h-4 mr-2 ${isFetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          {permissions?.createOrder && (
            <Button onClick={() => setNewOpen(true)}>
              <Plus className="w-4 h-4 mr-2" /> New Order
            </Button>
          )}
        </div>
      </div>

      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
          <div className="md:col-span-4 space-y-1">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Search</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Search by order # or customer…"
                className="pl-9"
              />
            </div>
          </div>
          <div className="md:col-span-3 space-y-1">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Status</Label>
            <select
              className="w-full h-10 rounded-md border border-border bg-card px-3 text-sm"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter((e.target.value as OrderStatus) || "");
                setPage(1);
              }}
            >
              <option value="">All statuses</option>
              {ORDER_STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div className="md:col-span-3 space-y-1">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Customer</Label>
            <select
              className="w-full h-10 rounded-md border border-border bg-card px-3 text-sm"
              value={customerFilter === "" ? "" : String(customerFilter)}
              onChange={(e) => {
                const v = e.target.value;
                setCustomerFilter(v === "" ? "" : Number(v));
                setPage(1);
              }}
            >
              <option value="">All customers</option>
              {customerOptions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2 flex items-center justify-between md:justify-end gap-3">
            <label className="flex items-center gap-2">
              <Switch
                checked={activeOnly}
                onCheckedChange={(c) => {
                  setActiveOnly(c);
                  setPage(1);
                }}
              />
              <span className="text-sm font-medium">Active only</span>
            </label>
          </div>
        </div>
        {hasActiveFilters && (
          <div className="mt-3 flex items-center justify-between">
            <div className="text-xs text-muted-foreground">
              {totalCount > 0
                ? `Showing ${showingFrom}–${showingTo} of ${totalCount}`
                : "No matching orders"}
            </div>
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <XCircle className="w-4 h-4 mr-1" /> Clear filters
            </Button>
          </div>
        )}
      </Card>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="text-left py-3 px-4">Order #</th>
                <th className="text-left py-3 px-4">Date</th>
                <th className="text-left py-3 px-4">Customer</th>
                <th className="text-right py-3 px-4">Ordered</th>
                <th className="text-right py-3 px-4">Produced</th>
                <th className="text-right py-3 px-4">Delivered</th>
                <th className="text-left py-3 px-4">Required By</th>
                <th className="text-left py-3 px-4">Status</th>
                <th className="text-right py-3 px-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isFetching && rows.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-muted-foreground">
                    Loading orders…
                  </td>
                </tr>
              )}
              {!isFetching && rows.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-muted-foreground">
                    {hasActiveFilters ? "No orders match the current filters." : "No orders yet."}
                  </td>
                </tr>
              )}
              {rows.map((o) => (
                <tr
                  key={o.id}
                  className={`border-t border-border/60 hover:bg-muted/30 transition-colors cursor-pointer ${
                    !o.isActive ? "opacity-60" : ""
                  }`}
                  onClick={() => router.push(`/orders/${o.id}`)}
                >
                  <td className="py-3 px-4 font-semibold text-foreground">
                    <Link
                      href={`/orders/${o.id}`}
                      className="hover:text-primary-600 hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {o.orderNumber}
                    </Link>
                  </td>
                  <td className="py-3 px-4 text-muted-foreground">{formatDate(o.orderDate)}</td>
                  <td className="py-3 px-4">
                    <div className="font-medium text-foreground">{o.customerName ?? "—"}</div>
                    {o.itemCount > 0 && (
                      <div className="text-xs text-muted-foreground">
                        {o.itemCount} product{o.itemCount === 1 ? "" : "s"}
                      </div>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right tabular-nums font-medium">
                    {o.totalOrderedQty}
                  </td>
                  <td className="py-3 px-4 text-right tabular-nums text-blue-600 dark:text-blue-400">
                    {o.totalProducedQty}
                  </td>
                  <td className="py-3 px-4 text-right tabular-nums text-emerald-600 dark:text-emerald-400">
                    {o.totalDeliveredQty}
                  </td>
                  <td className="py-3 px-4 text-muted-foreground">
                    {o.requiredDeliveryDate ? formatDate(o.requiredDeliveryDate) : "—"}
                  </td>
                  <td className="py-3 px-4">
                    <OrderStatusPill status={o.status} />
                  </td>
                  <td
                    className="py-3 px-4 text-right space-x-1 whitespace-nowrap"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Button
                      variant="outline"
                      size="sm"
                      title="View order"
                      onClick={() => router.push(`/orders/${o.id}`)}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    {permissions?.editOrder && (
                      <Button
                        variant="outline"
                        size="sm"
                        title="Edit order"
                        onClick={() => setEditing(o)}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                    )}
                    {permissions?.editOrder && (
                      <span title={o.isActive ? "Deactivate" : "Activate"}>
                        <Switch
                          checked={o.isActive}
                          onCheckedChange={(c) =>
                            toggleActiveMutation.mutate({ id: o.id, isActive: c })
                          }
                        />
                      </span>
                    )}
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

      <NewOrderDialog
        open={newOpen}
        onClose={() => setNewOpen(false)}
        onCreated={(id) => {
          if (id) router.push(`/orders/${id}`);
        }}
      />
      <EditOrderDialog
        open={!!editing}
        onClose={() => setEditing(null)}
        order={
          editing
            ? {
                id: editing.id,
                orderNumber: editing.orderNumber,
                customerId: editing.customerId,
                orderDate: editing.orderDate,
                requiredDeliveryDate: editing.requiredDeliveryDate,
                notes: editing.notes,
              }
            : null
        }
      />
    </div>
  );
}
