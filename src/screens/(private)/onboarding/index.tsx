import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/(private)/onboarding/")({
  component: RouteComponent,
});

function RouteComponent() {
  return <div>Hello "/(private)/onboarding/"!</div>;
}
