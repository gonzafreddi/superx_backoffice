import type { Metadata } from "next";
import { CustomerList } from "@/app/components/customers/customer-list";
export const metadata: Metadata = { title: "Clientes · SuperX" };
export default function CustomersPage() { return <CustomerList />; }
