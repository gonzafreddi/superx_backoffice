import type { Metadata } from "next";
import { ProfileApp } from "./profile-app";
export const metadata: Metadata = { title: "SuperX · Perfil de reparto" };
export default function ProfilePage() { return <ProfileApp/>; }
