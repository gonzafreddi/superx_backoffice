import type { Metadata } from "next";
import { DeliveryManager } from "@/app/components/delivery-manager";

export const metadata: Metadata = { title: "SuperX · Entregas", description: "Horarios de reparto y zonas de entrega SuperX" };
export default function DeliveryPage() { return <DeliveryManager />; }
