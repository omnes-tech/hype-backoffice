import { createFileRoute } from "@tanstack/react-router";

import { Checkbox } from "@/components/ui/checkbox";

export const Route = createFileRoute("/(private)/(app)/")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <>
      <Checkbox />
    </>
  );
}
