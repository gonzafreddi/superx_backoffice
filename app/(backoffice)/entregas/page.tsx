import type { Metadata } from "next";
import { DeliveryManager } from "@/app/components/delivery-manager";

export const metadata: Metadata = { title: "SuperX · Entregas", description: "Gestión de zonas y franjas de entrega SuperX" };
export default function DeliveryPage() { return <DeliveryManager />; }
