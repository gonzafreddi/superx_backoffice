import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { render, cleanup, fireEvent } from "./picking-test-utils";
import {
  CashTable,
  DailyTable,
  BreakdownTable,
} from "../app/components/sales/sales-tables";
import { IncomeStatement } from "../app/components/sales/sales-workspace";
import { salesApi } from "../app/lib/sales-api";
import {
  fixtureCash,
  fixtureDaily,
  fixtureSummary,
  fixtureBreakdown,
} from "../app/lib/sales-fixtures";
import {
  argentinaToday,
  salesPreset,
  rangeError,
  money,
  percent,
  cents,
  sumMoney,
} from "../app/lib/sales-rules";
import { csvBlob } from "../app/lib/download-csv";
const range = { from: "2026-10-01", to: "2026-10-17" };
test("períodos en Argentina, cambio de mes, año bisiesto y límites", () => {
  const now = new Date("2026-10-01T01:30:00Z");
  assert.equal(argentinaToday(now), "2026-09-30");
  assert.deepEqual(salesPreset("today", now), {
    from: "2026-09-30",
    to: "2026-09-30",
  });
  assert.deepEqual(salesPreset("yesterday", now), {
    from: "2026-09-29",
    to: "2026-09-29",
  });
  assert.deepEqual(salesPreset("week", now), {
    from: "2026-09-24",
    to: "2026-09-30",
  });
  assert.deepEqual(salesPreset("month30", now), {
    from: "2026-09-01",
    to: "2026-09-30",
  });
  assert.deepEqual(salesPreset("month", now), {
    from: "2026-09-01",
    to: "2026-09-30",
  });
  assert.deepEqual(salesPreset("year", now), {
    from: "2026-01-01",
    to: "2026-09-30",
  });
  assert.deepEqual(
    salesPreset("previousMonth", new Date("2024-03-15T12:00Z")),
    { from: "2024-02-01", to: "2024-02-29" },
  );
  assert.equal(rangeError({ from: "2024-01-01", to: "2024-12-31" }), "");
  assert.equal(
    rangeError({ from: "2024-01-01", to: "2025-01-01" }),
    "Rango máximo: 366 días.",
  );
  assert.equal(
    rangeError({ from: range.to, to: range.from }),
    "Rango de fechas invertido.",
  );
  assert.equal(
    rangeError({ from: "2026-02-30", to: range.to }),
    "Indicá dos fechas válidas.",
  );
  assert.match(money("1234.56"), /1\.234,56/);
  assert.match(money("1234.56", true), /1\.235/);
  assert.equal(percent(12.35), "12,4%");
  assert.equal(percent(null), "—");
  assert.equal(sumMoney(["0.10", "0.20"]), "0.30");
});
test("API conserva JSON decimal y envía únicamente parámetros de contrato, CSV autenticado", async () => {
  const previous = process.env.NEXT_PUBLIC_SUPERX_API_BASE_URL,
    oldFetch = globalThis.fetch;
  process.env.NEXT_PUBLIC_SUPERX_API_BASE_URL = "http://backend.test/";
  const urls: string[] = [];
  let status = 200;
  globalThis.fetch = async (url) => {
    urls.push(String(url));
    return new Response(
      JSON.stringify(
        status === 200
          ? fixtureSummary(range)
          : { message: "Rango máximo: 366 días." },
      ),
      { status },
    );
  };
  try {
    const result = await salesApi.summary(range);
    assert.equal(typeof result.kpis.billed, "string");
    assert.equal(result.kpis.netSales, fixtureSummary(range).kpis.netSales);
    await salesApi.daily(range);
    await salesApi.cashDaily(range);
    await salesApi.breakdown(range, "zone", 25);
    await salesApi.stockValuation("product", "7");
    await csvBlob("/sales/cash-daily.csv?from=2026-10-01&to=2026-10-17");
    assert.deepEqual(
      urls,
      ["summary", "daily", "cash-daily"]
        .map(
          (path) =>
            `http://backend.test/sales/${path}?from=2026-10-01&to=2026-10-17`,
        )
        .concat([
          "http://backend.test/sales/breakdown?from=2026-10-01&to=2026-10-17&by=zone&limit=25",
          "http://backend.test/sales/stock-valuation?groupBy=product&warehouseId=7&limit=200",
          "http://backend.test/sales/cash-daily.csv?from=2026-10-01&to=2026-10-17",
        ]),
    );
    status = 403;
    await assert.rejects(salesApi.summary(range), /acceso a ventas/);
    status = 400;
    await assert.rejects(salesApi.summary(range), /Rango máximo/);
  } finally {
    globalThis.fetch = oldFetch;
    if (previous === undefined)
      delete process.env.NEXT_PUBLIC_SUPERX_API_BASE_URL;
    else process.env.NEXT_PUBLIC_SUPERX_API_BASE_URL = previous;
  }
});
test("tablas diarias con totales y caja con métodos futuros, orden del ranking", () => {
  try {
    const daily = fixtureDaily(range);
    let view = render(<DailyTable data={daily} />);
    assert.ok(view.getByText("Totales"));
    assert.equal(view.container.querySelectorAll("tbody tr").length, 17);
    assert.equal(view.container.querySelectorAll("tfoot td").length, 11);
    const headers = [...view.container.querySelectorAll("thead th")].map((th) => th.textContent);
    assert.equal(headers[headers.indexOf("Descuentos") + 1], "Venta neta");
    assert.equal(view.container.querySelectorAll("tfoot td")[4].textContent, money(daily.totals.netSales));
    cleanup();
    const cash = fixtureCash(range);
    cash.methods.push("CARD");
    cash.totals.byMethod.CARD = "45.00";
    cash.rows[0].byMethod.CARD = "45.00";
    view = render(<CashTable data={cash} />);
    assert.ok(view.getByRole("columnheader", { name: "CARD" }));
    assert.ok(view.getByText("Totales"));
    assert.equal(
      view.container.querySelectorAll("tfoot th, tfoot td").length,
      9,
    );
    cleanup();
    const breakdown = fixtureBreakdown(range, "category");
    view = render(<BreakdownTable data={breakdown} />);
    assert.ok(view.getByRole("button", { name: "Venta neta" }));
    fireEvent.click(view.getByRole("button", { name: "Margen bruto" }));
    const ordered = [...view.container.querySelectorAll("tbody tr")].map(
      (tr) => tr.querySelector("td")?.textContent,
    );
    assert.equal(
      ordered[0],
      [...breakdown.rows].sort(
        (a, b) => Number(b.grossMargin) - Number(a.grossMargin),
      )[0].label,
    );
  } finally {
    cleanup();
  }
});
test("fixtures y CSV concilian ventas, caja y resultado con días vacíos", async () => {
  const data = fixtureDaily(range),
    cash = fixtureCash(range),
    summary = fixtureSummary(range);
  assert.equal(data.rows.length, 17);
  assert.ok(data.rows.some((r) => r.orders === 0));
  assert.equal(sumMoney(data.rows.map((r) => r.billed)), data.totals.billed);
  assert.equal(summary.kpis.collected, cash.totals.net);
  for (const row of [...data.rows, data.totals, summary.kpis, summary.previous]) {
    assert.equal(cents(row.netSales), cents(row.grossSales) - cents(row.discounts));
    assert.equal(cents(row.grossMargin), cents(row.netSales) - cents(row.cogs));
    assert.equal(row.grossMarginPct, Number(row.netSales)
      ? Number((cents(row.grossMargin) * BigInt(10000)) / cents(row.netSales)) / 100
      : null);
  }
  assert.equal(sumMoney(data.rows.map((r) => r.netSales)), data.totals.netSales);
  assert.equal(summary.deltaPct.netSales,
    ((Number(summary.kpis.netSales) - Number(summary.previous.netSales)) / Number(summary.previous.netSales)) * 100);
  for (const by of ["category", "product", "zone", "payment_method", "hour", "weekday"] as const) {
    const breakdown = fixtureBreakdown(range, by);
    assert.equal(sumMoney(breakdown.rows.map((r) => r.netSales)), breakdown.totals.netSales);
    for (const row of [...breakdown.rows, breakdown.totals]) {
      assert.equal(cents(row.grossMargin), cents(row.netSales) - cents(row.cogs));
    }
    for (const row of breakdown.rows) {
      assert.ok(Math.abs(row.share - (Number(row.netSales) / Number(breakdown.totals.netSales)) * 100) < 0.00001);
    }
    if (by !== "hour" && by !== "weekday") {
      assert.deepEqual(breakdown.rows.map((r) => r.netSales),
        [...breakdown.rows].sort((a, b) => Number(b.netSales) - Number(a.netSales)).map((r) => r.netSales));
    }
  }
  assert.equal(
    cents(summary.kpis.netResult),
    cents(summary.kpis.grossMargin) +
      cents(summary.kpis.deliveryFees) -
      cents(summary.kpis.refunds) -
      cents(summary.kpis.operatingExpenses),
  );
  assert.equal(
    sumMoney(summary.expensesByCategory.map((r) => r.amount)),
    summary.kpis.operatingExpenses,
  );
  assert.equal(fixtureBreakdown(range, "hour").rows.length, 24);
  assert.equal(fixtureBreakdown(range, "weekday").rows.length, 7);
  for (const endpoint of ["daily", "cash-daily"]) {
    const csv = await (
      await csvBlob(`/sales/${endpoint}.csv?from=${range.from}&to=${range.to}`)
    ).text();
    if (endpoint === "daily") {
      assert.match(csv, /Venta bruta;Descuentos;Venta neta;Envíos/);
      assert.ok(csv.includes(data.totals.netSales));
    }
    assert.match(csv, /Totales/);
    assert.match(csv, /;/);
  }
});

test("estado de resultados descuenta descuentos antes del CMV y conserva el detalle de gastos", () => {
  try {
    const data = fixtureSummary(range);
    const view = render(<IncomeStatement data={data} />);
    const rows = [...view.container.querySelectorAll(".sales-statement > div")];
    assert.deepEqual(rows.map((row) => row.querySelector("span")?.textContent?.split("Alquiler")[0]), [
      "Venta bruta", "− Descuentos", "= Venta neta", "− CMV", "= Margen bruto",
      "+ Envíos cobrados", "− Devoluciones", "− Gastos operativos", "= Resultado neto",
    ]);
    assert.equal(rows[2].querySelector("strong")?.textContent, money(data.kpis.netSales));
    assert.ok(view.container.querySelector("details summary")?.textContent?.includes("Gastos operativos"));
  } finally {
    cleanup();
  }
});
