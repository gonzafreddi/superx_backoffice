import type { Metadata } from "next";
import { RouteSheetWorkspace } from "@/app/components/route-sheet";
export const metadata: Metadata = { title: "Hoja de ruta · SuperX" };
export default async function RouteSheetPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ date?: string | string[] }> }) {
  const [{ id }, { date }] = await Promise.all([params, searchParams]);
  return <RouteSheetWorkspace id={id} date={Array.isArray(date) ? date[0] : date} />;
}
