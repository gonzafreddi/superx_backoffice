import type { Metadata } from "next";
import { WarehouseList } from "@/app/components/warehouse-list";

export const metadata: Metadata = { title: "SuperX · Ubicaciones", description: "Administración de ubicaciones de depósito SuperX" };

export default function LocationsPage() { return <WarehouseList />; }
