import type { Metadata } from "next";
import { CampaignManager } from "@/app/components/push/campaign-manager";
export const metadata: Metadata = { title: "Notificaciones · SuperX", description: "Campañas de notificaciones push" };
export default function PushCampaignsPage() { return <CampaignManager />; }
