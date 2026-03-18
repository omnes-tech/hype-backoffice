import { useState, useMemo, useCallback, useEffect } from "react";
import { useNavigate, useParams } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/ui/icon";
import { Modal } from "@/components/ui/modal";
import { Avatar } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/text-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Select } from "@/components/ui/select";
import type { Influencer } from "@/shared/types";
import { useBulkInfluencerActions } from "@/hooks/use-bulk-influencer-actions";
import { useUpdateInfluencerStatus, useMoveToPreSelectionCuration } from "@/hooks/use-campaign-influencers";
import { useNiches } from "@/hooks/use-niches";
import { getUploadUrl } from "@/lib/utils/api";

interface ApplicationsTabProps {
  influencers: Influencer[];
  isLoading?: boolean;
}

function Skeleton({ className }: { className?: string }) {
  return <div className={`skeleton ${className ?? ""}`} aria-hidden />;
}

/** Skeleton da aba Inscrições — espelha o layout real */
export function ApplicationsTabSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4">
        <Skeleton className="h-8 w-72" />
        <Skeleton className="h-5 w-full max-w-2xl" />
      </div>
      <div className="bg-neutral-200 rounded-lg p-1 flex w-full max-w-md">
        <Skeleton className="flex-1 h-11 rounded-md" />
        <Skeleton className="flex-1 h-11 rounded-md" />
      </div>
      <div className="bg-white rounded-xl p-6 border border-neutral-200">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
          <div className="flex items-center gap-2">
            <Skeleton className="size-6 rounded" />
            <Skeleton className="h-5 w-40" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-11 w-44 rounded-full" />
            <Skeleton className="h-11 w-40 rounded-full" />
            <Skeleton className="h-11 w-44 rounded-full" />
          </div>
        </div>
        <div className="flex flex-wrap items-end gap-3 mb-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="flex-1 min-w-[140px] flex flex-col gap-1">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-11 w-full rounded-full" />
            </div>
          ))}
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

// Interface para representar uma inscrição com perfil de rede social
interface ApplicationWithProfile {
  influencerId: string;
  influencerName: string;
  influencerUsername: string;
  influencerAvatar: string;
  influencerFollowers: number;
  influencerEngagement: number;
  influencerNiche: string;
  profileId: string;
  profileType: string;
  profileTypeLabel: string;
  profileUsername: string;
  profileFollowers: number;
  profileKey: string; // Chave única: influencerId-profileId
}

/** Card único para inscrições orgânicas e pré-seleções — layout Figma (node 2392-16329) */
function ApplicationCard({
  app,
  nicheName,
  isSelected,
  isUpdatingStatus,
  sentAt,
  onSelect,
  onApprove,
  onReject,
  onMoveToCuration,
  onViewPhases,
  /** Pré-seleções enviadas: só visualização (sem aprovar/reprovar/curadoria) */
  hideWorkflowActions,
}: {
  app: ApplicationWithProfile;
  nicheName: string | null;
  isSelected: boolean;
  isUpdatingStatus: boolean;
  sentAt?: string | null;
  onSelect: () => void;
  onApprove: () => void;
  onReject: () => void;
  onMoveToCuration: () => void;
  onViewPhases: () => void;
  hideWorkflowActions?: boolean;
}) {
  const followers = app.profileFollowers > 0 ? app.profileFollowers : app.influencerFollowers;
  const sentAtLabel = sentAt
    ? new Date(sentAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" })
    : "—";

  return (
    <div
      className={`bg-neutral-100 rounded-xl p-3 flex flex-col gap-5 border transition-colors ${isSelected
        ? "border-primary-500 ring-1 ring-primary-200"
        : "border-transparent"
        }`}
    >
      {/* Top: avatar + checkbox (-8px) + bookmark amarelo 40px rounded-lg */}
      <div className="flex items-center justify-between">
        <div className="relative shrink-0">
          <img
            src={getUploadUrl(app.influencerAvatar) ?? undefined}
            alt={app.influencerName}
            className="size-[60px] rounded-2xl object-cover bg-neutral-200"
          />
          {!hideWorkflowActions && (
            <button
              type="button"
              onClick={onSelect}
              className="absolute -left-2 -top-2 size-7 rounded-full bg-white border border-neutral-200 flex items-center justify-center shadow-sm"
            >
              {isSelected ? (
                <Icon name="Check" size={14} color="var(--color-primary-600)" className="text-primary-600" />
              ) : (
                <div className="size-3 rounded-full border-2 border-neutral-300" />
              )}
            </button>
          )}
        </div>
        <button
          type="button"
          className="size-10 rounded-lg flex items-center justify-center shrink-0 bg-[#ffdf2a]"
          aria-label="Salvar"
        >
          <Icon name="Bookmark" size={24} color="#171717" />
        </button>
      </div>

      {/* Nome + @username */}
      <div className="flex flex-col gap-0.5">
        <p className="text-lg font-medium text-neutral-950 truncate leading-6">
          {app.influencerName}
        </p>
        <p className="text-sm text-neutral-500 truncate leading-5">
          @{app.profileUsername}
        </p>
      </div>

      {/* Stats: Seguidores | Engajamento — boxes #e4e4e4, label 14px, value 20px */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-neutral-200 rounded-lg p-3 flex flex-col gap-1">
          <p className="text-sm text-neutral-500">Seguidores</p>
          <p className="text-xl font-medium text-neutral-950">
            {followers.toLocaleString("pt-BR")}
          </p>
        </div>
        <div className="bg-neutral-200 rounded-lg p-3 flex flex-col gap-1">
          <p className="text-sm text-neutral-500">Engajamento</p>
          <p className="text-xl font-medium text-neutral-950">
            {app.influencerEngagement}%
          </p>
        </div>
      </div>

      {/* Nicho — tag primary-100, text primary-600, rounded-xl, p-3 */}
      {nicheName && (
        <div className="rounded-xl bg-primary-100 px-3 py-3">
          <p className="text-sm text-primary-600 font-normal">{nicheName}</p>
        </div>
      )}

      {/* Enviado em + ações (só inscrições orgânicas) */}
      <div className="flex flex-col gap-3">
        <p className="text-base font-medium text-neutral-500 leading-5">
          Enviado em: {sentAtLabel}
        </p>
        {!hideWorkflowActions && (
          <>
            <div className="flex gap-1">
              <Button
                onClick={onApprove}
                disabled={isUpdatingStatus}
                className="h-11 rounded-full font-semibold text-base bg-primary-600 hover:bg-primary-700 text-white border-0"
              >
                <Icon name="Check" size={24} color="#fafafa" />
                Aprovar
              </Button>
              <Button
                variant="outline"
                onClick={onReject}
                disabled={isUpdatingStatus}
                className="h-11 rounded-full font-semibold text-base border-neutral-200 text-neutral-600 hover:bg-neutral-50 hover:text-neutral-700"
              >
                <Icon name="X" size={24} color="#525252" />
                Reprovar
              </Button>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={onViewPhases}
                className="flex items-center gap-1 text-base font-medium text-neutral-500 underline hover:text-neutral-700"
              >
                <Icon name="Link" size={24} color="#737373" />
                Ver perfil
              </button>
              <button
                type="button"
                onClick={onMoveToCuration}
                disabled={isUpdatingStatus}
                className="flex items-center gap-1 text-base font-medium text-neutral-500 underline hover:text-neutral-700"
              >
                <Icon name="ArrowRight" size={16} color="#737373" />
                Mover para curadoria
              </button>
            </div>
          </>
        )}
        {hideWorkflowActions && (
          <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
            <button
              type="button"
              onClick={onViewPhases}
              className="flex items-center gap-1 text-base font-medium text-neutral-500 underline hover:text-neutral-700"
            >
              <Icon name="Link" size={24} color="#737373" />
              Ver perfil
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export function ApplicationsTab({ influencers, isLoading }: ApplicationsTabProps) {
  const navigate = useNavigate();
  const { campaignId } = useParams({
    from: "/(private)/(app)/campaigns/$campaignId",
  });
  const { data: niches = [] } = useNiches();
  const [selectedInfluencer, setSelectedInfluencer] =
    useState<Influencer | null>(null);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectionFeedback, setRejectionFeedback] = useState("");
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [selectedProfileInfluencer, setSelectedProfileInfluencer] = useState<Influencer | null>(null);
  const [selectedInfluencers, setSelectedInfluencers] = useState<Set<string>>(
    new Set()
  );
  const [isBulkActionModalOpen, setIsBulkActionModalOpen] = useState(false);
  const [bulkActionType, setBulkActionType] = useState<
    "curation" | "approve" | "reject" | null
  >(null);
  const [bulkRejectionFeedback, setBulkRejectionFeedback] = useState("");

  // Segmento: "organic" (Inscrições Orgânicas) | "preselection" (Pré-seleções Enviadas)
  const [segmentTab, setSegmentTab] = useState<"organic" | "preselection">("organic");

  useEffect(() => {
    setSelectedInfluencers(new Set());
  }, [segmentTab]);

  // Estados de filtros
  const [searchTerm, setSearchTerm] = useState("");
  const [filterNiche, setFilterNiche] = useState("");
  const [filterFollowersMin, setFilterFollowersMin] = useState("");
  const [filterFollowersMax, setFilterFollowersMax] = useState("");
  const [filterEngagementMin, setFilterEngagementMin] = useState("");
  const [filterEngagementMax, setFilterEngagementMax] = useState("");

  // Hooks para bulk operations
  const {
    approve: bulkApprove,
    reject: bulkReject,
    isApproving,
    isRejecting,
  } = useBulkInfluencerActions({ campaignId });
  const { mutate: updateStatus, isPending: isUpdatingStatus } = useUpdateInfluencerStatus(campaignId);
  const {
    mutate: moveToPreSelectionCuration,
    mutateAsync: moveToPreSelectionCurationAsync,
    isPending: isMovingToPreSelectionCuration,
  } = useMoveToPreSelectionCuration(campaignId);

  // Helper para construir itens do tipo ApplicationWithProfile a partir de perfis com um dado status
  const buildListByProfileStatus = useMemo(() => {
    const networkLabels: { [key: string]: string } = {
      instagram: "Instagram",
      tiktok: "TikTok",
      youtube: "YouTube",
      ugc: "UGC",
    };

    return (statusFilter: string): ApplicationWithProfile[] => {
      const applications: ApplicationWithProfile[] = [];
      const statusNorm = statusFilter.toLowerCase().trim();

      influencers.forEach((inf) => {
        const profiles = inf.social_networks || [];
        const infStatus = String(inf.status || "").toLowerCase().trim();

        const matchingProfiles = profiles.filter((profile) => {
          const profileStatus = String(profile.status || "").toLowerCase().trim();
          return profileStatus === statusNorm;
        });

        if (matchingProfiles.length === 0) {
          if (infStatus === statusNorm && profiles.length === 0) {
            applications.push({
              influencerId: inf.id,
              influencerName: inf.name,
              influencerUsername: inf.username,
              influencerAvatar: inf.avatar,
              influencerFollowers: inf.followers,
              influencerEngagement: inf.engagement,
              influencerNiche: inf.niche || "",
              profileId: "",
              profileType: "",
              profileTypeLabel: "Geral",
              profileUsername: inf.username,
              profileFollowers: inf.followers,
              profileKey: `${inf.id}-general`,
            });
          }
        } else {
          matchingProfiles.forEach((profile) => {
            applications.push({
              influencerId: inf.id,
              influencerName: inf.name,
              influencerUsername: inf.username,
              influencerAvatar: inf.avatar,
              influencerFollowers: inf.followers,
              influencerEngagement: inf.engagement,
              influencerNiche: inf.niche || "",
              profileId: String(profile.id),
              profileType: profile.type,
              profileTypeLabel: networkLabels[profile.type.toLowerCase()] || profile.name || profile.type,
              profileUsername: profile.username || inf.username,
              profileFollowers: profile.members || inf.followers,
              profileKey: `${inf.id}-${profile.id}`,
            });
          });
        }
      });

      return applications;
    };
  }, [influencers]);

  // Inscrições orgânicas (perfis com status "applications")
  const applicationsWithProfiles = useMemo<ApplicationWithProfile[]>(() => {
    return buildListByProfileStatus("applications");
  }, [buildListByProfileStatus]);

  // Pré-seleções (perfis com status "pre_selection" ou influenciador com status "pre_selection" sem perfis)
  const preselectionsWithProfiles = useMemo<ApplicationWithProfile[]>(() => {
    return buildListByProfileStatus("pre_selection");
  }, [buildListByProfileStatus]);

  // Função de filtro reutilizável para aplicações e pré-seleções
  const applyFilters = useCallback(
    (list: ApplicationWithProfile[]) => {
      return list.filter((app) => {
        if (searchTerm) {
          const searchLower = searchTerm.toLowerCase();
          const matchesSearch =
            app.influencerName.toLowerCase().includes(searchLower) ||
            app.influencerUsername.toLowerCase().includes(searchLower) ||
            app.profileUsername.toLowerCase().includes(searchLower);
          if (!matchesSearch) return false;
        }
        if (filterNiche && app.influencerNiche !== filterNiche) return false;
        const followers = app.profileFollowers > 0 ? app.profileFollowers : app.influencerFollowers;
        if (filterFollowersMin) {
          const min = parseInt(filterFollowersMin);
          if (isNaN(min) || followers < min) return false;
        }
        if (filterFollowersMax) {
          const max = parseInt(filterFollowersMax);
          if (isNaN(max) || followers > max) return false;
        }
        if (filterEngagementMin) {
          const min = parseFloat(filterEngagementMin);
          if (isNaN(min) || app.influencerEngagement < min) return false;
        }
        if (filterEngagementMax) {
          const max = parseFloat(filterEngagementMax);
          if (isNaN(max) || app.influencerEngagement > max) return false;
        }
        return true;
      });
    },
    [
      searchTerm,
      filterNiche,
      filterFollowersMin,
      filterFollowersMax,
      filterEngagementMin,
      filterEngagementMax,
    ]
  );

  const filteredApplications = useMemo(
    () => applyFilters(applicationsWithProfiles),
    [applicationsWithProfiles, applyFilters]
  );

  const filteredPreselections = useMemo(
    () => applyFilters(preselectionsWithProfiles),
    [preselectionsWithProfiles, applyFilters]
  );

  // Lista atual conforme o segmento (orgânico ou pré-seleções)
  const currentFilteredList =
    segmentTab === "organic" ? filteredApplications : filteredPreselections;

  // Opções de nichos disponíveis (do segmento atual: orgânico ou pré-seleções)
  const listForNiches = segmentTab === "organic" ? applicationsWithProfiles : preselectionsWithProfiles;
  const nicheOptions = useMemo(() => {
    const uniqueNiches = new Set<string>();
    listForNiches.forEach((app) => {
      if (app.influencerNiche) {
        const niche = niches.find((n) => n.id.toString() === app.influencerNiche.toString());
        if (niche) uniqueNiches.add(niche.id.toString());
      }
    });
    return Array.from(uniqueNiches).map((id) => {
      const niche = niches.find((n) => n.id.toString() === id);
      return { value: id, label: niche?.name || id };
    });
  }, [listForNiches, niches]);

  const handleSelectApplication = (profileKey: string) => {
    setSelectedInfluencers((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(profileKey)) {
        newSet.delete(profileKey);
      } else {
        newSet.add(profileKey);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectedInfluencers.size === currentFilteredList.length) {
      setSelectedInfluencers(new Set());
    } else {
      setSelectedInfluencers(new Set(currentFilteredList.map((app) => app.profileKey)));
    }
  };

  const handleBulkMoveToCuration = () => {
    const selectedApps = currentFilteredList.filter((app) =>
      selectedInfluencers.has(app.profileKey)
    );

    if (segmentTab === "preselection") {
      Promise.all(
        selectedApps.map((app) =>
          moveToPreSelectionCurationAsync({
            influencerId: app.influencerId,
            data: {
              network_id: app.profileId ? Number(app.profileId) : undefined,
            },
          })
        )
      )
        .then(() => {
          setSelectedInfluencers(new Set());
          setIsBulkActionModalOpen(false);
          setBulkActionType(null);
          toast.success(
            selectedApps.length === 1
              ? "Perfil movido para curadoria da pré-seleção"
              : `${selectedApps.length} perfil(is) movido(s) para curadoria da pré-seleção`
          );
        })
        .catch((error: any) => {
          toast.error(error?.message || "Erro ao mover para curadoria da pré-seleção");
        });
      return;
    }

    // Fluxo orgânico: atualizar status para curadoria
    const promises = selectedApps.map((app) =>
      updateStatus(
        {
          influencer_id: app.influencerId,
          status: "curation",
          feedback: undefined,
          network_id: app.profileId ? Number(app.profileId) : undefined,
        },
        {
          onSuccess: () => {},
          onError: (error: any) => {
            toast.error(`Erro ao mover ${app.profileTypeLabel}: ${error?.message || "Erro desconhecido"}`);
          },
        }
      )
    );

    Promise.all(promises).then(() => {
      setSelectedInfluencers(new Set());
      setIsBulkActionModalOpen(false);
      setBulkActionType(null);
      toast.success(`${selectedApps.length} perfil(is) movido(s) para curadoria`);
    });
  };

  const handleBulkApprove = () => {
    const selectedApps = currentFilteredList.filter((app) =>
      selectedInfluencers.has(app.profileKey)
    );

    // Agrupar por network_id para fazer bulk actions eficientes
    const appsByNetworkId = new Map<string | number, typeof selectedApps>();
    selectedApps.forEach((app) => {
      const networkId = app.profileId || "general";
      if (!appsByNetworkId.has(networkId)) {
        appsByNetworkId.set(networkId, []);
      }
      appsByNetworkId.get(networkId)!.push(app);
    });

    // Se todos têm o mesmo network_id, fazer uma única chamada bulk
    if (appsByNetworkId.size === 1) {
      const [networkId, apps] = Array.from(appsByNetworkId.entries())[0];
      const influencerIds = apps.map((app) => app.influencerId);

      bulkApprove(
        {
          influencerIds,
          network_id: networkId !== "general" ? Number(networkId) : undefined
        },
        {
          onSuccess: () => {
            setSelectedInfluencers(new Set());
            setIsBulkActionModalOpen(false);
            setBulkActionType(null);
          },
        }
      );
    } else {
      // Se têm network_ids diferentes, fazer chamadas individuais
      const promises = selectedApps.map((app) =>
        updateStatus(
          {
            influencer_id: app.influencerId,
            status: "approved",
            feedback: "Aprovado pelo usuário",
            network_id: app.profileId ? Number(app.profileId) : undefined,
          },
          {
            onSuccess: () => {
              // Sucesso individual
            },
            onError: (error: any) => {
              toast.error(`Erro ao aprovar ${app.profileTypeLabel}: ${error?.message || "Erro desconhecido"}`);
            },
          }
        )
      );

      Promise.all(promises).then(() => {
        setSelectedInfluencers(new Set());
        setIsBulkActionModalOpen(false);
        setBulkActionType(null);
        toast.success(`${selectedApps.length} perfil(is) aprovado(s)`);
      });
    }
  };

  const handleBulkReject = () => {
    if (bulkRejectionFeedback.trim()) {
      const selectedApps = currentFilteredList.filter((app) =>
        selectedInfluencers.has(app.profileKey)
      );

      // Agrupar por network_id para fazer bulk actions eficientes
      const appsByNetworkId = new Map<string | number, typeof selectedApps>();
      selectedApps.forEach((app) => {
        const networkId = app.profileId || "general";
        if (!appsByNetworkId.has(networkId)) {
          appsByNetworkId.set(networkId, []);
        }
        appsByNetworkId.get(networkId)!.push(app);
      });

      // Se todos têm o mesmo network_id, fazer uma única chamada bulk
      if (appsByNetworkId.size === 1) {
        const [networkId, apps] = Array.from(appsByNetworkId.entries())[0];
        const influencerIds = apps.map((app) => app.influencerId);

        bulkReject(
          {
            influencerIds,
            feedback: bulkRejectionFeedback,
            network_id: networkId !== "general" ? Number(networkId) : undefined
          },
          {
            onSuccess: () => {
              setSelectedInfluencers(new Set());
              setBulkRejectionFeedback("");
              setIsBulkActionModalOpen(false);
              setBulkActionType(null);
            },
          }
        );
      } else {
        // Se têm network_ids diferentes, fazer chamadas individuais
        const promises = selectedApps.map((app) =>
          updateStatus(
            {
              influencer_id: app.influencerId,
              status: "rejected",
              feedback: bulkRejectionFeedback,
              network_id: app.profileId ? Number(app.profileId) : undefined,
            },
            {
              onSuccess: () => {
                // Sucesso individual
              },
              onError: (error: any) => {
                toast.error(`Erro ao reprovar ${app.profileTypeLabel}: ${error?.message || "Erro desconhecido"}`);
              },
            }
          )
        );

        Promise.all(promises).then(() => {
          setSelectedInfluencers(new Set());
          setBulkRejectionFeedback("");
          setIsBulkActionModalOpen(false);
          setBulkActionType(null);
          toast.success(`${selectedApps.length} perfil(is) reprovado(s)`);
        });
      }
    }
  };

  const handleMoveToCuration = (app: ApplicationWithProfile) => {
    updateStatus(
      {
        influencer_id: app.influencerId,
        status: "curation",
        feedback: undefined,
        network_id: app.profileId ? Number(app.profileId) : undefined,
      },
      {
        onSuccess: () => {
          toast.success(`${app.profileTypeLabel} movido para curadoria!`);
        },
        onError: (error: any) => {
          toast.error(error?.message || "Erro ao mover influenciador");
        },
      }
    );
  };

  const handleMoveToPreSelectionCuration = (app: ApplicationWithProfile) => {
    moveToPreSelectionCuration(
      {
        influencerId: app.influencerId,
        data: {
          network_id: app.profileId ? Number(app.profileId) : undefined,
        },
      },
      {
        onSuccess: () => {
          toast.success("Movido para curadoria da pré-seleção!");
        },
        onError: (error: any) => {
          toast.error(error?.message || "Erro ao mover para curadoria da pré-seleção");
        },
      }
    );
  };

  const handleApprove = (app: ApplicationWithProfile) => {
    updateStatus(
      {
        influencer_id: app.influencerId,
        status: "approved",
        feedback: "Aprovado pelo usuário",
        network_id: app.profileId ? Number(app.profileId) : undefined,
      },
      {
        onSuccess: () => {
          toast.success(`${app.profileTypeLabel} aprovado com sucesso!`);
        },
        onError: (error: any) => {
          toast.error(error?.message || "Erro ao aprovar influenciador");
        },
      }
    );
  };

  const handleReject = (app: ApplicationWithProfile) => {
    // Encontrar o influenciador correspondente
    const influencer = influencers.find((inf) => inf.id === app.influencerId);
    if (influencer) {
      setSelectedInfluencer(influencer);
      setIsRejectModalOpen(true);
    }
  };

  const handleConfirmRejection = () => {
    if (selectedInfluencer && rejectionFeedback.trim()) {
      // Encontrar o perfil selecionado para obter o network_id
      const selectedApp = filteredApplications.find(
        (app) => app.influencerId === selectedInfluencer.id
      );

      updateStatus(
        {
          influencer_id: selectedInfluencer.id,
          status: "rejected",
          feedback: rejectionFeedback,
          network_id: selectedApp?.profileId ? Number(selectedApp.profileId) : undefined,
        },
        {
          onSuccess: () => {
            toast.success("Influenciador reprovado");
            setIsRejectModalOpen(false);
            setSelectedInfluencer(null);
            setRejectionFeedback("");
          },
          onError: (error: any) => {
            toast.error(error?.message || "Erro ao reprovar influenciador");
          },
        }
      );
    }
  };

  const handleBulkAction = () => {
    if (bulkActionType === "curation") {
      handleBulkMoveToCuration();
    } else if (bulkActionType === "approve") {
      handleBulkApprove();
    } else if (bulkActionType === "reject") {
      handleBulkReject();
    }
  };

  const getSocialNetworkIcon = (networkType?: string) => {
    const icons: { [key: string]: keyof typeof import("lucide-react").icons } = {
      instagram: "Instagram",
      youtube: "Youtube",
      tiktok: "Music",
      facebook: "Facebook",
      twitter: "Twitter",
    };
    return icons[networkType?.toLowerCase() || ""] || "Share2";
  };

  const organicCount = applicationsWithProfiles.length;
  const preselectionCount = preselectionsWithProfiles.length;

  if (isLoading) {
    return <ApplicationsTabSkeleton />;
  }

  return (
    <>
      <div className="flex flex-col gap-6">
        {/* Título e descrição (Figma) */}
        <div className="flex flex-col gap-1">
          <h2 className="text-2xl font-semibold text-neutral-950">
            Inscrições na campanha
          </h2>
          <p className="text-base text-neutral-500">
            Acompanhe quem se inscreveu pelo descobrir, revise os perfis e aprove ou recuse para avançar na seleção.
          </p>
        </div>

        {/* Segment: Inscrições Orgânicas | Pré-seleções Enviadas (Figma) */}
        <div>
          <div className="bg-white rounded-lg rounded-b-none p-1 flex w-full max-w-md">
            <div className="flex gap-1 bg-[#F0F0F0] w-full p-1 rounded-lg">
              <button
                type="button"
                onClick={() => setSegmentTab("organic")}
                className={`flex-1 py-2.5 px-5 rounded-md border text-sm font-medium transition-colors cursor-pointer ${segmentTab === "organic"
                  ? "bg-white text-neutral-950 border-neutral-300 shadow-sm"
                  : "text-neutral-500 hover:text-neutral-700 border-transparent"
                  }`}
              >
                Inscrições Orgânicas ({organicCount})
              </button>
              <button
                type="button"
                onClick={() => setSegmentTab("preselection")}
                className={`flex-1 py-2.5 px-5 rounded-md border text-sm font-medium transition-colors cursor-pointer ${segmentTab === "preselection"
                  ? "bg-white text-neutral-950 border-neutral-300 shadow-sm"
                  : "text-neutral-500 hover:text-neutral-700 border-transparent"
                  }`}
              >
                Pré-seleções Enviadas ({preselectionCount})
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl rounded-tl-none p-6">
            {/* Toolbar: seleção em massa só em Inscrições Orgânicas */}
            {segmentTab === "organic" && (
              <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={
                      selectedInfluencers.size === currentFilteredList.length &&
                      currentFilteredList.length > 0
                    }
                    onCheckedChange={handleSelectAll}
                  />
                  <label className="text-sm font-medium text-neutral-950 cursor-pointer">
                    Selecionar todos ({currentFilteredList.length})
                  </label>
                </div>
                {selectedInfluencers.size > 0 && (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setBulkActionType("curation");
                        setIsBulkActionModalOpen(true);
                      }}
                      className="h-11 rounded-full font-semibold"
                    >
                      <Icon name="ArrowRight" color="#404040" size={16} className="mr-2" />
                      Mover para Curadoria
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setBulkActionType("approve");
                        setIsBulkActionModalOpen(true);
                      }}
                      className="h-11 rounded-full font-semibold text-success-600 border-success-200 hover:bg-success-50"
                    >
                      <Icon name="Check" color="#16a34a" size={16} className="mr-2" />
                      Aprovar selecionados
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setBulkActionType("reject");
                        setIsBulkActionModalOpen(true);
                      }}
                      className="h-11 rounded-full font-semibold text-danger-600 border-danger-200 hover:bg-danger-50"
                    >
                      <Icon name="X" color="#dc2626" size={16} className="mr-2" />
                      Reprovar selecionados
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Filtros — uma linha (Figma) */}
            <div className="flex flex-wrap items-end gap-3 mb-6">
              <div className="flex-1 min-w-[200px] flex flex-col gap-1">
                <label className="text-base font-medium text-neutral-950">Buscar por nome</label>
                <div className="bg-neutral-100 rounded-full px-4 py-3 flex items-center gap-2">
                  <Icon name="Search" color="#A3A3A3" size={20} />
                  <input
                    type="text"
                    placeholder="Nome ou username..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="flex-1 min-w-0 bg-transparent text-base text-neutral-950 placeholder:text-neutral-400 outline-none"
                  />
                </div>
              </div>
              <div className="flex-1 min-w-[140px] flex flex-col gap-1">
                <label className="text-base font-medium text-neutral-950">Nicho</label>
                <Select
                  placeholder="Todos os nichos"
                  options={[{ value: "", label: "Todos os nichos" }, ...nicheOptions]}
                  value={filterNiche}
                  onChange={setFilterNiche}
                  isSearchable
                />
              </div>
              <div className="flex-1 min-w-[120px] flex flex-col gap-1">
                <label className="text-base font-medium text-neutral-950">Seguidores (mín)</label>
                <input
                  type="number"
                  placeholder="0"
                  value={filterFollowersMin}
                  onChange={(e) => setFilterFollowersMin(e.target.value)}
                  className="w-full bg-neutral-100 rounded-full px-4 py-3 text-base text-neutral-950 placeholder:text-neutral-400 outline-none border-0"
                />
              </div>
              <div className="flex-1 min-w-[120px] flex flex-col gap-1">
                <label className="text-base font-medium text-neutral-950">Seguidores (máx)</label>
                <input
                  type="number"
                  placeholder="∞"
                  value={filterFollowersMax}
                  onChange={(e) => setFilterFollowersMax(e.target.value)}
                  className="w-full bg-neutral-100 rounded-full px-4 py-3 text-base text-neutral-950 placeholder:text-neutral-400 outline-none border-0"
                />
              </div>
              <div className="flex-1 min-w-[120px] flex flex-col gap-1">
                <label className="text-base font-medium text-neutral-950">Engajamento (mín)</label>
                <input
                  type="number"
                  placeholder="0"
                  value={filterEngagementMin}
                  onChange={(e) => setFilterEngagementMin(e.target.value)}
                  className="w-full bg-neutral-100 rounded-full px-4 py-3 text-base text-neutral-950 placeholder:text-neutral-400 outline-none border-0"
                />
              </div>
              <div className="flex-1 min-w-[120px] flex flex-col gap-1">
                <label className="text-base font-medium text-neutral-950">Engajamento (máx)</label>
                <input
                  type="number"
                  placeholder="100"
                  value={filterEngagementMax}
                  onChange={(e) => setFilterEngagementMax(e.target.value)}
                  className="w-full bg-neutral-100 rounded-full px-4 py-3 text-base text-neutral-950 placeholder:text-neutral-400 outline-none border-0"
                />
              </div>
            </div>

            {segmentTab === "organic" && applicationsWithProfiles.length === 0 ? (
              <div className="text-center py-12">
                <Icon name="Users" color="#A3A3A3" size={48} />
                <p className="text-neutral-600 mt-4">
                  Nenhuma inscrição no momento
                </p>
              </div>
            ) : segmentTab === "preselection" && preselectionsWithProfiles.length === 0 ? (
              <div className="text-center py-12">
                <Icon name="Send" color="#A3A3A3" size={48} />
                <p className="text-neutral-600 mt-4">
                  Nenhuma pré-seleção enviada
                </p>
              </div>
            ) : currentFilteredList.length === 0 ? (
              <div className="text-center py-12">
                <Icon name="Search" color="#A3A3A3" size={48} />
                <p className="text-neutral-600 mt-4">
                  Nenhum perfil encontrado com os filtros aplicados
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {currentFilteredList.map((app) => {
                  const nicheName = app.influencerNiche
                    ? (niches.find((n) => n.id.toString() === app.influencerNiche.toString())?.name ?? app.influencerNiche)
                    : null;
                  return (
                    <ApplicationCard
                      key={app.profileKey}
                      app={app}
                      nicheName={nicheName}
                      isSelected={selectedInfluencers.has(app.profileKey)}
                      isUpdatingStatus={
                        segmentTab === "preselection"
                          ? isUpdatingStatus || isMovingToPreSelectionCuration
                          : isUpdatingStatus
                      }
                      onSelect={() => handleSelectApplication(app.profileKey)}
                      onApprove={() => handleApprove(app)}
                      onReject={() => handleReject(app)}
                      onMoveToCuration={
                        segmentTab === "preselection"
                          ? () => handleMoveToPreSelectionCuration(app)
                          : () => handleMoveToCuration(app)
                      }
                      onViewPhases={() =>
                        navigate({
                          to: "/campaigns/$campaignId/influencer/$influencerId",
                          params: { campaignId: campaignId ?? "", influencerId: app.influencerId },
                        })
                      }
                      hideWorkflowActions={segmentTab === "preselection"}
                    />
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal de reprovação */}
      {selectedInfluencer && isRejectModalOpen && (
        <Modal
          title="Reprovar influenciador"
          onClose={() => {
            setIsRejectModalOpen(false);
            setSelectedInfluencer(null);
            setRejectionFeedback("");
          }}
        >
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-4">
              <Avatar
                src={selectedInfluencer.avatar}
                alt={selectedInfluencer.name}
                size="lg"
              />
              <div>
                <h3 className="text-lg font-semibold text-neutral-950">
                  {selectedInfluencer.name}
                </h3>
                <p className="text-neutral-600">
                  @{selectedInfluencer.username}
                </p>
              </div>
            </div>

            <div className="bg-danger-50 rounded-2xl p-4">
              <p className="text-sm text-danger-900">
                O feedback é obrigatório ao reprovar um influenciador. Ele será
                enviado ao influenciador para que possa entender o motivo da
                reprovação.
              </p>
            </div>

            <Textarea
              label="Feedback de reprovação"
              placeholder="Explique o motivo da reprovação..."
              value={rejectionFeedback}
              onChange={(e) => setRejectionFeedback(e.target.value)}
              error={
                !rejectionFeedback.trim()
                  ? "Este campo é obrigatório"
                  : undefined
              }
            />

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setIsRejectModalOpen(false);
                  setSelectedInfluencer(null);
                  setRejectionFeedback("");
                }}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleConfirmRejection}
                disabled={!rejectionFeedback.trim()}
                className="flex-1"
              >
                Confirmar reprovação
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal de visualização de redes sociais */}
      {isProfileModalOpen && selectedProfileInfluencer && (
        <Modal
          title={`Redes Sociais - ${selectedProfileInfluencer.name}`}
          onClose={() => {
            setIsProfileModalOpen(false);
            setSelectedProfileInfluencer(null);
          }}
        >
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-4">
              <Avatar
                src={selectedProfileInfluencer.avatar}
                alt={selectedProfileInfluencer.name}
                size="lg"
              />
              <div>
                <h3 className="text-lg font-semibold text-neutral-950">
                  {selectedProfileInfluencer.name}
                </h3>
                <p className="text-neutral-600">
                  @{selectedProfileInfluencer.username}
                </p>
              </div>
            </div>

            {selectedProfileInfluencer.social_networks && selectedProfileInfluencer.social_networks.length > 0 ? (
              <div>
                <p className="text-sm font-medium text-neutral-950 mb-3">
                  Redes Sociais Utilizadas ({selectedProfileInfluencer.social_networks.length})
                </p>
                <div className="bg-neutral-50 rounded-2xl p-4">
                  <div className="flex flex-col gap-3">
                    {selectedProfileInfluencer.social_networks.map((network) => (
                      <div
                        key={network.id}
                        className="flex items-center justify-between p-3 bg-white rounded-xl border border-neutral-200"
                      >
                        <div className="flex items-center gap-3">
                          <Icon
                            name={getSocialNetworkIcon(network.type)}
                            color="#404040"
                            size={20}
                          />
                          <div>
                            <p className="text-sm font-semibold text-neutral-950">
                              {(() => {
                                const networkLabels: { [key: string]: string } = {
                                  instagram: "Instagram",
                                  tiktok: "TikTok",
                                  youtube: "YouTube",
                                  facebook: "Facebook",
                                  twitter: "Twitter",
                                };
                                return networkLabels[network.type?.toLowerCase() || ""] || network.name || network.type;
                              })()}
                            </p>
                            {network.username && (
                              <p className="text-xs text-neutral-600">
                                @{network.username}
                              </p>
                            )}
                            {network.name && network.name !== network.username && (
                              <p className="text-xs text-neutral-600">
                                {network.name}
                              </p>
                            )}
                          </div>
                        </div>
                        {network.members !== undefined && network.members > 0 && (
                          <div className="text-right">
                            <p className="text-sm font-semibold text-neutral-950">
                              {network.members.toLocaleString("pt-BR")}
                            </p>
                            <p className="text-xs text-neutral-600">seguidores</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-neutral-50 rounded-2xl p-4 text-center">
                <p className="text-sm text-neutral-600">
                  Nenhuma rede social cadastrada
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-neutral-600 mb-1">Seguidores totais</p>
                <p className="text-lg font-semibold text-neutral-950">
                  {selectedProfileInfluencer.followers.toLocaleString("pt-BR")}
                </p>
              </div>
              <div>
                <p className="text-sm text-neutral-600 mb-1">Engajamento</p>
                <p className="text-lg font-semibold text-neutral-950">
                  {selectedProfileInfluencer.engagement}%
                </p>
              </div>
              <div className="col-span-2">
                <p className="text-sm text-neutral-600 mb-1">Nicho</p>
                <Badge
                  text={(() => {
                    const nicheId = selectedProfileInfluencer.niche;
                    if (!nicheId) return "-";
                    const niche = niches.find((n) => n.id.toString() === nicheId.toString());
                    return niche?.name || nicheId;
                  })()}
                  backgroundColor="bg-tertiary-50"
                  textColor="text-tertiary-900"
                />
              </div>
            </div>

            <Button
              variant="outline"
              onClick={() => {
                setIsProfileModalOpen(false);
                setSelectedProfileInfluencer(null);
              }}
              className="w-full"
            >
              Fechar
            </Button>
          </div>
        </Modal>
      )}

      {/* Modal de ação em massa */}
      {isBulkActionModalOpen && bulkActionType && (
        <Modal
          title={
            bulkActionType === "curation"
              ? "Mover influenciadores para curadoria"
              : bulkActionType === "approve"
                ? "Aprovar influenciadores selecionados"
                : "Reprovar influenciadores selecionados"
          }
          onClose={() => {
            setIsBulkActionModalOpen(false);
            setBulkActionType(null);
            setBulkRejectionFeedback("");
          }}
        >
          <div className="flex flex-col gap-6">
            <p className="text-sm text-neutral-600">
              {bulkActionType === "curation"
                ? `Você está prestes a mover ${selectedInfluencers.size} influenciador(es) para curadoria.`
                : bulkActionType === "approve"
                  ? `Você está prestes a aprovar ${selectedInfluencers.size} influenciador(es).`
                  : `Você está prestes a reprovar ${selectedInfluencers.size} influenciador(es).`}
            </p>

            {bulkActionType === "reject" && (
              <>
                <div className="bg-danger-50 rounded-2xl p-4">
                  <p className="text-sm text-danger-900">
                    O feedback é obrigatório ao reprovar influenciadores em
                    massa. Ele será enviado a todos os influenciadores
                    selecionados.
                  </p>
                </div>
                <Textarea
                  label="Feedback de reprovação"
                  placeholder="Explique o motivo da reprovação..."
                  value={bulkRejectionFeedback}
                  onChange={(e) => setBulkRejectionFeedback(e.target.value)}
                  error={
                    !bulkRejectionFeedback.trim()
                      ? "Este campo é obrigatório"
                      : undefined
                  }
                />
              </>
            )}

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setIsBulkActionModalOpen(false);
                  setBulkActionType(null);
                  setBulkRejectionFeedback("");
                }}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleBulkAction}
                disabled={
                  (bulkActionType === "reject" &&
                    !bulkRejectionFeedback.trim()) ||
                  isApproving ||
                  isRejecting ||
                  isUpdatingStatus
                }
                className="flex-1"
              >
                {isApproving || isRejecting || isUpdatingStatus
                  ? "Processando..."
                  : "Confirmar"}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
