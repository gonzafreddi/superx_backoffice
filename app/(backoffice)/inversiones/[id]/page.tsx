import type { Metadata } from "next"; import { AssetDetail } from "@/app/components/assets/asset-detail";
export const metadata:Metadata={title:"SuperX · Activo",description:"Ficha de activo"}; export default async function InvestmentPage({params}:PageProps<"/inversiones/[id]">){const {id}=await params;return <AssetDetail assetId={id}/>}
