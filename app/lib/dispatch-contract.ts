export type LatLng = { lat: number; lng: number };
export type IncidentReason = "CUSTOMER_ABSENT" | "WRONG_ADDRESS" | "NO_ANSWER" | "ORDER_PROBLEM" | "PAYMENT" | "OTHER";
export type DispatchIncident = { id: string; reason: IncidentReason; note: string | null; createdAt: string; reportedBy: { id: string; name: string | null } };
export type DispatchDelivery = { recipientName: string; phone: string; addressLine: string; neighborhood: string | null; postalCode: string; cityName: string; addressNotes: string | null; customerNotes: string | null; zoneName: string; slotDate: string; slotStart: string; slotEnd: string };
export type DispatchOrder = {
  id: string; orderNumber: string; status: "READY" | "OUT_FOR_DELIVERY" | "DELIVERED"; position: number | null;
  paymentMethod: "CASH" | "BANK_TRANSFER" | "MERCADO_PAGO"; paymentStatus: "PENDING" | "PAID" | "FAILED" | "REFUNDED";
  delivery: DispatchDelivery; location: LatLng | null; dispatchedBy: { id: string; name: string | null } | null;
  dispatchedAt: string | null; deliveredAt: string | null; incident: DispatchIncident | null;
  items: Array<{ productName: string; quantity: number; unitCode: string; imageUrl: string | null }>;
};
export type DispatchSummary = { total: number; pending: number; delivered: number; incidents: number };
export type DispatchBoard = { date: string; ready: DispatchOrder[]; outForDelivery: DispatchOrder[]; delivered: DispatchOrder[]; summary: DispatchSummary };
export type RouteEstimate = { available: false; reason: string } | { available: true; distanceMeters: number; durationSeconds: number; geometry: LatLng[]; missingLocation: string[] };
export type DispatchHistory = { days: Array<{ date: string; delivered: number; incidents: number; orders: DispatchOrder[] }> };
export type DispatchApi = {
  getBoard(date?: string): Promise<DispatchBoard>; saveSequence(orderIds: string[]): Promise<DispatchBoard>;
  start(orderIds: string[]): Promise<DispatchBoard>; route(orderIds: string[], origin?: LatLng): Promise<RouteEstimate>;
  optimize(orderIds: string[], origin?: LatLng): Promise<DispatchBoard>; markDelivered(id: string, note?: string): Promise<DispatchBoard>;
  reportIncident(id: string, reason: IncidentReason, note?: string): Promise<DispatchBoard>; history(from?: string, to?: string): Promise<DispatchHistory>;
};
