import type { Metadata } from "next";
import { InventoryManager } from "@/app/components/inventory-manager";

export const metadata: Metadata = { title: "SuperX · Inventario", description: "Administración de inventario SuperX" };

export default function InventoryPage() { return <InventoryManager />; }
