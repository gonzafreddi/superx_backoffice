import type { Metadata } from 'next';
import { AuditWorkspace } from '@/app/components/audit-history';
export const metadata: Metadata = { title: 'SuperX · Auditoría', description: 'Registro de cambios administrativos' };
export default function AuditPage() { return <section className="workspace"><header className="workspace-header"><div><p className="section-kicker">Administración</p><h1>Registro de auditoría</h1><p>Consultá quién realizó cada cambio y sus valores anteriores.</p></div></header><AuditWorkspace /></section>; }
