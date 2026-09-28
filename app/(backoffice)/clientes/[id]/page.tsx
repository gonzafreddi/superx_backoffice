import type { Metadata } from "next";
import { CustomerDetailView } from "@/app/components/customers/customer-detail";
export const metadata: Metadata = { title: "Cliente · SuperX" };
export default async function CustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <CustomerDetailView id={id} />;
}
