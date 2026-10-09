export type DriverCandidate = { id: string; email: string; name: string | null; phone: string | null; isActive: boolean };
export type Driver = { id: string; name: string; phone: string; vehicleType: string | null; active: boolean; createdAt: string; updatedAt: string; user: { id: string; email: string; isActive: boolean } | null; activeAssignments: number };
export type DriverInput = { name?: string; phone?: string; vehicleType?: string; active?: boolean };
export type DeliveryAssignment = { id: string; orderId: string; driverId: string; status: "ACTIVE" | "REASSIGNED" | "COMPLETED" | "CANCELLED"; assignedAt: string; endedAt: string | null; note: string | null };
export type OrderAssignmentsView = { active: DeliveryAssignment | null; history: DeliveryAssignment[] };
