import type { Metadata } from "next";
import { PickingApp } from "./picking-app";

export const metadata: Metadata = { title: "SuperX · Picking", description: "Interfaz móvil de picking" };
export const viewport = { width: "device-width", initialScale: 1 };

export default function PickingPage() {
  return <PickingApp />;
}
