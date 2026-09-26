import type { Metadata } from "next";
import { ComboManager } from "@/app/components/combos/combo-manager";

export const metadata: Metadata = { title: "SuperX · Combos", description: "Gestión de combos del catálogo" };
export default function CombosPage() { return <ComboManager />; }
