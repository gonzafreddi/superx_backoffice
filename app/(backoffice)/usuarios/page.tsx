import type { Metadata } from "next";
import { UserManager } from "@/app/components/user-manager";
export const metadata: Metadata = { title: "Usuarios · SuperX" };
export default function UsersPage() { return <UserManager />; }
