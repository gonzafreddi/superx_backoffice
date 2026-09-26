import type { Metadata } from "next";
import { OrderDetailWorkspace } from "@/app/components/orders/order-detail-workspace";

export const metadata: Metadata = { title: "SuperX · Detalle del pedido", description: "Detalle operacional del pedido" };

export default async function OrderDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ from?: string }> }) {
  const [{ id }, { from }] = await Promise.all([params, searchParams]);
  return <OrderDetailWorkspace id={id} returnQuery={from} />;
}
