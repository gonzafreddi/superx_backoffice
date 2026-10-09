import type { Metadata } from "next";
import { ReportsManager } from "@/app/components/reports/reports-manager";
export const metadata: Metadata = { title: "SuperX · Reportes", description: "Ventas y margen de pedidos entregados" };
export default function ReportsPage() { return <ReportsManager />; }
