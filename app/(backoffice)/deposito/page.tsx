import type { Metadata } from "next";
import { DepositoApp } from "./deposito-app";
export const metadata: Metadata = { title: "SuperX · Depósito", description: "Recepción de mercadería" };
export const viewport = { width: "device-width", initialScale: 1 };
export default function DepositoPage() { return <DepositoApp />; }
