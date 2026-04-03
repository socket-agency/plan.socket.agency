import { EmberBoard } from "../../_components/board";

export default async function TaskPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <EmberBoard initialTaskId={id} />;
}
