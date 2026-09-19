import type { Metadata } from "next";
import { PaymentManager } from "@/app/components/payments/payment-manager";
export const metadata: Metadata = { title: "SuperX · Pagos", description: "Cuentas por pagar y pagos" };
export default function PaymentsPage() { return <PaymentManager />; }
