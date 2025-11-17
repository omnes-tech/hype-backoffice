import { createFileRoute, Outlet, useLocation } from "@tanstack/react-router";
import { PanelGroup, Panel, PanelResizeHandle } from "react-resizable-panels";

import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/header";

export const Route = createFileRoute("/(private)/(app)")({
  component: RouteComponent,
});

function RouteComponent() {
  const { pathname } = useLocation();

  let title = "Dashboard";

  if (pathname === "/campaigns") {
    title = "Campanhas";
  }

  return (
    <div className="h-screen bg-neutral-100">
      <PanelGroup direction="horizontal">
        <Panel defaultSize={15} minSize={10} maxSize={20}>
          <Sidebar />
        </Panel>

        <PanelResizeHandle className="w-px bg-neutral-700 hover:bg-neutral-600 transition-colors duration-150" />

        <Panel defaultSize={85} minSize={80}>
          <Header title={title} />

          <main className="w-full h-full p-6">
            <Outlet />
          </main>
        </Panel>
      </PanelGroup>
    </div>
  );
}
