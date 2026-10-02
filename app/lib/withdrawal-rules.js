export const withdrawalStatuses = [
  ["PENDING", "Pendiente"], ["IN_PROGRESS", "En gestión"], ["RESOLVED", "Resuelto"], ["REJECTED", "Rechazado"],
];
export function validateWithdrawalUpdate(input) {
  if (!withdrawalStatuses.some(([status]) => status === input.status)) return "Elegí un estado válido.";
  if (input.resolutionNote !== undefined && (typeof input.resolutionNote !== "string" || input.resolutionNote.trim().length > 1000)) return "La nota de resolución admite hasta 1000 caracteres.";
  return "";
}
