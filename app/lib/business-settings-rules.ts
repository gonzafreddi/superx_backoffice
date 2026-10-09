export const ivaConditions = ["RESPONSABLE_INSCRIPTO", "MONOTRIBUTO", "EXENTO"] as const;
export type SettingsInput = {
  legalName: string; tradeName: string; cuit: string; ivaCondition: typeof ivaConditions[number];
  legalAddress: string; serviceAddress: string; serviceArea: string; contactEmail: string;
  contactPhone: string; whatsapp: string; businessHours: string; legalTermsEffectiveDate: string | null;
  minOrderAmount: number; freeDeliveryThreshold: number | null;
};
export type SettingsForm = { [K in keyof SettingsInput]: string };
export type SettingsErrors = Partial<Record<keyof SettingsInput, string>>;
export function validCuit(value: string): boolean {
  if (!/^\d{11}$/.test(value)) return false;
  const weights = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
  const remainder = 11 - weights.reduce((sum, weight, i) => sum + Number(value[i]) * weight, 0) % 11;
  const digit = remainder === 11 ? 0 : remainder === 10 ? 9 : remainder;
  return digit === Number(value[10]) && !/^0+$/.test(value);
}
export function toSettingsForm(input: SettingsInput): SettingsForm {
  return Object.fromEntries(Object.entries(input).map(([key, value]) => [key, value == null ? "" : String(value)])) as SettingsForm;
}
export function validateSettings(form: SettingsForm): SettingsErrors {
  const errors: SettingsErrors = {};
  if (!validCuit(form.cuit.trim())) errors.cuit = "Ingresá 11 dígitos y un dígito verificador válido.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.contactEmail.trim())) errors.contactEmail = "Ingresá un email válido.";
  if (!(ivaConditions as readonly string[]).includes(form.ivaCondition)) errors.ivaCondition = "Elegí una condición de IVA válida.";
  for (const key of ["minOrderAmount", "freeDeliveryThreshold"] as const) {
    const value = form[key].trim();
    if (key === "freeDeliveryThreshold" && value === "") continue;
    if (!/^\d+(?:\.\d{1,2})?$/.test(value) || !Number.isFinite(Number(value)) || Number(value) > 9999999999.99) errors[key] = "Ingresá un monto mayor o igual a 0, con hasta 2 decimales.";
  }
  if (form.legalTermsEffectiveDate && (!/^\d{4}-\d{2}-\d{2}$/.test(form.legalTermsEffectiveDate) || Number.isNaN(Date.parse(form.legalTermsEffectiveDate)) || new Date(form.legalTermsEffectiveDate).toISOString().slice(0, 10) !== form.legalTermsEffectiveDate)) errors.legalTermsEffectiveDate = "Ingresá una fecha válida.";
  return errors;
}
export function settingsPayload(form: SettingsForm): SettingsInput {
  if (Object.keys(validateSettings(form)).length) throw new Error("Revisá los campos indicados.");
  const trimmed = Object.fromEntries(Object.entries(form).map(([key, value]) => [key, value.trim()]));
  return { ...trimmed, minOrderAmount: Number(form.minOrderAmount), freeDeliveryThreshold: form.freeDeliveryThreshold.trim() === "" ? null : Number(form.freeDeliveryThreshold), legalTermsEffectiveDate: form.legalTermsEffectiveDate || null } as SettingsInput;
}
