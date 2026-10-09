import type { Metadata } from "next";
import { DriverManager } from "@/app/components/driver-manager";
export const metadata: Metadata = { title: "Repartidores · SuperX" };
export default function DriversPage() { return <DriverManager />; }
