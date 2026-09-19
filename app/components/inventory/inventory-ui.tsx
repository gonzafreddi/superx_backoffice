import type { InventoryStatus } from "@/app/lib/inventory-contract";

export const statusLabels: Record<InventoryStatus, string> = { ok: "Disponible", low: "Stock bajo", out: "Sin stock" };

type IconName = "search" | "boxes" | "adjust" | "close" | "chevron" | "history" | "grid" | "list" | "layers" | "alert" | "pin" | "clock" | "move" | "check";
export function InventoryIcon({ name }: { name: IconName }) {
  const paths = {
    search: <><circle cx="11" cy="11" r="6" /><path d="m16 16 4 4" /></>,
    boxes: <><path d="m4 7 8-4 8 4-8 4-8-4Z" /><path d="M4 7v10l8 4 8-4V7M12 11v10" /></>,
    adjust: <><path d="M4 7h16M7 4v6M4 17h16M16 14v6" /></>,
    close: <path d="m6 6 12 12M18 6 6 18" />,
    chevron: <path d="m9 18 6-6-6-6" />,
    history: <><path d="M3 12a9 9 0 1 0 3-6.7" /><path d="M3 4v5h5M12 7v5l3 2" /></>,
    grid: <><rect x="4" y="4" width="6" height="6" rx="1" /><rect x="14" y="4" width="6" height="6" rx="1" /><rect x="4" y="14" width="6" height="6" rx="1" /><rect x="14" y="14" width="6" height="6" rx="1" /></>,
    list: <><path d="M9 6h11M9 12h11M9 18h11" /><path d="M4 6h.01M4 12h.01M4 18h.01" /></>,
    layers: <><path d="m12 3 8 4-8 4-8-4 8-4Z" /><path d="m4 12 8 4 8-4M4 17l8 4 8-4" /></>,
    alert: <><path d="m12 3 9 17H3L12 3Z" /><path d="M12 9v4M12 17h.01" /></>,
    pin: <><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="2.5" /></>,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    move: <><path d="M5 8h12M14 5l3 3-3 3M19 16H7M10 13l-3 3 3 3" /></>,
    check: <path d="m5 12 4 4L19 6" />,
  };
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}

export function StockStatusBadge({ status }: { status: InventoryStatus }) {
  return <span className={`inventory-status inventory-status-${status}`}><i aria-hidden="true" />{statusLabels[status]}</span>;
}
