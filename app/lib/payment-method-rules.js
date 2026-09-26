export function canSetPaymentMethod(methods, method, enabled) {
  if (enabled) return { allowed: true };
  const target = methods.find((item) => item.method === method);
  if (!target?.enabled) return { allowed: true };
  if (methods.filter((item) => item.enabled).length <= 1) return { allowed: false, reason: "Debe quedar al menos un medio de pago activo." };
  return { allowed: true };
}

export const requiresEnableConfirmation = (method, enabled) => method === "MERCADO_PAGO" && enabled;
