import type { Metadata } from "next";
import { LocationManager } from "@/app/components/location-manager";

export const metadata: Metadata = { title: "SuperX · Ubicaciones", description: "Administración de ubicaciones de depósito SuperX" };

export default function LocationsPage() { return <LocationManager />; }
