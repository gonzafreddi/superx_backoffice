import { CountDetail } from "@/app/components/inventory-counts/count-detail";
export default async function Page({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; return <CountDetail id={id} />; }
