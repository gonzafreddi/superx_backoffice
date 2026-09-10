"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { ListSkeleton } from "@/app/components/list-skeleton";
import { metricsApi } from "@/app/lib/metrics-api";
import type { KpiSnapshot, MetricsPreset, MetricsRange } from "@/app/lib/metrics-contract";
import type { UserRole } from "@/app/lib/product-contract";
import { describeDataCoverage, getMetricsVisibility, presetRange, rangeDays, validateRange } from "@/app/lib/metrics-rules";

const roles: Record<UserRole, string> = { viewer: "Consulta", operator: "Operador", admin: "Administración" };
const money = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });
const dateTime = new Intl.DateTimeFormat("es-AR", { dateStyle: "medium", timeStyle: "short" });
const percent = (value: number) => `${(value * 100).toFixed(1)}%`;
const presets: Array<{ key: MetricsPreset; label: string }> = [{ key: "today", label: "Hoy" }, { key: "7d", label: "7 días" }, { key: "30d", label: "30 días" }, { key: "90d", label: "90 días" }];

function Kpi({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return <article className="kpi-card"><span>{label}</span><strong>{value}</strong>{hint && <small>{hint}</small>}</article>;
}

export function KpiDashboard() {
  const today = new Date().toISOString().slice(0, 10);
  const [role, setRole] = useState<UserRole>("admin");
  const [range, setRange] = useState<MetricsRange>(() => presetRange("7d", { today }));
  const [draft, setDraft] = useState<MetricsRange>(range);
  const [snapshot, setSnapshot] = useState<KpiSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [formError, setFormError] = useState("");
  const errorRef = useRef<HTMLDivElement>(null);

  const visibility = getMetricsVisibility(role);

  const load = async (next: MetricsRange) => {
    setLoading(true); setLoadError("");
    try {
      if (!navigator.onLine) throw new Error("Sin conexión a internet. Verificá tu conexión y reintentá.");
      const result = await metricsApi.getOverview(next);
      setSnapshot(result);
    } catch (error) {
      setSnapshot(null);
      setLoadError(error instanceof Error ? error.message : "No se pudieron cargar las métricas.");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    // Sincronización inicial con el adaptador temporal de métricas.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load(range);
  }, [range]);
  useEffect(() => { if (formError) errorRef.current?.focus(); }, [formError]);

  const applyPreset = (preset: MetricsPreset) => { const next = presetRange(preset, { today }); setDraft(next); setFormError(""); setRange(next); };
  const applyCustom = (event: FormEvent) => {
    event.preventDefault();
    const message = Object.values(validateRange(draft, { today }))[0] ?? "";
    setFormError(message);
    if (!message) setRange({ ...draft });
  };

  const coverage = useMemo(() => describeDataCoverage(snapshot), [snapshot]);
  const maxCount = useMemo(() => Math.max(1, ...(snapshot?.ordersPerDay.map((day) => day.count) ?? [1])), [snapshot]);
  const activePreset = presets.find((preset) => { const candidate = presetRange(preset.key, { today }); return candidate.from === range.from && candidate.to === range.to; })?.key ?? null;

  return <section className="workspace" id="tablero">
    <header className="topbar">
      <div><p className="eyebrow">DIRECCIÓN / TABLERO</p><h1>KPIs operativos</h1><p className="subtitle">Métricas definidas y calculadas por el backend. Elegí un rango; el frontend no recalcula nada.</p></div>
      <div className="top-actions"><label className="role-picker">Rol activo<select value={role} onChange={(event) => setRole(event.target.value as UserRole)}>{Object.entries(roles).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label></div>
    </header>

    <div className="permission-note">Estás operando como <strong>{roles[role]}</strong>. {visibility.financial ? "Ves todos los KPIs, incluidos GMV y ticket promedio." : "Los KPIs financieros (GMV y ticket promedio) están reservados a operador y administración."}</div>

    <section className="kpi-controls" aria-label="Rango de fechas">
      <div className="kpi-presets" role="group" aria-label="Rangos predefinidos">{presets.map((preset) => <button key={preset.key} className={`chip ${activePreset === preset.key ? "chip-active" : ""}`} aria-pressed={activePreset === preset.key} onClick={() => applyPreset(preset.key)}>{preset.label}</button>)}</div>
      <form className="kpi-range" onSubmit={applyCustom} noValidate>
        <label className="date-filter"><span>Desde</span><input type="date" max={today} value={draft.from} onChange={(event) => setDraft((current) => ({ ...current, from: event.target.value }))} /></label>
        <label className="date-filter"><span>Hasta</span><input type="date" max={today} value={draft.to} onChange={(event) => setDraft((current) => ({ ...current, to: event.target.value }))} /></label>
        <button className="button secondary" type="submit">Aplicar</button>
      </form>
    </section>
    {formError && <div className="form-summary" ref={errorRef} tabIndex={-1} role="alert"><strong>Revisá el rango</strong><span>{formError}</span></div>}

    <p className="kpi-range-note">Rango: {range.from} a {range.to} · {rangeDays(range)} {rangeDays(range) === 1 ? "día" : "días"}{snapshot ? ` · actualizado ${dateTime.format(new Date(snapshot.generatedAt))}` : ""}</p>

    {loading ? <ListSkeleton label="Cargando métricas…" /> : loadError ? (
      <div className="state error-state"><strong>{loadError.startsWith("Sin conexión") ? "Sin conexión" : "No pudimos cargar las métricas"}</strong><span>{loadError}</span><button className="button secondary" onClick={() => void load(range)}>Reintentar</button></div>
    ) : !snapshot || !coverage.hasData ? (
      <div className="state"><strong>Todavía no hay datos suficientes</strong><span>No hubo pedidos en este rango. Ampliá el período o volvé cuando haya actividad; las métricas aparecen automáticamente.</span></div>
    ) : (
      <>
        <section className="kpi-grid" aria-label="Indicadores">
          <Kpi label="Pedidos" value={String(snapshot.orderCount)} hint={`${(snapshot.orderCount / rangeDays(range)).toFixed(1)} por día en promedio`} />
          {visibility.financial && <Kpi label="GMV" value={money.format(snapshot.gmv)} hint={`${snapshot.currency}`} />}
          {visibility.financial && <Kpi label="Ticket promedio" value={money.format(snapshot.averageTicket)} />}
          <Kpi label="Cancelaciones" value={String(snapshot.cancellations.count)} hint={percent(snapshot.cancellations.rate)} />
          <Kpi label="Stockouts" value={String(snapshot.stockouts)} hint="productos sin stock en el rango" />
          <Kpi label="Fill rate" value={snapshot.fillRate === null ? "—" : percent(snapshot.fillRate)} hint={snapshot.fillRate === null ? "sin datos aún" : "unidades entregadas / pedidas"} />
          <Kpi label="Picking" value={snapshot.operationalTimes ? `${snapshot.operationalTimes.pickingMinutes} min` : "—"} hint={snapshot.operationalTimes ? "promedio" : "sin datos aún"} />
          <Kpi label="Entrega" value={snapshot.operationalTimes ? `${snapshot.operationalTimes.deliveryMinutes} min` : "—"} hint={snapshot.operationalTimes ? "promedio" : "sin datos aún"} />
        </section>

        <section className="kpi-chart" aria-label="Pedidos por día">
          <h2>Pedidos por día</h2>
          <ol className="kpi-bars">{snapshot.ordersPerDay.map((day) => <li key={day.date}><span className="kpi-bar" style={{ height: `${Math.round((day.count / maxCount) * 100)}%` }} /><span className="kpi-bar-value">{day.count}</span><time>{day.date.slice(5)}</time></li>)}</ol>
        </section>

        {coverage.pending.length > 0 && <p className="kpi-range-note">Pendientes de datos: {coverage.pending.join(", ")}. Se completan cuando el backend acumula suficiente histórico.</p>}
      </>
    )}
  </section>;
}
