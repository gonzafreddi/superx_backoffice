import type { Metadata } from "next";
import { PaymentMethodManager } from "@/app/components/payment-methods/payment-method-manager";
export const metadata: Metadata = { title: "SuperX · Medios de pago", description: "Configuración de medios de pago" };
export default function PaymentMethodsPage() { return <PaymentMethodManager />; }
