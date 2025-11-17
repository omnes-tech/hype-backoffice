import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/(private)/(app)/")({
  component: RouteComponent,
});

function RouteComponent() {
  return <></>;
}
