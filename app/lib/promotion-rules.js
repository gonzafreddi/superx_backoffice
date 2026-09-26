export const PROMOTION_TYPES = ["PERCENTAGE", "FIXED_AMOUNT"];
export const PROMOTION_SCOPES = ["ALL", "CATEGORY", "PRODUCT"];

const hasValue = (value) => value !== "" && value !== null && value !== undefined;
const validDate = (value) => hasValue(value) && !Number.isNaN(new Date(value).getTime());

export function validatePromotion(input) {
  const errors = {};
  const name = String(input.name ?? "").trim();
  const couponCode = String(input.couponCode ?? "").trim();
  const value = Number(input.discountValue);
  const minimum = hasValue(input.minPurchaseAmount) ? Number(input.minPurchaseAmount) : null;

  if (!name) errors.name = "Ingresá un nombre.";
  else if (name.length > 120) errors.name = "Usá hasta 120 caracteres.";
  if (!PROMOTION_TYPES.includes(input.discountType)) errors.discountType = "Elegí un tipo de descuento.";
  if (!Number.isFinite(value) || value <= 0) errors.discountValue = "Ingresá un valor mayor a 0.";
  else if (input.discountType === "PERCENTAGE" && value > 100) errors.discountValue = "El porcentaje no puede superar 100.";
  if (minimum !== null && (!Number.isFinite(minimum) || minimum < 0)) errors.minPurchaseAmount = "El mínimo debe ser 0 o mayor.";
  if (!PROMOTION_SCOPES.includes(input.scope)) errors.scope = "Elegí un alcance.";
  if (input.scope === "CATEGORY" && !hasValue(input.categoryId)) errors.categoryId = "Elegí una categoría.";
  if (input.scope === "PRODUCT" && !hasValue(input.productId)) errors.productId = "Elegí un producto.";
  if (hasValue(input.categoryId) && hasValue(input.productId)) errors.scope = "Elegí categoría o producto, no ambos.";
  if (couponCode.length > 40) errors.couponCode = "Usá hasta 40 caracteres.";
  if (!validDate(input.validFrom)) errors.validFrom = "Ingresá una fecha de inicio válida.";
  if (hasValue(input.validTo) && !validDate(input.validTo)) errors.validTo = "Ingresá una fecha de fin válida.";
  else if (validDate(input.validFrom) && validDate(input.validTo) && new Date(input.validTo) <= new Date(input.validFrom)) errors.validTo = "La fecha de fin debe ser posterior al inicio.";
  return errors;
}

export function promotionPayload(input) {
  const reference = (value) => {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : value;
  };
  return {
    name: String(input.name).trim(),
    discountType: input.discountType,
    discountValue: Number(input.discountValue),
    minPurchaseAmount: hasValue(input.minPurchaseAmount) ? Number(input.minPurchaseAmount) : null,
    categoryId: input.scope === "CATEGORY" ? reference(input.categoryId) : null,
    productId: input.scope === "PRODUCT" ? reference(input.productId) : null,
    couponCode: String(input.couponCode ?? "").trim().toUpperCase() || null,
    validFrom: new Date(input.validFrom).toISOString(),
    validTo: hasValue(input.validTo) ? new Date(input.validTo).toISOString() : null,
    active: Boolean(input.active),
  };
}

export function promotionTiming(promotion, now = new Date()) {
  if (new Date(promotion.validFrom) > now) return "upcoming";
  if (promotion.validTo && new Date(promotion.validTo) < now) return "expired";
  return "current";
}
