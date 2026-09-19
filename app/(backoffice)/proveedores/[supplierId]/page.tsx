import type { Metadata } from "next";
import { SupplierDetail } from "@/app/components/suppliers/supplier-detail";

export const metadata: Metadata = { title: "SuperX · Proveedor", description: "Detalle de proveedor" };
export default async function SupplierDetailPage({ params }: PageProps<"/proveedores/[supplierId]">) { const { supplierId } = await params; return <SupplierDetail supplierId={supplierId} />; }
