export const ORDER_PERMISSIONS = { viewer: { transition: false, cancel: false }, operator: { transition: true, cancel: false }, admin: { transition: true, cancel: true } };
export const ORDER_STATUS_LABELS = { CREATED: "Pendiente", CONFIRMED: "Confirmado", PAID: "Pagado", PICKING: "En picking", PACKED: "Empacado", READY: "Listo", OUT_FOR_DELIVERY: "En reparto", DELIVERED: "Entregado", CANCELLED: "Cancelado" };
export const ORDER_TRANSITIONS = { CREATED: ["CONFIRMED", "CANCELLED"], CONFIRMED: ["PAID", "PICKING", "CANCELLED"], PAID: ["PICKING", "CANCELLED"], PICKING: ["PACKED", "CANCELLED"], PACKED: ["READY"], READY: ["OUT_FOR_DELIVERY"], OUT_FOR_DELIVERY: ["DELIVERED"], DELIVERED: [], CANCELLED: [] };

export function getOrderPermissions(role) { return ORDER_PERMISSIONS[role] ?? ORDER_PERMISSIONS.viewer; }
export function getAvailableOrderTransitions(order) { return (ORDER_TRANSITIONS[order.status] ?? []).filter((status) => !(order.paymentRequired && order.status === "CONFIRMED" && status === "PICKING")); }
export function canTransitionOrder(order, nextStatus) { return getAvailableOrderTransitions(order).includes(nextStatus); }
export function canRoleTransitionOrder(role, order, nextStatus) { const permissions = getOrderPermissions(role); return canTransitionOrder(order, nextStatus) && permissions.transition && (nextStatus !== "CANCELLED" || permissions.cancel); }
export function getOrderDashboardStatus(status) { if (status === "CREATED") return "pending"; if (status === "CONFIRMED" || status === "PAID") return "confirmed"; if (status === "PICKING" || status === "PACKED") return "picking"; if (status === "READY") return "ready"; if (status === "OUT_FOR_DELIVERY") return "delivery"; if (status === "DELIVERED") return "delivered"; return "cancelled"; }
