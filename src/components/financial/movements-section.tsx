import { useState } from "react";

import { clsx } from "clsx";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { SocialNetworkIcon } from "@/components/social-network-icon";
import { useMovements } from "@/hooks/use-balance-movements";
import { getUploadUrl } from "@/lib/utils/api";
import { getNetworkLabel } from "@/shared/constants/network-labels";
import type {
  BalanceMovement,
  MovementType,
  PaymentMethod,
} from "@/shared/services/balance-movements";

/**
 * Histórico de movimentações de saldo.
 *
 * Paginação cursor (useInfiniteQuery). Cada item é renderizado como card com
 * o contexto completo do movimento (campanha + influenciador + rede + ator).
 * Os campos enriquecidos vêm via JOIN server-side — ver
 * `docs/api-financial-movements-enriched.md`. Quando ausentes, a UI cai num
 * fallback elegante sem quebrar (campos legados continuam funcionando).
 */

const TYPE_FILTERS: { value: MovementType | "all"; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "top_up_confirmed", label: "Depósitos" },
  { value: "reserve_created", label: "Reservas" },
  { value: "reserve_cancelled", label: "Devoluções" },
  { value: "payout", label: "Pagamentos" },
  { value: "adjustment_credit", label: "Ajustes (+)" },
  { value: "adjustment_debit", label: "Ajustes (−)" },
];

const TYPE_BADGE: Record<MovementType, { bg: string; text: string; label: string }> = {
  top_up_pending: { bg: "bg-amber-100", text: "text-amber-800", label: "PIX pendente" },
  top_up_confirmed: { bg: "bg-success-500/10", text: "text-success-500", label: "Depósito" },
  top_up_expired: { bg: "bg-neutral-200/60", text: "text-neutral-700", label: "PIX expirado" },
  top_up_refunded: { bg: "bg-danger-500/10", text: "text-danger-500", label: "Estorno" },
  reserve_created: { bg: "bg-primary-600/10", text: "text-primary-700", label: "Reserva" },
  reserve_released: { bg: "bg-neutral-100", text: "text-neutral-700", label: "Liberação" },
  reserve_cancelled: { bg: "bg-success-500/10", text: "text-success-500", label: "Devolução" },
  adjustment_credit: { bg: "bg-success-500/10", text: "text-success-500", label: "Ajuste (+)" },
  adjustment_debit: { bg: "bg-danger-500/10", text: "text-danger-500", label: "Ajuste (−)" },
  payout: { bg: "bg-primary-600/10", text: "text-primary-700", label: "Pagamento" },
};

const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  fixed: "Valor fixo",
  cpm: "CPM",
  cpa: "CPA",
  swap: "Permuta",
  price: "Por entrega",
};

const formatBRL = (cents: number): string =>
  (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  });

const formatDateTime = (iso: string): string => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export function MovementsSection() {
  const [selectedType, setSelectedType] = useState<MovementType | "all">("all");

  const filters =
    selectedType === "all" ? {} : { type: [selectedType] };

  const query = useMovements(filters);
  const items = query.data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        {TYPE_FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => setSelectedType(f.value)}
            className={clsx(
              "px-3 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer",
              selectedType === f.value
                ? "bg-neutral-950 text-white"
                : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="border border-neutral-200 rounded-2xl overflow-hidden bg-white">
        {query.isLoading ? (
          <div className="p-4 space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="h-20 rounded-xl bg-neutral-100 animate-pulse"
              />
            ))}
          </div>
        ) : query.error ? (
          <ErrorState message={query.error.message} />
        ) : items.length === 0 ? (
          <EmptyState />
        ) : (
          <ul className="divide-y divide-neutral-100">
            {items.map((m) => (
              <MovementCard key={m.id} movement={m} />
            ))}
          </ul>
        )}
      </div>

      {query.hasNextPage && (
        <div className="flex justify-center pt-2">
          <Button
            variant="outline"
            onClick={() => query.fetchNextPage()}
            disabled={query.isFetchingNextPage}
          >
            {query.isFetchingNextPage ? "Carregando…" : "Carregar mais"}
          </Button>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// MovementCard — linha rica com contexto do movimento
// ---------------------------------------------------------------------------

function MovementCard({ movement }: { movement: BalanceMovement }) {
  const badge = TYPE_BADGE[movement.type];
  const isPositive = movement.amount_cents > 0;
  const isNegative = movement.amount_cents < 0;
  const r = movement.related;

  const hasCampaign = !!(r.campaign_title || r.campaign_id);
  const hasInfluencer = !!(r.influencer_name || r.influencer_username);
  const hasSocialNetwork = !!r.social_network;

  return (
    <li className="px-4 py-3.5 hover:bg-neutral-50/60 transition-colors">
      <div className="flex items-start justify-between gap-4">
        {/* Coluna principal */}
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          {/* Linha 1: tipo + data */}
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={clsx(
                "px-2 py-0.5 rounded-md text-xs font-medium whitespace-nowrap",
                badge.bg,
                badge.text,
              )}
            >
              {badge.label}
            </span>
            <span className="text-xs text-neutral-500 tabular-nums whitespace-nowrap">
              {formatDateTime(movement.occurred_at)}
            </span>
          </div>

          {/* Linha 2: descrição */}
          {movement.description && (
            <p className="text-sm text-neutral-800 leading-snug">
              {movement.description}
            </p>
          )}

          {/* Linha 3: campanha */}
          {hasCampaign && (
            <CampaignChip
              title={r.campaign_title}
              fallbackId={r.campaign_id}
              bannerUrl={r.campaign_banner_url}
              paymentMethod={r.campaign_payment_method}
            />
          )}

          {/* Linha 4: influenciador + rede */}
          {(hasInfluencer || hasSocialNetwork) && (
            <InfluencerChip
              name={r.influencer_name}
              username={r.influencer_username}
              avatar={r.influencer_avatar}
              socialNetwork={r.social_network}
              socialNetworkLabel={r.social_network_label}
              contentType={r.content_type}
            />
          )}

          {/* Linha 5: ator */}
          {movement.actor.name && movement.actor.type === "user" && (
            <p className="text-xs text-neutral-500 leading-tight">
              por {movement.actor.name}
            </p>
          )}
        </div>

        {/* Coluna direita: valor */}
        <div
          className={clsx(
            "text-right font-semibold tabular-nums whitespace-nowrap shrink-0",
            isPositive && "text-success-600",
            isNegative && "text-danger-500",
            !isPositive && !isNegative && "text-neutral-500",
          )}
        >
          {isPositive ? "+" : ""}
          {formatBRL(movement.amount_cents)}
        </div>
      </div>
    </li>
  );
}

// ---------------------------------------------------------------------------
// CampaignChip — banner + título + método de pagamento
// ---------------------------------------------------------------------------

interface CampaignChipProps {
  title: string | null | undefined;
  fallbackId: number | null;
  bannerUrl: string | null | undefined;
  paymentMethod: PaymentMethod | null | undefined;
}

function CampaignChip({
  title,
  fallbackId,
  bannerUrl,
  paymentMethod,
}: CampaignChipProps) {
  const displayTitle =
    title?.trim() || (fallbackId != null ? `Campanha #${fallbackId}` : "—");
  const bannerSrc = getUploadUrl(bannerUrl);

  return (
    <div className="flex items-center gap-2 text-xs">
      {bannerSrc ? (
        <img
          src={bannerSrc}
          alt=""
          loading="lazy"
          className="size-6 rounded-md object-cover bg-neutral-100"
        />
      ) : (
        <div className="size-6 rounded-md bg-primary-50 flex items-center justify-center shrink-0">
          <Icon name="Megaphone" size={12} color="#7c3aed" />
        </div>
      )}
      <span className="text-neutral-700 truncate font-medium">
        {displayTitle}
      </span>
      {paymentMethod && (
        <span className="px-1.5 py-0.5 rounded bg-neutral-100 text-neutral-600 text-[10px] font-medium uppercase tracking-wide whitespace-nowrap">
          {PAYMENT_METHOD_LABEL[paymentMethod] ?? paymentMethod}
        </span>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// InfluencerChip — avatar + nome + rede social + formato
// ---------------------------------------------------------------------------

interface InfluencerChipProps {
  name: string | null | undefined;
  username: string | null | undefined;
  avatar: string | null | undefined;
  socialNetwork: string | null | undefined;
  socialNetworkLabel: string | null | undefined;
  contentType: string | null | undefined;
}

function InfluencerChip({
  name,
  username,
  avatar,
  socialNetwork,
  socialNetworkLabel,
  contentType,
}: InfluencerChipProps) {
  const avatarSrc = getUploadUrl(avatar);
  const handle = username?.replace(/^@/, "").trim();
  const networkLabel = socialNetwork
    ? getNetworkLabel(socialNetwork, socialNetworkLabel || socialNetwork)
    : null;

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      {avatarSrc ? (
        <img
          src={avatarSrc}
          alt=""
          loading="lazy"
          className="size-6 rounded-full object-cover bg-neutral-100"
        />
      ) : name || handle ? (
        <div className="size-6 rounded-full bg-neutral-100 flex items-center justify-center shrink-0">
          <Icon name="User" size={12} color="#737373" />
        </div>
      ) : null}

      {name && (
        <span className="text-neutral-700 font-medium truncate">{name}</span>
      )}
      {handle && (
        <span className="text-neutral-500 truncate">@{handle}</span>
      )}

      {networkLabel && (
        <span className="inline-flex items-center gap-1 rounded bg-neutral-100 px-1.5 py-0.5 text-neutral-700">
          <SocialNetworkIcon
            networkType={socialNetwork ?? undefined}
            size={12}
            color="#525252"
          />
          {networkLabel}
        </span>
      )}

      {contentType && (
        <span className="px-1.5 py-0.5 rounded bg-neutral-100 text-neutral-600 text-[10px] font-medium uppercase tracking-wide">
          {contentType}
        </span>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Empty / Error states
// ---------------------------------------------------------------------------

function EmptyState() {
  return (
    <div className="p-10 flex flex-col items-center gap-3 text-center">
      <div className="w-12 h-12 rounded-full bg-neutral-100 flex items-center justify-center">
        <Icon name="History" size={20} color="#737373" />
      </div>
      <div>
        <p className="text-sm font-medium text-neutral-950">
          Nenhuma movimentação por enquanto
        </p>
        <p className="text-xs text-neutral-500 mt-1">
          Depósitos, reservas e pagamentos aparecerão aqui quando ocorrerem.
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
          Erro ao carregar movimentações
        </p>
        <p className="text-xs text-neutral-600 mt-1">{message}</p>
      </div>
    </div>
  );
}
