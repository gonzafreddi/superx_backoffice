export function canAssignOrder(status: string, hasActiveAssignment = false): boolean {
  return status === "READY" || status === "DISPATCHED" || (status === "OUT_FOR_DELIVERY" && !hasActiveAssignment);
}
export function needsDriver(status: string, hasActiveAssignment: boolean): boolean {
  return (status === "READY" || status === "DISPATCHED") && !hasActiveAssignment;
}
