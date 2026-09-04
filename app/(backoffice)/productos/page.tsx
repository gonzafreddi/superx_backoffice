import type { Metadata } from "next";
import { ProductManager } from "@/app/components/product-manager";

export const metadata: Metadata = { title: "SuperX · Productos", description: "Administración de productos SuperX" };

export default function ProductsPage() { return <ProductManager />; }
