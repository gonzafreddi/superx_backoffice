import Link from "next/link";
import { InventoryIcon } from "@/app/components/inventory/inventory-ui";
import { PickingApiError } from "@/app/lib/picking-api";
import type { PickingApi, PickingTask } from "@/app/lib/picking-contract";
import { pickingProgress } from "@/app/lib/picking-rules";
import styles from "./picking.module.css";

export { InventoryIcon as Icon };
export type Deps = {
  loadMine?: PickingApi["listMyTasks"];
  loadAvailable?: PickingApi["listAvailableTasks"];
  loadTask?: PickingApi["getTask"];
  take?: PickingApi["takeTask"];
  start?: PickingApi["startTask"];
  pick?: PickingApi["pickItem"];
  recordWeight?: PickingApi["recordWeight"];
  reportShortage?: PickingApi["reportShortage"];
  searchProducts?: PickingApi["searchProducts"];
  complete?: PickingApi["completeTask"];
  navigate?: (path: string) => void;
};
export function errorMessage(error: unknown, fallback = "No pudimos guardar los cambios. Intentá de nuevo.") {
  if (!(error instanceof PickingApiError)) return fallback;
  if (error.status === 401 || error.code === "unauthenticated") return "Iniciá sesión para trabajar en picking.";
  if (error.status === 403) return "Esta tarea está asignada a otra persona.";
  if (error.status === 404) return "La tarea ya no está disponible.";
  if (error.code === "barcode_mismatch") return "El código escaneado no corresponde a este producto.";
  if (error.code === "pending_lines") return "Todavía hay productos sin resolver.";
  if (error.code === "not_started") return "Empezá la tarea antes de registrar cantidades.";
  if (error.code === "over_pick") return "La cantidad supera las unidades requeridas.";
  if (error.status === 400 || error.status === 409) return error.message;
  return fallback;
}
export const isAuthError = (error: unknown) => error instanceof PickingApiError && (error.status === 401 || error.code === "unauthenticated");
export function AuthState() {
  return <section className={styles.card}><h1>Iniciá sesión</h1><p>Entrá con tu cuenta de picker para ver tus tareas.</p><Link className={styles.primary} href="/login?next=/picking">Ingresar</Link></section>;
}
export function Progress({ task, detail = false }: { task: PickingTask; detail?: boolean }) {
  const p = pickingProgress(task);
  return <div className={detail ? styles.stickyProgress : styles.progress}><div className={styles.progressLabel}><span>{detail ? `${p.resolved} de ${p.total} productos preparados` : `${p.resolved} / ${p.total} productos`}</span>{detail && <strong>{p.percent}%</strong>}</div><div className={styles.progressTrack} role="progressbar" aria-label="Progreso del picking" aria-valuemin={0} aria-valuemax={100} aria-valuenow={p.percent}><span style={{ width: `${p.percent}%` }} /></div></div>;
}
export function Status({ status }: { status: string }) {
  const states: Record<string, [string, string]> = { PENDING: ["Disponible", "success"], IN_PROGRESS: ["En picking", "warning"], ASSIGNED: ["Asignada", "assigned"], COMPLETED: ["Completado", "success"], SHORT: ["Faltante", "danger"], SUBSTITUTED: ["Sustituido", "danger"], PICKED: ["Preparado", "success"], LINE_PENDING: ["Pendiente", "neutral"], CANCELLED: ["Cancelada", "neutral"] };
  const [label, tone] = states[status] ?? ["Incidencia", "danger"];
  return <span className={`${styles.chip} ${styles[tone]}`}><i aria-hidden="true" />{label}</span>;
}
export function Loading() { return <div className={styles.skeleton} role="status" aria-label="Cargando tareas" aria-busy="true"><span /><span /><span /></div>; }
export function Spinner() { return <span className={styles.spinner} aria-hidden="true" />; }
