import type { Metadata } from "next";
import { DriverApp } from "./driver-app";

export const metadata: Metadata = { title: "SuperX · Reparto", description: "Panel móvil para repartidores" };
export const viewport = { width: "device-width", initialScale: 1 };

export default function DriverPage() { return <DriverApp />; }
