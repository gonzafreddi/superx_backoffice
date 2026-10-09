import type { DispatchDelivery } from "./dispatch-contract";
/** GET /drivers/:id/route-sheet?date=YYYY-MM-DD; sequence and totals come from dispatch. */
export type RouteSheetStop = {
  stopNumber: number; orderId: string; orderNumber: string; delivery: DispatchDelivery;
  itemCount: number; packageCount: number; paymentMethod: "CASH" | "BANK_TRANSFER" | "MERCADO_PAGO";
  paymentStatus: "PENDING" | "PAID" | "FAILED" | "REFUNDED"; amountToCollect: string;
};
export type RouteSheet = {
  driver: { id: string; name: string; phone: string; vehicleType: string | null };
  date: string; stops: RouteSheetStop[]; totals: { cash: string; other: string; total: string };
};
