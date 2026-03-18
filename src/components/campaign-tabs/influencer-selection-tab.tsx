import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useNavigate, useParams } from "@tanstack/react-router";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/ui/icon";
import { InputDate } from "@/components/ui/input-date";
import { Select } from "@/components/ui/select";
import { Modal } from "@/components/ui/modal";
import { Avatar } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/text-area";
import type { Influencer } from "@/shared/types";
import { useCampaignRecommendations } from "@/hooks/use-catalog";
import { useInfluencersCatalog } from "@/hooks/use-catalog";
import { useMuralStatus, useActivateMural, useDeactivateMural } from "@/hooks/use-campaign-mural";
import { useInviteInfluencer, useAddToPreSelection, useUpdateInfluencerStatus } from "@/hooks/use-campaign-influencers";
import { useCampaignUsers } from "@/hooks/use-campaign-users";
import { validateMuralEndDate, formatDateForInput, addDays } from "@/shared/utils/date-validations";
import { ListSelector } from "@/components/influencer-lists/list-selector";
import { getInfluencerProfiles } from "@/shared/services/influencer";
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

/** Skeleton da aba de seleção de influenciadores — espelha o layout real */
export function InfluencerSelectionTabSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      {/* Card Descobrir */}
      <div className="rounded-3xl p-6 border-2 border-neutral-200 bg-neutral-100">
        <div className="flex items-start gap-4">
          <Skeleton className="size-12 rounded-2xl shrink-0" />
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex items-center gap-3">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-6 w-24 rounded-full" />
            </div>
            <Skeleton className="h-4 w-full max-w-xl" />
            <Skeleton className="h-4 w-full max-w-md" />
            <div className="flex gap-3 pt-2">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-9 w-32 rounded-lg" />
            </div>
          </div>
        </div>
      </div>

      {/* Título + descrição */}
      <div className="flex flex-col gap-4">
        <Skeleton className="h-8 w-72" />
        <Skeleton className="h-5 w-full max-w-2xl" />
      </div>

      {/* Barra de filtros */}
      <div className="bg-white rounded-xl p-5 border border-neutral-200">
        <div className="flex flex-wrap items-end gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex-1 min-w-[140px] flex flex-col gap-1">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-11 w-full rounded-full" />
            </div>
          ))}
          <Skeleton className="h-11 w-36 rounded-full shrink-0" />
        </div>
      </div>

      {/* Recomendações */}
      <div className="bg-white rounded-xl p-6 border border-neutral-200">
        <div className="flex items-center justify-between mb-5">
          <Skeleton className="h-6 w-52" />
          <Skeleton className="h-6 w-32 rounded-full" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-neutral-100 rounded-xl p-4 flex flex-col gap-4">
              <div className="flex justify-between">
                <Skeleton className="size-[60px] rounded-2xl shrink-0" />
                <Skeleton className="size-10 rounded-lg shrink-0" />
              </div>
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <div className="flex gap-2">
                <Skeleton className="flex-1 h-16 rounded-lg" />
                <Skeleton className="flex-1 h-16 rounded-lg" />
              </div>
              <Skeleton className="h-9 w-24 rounded-xl" />
              <div className="flex gap-2">
                <Skeleton className="flex-1 h-11 rounded-full" />
                <Skeleton className="flex-1 h-11 rounded-full" />
              </div>
              <Skeleton className="h-4 w-20" />
            </div>
          ))}
        </div>
      </div>

      {/* Catálogo */}
      <div className="bg-white rounded-xl p-6 border border-neutral-200">
        <div className="flex items-center justify-between mb-5">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-6 w-36 rounded-full" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="bg-neutral-100 rounded-xl p-4 flex flex-col gap-4">
              <div className="flex justify-between">
                <Skeleton className="size-[60px] rounded-2xl shrink-0" />
                <Skeleton className="size-10 rounded-lg shrink-0" />
              </div>
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <div className="flex gap-2">
                <Skeleton className="flex-1 h-16 rounded-lg" />
                <Skeleton className="flex-1 h-16 rounded-lg" />
              </div>
              <Skeleton className="h-9 w-24 rounded-xl" />
              <div className="flex gap-2">
                <Skeleton className="flex-1 h-11 rounded-full" />
                <Skeleton className="flex-1 h-11 rounded-full" />
              </div>
              <Skeleton className="h-4 w-20" />
            </div>
          ))}
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

/** Card de influenciador no estilo Figma: avatar, stats, nicho, Convidar / Pré-seleção, Ver perfil */
function InfluencerCard({
  influencer,
  niches,
  isInCuration,
  onInvite,
  onPreSelection,
  onViewProfile,
  formatFollowers: fmt,
}: {
  influencer: ExtendedInfluencer;
  niches: Array<{ id: number; name: string }>;
  isInCuration: boolean;
  onInvite: () => void;
  onPreSelection: () => void;
  onViewProfile?: () => void;
  formatFollowers: (n: number) => string;
}) {
  const nicheLabel =
    influencer.niche &&
    (niches.find((n) => n.id.toString() === String(influencer.niche))?.name ?? String(influencer.niche));
  const avatarSrc = influencer.avatar ? getUploadUrl(influencer.avatar) : undefined;

  return (
    <div className="bg-neutral-100 rounded-xl p-4 flex flex-col gap-5">
      <div className="flex items-start justify-between">
        <div className="size-[60px] rounded-2xl overflow-hidden bg-neutral-200 shrink-0">
          {avatarSrc ? (
            <img src={avatarSrc} alt={influencer.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-neutral-500 font-medium text-lg">
              {influencer.name.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        <button
          type="button"
          className="w-10 h-10 rounded-lg bg-warning-200 flex items-center justify-center shrink-0 text-warning-600 hover:bg-warning-300"
          aria-label="Salvar"
        >
          <Icon name="Bookmark" size={24} color="currentColor" />
        </button>
      </div>
      <div className="flex flex-col gap-3 min-w-0">
        <p className="text-lg font-medium text-neutral-950 truncate">{influencer.name}</p>
        <p className="text-sm text-neutral-500 truncate">@{influencer.username}</p>
      </div>
      <div className="flex gap-2">
        <div className="flex-1 min-w-0 bg-neutral-200 rounded-lg p-3 flex flex-col gap-3">
          <p className="text-sm text-neutral-500">Seguidores</p>
          <p className="text-xl font-medium text-neutral-950">{fmt(influencer.followers)}</p>
        </div>
        <div className="flex-1 min-w-0 bg-neutral-200 rounded-lg p-3 flex flex-col gap-3">
          <p className="text-sm text-neutral-500">Engajamento</p>
          <p className="text-xl font-medium text-neutral-950">{influencer.engagement}%</p>
        </div>
      </div>
      {nicheLabel && (
        <div className="rounded-xl bg-primary-100 px-3 py-2">
          <span className="text-sm text-primary-600">{nicheLabel}</span>
        </div>
      )}
      <div className="flex flex-col gap-3">
        <div className="flex gap-2">
          {!isInCuration && (
            <Button
              className="flex-1 h-11 rounded-full bg-primary-600 hover:bg-primary-700 text-white border-0 font-semibold text-base"
              onClick={onInvite}
            >
              Convidar
            </Button>
          )}
          <Button variant="outline" className="flex-1 h-11 rounded-full font-semibold text-base" onClick={onPreSelection}>
            Pré-seleção
          </Button>
        </div>
        <button
          type="button"
          onClick={() => onViewProfile?.()}
          className="flex items-center gap-2 text-base font-medium text-neutral-500 underline hover:text-neutral-700 text-center mx-auto cursor-pointer"
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
  const [filterSocialNetwork] = useState("");
  const [filterAgeRange, setFilterAgeRange] = useState("");
  const [filterGender] = useState("");
  const [filterFollowersMin] = useState("");
  const [filterFollowersMax] = useState("");
  const [filterLocationCountry, setFilterLocationCountry] = useState("");
  const [filterLocationState, setFilterLocationState] = useState("");
  const [filterLocationCity] = useState("");
  const [showMuralDateModal, setShowMuralDateModal] = useState(false);
  const [selectedInfluencer, setSelectedInfluencer] = useState<ExtendedInfluencer | null>(null);
  const [modalType, setModalType] = useState<
    "discover" | "invite" | "curation" | "selectList" | "preselection" | null
  >(null);
  const [inviteMessage, setInviteMessage] = useState("");
  const [curationNotes, setCurationNotes] = useState("");
  const [tempMuralEndDate, setTempMuralEndDate] = useState("");
  const [selectedProfileIds, setSelectedProfileIds] = useState<string[]>([]);
  const recommendationsCarouselRef = useRef<HTMLDivElement>(null);
  const [carouselCanScrollLeft, setCarouselCanScrollLeft] = useState(false);
  const [carouselCanScrollRight, setCarouselCanScrollRight] = useState(true);

  // Buscar perfis do influenciador quando o modal de convite ou curadoria for aberto
  const { data: influencerProfilesData, isLoading: isLoadingProfiles } = useQuery({
    queryKey: ["influencer", selectedInfluencer?.id, "profiles"],
    queryFn: () => getInfluencerProfiles(selectedInfluencer!.id),
    enabled: !!selectedInfluencer && (modalType === "invite" || modalType === "curation" || modalType === "preselection"),
  });

  // Garantir que influencerProfiles seja sempre um array
  const influencerProfilesDataArray = Array.isArray(influencerProfilesData) ? influencerProfilesData : [];

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

  // Filtrar perfis do influenciador para mostrar apenas os permitidos
  const influencerProfiles = useMemo(() => {
    if (allowedSocialNetworks.length === 0) {
      // Se não há redes sociais definidas nas fases, mostrar todos os perfis
      return influencerProfilesDataArray;
    }
    return influencerProfilesDataArray.filter((profile) => {
      const profileType = profile.type?.toLowerCase() || "";
      return allowedSocialNetworks.includes(profileType);
    });
  }, [influencerProfilesDataArray, allowedSocialNetworks]);

  // Hooks para dados reais
  const { data: muralStatus } = useMuralStatus(campaignId);
  const { mutate: activateMural, isPending: isActivatingMural } = useActivateMural(campaignId);
  const { mutate: deactivateMural } = useDeactivateMural(campaignId);
  const { data: recommendations = [], isLoading: isLoadingRecommendations } = useCampaignRecommendations(campaignId);
  const { data: catalogData = [], isLoading: isLoadingCatalog } = useInfluencersCatalog({
    social_network: filterSocialNetwork || undefined,
    age_range: filterAgeRange || undefined,
    gender: filterGender || undefined,
    followers_min: filterFollowersMin ? parseInt(filterFollowersMin) : undefined,
    followers_max: filterFollowersMax ? parseInt(filterFollowersMax) : undefined,
    niche: filterNiche || undefined,
    country: filterLocationCountry || undefined,
    state: filterLocationState || undefined,
    city: filterLocationCity || undefined,
  });
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

  // Transformar recomendações para formato ExtendedInfluencer (API pode vir com dados em rec.influencer ou direto em rec)
  const recommendedInfluencers: ExtendedInfluencer[] = useMemo(() => {
    return recommendations.map((rec: any) => {
      const inf = rec.influencer ?? rec;
      return {
        id: inf.id,
        name: inf.name ?? "",
        username: inf.username ?? "",
        avatar: inf.avatar ?? "",
        followers: inf.followers ?? 0,
        engagement: inf.engagement ?? 0,
        niche: inf.niche ?? "",
        socialNetwork: inf.social_network,
        recommendationReason: rec.reason,
      };
    });
  }, [recommendations]);

  // Transformar catálogo para formato ExtendedInfluencer
  const catalogInfluencers: ExtendedInfluencer[] = useMemo(() => {
    return catalogData.map((inf: any) => ({
      id: inf.id,
      name: inf.name,
      username: inf.username || "",
      avatar: inf.avatar || "",
      followers: inf.followers || 0,
      engagement: inf.engagement || 0,
      niche: inf.niche || "",
      socialNetwork: inf.social_network,
      ageRange: inf.age_range,
      location: inf.location,
    }));
  }, [catalogData]);

  // Filtros são aplicados no backend via useInfluencersCatalog
  // Apenas filtro de busca local para recomendações
  const filteredRecommended = useMemo(() => {
    if (!searchTerm) return recommendedInfluencers;
    const searchLower = searchTerm.toLowerCase();
    return recommendedInfluencers.filter((inf) => {
      return (
        inf.name.toLowerCase().includes(searchLower) ||
        inf.username.toLowerCase().includes(searchLower)
      );
    });
  }, [recommendedInfluencers, searchTerm]);

  // Atualizar setas do carrossel de recomendações ao scroll/resize
  const updateCarouselArrows = useCallback(() => {
    const el = recommendationsCarouselRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCarouselCanScrollLeft(scrollLeft > 2);
    setCarouselCanScrollRight(scrollLeft < scrollWidth - clientWidth - 2);
  }, []);
  useEffect(() => {
    const el = recommendationsCarouselRef.current;
    if (!el) return;
    updateCarouselArrows();
    const ro = new ResizeObserver(updateCarouselArrows);
    ro.observe(el);
    el.addEventListener("scroll", updateCarouselArrows);
    return () => {
      ro.disconnect();
      el.removeEventListener("scroll", updateCarouselArrows);
    };
  }, [updateCarouselArrows, filteredRecommended.length]);

  // Catálogo já vem filtrado do backend, apenas busca local
  const filteredCatalog = useMemo(() => {
    if (!searchTerm) return catalogInfluencers;
    const searchLower = searchTerm.toLowerCase();
    return catalogInfluencers.filter((inf) => {
      return (
        inf.name.toLowerCase().includes(searchLower) ||
        inf.username.toLowerCase().includes(searchLower)
      );
    });
  }, [catalogInfluencers, searchTerm]);

  const ageRanges = useMemo(() => {
    const allRanges = new Set<string>();
    catalogInfluencers.forEach((inf) => {
      if (inf.ageRange) allRanges.add(inf.ageRange);
    });
    return Array.from(allRanges);
  }, [catalogInfluencers]);

  const countries = useMemo(() => {
    const allCountries = new Set<string>();
    catalogInfluencers.forEach((inf) => {
      if (inf.location?.country) allCountries.add(inf.location.country);
    });
    return Array.from(allCountries);
  }, [catalogInfluencers]);

  const states = useMemo(() => {
    const allStates = new Set<string>();
    catalogInfluencers.forEach((inf) => {
      if (inf.location?.state) allStates.add(inf.location.state);
    });
    return Array.from(allStates);
  }, [catalogInfluencers]);

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
        onError: (error: any) => {
          console.error("Erro ao desativar mural automaticamente:", error);
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
      youtube: "YouTube",
      tiktok: "TikTok",
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

  // Quando os perfis forem carregados, selecionar todos por padrão (convite e pré-seleção)
  useEffect(() => {
    if (influencerProfiles.length > 0 && (modalType === "invite" || modalType === "preselection")) {
      setSelectedProfileIds(influencerProfiles.map((p) => p.id));
    }
  }, [influencerProfiles, modalType]);

  const handleConfirm = async () => {
    if (!selectedInfluencer) return;

    if (modalType === "preselection") {
      addToPreSelection(
        {
          influencer_id: selectedInfluencer.id,
          message: inviteMessage || undefined,
          profile_ids: selectedProfileIds.length > 0 ? selectedProfileIds : undefined,
        },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({
              queryKey: ["campaigns", campaignId, "influencers"],
            });
            queryClient.invalidateQueries({
              queryKey: ["campaigns", campaignId, "dashboard"],
            });
            queryClient.invalidateQueries({
              queryKey: ["campaigns", campaignId, "users"],
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
      // Validar se pelo menos um perfil foi selecionado
      if (selectedProfileIds.length === 0) {
        toast.error("Selecione pelo menos um perfil para convidar");
        return;
      }

      inviteInfluencer(
        {
          influencer_id: selectedInfluencer.id,
          message: inviteMessage || undefined,
          profile_ids: selectedProfileIds,
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

  return (
    <>
      {isLoadingRecommendations && isLoadingCatalog ? (
        <InfluencerSelectionTabSkeleton />
      ) : (
        <div className="flex flex-col gap-6">

          {/* Título e descrição (Figma) */}
          <div className="flex flex-col gap-4">
            <h2 className="text-2xl font-semibold text-neutral-950">
              Selecione influenciadores
            </h2>
            <p className="text-base text-neutral-500 max-w-2xl">
              Busque, filtre e convide perfis para participar da campanha — individualmente ou em massa.
            </p>
          </div>

          {/* Recomendações — carrossel horizontal (Figma) */}
          <div className="bg-white rounded-xl p-5">
            <h3 className="text-xl font-semibold text-neutral-950 mb-6">
              Recomendado com base no perfil da campanha
            </h3>
            {isLoadingRecommendations ? (
              <div className="flex items-center justify-center gap-2 py-12 text-neutral-500">
                <Icon name="Loader" size={24} className="animate-spin" color="#737373" />
                <span>Carregando influenciadores...</span>
              </div>
            ) : filteredRecommended.length === 0 ? (
              <div className="text-center py-12 text-neutral-500">
                Nenhum influenciador encontrado
              </div>
            ) : (
              <div className="relative flex items-stretch">
                <button
                  type="button"
                  onClick={() => {
                    const el = recommendationsCarouselRef.current;
                    if (el) el.scrollBy({ left: -el.clientWidth, behavior: "smooth" });
                  }}
                  disabled={!carouselCanScrollLeft}
                  className="absolute left-[-18px] top-1/2 -translate-y-1/2 z-10 size-9 rounded-full bg-white border border-neutral-300 shadow-sm flex items-center justify-center text-neutral-600 hover:bg-neutral-50 hover:border-neutral-400 transition-colors disabled:opacity-40 disabled:pointer-events-none shrink-0"
                  aria-label="Cards anteriores"
                >
                  <Icon name="ChevronLeft" size={24} color="#525252" />
                </button>
                <div
                  ref={recommendationsCarouselRef}
                  className="flex gap-3 overflow-x-auto overflow-y-hidden py-2 scroll-smooth snap-x snap-mandatory flex-1 min-w-0 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
                >
                  {filteredRecommended.map((influencer) => (
                    <div
                      key={influencer.id}
                      className="shrink-0 w-[269px] min-w-[269px] snap-start"
                    >
                      <InfluencerCard
                        influencer={influencer}
                        niches={niches}
                        isInCuration={isInfluencerInCuration(influencer.id)}
                        onInvite={() => handleAction(influencer, "invite")}
                        onPreSelection={() => handleAction(influencer, "preselection")}
                        onViewProfile={() =>
                          navigate({
                            to: "/campaigns/$campaignId/influencer/$influencerId",
                            params: { campaignId: campaignId ?? "", influencerId: influencer.id },
                          })
                        }
                        formatFollowers={formatFollowers}
                      />
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const el = recommendationsCarouselRef.current;
                    if (el) el.scrollBy({ left: el.clientWidth, behavior: "smooth" });
                  }}
                  disabled={!carouselCanScrollRight}
                  className="absolute right-[-18px] top-1/2 -translate-y-1/2 z-10 size-9 rounded-full bg-white border border-neutral-300 shadow-sm flex items-center justify-center text-neutral-600 hover:bg-neutral-50 hover:border-neutral-400 transition-colors disabled:opacity-40 disabled:pointer-events-none shrink-0"
                  aria-label="Próximos cards"
                >
                  <Icon name="ChevronRight" size={24} color="#525252" />
                </button>
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl p-5">
            <div className="flex flex-wrap items-end gap-3">
              <div className="flex-1 min-w-[200px] flex flex-col gap-1">
                <label className="text-base font-medium text-neutral-950">Buscar influenciador</label>
                <div className="bg-neutral-100 rounded-full px-4 py-3 flex items-center gap-2">
                  <Icon name="Search" color="#A3A3A3" size={20} />
                  <input
                    type="text"
                    placeholder="Nome ou @username"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="flex-1 min-w-0 bg-transparent text-base text-neutral-950 placeholder:text-neutral-400 outline-none"
                  />
                </div>
              </div>
              <div className="flex-1 min-w-[140px] flex flex-col gap-1">
                <label className="text-base font-medium text-neutral-950">Nicho</label>
                <Select
                  placeholder="Selecione um nicho"
                  options={niches.map((n) => ({ value: String(n.id), label: n.name }))}
                  value={filterNiche}
                  onChange={setFilterNiche}
                  isSearchable
                />
              </div>
              <div className="flex-1 min-w-[140px] flex flex-col gap-1">
                <label className="text-base font-medium text-neutral-950">Localização</label>
                <Select
                  placeholder="Selecione o local"
                  options={
                    states.length > 0
                      ? states.map((s) => ({ value: `state:${s}`, label: s }))
                      : countries.map((c) => ({ value: `country:${c}`, label: c }))
                  }
                  value={
                    filterLocationState ? `state:${filterLocationState}` : filterLocationCountry ? `country:${filterLocationCountry}` : ""
                  }
                  onChange={(v) => {
                    if (v.startsWith("state:")) {
                      setFilterLocationState(v.slice(6));
                      setFilterLocationCountry("");
                    } else if (v.startsWith("country:")) {
                      setFilterLocationCountry(v.slice(8));
                      setFilterLocationState("");
                    } else {
                      setFilterLocationState("");
                      setFilterLocationCountry("");
                    }
                  }}
                />
              </div>
              <div className="flex-1 min-w-[140px] flex flex-col gap-1">
                <label className="text-base font-medium text-neutral-950">Idade</label>
                <Select
                  placeholder="Selecione a idade"
                  options={ageRanges.map((range) => ({ value: range, label: range }))}
                  value={filterAgeRange}
                  onChange={setFilterAgeRange}
                />
              </div>
              <Button
                variant="outline"
                className="shrink-0 h-11 px-4 rounded-full border-neutral-200"
                onClick={() => setModalType("selectList")}
              >
                <span className="font-semibold text-base">Selecionar lista</span>
              </Button>
            </div>
          </div>

          {/* Catálogo de influenciadores — cards no estilo Figma */}
          <div className="bg-white rounded-xl p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold text-neutral-950">
                Catálogo de influenciadores
              </h3>
              <Badge
                text={`${filteredCatalog.length} perfis encontrados`}
                backgroundColor="bg-primary-50"
                textColor="text-primary-900"
              />
            </div>

            {isLoadingCatalog ? (
              <div className="flex items-center justify-center gap-2 py-12 text-neutral-500">
                <Icon name="Loader" size={24} className="animate-spin" color="#737373" />
                <span>Carregando influenciadores...</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {filteredCatalog.map((influencer) => (
                  <InfluencerCard
                    key={influencer.id}
                    influencer={influencer}
                    niches={niches}
                    isInCuration={isInfluencerInCuration(influencer.id)}
                    onInvite={() => handleAction(influencer, "invite")}
                    onPreSelection={() => handleAction(influencer, "preselection")}
                    onViewProfile={() =>
                      navigate({
                        to: "/campaigns/$campaignId/influencer/$influencerId",
                        params: { campaignId: campaignId ?? "", influencerId: influencer.id },
                      })
                    }
                    formatFollowers={formatFollowers}
                  />
                ))}
              </div>
            )}
            {!isLoadingCatalog && filteredCatalog.length === 0 && (
              <div className="text-center py-12 text-neutral-500">
                Nenhum influenciador encontrado no catálogo
              </div>
            )}
          </div>
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
        >
          <div className="flex flex-col gap-6">
            {(modalType === "invite" || modalType === "preselection") && (
              <>
                {/* Deseja convidar / mover por qual rede social? */}
                <div className="flex flex-col gap-3">
                  <p className="text-base font-medium text-neutral-950">
                    {modalType === "invite"
                      ? "Deseja convidar por qual rede social?"
                      : "Quais perfis incluir na pré-seleção?"}
                  </p>
                  {isLoadingProfiles ? (
                    <p className="text-sm text-neutral-500">Carregando perfis...</p>
                  ) : influencerProfiles.length === 0 ? (
                    <div className="bg-neutral-100 rounded-xl p-4 text-center">
                      <p className="text-sm text-neutral-500">
                        {allowedSocialNetworks.length > 0
                          ? `Este influenciador não possui perfis nas redes definidas na campanha (${allowedSocialNetworks.map((n) => n.charAt(0).toUpperCase() + n.slice(1)).join(", ")}).`
                          : "Nenhum perfil encontrado para este influenciador."}
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

                {/* Card do influenciador (Figma) */}
                <div className="bg-neutral-100 rounded-xl p-4 flex items-center gap-3">
                  <div className="size-11 rounded-2xl overflow-hidden bg-neutral-200 shrink-0">
                    {selectedInfluencer.avatar ? (
                      <img
                        src={getUploadUrl(selectedInfluencer.avatar)}
                        alt={selectedInfluencer.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-neutral-500 font-medium text-lg">
                        {selectedInfluencer.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-lg font-medium text-neutral-950 truncate">
                      {selectedInfluencer.name}
                    </p>
                    <p className="text-sm text-neutral-500 truncate">
                      @{selectedInfluencer.username}
                    </p>
                  </div>
                </div>

                {/* Mensagem para o convidado (opcional) — Figma */}
                <div className="flex flex-col gap-1">
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
                    className="w-full min-h-[120px] bg-neutral-100 rounded-xl px-4 py-3 text-base text-neutral-950 placeholder:text-neutral-500 border-0 outline-none focus:ring-2 focus:ring-primary-500/30 resize-y"
                  />
                  <div className="flex justify-end">
                    <span className={`text-xs ${inviteMessage.length >= 25 ? "text-danger-600" : "text-neutral-500"}`}>
                      {inviteMessage.length}/25
                    </span>
                  </div>
                </div>

                {/* Botões: Cancelar + Enviar convite / Mover para pré-seleção */}
                <div className="flex gap-2.5 justify-end pt-2">
                  <Button
                    variant="outline"
                    onClick={handleCloseModal}
                    className="h-11 px-6 rounded-full font-semibold text-base border-neutral-200"
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleConfirm}
                    disabled={
                      isInviting ||
                      isAddingToPreSelection ||
                      isUpdatingStatus ||
                      (modalType === "invite" && influencerProfiles.length > 0 && selectedProfileIds.length === 0) ||
                      (modalType === "invite" && allowedSocialNetworks.length > 0 && influencerProfiles.length === 0)
                    }
                    className="h-11 px-6 rounded-full font-semibold text-base bg-primary-600 hover:bg-primary-700 text-white border-0"
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

