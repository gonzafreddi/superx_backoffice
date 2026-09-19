import type { Metadata } from "next";
import { TreasuryManager } from "@/app/components/treasury/treasury-manager";
export const metadata: Metadata = { title: "SuperX · Tesorería", description: "Caja y tesorería" };
export default function TreasuryPage() { return <TreasuryManager />; }
