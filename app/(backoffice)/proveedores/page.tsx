import type { Metadata } from "next";
import { SupplierList } from "@/app/components/suppliers/supplier-list";

export const metadata: Metadata = { title: "SuperX · Proveedores", description: "Gestión de proveedores y presentaciones de compra" };
export default function SuppliersPage() { return <SupplierList />; }
