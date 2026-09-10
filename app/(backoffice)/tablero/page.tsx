import type { Metadata } from "next";
import { KpiDashboard } from "@/app/components/kpi-dashboard";

export const metadata: Metadata = { title: "SuperX · Tablero", description: "KPIs operativos de SuperX" };
export default function DashboardPage() { return <KpiDashboard />; }
