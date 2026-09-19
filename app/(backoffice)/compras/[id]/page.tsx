import type { Metadata } from "next";
import { PurchaseOrderDetail } from "@/app/components/purchase-orders/purchase-order-detail";
export const metadata: Metadata = { title: "SuperX · Orden de compra", description: "Detalle de orden de compra" };
export default async function PurchaseOrderPage({ params }: PageProps<"/compras/[id]">) { const { id } = await params; return <PurchaseOrderDetail orderId={id} />; }
