import type { Metadata } from "next";
import { ProductDetail } from "@/app/components/product-detail";

export const metadata: Metadata = { title: "SuperX · Detalle de producto", description: "Detalle de producto SuperX" };
export default async function ProductDetailPage({ params }: PageProps<"/productos/[id]">) { const { id } = await params; return <ProductDetail mode="edit" productId={id} />; }
