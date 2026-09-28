"use client";

import { useState, type FormEvent } from "react";
import type { TransferDetails } from "@/app/lib/payment-method-api";
import { validateTransferDetails } from "@/app/lib/payment-method-rules.js";

type Field = keyof TransferDetails;
const FIELDS: Array<{ key: Field; label: string; placeholder: string; inputMode?: "numeric" | "tel" }> = [
  { key: "alias", label: "Alias", placeholder: "superx.salto" },
  { key: "cbu", label: "CBU / CVU", placeholder: "22 dígitos", inputMode: "numeric" },
  { key: "holder", label: "Titular", placeholder: "Razón social o nombre" },
  { key: "bank", label: "Banco o billetera", placeholder: "Banco Nación" },
  { key: "cuit", label: "CUIT", placeholder: "11 dígitos", inputMode: "numeric" },
  { key: "receiptWhatsapp", label: "WhatsApp para comprobantes", placeholder: "54 9 2364 123456", inputMode: "tel" },
];

/** Bank-transfer data shown to customers on their order, plus the WhatsApp that receives receipts. */
export function TransferDetailsForm({ initial, disabled, onSave }: { initial?: TransferDetails | null; disabled?: boolean; onSave: (details: TransferDetails) => Promise<void> }) {
  const [form, setForm] = useState<TransferDetails>(initial ?? {});
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [saving, setSaving] = useState(false);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const result = validateTransferDetails(form);
    setErrors(result.errors);
    if (!result.valid) return;
    setSaving(true);
    try { await onSave(result.details); setForm(result.details); }
    finally { setSaving(false); }
  };
  return <form className="transfer-details-form" onSubmit={(event) => void submit(event)} noValidate>
    <h3>Datos para transferir</h3>
    <p>Los clientes los ven en el seguimiento de su pedido, con un botón para mandarte el comprobante por WhatsApp.</p>
    <div className="form-grid">
      {FIELDS.map((field) => <label className="field" key={field.key}><span>{field.label}</span>
        <input value={form[field.key] ?? ""} placeholder={field.placeholder} inputMode={field.inputMode} disabled={disabled || saving} aria-invalid={Boolean(errors[field.key])} onChange={(event) => setForm((current) => ({ ...current, [field.key]: event.target.value }))} />
        {errors[field.key] && <small className="field-error">{errors[field.key]}</small>}
      </label>)}
    </div>
    <div className="transfer-details-actions"><button className="button primary" type="submit" disabled={disabled || saving}>{saving ? "Guardando…" : "Guardar datos"}</button></div>
  </form>;
}
