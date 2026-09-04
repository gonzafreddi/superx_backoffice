import type { ReactNode } from "react";
import { AdminShell } from "@/app/components/admin-shell";

export default function BackofficeLayout({ children }: { children: ReactNode }) {
  return <AdminShell>{children}</AdminShell>;
}
