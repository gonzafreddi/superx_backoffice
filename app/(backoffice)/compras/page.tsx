import type { Metadata } from "next";
import { PurchaseOrderList } from "@/app/components/purchase-orders/purchase-order-list";
export const metadata: Metadata = { title: "SuperX · Compras", description: "Órdenes de compra" };
export default function PurchaseOrdersPage() { return <PurchaseOrderList />; }
