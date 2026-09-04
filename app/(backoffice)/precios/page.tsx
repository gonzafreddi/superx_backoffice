import type { Metadata } from "next";
import { PriceManager } from "@/app/components/price-manager";

export const metadata: Metadata = { title: "SuperX · Precios", description: "Administración de precios SuperX" };

export default function PricesPage() { return <PriceManager />; }
