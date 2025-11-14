import { createFileRoute, Outlet } from "@tanstack/react-router";
import { PanelGroup, Panel, PanelResizeHandle } from "react-resizable-panels";

import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/header";

export const Route = createFileRoute("/(private)/(app)")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="h-screen bg-neutral-100">
      <PanelGroup direction="horizontal">
        <Panel defaultSize={15} minSize={10} maxSize={20}>
          <Sidebar />
        </Panel>

        <PanelResizeHandle className="w-px bg-neutral-700 hover:bg-neutral-600 transition-colors duration-150" />

        <Panel defaultSize={85} minSize={80}>
          <Header />

          <main className="w-full h-full p-6">
            <Outlet />
          </main>
        </Panel>
      </PanelGroup>
    </div>
  );
}
