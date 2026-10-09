import { apiBaseUrl, fixturesEnabled } from "./api-mode";
import { authFetch } from "./http";
import { encodeCsv, type GroupBy } from "./report-rules";
import { fixtureReport } from "./reports-api";
export function fixtureCsv(path: string): string {
  const url = new URL(path, "http://fixture.local"); const params = url.searchParams;
  if (url.pathname === "/exports/sales-report.csv") {
    const report = fixtureReport({ from: params.get("from") || "2026-10-01", to: params.get("to") || "2026-10-09", groupBy: (params.get("groupBy") || "day") as GroupBy });
    return encodeCsv([["Grupo", "Pedidos", "Unidades", "Ventas", "Costo", "Margen", "Margen %", "Cobertura %"], ...report.rows.map(r => [r.label, r.orders, r.units, r.revenue, r.cost, r.margin, r.marginPct, r.costCoverage])]);
  }
  const samples: Record<string, (string | number | null)[][]> = {
    "/exports/orders.csv": [["Pedido", "Fecha", "Cliente", "Estado", "Medio de pago", "Estado de pago", "Subtotal", "Envío", "Descuentos", "Total"], ["PED-000001", params.get("from") || "2026-10-09", "Cliente de ejemplo", params.get("status") || "DELIVERED", "CASH", "PAID", 1500.5, 100, 0, 1600.5]],
    "/exports/order-items.csv": [["Pedido", "Fecha", "Producto", "SKU", "Cantidad", "Precio", "Total línea", "Costo unitario"], ["PED-000001", "2026-10-09", "Leche 1L", "LEC-001", 1, 1500.5, 1500.5, 900]],
    "/exports/stock.csv": [["Producto", "SKU", "Depósito", "Físico", "Reservado", "Disponible", "Costo", "Valorizado"], ["Leche 1L", "LEC-001", params.get("warehouseId") || "Principal", 20, 2, 18, 900, 18000]],
    "/exports/treasury.csv": [["Fecha", "Cuenta", "Tipo", "Concepto", "Ingreso", "Egreso", "Saldo"], [params.get("from") || "2026-10-09", params.get("accountId") || "Caja", "INCOME", "Venta de ejemplo", 1600.5, 0, 1600.5]],
  };
  const rows = samples[url.pathname]; if (!rows) throw new Error("Exportación desconocida."); return encodeCsv(rows);
}
export async function csvBlob(path: string): Promise<Blob> {
  if (!/^\/exports\/[a-z-]+\.csv(?:\?|$)/.test(path)) throw new Error("Ruta de exportación inválida.");
  if (fixturesEnabled()) return new Blob([fixtureCsv(path)], { type: "text/csv;charset=utf-8" });
  const response = await authFetch(`${apiBaseUrl()!.replace(/\/$/, "")}${path}`, { headers: { Accept: "text/csv" } });
  if (!response.ok) throw new Error(response.status === 403 ? "No tenés permiso para exportar estos datos." : response.status === 401 ? "Iniciá sesión para exportar." : "No pudimos descargar el CSV. Reintentá.");
  return response.blob();
}
export async function downloadCsv(path: string, filename: string): Promise<void> {
  const blob = await csvBlob(path); const url = URL.createObjectURL(blob); const link = document.createElement("a");
  try { link.href = url; link.download = filename; document.body.appendChild(link); link.click(); }
  finally { link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
}
