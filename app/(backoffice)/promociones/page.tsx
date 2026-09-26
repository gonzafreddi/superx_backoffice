import type { Metadata } from "next";
import { PromotionManager } from "@/app/components/promotions/promotion-manager";
export const metadata: Metadata = { title: "SuperX · Promociones", description: "Gestión de promociones y cupones" };
export default function PromotionsPage() { return <PromotionManager />; }
