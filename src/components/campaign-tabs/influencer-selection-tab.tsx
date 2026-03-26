import {
  useState,
  useMemo,
  useEffect,
  useRef,
  useCallback,
  type ReactNode,
} from "react";
import { useNavigate, useParams } from "@tanstack/react-router";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { InputDate } from "@/components/ui/input-date";
import { Select } from "@/components/ui/select";
import { Modal } from "@/components/ui/modal";
import { Avatar } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/text-area";
import type { Influencer } from "@/shared/types";
import { useMuralStatus, useActivateMural, useDeactivateMural } from "@/hooks/use-campaign-mural";
import { useCampaignInfluencerSelection } from "@/hooks/use-campaign-influencer-selection";
import type { InfluencerSelectionProfileItem } from "@/shared/services/campaign-influencer-selection";
import { useInviteInfluencer, useAddToPreSelection, useUpdateInfluencerStatus } from "@/hooks/use-campaign-influencers";
import { useCampaignUsers } from "@/hooks/use-campaign-users";
import { validateMuralEndDate, formatDateForInput, addDays } from "@/shared/utils/date-validations";
import { ListSelector } from "@/components/influencer-lists/list-selector";
import {
  getInfluencerProfiles,
  getCampaignInfluencerInvitableProfiles,
} from "@/shared/services/influencer";
import { useNiches } from "@/hooks/use-niches";
import { getUploadUrl } from "@/lib/utils/api";

interface ExtendedInfluencer extends Influencer {
  socialNetwork?: string;
  ageRange?: string;
  location?: {
    country?: string;
    state?: string;
    city?: string;
  };
  recommendationReason?: string;
  /** PK `social_networks` — alinhado à API de seleção / convite por perfil */
  socialNetworkId?: string;
  selectionSource?: "recommended" | "catalog";
}

interface InfluencerSelectionTabProps {
  influencers: Influencer[];
  campaignPhases?: Array<{ id: string; label: string; publish_date?: string }>;
  maxInfluencers?: number;
  phasesWithFormats?: Array<{ formats?: Array<{ socialNetwork: string }> }>;
  onOpenMuralModal?: () => void;
}

function Skeleton({ className }: { className?: string }) {
  return <div className={`skeleton ${className ?? ""}`} aria-hidden />;
}

/** Skeleton — mesma hierarquia do Figma (título → recomendados → filtros → todos + loading) */
export function InfluencerSelectionTabSkeleton() {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-72 max-w-full" />
        <Skeleton className="h-5 w-full max-w-xl" />
      </div>

      <div className="flex flex-col gap-6 rounded-xl bg-white p-5">
        <Skeleton className="h-7 w-full max-w-md" />
        <div className="flex gap-3 overflow-hidden">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="flex w-[269px] min-w-[269px] shrink-0 flex-col gap-4 rounded-xl bg-neutral-100 p-3"
            >
              <div className="flex justify-between">
                <Skeleton className="size-[60px] rounded-2xl" />
                <Skeleton className="size-10 rounded-lg" />
              </div>
              <Skeleton className="h-6 w-4/5" />
              <Skeleton className="h-4 w-1/2" />
              <div className="flex gap-2">
                <Skeleton className="h-16 flex-1 rounded-lg" />
                <Skeleton className="h-16 flex-1 rounded-lg" />
              </div>
              <Skeleton className="h-10 w-full rounded-xl" />
              <div className="flex gap-1">
                <Skeleton className="h-11 flex-1 rounded-full" />
                <Skeleton className="h-11 flex-1 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl bg-white p-4">
        <div className="flex flex-wrap items-end gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex min-w-[160px] flex-1 flex-col gap-1">
              <Skeleton className="h-5 w-28" />
              <Skeleton className="h-11 w-full rounded-full" />
            </div>
          ))}
          <Skeleton className="h-11 w-40 shrink-0 rounded-full" />
        </div>
      </div>

      <div className="flex flex-col gap-6 rounded-xl bg-white p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Skeleton className="h-7 w-56" />
          <div className="flex gap-2">
            <Skeleton className="h-11 w-40 rounded-full" />
            <Skeleton className="h-11 w-48 rounded-full" />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="flex flex-col gap-4 rounded-xl bg-neutral-100 p-3">
              <div className="flex justify-between">
                <Skeleton className="size-[60px] rounded-2xl" />
                <Skeleton className="size-10 rounded-lg" />
              </div>
              <Skeleton className="h-6 w-4/5" />
              <Skeleton className="h-4 w-1/2" />
              <div className="flex gap-2">
                <Skeleton className="h-16 flex-1 rounded-lg" />
                <Skeleton className="h-16 flex-1 rounded-lg" />
              </div>
              <Skeleton className="h-10 w-full rounded-xl" />
              <div className="flex gap-1">
                <Skeleton className="h-11 flex-1 rounded-full" />
                <Skeleton className="h-11 flex-1 rounded-full" />
              </div>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-center gap-2 py-4">
          <Skeleton className="size-6 rounded-full" />
          <Skeleton className="h-5 w-56" />
        </div>
      </div>
    </div>
  );
}

function formatFollowers(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, "")}k`;
  return n.toLocaleString("pt-BR");
}

function formatEngagementPercent(value: number | null | undefined): string {
  if (value == null || Number.isNaN(Number(value))) return "—";
  const n = Number(value);
  const s = n >= 10 ? n.toFixed(1) : n.toFixed(2);
  return `${s.replace(/\.?0+$/, "")}%`;
}

/** Lucide não inclui marca TikTok — usamos SVG próprio em `TikTokGlyph`. */
function getSocialNetworkIconName(
  network?: string
): keyof typeof import("lucide-react").icons {
  const icons: Record<string, keyof typeof import("lucide-react").icons> = {
    instagram: "Instagram",
    youtube: "Youtube",
    tiktok: "Music",
    facebook: "Facebook",
    twitter: "Twitter",
  };
  return icons[(network || "").toLowerCase()] || "Share2";
}

/** Silhueta do logo TikTok (Lucide não oferece ícone da marca). */
function TikTokGlyph({ size = 22, color = "#404040" }: { size?: number; color?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={color}
      aria-hidden
      className="shrink-0"
    >
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
    </svg>
  );
}

function getSocialNetworkLabel(network?: string): string {
  const labels: Record<string, string> = {
    instagram: "Instagram",
    youtube: "YouTube",
    tiktok: "TikTok",
    facebook: "Facebook",
    twitter: "Twitter",
  };
  return labels[(network || "").toLowerCase()] || "Rede social";
}

function selectionItemMatchesFilters(
  item: InfluencerSelectionProfileItem,
  searchTerm: string,
  filterNiche: string
): boolean {
  if (searchTerm.trim()) {
    const q = searchTerm.toLowerCase();
    const name = item.user.name.toLowerCase();
    const handle = item.social_network.username.toLowerCase().replace(/^@/, "");
    if (!name.includes(q) && !handle.includes(q)) return false;
  }
  if (filterNiche) {
    const n = parseInt(filterNiche, 10);
    if (!Number.isNaN(n) && !(item.niche_ids ?? []).includes(n)) return false;
  }
  return true;
}

/** IDs de perfil para convite/pré-seleção: o card da seleção já traz `socialNetworkId`. */
function resolveInviteProfileIds(
  influencer: ExtendedInfluencer | null,
  picked: string[]
): string[] {
  const sid = influencer?.socialNetworkId?.trim();
  if (sid) return [sid];
  return picked;
}

function selectionItemToExtended(
  item: InfluencerSelectionProfileItem,
  networkType: string,
  source: "recommended" | "catalog"
): ExtendedInfluencer {
  const sn = item.social_network;
  const u = item.user;
  const firstNiche = item.niche_ids?.[0];
  const displayName = (sn.name || u.name || "").trim() || u.name;
  return {
    id: String(u.id),
    name: displayName,
    username: (sn.username || "").replace(/^@/, "").trim() || displayName,
    avatar: (sn.photo || u.photo || "").trim(),
    followers: sn.members ?? 0,
    engagement: 0,
    niche: firstNiche != null ? String(firstNiche) : "",
    socialNetwork: networkType,
    recommendationReason:
      source === "recommended" ? item.match_reason : undefined,
    socialNetworkId: String(sn.id),
    selectionSource: source,
  };
}

/** Carrossel horizontal para recomendados por rede */
function SelectionRecommendedCarousel({
  items,
  renderCard,
}: {
  items: ExtendedInfluencer[];
  renderCard: (influencer: ExtendedInfluencer) => ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(true);

  const updateArrows = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanLeft(scrollLeft > 2);
    setCanRight(scrollLeft < scrollWidth - clientWidth - 2);
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    updateArrows();
    const ro = new ResizeObserver(updateArrows);
    ro.observe(el);
    el.addEventListener("scroll", updateArrows);
    return () => {
      ro.disconnect();
      el.removeEventListener("scroll", updateArrows);
    };
  }, [updateArrows, items.length]);

  if (items.length === 0) return null;

  return (
    <div className="relative flex items-stretch">
      <button
        type="button"
        onClick={() => ref.current?.scrollBy({ left: -ref.current.clientWidth, behavior: "smooth" })}
        disabled={!canLeft}
        className="absolute left-[-18px] top-1/2 z-10 flex size-9 -translate-y-1/2 shrink-0 items-center justify-center rounded-full border border-[#c3c3c3] bg-white text-neutral-600 shadow-sm transition-colors hover:border-neutral-400 hover:bg-neutral-50 disabled:pointer-events-none disabled:opacity-40"
        aria-label="Cards anteriores"
      >
        <Icon name="ChevronLeft" size={24} color="#525252" />
      </button>
      <div
        ref={ref}
        className="flex min-w-0 flex-1 gap-3 overflow-x-auto overflow-y-hidden scroll-smooth py-2 [scrollbar-width:none] snap-x snap-mandatory [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
      >
        {items.map((influencer) => (
          <div
            key={`${influencer.selectionSource}-${influencer.socialNetwork}-${influencer.socialNetworkId}`}
            className="w-[269px] min-w-[269px] shrink-0 snap-start"
          >
            {renderCard(influencer)}
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() => ref.current?.scrollBy({ left: ref.current!.clientWidth, behavior: "smooth" })}
        disabled={!canRight}
        className="absolute right-[-18px] top-1/2 z-10 flex size-9 -translate-y-1/2 shrink-0 items-center justify-center rounded-full border border-[#c3c3c3] bg-white text-neutral-600 shadow-sm transition-colors hover:border-neutral-400 hover:bg-neutral-50 disabled:pointer-events-none disabled:opacity-40"
        aria-label="Próximos cards"
      >
        <Icon name="ChevronRight" size={24} color="#525252" />
      </button>
    </div>
  );
}

/** Card alinhado ao Figma (node 2380:12243) — fundo #f5f5f5, métricas #e4e4e4, nicho #f2e2ff */
function InfluencerCard({
  influencer,
  niches,
  isInCuration,
  isInvited,
  onInvite,
  onPreSelection,
  onViewProfile,
  formatFollowers: fmt,
}: {
  influencer: ExtendedInfluencer;
  niches: Array<{ id: number; name: string }>;
  isInCuration: boolean;
  isInvited?: boolean;
  onInvite: () => void;
  onPreSelection: () => void;
  onViewProfile?: () => void;
  formatFollowers: (n: number) => string;
}) {
  const nicheLabel =
    influencer.niche &&
    (niches.find((n) => n.id.toString() === String(influencer.niche))?.name ?? String(influencer.niche));
  const avatarSrc = influencer.avatar ? getUploadUrl(influencer.avatar) : undefined;
  const bookmarkYellow = !isInvited;

  const networkIcon = getSocialNetworkIconName(influencer.socialNetwork);
  const networkLabel = getSocialNetworkLabel(influencer.socialNetwork);
  const networkKey = (influencer.socialNetwork || "").toLowerCase();

  return (
    <div className="flex min-h-[320px] w-full min-w-0 flex-col gap-5 rounded-xl bg-neutral-100 p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="size-[60px] shrink-0 overflow-hidden rounded-2xl bg-neutral-200">
          {avatarSrc ? (
            <img src={avatarSrc} alt={influencer.name} className="size-full object-cover" />
          ) : (
            <div className="flex size-full items-center justify-center text-lg font-medium text-neutral-500">
              {influencer.name.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <div
            className="flex size-10 items-center justify-center rounded-lg border border-neutral-200/90 bg-white shadow-sm"
            title={networkLabel}
            aria-label={`Rede: ${networkLabel}`}
          >
            {networkKey === "tiktok" ? (
              <TikTokGlyph size={22} color="#404040" />
            ) : (
              <Icon name={networkIcon} size={22} color="#404040" />
            )}
          </div>
          <button
            type="button"
            className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${
              bookmarkYellow ? "bg-[#ffdf2a] text-warning-700" : "bg-neutral-200 text-neutral-500"
            }`}
            aria-label="Salvar"
          >
            <Icon name="Bookmark" size={24} color="currentColor" />
          </button>
        </div>
      </div>
      <div className="flex min-w-0 flex-col">
        <p className="truncate text-xl font-medium leading-6 text-neutral-950">{influencer.name}</p>
        <p className="truncate text-sm leading-6 text-neutral-600">@{influencer.username}</p>
      </div>
      <div className="flex gap-2">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3 rounded-lg bg-neutral-200 p-3">
          <p className="text-left text-sm text-neutral-600">Seguidores</p>
          <p className="text-left text-xl font-medium text-neutral-950">{fmt(influencer.followers)}</p>
        </div>
        <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3 rounded-lg bg-neutral-200 p-3">
          <p className="text-left text-sm text-neutral-600">Engajamento</p>
          <p className="text-left text-xl font-medium text-neutral-950">
            {formatEngagementPercent(
              influencer.engagement != null && influencer.engagement > 0
                ? influencer.engagement
                : undefined
            )}
          </p>
        </div>
      </div>
      {nicheLabel ? (
        <div className="rounded-xl bg-[#f2e2ff] px-3 py-1">
          <span className="text-sm leading-6 text-primary-600">{nicheLabel}</span>
        </div>
      ) : null}
      {influencer.recommendationReason?.trim() ? (
        <p className="rounded-lg bg-primary-50 px-3 py-2 text-xs leading-relaxed text-primary-800">
          {influencer.recommendationReason}
        </p>
      ) : null}
      <div className="mt-auto flex flex-col gap-3">
        <div className="flex gap-1">
          {!isInCuration ? (
            isInvited ? (
              <div className="flex h-11 min-w-0 flex-1 items-center justify-center rounded-full border border-neutral-200 bg-transparent px-4 opacity-90">
                <span className="text-center text-base font-semibold text-neutral-800">Convidado</span>
              </div>
            ) : (
              <Button
                type="button"
                className="h-11 px-1 min-w-0 flex-1 rounded-full border border-neutral-200 bg-primary-600 font-semibold text-base text-neutral-50 hover:bg-primary-700"
                onClick={onInvite}
              >
                Convidar
              </Button>
            )
          ) : null}
          <Button
            type="button"
            variant="outline"
            className={`h-11 px-1 min-w-0 rounded-full border-neutral-200 font-semibold text-base ${isInCuration ? "w-full flex-1" : "flex-1"}`}
            onClick={onPreSelection}
          >
            Pré-seleção
          </Button>
        </div>
        <button
          type="button"
          onClick={() => onViewProfile?.()}
          className="mx-auto flex cursor-pointer items-center gap-1 text-center text-base font-medium text-neutral-600 underline decoration-solid hover:text-neutral-800"
        >
          <Icon name="ExternalLink" size={20} color="#4d4d4d" />
          Ver perfil
        </button>
      </div>
    </div>
  );
}

export function InfluencerSelectionTab({
  influencers: _influencers,
  campaignPhases: _campaignPhases = [],
  maxInfluencers = 0,
  phasesWithFormats = [],
  onOpenMuralModal,
}: InfluencerSelectionTabProps) {
  const navigate = useNavigate();
  const { campaignId } = useParams({ from: "/(private)/(app)/campaigns/$campaignId" });
  const queryClient = useQueryClient();
  const { data: niches = [] } = useNiches();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterNiche, setFilterNiche] = useState("");
  const [filterLocation, setFilterLocation] = useState("");
  const [filterAge, setFilterAge] = useState("");
  const [showMuralDateModal, setShowMuralDateModal] = useState(false);
  const [selectedInfluencer, setSelectedInfluencer] = useState<ExtendedInfluencer | null>(null);
  const [modalType, setModalType] = useState<
    "discover" | "invite" | "curation" | "selectList" | "preselection" | null
  >(null);
  const [inviteMessage, setInviteMessage] = useState("");
  const [curationNotes, setCurationNotes] = useState("");
  const [tempMuralEndDate, setTempMuralEndDate] = useState("");
  const [selectedProfileIds, setSelectedProfileIds] = useState<string[]>([]);

  const inviteOrPreselection =
    modalType === "invite" || modalType === "preselection";

  const needsInviteProfilePicker =
    inviteOrPreselection &&
    !!selectedInfluencer &&
    !selectedInfluencer.socialNetworkId?.trim();

  // Só busca lista quando o card não traz perfil (fallback)
  const { data: invitableProfilesData = [], isLoading: isLoadingInvitableProfiles } =
    useQuery({
      queryKey: [
        "campaigns",
        campaignId,
        "influencers",
        selectedInfluencer?.id,
        "invite-profiles",
      ],
      queryFn: () =>
        getCampaignInfluencerInvitableProfiles(
          campaignId!,
          selectedInfluencer!.id
        ),
      enabled: !!campaignId && needsInviteProfilePicker,
    });

  // Curadoria: todos os perfis do influenciador (filtro por redes da campanha só aqui)
  const { data: allProfilesData = [], isLoading: isLoadingAllProfiles } =
    useQuery({
      queryKey: ["influencer", selectedInfluencer?.id, "profiles"],
      queryFn: () => getInfluencerProfiles(selectedInfluencer!.id),
      enabled: !!selectedInfluencer && modalType === "curation",
    });

  const invitableProfilesList = Array.isArray(invitableProfilesData)
    ? invitableProfilesData
    : [];

  const allProfilesList = Array.isArray(allProfilesData)
    ? allProfilesData
    : [];

  // Extrair redes sociais permitidas das fases da campanha
  const allowedSocialNetworks = useMemo(() => {
    const networks = new Set<string>();
    phasesWithFormats.forEach((phase) => {
      phase.formats?.forEach((format) => {
        if (format.socialNetwork) {
          networks.add(format.socialNetwork.toLowerCase());
        }
      });
    });
    return Array.from(networks);
  }, [phasesWithFormats]);

  // Curadoria: restringe aos perfis nas redes da campanha (avisos / validação)
  const curationProfilesFiltered = useMemo(() => {
    if (allowedSocialNetworks.length === 0) return allProfilesList;
    return allProfilesList.filter((profile) => {
      const profileType = profile.type?.toLowerCase() || "";
      return allowedSocialNetworks.includes(profileType);
    });
  }, [allProfilesList, allowedSocialNetworks]);

  const influencerProfiles =
    modalType === "curation"
      ? curationProfilesFiltered
      : needsInviteProfilePicker
        ? invitableProfilesList
        : [];

  const isLoadingProfiles =
    modalType === "curation"
      ? isLoadingAllProfiles
      : needsInviteProfilePicker
        ? isLoadingInvitableProfiles
        : false;

  // Hooks para dados reais
  const { data: muralStatus } = useMuralStatus(campaignId);
  const { mutate: activateMural, isPending: isActivatingMural } = useActivateMural(campaignId);
  const { mutate: deactivateMural } = useDeactivateMural(campaignId);
  const {
    data: selectionData,
    isLoading: isLoadingSelection,
    isFetching: isFetchingSelection,
    isError: isSelectionError,
    error: selectionError,
    refetch: refetchSelection,
  } = useCampaignInfluencerSelection(campaignId);
  const { mutate: inviteInfluencer, isPending: isInviting } = useInviteInfluencer(campaignId);
  const { mutate: addToPreSelection, isPending: isAddingToPreSelection } = useAddToPreSelection(campaignId);
  const { mutate: updateStatus, isPending: isUpdatingStatus } = useUpdateInfluencerStatus(campaignId);
  const { data: campaignUsers = [] } = useCampaignUsers(campaignId);

  const isMuralActive = muralStatus?.active || false;

  // Função para verificar se um influenciador está em curadoria
  const isInfluencerInCuration = (influencerId: string | number): boolean => {
    const influencerIdStr = String(influencerId);
    const influencerIdNum = typeof influencerId === "string" ? parseInt(influencerId, 10) : influencerId;

    const campaignUser = campaignUsers.find((user) => {
      // Verificar por user_id (influencerId)
      if (user.user_id) {
        const userId = typeof user.user_id === "string" ? parseInt(user.user_id, 10) : user.user_id;
        if (userId === influencerIdNum) {
          return true;
        }
      }
      // Verificar por id (campaignUserId) - caso o influencer.id seja o campaignUserId
      const campaignUserId = typeof user.id === "string" ? parseInt(String(user.id), 10) : Number(user.id);
      if (campaignUserId === influencerIdNum || String(user.id) === influencerIdStr) {
        return true;
      }
      return false;
    });

    if (!campaignUser) {
      return false;
    }

    // Normalizar status para comparação
    const status = campaignUser.status?.toLowerCase() || "";
    return status === "curation" || status === "curadoria";
  };

  const isInfluencerInvited = (influencerId: string | number): boolean => {
    const influencerIdNum =
      typeof influencerId === "string" ? parseInt(influencerId, 10) : influencerId;
    if (Number.isNaN(influencerIdNum)) return false;
    const campaignUser = campaignUsers.find((user) => {
      if (user.user_id != null) {
        const uid =
          typeof user.user_id === "string" ? parseInt(user.user_id, 10) : user.user_id;
        if (uid === influencerIdNum) return true;
      }
      return false;
    });
    if (!campaignUser) return false;
    const status = (campaignUser.status || "").toLowerCase();
    return status === "invited" || status === "convidados";
  };

  const ageFilterOptions = useMemo(
    () => [
      { value: "", label: "Selecione a idade" },
      { value: "18-24", label: "18–24 anos" },
      { value: "25-34", label: "25–34 anos" },
      { value: "35-44", label: "35–44 anos" },
      { value: "45+", label: "45+ anos" },
    ],
    []
  );

  const locationFilterOptions = useMemo(
    () => [{ value: "", label: "Selecione o local" }],
    []
  );

  const flattenedRecommended = useMemo(() => {
    if (!selectionData?.networks?.length) return [] as ExtendedInfluencer[];
    const out: ExtendedInfluencer[] = [];
    for (const net of selectionData.networks) {
      for (const item of net.recommended) {
        if (selectionItemMatchesFilters(item, searchTerm, filterNiche)) {
          out.push(selectionItemToExtended(item, net.type, "recommended"));
        }
      }
    }
    return out;
  }, [selectionData, searchTerm, filterNiche]);

  const flattenedCatalog = useMemo(() => {
    if (!selectionData?.networks?.length) return [] as ExtendedInfluencer[];
    const out: ExtendedInfluencer[] = [];
    for (const net of selectionData.networks) {
      for (const item of net.catalog) {
        if (selectionItemMatchesFilters(item, searchTerm, filterNiche)) {
          out.push(selectionItemToExtended(item, net.type, "catalog"));
        }
      }
    }
    return out;
  }, [selectionData, searchTerm, filterNiche]);

  const rawTotalProfiles = useMemo(() => {
    if (!selectionData?.networks?.length) return 0;
    let n = 0;
    for (const net of selectionData.networks) {
      n += net.recommended.length + net.catalog.length;
    }
    return n;
  }, [selectionData]);

  const totalFilteredProfiles =
    flattenedRecommended.length + flattenedCatalog.length;

  // Verificar se todas as vagas foram preenchidas
  const approvedInfluencersCount = useMemo(() => {
    return campaignUsers.filter((user) => {
      const status = user.status?.toLowerCase() || "";
      return status === "approved" || status === "aprovado";
    }).length;
  }, [campaignUsers]);

  const allVacanciesFilled = maxInfluencers > 0 && approvedInfluencersCount >= maxInfluencers;

  // Desativar automaticamente quando todas as vagas forem preenchidas
  useEffect(() => {
    if (isMuralActive && allVacanciesFilled) {
      deactivateMural(undefined, {
        onSuccess: () => {
          toast.success("Descobrir desativado automaticamente: todas as vagas foram preenchidas");
        },
        onError: () => {
          // Silently fail - mural deactivation is a best-effort operation
        },
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMuralActive, allVacanciesFilled]);

  const handleActivateMural = () => {
    if (!tempMuralEndDate) {
      toast.error("Por favor, selecione uma data limite");
      return;
    }

    activateMural(
      { end_date: tempMuralEndDate },
      {
        onSuccess: () => {
          toast.success("Mural ativado com sucesso!");
          setShowMuralDateModal(false);
          setTempMuralEndDate("");
        },
        onError: (error: any) => {
          toast.error(error?.message || "Erro ao ativar mural");
        },
      }
    );
  };

  const getSocialNetworkLabel = (network?: string) => {
    const labels: { [key: string]: string } = {
      instagram: "Instagram",
      instagram_facebook: "Instagram / Facebook",
      youtube: "YouTube",
      tiktok: "TikTok",
      ugc: "UGC",
      facebook: "Facebook",
      twitter: "Twitter",
    };
    return labels[network || ""] || network || "N/A";
  };

  const handleAction = (influencer: Influencer, action: "discover" | "invite" | "curation" | "preselection") => {
    setSelectedInfluencer(influencer);
    setModalType(action);
  };

  const handleCloseModal = () => {
    setModalType(null);
    setSelectedInfluencer(null);
    setInviteMessage("");
    setCurationNotes("");
    setSelectedProfileIds([]);
  };

  useEffect(() => {
    if (modalType !== "invite" && modalType !== "preselection") return;
    if (!selectedInfluencer) return;
    const sid = selectedInfluencer.socialNetworkId?.trim();
    if (sid) {
      setSelectedProfileIds([sid]);
      return;
    }
    if (influencerProfiles.length > 0) {
      setSelectedProfileIds(influencerProfiles.map((p) => p.id));
    }
  }, [
    modalType,
    selectedInfluencer?.id,
    selectedInfluencer?.socialNetworkId,
    influencerProfiles,
  ]);

  const handleConfirm = async () => {
    if (!selectedInfluencer) return;

    if (modalType === "preselection") {
      const preProfileIds = resolveInviteProfileIds(
        selectedInfluencer,
        selectedProfileIds
      );
      addToPreSelection(
        {
          influencer_id: selectedInfluencer.id,
          message: inviteMessage || undefined,
          profile_ids: preProfileIds.length > 0 ? preProfileIds : undefined,
        },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({
              queryKey: ["campaigns", campaignId, "influencers"],
            });
            queryClient.invalidateQueries({
              queryKey: [
                "campaigns",
                campaignId,
                "influencers",
                selectedInfluencer.id,
                "invite-profiles",
              ],
            });
            queryClient.invalidateQueries({
              queryKey: ["campaigns", campaignId, "dashboard"],
            });
            queryClient.invalidateQueries({
              queryKey: ["campaigns", campaignId, "users"],
            });
            queryClient.invalidateQueries({
              queryKey: ["campaigns", campaignId, "influencer-selection"],
            });
            toast.success("Influenciador movido para pré-seleção!");
            handleCloseModal();
          },
          onError: (error: any) => {
            toast.error(error?.message || "Erro ao mover para pré-seleção");
          },
        }
      );
      return;
    }

    if (modalType === "invite") {
      const inviteProfileIds = resolveInviteProfileIds(
        selectedInfluencer,
        selectedProfileIds
      );
      if (inviteProfileIds.length === 0) {
        toast.error(
          selectedInfluencer.socialNetworkId?.trim()
            ? "Não foi possível usar este perfil para o convite."
            : "Selecione pelo menos um perfil para convidar"
        );
        return;
      }

      inviteInfluencer(
        {
          influencer_id: selectedInfluencer.id,
          message: inviteMessage || undefined,
          profile_ids: inviteProfileIds,
        },
        {
          onSuccess: () => {
            // Invalidar queries para atualizar os dados automaticamente
            queryClient.invalidateQueries({
              queryKey: ["campaigns", campaignId, "influencers"],
            });
            queryClient.invalidateQueries({
              queryKey: [
                "campaigns",
                campaignId,
                "influencers",
                selectedInfluencer.id,
                "invite-profiles",
              ],
            });
            queryClient.invalidateQueries({
              queryKey: ["campaigns", campaignId, "dashboard"],
            });
            queryClient.invalidateQueries({
              queryKey: ["campaigns", campaignId, "users"],
            });
            queryClient.invalidateQueries({
              queryKey: ["campaigns", campaignId, "influencer-selection"],
            });
            toast.success("Influenciador convidado com sucesso!");
            handleCloseModal();
          },
          onError: (error: any) => {
            toast.error(error?.message || "Erro ao convidar influenciador");
          },
        }
      );
    } else if (modalType === "curation") {
      // Validar se o influenciador tem perfis permitidos (se houver redes sociais definidas)
      if (allowedSocialNetworks.length > 0 && influencerProfiles.length === 0) {
        toast.error(
          `Este influenciador não possui perfis nas redes sociais definidas na campanha (${allowedSocialNetworks.map(n => n.charAt(0).toUpperCase() + n.slice(1)).join(", ")}). Não é possível adicioná-lo para curadoria.`
        );
        return;
      }

      // Tenta atualizar o status primeiro (caso o influenciador já esteja na campanha)
      updateStatus(
        {
          influencer_id: selectedInfluencer.id,
          status: "curation",
          feedback: curationNotes || undefined,
        },
        {
          onSuccess: () => {
            // Invalidar queries para atualizar os dados automaticamente
            queryClient.invalidateQueries({
              queryKey: ["campaigns", campaignId, "influencers"],
            });
            queryClient.invalidateQueries({
              queryKey: ["campaigns", campaignId, "dashboard"],
            });
            queryClient.invalidateQueries({
              queryKey: ["campaigns", campaignId, "users"],
            });
            toast.success("Influenciador adicionado para curadoria!");
            handleCloseModal();
          },
          onError: (error: any) => {
            // Se o erro for que o influenciador não está na campanha, adiciona primeiro
            const errorMessage = error?.message || "";
            if (
              errorMessage.includes("não encontrado") ||
              errorMessage.includes("not found") ||
              errorMessage.includes("não está") ||
              errorMessage.includes("not in")
            ) {
              // Adiciona o influenciador à campanha primeiro
              inviteInfluencer(
                {
                  influencer_id: selectedInfluencer.id,
                  message: undefined,
                },
                {
                  onSuccess: () => {
                    // Após adicionar, atualiza o status para "curation"
                    updateStatus(
                      {
                        influencer_id: selectedInfluencer.id,
                        status: "curation",
                        feedback: curationNotes || undefined,
                      },
                      {
                        onSuccess: () => {
                          // Invalidar queries para atualizar os dados automaticamente
                          queryClient.invalidateQueries({
                            queryKey: ["campaigns", campaignId, "influencers"],
                          });
                          queryClient.invalidateQueries({
                            queryKey: ["campaigns", campaignId, "dashboard"],
                          });
                          queryClient.invalidateQueries({
                            queryKey: ["campaigns", campaignId, "users"],
                          });
                          toast.success("Influenciador adicionado para curadoria!");
                          handleCloseModal();
                        },
                        onError: (updateError: any) => {
                          toast.error(updateError?.message || "Erro ao atualizar status para curadoria");
                        },
                      }
                    );
                  },
                  onError: (inviteError: any) => {
                    toast.error(inviteError?.message || "Erro ao adicionar influenciador à campanha");
                  },
                }
              );
            } else {
              toast.error(errorMessage || "Erro ao adicionar influenciador para curadoria");
            }
          },
        }
      );
    } else {
      // Outras ações (discover) podem ser implementadas aqui
      handleCloseModal();
    }
  };

  const selectionErrorMessage =
    selectionError &&
    typeof selectionError === "object" &&
    selectionError !== null &&
    "message" in selectionError
      ? String((selectionError as { message?: string }).message)
      : isSelectionError
        ? "Não foi possível carregar a seleção de influenciadores."
        : "";

  const modalInvitePreProfileIds =
    selectedInfluencer && inviteOrPreselection
      ? resolveInviteProfileIds(selectedInfluencer, selectedProfileIds)
      : [];

  const invitePreSubmitDisabled =
    isInviting ||
    isAddingToPreSelection ||
    isUpdatingStatus ||
    (inviteOrPreselection &&
      (needsInviteProfilePicker
        ? isLoadingProfiles || modalInvitePreProfileIds.length === 0
        : modalInvitePreProfileIds.length === 0));

  return (
    <>
      {isLoadingSelection && !selectionData ? (
        <InfluencerSelectionTabSkeleton />
      ) : isSelectionError && !selectionData ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-danger-200 bg-danger-50 px-6 py-12">
          <p className="text-center text-base text-danger-900">
            {selectionErrorMessage}
          </p>
          <Button type="button" variant="outline" onClick={() => refetchSelection()}>
            Tentar novamente
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-8">
          {/* Figma Frame 163 — título da página */}
          <div className="flex flex-col gap-2">
            <h2 className="text-2xl font-semibold leading-7 text-neutral-950">
              Selecione influenciadores
            </h2>
            <p className="max-w-2xl text-base leading-5 text-neutral-500">
              Busque, filtre e convide perfis para participar da campanha — individualmente ou em
              massa.
            </p>
          </div>

          {isSelectionError && selectionData ? (
            <div className="rounded-lg border border-warning-200 bg-warning-50 px-4 py-3 text-sm text-warning-900">
              Erro ao atualizar.{" "}
              <button
                type="button"
                className="font-medium underline"
                onClick={() => refetchSelection()}
              >
                Tentar novamente
              </button>
            </div>
          ) : null}

          {!selectionData?.networks?.length ? (
            <div className="rounded-xl border border-neutral-200 bg-white p-12 text-center text-neutral-500">
              Nenhum dado de seleção retornado para esta campanha.
            </div>
          ) : rawTotalProfiles === 0 ? (
            <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-12 text-center text-neutral-500">
              Nenhum perfil disponível na seleção (todos podem já estar na campanha ou não há dados).
            </div>
          ) : (
            <>
              {/* Figma 2380:10687 — Recomendado + carrossel */}
              <section className="flex flex-col gap-6 rounded-xl bg-white p-5">
                <h3 className="text-xl font-semibold leading-6 text-neutral-950">
                  Recomendado com base no perfil da campanha
                </h3>
                {flattenedRecommended.length === 0 ? (
                  <p className="py-10 text-center text-base text-neutral-500">
                    Nenhum influenciador recomendado para o segmento desta campanha.
                  </p>
                ) : (
                  <SelectionRecommendedCarousel
                    items={flattenedRecommended}
                    renderCard={(influencer) => (
                      <InfluencerCard
                        influencer={influencer}
                        niches={niches}
                        isInCuration={isInfluencerInCuration(influencer.id)}
                        isInvited={isInfluencerInvited(influencer.id)}
                        onInvite={() => handleAction(influencer, "invite")}
                        onPreSelection={() => handleAction(influencer, "preselection")}
                        onViewProfile={() =>
                          navigate({
                            to: "/campaigns/$campaignId/influencer/$influencerId",
                            params: {
                              campaignId: campaignId ?? "",
                              influencerId: influencer.id,
                            },
                          })
                        }
                        formatFollowers={formatFollowers}
                      />
                    )}
                  />
                )}
              </section>

              {/* Figma 2380:10373 — filtros em linha */}
              <section className="rounded-xl bg-white p-4">
                <div className="flex flex-wrap items-end gap-3">
                  <div className="flex min-w-[160px] flex-1 flex-col gap-1">
                    <label className="text-base font-medium leading-5 text-neutral-950">
                      Buscar influenciador
                    </label>
                    <div className="flex h-11 items-center gap-2 rounded-full bg-neutral-100 px-4">
                      <Icon name="Search" color="#A3A3A3" size={20} />
                      <input
                        type="text"
                        placeholder="Nome ou @username"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="min-w-0 flex-1 bg-transparent text-base text-neutral-950 placeholder:text-neutral-400 outline-none"
                      />
                    </div>
                  </div>
                  <div className="flex min-w-[160px] flex-1 flex-col gap-1">
                    <label className="text-base font-medium leading-5 text-neutral-950">Nicho</label>
                    <Select
                      placeholder="Selecione um nicho"
                      options={niches.map((n) => ({ value: String(n.id), label: n.name }))}
                      value={filterNiche}
                      onChange={setFilterNiche}
                      isSearchable
                    />
                  </div>
                  <div className="flex min-w-[160px] flex-1 flex-col gap-1">
                    <label className="text-base font-medium leading-5 text-neutral-950">
                      Localização
                    </label>
                    <Select
                      placeholder="Selecione o local"
                      options={locationFilterOptions}
                      value={filterLocation}
                      onChange={setFilterLocation}
                    />
                  </div>
                  <div className="flex min-w-[160px] flex-1 flex-col gap-1">
                    <label className="text-base font-medium leading-5 text-neutral-950">Idade</label>
                    <Select
                      placeholder="Selecione a idade"
                      options={ageFilterOptions}
                      value={filterAge}
                      onChange={setFilterAge}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-11 shrink-0 rounded-full border-neutral-200 px-4 font-semibold opacity-90 w-max"
                    onClick={() => setModalType("selectList")}
                  >
                    Selecionar lista
                  </Button>
                </div>
                {rawTotalProfiles > 0 ? (
                  <p className="mt-3 text-sm text-neutral-500">
                    {totalFilteredProfiles} de {rawTotalProfiles} perfis
                    {(searchTerm.trim() || filterNiche || filterLocation || filterAge)
                      ? " (filtros aplicados)"
                      : ""}
                  </p>
                ) : null}
              </section>

              {/* Figma 2380:11287 — Todos os influenciadores + grid 4 colunas */}
              <section className="flex flex-col gap-6 rounded-xl bg-white p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <h3 className="text-xl font-semibold leading-6 text-neutral-950">
                    Todos os influenciadores
                  </h3>
                  <div className="flex flex-wrap gap-2 sm:shrink-0">
                    <Button
                      type="button"
                      variant="outline"
                      className="h-11 rounded-full border-neutral-200 px-4 font-semibold w-max"
                      onClick={() =>
                        toast.info("Em breve: convite em massa para vários perfis selecionados.")
                      }
                    >
                      Múltiplos convites
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="h-11 rounded-full border-neutral-200 px-4 font-semibold w-max"
                      onClick={() =>
                        toast.info("Em breve: pré-seleção em massa para vários perfis.")
                      }
                    >
                      Múltiplas pré-seleções
                    </Button>
                  </div>
                </div>

                {flattenedCatalog.length === 0 ? (
                  <p className="py-10 text-center text-base text-neutral-500">
                    Nenhum perfil no catálogo com os filtros atuais.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {flattenedCatalog.map((influencer) => (
                      <InfluencerCard
                        key={`all-${influencer.socialNetwork}-${influencer.socialNetworkId}`}
                        influencer={influencer}
                        niches={niches}
                        isInCuration={isInfluencerInCuration(influencer.id)}
                        isInvited={isInfluencerInvited(influencer.id)}
                        onInvite={() => handleAction(influencer, "invite")}
                        onPreSelection={() => handleAction(influencer, "preselection")}
                        onViewProfile={() =>
                          navigate({
                            to: "/campaigns/$campaignId/influencer/$influencerId",
                            params: {
                              campaignId: campaignId ?? "",
                              influencerId: influencer.id,
                            },
                          })
                        }
                        formatFollowers={formatFollowers}
                      />
                    ))}
                  </div>
                )}

                {isFetchingSelection && !isLoadingSelection ? (
                  <div className="flex items-center justify-center gap-2 py-6 text-neutral-600">
                    <Icon name="Loader" size={24} className="animate-spin" color="#737373" />
                    <span className="text-base">Carregando influenciadores...</span>
                  </div>
                ) : null}
              </section>

              {totalFilteredProfiles === 0 &&
              rawTotalProfiles > 0 &&
              (searchTerm.trim() || filterNiche || filterLocation || filterAge) ? (
                <div className="rounded-xl border border-neutral-200 bg-neutral-50 py-12 text-center text-neutral-500">
                  Nenhum perfil corresponde aos filtros selecionados.
                </div>
              ) : null}
            </>
          )}
        </div>
      )}

      {/* Modais */}
      {selectedInfluencer && modalType && (
        <Modal
          title={
            modalType === "discover"
              ? "Ativar Discover"
              : modalType === "invite"
                ? "Convidar para campanha"
                : modalType === "preselection"
                  ? "Mover para pré-seleção"
                  : "Adicionar para curadoria"
          }
          onClose={handleCloseModal}
          panelClassName={
            modalType === "invite" || modalType === "preselection"
              ? "max-w-[800px]"
              : undefined
          }
        >
          <div className="flex flex-col gap-6">
            {(modalType === "invite" || modalType === "preselection") && (
              <>
                {needsInviteProfilePicker && (
                  <div className="flex flex-col gap-3">
                    <p className="text-base font-medium text-neutral-950">
                      {modalType === "invite"
                        ? "Selecione o perfil para convite"
                        : "Quais perfis incluir na pré-seleção?"}
                    </p>
                    {isLoadingProfiles ? (
                      <p className="text-sm text-neutral-500">Carregando perfis...</p>
                    ) : influencerProfiles.length === 0 ? (
                      <div className="rounded-xl bg-neutral-100 p-4 text-center">
                        <p className="text-sm text-neutral-500">
                          Nenhum perfil disponível para convite ou pré-seleção nesta campanha.
                        </p>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-3">
                        {influencerProfiles.map((profile) => {
                          const isSelected = selectedProfileIds.includes(profile.id);
                          const networkLabel =
                            profile.type_label || getSocialNetworkLabel(profile.type);
                          const handle = profile.username?.replace(/^@/, "").trim() || "—";
                          const avatarSrc = profile.avatar
                            ? getUploadUrl(profile.avatar) ?? undefined
                            : undefined;
                          const followersLabel = formatFollowers(profile.members ?? 0);
                          const engagementLabel = formatEngagementPercent(
                            profile.engagement_percent ?? undefined
                          );

                          return (
                            <button
                              key={profile.id}
                              type="button"
                              onClick={() => {
                                if (isSelected) {
                                  setSelectedProfileIds(
                                    selectedProfileIds.filter((id) => id !== profile.id)
                                  );
                                } else {
                                  setSelectedProfileIds([...selectedProfileIds, profile.id]);
                                }
                              }}
                              className={`group flex w-full cursor-pointer items-stretch gap-3 rounded-xl border-2 p-3 text-left transition-colors sm:gap-4 sm:p-4 ${
                                isSelected
                                  ? "border-primary-600 bg-primary-50/40 ring-1 ring-primary-600/20"
                                  : "border-neutral-200 bg-neutral-50 hover:border-neutral-300 hover:bg-white"
                              }`}
                            >
                              <span
                                className={`mt-1 flex size-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                                  isSelected
                                    ? "border-primary-600 bg-primary-600"
                                    : "border-neutral-300 bg-white group-hover:border-neutral-400"
                                }`}
                              >
                                {isSelected && (
                                  <Icon name="Check" size={14} color="#FAFAFA" />
                                )}
                              </span>
                              <div className="size-14 shrink-0 overflow-hidden rounded-xl bg-neutral-200 sm:size-16">
                                {avatarSrc ? (
                                  <img
                                    src={avatarSrc}
                                    alt=""
                                    className="size-full object-cover"
                                  />
                                ) : (
                                  <div className="flex size-full items-center justify-center text-xs font-semibold uppercase text-neutral-500">
                                    {networkLabel.slice(0, 2)}
                                  </div>
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="mb-1 flex flex-wrap items-center gap-2">
                                  <span className="rounded-full bg-neutral-200 px-2.5 py-0.5 text-xs font-semibold text-neutral-800">
                                    {networkLabel}
                                  </span>
                                </div>
                                <p className="truncate text-base font-semibold text-neutral-950">
                                  @{handle}
                                </p>
                                {profile.name?.trim() &&
                                  profile.name.trim().toLowerCase() !== handle.toLowerCase() && (
                                    <p className="truncate text-sm text-neutral-600">
                                      {profile.name}
                                    </p>
                                  )}
                                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-neutral-600">
                                  <span>
                                    <span className="text-neutral-500">Seguidores </span>
                                    <span className="font-medium text-neutral-900">
                                      {followersLabel}
                                    </span>
                                  </span>
                                  <span>
                                    <span className="text-neutral-500">Engajamento </span>
                                    <span className="font-medium text-neutral-900">
                                      {engagementLabel}
                                    </span>
                                  </span>
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* Figma 2387:12772 — resumo do convite (rede já definida pelo card) */}
                <div className="rounded-xl bg-neutral-100 p-3">
                  <div className="flex items-center gap-3">
                    <div className="size-11 shrink-0 overflow-hidden rounded-xl bg-neutral-200">
                      {selectedInfluencer.avatar ? (
                        <img
                          src={getUploadUrl(selectedInfluencer.avatar) ?? ""}
                          alt={selectedInfluencer.name}
                          className="size-full object-cover"
                        />
                      ) : (
                        <div className="flex size-full items-center justify-center text-lg font-medium text-neutral-500">
                          {selectedInfluencer.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-base font-semibold leading-5 text-neutral-950">
                        {selectedInfluencer.name}
                      </p>
                      <p className="truncate text-sm leading-5 text-neutral-500">
                        @{selectedInfluencer.username}
                      </p>
                      {selectedInfluencer.socialNetwork ? (
                        <p className="mt-1 text-xs font-medium text-neutral-600">
                          {getSocialNetworkLabel(selectedInfluencer.socialNetwork)}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-base font-medium text-neutral-950">
                    Mensagem para o convidado (opcional)
                  </label>
                  <textarea
                    placeholder="Digite uma mensagem..."
                    value={inviteMessage}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value.length <= 25) setInviteMessage(value);
                    }}
                    maxLength={25}
                    className="min-h-[120px] w-full resize-y rounded-xl border-0 bg-neutral-100 px-4 py-3 text-base text-neutral-950 outline-none placeholder:text-neutral-500 focus:ring-2 focus:ring-primary-500/30"
                  />
                  <div className="flex justify-end">
                    <span
                      className={`text-xs ${inviteMessage.length >= 25 ? "text-danger-600" : "text-neutral-500"}`}
                    >
                      {inviteMessage.length}/25
                    </span>
                  </div>
                </div>

                <div className="flex justify-end gap-2.5 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCloseModal}
                    className="h-11 rounded-full border-neutral-200 px-6 text-base font-semibold"
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="button"
                    onClick={handleConfirm}
                    disabled={invitePreSubmitDisabled}
                    className="h-11 rounded-full border-0 bg-primary-600 px-6 text-base font-semibold text-white hover:bg-primary-700"
                  >
                    {isInviting
                      ? "Processando..."
                      : isAddingToPreSelection
                        ? "Processando..."
                        : modalType === "preselection"
                          ? "Mover para pré-seleção"
                          : "Enviar convite"}
                  </Button>
                </div>
              </>
            )}

            {modalType !== "invite" && modalType !== "preselection" && (
              <div className="flex items-center gap-4">
                <Avatar
                  src={selectedInfluencer?.avatar || ""}
                  alt={selectedInfluencer?.name || ""}
                  size="lg"
                />
                <div>
                  <h3 className="text-lg font-semibold text-neutral-950">
                    {selectedInfluencer?.name}
                  </h3>
                  <p className="text-neutral-600">@{selectedInfluencer?.username}</p>
                </div>
              </div>
            )}

            {modalType === "discover" && (
              <div className="bg-primary-50 rounded-2xl p-4">
                <p className="text-sm text-primary-900">
                  O Discover permite que este influenciador encontre sua campanha
                  automaticamente através de recomendações baseadas no perfil dele.
                </p>
              </div>
            )}

            {modalType === "curation" && (
              <div className="flex flex-col gap-4">
                {isLoadingProfiles ? (
                  <div className="text-center py-4">
                    <p className="text-sm text-neutral-600">Verificando perfis...</p>
                  </div>
                ) : allowedSocialNetworks.length > 0 && influencerProfiles.length === 0 ? (
                  <div className="bg-warning-50 border-2 border-warning-300 rounded-2xl p-4">
                    <p className="text-sm text-warning-900 font-medium mb-1">
                      Atenção: Perfis não compatíveis
                    </p>
                    <p className="text-xs text-warning-700">
                      Este influenciador não possui perfis nas redes sociais definidas na campanha ({allowedSocialNetworks.map(n => n.charAt(0).toUpperCase() + n.slice(1)).join(", ")}).
                      Ainda assim, você pode adicioná-lo para curadoria, mas ele precisará ter perfis compatíveis para participar da campanha.
                    </p>
                  </div>
                ) : null}
                <div className="flex flex-col gap-1">
                  <Textarea
                    label="Notas para curadoria"
                    placeholder="Adicione observações sobre este influenciador..."
                    value={curationNotes}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value.length <= 25) {
                        setCurationNotes(value);
                      }
                    }}
                    maxLength={25}
                  />
                  <div className="flex justify-end">
                    <span className={`text-xs ${curationNotes.length >= 25 ? "text-danger-600" : "text-neutral-500"}`}>
                      {curationNotes.length}/25
                    </span>
                  </div>
                </div>
              </div>
            )}

            {modalType !== "selectList" && modalType !== "invite" && modalType !== "preselection" && (
              <div className="flex gap-3">
                <Button variant="outline" onClick={handleCloseModal} className="flex-1">
                  Cancelar
                </Button>
                <Button
                  onClick={handleConfirm}
                  className="flex-1"
                  disabled={isInviting || isAddingToPreSelection || isUpdatingStatus}
                >
                  {isInviting || isAddingToPreSelection || isUpdatingStatus
                    ? "Processando..."
                    : modalType === "curation"
                      ? "Adicionar para curadoria"
                      : "Confirmar"}
                </Button>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Modal de seleção de lista */}
      {modalType === "selectList" && (
        <ListSelector
          campaignId={campaignId}
          defaultOpen
          onClose={handleCloseModal}
        />
      )}

      {/* Modal de data limite do mural (só renderiza aqui quando não controlado pelo parent) */}
      {!onOpenMuralModal && showMuralDateModal && (() => {
        const phase1Date = _campaignPhases?.[0]?.publish_date || "";
        const validation = tempMuralEndDate
          ? validateMuralEndDate(tempMuralEndDate, phase1Date)
          : { valid: true };
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const minDate = formatDateForInput(addDays(today, 1));
        const maxDate = validation.maxDate;

        return (
          <Modal
            title="Ativar Descobrir - Definir data limite"
            onClose={() => {
              setShowMuralDateModal(false);
              setTempMuralEndDate("");
            }}
          >
            <div className="flex flex-col gap-6">
              <div className="bg-primary-50 rounded-2xl p-4 mb-2">
                <p className="text-sm font-medium text-primary-900 mb-2">
                  O que é o Descobrir?
                </p>
                <p className="text-sm text-primary-800">
                  O Descobrir permite que influenciadores encontrem e se inscrevam na sua campanha.
                  Ao ativar, sua campanha ficará visível na seção de descoberta do app, aumentando
                  o alcance e facilitando o processo de seleção de influenciadores.
                </p>
              </div>
              <p className="text-sm text-neutral-600">
                Defina até quando o Descobrir ficará ativo para receber inscrições. A data limite precisa ser maior que a data atual e pelo menos 7 dias menor que a data prevista da fase 1.
              </p>
              <InputDate
                label="Data limite para receber inscrições"
                value={tempMuralEndDate}
                onChange={setTempMuralEndDate}
                min={minDate}
                max={maxDate}
                error={validation.error}
              />
              {phase1Date && (
                <p className="text-xs text-neutral-500">
                  Data da fase 1: {new Date(phase1Date).toLocaleDateString("pt-BR")} |
                  Data máxima permitida: {maxDate ? new Date(maxDate).toLocaleDateString("pt-BR") : "N/A"}
                </p>
              )}
              {tempMuralEndDate && validation.valid && (
                <div className="bg-primary-50 rounded-2xl p-4">
                  <p className="text-sm text-primary-900">
                    O Descobrir ficará ativo até{" "}
                    <strong>{new Date(tempMuralEndDate).toLocaleDateString("pt-BR")}</strong>. Você poderá desativá-lo a qualquer momento antes desta data.
                  </p>
                </div>
              )}
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowMuralDateModal(false);
                    setTempMuralEndDate("");
                  }}
                  disabled={isActivatingMural}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleActivateMural}
                  disabled={!tempMuralEndDate || isActivatingMural || !validation.valid}
                  className="flex-1"
                >
                  {isActivatingMural ? "Ativando..." : "Ativar Descobrir"}
                </Button>
              </div>
            </div>
          </Modal>
        );
      })()}
    </>
  );
}

