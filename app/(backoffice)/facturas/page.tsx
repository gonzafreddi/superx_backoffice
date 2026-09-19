import type { Metadata } from "next";
import { InvoiceList } from "@/app/components/invoices/invoice-manager";
export const metadata: Metadata = { title: "SuperX · Facturas", description: "Facturas de proveedor" };
export default function InvoicesPage() { return <InvoiceList />; }
