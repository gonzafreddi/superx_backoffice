import type { Metadata } from "next";
import { LocationDetail } from "@/app/components/location-detail";

export const metadata: Metadata = { title: "SuperX · Detalle de ubicación", description: "Detalle de una ubicación de depósito SuperX" };

export default async function LocationDetailPage({ params }: PageProps<"/ubicaciones/[warehouseId]/[locationId]">) {
  const { warehouseId, locationId } = await params;
  return <LocationDetail warehouseId={warehouseId} locationId={locationId} />;
}
