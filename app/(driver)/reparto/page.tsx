import type { Metadata } from "next";
import { DeliveryBoard } from "./driver-app";
export const metadata: Metadata = { title: "SuperX · Reparto", description: "Centro de operaciones de reparto" };
export const viewport = { width: "device-width", initialScale: 1 };
export default function DriverPage() { return <DeliveryBoard/>; }
