"use client";
/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useState, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { salesApi } from "../../lib/sales-api";
import { fixturesEnabled } from "../../lib/api-mode";
import { can } from "../../lib/permissions";
import { getStoredUser } from "../../lib/auth-api";
import { locationApi } from "../../lib/location-api";
import type {
  BreakdownBy,
  SalesSummary,
  SalesRange,
} from "../../lib/sales-contract";
import {
  dayLabel,
  money,
  percent,
  presets,
  rangeError,
  salesPath,
  salesPreset,
} from "../../lib/sales-rules";
import { Notice } from "../ui/notice";
import { MobileFilters } from "../ui/mobile-filters";
import { ExportCsvButton } from "../ui/export-csv-button";
import {
  BarChart,
  CashChart,
  DailyChart,
  Donut,
  HorizontalBars,
} from "./sales-charts";
import {
  BreakdownTable,
  CashTable,
  DailyTable,
  StockTable,
} from "./sales-tables";
import "./sales.css";
const tabs = {
  dashboard: "Tablero",
  daily: "Ventas diarias",
  cash: "Caja diaria",
  products: "Productos y categorías",
  stock: "Stock valorizado",
  profitability: "Rentabilidad",
};
type Tab = keyof typeof tabs;
function Block<T>({
  title,
  load,
  children,
  className = "",
}: {
  title: string;
  load: (signal: AbortSignal) => Promise<T>;
  children: (data: T) => ReactNode;
  className?: string;
}) {
  const [state, setState] = useState<{
      data?: T;
      error?: string;
      loading: boolean;
    }>({ loading: true }),
    [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setState({ loading: true });
    void load(controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) setState({ data, loading: false });
      })
      .catch((error) => {
        if (!controller.signal.aborted)
          setState({
            loading: false,
            error:
              error instanceof Error
                ? error.message
                : "No pudimos cargar los datos.",
          });
      });
    return () => controller.abort();
  }, [load, retry]);
  return (
    <section
      className={`sales-panel ${className}`}
      aria-label={title}
      aria-busy={state.loading}
    >
      <header>
        <h2>{title}</h2>
      </header>
      {state.loading ? (
        <div
          className="sales-skeleton"
          role="status"
          aria-label={`Cargando ${title}`}
        >
          <i />
          <i />
          <i />
        </div>
      ) : state.error ? (
        <Notice kind="error" role="alert">
          {state.error}{" "}
          <button
            className="button secondary"
            onClick={() => setRetry(retry + 1)}
          >
            Reintentar
          </button>
        </Notice>
      ) : state.data !== undefined ? (
        children(state.data)
      ) : null}
    </section>
  );
}
function Kpi({
  label,
  value,
  hint,
  delta,
}: {
  label: string;
  value: string;
  hint?: string;
  delta?: number | null;
}) {
  return (
    <article className="sales-kpi">
      <span>{label}</span>
      <strong>{value}</strong>
      <div>
        {delta !== undefined && (
          <b
            className={
              delta == null
                ? ""
                : delta >= 0
                  ? "sales-positive"
                  : "sales-negative"
            }
          >
            {delta == null
              ? "Sin base comparable"
              : `${delta >= 0 ? "↗" : "↘"} ${percent(Math.abs(delta))}`}
          </b>
        )}
        {hint && <small>{hint}</small>}
      </div>
    </article>
  );
}
function Inventory({ data }: { data: SalesSummary }) {
  const i = data.inventory;
  return (
    <div className="sales-inventory">
      <Kpi label="Stock a costo" value={money(i.costValue, true)} />
      <Kpi label="Stock a precio de venta" value={money(i.saleValue, true)} />
      <Kpi label="Margen potencial" value={money(i.potentialMargin, true)} />
      <Kpi label="ROI anualizado" value={percent(i.roiAnnualPct)} />
      <Kpi
        label="Días de inventario"
        value={
          i.inventoryDays == null
            ? "—"
            : new Intl.NumberFormat("es-AR", {
                maximumFractionDigits: 1,
              }).format(i.inventoryDays)
        }
      />
    </div>
  );
}
export function IncomeStatement({ data }: { data: SalesSummary }) {
  const k = data.kpis;
  const rows = [
    ["Venta bruta", k.grossSales],
    ["− Descuentos", k.discounts],
    ["= Venta neta", k.netSales],
    ["− CMV", k.cogs],
    ["= Margen bruto", k.grossMargin],
    ["+ Envíos cobrados", k.deliveryFees],
    ["− Devoluciones", k.refunds],
    ["− Gastos operativos", k.operatingExpenses],
    ["= Resultado neto", k.netResult],
  ];
  return (
    <div className="sales-statement">
      {rows.map(([label, amount]) => (
        <div
          className={label.startsWith("=") ? "sales-subtotal" : ""}
          key={label}
        >
          <span>
            {label === "− Gastos operativos" ? (
              <details>
                <summary>{label}</summary>
                {data.expensesByCategory.map((e) => (
                  <p key={e.category}>
                    {e.category}
                    <strong>{money(e.amount)}</strong>
                  </p>
                ))}
              </details>
            ) : (
              label
            )}
          </span>
          <strong>{money(amount)}</strong>
          <small>
            {Number(k.billed)
              ? percent((Number(amount) / Number(k.billed)) * 100)
              : "—"}
          </small>
        </div>
      ))}
      <p>
        Porcentajes sobre facturación. Las inversiones no se incluyen como
        gastos operativos.
      </p>
    </div>
  );
}
function SummaryCards({ data }: { data: SalesSummary }) {
  const k = data.kpis,
    delta = data.deltaPct;
  return (
    <>
      <div className="sales-kpis">
        <Kpi
          label="Facturación"
          value={money(k.billed, true)}
          delta={delta.billed}
        />
        <Kpi
          label="Pedidos entregados"
          value={String(k.orders)}
          delta={delta.orders}
          hint={`${k.units} unidades`}
        />
        <Kpi
          label="Ticket promedio"
          value={money(k.averageTicket, true)}
          delta={delta.averageTicket}
        />
        <Kpi
          label="Margen bruto"
          value={money(k.grossMargin, true)}
          delta={delta.grossMargin}
          hint={`${percent(k.grossMarginPct)} sobre venta neta`}
        />
        <Kpi
          label="Resultado neto"
          value={money(k.netResult, true)}
          delta={delta.netResult}
          hint={percent(k.netMarginPct)}
        />
        <Kpi
          label="Cobrado neto"
          value={money(k.collected, true)}
          delta={delta.collected}
        />
        <Kpi
          label="Pendiente de cobro"
          value={money(data.receivable, true)}
          hint="Foto actual · todos los períodos"
        />
        <Kpi
          label="Clientes"
          value={String(k.customers)}
          delta={delta.customers}
          hint={`${k.newCustomers} nuevos`}
        />
      </div>
      <p className="sales-muted">
        Comparación con {dayLabel(data.previousRange.from)} al{" "}
        {dayLabel(data.previousRange.to)} · {k.cancelledOrders} pedidos
        cancelados ({money(k.cancelledAmount)}) · Descuentos:{" "}
        {money(k.discounts)}.
      </p>
      {k.costCoverage < 100 && (
        <Notice kind="info">
          {percent(100 - k.costCoverage)} de las unidades vendidas no tiene
          costo cargado; el margen puede estar sobreestimado.
        </Notice>
      )}
    </>
  );
}
function SalesContent({ tab, range }: { tab: Tab; range: SalesRange }) {
  const [by, setBy] = useState<BreakdownBy>("product"),
    [group, setGroup] = useState<"category" | "product">("category"),
    [warehouse, setWarehouse] = useState("");
  const [warehouses, setWarehouses] = useState<{ id: string; name: string }[]>(
      [],
    ),
    [warehouseError, setWarehouseError] = useState(""),
    [warehouseRetry, setWarehouseRetry] = useState(0);
  useEffect(() => {
    if (tab !== "stock") return;
    let active = true;
    setWarehouseError("");
    void locationApi
      .listWarehouses()
      .then((result) => {
        if (active) setWarehouses(result);
      })
      .catch(() => {
        if (active) setWarehouseError("No pudimos cargar los depósitos.");
      });
    return () => {
      active = false;
    };
  }, [tab, warehouseRetry]);
  // These loaders are stable for the lifetime of a content key (range/tab/selection).
  const [loaders] = useState(() => ({
    summary: (s: AbortSignal) => salesApi.summary(range, s),
    daily: (s: AbortSignal) => salesApi.daily(range, s),
    cash: (s: AbortSignal) => salesApi.cashDaily(range, s),
    category: (s: AbortSignal) => salesApi.breakdown(range, "category", 20, s),
    hour: (s: AbortSignal) => salesApi.breakdown(range, "hour", 20, s),
    weekday: (s: AbortSignal) => salesApi.breakdown(range, "weekday", 20, s),
  }));
  if (tab === "stock")
    return (
      <>
        <MobileFilters aria-label="Filtros de stock">
          <label className="field">
            Agrupar por
            <select
              value={group}
              onChange={(e) => setGroup(e.target.value as typeof group)}
            >
              <option value="category">Categoría</option>
              <option value="product">Producto</option>
            </select>
          </label>
          <label className="field">
            Depósito
            <select
              value={warehouse}
              onChange={(e) => setWarehouse(e.target.value)}
            >
              <option value="">Todos los depósitos</option>
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          </label>
        </MobileFilters>
        {warehouseError && (
          <Notice kind="error">
            {warehouseError}{" "}
            <button
              className="button secondary"
              onClick={() => setWarehouseRetry((n) => n + 1)}
            >
              Reintentar
            </button>
          </Notice>
        )}
        <StockBlock
          key={`${group}-${warehouse}`}
          group={group}
          warehouse={warehouse}
        />
      </>
    );
  if (tab === "products")
    return (
      <>
        <label className="field sales-selector">
          Ver ventas por
          <select
            value={by}
            onChange={(e) => setBy(e.target.value as BreakdownBy)}
          >
            <option value="product">Producto</option>
            <option value="category">Categoría</option>
            <option value="zone">Zona</option>
            <option value="payment_method">Medio de pago</option>
          </select>
        </label>
        <RankingBlock key={by} range={range} by={by} />
      </>
    );
  if (tab === "daily")
    return (
      <>
        <ExportCsvButton
          path={salesPath("daily.csv", range)}
          filename={`ventas-${range.from}-${range.to}.csv`}
        />
        <Block title="Ventas diarias" load={loaders.daily}>
          {(data) => (
            <>
              <DailyChart data={data} />
              <DailyTable data={data} />
            </>
          )}
        </Block>
      </>
    );
  if (tab === "cash")
    return (
      <>
        <ExportCsvButton
          path={salesPath("cash-daily.csv", range)}
          filename={`caja-${range.from}-${range.to}.csv`}
        />
        <Block title="Caja diaria" load={loaders.cash}>
          {(data) => (
            <>
              <p className="sales-muted">
                Movimientos de cobro acreditados, sin reversas. Las devoluciones
                restan del neto.
              </p>
              <CashChart data={data} />
              <CashTable data={data} />
              <h3>Cobros por cuenta de tesorería</h3>
              <div className="sales-inventory">
                {data.byAccount.map((a) => (
                  <Kpi
                    key={a.accountId}
                    label={a.accountName}
                    value={money(a.total, true)}
                  />
                ))}
              </div>
            </>
          )}
        </Block>
      </>
    );
  if (tab === "profitability")
    return (
      <>
        <Block title="Estado de resultados detallado" load={loaders.summary}>
          {(data) => (
            <>
              <IncomeStatement data={data} />
              <h3>Gastos por categoría</h3>
              <div className="sales-inventory">
                {data.expensesByCategory.map((e) => (
                  <Kpi
                    key={e.category}
                    label={e.category}
                    value={money(e.amount, true)}
                  />
                ))}
              </div>
              <Inventory data={data} />
              <p>
                ROI anualizado: margen bruto del período / stock actual a costo
                × 365 / días del período.
              </p>
              <p>
                Días de inventario: stock actual a costo / CMV diario promedio
                del período. Sin divisor, se muestra —.
              </p>
              {data.kpis.costCoverage < 100 && (
                <Notice kind="info">
                  {percent(100 - data.kpis.costCoverage)} de las unidades
                  vendidas no tiene costo cargado; el margen puede estar
                  sobreestimado.
                </Notice>
              )}
            </>
          )}
        </Block>
        <Block title="Margen por categoría" load={loaders.category}>
          {(data) => (
            <BreakdownTable
              data={{
                ...data,
                rows: [...data.rows].sort(
                  (a, b) => Number(b.grossMargin) - Number(a.grossMargin),
                ),
              }}
            />
          )}
        </Block>
      </>
    );
  return (
    <>
      <Block
        title="Resumen del período"
        className="sales-summary"
        load={loaders.summary}
      >
        {(data) => <SummaryCards data={data} />}
      </Block>
      <Block title="Evolución de ventas" load={loaders.daily}>
        {(data) => <DailyChart data={data} />}
      </Block>
      <div className="sales-two">
        <Block title="Cobros por medio de pago" load={loaders.cash}>
          {(data) => <Donut data={data} />}
        </Block>
        <Block title="Top categorías" load={loaders.category}>
          {(data) => <HorizontalBars data={data} />}
        </Block>
        <Block title="Ventas por hora" load={loaders.hour}>
          {(data) => (
            <BarChart
              title="Ventas por hora argentina"
              points={data.rows.map((r) => ({
                label: r.label,
                values: [Number(r.grossSales)],
              }))}
            />
          )}
        </Block>
        <Block title="Ventas por día de semana" load={loaders.weekday}>
          {(data) => (
            <BarChart
              title="Ventas por día de semana"
              points={data.rows.map((r) => ({
                label: r.label.slice(0, 3),
                values: [Number(r.grossSales)],
              }))}
            />
          )}
        </Block>
      </div>
      <Block title="Estado de resultados" load={loaders.summary}>
        {(data) => <IncomeStatement data={data} />}
      </Block>
      <Block title="Inventario · foto actual" load={loaders.summary}>
        {(data) => <Inventory data={data} />}
      </Block>
    </>
  );
}
function StockBlock({
  group,
  warehouse,
}: {
  group: "category" | "product";
  warehouse: string;
}) {
  const [load] = useState(
    () => (s: AbortSignal) =>
      salesApi.stockValuation(group, warehouse || undefined, s),
  );
  return (
    <Block title="Stock valorizado · foto actual" load={load}>
      {(data) => (
        <>
          <div className="sales-inventory">
            <Kpi
              label="Stock a costo"
              value={money(data.totals.costValue, true)}
            />
            <Kpi
              label="Stock a precio de venta"
              value={money(data.totals.saleValue, true)}
            />
            <Kpi
              label="Margen potencial"
              value={money(data.totals.potentialMargin, true)}
              hint={percent(data.totals.potentialMarginPct)}
            />
            <Kpi label="Productos con stock" value={String(data.totals.skus)} />
          </div>
          {(data.totals.missingCost > 0 || data.totals.missingPrice > 0) && (
            <Notice kind="info">
              {data.totals.missingCost} productos sin costo ·{" "}
              {data.totals.missingPrice} sin precio.{" "}
              <Link href="/productos">Completar en Productos</Link>
            </Notice>
          )}
          <p className="sales-muted">
            Stock positivo a precio vigente, sin promociones. El margen
            potencial incluye únicamente productos con costo y precio.
          </p>
          <StockTable data={data} products={group === "product"} />
        </>
      )}
    </Block>
  );
}
function RankingBlock({ range, by }: { range: SalesRange; by: BreakdownBy }) {
  const [load] = useState(
    () => (s: AbortSignal) => salesApi.breakdown(range, by, 200, s),
  );
  return (
    <Block title="Ranking · ordená por cualquier columna" load={load}>
      {(data) => <BreakdownTable data={data} />}
    </Block>
  );
}
export function SalesWorkspace() {
  const params = useSearchParams(),
    defaults = salesPreset("month30");
  const range = {
    from: params.get("from") ?? defaults.from,
    to: params.get("to") ?? defaults.to,
  };
  const tab = (
    params.get("tab") && params.get("tab")! in tabs
      ? params.get("tab")
      : "dashboard"
  ) as Tab;
  const [allowed, setAllowed] = useState<boolean | null>(null),
    [draft, setDraft] = useState(range),
    [error, setError] = useState(""),
    [custom, setCustom] = useState(false);
  useEffect(() => setAllowed(can(getStoredUser()?.role, "sales.read")), []);
  useEffect(() => {
    setDraft({ from: range.from, to: range.to });
    setError("");
  }, [range.from, range.to]);
  const update = (next: Partial<SalesRange> & { tab?: Tab }) => {
    const query = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries({ ...range, tab, ...next }))
      query.set(key, value);
    window.history.pushState(null, "", `?${query}`);
  };
  const problem = rangeError(range);
  if (allowed !== true)
    return (
      <section className="workspace">
        <Notice kind="info">
          {allowed === null
            ? "Verificando acceso…"
            : "Tu cuenta no tiene acceso a ventas."}
        </Notice>
      </section>
    );
  return (
    <section className="workspace sales-workspace">
      <header className="topbar">
        <div>
          <p className="eyebrow">VENTAS / ANÁLISIS COMERCIAL</p>
          <h1>Ventas</h1>
          <p className="subtitle">
            De la venta al resultado. Toda la operación en números.
          </p>
        </div>
        <span className="sales-period-tag">America/Argentina/Buenos_Aires</span>
      </header>
      {fixturesEnabled() && (
        <Notice kind="info">
          Datos de demostración. No reflejan la operación real.
        </Notice>
      )}
      <div className="sales-period">
        <div className="sales-presets" aria-label="Período">
          {Object.entries(presets).map(([key, label]) => {
            const r = salesPreset(key as keyof typeof presets);
            return (
              <button
                type="button"
                key={key}
                aria-pressed={
                  !custom && r.from === range.from && r.to === range.to
                }
                onClick={() => {
                  setCustom(false);
                  update(r);
                }}
              >
                {label}
              </button>
            );
          })}
          <button
            type="button"
            aria-pressed={custom}
            onClick={() => setCustom(!custom)}
          >
            Personalizado
          </button>
        </div>
        {custom && (
          <MobileFilters
            aria-label="Período personalizado"
            search={<p>Elegí las fechas del período</p>}
          >
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const problem = rangeError(draft);
                setError(problem);
                if (!problem) update(draft);
              }}
            >
              <label className="field">
                Desde
                <input
                  type="date"
                  required
                  value={draft.from}
                  onChange={(e) => setDraft({ ...draft, from: e.target.value })}
                />
              </label>
              <label className="field">
                Hasta
                <input
                  type="date"
                  required
                  value={draft.to}
                  onChange={(e) => setDraft({ ...draft, to: e.target.value })}
                />
              </label>
              <button className="button primary" type="submit">
                Aplicar
              </button>
            </form>
          </MobileFilters>
        )}
        <p>
          {!problem
            ? `${dayLabel(range.from)} al ${dayLabel(range.to)}`
            : "Revisá las fechas"}{" "}
          <span>vs. período anterior</span>
        </p>
        {error && (
          <Notice kind="error" role="alert">
            {error}
          </Notice>
        )}
      </div>
      <nav className="sales-tabs" aria-label="Secciones de ventas">
        {Object.entries(tabs).map(([key, label]) => (
          <button
            type="button"
            key={key}
            aria-current={tab === key ? "page" : undefined}
            onClick={() => update({ tab: key as Tab })}
          >
            {label}
          </button>
        ))}
      </nav>
      {problem ? (
        <Notice kind="error" role="alert">
          {problem}
        </Notice>
      ) : (
        <SalesContent
          key={`${tab}-${range.from}-${range.to}`}
          tab={tab}
          range={range}
        />
      )}
      <footer className="sales-footnote">
        Importes con IVA incluido · Ventas: pedidos entregados · Fechas en hora
        argentina · Stock y pendiente de cobro son fotos actuales.
      </footer>
    </section>
  );
}
