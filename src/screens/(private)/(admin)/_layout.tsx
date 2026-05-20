import { useEffect } from "react";
import {
  createFileRoute,
  Outlet,
  useNavigate,
} from "@tanstack/react-router";
import { PanelGroup, Panel, PanelResizeHandle } from "react-resizable-panels";

import { WorkspaceProvider } from "@/contexts/workspace-context";
import { useAuth } from "@/contexts/auth-context";
import { isPlatformAdmin } from "@/lib/utils/platform-admin";
import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/header";

export const Route = createFileRoute("/(private)/(admin)")({
  component: AdminLayout,
});

/**
 * Layout do Super Admin Dashboard.
 *
 * Particularidades:
 * - Reaproveita `WorkspaceProvider` + `Sidebar` + `Header` pra consistência
 *   visual com o resto do backoffice.
 * - As requisições do dashboard NÃO enviam `Workspace-Id` (ver
 *   `src/shared/services/admin-dashboard.ts`).
 * - O guard é feito em runtime via `useAuth` + `isPlatformAdmin` —
 *   ele depende do `User` carregado em `(private)/_layout.tsx`, então
 *   `beforeLoad` ainda não tem acesso ao usuário (não usamos aqui).
 */
function AdminLayout() {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user && !isPlatformAdmin(user)) {
      navigate({ to: "/", replace: true });
    }
  }, [user, navigate]);

  if (!user || !isPlatformAdmin(user)) {
    return null;
  }

  return (
    <WorkspaceProvider>
      <div className="h-screen bg-neutral-100/95">
        <PanelGroup direction="horizontal">
          <Panel defaultSize={15} minSize={10} maxSize={20}>
            <Sidebar />
          </Panel>

          <PanelResizeHandle className="w-px bg-[#D8D8D8] hover:bg-[#D8D8D8] transition-colors duration-150" />

          <Panel defaultSize={85} minSize={80}>
            <div className="w-full h-full flex flex-col bg-[#EEEEEE]">
              <Header title="Super Admin" />

              <main className="w-full flex-1 overflow-y-auto">
                <Outlet />
              </main>
            </div>
          </Panel>
        </PanelGroup>
      </div>
    </WorkspaceProvider>
  );
}
