import type { Metadata } from "next";
import { InvoiceDetail } from "@/app/components/invoices/invoice-detail";
export const metadata: Metadata = { title: "SuperX · Factura", description: "Detalle de factura de proveedor" };
export default async function InvoicePage({ params }: PageProps<"/facturas/[id]">) { const { id } = await params; return <InvoiceDetail invoiceId={id} />; }
