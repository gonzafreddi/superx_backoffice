import type { Metadata } from "next";
import { ProductDetail } from "@/app/components/product-detail";

export const metadata: Metadata = { title: "SuperX · Nuevo producto", description: "Alta de producto SuperX" };
export default function NewProductPage() { return <ProductDetail mode="create" />; }
