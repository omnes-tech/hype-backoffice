import { useState } from "react";

import { Link } from "@tanstack/react-router";
import { clsx } from "clsx";

import { Icon } from "@/components/ui/icon";
import { useCampaignConsumption } from "@/hooks/use-balance-movements";
import { getUploadUrl } from "@/lib/utils/api";
import type {
  CampaignConsumptionItem,
  CampaignStatus,
  PaymentMethod,
} from "@/shared/services/balance-movements";

/**
 * Consumo de saldo por campanha.
 *
 * Permite filtrar por status (default `active`) e método de pagamento.
 * Cada linha leva para a página de detalhes da campanha. Mostra barra de
 * progresso `spent/max_budget` para leitura rápida do quanto já gastou.
 */

const STATUS_FILTERS: { value: CampaignStatus; label: string }[] = [
  { value: "active", label: "Ativas" },
  { value: "finished", label: "Finalizadas" },
  { value: "all", label: "Todas" },
];

const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  fixed: "Fixo",
  price: "Valor do influencer",
  cpm: "CPM",
  cpa: "CPA",
  swap: "Permuta",
};

const PAYMENT_METHOD_BADGE: Record<PaymentMethod, string> = {
  fixed: "bg-primary-600/10 text-primary-700",
  price: "bg-primary-600/10 text-primary-700",
  cpm: "bg-amber-100 text-amber-800",
  cpa: "bg-purple-100 text-purple-800",
  swap: "bg-neutral-200/60 text-neutral-700",
};

const formatBRL = (cents: number): string =>
  (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  });

export function CampaignConsumptionSection() {
  const [status, setStatus] = useState<CampaignStatus>("active");

  const query = useCampaignConsumption({ status });
  const items = query.data?.items ?? [];
  const totals = query.data?.totals;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setStatus(f.value)}
              className={clsx(
                "px-3 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer",
                status === f.value
                  ? "bg-neutral-950 text-white"
                  : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
        {totals && totals.campaign_count > 0 && (
          <div className="text-xs text-neutral-500">
            <span className="font-medium text-neutral-700 tabular-nums">
              {totals.campaign_count}
            </span>{" "}
            campanha{totals.campaign_count === 1 ? "" : "s"} ·{" "}
            <span className="font-medium text-amber-700 tabular-nums">
              {formatBRL(totals.committed_cents)}
            </span>{" "}
            reservado
          </div>
        )}
      </div>

      <div className="border border-neutral-200 rounded-2xl overflow-hidden bg-white">
        {query.isLoading ? (
          <div className="p-6 space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-16 rounded-xl bg-neutral-100 animate-pulse"
              />
            ))}
          </div>
        ) : query.error ? (
          <ErrorState message={query.error.message} />
        ) : items.length === 0 ? (
          <EmptyState />
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 text-xs uppercase tracking-wider text-neutral-500 border-b border-neutral-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Campanha</th>
                <th className="text-center px-4 py-3 font-medium">Modalidade</th>
                <th className="text-right px-4 py-3 font-medium">Reservado</th>
                <th className="text-right px-4 py-3 font-medium">Gasto</th>
                <th className="text-left px-4 py-3 font-medium w-[200px]">
                  Orçamento
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((it) => (
                <CampaignRow key={it.campaign_id} item={it} />
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// CampaignRow
// ---------------------------------------------------------------------------

function CampaignRow({ item }: { item: CampaignConsumptionItem }) {
  const bannerUrl = getUploadUrl(item.banner_url ?? undefined);
  const budget = item.max_budget_cents ?? 0;
  const spentPct =
    budget > 0 ? Math.min(100, Math.round((item.spent_cents / budget) * 100)) : 0;

  return (
    <tr className="border-b border-neutral-100 last:border-b-0 hover:bg-neutral-50/50">
      <td className="px-4 py-3">
        <Link
          to="/campaigns/$campaignId"
          params={{ campaignId: item.campaign_public_id }}
          className="flex items-center gap-3 group"
        >
          {bannerUrl ? (
            <img
              src={bannerUrl}
              alt={item.title}
              className="w-10 h-10 rounded-lg object-cover shrink-0 border border-neutral-200"
            />
          ) : (
            <div className="w-10 h-10 rounded-lg bg-neutral-100 flex items-center justify-center shrink-0">
              <Icon name="Megaphone" size={14} color="#737373" />
            </div>
          )}
          <div className="min-w-0">
            <p className="font-medium text-neutral-950 leading-tight truncate group-hover:text-primary-600 transition-colors">
              {item.title}
            </p>
            <p className="text-xs text-neutral-500 leading-tight">
              {item.influencers.active} ativo
              {item.influencers.active === 1 ? "" : "s"} ·{" "}
              {item.influencers.total} total
            </p>
          </div>
        </Link>
      </td>
      <td className="px-4 py-3 flex items-center justify-center">
        <span
          className={clsx(
            "px-2 py-0.5 rounded-md text-xs text-center font-medium whitespace-nowrap",
            PAYMENT_METHOD_BADGE[item.payment_method],
          )}
        >
          {PAYMENT_METHOD_LABEL[item.payment_method]}
        </span>
      </td>
      <td className="px-4 py-3 text-right font-semibold tabular-nums text-amber-700 whitespace-nowrap">
        {formatBRL(item.committed_cents)}
      </td>
      <td className="px-4 py-3 text-right font-medium tabular-nums text-neutral-950 whitespace-nowrap">
        {formatBRL(item.spent_cents)}
      </td>
      <td className="px-4 py-3">
        {budget > 0 ? (
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
            <div className="flex items-center justify-between">
              <span className="text-xs text-neutral-500 tabular-nums">
                {spentPct}%
              </span>
              <span className="text-xs text-neutral-500 tabular-nums">
                de {formatBRL(budget)}
              </span>
            </div>
          </div>
        ) : (
          <span className="text-xs text-neutral-400">Sem teto</span>
        )}
      </td>
    </tr>
  );
}

// ---------------------------------------------------------------------------
// Empty / Error
// ---------------------------------------------------------------------------

function EmptyState() {
  return (
    <div className="p-10 flex flex-col items-center gap-3 text-center">
      <div className="w-12 h-12 rounded-full bg-neutral-100 flex items-center justify-center">
        <Icon name="Megaphone" size={20} color="#737373" />
      </div>
      <div>
        <p className="text-sm font-medium text-neutral-950">
          Nenhuma campanha consumindo saldo
        </p>
        <p className="text-xs text-neutral-500 mt-1">
          Campanhas com reservas ativas vão aparecer aqui.
        </p>
      </div>
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="p-6 flex items-start gap-3 bg-danger-500/5">
      <Icon name="CircleAlert" size={18} color="#dc2626" className="mt-0.5" />
      <div>
        <p className="text-sm font-medium text-danger-500">
          Erro ao carregar consumo
        </p>
        <p className="text-xs text-neutral-600 mt-1">{message}</p>
      </div>
    </div>
  );
}
