import type { Metadata } from "next";
import { PurchaseOrderReceipt } from "@/app/components/purchase-orders/purchase-order-receipt";
export const metadata: Metadata = { title: "SuperX · Recibir mercadería" };
export default async function PurchaseOrderReceiptPage({ params }: PageProps<"/compras/[id]/recibir">) { const { id } = await params; return <PurchaseOrderReceipt orderId={id} />; }
