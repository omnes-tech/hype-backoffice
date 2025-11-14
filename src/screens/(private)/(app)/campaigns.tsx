import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/(private)/(app)/campaigns")({
  component: RouteComponent,
});

function RouteComponent() {
  return <div>Campanhas</div>;
}
