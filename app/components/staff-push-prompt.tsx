"use client";
import { useEffect, useState } from "react";
import { deviceState, enableDevice, syncDevice, type DeviceState } from "@/app/lib/push-api";

const DISMISS_KEY = "superx.staff-push-dismissed-until";
const COPY: Record<string, string> = {
  admin: "Recibí un aviso en este dispositivo cada vez que entra un pedido nuevo.",
  picker: "Recibí un aviso cuando haya un pedido nuevo para preparar.",
  driver: "Recibí un aviso cuando haya pedidos listos para repartir o te asignen uno.",
};

/** Invites staff who get alerts (admin, picker, driver) to enable push on this device. */
export function StaffPushPrompt({ role }: { role: string }) {
  const [state, setState] = useState<DeviceState | null>(null);
  const [hidden, setHidden] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => {
    if (!COPY[role]) return;
    let active = true;
    void syncDevice().then(() => deviceState()).then((next) => {
      if (!active) return;
      let dismissed = false; try { dismissed = Number(localStorage.getItem(DISMISS_KEY) || 0) > Date.now(); } catch { /* storage optional */ }
      setState(next); setHidden(dismissed || next !== "off");
    }).catch(() => undefined);
    return () => { active = false; };
  }, [role]);
  if (hidden || !state || !COPY[role]) return null;
  const dismiss = () => { setHidden(true); try { localStorage.setItem(DISMISS_KEY, String(Date.now() + 30 * 24 * 60 * 60 * 1000)); } catch { /* storage optional */ } };
  const enable = async () => {
    setBusy(true); setMessage("");
    try { const next = await enableDevice(); setState(next); if (next === "on") setHidden(true); else setMessage(next === "denied" ? "El navegador bloqueó las notificaciones. Habilitalas desde la configuración del sitio." : "Este dispositivo no admite notificaciones."); }
    catch (cause) { setMessage(cause instanceof Error ? cause.message : "No pudimos activar los avisos."); }
    finally { setBusy(false); }
  };
  return <div className="staff-push-prompt" role="region" aria-label="Avisos en este dispositivo">
    <span className="staff-push-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M6 9a6 6 0 1 1 12 0c0 6 3 7 3 7H3s3-1 3-7M10 20a2 2 0 0 0 4 0" /></svg></span>
    <div><strong>Activá los avisos</strong><p>{COPY[role]}</p>{message && <p className="field-error" role="alert">{message}</p>}</div>
    <div className="staff-push-actions"><button className="button primary" type="button" disabled={busy} onClick={() => void enable()}>{busy ? "Activando…" : "Activar"}</button><button className="button ghost" type="button" onClick={dismiss}>Ahora no</button></div>
  </div>;
}
