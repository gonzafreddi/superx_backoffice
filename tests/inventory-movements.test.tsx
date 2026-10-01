import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { InventoryRecentMovements } from "../app/components/inventory/inventory-detail-panel";
import type { InventoryMovement } from "../app/lib/inventory-contract";

test("movimientos de reserva muestran pedido y cantidades neutrales", () => {
  const base = { inventoryItemId: "1:2", reference: "PX000123", reason: "Nota distinta", occurredAt: "2026-10-01T10:00:00Z", createdBy: "Usuario #4" };
  const movements: InventoryMovement[] = [
    { ...base, id: "1", type: "reservation", quantity: -2 },
    { ...base, id: "2", type: "reservation_release", quantity: 2 },
  ];
  const html = renderToStaticMarkup(<InventoryRecentMovements movements={movements} />);
  assert.match(html, /Reserva \(pedido\)/);
  assert.match(html, /Reserva liberada/);
  assert.equal(html.match(/PX000123/g)?.length, 2);
  assert.match(html, /class="muted">−2 reservado/);
  assert.match(html, /class="muted">\+2 liberado/);
  assert.doesNotMatch(html, /class="(?:positive|negative)"/);
});
