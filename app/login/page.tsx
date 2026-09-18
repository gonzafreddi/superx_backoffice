import type { Metadata } from "next";
import { Login } from "@/app/components/login";

export const metadata: Metadata = { title: "SuperX · Ingresar", description: "Acceso al backoffice SuperX" };

export default function LoginPage() {
  return <Login />;
}
