import type { Metadata } from "next";
import { DashboardWorkspace } from "@/app/components/dashboard/dashboard-workspace";

export const metadata: Metadata = { title: "SuperX · Administración", description: "Dashboard administrativo de compras, obligaciones y tesorería" };
export default function AdministracionPage() { return <DashboardWorkspace />; }
