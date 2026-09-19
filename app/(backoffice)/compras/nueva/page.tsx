import type { Metadata } from "next";
import { PurchaseOrderForm } from "@/app/components/purchase-orders/purchase-order-form";
export const metadata: Metadata = { title: "SuperX · Nueva orden de compra", description: "Alta de orden de compra" };
export default function NewPurchaseOrderPage() { return <PurchaseOrderForm />; }
