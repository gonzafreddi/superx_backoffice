import type { Metadata } from "next"; import { AssetManager } from "@/app/components/assets/asset-manager";
export const metadata:Metadata={title:"SuperX · Inversiones",description:"Gestión de inversiones y activos"}; export default function InvestmentsPage(){return <AssetManager/>}
