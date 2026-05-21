"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import { Loader2, Save } from "lucide-react";

import { Dialog } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { SearchableSelect } from "@/components/ui/searchable-select";

import api from "@/lib/api";
import { Order, Party } from "@/types";

interface EditOrderDialogProps {
  open: boolean;
  onClose: () => void;
  order: Pick<Order, "id" | "orderNumber" | "customerId" | "orderDate" | "requiredDeliveryDate" | "notes"> | null;
}

function toDateInput(value?: string | null): string {
  if (!value) return "";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function EditOrderDialog({ open, onClose, order }: EditOrderDialogProps) {
  const queryClient = useQueryClient();
  const [customerId, setCustomerId] = useState<number | "">("");
  const [orderDate, setOrderDate] = useState<string>("");
  const [requiredDate, setRequiredDate] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open && order) {
      setCustomerId(order.customerId);
      setOrderDate(toDateInput(order.orderDate));
      setRequiredDate(toDateInput(order.requiredDeliveryDate));
      setNotes(order.notes ?? "");
      setErrors({});
    }
  }, [open, order]);

  const { data: customers = [] } = useQuery({
    queryKey: ["parties", "active", "Customer"],
    queryFn: async (): Promise<Party[]> => {
      const r = await api.get("/parties/active", { params: { type: "Customer" } });
      return r.data?.data ?? [];
    },
    enabled: open,
  });

  const customerOptions = useMemo(
    () =>
      customers.map((c) => ({
        value: c.id,
        label: `${c.partyName}${c.mobileNumber ? ` · ${c.mobileNumber}` : ""}`,
      })),
    [customers],
  );

  const mutation = useMutation({
    mutationFn: async () => {
      if (!order) return null;
      const r = await api.put(`/orders/${order.id}`, {
        customerId,
        orderDate,
        requiredDeliveryDate: requiredDate || null,
        notes: notes.trim() || null,
      });
      return r.data?.data;
    },
    onSuccess: () => {
      toast.success("Order updated");
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      if (order) queryClient.invalidateQueries({ queryKey: ["orders", order.id] });
      onClose();
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message ?? "Failed to update order");
    },
  });

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!customerId) e.customerId = "Customer is required.";
    if (!orderDate) e.orderDate = "Order date is required.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const onSubmit = () => {
    if (!validate()) return;
    mutation.mutate();
  };

  return (
    <Dialog
      isOpen={open}
      onClose={() => {
        if (!mutation.isPending) onClose();
      }}
      title={`Edit Order ${order?.orderNumber ?? ""}`}
      size="lg"
      closeButtonDisabled={mutation.isPending}
    >
      <Card className="p-5 space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Order Date *</Label>
            <Input type="date" value={orderDate} onChange={(e) => setOrderDate(e.target.value)} />
            {errors.orderDate && <p className="text-xs text-rose-500">{errors.orderDate}</p>}
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
            placeholder="Search customer…"
            searchPlaceholder="Search by name or mobile…"
          />
          {errors.customerId && <p className="text-xs text-rose-500">{errors.customerId}</p>}
        </div>

        <div className="space-y-2">
          <Label>Notes</Label>
          <Textarea rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
      </Card>

      <div className="flex justify-end gap-2 pt-4 mt-4 border-t border-border">
        <Button variant="outline" onClick={onClose} disabled={mutation.isPending}>
          Cancel
        </Button>
        <Button onClick={onSubmit} disabled={mutation.isPending}>
          {mutation.isPending ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          {mutation.isPending ? "Saving…" : "Save Changes"}
        </Button>
      </div>
    </Dialog>
  );
}
