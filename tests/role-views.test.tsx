import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { orderApi } from "../app/lib/order-api";
import { storeSession } from "../app/lib/auth-api";

import { render, cleanup, waitFor } from "./picking-test-utils";
import { OrderDetailWorkspace } from "../app/components/orders/order-detail-workspace";
import { PricesPageHeader, PricesFiltersBar } from "../app/components/prices/price-workspace";

test("order detail separates support logistics from accountant payment and refund controls", async () => {
  const previousBase = process.env.NEXT_PUBLIC_SUPERX_API_BASE_URL, previousFetch = globalThis.fetch, previousGet = orderApi.getOrder;
  delete process.env.NEXT_PUBLIC_SUPERX_API_BASE_URL;
  const fixture = (await orderApi.listOrders())[0];
  const order = { ...fixture, status: "CREATED" as const, payment: { ...fixture.payment, status: "PENDING" as const }, refund: { paid: 100, refunded: 0, due: 100 } };
  process.env.NEXT_PUBLIC_SUPERX_API_BASE_URL = "http://backend.test";
  orderApi.getOrder = async () => order;
  const requests: string[] = [];
  globalThis.fetch = async url => { requests.push(String(url)); return new Response(JSON.stringify(String(url).includes("/assignment") ? { active: null, history: [] } : [])); };
  try {
    for (const role of ["support", "accountant", "admin"]) {
      requests.length = 0;
      storeSession("token", { id: "1", email: "staff@test", role, name: "Staff" });
      const view = render(<OrderDetailWorkspace id={order.id} />);
      await waitFor(() => assert.ok(view.queryByText(`Pedido ${order.code}`)));
      const cancel = view.queryByRole("button", { name: "Cancelar pedido" }) as HTMLButtonElement | null;
      assert.equal(Boolean(cancel && !cancel.disabled), role !== "accountant", `${role} transition`);
      assert.equal(Boolean(view.queryByRole("button", { name: "Acreditar pago" })), role !== "support", `${role} payment`);
      assert.equal(Boolean(view.queryByRole("button", { name: "Registrar reintegro" })), role !== "support", `${role} refund`);
      if (role === "accountant") {
        assert.equal(view.queryByRole("heading", { name: "Reparto" }), null);
        assert.equal(requests.length, 0, "accountant must not query assignment/driver endpoints");
      } else {
        await waitFor(() => assert.ok(view.queryByText("Sin repartidor asignado.")));
        assert.ok(requests.some(url => url.includes("/assignment")));
      }
      cleanup();
    }
  } finally {
    cleanup(); orderApi.getOrder = previousGet; globalThis.fetch = previousFetch; window.sessionStorage.clear();
    if (previousBase === undefined) delete process.env.NEXT_PUBLIC_SUPERX_API_BASE_URL; else process.env.NEXT_PUBLIC_SUPERX_API_BASE_URL = previousBase;
  }
});
test("support and accountant price views omit rule mutation buttons", () => {
  const previousBase = process.env.NEXT_PUBLIC_SUPERX_API_BASE_URL;
  process.env.NEXT_PUBLIC_SUPERX_API_BASE_URL = "http://backend.test";
  try {
    for (const role of ["support", "accountant"]) {
      storeSession("token", { id: "1", email: "staff@test", role });
      const header = render(<PricesPageHeader role="viewer" onRefresh={() => { throw new Error("read-only"); }} busy={false} />);
      assert.equal(header.queryByRole("button", { name: "Actualizar precios" }), null);
      cleanup();
      const filters = render(<PricesFiltersBar filters={{ page: 1, pageSize: 25 }} setFilters={() => {}} categories={[]} brands={[]} onRules={() => { throw new Error("read-only"); }} />);
      assert.equal(filters.queryByRole("button", { name: "Aplicar reglas" }), null);
      cleanup();
    }
  } finally { cleanup(); window.sessionStorage.clear(); if (previousBase === undefined) delete process.env.NEXT_PUBLIC_SUPERX_API_BASE_URL; else process.env.NEXT_PUBLIC_SUPERX_API_BASE_URL = previousBase; }
});
