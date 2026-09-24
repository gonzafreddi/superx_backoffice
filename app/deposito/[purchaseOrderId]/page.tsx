import type { Metadata } from "next";
import { DepositoApp } from "../deposito-app";
export const metadata: Metadata = { title: "SuperX · Control de mercadería" };
export default async function ReceivingPage({ params }: { params: Promise<{ purchaseOrderId: string }> }) { const { purchaseOrderId } = await params; return <DepositoApp initialPurchaseOrderId={purchaseOrderId} />; }
