import type { Metadata } from "next";
import { TaxCatalog } from "@/app/components/taxes/tax-catalog";
export const metadata: Metadata = { title: "SuperX · Impuestos", description: "Catálogo de impuestos de compra" };
export default function TaxesPage() { return <TaxCatalog />; }
