"use client";

import { useEffect, useState } from "react";
import { Notice } from "@/app/components/ui/notice";
import { StatusBadge } from "@/app/components/ui/status-badge";
import { paymentMethodApi, type PaymentMethod, type PaymentMethodSetting } from "@/app/lib/payment-method-api";
import { canSetPaymentMethod, requiresEnableConfirmation } from "@/app/lib/payment-method-rules.js";

const labels: Record<PaymentMethod, { name: string; detail: string }> = {
  CASH: { name: "Efectivo", detail: "Cobro en efectivo al entregar o retirar." },
  BANK_TRANSFER: { name: "Transferencia", detail: "Transferencia bancaria con validación manual." },
  MERCADO_PAGO: { name: "Mercado Pago", detail: "Opción visible en la tienda; gestión manual del cobro." },
};

export function PaymentMethodManager() {
  const [methods, setMethods] = useState<PaymentMethodSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState<PaymentMethod | null>(null);
  const [message, setMessage] = useState<{ kind: "error" | "success"; text: string } | null>(null);
  useEffect(() => { void paymentMethodApi.list().then(setMethods).catch(() => setMessage({ kind: "error", text: "No pudimos cargar los medios de pago." })).finally(() => setLoading(false)); }, []);
  const change = async (method: PaymentMethod, enabled: boolean) => {
    const check = canSetPaymentMethod(methods, method, enabled);
    if (!check.allowed) { setMessage({ kind: "error", text: check.reason ?? "Ese cambio no está permitido." }); return; }
    if (requiresEnableConfirmation(method, enabled) && !window.confirm("Mercado Pago todavía no está integrado. Si lo activás, el cobro se gestionará manualmente. ¿Querés activarlo?")) return;
    setPending(method); setMessage(null);
    try { const updated = await paymentMethodApi.setEnabled(method, enabled); setMethods((items) => items.map((item) => item.method === method ? updated : item)); setMessage({ kind: "success", text: `${labels[method].name} quedó ${enabled ? "activo" : "inactivo"}.` }); }
    catch (cause) { setMessage({ kind: "error", text: cause instanceof Error ? cause.message : "No pudimos guardar el cambio." }); }
    finally { setPending(null); }
  };
  return <main className="workspace payment-methods-page">
    <header className="topbar"><div><span className="eyebrow">Administración</span><h1>Medios de pago</h1><p>Definí qué alternativas pueden elegir los clientes al finalizar una compra.</p></div></header>
    <Notice kind="info">Debe quedar al menos un medio de pago activo en todo momento.</Notice>
    {message && <Notice kind={message.kind} role={message.kind === "error" ? "alert" : "status"} onDismiss={() => setMessage(null)} dismissLabel="Cerrar aviso">{message.text}</Notice>}
    <section className="payment-method-list" aria-busy={loading}>
      {loading ? <p>Cargando medios de pago…</p> : methods.map((item) => <article className="payment-method-card" key={item.method}>
        <div><div className="payment-method-title"><h2>{labels[item.method].name}</h2><StatusBadge tone={item.enabled ? "success" : "neutral"} label={item.enabled ? "Activo" : "Inactivo"} /></div><p>{labels[item.method].detail}</p></div>
        <label className="switch-control"><span className="sr-only">{item.enabled ? "Desactivar" : "Activar"} {labels[item.method].name}</span><input type="checkbox" checked={item.enabled} disabled={pending !== null} onChange={(event) => void change(item.method, event.target.checked)} /><span aria-hidden="true" /></label>
        {item.method === "MERCADO_PAGO" && <Notice kind="info">La integración con Mercado Pago todavía no está disponible: si lo activás, los clientes podrán elegirlo pero el cobro se gestiona manualmente.</Notice>}
      </article>)}
    </section>
  </main>;
}
