import test from "node:test";
import assert from "node:assert/strict";
import { describeDataCoverage, getMetricsVisibility, presetRange, rangeDays, validateRange } from "../app/lib/metrics-rules.js";

test("los KPIs financieros se ocultan al rol de consulta", () => {
  assert.equal(getMetricsVisibility("viewer").financial, false);
  assert.equal(getMetricsVisibility("operator").financial, true);
  assert.equal(getMetricsVisibility("admin").financial, true);
});

test("validateRange rechaza fechas inválidas, invertidas, futuras y rangos largos", () => {
  const today = "2026-09-10";
  assert.deepEqual(validateRange({ from: "2026-09-01", to: "2026-09-10" }, { today }), {});
  assert.ok(validateRange({ from: "", to: "2026-09-10" }, { today }).from);
  assert.ok(validateRange({ from: "2026-09-10", to: "2026-09-01" }, { today }).to);
  assert.ok(validateRange({ from: "2026-09-01", to: "2026-09-20" }, { today }).to);
  assert.ok(validateRange({ from: "2026-01-01", to: "2026-09-10" }, { today }).from);
});

test("presetRange arma rangos que terminan hoy", () => {
  const today = "2026-09-10";
  assert.deepEqual(presetRange("today", { today }), { from: "2026-09-10", to: "2026-09-10" });
  assert.deepEqual(presetRange("7d", { today }), { from: "2026-09-04", to: "2026-09-10" });
  assert.deepEqual(presetRange("30d", { today }), { from: "2026-08-12", to: "2026-09-10" });
});

test("rangeDays cuenta días inclusive y 0 si el rango es inválido", () => {
  assert.equal(rangeDays({ from: "2026-09-04", to: "2026-09-10" }), 7);
  assert.equal(rangeDays({ from: "2026-09-10", to: "2026-09-01" }), 0);
});

test("describeDataCoverage marca métricas pendientes de histórico", () => {
  assert.deepEqual(describeDataCoverage(null).hasData, false);
  const partial = describeDataCoverage({ orderCount: 12, fillRate: null, operationalTimes: null });
  assert.equal(partial.hasData, true);
  assert.deepEqual(partial.pending.sort(), ["fillRate", "operationalTimes"]);
  assert.deepEqual(describeDataCoverage({ orderCount: 0, fillRate: 0.9, operationalTimes: { pickingMinutes: 1, deliveryMinutes: 1 } }), { hasData: false, pending: ["orders"] });
});
