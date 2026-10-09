"use client";
import { useEffect, useState } from "react";
import { Notice } from "@/app/components/ui/notice";
import { getStoredUser } from "@/app/lib/auth-api";
import { can } from "@/app/lib/permissions";
import { fixturesEnabled } from "@/app/lib/api-mode";
import { businessSettingsApi } from "@/app/lib/business-settings-api";
import { settingsPayload, toSettingsForm, validateSettings, type SettingsForm, type SettingsErrors } from "@/app/lib/business-settings-rules";
import "./business-settings.css";

type Field = { key: keyof SettingsForm; label: string; type?: string; multiline?: boolean; hint?: string };
const sections: { title: string; fields: Field[] }[] = [
  { title: "Datos fiscales", fields: [
    { key: "legalName", label: "Razón social" }, { key: "tradeName", label: "Nombre comercial" },
    { key: "cuit", label: "CUIT", hint: "11 dígitos, sin guiones." }, { key: "ivaCondition", label: "Condición de IVA" },
    { key: "legalAddress", label: "Domicilio legal" }, { key: "legalTermsEffectiveDate", label: "Vigencia de términos legales", type: "date" },
  ] },
  { title: "Contacto y atención", fields: [
    { key: "serviceAddress", label: "Dirección de atención" }, { key: "serviceArea", label: "Zona de atención" },
    { key: "contactEmail", label: "Email de contacto", type: "email" }, { key: "contactPhone", label: "Teléfono", type: "tel" },
    { key: "whatsapp", label: "WhatsApp", type: "tel", hint: "Incluí el código de país y de área." },
    { key: "businessHours", label: "Horarios de atención", multiline: true },
  ] },
  { title: "Reglas de pedido", fields: [
    { key: "minOrderAmount", label: "Pedido mínimo ($)", type: "number", hint: "Sobre el subtotal de productos. 0 permite cualquier monto." },
    { key: "freeDeliveryThreshold", label: "Envío gratis desde ($)", type: "number", hint: "Dejá vacío para cobrar la tarifa de la zona. 0 ofrece envío gratis en todos los pedidos." },
  ] },
];
export function BusinessSettingsManager() {
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [form, setForm] = useState<SettingsForm | null>(null);
  const [initial, setInitial] = useState<SettingsForm | null>(null);
  const [errors, setErrors] = useState<SettingsErrors>({});
  const [updatedAt, setUpdatedAt] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [message, setMessage] = useState<{ kind: "error" | "success"; text: string } | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    void Promise.resolve().then(() => {
      if (controller.signal.aborted) return;
      const permitted = can(getStoredUser()?.role, "settings.manage");
      setAllowed(permitted);
      if (!permitted) { setLoading(false); return; }
      setLoading(true); setMessage(null);
      void businessSettingsApi.get(controller.signal).then((settings) => {
        if (controller.signal.aborted) return;
        const next = toSettingsForm(settingsPayloadFromResponse(settings));
        setForm(next); setInitial(next); setUpdatedAt(settings.updatedAt);
      }).catch((error) => { if (!controller.signal.aborted) setMessage({ kind: "error", text: error instanceof Error ? error.message : "No pudimos cargar la configuración." }); })
        .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    });
    return () => controller.abort();
  }, [attempt]);
  const dirty = form !== null && JSON.stringify(form) !== JSON.stringify(initial);
  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!form || saving || !can(getStoredUser()?.role, "settings.manage")) return;
    const nextErrors = validateSettings(form); setErrors(nextErrors); setMessage(null);
    if (Object.keys(nextErrors).length) {
      setMessage({ kind: "error", text: "Revisá los campos indicados antes de guardar." });
      document.getElementById(`settings-${Object.keys(nextErrors)[0]}`)?.focus(); return;
    }
    setSaving(true);
    try {
      const settings = await businessSettingsApi.update(settingsPayload(form));
      const next = toSettingsForm(settingsPayloadFromResponse(settings));
      setForm(next); setInitial(next); setUpdatedAt(settings.updatedAt);
      setMessage({ kind: "success", text: "Guardamos la configuración del negocio." });
    } catch (error) { setMessage({ kind: "error", text: error instanceof Error ? error.message : "No pudimos guardar la configuración." }); }
    finally { setSaving(false); }
  }
  return <main className="workspace business-settings-page">
    <header className="topbar"><div><span className="eyebrow">Administración</span><h1>Configuración del negocio</h1><p className="subtitle">Datos fiscales, atención al cliente y condiciones de compra.</p></div></header>
    {allowed === false ? <Notice kind="error" role="alert">No tenés permiso para configurar el negocio.</Notice> : <>
      {fixturesEnabled() && <Notice kind="info">Modo de demostración: los cambios se guardan temporalmente en esta sesión.</Notice>}
      {message && <Notice kind={message.kind} role={message.kind === "error" ? "alert" : "status"}>{message.text}</Notice>}
      {loading ? <p role="status">Cargando configuración…</p> : !form ? <button className="button secondary" onClick={() => setAttempt((n) => n + 1)}>Reintentar</button> :
        <form noValidate onSubmit={save} aria-busy={saving}>
          {sections.map((section) => <fieldset key={section.title} disabled={saving} className="settings-section"><legend>{section.title}</legend><div className="form-grid">
            {section.fields.map(({ key, label, type = "text", multiline, hint }) => {
              const props = { id: `settings-${key}`, value: form[key], "aria-invalid": Boolean(errors[key]), "aria-describedby": errors[key] || hint ? `settings-help-${key}` : undefined,
                onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => { setForm({ ...form, [key]: event.target.value }); setErrors((old) => ({ ...old, [key]: undefined })); setMessage(null); },
                onBlur: () => setErrors((old) => ({ ...old, [key]: validateSettings(form)[key] })),
              };
              return <label className="field" key={key} htmlFor={props.id}><span>{label}</span>
                {key === "ivaCondition" ? <select {...props}><option value="RESPONSABLE_INSCRIPTO">Responsable inscripto</option><option value="MONOTRIBUTO">Monotributo</option><option value="EXENTO">Exento</option></select> : multiline ? <textarea {...props} rows={3} /> : <input {...props} type={type} min={type === "number" ? 0 : undefined} step={type === "number" ? "0.01" : undefined} inputMode={key === "cuit" ? "numeric" : type === "number" ? "decimal" : undefined} />}
                {(errors[key] || hint) && <span id={`settings-help-${key}`} className={errors[key] ? "settings-error" : "settings-hint"}>{errors[key] || hint}</span>}
              </label>;
            })}
          </div></fieldset>)}
          <footer className="settings-footer"><div><p>Última actualización: <time dateTime={updatedAt}>{new Date(updatedAt).toLocaleString("es-AR")}</time></p>{dirty && <span>Hay cambios sin guardar.</span>}</div><div className="detail-actions"><button type="button" className="button secondary" disabled={saving || !dirty} onClick={() => { setForm(initial); setErrors({}); setMessage(null); }}>Descartar cambios</button><button className="button primary" disabled={saving || !dirty}>{saving ? "Guardando…" : "Guardar configuración"}</button></div></footer>
        </form>}
    </>}
  </main>;
}
// Only editable contract fields enter the form/PATCH; metadata stays read-only.
function settingsPayloadFromResponse(settings: import("@/app/lib/business-settings-api").BusinessSettings) {
  return {
    legalName: settings.legalName ?? "", tradeName: settings.tradeName ?? "", cuit: settings.cuit ?? "",
    ivaCondition: settings.ivaCondition, legalAddress: settings.legalAddress ?? "",
    serviceAddress: settings.serviceAddress ?? "", serviceArea: settings.serviceArea ?? "",
    contactEmail: settings.contactEmail ?? "", contactPhone: settings.contactPhone ?? "",
    whatsapp: settings.whatsapp ?? "", businessHours: settings.businessHours ?? "",
    legalTermsEffectiveDate: settings.legalTermsEffectiveDate,
    minOrderAmount: settings.minOrderAmount, freeDeliveryThreshold: settings.freeDeliveryThreshold,
  };
}
