import test from "node:test";
import assert from "node:assert/strict";
import { promotionPayload, promotionTiming, validatePromotion } from "../app/lib/promotion-rules.js";

const valid = { name: "Promo", discountType: "PERCENTAGE", discountValue: "15", minPurchaseAmount: "0", scope: "ALL", categoryId: "", productId: "", couponCode: " verano ", validFrom: "2026-01-01T00:00", validTo: "2026-02-01T00:00", active: true };
test("valida límites y alcance de promociones", () => {
  assert.deepEqual(validatePromotion(valid), {});
  assert.equal(validatePromotion({ ...valid, discountValue: 101 }).discountValue, "El porcentaje no puede superar 100.");
  assert.ok(validatePromotion({ ...valid, scope: "CATEGORY" }).categoryId);
  assert.ok(validatePromotion({ ...valid, validTo: valid.validFrom }).validTo);
});
test("normaliza el payload aceptado por el DTO", () => {
  const payload = promotionPayload(valid);
  assert.equal(payload.couponCode, "VERANO");
  assert.equal(payload.minPurchaseAmount, 0);
  assert.equal(payload.categoryId, null);
});
test("clasifica vigentes, próximas y vencidas", () => {
  const now = new Date("2026-01-15T00:00:00Z");
  assert.equal(promotionTiming({ validFrom: "2026-01-01", validTo: "2026-02-01" }, now), "current");
  assert.equal(promotionTiming({ validFrom: "2026-02-01", validTo: null }, now), "upcoming");
  assert.equal(promotionTiming({ validFrom: "2025-01-01", validTo: "2025-02-01" }, now), "expired");
});
