import type { Metadata } from "next";
import { HistoryApp } from "./history-app";
export const metadata: Metadata = { title: "SuperX · Historial de reparto" };
export default function HistoryPage() { return <HistoryApp/>; }
