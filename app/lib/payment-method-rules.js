export function canSetPaymentMethod(methods, method, enabled) {
  if (enabled) return { allowed: true };
  const target = methods.find((item) => item.method === method);
  if (!target?.enabled) return { allowed: true };
  if (methods.filter((item) => item.enabled).length <= 1) return { allowed: false, reason: "Debe quedar al menos un medio de pago activo." };
  return { allowed: true };
}

export const requiresEnableConfirmation = (method, enabled) => method === "MERCADO_PAGO" && enabled;

const onlyDigits = (value) => String(value ?? "").replace(/\D/g, "");

/** Normalizes the bank-transfer form and mirrors the backend validation. */
export function validateTransferDetails(form) {
  const alias = String(form.alias ?? "").trim();
  const cbu = onlyDigits(form.cbu);
  const holder = String(form.holder ?? "").trim();
  const bank = String(form.bank ?? "").trim();
  const cuit = onlyDigits(form.cuit);
  const receiptWhatsapp = onlyDigits(form.receiptWhatsapp);
  const errors = {};
  if (alias && !/^[A-Za-z0-9.-]{6,20}$/.test(alias)) errors.alias = "El alias tiene de 6 a 20 caracteres: letras, números, puntos o guiones.";
  if (cbu && cbu.length !== 22) errors.cbu = "El CBU/CVU tiene 22 dígitos.";
  if (cuit && cuit.length !== 11) errors.cuit = "El CUIT tiene 11 dígitos.";
  if (receiptWhatsapp && (receiptWhatsapp.length < 8 || receiptWhatsapp.length > 15)) errors.receiptWhatsapp = "Ingresá el número con código de país, por ejemplo 54 9 2364 123456.";
  if (!alias && !cbu) errors.alias = "Cargá al menos el alias o el CBU/CVU.";
  const details = Object.fromEntries(Object.entries({ alias, cbu, holder, bank, cuit, receiptWhatsapp }).filter(([, value]) => value !== ""));
  return { valid: Object.keys(errors).length === 0, errors, details };
}
