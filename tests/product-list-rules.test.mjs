import test from "node:test";
import assert from "node:assert/strict";
import { relativeProductDate, stockLevel } from "../app/lib/product-list-rules.js";

test("clasifica el stock para el listado", () => { assert.equal(stockLevel(0), "out"); assert.equal(stockLevel(8), "low"); assert.equal(stockLevel(11), "ok"); assert.equal(stockLevel(undefined), "unknown"); });
test("formatea fechas recientes", () => { const now = new Date("2026-09-23T12:00:00Z"); assert.equal(relativeProductDate("2026-09-23T08:00:00Z", now), "Hoy"); assert.equal(relativeProductDate("2026-09-22T12:00:00Z", now), "Ayer"); assert.equal(relativeProductDate("2026-09-20T12:00:00Z", now), "Hace 3 días"); });
