import type { Metadata } from "next";
import { Suspense } from "react";
import { OrderManager } from "@/app/components/order-manager";

export const metadata: Metadata = { title: "SuperX · Pedidos", description: "Panel operativo de pedidos SuperX" };
export default function OrdersPage() { return <Suspense fallback={<div className="workspace"><div className="orders-route-skeleton" /></div>}><OrderManager /></Suspense>; }
