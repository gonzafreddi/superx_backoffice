import type { Metadata } from "next";
import { LocationList } from "@/app/components/location-list";

export const metadata: Metadata = { title: "SuperX · Ubicaciones", description: "Ubicaciones de un depósito SuperX" };

export default async function WarehouseLocationsPage({ params }: PageProps<"/ubicaciones/[warehouseId]">) {
  const { warehouseId } = await params;
  return <LocationList warehouseId={warehouseId} />;
}
