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
import { GroupCard } from "@/components/groups/group-card";
import { useGroups } from "@/hooks/use-groups";
import type { GroupStatusFilter } from "@/shared/types";

export const Route = createFileRoute(
  "/(private)/(admin)/admin/groups" as "/(private)/(admin)/admin/groups",
)({
  component: AdminGroups,
});

const TABS: Array<{ id: GroupStatusFilter; label: string }> = [
  { id: "active", label: "Ativos" },
  { id: "deleted", label: "Arquivados" },
  { id: "all", label: "Todos" },
];

const EMPTY_BY_TAB: Record<string, { title: string; description: string }> = {
  active: {
    title: "Nenhum grupo ainda",
    description: "Crie o primeiro grupo da comunidade.",
  },
  deleted: {
    title: "Nenhum grupo arquivado",
    description: "Grupos excluídos aparecem aqui.",
  },
  all: {
    title: "Nenhum grupo encontrado",
    description: "Ajuste a busca ou crie um novo grupo.",
  },
};

function AdminGroups() {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<GroupStatusFilter>("active");
  const [search, setSearch] = useState("");

  const {
    data,
    isLoading,
    error,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = useGroups({ status: activeTab, search });

  const groups = useMemo(
    () => data?.pages.flatMap((p) => p.items) ?? [],
    [data],
  );

  // Rotas filhas (/admin/groups/new, /admin/groups/$groupId) → Outlet.
  if (location.pathname !== "/admin/groups") {
    return <Outlet />;
  }

  const empty = EMPTY_BY_TAB[activeTab];

  return (
    <div className="flex flex-col gap-6 px-6 py-6 pb-12">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold text-neutral-950">Grupos</h1>
          <p className="text-sm text-neutral-600">
            Crie e gerencie os grupos da comunidade do app.
          </p>
        </div>
        <Link
          to="/admin/groups/new"
          className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-primary-600 px-6 text-sm font-medium text-white shadow-sm outline-none transition-all hover:bg-primary-700 hover:shadow focus-visible:ring-2 focus-visible:ring-primary-500/50 focus-visible:ring-offset-2"
        >
          <Icon name="Plus" color="#FAFAFA" size={16} />
          <span className="font-semibold">Criar grupo</span>
        </Link>
      </div>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex-1">
          <Tabs
            tabs={TABS}
            activeTab={activeTab}
            onTabChange={(id) => setActiveTab(id as GroupStatusFilter)}
          />
        </div>
        <div className="flex h-11 min-w-[220px] items-center gap-2 rounded-2xl bg-neutral-100 px-4">
          <Icon name="Search" size={16} color="#737373" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar grupos..."
            className="h-full w-full bg-transparent text-sm text-neutral-950 outline-none placeholder:text-neutral-400"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex min-h-[40vh] items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-primary-600" />
        </div>
      ) : error ? (
        <div className="flex min-h-[40vh] flex-col items-center justify-center gap-2 text-center">
          <Icon name="TriangleAlert" size={26} color="#dc2626" />
          <p className="text-lg font-semibold text-neutral-950">
            Erro ao carregar os grupos
          </p>
          <span className="text-sm text-neutral-600">
            {error instanceof Error ? error.message : "Tente novamente."}
          </span>
        </div>
      ) : groups.length > 0 ? (
        <>
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {groups.map((group) => (
              <GroupCard key={group.id} group={group} />
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
            <Icon name="Users" color="#a3a3a3" size={28} />
          </div>
          <div className="flex flex-col gap-1">
            <p className="text-lg font-semibold text-neutral-950">
              {empty.title}
            </p>
            <span className="text-sm text-neutral-600">{empty.description}</span>
          </div>
          {activeTab !== "deleted" && (
            <Link
              to="/admin/groups/new"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-primary-600 px-6 text-sm font-semibold text-white shadow-sm transition-all hover:bg-primary-700"
            >
              Criar grupo
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
