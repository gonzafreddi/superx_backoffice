import type { Metadata } from "next";
import { TreasuryLedgerView } from "@/app/components/treasury/treasury-ledger";
export const metadata: Metadata = { title: "SuperX · Libro de cuenta", description: "Movimientos de tesorería" };
export default async function TreasuryLedgerPage({ params }: PageProps<"/tesoreria/[id]">) { const { id } = await params; return <TreasuryLedgerView accountId={id} />; }
