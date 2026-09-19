import type { Metadata } from "next";
import { PurchaseOrderForm } from "@/app/components/purchase-orders/purchase-order-form";
export const metadata: Metadata = { title: "SuperX · Editar orden de compra", description: "Edición de orden de compra" };
export default async function EditPurchaseOrderPage({ params }: PageProps<"/compras/[id]/editar">) { const { id } = await params; return <PurchaseOrderForm orderId={id} />; }
