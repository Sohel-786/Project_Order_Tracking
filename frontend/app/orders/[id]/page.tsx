import OrderDetailClient from "./order-detail-client";

// Required for `output: 'export'` with dynamic `[id]` segment.
export function generateStaticParams() {
  return [{ id: "0" }];
}

export default function OrderDetailPage() {
  return <OrderDetailClient />;
}
