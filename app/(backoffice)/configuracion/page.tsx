import type { Metadata } from "next";
import { BusinessSettingsManager } from "@/app/components/settings/business-settings-manager";
export const metadata: Metadata = { title: "SuperX · Configuración del negocio" };
export default function SettingsPage() { return <BusinessSettingsManager />; }
