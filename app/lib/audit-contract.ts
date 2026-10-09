export type AuditLog = {
  id: string; createdAt: string; actorUserId: string | null; actorEmail: string | null;
  actorRole: string | null; action: string; entityType: string; entityId: string;
  summary: string; changes: Record<string, { from: unknown; to: unknown }> | null; ip: string | null;
};
export type AuditFilters = { from?: string; to?: string; actorUserId?: string; entityType?: string; entityId?: string; action?: string; q?: string; page?: number; pageSize?: number };
export type AuditPage = { items: AuditLog[]; total: number; page: number; pageSize: number };
