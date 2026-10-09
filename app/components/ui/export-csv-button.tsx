"use client";
import { useEffect, useState } from "react";
import { can } from "@/app/lib/permissions";
import { getStoredUser } from "@/app/lib/auth-api";
import { downloadCsv } from "@/app/lib/download-csv";
import { Notice } from "./notice";
export function ExportCsvButton({ path, filename, label = "Exportar CSV", disabled = false, description }: { path: string; filename: string; label?: string; disabled?: boolean; description?: string }) {
  const [allowed, setAllowed] = useState(false), [pending, setPending] = useState(false), [error, setError] = useState("");
  useEffect(() => { // eslint-disable-next-line react-hooks/set-state-in-effect
    setAllowed(can(getStoredUser()?.role, "exports.read")); }, []);
  if (!allowed) return null;
  const download = async () => { setPending(true); setError(""); try { await downloadCsv(path, filename); } catch (cause) { setError(cause instanceof Error ? cause.message : "No pudimos descargar el CSV."); } finally { setPending(false); } };
  return <div><button type="button" className="button secondary" title={description} disabled={pending || disabled} onClick={() => void download()}>{pending ? "Descargando…" : label}</button>{description && <small style={{ display: "block" }}>{description}</small>}{error && <Notice kind="error" role="alert">{error}</Notice>}</div>;
}
