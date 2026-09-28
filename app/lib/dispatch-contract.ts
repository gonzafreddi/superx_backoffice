export type DispatchDelivery = {
  recipientName: string;
  phone: string;
  addressLine: string;
  neighborhood: string | null;
  postalCode: string;
  cityName: string;
  addressNotes: string | null;
  customerNotes: string | null;
  zoneName: string;
  slotDate: string;
  slotStart: string;
  slotEnd: string;
};

export type DispatchOrder = {
  id: string;
  orderNumber: string;
  status: "READY" | "OUT_FOR_DELIVERY";
  position: number | null;
  paymentMethod: "CASH" | "BANK_TRANSFER" | "MERCADO_PAGO";
  paymentStatus: "PENDING" | "PAID" | "FAILED" | "REFUNDED";
  delivery: DispatchDelivery;
  items: Array<{ productName: string; quantity: number; unitCode: string }>;
};

export type DispatchBoard = { ready: DispatchOrder[]; outForDelivery: DispatchOrder[] };

export type DispatchApi = {
  getBoard(): Promise<DispatchBoard>;
  saveSequence(orderIds: string[]): Promise<DispatchBoard>;
  start(orderIds: string[]): Promise<DispatchBoard>;
  markDelivered(id: string): Promise<void>;
};
