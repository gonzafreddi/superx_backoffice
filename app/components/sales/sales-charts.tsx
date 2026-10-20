"use client";
import { useState } from "react";
import { money, methodLabel } from "../../lib/sales-rules";
import type {
  CashDaily,
  DailySales,
  SalesBreakdown,
} from "../../lib/sales-contract";
export function BarChart({
  title,
  points,
  line = false,
  stacked = false,
}: {
  title: string;
  points: { label: string; values: number[]; margin?: number }[];
  line?: boolean;
  stacked?: boolean;
}) {
  const [active, setActive] = useState<number | null>(null);
  const max = Math.max(
      1,
      ...points.map((p) => p.values.reduce((s, n) => s + n, 0)),
    ),
    width = 900,
    step = 820 / Math.max(points.length, 1);
  const y = (n: number) => 220 - (n / max) * 180;
  return (
    <div className="sales-chart">
      <svg viewBox={`0 0 ${width} 270`} role="img" aria-label={title}>
        <title>{title}</title>
        {[0, 0.5, 1].map((n) => (
          <g key={n}>
            <line
              x1="60"
              x2="890"
              y1={y(max * n)}
              y2={y(max * n)}
              className="sales-gridline"
            />
            <text x="54" y={y(max * n) + 4} textAnchor="end">
              {new Intl.NumberFormat("es-AR", {
                notation: "compact",
                maximumFractionDigits: 1,
              }).format(max * n)}
            </text>
          </g>
        ))}
        {points.map((point, i) => {
          let base = 0;
          return (
            <g
              key={point.label}
              tabIndex={0}
              role="button"
              aria-label={`${point.label}: ${money(point.values.reduce((s, n) => s + n, 0))}${line ? `; margen ${money(point.margin ?? 0)}` : ""}`}
              onMouseEnter={() => setActive(i)}
              onMouseLeave={() => setActive(null)}
              onFocus={() => setActive(i)}
              onBlur={() => setActive(null)}
              onClick={() => setActive(active === i ? null : i)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setActive(active === i ? null : i);
                }
              }}
            >
              <rect
                x={60 + i * step}
                y="25"
                width={step}
                height="205"
                fill="transparent"
              />
              {point.values.map((value, index) => {
                base += value;
                return (
                  <rect
                    key={index}
                    x={64 + i * step}
                    y={y(base)}
                    width={Math.max(2, step - 7)}
                    height={Math.max(0, (value / max) * 180)}
                    rx="2"
                    className={`sales-fill-${stacked ? index % 5 : 0}`}
                    opacity={active === i ? 0.7 : 1}
                  >
                    <title>{`${point.label}: ${money(value)}`}</title>
                  </rect>
                );
              })}
              {(points.length <= 7 ||
                i % Math.ceil(points.length / 8) === 0) && (
                <text x={64 + i * step} y="249">
                  {point.label}
                </text>
              )}
              {line && (
                <circle
                  cx={64 + i * step + Math.max(2, step - 7) / 2}
                  cy={y(point.margin ?? 0)}
                  r="3"
                  className="sales-line-dot"
                />
              )}
            </g>
          );
        })}
        {line && (
          <polyline
            fill="none"
            className="sales-margin-line"
            strokeWidth="3"
            points={points
              .map(
                (p, i) =>
                  `${64 + i * step + Math.max(2, step - 7) / 2},${y(p.margin ?? 0)}`,
              )
              .join(" ")}
          />
        )}
      </svg>
      <div className="sales-tooltip" aria-live="polite">
        {active === null
          ? "Tocá o enfocá una barra para ver el detalle."
          : `${points[active].label} · ${money(points[active].values.reduce((s, n) => s + n, 0))}${line ? ` · Margen ${money(points[active].margin ?? 0)}` : ""}`}
      </div>
    </div>
  );
}
export const DailyChart = ({ data }: { data: DailySales }) => (
  <>
    <div className="sales-legend">
      <span>
        <i className="sales-fill-0" />
        Facturación
      </span>
      <span>
        <i className="sales-fill-1" />
        Margen bruto
      </span>
    </div>
    <BarChart
      title="Facturación diaria y margen bruto"
      line
      points={data.rows.map((r) => ({
        label: r.date.slice(5).split("-").reverse().join("/"),
        values: [Number(r.billed)],
        margin: Number(r.grossMargin),
      }))}
    />
  </>
);
export const CashChart = ({ data }: { data: CashDaily }) => (
  <>
    <div className="sales-legend">
      {data.methods.map((m, i) => (
        <span key={m}>
          <i className={`sales-fill-${i % 5}`} />
          {methodLabel(m)}
        </span>
      ))}
    </div>
    <BarChart
      title="Cobros diarios por medio de pago"
      stacked
      points={data.rows.map((r) => ({
        label: r.date.slice(5).split("-").reverse().join("/"),
        values: data.methods.map((m) => Number(r.byMethod[m] ?? 0)),
      }))}
    />
  </>
);
export function Donut({ data }: { data: CashDaily }) {
  const [active, setActive] = useState<string | null>(null),
    total = Number(data.totals.total);
  return (
    <div className="sales-donut">
      <svg
        viewBox="0 0 200 200"
        role="img"
        aria-label="Distribución de cobros por medio de pago"
      >
        <title>Cobros por medio de pago</title>
        <circle
          cx="100"
          cy="100"
          r="72"
          fill="none"
          stroke="var(--line)"
          strokeWidth="24"
        />
        {data.methods.map((m, i) => {
          const share = total
              ? (Number(data.totals.byMethod[m] ?? 0) / total) * 100
              : 0,
            start = total
              ? (data.methods
                  .slice(0, i)
                  .reduce(
                    (sum, method) =>
                      sum + Number(data.totals.byMethod[method] ?? 0),
                    0,
                  ) /
                  total) *
                100
              : 0;
          return (
            <circle
              key={m}
              cx="100"
              cy="100"
              r="72"
              fill="none"
              strokeWidth="24"
              pathLength="100"
              strokeDasharray={`${share} ${100 - share}`}
              strokeDashoffset={-start}
              transform="rotate(-90 100 100)"
              className={`sales-stroke-${i % 5}`}
              tabIndex={0}
              role="button"
              aria-label={`${methodLabel(m)}: ${money(data.totals.byMethod[m] ?? "0.00")}`}
              onMouseEnter={() => setActive(m)}
              onFocus={() => setActive(m)}
              onClick={() => setActive(m)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setActive(m);
                }
              }}
            >
              <title>
                {methodLabel(m)}: {money(data.totals.byMethod[m] ?? "0.00")}
              </title>
            </circle>
          );
        })}
        <text x="100" y="96" textAnchor="middle">
          Cobros brutos
        </text>
        <text x="100" y="119" textAnchor="middle" className="sales-donut-total">
          {money(total, true)}
        </text>
      </svg>
      <div>
        {data.methods.map((m, i) => (
          <button
            key={m}
            type="button"
            onClick={() => setActive(m)}
            className={active === m ? "sales-method-active" : ""}
          >
            <i className={`sales-fill-${i % 5}`} />
            <span>{methodLabel(m)}</span>
            <strong>{money(data.totals.byMethod[m] ?? "0.00")}</strong>
          </button>
        ))}
      </div>
    </div>
  );
}
export function HorizontalBars({ data }: { data: SalesBreakdown }) {
  const max = Math.max(1, ...data.rows.map((r) => Number(r.netSales)));
  return (
    <div className="sales-horizontal">
      {data.rows.map((r) => (
        <div key={r.key}>
          <span>{r.label}</span>
          <strong>{money(r.netSales, true)}</strong>
          <div role="img" aria-label={`${r.label}: ${money(r.netSales)}`}>
            <i style={{ width: `${(Number(r.netSales) / max) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}
