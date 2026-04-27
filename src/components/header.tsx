import { useState, type ComponentProps } from "react";
import { useLocation, useNavigate } from "@tanstack/react-router";

import { Icon } from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { WorkspaceDropdown } from "./workspace-dropdown";
import { NotificationsDropdown } from "./notifications-dropdown";
import { WalletDrawer } from "./wallet/wallet-drawer";
import { useHypepointBalance } from "@/hooks/use-hypepoint";
import { useWorkspaceContext } from "@/contexts/workspace-context";
import type { Workspace } from "@/shared/types";

interface HeaderProps extends ComponentProps<"header"> {
  title: string;
}

function isCampaignScopedPath(pathname: string): boolean {
  if (!pathname.startsWith("/campaigns/")) return false;
  if (pathname === "/campaigns/new") return false;
  const rest = pathname.slice("/campaigns/".length);
  return rest.length > 0 && !rest.startsWith("new");
}

const formatHype = (value: string | undefined): string => {
  if (!value) return "—";
  const num = Number(value);
  if (!Number.isFinite(num)) return value;
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(num);
};

export function Header({ title, ...props }: HeaderProps) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { workspaces, isLoading, selectedWorkspace, selectWorkspace } =
    useWorkspaceContext();
  const [walletOpen, setWalletOpen] = useState(false);

  // Só busca saldo quando há workspace selecionado (header da API exige Workspace-Id)
  const balanceQ = useHypepointBalance();
  const hasWorkspace = !!selectedWorkspace;

  const handleWorkspaceChange = (workspace: Workspace) => {
    selectWorkspace(workspace);
    if (isCampaignScopedPath(pathname)) {
      navigate({ to: "/campaigns", replace: true });
    }
  };

  return (
    <>
      <header
        className="w-full bg-white/80 backdrop-blur-sm border-b border-neutral-200/80 py-4 px-6 flex items-center justify-between z-20"
        {...props}
      >
        <h1 className="text-xl font-semibold text-neutral-950 tracking-tight">
          {title}
        </h1>

        <div className="flex items-center gap-8">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              onClick={() => hasWorkspace && setWalletOpen(true)}
              disabled={!hasWorkspace}
              aria-label="Abrir carteira HypePoint"
              title={
                hasWorkspace
                  ? "Abrir carteira HypePoint"
                  : "Selecione um workspace para ver o saldo"
              }
            >
              <div className="flex items-center gap-2">
                <Icon name="Wallet" size={16} color="#0A0A0A" />

                <p className="font-medium text-neutral-950 whitespace-nowrap tabular-nums">
                  {!hasWorkspace
                    ? "—"
                    : balanceQ.isLoading
                    ? "…"
                    : balanceQ.error
                    ? "Erro"
                    : `${formatHype(balanceQ.data?.formatted)} ${balanceQ.data?.symbol ?? "HYPE"}`}
                </p>
              </div>
            </Button>

            {isLoading ? (
              <div className="w-32 h-11 rounded-3xl border border-neutral-200 flex items-center justify-center bg-neutral-50">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-neutral-600"></div>
              </div>
            ) : workspaces.length > 0 ? (
              <WorkspaceDropdown
                options={workspaces}
                value={selectedWorkspace}
                onChange={handleWorkspaceChange}
              />
            ) : (
              <div className="w-32 h-11 rounded-3xl border border-neutral-200 flex items-center justify-center bg-neutral-50">
                <span className="text-xs text-neutral-600">Sem workspaces</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-4">
            <NotificationsDropdown />
            <Icon name="MessageSquare" size={20} color="#0A0A0A" />
          </div>
        </div>
      </header>

      <WalletDrawer
        open={walletOpen}
        onClose={() => setWalletOpen(false)}
      />
    </>
  );
}
