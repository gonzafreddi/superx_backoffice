"use client";
/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable @next/next/no-img-element -- live preview of an arbitrary admin-typed image URL */
import { useCallback, useEffect, useState } from "react";
import { Notice } from "@/app/components/ui/notice";
import { StatusBadge } from "@/app/components/ui/status-badge";
import { TablePagination } from "@/app/components/ui/table-pagination";
import { type AudienceSize, type CampaignAudience, type CampaignStatus, campaignApi, type PushCampaign } from "@/app/lib/push-api";

const STATUS: Record<CampaignStatus, { label: string; tone: "success" | "warning" | "danger" | "neutral" | "info" }> = { DRAFT: { label: "Borrador", tone: "neutral" }, SCHEDULED: { label: "Programada", tone: "info" }, SENDING: { label: "Enviando", tone: "warning" }, SENT: { label: "Enviada", tone: "success" }, CANCELLED: { label: "Cancelada", tone: "neutral" }, FAILED: { label: "Falló", tone: "danger" } };
const AUDIENCES: Record<CampaignAudience, { label: string; hint: string }> = { all_marketing: { label: "Clientes que aceptaron ofertas", hint: "Solo quienes activaron “Ofertas y novedades”." }, all_customers: { label: "Todos los clientes con notificaciones", hint: "Cualquiera que activó las notificaciones en su celular, salvo quien apagó pedidos y ofertas." } };
const DESTINATIONS: Array<[string, string]> = [["/products?onSale=true", "Ofertas"], ["/", "Portada"], ["/products", "Catálogo"], ["/categorias", "Categorías"], ["custom", "Otra página…"]];
const dateTime = new Intl.DateTimeFormat("es-AR", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Argentina/Buenos_Aires" });
type When = "draft" | "schedule" | "now";
type Form = { title: string; body: string; audience: CampaignAudience; destination: string; customUrl: string; imageUrl: string; when: When; scheduledAt: string };
const emptyForm: Form = { title: "", body: "", audience: "all_marketing", destination: "/products?onSale=true", customUrl: "", imageUrl: "", when: "draft", scheduledAt: "" };
const toLocalInput = (iso: string) => { const date = new Date(iso); return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16); };
const PAGE_SIZE = 20;

export function CampaignManager() {
  const [items, setItems] = useState<PushCampaign[]>([]), [total, setTotal] = useState(0), [page, setPage] = useState(1), [status, setStatus] = useState<CampaignStatus | "">(""), [sizes, setSizes] = useState<Record<CampaignAudience, AudienceSize> | null>(null);
  const [loading, setLoading] = useState(true), [busy, setBusy] = useState(""), [error, setError] = useState(""), [success, setSuccess] = useState("");
  const [editing, setEditing] = useState<PushCampaign | null | undefined>(undefined), [form, setForm] = useState<Form>(emptyForm), [formError, setFormError] = useState(""), [resending, setResending] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { const [list, marketing, everyone] = await Promise.all([campaignApi.list(status, page), campaignApi.audience("all_marketing"), campaignApi.audience("all_customers")]); setItems(list.items); setTotal(list.total); setSizes({ all_marketing: marketing, all_customers: everyone }); setError(""); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "No pudimos cargar las campañas."); }
    finally { setLoading(false); }
  }, [status, page]);
  useEffect(() => { void load(); }, [load]);
  // Refresh while something is being sent so stats show up without reloading.
  useEffect(() => { if (!items.some((item) => item.status === "SENDING" || (item.status === "SCHEDULED" && item.scheduledAt && new Date(item.scheduledAt).getTime() < Date.now() + 60_000))) return; const timer = setInterval(() => void load(), 5000); return () => clearInterval(timer); }, [items, load]);

  /** With `resend`, the item is only a template: saving creates a new campaign so each send keeps its own stats. */
  const open = (item?: PushCampaign, resend = false) => {
    setFormError(""); setEditing(resend ? null : item ?? null); setResending(resend);
    const preset = item ? DESTINATIONS.find(([value]) => value === item.url)?.[0] : undefined;
    setForm(item ? { title: item.title, body: item.body, audience: item.audience ?? "all_marketing", destination: preset ?? "custom", customUrl: preset ? "" : item.url, imageUrl: item.imageUrl ?? "", when: resend ? "now" : item.status === "SCHEDULED" ? "schedule" : "draft", scheduledAt: !resend && item.scheduledAt ? toLocalInput(item.scheduledAt) : "" } : emptyForm);
  };
  const set = <K extends keyof Form>(key: K, value: Form[K]) => { setForm((current) => ({ ...current, [key]: value })); setFormError(""); };
  const url = form.destination === "custom" ? form.customUrl.trim() : form.destination;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.title.trim() || !form.body.trim()) { setFormError("Completá el título y el mensaje."); return; }
    if (!url.startsWith("/") || url.startsWith("//")) { setFormError("El destino tiene que ser una página de la tienda que empiece con /, por ejemplo /products?onSale=true."); return; }
    if (form.imageUrl && !/^https:\/\//.test(form.imageUrl.trim())) { setFormError("La imagen tiene que ser una dirección https://."); return; }
    if (form.when === "schedule" && (!form.scheduledAt || new Date(form.scheduledAt).getTime() < Date.now())) { setFormError("Elegí una fecha y hora futura."); return; }
    const reach = sizes?.[form.audience].users ?? 0;
    if (form.when === "now" && !window.confirm(`¿Enviar ahora a ${reach} ${reach === 1 ? "cliente" : "clientes"} (${AUDIENCES[form.audience].label.toLowerCase()})? No se puede deshacer.`)) return;
    setBusy("form");
    try {
      const input = { title: form.title.trim(), body: form.body.trim(), url, imageUrl: form.imageUrl.trim() || null, audience: form.audience };
      let saved = editing ? await campaignApi.update(editing.id, input) : await campaignApi.create(input);
      if (form.when === "schedule") saved = await campaignApi.schedule(saved.id, new Date(form.scheduledAt).toISOString());
      if (form.when === "now") saved = await campaignApi.sendNow(saved.id);
      setEditing(undefined); setSuccess(form.when === "now" ? "Enviando la campaña…" : form.when === "schedule" ? `Programada para el ${dateTime.format(new Date(saved.scheduledAt!))}` : "Borrador guardado."); await load();
    } catch (cause) { setFormError(cause instanceof Error ? cause.message : "No pudimos guardar la campaña."); }
    finally { setBusy(""); }
  };
  const act = async (item: PushCampaign, action: "test" | "send" | "cancel") => {
    if (action === "send" && !window.confirm(`¿Enviar "${item.title}" ahora a ${sizes?.[item.audience ?? "all_marketing"].users ?? 0} clientes?`)) return;
    if (action === "cancel" && !window.confirm(`¿Cancelar "${item.title}"?`)) return;
    setBusy(`${action}-${item.id}`); setError(""); setSuccess("");
    try {
      if (action === "test") { const result = await campaignApi.test(item.id); setSuccess(`Prueba enviada a ${result.sent} de tus dispositivos.`); }
      if (action === "send") { await campaignApi.sendNow(item.id); setSuccess("Enviando la campaña…"); }
      if (action === "cancel") { await campaignApi.cancel(item.id); setSuccess("Campaña cancelada."); }
      await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "No pudimos completar la acción."); }
    finally { setBusy(""); }
  };

  return <section className="workspace push-campaigns-page">
    <header className="topbar"><div><p className="eyebrow">ADMINISTRACIÓN</p><h1>Notificaciones push</h1><p className="subtitle">Programá avisos de ofertas y novedades para los clientes que aceptaron recibirlos.</p></div><div className="top-actions"><button className="button primary" type="button" onClick={() => open()}>Nueva campaña</button></div></header>
    {sizes && <div className="push-audience"><div><strong>{sizes.all_customers.users}</strong><span>{sizes.all_customers.users === 1 ? "cliente" : "clientes"} con notificaciones ({sizes.all_customers.devices} {sizes.all_customers.devices === 1 ? "dispositivo" : "dispositivos"})</span></div><div><strong>{sizes.all_marketing.users}</strong><span>{sizes.all_marketing.users === 1 ? "aceptó" : "aceptaron"} recibir ofertas</span></div></div>}
    {sizes && !sizes.all_customers.enabled && <Notice kind="info">{sizes.all_customers.warning}</Notice>}
    {error && <Notice kind="error" role="alert" onDismiss={() => setError("")}>{error}</Notice>}{success && <Notice kind="success" onDismiss={() => setSuccess("")} dismissLabel="Cerrar aviso">{success}</Notice>}
    <section className="location-table-panel">
      <header><div><p className="eyebrow">CAMPAÑAS</p><h2>{total} {total === 1 ? "campaña" : "campañas"}</h2></div><label className="field"><span>Estado</span><select value={status} onChange={(event) => { setStatus(event.target.value as CampaignStatus | ""); setPage(1); }}><option value="">Todas</option>{(Object.keys(STATUS) as CampaignStatus[]).map((value) => <option key={value} value={value}>{STATUS[value].label}</option>)}</select></label></header>
      {loading && !items.length ? <div className="state">Cargando campañas…</div> : !items.length ? <div className="state">{status ? "No hay campañas con ese estado." : "Todavía no creaste campañas. Empezá con “Nueva campaña”."}</div> : <div className="location-table-wrap"><table className="location-stock-table"><thead><tr><th>Campaña</th><th>Estado</th><th>Cuándo</th><th>Resultados</th><th><span className="sr-only">Acciones</span></th></tr></thead><tbody>{items.map((item) => { const editable = item.status === "DRAFT" || item.status === "SCHEDULED"; return <tr key={item.id}>
        <td data-label="Campaña"><strong>{item.title}</strong><small>{item.body}</small><small className="push-audience-tag">Para: {AUDIENCES[item.audience ?? "all_marketing"].label.toLowerCase()}</small></td>
        <td data-label="Estado"><StatusBadge tone={STATUS[item.status].tone} label={STATUS[item.status].label} />{item.lastError && <small className="field-error">{item.lastError}</small>}</td>
        <td data-label="Cuándo">{item.sentAt ? `Enviada ${dateTime.format(new Date(item.sentAt))}` : item.scheduledAt && item.status === "SCHEDULED" ? dateTime.format(new Date(item.scheduledAt)) : "—"}</td>
        <td data-label="Resultados">{item.status === "SENT" || item.status === "SENDING" ? <span>{item.sent} enviadas · {item.clicked} clics{item.sent ? ` (${Math.round((item.clicked / item.sent) * 100)}%)` : ""}{item.failed ? ` · ${item.failed} fallidas` : ""}</span> : "—"}</td>
        <td data-label="Acciones"><div className="table-actions">{editable && <button className="button ghost" type="button" onClick={() => open(item)}>Editar</button>}<button className="button ghost" type="button" disabled={Boolean(busy)} onClick={() => void act(item, "test")}>Probar en mi dispositivo</button>{editable && <button className="button secondary" type="button" disabled={Boolean(busy)} onClick={() => void act(item, "send")}>Enviar ahora</button>}{editable && <button className="danger-text" type="button" disabled={Boolean(busy)} onClick={() => void act(item, "cancel")}>Cancelar</button>}{(item.status === "SENT" || item.status === "FAILED" || item.status === "CANCELLED") && <button className="button secondary" type="button" disabled={Boolean(busy)} onClick={() => open(item, true)}>Volver a enviar</button>}</div></td>
      </tr>; })}</tbody></table></div>}
      <TablePagination page={page} pageSize={PAGE_SIZE} total={total} label={`${total} campañas`} onPrev={() => setPage((value) => value - 1)} onNext={() => setPage((value) => value + 1)} buttonClassName="button ghost" loading={loading} />
    </section>
    {editing !== undefined && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setEditing(undefined); }}><section className="modal push-campaign-modal" role="dialog" aria-modal="true" aria-labelledby="campaign-title"><header><div><span className="eyebrow">{editing ? "Editar" : resending ? "Volver a enviar" : "Nueva"}</span><h2 id="campaign-title">{editing ? editing.title : resending ? form.title || "Nueva campaña" : "Nueva campaña"}</h2></div><button className="icon-button" type="button" aria-label="Cerrar" onClick={() => setEditing(undefined)}>×</button></header><form onSubmit={submit} noValidate>
      {formError && <Notice kind="error" role="alert">{formError}</Notice>}
      <div className="push-campaign-editor"><div className="form-grid">
        <label className="field field-wide"><span>Título <small>{form.title.length}/60</small></span><input value={form.title} maxLength={60} onChange={(event) => set("title", event.target.value)} placeholder="🔥 Ofertas de fin de semana" /></label>
        <label className="field field-wide"><span>Mensaje <small>{form.body.length}/160</small></span><textarea value={form.body} maxLength={160} rows={3} onChange={(event) => set("body", event.target.value)} placeholder="Hasta 30% en almacén y bebidas. Solo sábado y domingo." /></label>
        <label className="field field-wide"><span>Destinatarios</span><select value={form.audience} onChange={(event) => set("audience", event.target.value as CampaignAudience)}>{(Object.keys(AUDIENCES) as CampaignAudience[]).map((value) => <option key={value} value={value}>{AUDIENCES[value].label}{sizes ? ` (${sizes[value].users})` : ""}</option>)}</select><small className="field-hint">{AUDIENCES[form.audience].hint}{sizes && sizes[form.audience].users === 0 ? " Ahora mismo no le llegaría a nadie." : ""}</small></label>
        <label className="field"><span>Al tocarla abre</span><select value={form.destination} onChange={(event) => set("destination", event.target.value)}>{DESTINATIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        {form.destination === "custom" && <label className="field"><span>Página</span><input value={form.customUrl} onChange={(event) => set("customUrl", event.target.value)} placeholder="/products/aceite-de-oliva-500-ml" /></label>}
        <label className="field field-wide"><span>Imagen (opcional)</span><input value={form.imageUrl} inputMode="url" onChange={(event) => set("imageUrl", event.target.value)} placeholder="https://… (se ve en Android y en computadoras)" /></label>
        <fieldset className="field field-wide push-when"><legend>Cuándo</legend>
          <label><input type="radio" name="when" checked={form.when === "draft"} onChange={() => set("when", "draft")} /> Guardar como borrador</label>
          <label><input type="radio" name="when" checked={form.when === "schedule"} onChange={() => set("when", "schedule")} /> Programar</label>
          {form.when === "schedule" && <input type="datetime-local" aria-label="Fecha y hora de envío" value={form.scheduledAt} min={toLocalInput(new Date().toISOString())} onChange={(event) => set("scheduledAt", event.target.value)} />}
          <label><input type="radio" name="when" checked={form.when === "now"} onChange={() => set("when", "now")} /> Enviar ahora{sizes ? ` (${sizes[form.audience].users} ${sizes[form.audience].users === 1 ? "cliente" : "clientes"})` : ""}</label>
        </fieldset>
      </div>
      <aside className="push-preview" aria-label="Vista previa"><span className="eyebrow">Vista previa</span><div className="push-preview-card"><img src="/icon-192.png" alt="" width={36} height={36} /><div><small>SuperX · ahora</small><strong>{form.title || "Título de la notificación"}</strong><p>{form.body || "El mensaje aparece acá."}</p></div>{/^https:\/\//.test(form.imageUrl) && <img className="push-preview-image" src={form.imageUrl} alt="" />}</div><p className="subtitle">Así se ve en Android; en iPhone el diseño lo pone el sistema.</p></aside>
      </div>
      <footer><button className="button ghost" type="button" onClick={() => setEditing(undefined)}>Cancelar</button><button className="button primary" disabled={busy === "form"}>{busy === "form" ? "Guardando…" : form.when === "now" ? "Enviar ahora" : form.when === "schedule" ? "Programar" : "Guardar borrador"}</button></footer>
    </form></section></div>}
  </section>;
}
