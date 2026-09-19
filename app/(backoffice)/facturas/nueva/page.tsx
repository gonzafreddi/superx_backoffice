import type { Metadata } from "next";
import { InvoiceForm } from "@/app/components/invoices/invoice-form";
export const metadata: Metadata = { title: "SuperX · Nueva factura", description: "Registrar factura de proveedor" };
export default function NewInvoicePage() { return <InvoiceForm />; }
