import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";

import { AdminKpiCard } from "@/components/admin/admin-kpi-card";
import {
  AdminPeriodFilter,
  computePeriodFromPreset,
  type AdminPeriodPreset,
} from "@/components/admin/admin-period-filter";
import { AdminNicheChart } from "@/components/admin/admin-niche-chart";
import { AdminSizeChart } from "@/components/admin/admin-size-chart";
import { AdminCampaignsEvolutionChart } from "@/components/admin/admin-campaigns-evolution-chart";
import { AdminFinancialVolumeChart } from "@/components/admin/admin-financial-volume-chart";
import { AdminWorkspacesRanking } from "@/components/admin/admin-workspaces-ranking";
import { AdminSaasCard } from "@/components/admin/admin-saas-card";
import {
  useAdminCampaignsStats,
  useAdminCreatorsStats,
  useAdminDashboardSummary,
  useAdminFinancialStats,
  useAdminNicheDistribution,
  useAdminSaasMetrics,
  useAdminSizeDistribution,
  useAdminWorkspaceRanking,
} from "@/hooks/use-admin-dashboard";
import { formatReais } from "@/shared/utils/masks";
import type { AdminWorkspaceRankingSort } from "@/shared/services/admin-dashboard";

export const Route = createFileRoute(
  "/(private)/(admin)/admin/dashboard" as "/(private)/(admin)/admin/dashboard",
)({
  component: SuperAdminDashboard,
});

const NUMBER_FORMATTER = new Intl.NumberFormat("pt-BR");
const PERCENT_FORMATTER = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

function formatNumber(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return NUMBER_FORMATTER.format(value);
}

function formatPercent(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return `${PERCENT_FORMATTER.format(value)}%`;
}

function formatBRL(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return `R$ ${formatReais(value)}`;
}

function SuperAdminDashboard() {
  const [preset, setPreset] = useState<AdminPeriodPreset>("30d");
  const [period, setPeriod] = useState(
    () => computePeriodFromPreset("30d") ?? { from: "", to: "" },
  );
  const [rankingSort, setRankingSort] =
    useState<AdminWorkspaceRankingSort>("campaigns");

  const summary = useAdminDashboardSummary(period);
  const creatorsStats = useAdminCreatorsStats(period, "week");
  const nicheDist = useAdminNicheDistribution(period, 8);
  const sizeDist = useAdminSizeDistribution(period);
  const campaignsStats = useAdminCampaignsStats(period, "month");
  const financialStats = useAdminFinancialStats(period, "month");
  const saasMetrics = useAdminSaasMetrics(period);
  const ranking = useAdminWorkspaceRanking(period, rankingSort, 10);

  const handlePeriodChange = (
    nextPeriod: typeof period,
    nextPreset: AdminPeriodPreset,
  ) => {
    setPeriod(nextPeriod);
    setPreset(nextPreset);
  };

  const creators = summary.data?.creators ?? creatorsStats.data;
  const campaigns = summary.data?.campaigns ?? campaignsStats.data;
  const financial = summary.data?.financial ?? financialStats.data;

  const isLoadingKpis = summary.isLoading || creatorsStats.isLoading;

  const saasCards = useMemo(
    () => [
      {
        emoji: "📉",
        name: "Churn de workspaces",
        value: formatPercent(saasMetrics.data?.churn_rate),
        description:
          "Workspaces que deixaram de ter campanhas ativas nos últimos 30 dias.",
        severity: "critical" as const,
      },
      {
        emoji: "💰",
        name: "LTV estimado",
        value: formatBRL(saasMetrics.data?.ltv_estimate),
        description:
          "Valor total que um workspace gera ao longo do ciclo de vida. Estimativa baseada no histórico de aportes.",
        severity: "important" as const,
      },
      {
        emoji: "📊",
        name: "ARPU",
        value: formatBRL(saasMetrics.data?.arpu),
        description:
          "Receita média por workspace ativo no período (taxas + comissões).",
        severity: "important" as const,
      },
      {
        emoji: "🎯",
        name: "Ticket médio por campanha",
        value: formatBRL(saasMetrics.data?.avg_ticket_per_campaign),
        description:
          "Volume médio movimentado por campanha finalizada no período.",
        severity: "important" as const,
      },
      {
        emoji: "🔁",
        name: "NRR",
        value: formatPercent(saasMetrics.data?.nrr),
        description:
          "Retenção líquida de receita. Acima de 100% indica crescimento sem novos clientes.",
        severity: "critical" as const,
      },
      {
        emoji: "⚡",
        name: "Ativação de novos clientes",
        value: formatPercent(saasMetrics.data?.activation_rate_new_clients),
        description:
          "% de novos workspaces que publicaram ≥1 campanha em até 30 dias do cadastro.",
        severity: "info" as const,
      },
      {
        emoji: "📅",
        name: "Customer lifetime médio",
        value:
          saasMetrics.data?.avg_customer_lifetime_days != null
            ? `${formatNumber(saasMetrics.data.avg_customer_lifetime_days)} dias`
            : "—",
        description:
          "Tempo médio entre a criação e a última atividade de um workspace.",
        severity: "info" as const,
      },
    ],
    [saasMetrics.data],
  );

  return (
    <div className="flex flex-col gap-8 pb-12">
      <AdminPeriodFilter
        period={period}
        preset={preset}
        onChange={handlePeriodChange}
      />

      <div className="flex flex-col gap-8 px-6">
        {/* Bloco B — Criadores & Base */}
        <section className="flex flex-col gap-4">
          <h2 className="text-lg font-semibold text-neutral-900">
            Criadores & base
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <AdminKpiCard
              label="Total de criadores"
              icon="Users"
              value={formatNumber(creators?.total)}
              isLoading={isLoadingKpis}
            />
            <AdminKpiCard
              label="Novos no período"
              icon="UserPlus"
              value={formatNumber(creators?.new_in_period)}
              isLoading={isLoadingKpis}
            />
            <AdminKpiCard
              label="Ativos no período"
              icon="Activity"
              value={formatNumber(creators?.active_in_period)}
              hint="Participaram de ≥1 campanha"
              isLoading={isLoadingKpis}
            />
            <AdminKpiCard
              label="Redes sociais cadastradas"
              icon="Share2"
              value={formatNumber(creators?.total_social_networks)}
              isLoading={isLoadingKpis}
            />
            <AdminKpiCard
              label="Média de redes por criador"
              icon="Link2"
              value={
                creators?.avg_networks_per_creator != null
                  ? creators.avg_networks_per_creator.toFixed(2)
                  : "—"
              }
              isLoading={isLoadingKpis}
            />
            <AdminKpiCard
              label="Taxa de ativação"
              icon="TrendingUp"
              value={formatPercent(creators?.activation_rate)}
              hint="Ativos / total · meta >40%"
              isLoading={isLoadingKpis}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="flex flex-col gap-3 rounded-2xl border border-neutral-200 bg-white p-5">
              <h3 className="text-sm font-semibold text-neutral-900">
                Distribuição por nichos
              </h3>
              <AdminNicheChart
                data={nicheDist.data}
                isLoading={nicheDist.isLoading}
                isError={nicheDist.isError}
              />
            </div>
            <div className="flex flex-col gap-3 rounded-2xl border border-neutral-200 bg-white p-5">
              <h3 className="text-sm font-semibold text-neutral-900">
                Classificação por tamanho
              </h3>
              <AdminSizeChart
                data={sizeDist.data}
                isLoading={sizeDist.isLoading}
                isError={sizeDist.isError}
              />
            </div>
          </div>
        </section>

        {/* Bloco C — Campanhas */}
        <section className="flex flex-col gap-4">
          <h2 className="text-lg font-semibold text-neutral-900">Campanhas</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <AdminKpiCard
              label="Total"
              icon="Megaphone"
              value={formatNumber(campaigns?.total)}
              isLoading={campaignsStats.isLoading}
            />
            <AdminKpiCard
              label="Ativas"
              icon="Radio"
              value={formatNumber(campaigns?.active)}
              isLoading={campaignsStats.isLoading}
            />
            <AdminKpiCard
              label="Finalizadas"
              icon="CircleCheck"
              value={formatNumber(campaigns?.finished)}
              isLoading={campaignsStats.isLoading}
            />
            <AdminKpiCard
              label="Rascunhos"
              icon="FilePen"
              value={formatNumber(campaigns?.draft)}
              isLoading={campaignsStats.isLoading}
            />
            <AdminKpiCard
              label="Criadas no período"
              icon="Plus"
              value={formatNumber(campaigns?.created_in_period)}
              isLoading={campaignsStats.isLoading}
            />
            <AdminKpiCard
              label="Média de influenciadores"
              icon="UsersRound"
              value={
                campaigns?.avg_influencers_per_campaign != null
                  ? campaigns.avg_influencers_per_campaign.toFixed(1)
                  : "—"
              }
              isLoading={campaignsStats.isLoading}
            />
            <AdminKpiCard
              label="Workspaces ativos"
              icon="Building2"
              value={formatNumber(campaigns?.workspaces_with_active_campaigns)}
              hint="Com campanhas ativas agora"
              isLoading={campaignsStats.isLoading}
            />
            <AdminKpiCard
              label="Conversão rascunho → ativo"
              icon="ArrowUpRight"
              value={formatPercent(campaigns?.draft_to_active_rate)}
              isLoading={campaignsStats.isLoading}
            />
          </div>

          <div className="flex flex-col gap-3 rounded-2xl border border-neutral-200 bg-white p-5">
            <h3 className="text-sm font-semibold text-neutral-900">
              Evolução de campanhas por período
            </h3>
            <AdminCampaignsEvolutionChart
              data={campaignsStats.data?.evolution}
              isLoading={campaignsStats.isLoading}
              isError={campaignsStats.isError}
            />
          </div>
        </section>

        {/* Bloco D — Financeiro */}
        <section className="flex flex-col gap-4">
          <h2 className="text-lg font-semibold text-neutral-900">Financeiro</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <AdminKpiCard
              label="Saldo em custódia"
              icon="Lock"
              value={formatBRL(financial?.custody_balance)}
              hint="Tempo real · sem filtro de período"
              isLoading={financialStats.isLoading}
            />
            <AdminKpiCard
              label="Volume movimentado"
              icon="ArrowLeftRight"
              value={formatBRL(financial?.total_volume_in_period)}
              isLoading={financialStats.isLoading}
            />
            <AdminKpiCard
              label="Pago a criadores"
              icon="HandCoins"
              value={formatBRL(financial?.paid_to_creators)}
              isLoading={financialStats.isLoading}
            />
            <AdminKpiCard
              label="Aportado por clientes"
              icon="PiggyBank"
              value={formatBRL(financial?.total_deposits)}
              isLoading={financialStats.isLoading}
            />
            <AdminKpiCard
              label="Receita de taxas"
              icon="Percent"
              value={formatBRL(financial?.platform_fees)}
              isLoading={financialStats.isLoading}
            />
            <AdminKpiCard
              label="Pagamentos pendentes"
              icon="Clock"
              value={formatBRL(financial?.pending_payments)}
              hint="Obrigação financeira aberta"
              isLoading={financialStats.isLoading}
            />
          </div>

          <div className="flex flex-col gap-3 rounded-2xl border border-neutral-200 bg-white p-5">
            <h3 className="text-sm font-semibold text-neutral-900">
              Volume movimentado ao longo do tempo
            </h3>
            <AdminFinancialVolumeChart
              data={financialStats.data?.volume_series}
              isLoading={financialStats.isLoading}
              isError={financialStats.isError}
            />
          </div>
        </section>

        {/* Bloco E — SaaS */}
        <section className="flex flex-col gap-4">
          <h2 className="text-lg font-semibold text-neutral-900">
            Métricas de negócio (SaaS)
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {saasCards.map((c) => (
              <AdminSaasCard
                key={c.name}
                emoji={c.emoji}
                name={c.name}
                value={c.value}
                description={c.description}
                severity={c.severity}
                isLoading={saasMetrics.isLoading}
              />
            ))}
          </div>
        </section>

        {/* Ranking */}
        <section>
          <AdminWorkspacesRanking
            data={ranking.data}
            isLoading={ranking.isLoading}
            isError={ranking.isError}
            sortBy={rankingSort}
            onSortChange={setRankingSort}
          />
        </section>
      </div>
    </div>
  );
}
