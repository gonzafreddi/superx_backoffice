import type { Metadata } from "next";
import { PickingTask } from "../picking-task";

export const metadata: Metadata = { title: "SuperX · Preparar pedido" };

export default async function PickingTaskPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PickingTask key={id} id={id} />;
}
