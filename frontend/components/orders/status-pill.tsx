"use client";

import { OrderStatus } from "@/types";
import { cn } from "@/lib/utils";

const STATUS_LABEL: Record<OrderStatus, string> = {
  [OrderStatus.Pending]: "Pending",
  [OrderStatus.InProcurement]: "In Procurement",
  [OrderStatus.InProduction]: "In Production",
  [OrderStatus.PartiallyDelivered]: "Partially Delivered",
  [OrderStatus.FullyDelivered]: "Fully Delivered",
  [OrderStatus.Cancelled]: "Cancelled",
};

const STATUS_COLOR: Record<OrderStatus, string> = {
  [OrderStatus.Pending]:
    "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 ring-amber-200/60 dark:ring-amber-800/60",
  [OrderStatus.InProcurement]:
    "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 ring-blue-200/60 dark:ring-blue-800/60",
  [OrderStatus.InProduction]:
    "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300 ring-indigo-200/60 dark:ring-indigo-800/60",
  [OrderStatus.PartiallyDelivered]:
    "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 ring-purple-200/60 dark:ring-purple-800/60",
  [OrderStatus.FullyDelivered]:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 ring-emerald-200/60 dark:ring-emerald-800/60",
  [OrderStatus.Cancelled]:
    "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300 ring-rose-200/60 dark:ring-rose-800/60",
};

export function OrderStatusPill({
  status,
  size = "sm",
  className,
}: {
  status: OrderStatus | string;
  size?: "sm" | "md";
  className?: string;
}) {
  const s = (status as OrderStatus) ?? OrderStatus.Pending;
  const label = STATUS_LABEL[s] ?? String(status);
  const color = STATUS_COLOR[s] ?? STATUS_COLOR[OrderStatus.Pending];

  return (
    <span
      className={cn(
        "inline-flex items-center font-medium rounded-full ring-1 ring-inset",
        size === "md" ? "px-3 py-1 text-sm" : "px-2 py-0.5 text-xs",
        color,
        className,
      )}
    >
      {label}
    </span>
  );
}

export const ORDER_STATUS_OPTIONS: { value: OrderStatus; label: string }[] = [
  { value: OrderStatus.Pending, label: "Pending" },
  { value: OrderStatus.InProcurement, label: "In Procurement" },
  { value: OrderStatus.InProduction, label: "In Production" },
  { value: OrderStatus.PartiallyDelivered, label: "Partially Delivered" },
  { value: OrderStatus.FullyDelivered, label: "Fully Delivered" },
  { value: OrderStatus.Cancelled, label: "Cancelled" },
];
