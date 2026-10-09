"use client";
/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useMemo, useState } from "react";
import { getStoredUser } from "@/app/lib/auth-api";
import { can } from "@/app/lib/permissions";
import { fixturesEnabled } from "@/app/lib/api-mode";
import { salesReport } from "@/app/lib/reports-api";
import { exportPath, presetRange, rangeError, sortRows, type DatePreset, type GroupBy, type ReportFilters, type SalesReport, type SalesRow } from "@/app/lib/report-rules";
import { Notice } from "../ui/notice";
import { StatusBadge } from "../ui/status-badge";
import { TablePagination } from "../ui/table-pagination";
import { ExportCsvButton } from "../ui/export-csv-button";
import "./reports.css";
const groups: Record<GroupBy, string> = { day: "Día", product: "Producto", category: "Categoría", payment_method: "Medio de pago" };
const columns: [keyof SalesRow, string][] = [["label", "Grupo"], ["orders", "Pedidos"], ["units", "Unidades"], ["revenue", "Ventas"], ["cost", "Costo"], ["margin", "Margen"], ["marginPct", "Margen %"], ["costCoverage", "Cobertura de costo"]];
const money = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" });
const number = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 2 });
function value(row: SalesRow, key: keyof SalesRow) { return ["revenue", "cost", "margin"].includes(key) ? money.format(Number(row[key])) : ["marginPct", "costCoverage"].includes(key) ? `${number.format(Number(row[key]))}%` : typeof row[key] === "number" ? number.format(Number(row[key])) : row[key]; }
export function ReportsManager() {
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [filters, setFilters] = useState<ReportFilters>(() => ({ ...presetRange("month"), groupBy: "day" }));
  const [data, setData] = useState<SalesReport | null>(null), [loading, setLoading] = useState(true), [error, setError] = useState(""), [retry, setRetry] = useState(0), [page, setPage] = useState(1);
  const [sort, setSort] = useState<{ key: keyof SalesRow; descending: boolean }>({ key: "label", descending: false });
  const problem = rangeError(filters.from, filters.to);
  useEffect(() => { setAllowed(can(getStoredUser()?.role, "reports.read")); }, []);
  useEffect(() => {
    if (!allowed || problem) return;
    const controller = new AbortController(); setLoading(true); setError(""); setData(null);
    void salesReport(filters, controller.signal).then(result => { if (!controller.signal.aborted) setData(result); }).catch(cause => { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "No pudimos cargar el reporte."); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [allowed, filters, problem, retry]);
  const rows = useMemo(() => sortRows(data?.rows ?? [], sort.key, sort.descending), [data, sort]);
  const update = (next: Partial<ReportFilters>) => { setFilters(current => ({ ...current, ...next })); setPage(1); };
  if (allowed !== true) return <section className="workspace"><Notice kind="info">{allowed === null ? "Verificando acceso…" : "Tu cuenta no tiene acceso a reportes."}</Notice></section>;
  return <section className="workspace reports-workspace"><header className="topbar"><div><p className="eyebrow">FINANZAS / REPORTES</p><h1>Ventas y margen</h1><p className="subtitle">Sólo pedidos entregados. Ventas de productos, sin envío.</p></div><ExportCsvButton path={exportPath("/exports/sales-report.csv", filters)} filename={`ventas-${filters.from}-${filters.to}.csv`} disabled={loading || Boolean(problem) || !data} /></header>
    {fixturesEnabled() && <Notice kind="info">Datos de ejemplo para desarrollo.</Notice>}
    <div className="report-presets" aria-label="Rangos rápidos">{([["today", "Hoy"], ["week", "7 días"], ["month", "Mes actual"], ["previousMonth", "Mes anterior"]] as [DatePreset, string][]).map(([preset, label]) => <button className="button secondary" type="button" key={preset} onClick={() => update(presetRange(preset))}>{label}</button>)}</div>
    <section className="locations-filter-bar report-filters" aria-label="Filtros del reporte"><label className="field"><span>Desde</span><input type="date" required value={filters.from} onChange={event => update({ from: event.target.value })} /></label><label className="field"><span>Hasta</span><input type="date" required value={filters.to} onChange={event => update({ to: event.target.value })} /></label><label className="field"><span>Agrupar por</span><select value={filters.groupBy} onChange={event => update({ groupBy: event.target.value as GroupBy })}>{Object.entries(groups).map(([key, label]) => <option value={key} key={key}>{label}</option>)}</select></label></section>
    {problem && <Notice kind="error" role="alert">{problem}</Notice>}{error && <Notice kind="error" role="alert">{error} <button className="button secondary" onClick={() => setRetry(retry + 1)}>Reintentar</button></Notice>}
    {!problem && data && <><section className="report-kpis" aria-label="Totales del período">{(["revenue", "cost", "margin", "marginPct", "costCoverage"] as const).map(key => <div className="inventory-metric-card" key={key}><div><span>{columns.find(([column]) => column === key)?.[1]}</span><strong>{value({ ...data.totals, key: "", label: "" }, key)}</strong></div></div>)}</section>{data.totals.costCoverage < 100 && <Notice kind="info">Hay unidades sin costo conocido. Su costo se computa como cero; el margen puede estar sobreestimado. Los pedidos históricos usan el costo actual cuando no tienen costo guardado.</Notice>}</>}
    <section className="location-table-panel" aria-busy={loading}><header><h2>Detalle por {groups[filters.groupBy].toLocaleLowerCase("es-AR")}</h2><label className="field"><span>Ordenar por</span><select value={sort.key} onChange={event => { setSort({ key: event.target.value as keyof SalesRow, descending: sort.descending }); setPage(1); }}>{columns.map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label><button className="button secondary" type="button" onClick={() => { setSort({ ...sort, descending: !sort.descending }); setPage(1); }}>{sort.descending ? "Descendente" : "Ascendente"}</button><StatusBadge tone="success" label="Entregados" /></header>{problem ? <div className="state">Corregí el rango de fechas.</div> : loading ? <div className="state">Cargando reporte…</div> : !data ? <div className="state">No hay un reporte disponible.</div> : !rows.length ? <div className="state">No hay ventas entregadas para este período.</div> : <><div className="location-table-wrap"><table className="location-stock-table report-table"><thead><tr>{columns.map(([key, label]) => <th key={key} aria-sort={sort.key === key ? sort.descending ? "descending" : "ascending" : "none"}><button type="button" onClick={() => { setSort({ key, descending: sort.key === key ? !sort.descending : false }); setPage(1); }}>{label}{sort.key === key ? sort.descending ? " ↓" : " ↑" : ""}</button></th>)}</tr></thead><tbody>{rows.slice((page - 1) * 25, page * 25).map(row => <tr key={row.key}>{columns.map(([key, label]) => <td key={key} data-label={label}>{value(row, key)}</td>)}</tr>)}</tbody></table></div><TablePagination page={page} pageSize={25} total={rows.length} label={`Página ${page} · ${rows.length} grupos`} buttonClassName="button secondary" onPrev={() => setPage(page - 1)} onNext={() => setPage(page + 1)} /></>}</section>
  </section>;
}
