import { Suspense, type ReactNode } from "react";
import { DriverShell } from "@/app/components/driver-shell";

// DriverShell reads the query string (tab/date), which needs a Suspense boundary for static rendering.
export default function DriverLayout({ children }: { children: ReactNode }) { return <Suspense fallback={null}><DriverShell>{children}</DriverShell></Suspense>; }
