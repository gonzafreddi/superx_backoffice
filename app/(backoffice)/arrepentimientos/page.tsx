import type { Metadata } from "next";
import { WithdrawalManager } from "@/app/components/withdrawal-manager";
export const metadata: Metadata = { title: "Arrepentimientos · SuperX" };
export default function WithdrawalsPage() { return <WithdrawalManager />; }
