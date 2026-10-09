import test from "node:test";
import assert from "node:assert/strict";
import { deliveryApi } from "../app/lib/delivery-api";
import { productApi } from "../app/lib/product-api";
import { pickingApi, PickingApiError } from "../app/lib/picking-api";
import { dispatchApi } from "../app/lib/dispatch-api";
import { inventoryApi } from "../app/lib/inventory-api";
import { locationApi } from "../app/lib/location-api";
import { receivingApi } from "../app/lib/receiving-api";
import { orderApi } from "../app/lib/order-api";
import { priceApi } from "../app/lib/price-api";
import { purchaseOrderApi } from "../app/lib/purchase-order-api";

type Handler = (path: string, init?: RequestInit) => unknown;
async function withBackend(handler: Handler, action: () => Promise<void>) {
  const previousFetch = globalThis.fetch, previousBase = process.env.NEXT_PUBLIC_SUPERX_API_BASE_URL;
  process.env.NEXT_PUBLIC_SUPERX_API_BASE_URL = "http://backend.test";
  globalThis.fetch = async (input, init) => new Response(JSON.stringify(handler(new URL(String(input)).pathname, init)), { status: 200 });
  try { await action(); } finally { globalThis.fetch = previousFetch; if (previousBase === undefined) delete process.env.NEXT_PUBLIC_SUPERX_API_BASE_URL; else process.env.NEXT_PUBLIC_SUPERX_API_BASE_URL = previousBase; }
}
const product = { id: "5", name: "Queso", slug: "queso", categoryId: "1", brandId: "1", unitId: "2", saleMode: "WEIGHT", weightMinGrams: 250, weightStepGrams: 250, isActive: true, updatedAt: "2026-10-09T12:00:00Z" };
test("delivery lee mínimo y alta/edición/vaciado serializan string monetario", async () => {
  const bodies: Record<string, unknown>[] = [];
  const zone = { id: "1", cityId: "1", name: "Centro", postalCodes: ["2741"], neighborhoods: [], deliveryFee: "200.00", freeDeliveryThreshold: "1000.00", minimumOrderAmount: "600.00", priority: 0, isActive: true };
  await withBackend((path, init) => { if (path === "/cities") return [{ id: "1", name: "Salto" }]; if (init?.body) { bodies.push(JSON.parse(String(init.body))); return zone; } return [zone]; }, async () => {
    const input = { name: "Centro", cityName: "Salto", postalCodes: ["2741"], neighborhoods: [], deliveryFee: 200, freeDeliveryThreshold: 1000, minimumOrderAmount: 600.50, priority: 0, active: true, changedBy: "Admin" };
    assert.equal((await deliveryApi.listZones())[0].minimumOrderAmount, 600);
    await deliveryApi.createZone(input); await deliveryApi.updateZone("1", input); await deliveryApi.updateZone("1", { ...input, minimumOrderAmount: "" });
    assert.deepEqual(bodies.map((body) => body.minimumOrderAmount), ["600.50", "600.50", "0.00"]);
  });
});
test("producto conserva configuración de peso en lecturas y escrituras", async () => {
  const bodies: Record<string, unknown>[] = [];
  await withBackend((path, init) => { if (path === "/units") return [{ id: "2", code: "KG", name: "Kilogramo" }]; if (init?.body) { bodies.push(JSON.parse(String(init.body))); return product; } return product; }, async () => {
    const input = { name: "Queso", description: "", categoryId: "1", brandId: "1", unit: "KG", barcode: "", imageUrl: "", active: true, saleMode: "WEIGHT" as const, weightMinGrams: 250, weightStepGrams: 250 };
    assert.equal((await productApi.getProduct("queso")).saleMode, "WEIGHT");
    await productApi.createProduct(input); await productApi.updateProduct("5", input); await productApi.updateProduct("5", { ...input, saleMode: "UNIT" });
    assert.deepEqual(bodies.map(({ saleMode, weightMinGrams, weightStepGrams }) => ({ saleMode, weightMinGrams, weightStepGrams })), [{ saleMode: "WEIGHT", weightMinGrams: 250, weightStepGrams: 250 }, { saleMode: "WEIGHT", weightMinGrams: 250, weightStepGrams: 250 }, { saleMode: "UNIT", weightMinGrams: null, weightStepGrams: null }]);
  });
});
test("endpoint de peso usa grams y conserva aviso de tolerancia 400", async () => {
  const previousFetch = globalThis.fetch, previousBase = process.env.NEXT_PUBLIC_SUPERX_API_BASE_URL;
  process.env.NEXT_PUBLIC_SUPERX_API_BASE_URL = "http://backend.test";
  let status = 201;
  globalThis.fetch = async (input, init) => { assert.equal(String(input), "http://backend.test/picking/tasks/1/items/3/weight"); assert.equal(init?.method, "POST"); assert.deepEqual(JSON.parse(String(init?.body)), { grams: 530 }); return new Response(JSON.stringify(status === 201 ? { id: "1", items: [] } : { message: "Peso fuera de tolerancia" }), { status }); };
  try { await pickingApi.recordWeight("1", "3", 530); status = 400; await assert.rejects(pickingApi.recordWeight("1", "3", 530), (error: unknown) => error instanceof PickingApiError && error.status === 400 && error.message.includes("15%")); }
  finally { globalThis.fetch = previousFetch; if (previousBase === undefined) delete process.env.NEXT_PUBLIC_SUPERX_API_BASE_URL; else process.env.NEXT_PUBLIC_SUPERX_API_BASE_URL = previousBase; }
});
test("reparto obtiene snapshots sin propagar dinero", async () => {
  await withBackend(() => ({ grandTotal: "730.00", balanceDue: "30.00", items: [{ productName: "Queso", quantity: 500, pickedQuantity: 530, saleMode: "WEIGHT", unitCode: "KG", unitPrice: "1000.00", lineTotal: "530.00" }] }), async () => {
    const items = await dispatchApi.getOrderItems("1");
    assert.deepEqual(items, [{ productName: "Queso", quantity: 500, pickedQuantity: 530, saleMode: "WEIGHT", unitCode: "KG", imageUrl: null }]);
    assert.doesNotMatch(JSON.stringify(items), /unitPrice|lineTotal|grandTotal|balanceDue/);
  });
});
test("inventario, ubicaciones y precios conservan saleMode", async () => {
  await withBackend((path) => {
    if (path === "/products") return { items: [product], total: 1 };
    if (path === "/inventory/stock") return [{ id: "7", productId: "5", warehouseId: "1", quantityOnHand: 1500, reserved: 250, available: 1250, reorderThreshold: 500, saleMode: "WEIGHT" }];
    if (path.includes("/locations/a/stock")) return { items: [{ product, quantity: 1500, reservedQuantity: 250, availableQuantity: 1250 }], total: 1, page: 1, pageSize: 20 };
    if (path === "/prices") return { items: [{ ...product, productId: "5", price: "1000.00", cost: "900.00", status: "active" }], total: 1, page: 1 };
    throw new Error(path);
  }, async () => {
    assert.equal((await inventoryApi.listInventory())[0].saleMode, "WEIGHT");
    assert.equal((await locationApi.getLocationStock("1", "a")).items[0].product.saleMode, "WEIGHT");
    assert.equal((await priceApi.listPrices())[0].saleMode, "WEIGHT");
  });
});
test("recepción completa modo omitido desde producto y compras conserva modo", async () => {
  await withBackend((path) => {
    if (path === "/receiving/1") return { lines: [{ purchaseOrderItemId: "2", product: { id: "5", name: "Queso", slug: "queso" }, unitsPerPack: 1250, pendingUnits: 2500 }] };
    if (path === "/products/queso") return product;
    if (path === "/units") return [];
    if (path === "/purchase-orders/1") return { id: "1", items: [{ id: "2", product, unitsPerPack: 1250, unitQuantity: 2500 }], events: [] };
    throw new Error(path);
  }, async () => {
    assert.equal((await receivingApi.detail("1")).lines[0].product.saleMode, "WEIGHT");
    assert.equal((await purchaseOrderApi.get("1")).items[0].product.saleMode, "WEIGHT");
  });
});
test("pedido conserva peso real, total final y saldo del backend", async () => {
  await withBackend((path) => path.endsWith("/events") ? [] : { id: "1", orderNumber: "PX1", status: "PICKING", itemsSubtotal: "530.00", deliveryFee: "200.00", discountTotal: "0.00", grandTotal: "730.00", balanceDue: "30.00", items: [{ id: "4", productName: "Queso", saleMode: "WEIGHT", quantity: 500, pickedQuantity: 530, unitPrice: "1000.00", lineTotal: "530.00" }] }, async () => {
    const order = await orderApi.getOrder("1");
    assert.equal(order.lines[0].saleMode, "WEIGHT"); assert.equal(order.lines[0].pickedQuantity, 530); assert.equal(order.lines[0].lineTotal, 530); assert.equal(order.balanceDue, 30); assert.equal(order.total, 730);
  });
});
