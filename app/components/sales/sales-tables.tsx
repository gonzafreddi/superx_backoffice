"use client";
import { useState, type ReactNode } from "react";
import type {
  CashDaily,
  DailySales,
  SalesBreakdown,
  StockValuation,
} from "../../lib/sales-contract";
import { dayLabel, methodLabel, money, percent } from "../../lib/sales-rules";
import { TablePagination } from "../ui/table-pagination";
type Column = {
  key: string;
  label: string;
  format?: (value: unknown) => ReactNode;
};
type Row = Record<string, unknown>;
const cash = (value: unknown) => money(String(value ?? "0.00"));
const pct = (value: unknown) => percent(value == null ? null : Number(value));
const share = (value: unknown) => (
  <div className="sales-share">
    <span>{pct(value)}</span>
    <i style={{ width: `${Math.max(0, Math.min(100, Number(value)))}%` }} />
  </div>
);
export function SalesTable({
  caption,
  columns,
  rows,
  totals,
  sortable = false,
  dimEmpty = false,
}: {
  caption: string;
  columns: Column[];
  rows: Row[];
  totals?: Row;
  sortable?: boolean;
  dimEmpty?: boolean;
}) {
  const [sort, setSort] = useState({ key: "", desc: true }),
    [page, setPage] = useState(1);
  const sorted = [...rows].sort((a, b) => {
    if (!sort.key) return 0;
    const av = a[sort.key],
      bv = b[sort.key];
    const compared =
      sort.key === "label"
        ? String(av).localeCompare(String(bv), "es")
        : Number(av) - Number(bv);
    return compared * (sort.desc ? -1 : 1);
  });
  const renderRow = (row: Row, footer = false) => (
    <tr className={dimEmpty && row.orders === 0 ? "sales-empty-day" : ""}>
      {columns.map((col, i) => {
        const content =
          footer && i === 0
            ? "Totales"
            : col.format
              ? col.format(row[col.key])
              : String(row[col.key] ?? "—");
        return i === 0 ? (
          <th key={col.key} scope="row">
            {content}
          </th>
        ) : (
          <td key={col.key}>{content}</td>
        );
      })}
    </tr>
  );
  return (
    <>
      <div
        className="sales-table-scroll"
        tabIndex={0}
        role="region"
        aria-label={caption}
      >
        <table className="sales-table">
          <caption>{caption}</caption>
          <thead>
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  scope="col"
                  aria-sort={
                    sort.key === col.key
                      ? sort.desc
                        ? "descending"
                        : "ascending"
                      : undefined
                  }
                >
                  {sortable ? (
                    <button
                      type="button"
                      onClick={() => {
                        setSort({
                          key: col.key,
                          desc: sort.key === col.key ? !sort.desc : true,
                        });
                        setPage(1);
                      }}
                    >
                      {col.label}
                      {sort.key === col.key ? (sort.desc ? " ↓" : " ↑") : ""}
                    </button>
                  ) : (
                    col.label
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.slice((page - 1) * 31, page * 31).map((row, i) => (
              <RowFragment key={String(row.key ?? row.date ?? i)}>
                {renderRow(row)}
              </RowFragment>
            ))}
            {!rows.length && (
              <tr>
                <td colSpan={columns.length}>
                  No hay datos para este período.
                </td>
              </tr>
            )}
          </tbody>
          {totals && <tfoot>{renderRow(totals, true)}</tfoot>}
        </table>
      </div>
      {rows.length > 31 && (
        <TablePagination
          page={page}
          pageSize={31}
          total={rows.length}
          label={`${rows.length} filas · Página ${page}`}
          onPrev={() => setPage(page - 1)}
          onNext={() => setPage(page + 1)}
          buttonClassName="button secondary"
          buttonType="button"
        />
      )}
    </>
  );
}
function RowFragment({ children }: { children: ReactNode }) {
  return children;
}
export const dailyColumns: Column[] = [
  { key: "date", label: "Fecha", format: (v) => dayLabel(String(v)) },
  { key: "orders", label: "Pedidos" },
  { key: "units", label: "Unidades" },
  ...(
    [
      ["grossSales", "Venta bruta"],
      ["discounts", "Descuentos"],
      ["netSales", "Venta neta"],
      ["deliveryFees", "Envíos"],
      ["billed", "Facturación"],
      ["cogs", "CMV"],
      ["grossMargin", "Margen bruto"],
    ] as const
  ).map(([key, label]) => ({ key, label, format: cash })),
  { key: "grossMarginPct", label: "Margen %", format: pct },
  { key: "averageTicket", label: "Ticket promedio", format: cash },
];
export const DailyTable = ({ data }: { data: DailySales }) => (
  <SalesTable
    caption="Ventas día a día"
    columns={dailyColumns}
    rows={data.rows}
    totals={data.totals}
    dimEmpty
  />
);
export function CashTable({ data }: { data: CashDaily }) {
  const flatten = (r: CashDaily["totals"]) => ({ ...r, ...r.byMethod });
  return (
    <SalesTable
      caption="Caja día a día"
      columns={[
        { key: "date", label: "Fecha", format: (v) => dayLabel(String(v)) },
        ...data.methods.map((m) => ({
          key: m,
          label: methodLabel(m),
          format: cash,
        })),
        { key: "total", label: "Total", format: cash },
        { key: "refunds", label: "Devoluciones", format: cash },
        { key: "net", label: "Neto", format: cash },
        { key: "payments", label: "Cobros" },
      ]}
      rows={data.rows.map((r) => ({ ...flatten(r), date: r.date }))}
      totals={flatten(data.totals)}
    />
  );
}
export const BreakdownTable = ({ data }: { data: SalesBreakdown }) => (
  <SalesTable
    caption="Ranking de ventas"
    sortable
    rows={data.rows.map((r, i) => ({ ...r, rank: i + 1 }))}
    totals={data.totals}
    columns={[
      { key: "rank", label: "#" },
      { key: "label", label: "Grupo" },
      { key: "orders", label: "Pedidos" },
      { key: "units", label: "Unidades" },
      { key: "netSales", label: "Venta neta", format: cash },
      { key: "grossSales", label: "Venta bruta", format: cash },
      { key: "cogs", label: "CMV", format: cash },
      { key: "grossMargin", label: "Margen bruto", format: cash },
      { key: "grossMarginPct", label: "Margen %", format: pct },
      { key: "share", label: "Participación", format: share },
    ]}
  />
);
export const StockTable = ({
  data,
  products,
}: {
  data: StockValuation;
  products: boolean;
}) => (
  <SalesTable
    caption="Valorización del inventario actual"
    sortable
    rows={data.rows}
    totals={data.totals}
    columns={[
      { key: "label", label: products ? "Producto" : "Categoría" },
      { key: "skus", label: "SKU" },
      ...(products
        ? [
            {
              key: "quantity",
              label: "Cantidad",
              format: (v: unknown) =>
                v == null
                  ? "—"
                  : new Intl.NumberFormat("es-AR", {
                      maximumFractionDigits: 3,
                    }).format(Number(v)),
            },
            { key: "unit", label: "Unidad" },
          ]
        : []),
      { key: "costValue", label: "A costo", format: cash },
      { key: "saleValue", label: "A precio de venta", format: cash },
      { key: "potentialMargin", label: "Margen potencial", format: cash },
      { key: "potentialMarginPct", label: "Margen %", format: pct },
      { key: "share", label: "Participación", format: share },
    ]}
  />
);
