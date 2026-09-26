"use client";
/* eslint-disable react-hooks/set-state-in-effect */
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Notice } from "@/app/components/ui/notice";
import type { PaymentMethod } from "@/app/lib/payment-contract";
import { purchaseOrderPaymentApi, type PurchaseOrderPaymentStatus, type PurchaseOrderPaymentSummary } from "@/app/lib/purchase-order-payment-api";
import { defaultMethodFor, validateOrderPayment } from "@/app/lib/purchase-order-payment-rules";
import { treasuryApi } from "@/app/lib/treasury-api";
import type { TreasuryAccount } from "@/app/lib/treasury-contract";
import { date, money } from "./purchase-order-ui";

const statusLabels: Record<PurchaseOrderPaymentStatus, string> = { UNPAID: "Sin pagar", PARTIALLY_PAID: "Pago parcial", PAID: "Pagada", OVERDUE: "Vencida" };
const methodLabels: Record<PaymentMethod, string> = { CASH: "Efectivo", TRANSFER: "Transferencia", CHECK: "Cheque", CARD: "Tarjeta", DIGITAL: "Billetera digital", OTHER: "Otro" };
const amount = (value: string) => Number(value);
const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Argentina/Buenos_Aires" }).format(new Date());

export function PaymentStatusBadge({ status }: { status: PurchaseOrderPaymentStatus }) {
  return <span className={`pop-status pop-status-${status.toLowerCase()}`}>{statusLabels[status]}</span>;
}

export function PurchaseOrderPayments({ orderId, orderStatus }: { orderId: string; orderStatus: string }) {
  const [summary, setSummary] = useState<PurchaseOrderPaymentSummary | null>(null), [loading, setLoading] = useState(true), [error, setError] = useState(""), [notice, setNotice] = useState("");
  const [open, setOpen] = useState(false), [accounts, setAccounts] = useState<TreasuryAccount[]>([]), [pending, setPending] = useState(false), [formError, setFormError] = useState("");
  const [form, setForm] = useState({ amount: "", accountId: "", method: "TRANSFER" as PaymentMethod, paidOn: today(), reference: "", notes: "" });
  const [idempotencyKey, setIdempotencyKey] = useState("");

  const load = useCallback(async () => {
    try { setSummary(await purchaseOrderPaymentApi.summary(orderId)); setError(""); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "No pudimos cargar los pagos."); }
    finally { setLoading(false); }
  }, [orderId]);
  useEffect(() => { void load(); }, [load, orderStatus]);

  const usableAccounts = useMemo(() => accounts.filter((account) => account.isActive && account.currency === (summary?.currency ?? "ARS")), [accounts, summary?.currency]);
  const check = summary ? validateOrderPayment({ amount: form.amount, balance: summary.balance, accountId: form.accountId }) : null;
  const canPay = (orderStatus === "CONFIRMED" || orderStatus === "CLOSED") && !!summary && amount(summary.balance) > 0;

  const startPayment = async () => {
    if (!summary) return;
    setFormError(""); setNotice(""); setIdempotencyKey(crypto.randomUUID());
    setForm((current) => ({ ...current, amount: summary.balance, paidOn: today(), reference: "", notes: "" }));
    setOpen(true);
    try {
      const rows = (await treasuryApi.listAccounts()).items;
      setAccounts(rows);
      const first = rows.find((account) => account.isActive && account.currency === summary.currency);
      setForm((current) => current.accountId || !first ? current : { ...current, accountId: first.id, method: defaultMethodFor(first.type) });
    } catch (cause) { setFormError(cause instanceof Error ? cause.message : "No pudimos cargar las cuentas."); }
  };

  const submit = async () => {
    if (!summary || !check || check.errors.length || !check.amount) return;
    setPending(true); setFormError("");
    try {
      const next = await purchaseOrderPaymentApi.pay(orderId, { treasuryAccountId: form.accountId, method: form.method, amount: check.amount, paidAt: `${form.paidOn}T12:00:00-03:00`, reference: form.reference.trim() || undefined, notes: form.notes.trim() || undefined, idempotencyKey });
      setSummary(next); setOpen(false);
      setNotice(check.isFull ? "Pago registrado. La orden quedó saldada." : `Pago parcial registrado. Quedan ${money(amount(next.balance), next.currency)} pendientes.`);
    } catch (cause) { setFormError(cause instanceof Error ? cause.message : "No pudimos registrar el pago."); }
    finally { setPending(false); }
  };

  if (loading) return <section className="history pop"><p className="eyebrow">PAGOS</p><p className="location-muted">Cargando pagos…</p></section>;
  if (!summary) return error ? <section className="history pop"><p className="eyebrow">PAGOS</p><Notice kind="error" role="alert">{error}</Notice></section> : null;

  const currency = summary.currency, payable = amount(summary.payableTotal), paid = amount(summary.paidAmount), balance = amount(summary.balance);
  const payableNote = orderStatus === "CLOSED" && summary.receivedTotal !== summary.orderTotal && summary.payableTotal === summary.receivedTotal ? "Según lo recibido (orden cerrada)" : amount(summary.invoicedTotal) > amount(summary.orderTotal) ? "Según lo facturado" : "Total de la orden";

  return <section className="history pop">
    <div className="pop-head">
      <div><p className="eyebrow">PAGOS</p><h3>Pagos al proveedor <PaymentStatusBadge status={summary.paymentStatus} /></h3></div>
      {canPay && <button className="button primary" onClick={() => void startPayment()}>Registrar pago</button>}
    </div>
    {notice && <Notice kind="success" role="status" onDismiss={() => setNotice("")}>{notice}</Notice>}
    {error && <Notice kind="error" role="alert">{error}</Notice>}
    <div className="pop-summary">
      <div><span>A pagar</span><strong>{money(payable, currency)}</strong><small>{payableNote}</small></div>
      <div><span>Pagado</span><strong>{money(paid, currency)}</strong>{amount(summary.advanceAmount) > 0 && <small>{money(amount(summary.advanceAmount), currency)} como anticipo</small>}</div>
      <div className={balance > 0 ? "pop-balance" : "pop-balance settled"}><span>{balance < 0 ? "A favor" : "Saldo pendiente"}</span><strong>{money(Math.abs(balance), currency)}</strong>{summary.dueDate && balance > 0 && <small>Vence {date(summary.dueDate)}</small>}</div>
    </div>
    <div className="pop-progress" aria-label={`Pagado ${payable ? Math.round(Math.min(1, paid / payable) * 100) : 0}%`}><i style={{ width: `${payable ? Math.min(100, (paid / payable) * 100) : 0}%` }} /></div>
    {summary.invoices.length === 0 && balance > 0 && <p className="pop-hint">Todavía no cargaste la factura: los pagos quedan como anticipo de esta orden y se aplican solos cuando la cargues.</p>}
    {summary.invoices.length > 0 && <div className="pop-invoices">{summary.invoices.map((invoice) => <Link key={invoice.id} href={`/facturas/${invoice.id}`} className={invoice.status === "VOIDED" ? "voided" : ""}><strong>{invoice.voucherType.replace("_", " ")} {invoice.pointOfSale}-{invoice.number}</strong><span>{money(amount(invoice.total), currency)} · pagado {money(amount(invoice.paidAmount), currency)}</span><em>{invoice.status === "VOIDED" ? "Anulada" : statusLabels[invoice.paymentStatus as PurchaseOrderPaymentStatus] ?? invoice.paymentStatus}</em></Link>)}</div>}
    {summary.payments.length ? <div className="location-table-wrap"><table className="location-stock-table pop-table"><thead><tr><th>Fecha</th><th>Cuenta</th><th>Medio</th><th>Referencia</th><th>Importe</th><th>Estado</th></tr></thead><tbody>{summary.payments.map((payment) => <tr key={payment.id} className={payment.status === "REVERSED" ? "reversed" : ""}><td data-label="Fecha">{date(payment.paidAt)}</td><td data-label="Cuenta">{payment.treasuryAccount.name}</td><td data-label="Medio">{methodLabels[payment.method] ?? payment.method}</td><td data-label="Referencia">{payment.reference ?? "—"}</td><td data-label="Importe"><strong>{money(amount(payment.appliedToOrder), currency)}</strong>{payment.appliedToOrder !== payment.amount && <small>de {money(amount(payment.amount), currency)}</small>}</td><td data-label="Estado">{payment.status === "REVERSED" ? "Revertido" : "Confirmado"}</td></tr>)}</tbody></table></div> : <p className="location-muted">Todavía no hay pagos.</p>}

    {open && <div className="modal-backdrop"><section className="modal pop-modal" role="dialog" aria-modal="true" aria-label="Registrar pago">
      <header><h2>Registrar pago</h2><button className="icon-button" onClick={() => setOpen(false)} aria-label="Cerrar">×</button></header>
      <p className="modal-lede">Saldo pendiente: <strong>{money(balance, currency)}</strong></p>
      <div className="pop-amount">
        <label className="field">Importe<input inputMode="decimal" autoFocus value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} aria-invalid={!!check?.errors.some((message) => /importe/i.test(message))} /></label>
        <div className="pop-quick"><button type="button" className={`button ${check?.isFull ? "primary" : "secondary"}`} onClick={() => setForm({ ...form, amount: summary.balance })}>Pago total</button><button type="button" className="button secondary" onClick={() => setForm({ ...form, amount: "" })}>Pago parcial</button></div>
      </div>
      {check && !check.errors.some((message) => /importe/i.test(message)) && !check.isFull && <p className="pop-remaining">Después de este pago quedan <strong>{money(amount(check.remaining), currency)}</strong> pendientes.</p>}
      <div className="form-grid">
        <label className="field">Cuenta de origen<select value={form.accountId} onChange={(event) => { const account = usableAccounts.find((item) => item.id === event.target.value); setForm({ ...form, accountId: event.target.value, method: account ? defaultMethodFor(account.type) : form.method }); }}><option value="">Elegí una cuenta</option>{usableAccounts.map((account) => <option key={account.id} value={account.id}>{account.name} · {money(amount(account.balance), account.currency)}</option>)}</select></label>
        <label className="field">Medio<select value={form.method} onChange={(event) => setForm({ ...form, method: event.target.value as PaymentMethod })}>{(Object.keys(methodLabels) as PaymentMethod[]).map((method) => <option key={method} value={method}>{methodLabels[method]}</option>)}</select></label>
        <label className="field">Fecha<input type="date" value={form.paidOn} max={today()} onChange={(event) => setForm({ ...form, paidOn: event.target.value })} /></label>
        <label className="field">Referencia<input value={form.reference} maxLength={280} placeholder="N.º de transferencia, recibo…" onChange={(event) => setForm({ ...form, reference: event.target.value })} /></label>
      </div>
      <label className="field">Notas<textarea value={form.notes} maxLength={5000} onChange={(event) => setForm({ ...form, notes: event.target.value })} /></label>
      {usableAccounts.length === 0 && accounts.length > 0 && <p className="field-error">No hay cuentas activas en {currency}. Creá una en Tesorería.</p>}
      {form.amount !== "" && check?.errors.map((message) => <p key={message} className="field-error">{message}</p>)}
      {formError && <Notice kind="error" role="alert">{formError}</Notice>}
      <footer><button className="button secondary" onClick={() => setOpen(false)}>Cancelar</button><button className="button primary" disabled={pending || !check || check.errors.length > 0} onClick={() => void submit()}>{pending ? "Registrando…" : check?.isFull ? "Pagar saldo total" : "Registrar pago parcial"}</button></footer>
    </section></div>}
  </section>;
}
