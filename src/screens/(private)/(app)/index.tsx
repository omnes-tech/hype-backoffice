import { useEffect, useMemo, useState, type ComponentProps } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";

import { useCampaigns } from "@/hooks/use-campaigns";
import { useWorkspaceOverview } from "@/hooks/use-workspace-overview";
import {
  getCampaignStatusValue,
  getCampaignStatusDisplayLabel,
} from "@/shared/utils/campaign-status";
import {
  useWorkspaceContext,
  useWorkspacePermissions,
} from "@/contexts/workspace-context";
import type { CampaignListItem } from "@/shared/services/campaign";
import { Icon } from "@/components/ui/icon";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/(private)/(app)/")({
  component: RouteComponent,
});

const TASKS_PAGE_SIZE = 6;

type TableRow = {
  campaign: CampaignListItem;
  overview?: {
    metrics: {
      reach: number;
      publishedContent: number;
    };
  };
  pendingTotal: number;
};

function RouteComponent() {
  const { selectedWorkspace } = useWorkspaceContext();
  const permissions = useWorkspacePermissions();
  const { data: campaignsData = [], isLoading, error } = useCampaigns({
    enabled: !!selectedWorkspace,
  });

  const overviewInput = useMemo(
    () =>
      campaignsData.map((c) => ({
        id: c.id,
        title: c.title,
      })),
    [campaignsData],
  );

  const {
    isLoading: isOverviewLoading,
    hasError: overviewHasError,
    aggregateMetrics,
    perCampaign,
    tasks,
    enabled: overviewEnabled,
    campaignStats: overviewCampaignStats,
    campaignTable,
    usesAggregatedEndpoint,
  } = useWorkspaceOverview(overviewInput, {
    enabled: !!selectedWorkspace && campaignsData.length > 0,
  });

  const stats = useMemo(() => {
    if (overviewCampaignStats) {
      return {
        total: overviewCampaignStats.total,
        active: overviewCampaignStats.active,
        finished: overviewCampaignStats.finished,
        draft: overviewCampaignStats.draft,
      };
    }
    const total = campaignsData.length;
    const active = campaignsData.filter((c: { status?: unknown }) => {
      const v = getCampaignStatusValue(c.status);
      return v === "active" || v === "published";
    }).length;
    const finished = campaignsData.filter((c: { status?: unknown }) => {
      const v = getCampaignStatusValue(c.status);
      return v === "finished" || v === "completed";
    }).length;
    const draft = campaignsData.filter(
      (c: { status?: unknown }) => getCampaignStatusValue(c.status) === "draft",
    ).length;
    return { total, active, finished, draft };
  }, [overviewCampaignStats, campaignsData]);

  const overviewById = useMemo(() => {
    const m = new Map<string, (typeof perCampaign)[0]>();
    for (const row of perCampaign) m.set(row.campaignId, row);
    return m;
  }, [perCampaign]);

  const legacyTableRows = useMemo((): TableRow[] => {
    return campaignsData
      .map((c) => {
        const o = overviewById.get(c.id);
        const pendingTotal =
          (o?.pendingContent ?? 0) +
          (o?.pendingScripts ?? 0) +
          (o?.participantsAction ?? 0);
        return { campaign: c, overview: o, pendingTotal };
      })
      .sort((a, b) => {
        if (b.pendingTotal !== a.pendingTotal) {
          return b.pendingTotal - a.pendingTotal;
        }
        const tb = new Date(b.campaign.updated_at || 0).getTime();
        const ta = new Date(a.campaign.updated_at || 0).getTime();
        return tb - ta;
      });
  }, [campaignsData, overviewById]);

  const displayedTableRows = useMemo((): TableRow[] => {
    if (usesAggregatedEndpoint && campaignTable.length > 0) {
      return [...campaignTable]
        .map((c) => {
          const o = overviewById.get(c.id);
          const pendingTotal =
            c.pending_content_count +
            c.pending_script_count +
            c.participants_action_count;
          const updated = c.updated_at ?? "";
          return {
            campaign: {
              id: c.id,
              title: c.title,
              description: c.description ?? "",
              status: c.status ?? "",
              max_influencers: 0,
              created_at: updated,
              updated_at: updated,
            },
            overview: o,
            pendingTotal,
          };
        })
        .sort((a, b) => {
          if (b.pendingTotal !== a.pendingTotal) {
            return b.pendingTotal - a.pendingTotal;
          }
          return (
            new Date(b.campaign.updated_at || 0).getTime() -
            new Date(a.campaign.updated_at || 0).getTime()
          );
        });
    }
    return legacyTableRows;
  }, [
    usesAggregatedEndpoint,
    campaignTable,
    overviewById,
    legacyTableRows,
  ]);

  const showOverview =
    permissions.campaigns_read && overviewEnabled && campaignsData.length > 0;

  const pendingTaskCount = tasks.reduce((acc, t) => acc + t.count, 0);

  const [tasksPage, setTasksPage] = useState(1);
  const tasksTotalPages = Math.max(
    1,
    Math.ceil(tasks.length / TASKS_PAGE_SIZE),
  );

  useEffect(() => {
    setTasksPage((p) => Math.min(p, tasksTotalPages));
  }, [tasksTotalPages]);

  const paginatedTasks = useMemo(() => {
    const start = (tasksPage - 1) * TASKS_PAGE_SIZE;
    return tasks.slice(start, start + TASKS_PAGE_SIZE);
  }, [tasks, tasksPage]);

  const tasksRangeStart =
    tasks.length === 0 ? 0 : (tasksPage - 1) * TASKS_PAGE_SIZE + 1;
  const tasksRangeEnd = Math.min(
    tasksPage * TASKS_PAGE_SIZE,
    tasks.length,
  );

  if (isLoading) {
    return (
      <div className="w-full min-h-[calc(100vh-10rem)] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-primary-600 border-t-transparent" />
          <p className="text-neutral-600 text-sm">Carregando dashboard…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full min-h-[calc(100vh-10rem)] flex items-center justify-center px-4">
        <div className="w-full max-w-md flex flex-col items-center gap-6 text-center">
          <p className="text-xl font-semibold text-neutral-950">
            Erro ao carregar dashboard
          </p>
          <span className="text-neutral-600 text-sm">
            {error instanceof Error
              ? error.message
              : "Ocorreu um erro ao buscar os dados. Tente novamente."}
          </span>
          <Button onClick={() => window.location.reload()}>Tentar novamente</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto flex flex-col gap-8 pb-10">
      {/* Hero */}
      <header className="relative overflow-hidden rounded-3xl border border-neutral-200/90 bg-linear-to-br from-white via-white to-neutral-50/90 px-6 py-8 sm:px-10 shadow-sm">
        <div className="absolute -right-16 -top-16 size-56 rounded-full bg-primary-500/5 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-10 size-48 rounded-full bg-secondary-500/5 blur-3xl pointer-events-none" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2 max-w-xl">
            <p className="text-xs font-semibold uppercase tracking-wider text-primary-600">
              Workspace
            </p>
            <h1 className="text-2xl sm:text-3xl font-semibold text-neutral-950 tracking-tight">
              {selectedWorkspace?.name ?? "Dashboard"}
            </h1>
            <p className="text-neutral-600 text-sm leading-relaxed">
              Campanhas, métricas consolidadas e o que precisa da sua aprovação
              em um só lugar.
            </p>
            {usesAggregatedEndpoint && (
              <p className="text-xs text-neutral-500">
                Visão agregada carregada em uma única requisição ao servidor.
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-3 shrink-0">
            <Link to="/campaigns">
              <Button variant="outline" className="border-neutral-300 bg-white/80">
                <Icon name="LayoutGrid" color="#404040" size={16} />
                <span className="ml-2 text-neutral-800">Campanhas</span>
              </Button>
            </Link>
            <Link to="/campaigns/new">
              <Button>
                <Icon name="Plus" color="#FAFAFA" size={16} />
                <span className="ml-2">Nova campanha</span>
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Resumo rápido — contagem por status */}
      <section aria-label="Resumo de campanhas">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <QuickStat
            icon="Megaphone"
            label="Total"
            value={stats.total}
            accent="bg-neutral-900 text-white"
          />
          <QuickStat
            icon="Zap"
            label="Ativas"
            value={stats.active}
            accent="bg-emerald-600 text-white"
          />
          <QuickStat
            icon="CircleCheck"
            label="Finalizadas"
            value={stats.finished}
            accent="bg-teal-700 text-white"
          />
          <QuickStat
            icon="FilePenLine"
            label="Rascunhos"
            value={stats.draft}
            accent="bg-neutral-500 text-white"
          />
        </div>
      </section>

      {showOverview && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
          {/* Tarefas */}
          <section
            className="xl:col-span-5 rounded-3xl border border-neutral-200/90 bg-white p-6 shadow-sm"
            aria-labelledby="tasks-heading"
          >
            <div className="flex items-start justify-between gap-3 mb-5">
              <div>
                <h2
                  id="tasks-heading"
                  className="text-lg font-semibold text-neutral-950"
                >
                  Tarefas e aprovações
                </h2>
                <p className="text-sm text-neutral-500 mt-1">
                  {isOverviewLoading
                    ? "Carregando pendências…"
                    : pendingTaskCount > 0
                      ? `${pendingTaskCount} item(ns) aguardando revisão`
                      : "Nada pendente para você agora"}
                </p>
              </div>
              {!isOverviewLoading && pendingTaskCount > 0 && (
                <span className="shrink-0 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-900 tabular-nums">
                  {pendingTaskCount}
                </span>
              )}
            </div>

            {isOverviewLoading ? (
              <div className="flex flex-col gap-2">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-18 rounded-2xl bg-neutral-100 animate-pulse"
                  />
                ))}
              </div>
            ) : overviewHasError ? (
              <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200/80 rounded-2xl px-4 py-3">
                Não foi possível carregar todas as pendências. Abra a campanha
                nas abas de aprovação para conferir.
              </p>
            ) : tasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-14 text-center rounded-2xl bg-neutral-50/80 border border-dashed border-neutral-200">
                <div className="w-12 h-12 rounded-2xl bg-white border border-neutral-200 flex items-center justify-center shadow-sm">
                  <Icon name="CircleCheck" color="#22c55e" size={24} />
                </div>
                <p className="text-neutral-700 text-sm font-medium mt-4">
                  Tudo em dia
                </p>
                <p className="text-neutral-500 text-xs mt-1 max-w-[240px]">
                  Sem conteúdos, roteiros ou participantes aguardando sua ação.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <ul className="flex flex-col gap-2">
                  {paginatedTasks.map((task, idx) => (
                    <li
                      key={`${task.campaignId}-${task.kind}-${(tasksPage - 1) * TASKS_PAGE_SIZE + idx}`}
                    >
                      <Link
                        to="/campaigns/$campaignId"
                        params={{ campaignId: task.campaignId }}
                        search={{ tab: task.tab }}
                        className="group flex items-center gap-3 rounded-2xl border border-neutral-100 bg-neutral-50/40 p-4 transition-all hover:border-primary-200/60 hover:bg-primary-50/20 hover:shadow-sm"
                      >
                        <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-white border border-neutral-200/80 shadow-sm group-hover:border-primary-200/50">
                          <Icon
                            name={
                              task.kind === "content"
                                ? "Image"
                                : task.kind === "script"
                                  ? "FileText"
                                  : "Users"
                            }
                            color="#7c3aed"
                            size={20}
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-neutral-950 text-sm truncate">
                            {task.label}
                          </p>
                          <p className="text-xs text-neutral-500 truncate">
                            {task.campaignTitle}
                          </p>
                        </div>
                        <span className="shrink-0 tabular-nums text-sm font-semibold text-neutral-900 bg-white border border-neutral-200 px-2.5 py-1 rounded-lg">
                          {task.count}
                        </span>
                        <Icon
                          name="ChevronRight"
                          color="#a3a3a3"
                          size={18}
                          className="shrink-0 group-hover:text-primary-600 transition-colors"
                        />
                      </Link>
                    </li>
                  ))}
                </ul>
                {tasks.length > TASKS_PAGE_SIZE && (
                  <nav
                    className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between pt-1 border-t border-neutral-100"
                    aria-label="Paginação das tarefas"
                  >
                    <p className="text-xs text-neutral-500 tabular-nums">
                      {tasksRangeStart}–{tasksRangeEnd} de {tasks.length}
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        className="h-8 min-w-0 w-min rounded-xl text-xs border-neutral-200"
                        disabled={tasksPage <= 1}
                        onClick={() =>
                          setTasksPage((p) => Math.max(1, p - 1))
                        }
                      >
                        Anterior
                      </Button>
                      <span className="text-xs text-neutral-600 tabular-nums px-1 min-w-[4.5rem] text-center">
                        {tasksPage} / {tasksTotalPages}
                      </span>
                      <Button
                        type="button"
                        variant="outline"
                        className="h-8 min-w-0 w-min rounded-xl text-xs border-neutral-200"
                        disabled={tasksPage >= tasksTotalPages}
                        onClick={() =>
                          setTasksPage((p) =>
                            Math.min(tasksTotalPages, p + 1),
                          )
                        }
                      >Próxima
                      </Button>
                    </div>
                  </nav>
                )}
              </div>
            )}
          </section>

          {/* Métricas agregadas — bento */}
          <section
            className="xl:col-span-7 rounded-3xl border border-neutral-200/90 bg-white p-6 shadow-sm"
            aria-labelledby="metrics-heading"
          >
            <div className="mb-5">
              <h2
                id="metrics-heading"
                className="text-lg font-semibold text-neutral-950"
              >
                Métricas no workspace
              </h2>
              <p className="text-sm text-neutral-500 mt-1">
                Consolidado das campanhas (alcance somado, engajamento médio)
              </p>
            </div>
            {isOverviewLoading ? (
              <OverviewMetricsSkeleton />
            ) : overviewHasError ? (
              <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200/80 rounded-2xl px-4 py-3">
                Métricas agregadas indisponíveis. Use o painel de cada campanha
                para detalhes.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <BentoMetric
                  icon="Eye"
                  label="Alcance estimado"
                  value={aggregateMetrics.reach.toLocaleString("pt-BR")}
                  sub="Soma entre campanhas"
                />
                <BentoMetric
                  icon="TrendingUp"
                  label="Engajamento médio"
                  value={`${aggregateMetrics.engagement.toFixed(2)}%`}
                  sub="Média entre campanhas com métrica"
                />
                <BentoMetric
                  icon="Image"
                  label="Conteúdos publicados"
                  value={String(aggregateMetrics.publishedContent)}
                  sub="Total acumulado"
                />
                <BentoMetric
                  icon="Users"
                  label="Influenciadores ativos"
                  value={String(aggregateMetrics.activeInfluencers)}
                  sub="Em campanhas acompanhadas"
                />
              </div>
            )}
          </section>
        </div>
      )}

      {/* Tabela de campanhas */}
      <section
        className="rounded-3xl border border-neutral-200/90 bg-white shadow-sm overflow-hidden"
        aria-labelledby="campaigns-table-heading"
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 px-6 py-5 border-b border-neutral-100 bg-neutral-50/50">
          <div>
            <h2
              id="campaigns-table-heading"
              className="text-lg font-semibold text-neutral-950"
            >
              Campanhas
            </h2>
            <p className="text-sm text-neutral-500 mt-0.5">
              Status, alcance e pendências
            </p>
          </div>
          <Link
            to="/campaigns"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-primary-600 hover:text-primary-700 transition-colors"
          >
            Ver lista e filtros
            <Icon name="ArrowRight" color="currentColor" size={16} />
          </Link>
        </div>

        {displayedTableRows.length > 0 ? (
          <div className="overflow-x-auto max-h-[min(26rem,50vh)] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-white text-neutral-500 text-left text-xs font-medium uppercase tracking-wide sticky top-0 z-1 shadow-[0_1px_0_0_rgb(245_245_245)]">
                <tr>
                  <th className="px-6 py-3.5">Campanha</th>
                  <th className="px-4 py-3.5 whitespace-nowrap">Status</th>
                  {showOverview && (
                    <>
                      <th className="px-4 py-3.5 text-right whitespace-nowrap">
                        Alcance
                      </th>
                      <th className="px-4 py-3.5 text-right whitespace-nowrap">
                        Publicados
                      </th>
                      <th className="px-4 py-3.5 text-center whitespace-nowrap">
                        Pend.
                      </th>
                    </>
                  )}
                  <th className="px-6 py-3.5 w-12" aria-label="Abrir" />
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {displayedTableRows.map(({ campaign, overview, pendingTotal }) => {
                  const statusVal =
                    getCampaignStatusValue(campaign.status) ?? "";
                  return (
                    <tr
                      key={campaign.id}
                      className="hover:bg-neutral-50/80 transition-colors"
                    >
                      <td className="px-6 py-4 align-top">
                        <p className="font-medium text-neutral-950 leading-snug">
                          {campaign.title}
                        </p>
                        <p className="text-neutral-500 text-xs mt-1 line-clamp-2 max-w-md">
                          {campaign.description || "—"}
                        </p>
                      </td>
                      <td className="px-4 py-4 align-top whitespace-nowrap">
                        <StatusBadge status={statusVal} />
                      </td>
                      {showOverview && (
                        <>
                          <td className="px-4 py-4 text-right tabular-nums text-neutral-700 align-top">
                            {isOverviewLoading ? (
                              "—"
                            ) : (
                              (overview?.metrics.reach ?? 0).toLocaleString(
                                "pt-BR",
                              )
                            )}
                          </td>
                          <td className="px-4 py-4 text-right tabular-nums text-neutral-700 align-top">
                            {isOverviewLoading
                              ? "—"
                              : overview?.metrics.publishedContent ?? 0}
                          </td>
                          <td className="px-4 py-4 text-center align-top">
                            {isOverviewLoading ? (
                              <span className="text-neutral-400">—</span>
                            ) : pendingTotal > 0 ? (
                              <span className="inline-flex items-center justify-center min-w-7 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-900">
                                {pendingTotal}
                              </span>
                            ) : (
                              <span className="text-neutral-400 text-xs">0</span>
                            )}
                          </td>
                        </>
                      )}
                      <td className="px-6 py-4 align-top">
                        <Link
                          to="/campaigns/$campaignId"
                          params={{ campaignId: campaign.id }}
                          className="inline-flex rounded-lg p-1.5 text-primary-600 hover:bg-primary-50 transition-colors"
                          aria-label={`Abrir ${campaign.title}`}
                        >
                          <Icon name="ChevronRight" color="currentColor" size={20} />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 px-6">
            <div className="w-14 h-14 rounded-2xl bg-neutral-100 flex items-center justify-center">
              <Icon name="Inbox" color="#a3a3a3" size={28} />
            </div>
            <p className="text-neutral-600 mt-4 text-center text-sm">
              Nenhuma campanha neste workspace
            </p>
            <Link to="/campaigns/new" className="mt-5">
              <Button>
                <span className="text-neutral-50 font-semibold">
                  Criar primeira campanha
                </span>
              </Button>
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}

function QuickStat({
  icon,
  label,
  value,
  accent,
}: {
  icon: ComponentProps<typeof Icon>["name"];
  label: string;
  value: number;
  accent: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-neutral-200/80 bg-white p-4 shadow-sm">
      <div
        className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${accent}`}
      >
        <Icon name={icon} color="currentColor" size={18} className="text-inherit" />
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-semibold text-neutral-950 tabular-nums leading-none">
          {value}
        </p>
        <p className="text-xs text-neutral-500 mt-1 font-medium">{label}</p>
      </div>
    </div>
  );
}

function BentoMetric({
  icon,
  label,
  value,
  sub,
}: {
  icon: ComponentProps<typeof Icon>["name"];
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="rounded-2xl border border-neutral-100 bg-linear-to-br from-neutral-50/90 to-white p-5 flex gap-4">
      <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white border border-neutral-200/80 shadow-sm">
        <Icon name={icon} color="#7c3aed" size={20} />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-neutral-500 uppercase tracking-wide">
          {label}
        </p>
        <p className="text-xl font-semibold text-neutral-950 tabular-nums mt-1">
          {value}
        </p>
        <p className="text-xs text-neutral-400 mt-1">{sub}</p>
      </div>
    </div>
  );
}

function OverviewMetricsSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="rounded-2xl border border-neutral-100 p-5 bg-neutral-50/50"
        >
          <div className="h-4 w-24 bg-neutral-200/80 rounded animate-pulse mb-3" />
          <div className="h-8 w-20 bg-neutral-200/80 rounded animate-pulse" />
        </div>
      ))}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const statusConfig = {
    active: { label: "Ativa", color: "bg-secondary-100 text-secondary-800" },
    published: {
      label: "Publicado",
      color: "bg-success-100 text-success-800",
    },
    finished: { label: "Finalizada", color: "bg-success-50 text-success-600" },
    completed: {
      label: "Finalizada",
      color: "bg-success-50 text-success-600",
    },
    draft: { label: "Rascunho", color: "bg-neutral-200 text-neutral-700" },
  };

  const statusString =
    typeof status === "string" ? status : String(status || "");

  const config = statusConfig[statusString as keyof typeof statusConfig] || {
    label: getCampaignStatusDisplayLabel(statusString),
    color: "bg-neutral-200 text-neutral-700",
  };

  const labelText =
    typeof config.label === "string"
      ? config.label
      : String(config.label || "");

  return (
    <span
      className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${config.color}`}
    >
      {labelText}
    </span>
  );
}
