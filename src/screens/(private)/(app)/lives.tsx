import { useMemo, useState } from "react";
import {
  createFileRoute,
  Link,
  Outlet,
  useLocation,
} from "@tanstack/react-router";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Tabs } from "@/components/ui/tabs";
import { LiveCard } from "@/components/lives/live-card";
import { useLives } from "@/hooks/use-lives";
import { useWorkspacePermissions } from "@/contexts/workspace-context";
import type { LiveStatusFilter } from "@/shared/types";

export const Route = createFileRoute("/(private)/(app)/lives")({
  component: RouteComponent,
});

const TABS: Array<{ id: LiveStatusFilter; label: string }> = [
  { id: "live", label: "Ao vivo" },
  { id: "upcoming", label: "Agendadas" },
  { id: "past", label: "Anteriores" },
  { id: "cancelled", label: "Canceladas" },
];

const EMPTY_BY_TAB: Record<string, { title: string; description: string }> = {
  live: {
    title: "Nenhuma transmissão ao vivo agora",
    description: "Inicie uma live agendada ou crie uma nova para começar.",
  },
  upcoming: {
    title: "Nenhuma live agendada",
    description: "Programe uma transmissão para os usuários não perderem.",
  },
  past: {
    title: "Nenhuma live anterior",
    description: "O histórico das suas transmissões encerradas aparece aqui.",
  },
  cancelled: {
    title: "Nenhuma live cancelada",
    description: "Agendamentos cancelados ficam listados aqui.",
  },
};

function RouteComponent() {
  const location = useLocation();
  const permissions = useWorkspacePermissions();
  const [activeTab, setActiveTab] = useState<LiveStatusFilter>("live");

  const {
    data,
    isLoading,
    error,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = useLives(activeTab);

  const lives = useMemo(
    () => data?.pages.flatMap((p) => p.items) ?? [],
    [data],
  );

  // Rotas filhas (/lives/new, /lives/$liveId) renderizam via Outlet.
  if (location.pathname !== "/lives") {
    return <Outlet />;
  }

  if (!permissions.community_lives_read) {
    return (
      <div className="flex min-h-[calc(100vh-12rem)] flex-col items-center justify-center gap-3 text-center">
        <Icon name="Lock" size={28} color="#a3a3a3" />
        <p className="text-lg font-semibold text-neutral-950">
          Sem acesso às Lives
        </p>
        <span className="text-sm text-neutral-600">
          Você não tem permissão para visualizar as transmissões deste
          workspace.
        </span>
      </div>
    );
  }

  const empty = EMPTY_BY_TAB[activeTab];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold text-neutral-950">Lives</h1>
          <p className="text-sm text-neutral-600">
            Crie, agende e transmita ao vivo para os usuários do app.
          </p>
        </div>
        {permissions.community_lives_write && (
          <Link
            to="/lives/new"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-primary-600 px-6 text-sm font-medium text-white shadow-sm outline-none transition-all hover:bg-primary-700 hover:shadow focus-visible:ring-2 focus-visible:ring-primary-500/50 focus-visible:ring-offset-2"
          >
            <Icon name="Plus" color="#FAFAFA" size={16} />
            <span className="font-semibold">Criar live</span>
          </Link>
        )}
      </div>

      <Tabs
        tabs={TABS}
        activeTab={activeTab}
        onTabChange={(id) => setActiveTab(id as LiveStatusFilter)}
      />

      {isLoading ? (
        <div className="flex min-h-[40vh] items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-primary-600" />
        </div>
      ) : error ? (
        <div className="flex min-h-[40vh] flex-col items-center justify-center gap-2 text-center">
          <Icon name="TriangleAlert" size={26} color="#dc2626" />
          <p className="text-lg font-semibold text-neutral-950">
            Erro ao carregar as lives
          </p>
          <span className="text-sm text-neutral-600">
            {error instanceof Error ? error.message : "Tente novamente."}
          </span>
        </div>
      ) : lives.length > 0 ? (
        <>
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {lives.map((live) => (
              <LiveCard key={live.id} live={live} />
            ))}
          </div>
          {hasNextPage && (
            <div className="flex justify-center pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
                className="rounded-full"
              >
                {isFetchingNextPage ? "Carregando..." : "Carregar mais"}
              </Button>
            </div>
          )}
        </>
      ) : (
        <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 py-12 text-center">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-neutral-100">
            <Icon name="Video" color="#a3a3a3" size={28} />
          </div>
          <div className="flex flex-col gap-1">
            <p className="text-lg font-semibold text-neutral-950">
              {empty.title}
            </p>
            <span className="text-sm text-neutral-600">{empty.description}</span>
          </div>
          {permissions.community_lives_write &&
            activeTab !== "past" &&
            activeTab !== "cancelled" && (
              <Link
                to="/lives/new"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-primary-600 px-6 text-sm font-semibold text-white shadow-sm transition-all hover:bg-primary-700"
              >
                Criar live
              </Link>
            )}
        </div>
      )}
    </div>
  );
}
