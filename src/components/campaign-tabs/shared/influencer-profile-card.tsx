import { Icon } from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { SocialNetworkIcon } from "@/components/social-network-icon";
import { getUploadUrl } from "@/lib/utils/api";
import { getSocialNetworkProfileUrl, getNetworkLabel } from "@/shared/constants/network-labels";

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

export interface InfluencerCardData {
  profileKey: string;
  influencerName: string;
  influencerAvatar: string;
  /** Tipo da rede social (instagram, tiktok, youtube…) */
  profileType: string;
  profileTypeLabel: string;
  /** Handle do influenciador NA rede social (usado para montar o link externo) */
  profileUsername: string;
  influencerFollowers: number;
  profileFollowers: number;
  influencerEngagement: number;
  /** Motivo de recomendação (seleção de influenciadores) */
  recommendationReason?: string;
  updatedAt?: string | null;
  isExternal?: boolean;
}

interface InfluencerProfileCardProps {
  data: InfluencerCardData;
  nicheName?: string | null;
  isSelected?: boolean;
  isActionLoading?: boolean;
  metaLabel?: string;
  /** Badge de status no lugar dos botões de ação primários */
  statusBadge?: "approved" | "rejected" | "invited";
  /** Exibe botão de seleção (checkbox circular) no canto do avatar */
  selectable?: boolean;
  onSelect?: () => void;
  // Ações: inscrições / curadoria
  onApprove?: () => void;
  onReject?: () => void;
  onMoveToCuration?: () => void;
  // Ações: seleção de influenciadores
  onInvite?: () => void;
  onPreSelection?: () => void;
  // Ação universal
  onViewProfile?: () => void;
  onSaveToList?: () => void;
}

// ---------------------------------------------------------------------------
// Helpers internos
// ---------------------------------------------------------------------------

function formatFollowers(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, "")}k`;
  return n.toLocaleString("pt-BR");
}

function formatEngagement(value: number | null | undefined): string {
  if (value == null || Number.isNaN(Number(value))) return "—";
  const n = Number(value);
  return `${(n >= 10 ? n.toFixed(1) : n.toFixed(2)).replace(/\.?0+$/, "")}%`;
}

// ---------------------------------------------------------------------------
// Componente
// ---------------------------------------------------------------------------

/**
 * Card de influenciador unificado — usado nas abas de Seleção, Inscrições e Curadoria.
 *
 * Layout alinhado à aba de seleção de influenciadores:
 *  - Avatar à esquerda, ícone da rede social + bookmark à direita
 *  - O ícone da rede social é um link externo quando o handle está disponível
 *  - Estatísticas em grid 2 colunas
 *  - Ações configuradas via props opcionais
 */
export function InfluencerProfileCard({
  data,
  nicheName,
  isSelected = false,
  isActionLoading = false,
  statusBadge,
  selectable = false,
  onSelect,
  onApprove,
  onReject,
  onMoveToCuration,
  onInvite,
  onPreSelection,
  onViewProfile,
  onSaveToList,
}: InfluencerProfileCardProps) {
  console.log(data)
  const rawFollowers =
    data.profileFollowers != null && data.profileFollowers > 0
      ? data.profileFollowers
      : data.influencerFollowers;
  const followers = Number(rawFollowers ?? 0);
  const engagementDisplay = formatEngagement(data.influencerEngagement);
  const avatarSrc = data.influencerAvatar ? getUploadUrl(data.influencerAvatar) : undefined;
  const networkLabel = getNetworkLabel(data.profileType, data.profileTypeLabel || "Rede social");
  const socialUrl = getSocialNetworkProfileUrl(data.profileType, data.profileUsername);

  // O ícone da rede é um link quando temos URL, senão um div decorativo
  const networkIconContent = (
    <SocialNetworkIcon networkType={data.profileType} size={22} color="#404040" />
  );
  const networkIconEl = socialUrl ? (
    <a
      href={socialUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="flex size-10 items-center justify-center rounded-lg border border-neutral-200/90 bg-white shadow-sm transition-colors hover:border-primary-300 hover:bg-primary-50"
      title={`Ver perfil no ${networkLabel}`}
      aria-label={`Abrir perfil no ${networkLabel}`}
    >
      {networkIconContent}
    </a>
  ) : (
    <div
      className="flex size-10 items-center justify-center rounded-lg border border-neutral-200/90 bg-white shadow-sm"
      title={networkLabel}
      aria-label={`Rede: ${networkLabel}`}
    >
      {networkIconContent}
    </div>
  );

  return (
    <div
      className={`flex min-h-[320px] w-full min-w-0 flex-col gap-5 rounded-xl bg-neutral-100 p-3 border transition-colors ${isSelected && selectable
        ? "border-primary-500 ring-1 ring-primary-200"
        : "border-transparent"
        }`}
    >
      {/* Topo: avatar + [ícone rede + bookmark] */}
      <div className="flex items-start justify-between gap-2">
        <div className="relative shrink-0">
          {avatarSrc ? (
            <img
              src={avatarSrc}
              alt={data.influencerName}
              className="size-[60px] rounded-2xl object-cover bg-neutral-200"
            />
          ) : (
            <div className="flex size-[60px] items-center justify-center rounded-2xl bg-neutral-200 text-lg font-medium text-neutral-500">
              {data.influencerName.charAt(0).toUpperCase()}
            </div>
          )}

          {selectable && (
            <button
              type="button"
              onClick={onSelect}
              aria-pressed={isSelected}
              className="absolute -left-2 -top-2 flex size-7 items-center justify-center rounded-full border border-neutral-200 bg-white shadow-sm"
            >
              {isSelected ? (
                <Icon name="Check" size={14} color="var(--color-primary-600)" />
              ) : (
                <div className="size-3 rounded-full border-2 border-neutral-300" />
              )}
            </button>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          {networkIconEl}
          <button
            type="button"
            className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[#ffdf2a]"
            aria-label="Salvar"
          >
            <Icon name="Bookmark" size={24} color="#171717" />
          </button>
        </div>

      </div>

      {/* Nome + @username */}
      <div className="flex min-w-0 flex-col gap-0.5">
        <div className="flex min-w-0 items-center gap-2">
          <p className="truncate text-xl font-medium leading-6 text-neutral-950">
            {data.influencerName}
          </p>

        </div>
        <p className="truncate text-sm leading-6 text-neutral-600">
          @{data.profileUsername}
        </p>
        {data.isExternal && (
          <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 w-max ">
            Externo
          </span>
        )}
      </div>

      {/* Stats */}
      <div className="flex gap-2">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3 rounded-lg bg-neutral-200 p-3">
          <p className="text-sm text-neutral-600">Seguidores</p>
          <p className="text-xl font-medium text-neutral-950">{formatFollowers(followers)}</p>
        </div>
        <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3 rounded-lg bg-neutral-200 p-3">
          <p className="text-sm text-neutral-600">Engajamento</p>
          <p className="text-xl font-medium text-neutral-950">{engagementDisplay}</p>
        </div>
      </div>

      {/* Nicho */}
      {nicheName && (
        <div className="rounded-xl bg-[#f2e2ff] px-3 py-1">
          <span className="text-sm leading-6 text-primary-600">{nicheName}</span>
        </div>
      )}

      {/* Motivo de recomendação (seleção) */}
      {data.recommendationReason?.trim() && (
        <p className="rounded-lg bg-primary-50 px-3 py-2 text-xs leading-relaxed text-primary-800">
          {data.recommendationReason}
        </p>
      )}

      {/* Ações */}
      <div className="mt-auto flex flex-col gap-3">
        {data.updatedAt && (
          <p className="text-base font-medium text-neutral-500 leading-5">Enviado em: {new Date(data.updatedAt).toLocaleDateString("pt-BR", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
          })}</p>
        )}

        {statusBadge === "invited" ? (
          <div className="flex h-11 min-w-0 flex-1 items-center justify-center rounded-full border border-neutral-200 bg-transparent px-4 opacity-90">
            <span className="text-center text-base font-semibold text-neutral-800">Convidado</span>
          </div>
        ) : statusBadge === "approved" || statusBadge === "rejected" ? (
          <p className="text-base font-medium text-neutral-600">
            {statusBadge === "approved" ? "Aprovado para campanha" : "× Reprovado"}
          </p>
        ) : (
          <>
            {(onInvite || onPreSelection || onApprove || onReject) && (
              <div className="flex flex-wrap gap-1">
                {onInvite && (
                  <Button
                    type="button"
                    className="h-11 px-1 rounded-full border border-neutral-200 bg-primary-600 font-semibold text-base text-neutral-50 hover:bg-primary-700 flex-1"
                    onClick={onInvite}
                    disabled={isActionLoading}
                  >
                    Convidar
                  </Button>
                )}
                {onPreSelection && (
                  <Button
                    type="button"
                    variant="outline"
                    className={`h-11 px-1 rounded-full border-neutral-200 font-semibold text-base flex-1`}
                    onClick={onPreSelection}
                    disabled={isActionLoading}
                  >
                    Pré-seleção
                  </Button>
                )}
                {onApprove && (
                  <Button
                    onClick={onApprove}
                    disabled={isActionLoading}
                    className="h-11 rounded-full border-0 bg-primary-600 text-base font-semibold text-white hover:bg-primary-700 flex-1"
                  >
                    <Icon name="Check" size={20} color="#fafafa" />
                    Aprovar
                  </Button>
                )}
                {onReject && (
                  <Button
                    variant="outline"
                    onClick={onReject}
                    disabled={isActionLoading}
                    className="h-11 rounded-full border-neutral-200 text-base font-semibold text-neutral-600 hover:bg-neutral-50 flex-1"
                  >
                    <Icon name="X" size={20} color="#525252" />
                    Reprovar
                  </Button>
                )}
              </div>
            )}

            {/* Links secundários */}
            {(onViewProfile || onMoveToCuration || onSaveToList) && (
              <div className="flex flex-wrap items-center justify-center gap-3">
                {onViewProfile && (
                  <button
                    type="button"
                    onClick={onViewProfile}
                    className="flex cursor-pointer items-center gap-1 text-base font-medium text-neutral-600 underline decoration-solid hover:text-neutral-800"
                  >
                    <Icon name="ExternalLink" size={20} color="#4d4d4d" />
                    Ver perfil
                  </button>
                )}
                {onSaveToList && (
                  <button
                    type="button"
                    onClick={onSaveToList}
                    className="flex cursor-pointer items-center gap-1 text-base font-medium text-primary-600 underline decoration-solid hover:text-primary-800"
                  >
                    <Icon name="BookmarkPlus" size={20} color="var(--color-primary-600)" />
                    Adicionar à lista
                  </button>
                )}
                {onMoveToCuration && (
                  <button
                    type="button"
                    onClick={onMoveToCuration}
                    disabled={isActionLoading}
                    className="flex items-center gap-1 text-base font-medium text-neutral-500 underline hover:text-neutral-700"
                  >
                    <Icon name="ArrowRight" size={16} color="#737373" />
                    Mover para curadoria
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
