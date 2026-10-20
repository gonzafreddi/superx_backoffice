import type { Metadata } from "next";
import { Suspense } from "react";
import { SalesWorkspace } from "@/app/components/sales/sales-workspace";
export const metadata: Metadata = {
  title: "SuperX · Ventas",
  description: "Ventas, caja, inventario y rentabilidad",
};
export default function SalesPage() {
  return (
    <Suspense
      fallback={
        <section className="workspace" role="status">
          Cargando ventas…
        </section>
      }
    >
      <SalesWorkspace />
    </Suspense>
  );
}
