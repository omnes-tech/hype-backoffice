import { Link } from "@tanstack/react-router";
import { clsx } from "clsx";

import { Icon } from "@/components/ui/icon";
import { useCpmSpend } from "@/hooks/use-balance-movements";
import type { CpmCampaignSpend } from "@/shared/services/balance-movements";

/**
 * Gasto atualizado das campanhas CPM.
 *
 * Cards (não tabela) — cada campanha tem múltiplas métricas heterogêneas
 * (CPM rate, views, janela de tracking) que ficam melhor visualmente em
 * cards. Tabela só fica boa quando há ≥5 colunas comparáveis.
 *
 * Publications expandidas via `?expand=publications` ficam para um drill-down
 * futuro — por ora, mostra apenas o resumo (`active_publications` /
 * `expired_publications`).
 */

const formatBRL = (cents: number): string =>
  (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  });

const formatInt = (n: number): string =>
  n.toLocaleString("pt-BR", { maximumFractionDigits: 0 });

const formatRelativeWindow = (iso: string | null): string => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const ms = d.getTime() - Date.now();
  const days = Math.round(ms / (1000 * 60 * 60 * 24));
  if (days < 0) return "encerrada";
  if (days === 0) return "hoje";
  if (days === 1) return "em 1 dia";
  return `em ${days} dias`;
};

export function CpmSpendSection() {
  const query = useCpmSpend();
  const items = query.data?.items ?? [];

  if (query.isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {Array.from({ length: 2 }).map((_, i) => (
          <div
            key={i}
            className="rounded-2xl border border-neutral-200 bg-white p-5 h-48 animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (query.error) {
    return (
      <div className="rounded-2xl border border-danger-500/30 bg-danger-500/5 p-6 flex items-start gap-3">
        <Icon name="CircleAlert" size={18} color="#dc2626" className="mt-0.5" />
        <div>
          <p className="text-sm font-medium text-danger-500">
            Erro ao carregar gastos CPM
          </p>
          <p className="text-xs text-neutral-600 mt-1">
            {query.error.message}
          </p>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-neutral-200 bg-white p-10 flex flex-col items-center gap-3 text-center">
        <div className="w-12 h-12 rounded-full bg-neutral-100 flex items-center justify-center">
          <Icon name="ChartLine" size={20} color="#737373" />
        </div>
        <div>
          <p className="text-sm font-medium text-neutral-950">
            Nenhuma campanha CPM com publicações ativas
          </p>
          <p className="text-xs text-neutral-500 mt-1">
            Campanhas no modelo CPM com publicações dentro da janela de 7 dias
            vão aparecer aqui.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
      {items.map((it) => (
        <CpmCampaignCard key={it.campaign_id} item={it} />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// CpmCampaignCard
// ---------------------------------------------------------------------------

function CpmCampaignCard({ item }: { item: CpmCampaignSpend }) {
  const { totals, tracking_window: tw } = item;
  const budgetTotal = totals.spent_cents + totals.remaining_budget_cents;
  const spentPct =
    budgetTotal > 0
      ? Math.min(100, Math.round((totals.spent_cents / budgetTotal) * 100))
      : 0;

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-5 flex flex-col gap-4">
      <header className="flex items-start justify-between gap-3">
        <Link
          to="/campaigns/$campaignId"
          params={{ campaignId: item.campaign_public_id }}
          className="min-w-0 group"
        >
          <p className="text-sm font-semibold text-neutral-950 leading-tight truncate group-hover:text-primary-600 transition-colors">
            {item.title}
          </p>
          <p className="text-xs text-neutral-500 mt-0.5">
            CPM {formatBRL(item.cpm_rate_cents)} por 1.000 views
          </p>
        </Link>
        <span
          className={clsx(
            "px-2 py-0.5 rounded-md text-xs font-medium whitespace-nowrap shrink-0",
            item.status === "active"
              ? "bg-success-500/10 text-success-500"
              : "bg-neutral-200/60 text-neutral-700",
          )}
        >
          {item.status === "active" ? "Ativa" : "Finalizada"}
        </span>
      </header>

      <div className="grid grid-cols-2 gap-3">
        <Metric
          label="Views contabilizadas"
          value={formatInt(totals.views_billable)}
          hint={
            totals.views_tracked !== totals.views_billable
              ? `${formatInt(totals.views_tracked)} brutas`
              : undefined
          }
        />
        <Metric
          label="Gasto acumulado"
          value={formatBRL(totals.spent_cents)}
          tone="danger"
        />
        <Metric
          label="Reservado"
          value={formatBRL(totals.committed_cents)}
          tone="warning"
        />
        <Metric
          label="Orçamento restante"
          value={formatBRL(totals.remaining_budget_cents)}
          tone="success"
        />
      </div>

      {budgetTotal > 0 && (
        <div className="flex flex-col gap-1">
          <div className="h-1.5 rounded-full bg-neutral-100 overflow-hidden">
            <div
              className={clsx(
                "h-full rounded-full transition-all",
                spentPct >= 90
                  ? "bg-danger-500"
                  : spentPct >= 70
                  ? "bg-amber-500"
                  : "bg-success-500",
              )}
              style={{ width: `${spentPct}%` }}
            />
          </div>
          <span className="text-xs text-neutral-500 tabular-nums">
            {spentPct}% consumido
          </span>
        </div>
      )}

      <footer className="border-t border-neutral-100 pt-3 flex items-center justify-between text-xs text-neutral-500">
        <div className="flex items-center gap-1.5">
          <Icon name="Clock" size={12} color="#737373" />
          <span>
            {tw.active_publications} ativa{tw.active_publications === 1 ? "" : "s"}
            {tw.expired_publications > 0 &&
              ` · ${tw.expired_publications} encerrada${tw.expired_publications === 1 ? "" : "s"}`}
          </span>
        </div>
        <span>
          Próx. fim:{" "}
          <span className="font-medium text-neutral-700">
            {formatRelativeWindow(tw.earliest_window_end)}
          </span>
        </span>
      </footer>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Metric
// ---------------------------------------------------------------------------

type MetricTone = "default" | "warning" | "success" | "danger";

interface MetricProps {
  label: string;
  value: string;
  hint?: string;
  tone?: MetricTone;
}

const TONE_COLOR: Record<MetricTone, string> = {
  default: "text-neutral-950",
  warning: "text-amber-700",
  success: "text-success-600",
  danger: "text-danger-500",
};

function Metric({ label, value, hint, tone = "default" }: MetricProps) {
  return (
    <div className="flex flex-col">
      <span className="text-xs text-neutral-500 uppercase tracking-wider font-medium">
        {label}
      </span>
      <span
        className={clsx(
          "text-base font-semibold tabular-nums mt-0.5",
          TONE_COLOR[tone],
        )}
      >
        {value}
      </span>
      {hint && (
        <span className="text-xs text-neutral-400 leading-tight">{hint}</span>
      )}
    </div>
  );
}
