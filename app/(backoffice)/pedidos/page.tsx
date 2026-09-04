import type { Metadata } from "next";
import { OrderManager } from "@/app/components/order-manager";

export const metadata: Metadata = { title: "SuperX · Pedidos", description: "Panel operativo de pedidos SuperX" };
export default function OrdersPage() { return <OrderManager />; }
