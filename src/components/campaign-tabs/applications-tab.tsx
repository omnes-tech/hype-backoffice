import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { useNavigate, useParams } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/ui/icon";
import { Modal } from "@/components/ui/modal";
import { Avatar } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { Select } from "@/components/ui/select";
import type { Influencer } from "@/shared/types";
import { useCampaignInscriptions } from "@/hooks/use-campaign-tab-influencers";
import { useBulkInfluencerActions } from "@/hooks/use-bulk-influencer-actions";
import { useUpdateInfluencerStatus, useMoveToPreSelectionCuration } from "@/hooks/use-campaign-influencers";
import { useNiches } from "@/hooks/use-niches";
import { useBulkSelection } from "@/hooks/use-bulk-selection";

import { resolveNicheDisplayName } from "@/shared/utils/niche-display";
import { getNetworkLabel } from "@/shared/constants/network-labels";
import { SocialNetworkIcon } from "@/components/social-network-icon";
import { InfluencerProfileCard } from "./shared/influencer-profile-card";
import { RejectionModal } from "./shared/rejection-modal";
import { BulkActionModal, type BulkActionType } from "./shared/bulk-action-modal";
import { Skeleton } from "@/components/ui/skeleton";

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

interface ApplicationWithProfile {
  influencerId: string;
  influencerName: string;
  influencerUsername: string;
  influencerAvatar: string;
  influencerFollowers: number;
  influencerEngagement: number;
  influencerNiche: string;
  influencerNicheName?: string;
  profileId: string;
  profileType: string;
  profileTypeLabel: string;
  profileUsername: string;
  profileFollowers: number;
  profileKey: string;
  sentAt?: string | null;
}

function buildInscriptionsProfiles(
  influencers: Influencer[],
  segment: "applications" | "pre_selection"
): ApplicationWithProfile[] {
  const applications: ApplicationWithProfile[] = [];
  const statusNorm = segment.toLowerCase().trim();

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
          influencerNicheName: inf.nicheName,
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
        const profilePhoto =
          typeof profile.photo === "string" && profile.photo.trim() !== ""
            ? profile.photo.trim()
            : "";
        applications.push({
          influencerId: inf.id,
          influencerName: inf.name,
          influencerUsername: inf.username,
          influencerAvatar: profilePhoto || inf.avatar,
          influencerFollowers: inf.followers,
          influencerEngagement: inf.engagement,
          influencerNiche: inf.niche || "",
          influencerNicheName: inf.nicheName,
          profileId: String(profile.id),
          profileType: profile.type,
          profileTypeLabel: getNetworkLabel(profile.type, profile.name || profile.type),
          profileUsername: profile.username || inf.username,
          profileFollowers: profile.members || inf.followers,
          profileKey: `${inf.id}-${profile.id}`,
        });
      });
    }
  });

  return applications;
}

interface ApplicationsTabProps {
  focusCampaignUserId?: string | null;
  onFocusUserConsumed?: () => void;
}

export function ApplicationsTab({
  focusCampaignUserId = null,
  onFocusUserConsumed,
}: ApplicationsTabProps) {
  const navigate = useNavigate();
  const { campaignId } = useParams({
    from: "/(private)/(app)/campaigns/$campaignId",
  });

  // Segmento: "organic" (Inscrições Orgânicas) | "preselection" (Pré-seleções Enviadas)
  const [segmentTab, setSegmentTab] = useState<"organic" | "preselection">("organic");
  // Segmentos já visitados — queries só são habilitadas na primeira visita
  const [seenSegments, setSeenSegments] = useState<Set<"organic" | "preselection">>(
    () => new Set<"organic" | "preselection">(["organic"]),
  );

  const markSegmentSeen = useCallback(
    (seg: "organic" | "preselection") => {
      setSegmentTab(seg);
      setSeenSegments((prev) => {
        if (prev.has(seg)) return prev;
        const next = new Set(prev);
        next.add(seg);
        return next;
      });
    },
    [],
  );

  // Quando há um focusCampaignUserId precisamos buscar ambos os segmentos para encontrar o usuário
  const enableAll = !!focusCampaignUserId;
  const applicationsQuery = useCampaignInscriptions(campaignId, "applications", {
    enabled: enableAll || seenSegments.has("organic"),
  });
  const preSelectionQuery = useCampaignInscriptions(campaignId, "pre_selection", {
    enabled: enableAll || seenSegments.has("preselection"),
  });
  const { data: niches = [] } = useNiches();

  // Modal de reprovação individual
  const [rejectTarget, setRejectTarget] = useState<Influencer | null>(null);

  // Modal de perfil (redes sociais)
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [selectedProfileInfluencer, setSelectedProfileInfluencer] = useState<Influencer | null>(null);

  // Modal de ação em massa
  const [bulkActionType, setBulkActionType] = useState<BulkActionType | null>(null);
  const [bulkRejectionFeedback, setBulkRejectionFeedback] = useState("");

  // Filtros
  const [searchTerm, setSearchTerm] = useState("");
  const [filterNiche, setFilterNiche] = useState("");
  const [filterFollowersMin, setFilterFollowersMin] = useState("");
  const [filterFollowersMax, setFilterFollowersMax] = useState("");
  const [filterEngagementMin, setFilterEngagementMin] = useState("");
  const [filterEngagementMax, setFilterEngagementMax] = useState("");

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

  const organicInfluencers = applicationsQuery.data ?? [];
  const preSelectionInfluencers = preSelectionQuery.data ?? [];

  const applicationsWithProfiles = useMemo<ApplicationWithProfile[]>(
    () => buildInscriptionsProfiles(organicInfluencers, "applications"),
    [organicInfluencers]
  );

  const preselectionsWithProfiles = useMemo<ApplicationWithProfile[]>(
    () => buildInscriptionsProfiles(preSelectionInfluencers, "pre_selection"),
    [preSelectionInfluencers]
  );

  // Loading/error relativos ao segmento ativo (o outro carrega em background quando visitado)
  const activeQuery = segmentTab === "organic" ? applicationsQuery : preSelectionQuery;
  const tabLoading = activeQuery.isLoading;
  const tabError = activeQuery.isError;
  const tabErrorMessage =
    (activeQuery.error as Error)?.message ||
    "Não foi possível carregar as inscrições.";

  const applyFilters = useCallback(
    (list: ApplicationWithProfile[]) => {
      return list.filter((app) => {
        if (searchTerm) {
          const lower = searchTerm.toLowerCase();
          const matches =
            app.influencerName.toLowerCase().includes(lower) ||
            app.influencerUsername.toLowerCase().includes(lower) ||
            app.profileUsername.toLowerCase().includes(lower);
          if (!matches) return false;
        }
        if (filterNiche && app.influencerNiche !== filterNiche) return false;
        const rawF =
          app.profileFollowers != null && app.profileFollowers > 0
            ? app.profileFollowers
            : app.influencerFollowers;
        const followers = Number(rawF ?? 0);
        if (filterFollowersMin) {
          const min = parseInt(filterFollowersMin, 10);
          if (isNaN(min) || followers < min) return false;
        }
        if (filterFollowersMax) {
          const max = parseInt(filterFollowersMax, 10);
          if (isNaN(max) || followers > max) return false;
        }
        const engagementNum = Number(app.influencerEngagement ?? NaN);
        if (filterEngagementMin) {
          const min = parseFloat(filterEngagementMin);
          if (isNaN(min) || Number.isNaN(engagementNum) || engagementNum < min) return false;
        }
        if (filterEngagementMax) {
          const max = parseFloat(filterEngagementMax);
          if (isNaN(max) || Number.isNaN(engagementNum) || engagementNum > max) return false;
        }
        return true;
      });
    },
    [searchTerm, filterNiche, filterFollowersMin, filterFollowersMax, filterEngagementMin, filterEngagementMax]
  );

  const filteredApplications = useMemo(() => applyFilters(applicationsWithProfiles), [applicationsWithProfiles, applyFilters]);
  const filteredPreselections = useMemo(() => applyFilters(preselectionsWithProfiles), [preselectionsWithProfiles, applyFilters]);
  const currentFilteredList = segmentTab === "organic" ? filteredApplications : filteredPreselections;

  const currentFilteredKeys = useMemo(
    () => currentFilteredList.map((app) => app.profileKey),
    [currentFilteredList]
  );

  const { selected: selectedInfluencers, toggle: handleSelectApplication, toggleAll: handleSelectAll, clear: clearSelection, isAllSelected } =
    useBulkSelection(currentFilteredKeys);

  // Limpa seleção ao trocar segmento
  useEffect(() => {
    clearSelection();
  }, [segmentTab]); // eslint-disable-line react-hooks/exhaustive-deps

  // Nichos disponíveis para o segmento atual
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

  // Focus handling
  const focusHandledRef = useRef<string | null>(null);
  useEffect(() => {
    focusHandledRef.current = null;
  }, [focusCampaignUserId]);

  useEffect(() => {
    if (!focusCampaignUserId) return;
    if (focusHandledRef.current === focusCampaignUserId) return;
    if (tabLoading) return;

    const id = String(focusCampaignUserId);
    const fullOrganic = organicInfluencers.find((i) => String(i.id) === id);
    const fullPre = preSelectionInfluencers.find((i) => String(i.id) === id);
    const fullInf = fullOrganic || fullPre;

    if (!fullInf) {
      if (!applicationsQuery.isFetching && !preSelectionQuery.isFetching) {
        focusHandledRef.current = focusCampaignUserId;
        onFocusUserConsumed?.();
      }
      return;
    }

    if (fullOrganic) markSegmentSeen("organic");
    else markSegmentSeen("preselection");

    setSelectedProfileInfluencer(fullInf);
    setIsProfileModalOpen(true);
    focusHandledRef.current = focusCampaignUserId;
    onFocusUserConsumed?.();
  }, [
    focusCampaignUserId,
    tabLoading,
    organicInfluencers,
    preSelectionInfluencers,
    applicationsQuery.isFetching,
    preSelectionQuery.isFetching,
    onFocusUserConsumed,
  ]);

  // ── Handlers de ação ────────────────────────────────────────────────────────

  const handleApprove = (app: ApplicationWithProfile) => {
    updateStatus(
      {
        influencer_id: app.influencerId,
        status: "approved",
        feedback: "Aprovado pelo usuário",
        network_id: app.profileId ? Number(app.profileId) : undefined,
      },
      {
        onSuccess: () => toast.success(`${app.profileTypeLabel} aprovado com sucesso!`),
        onError: (error: Error) => toast.error(error?.message || "Erro ao aprovar influenciador"),
      }
    );
  };

  const handleReject = (app: ApplicationWithProfile) => {
    const influencer =
      organicInfluencers.find((inf) => String(inf.id) === String(app.influencerId)) ??
      preSelectionInfluencers.find((inf) => String(inf.id) === String(app.influencerId));
    if (influencer) setRejectTarget(influencer);
  };

  const handleConfirmRejection = (feedback: string) => {
    if (!rejectTarget) return;
    const selectedApp = filteredApplications.find((a) => a.influencerId === rejectTarget.id);
    updateStatus(
      {
        influencer_id: rejectTarget.id,
        status: "rejected",
        feedback,
        network_id: selectedApp?.profileId ? Number(selectedApp.profileId) : undefined,
      },
      {
        onSuccess: () => {
          toast.success("Influenciador reprovado");
          setRejectTarget(null);
        },
        onError: (error: Error) => toast.error(error?.message || "Erro ao reprovar influenciador"),
      }
    );
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
        onSuccess: () => toast.success(`${app.profileTypeLabel} movido para curadoria!`),
        onError: (error: Error) => toast.error(error?.message || "Erro ao mover influenciador"),
      }
    );
  };

  const handleMoveToPreSelectionCuration = (app: ApplicationWithProfile) => {
    moveToPreSelectionCuration(
      {
        influencerId: app.influencerId,
        data: { network_id: app.profileId ? Number(app.profileId) : undefined },
      },
      {
        onSuccess: () => toast.success("Movido para curadoria da pré-seleção!"),
        onError: (error: Error) => toast.error(error?.message || "Erro ao mover para curadoria da pré-seleção"),
      }
    );
  };

  const handleBulkMoveToCuration = () => {
    const selectedApps = currentFilteredList.filter((app) => selectedInfluencers.has(app.profileKey));

    if (segmentTab === "preselection") {
      Promise.all(
        selectedApps.map((app) =>
          moveToPreSelectionCurationAsync({
            influencerId: app.influencerId,
            data: { network_id: app.profileId ? Number(app.profileId) : undefined },
          })
        )
      )
        .then(() => {
          clearSelection();
          setBulkActionType(null);
          toast.success(
            selectedApps.length === 1
              ? "Perfil movido para curadoria da pré-seleção"
              : `${selectedApps.length} perfil(is) movido(s) para curadoria da pré-seleção`
          );
        })
        .catch((error: Error) => {
          toast.error(error?.message || "Erro ao mover para curadoria da pré-seleção");
        });
      return;
    }

    const promises = selectedApps.map((app) =>
      updateStatus(
        { influencer_id: app.influencerId, status: "curation", feedback: undefined, network_id: app.profileId ? Number(app.profileId) : undefined },
        { onError: (error: Error) => toast.error(`Erro ao mover ${app.profileTypeLabel}: ${error?.message || "Erro desconhecido"}`) }
      )
    );
    Promise.all(promises).then(() => {
      clearSelection();
      setBulkActionType(null);
      toast.success(`${selectedApps.length} perfil(is) movido(s) para curadoria`);
    });
  };

  const handleBulkApprove = () => {
    const selectedApps = currentFilteredList.filter((app) => selectedInfluencers.has(app.profileKey));
    const appsByNetworkId = new Map<string | number, typeof selectedApps>();
    selectedApps.forEach((app) => {
      const key = app.profileId || "general";
      if (!appsByNetworkId.has(key)) appsByNetworkId.set(key, []);
      appsByNetworkId.get(key)!.push(app);
    });

    if (appsByNetworkId.size === 1) {
      const [networkId, apps] = Array.from(appsByNetworkId.entries())[0];
      bulkApprove(
        { influencerIds: apps.map((a) => a.influencerId), network_id: networkId !== "general" ? Number(networkId) : undefined },
        { onSuccess: () => { clearSelection(); setBulkActionType(null); } }
      );
    } else {
      const promises = selectedApps.map((app) =>
        updateStatus(
          { influencer_id: app.influencerId, status: "approved", feedback: "Aprovado pelo usuário", network_id: app.profileId ? Number(app.profileId) : undefined },
          { onError: (error: Error) => toast.error(`Erro ao aprovar ${app.profileTypeLabel}: ${error?.message || "Erro desconhecido"}`) }
        )
      );
      Promise.all(promises).then(() => {
        clearSelection();
        setBulkActionType(null);
        toast.success(`${selectedApps.length} perfil(is) aprovado(s)`);
      });
    }
  };

  const handleBulkReject = () => {
    if (!bulkRejectionFeedback.trim()) return;
    const selectedApps = currentFilteredList.filter((app) => selectedInfluencers.has(app.profileKey));
    const appsByNetworkId = new Map<string | number, typeof selectedApps>();
    selectedApps.forEach((app) => {
      const key = app.profileId || "general";
      if (!appsByNetworkId.has(key)) appsByNetworkId.set(key, []);
      appsByNetworkId.get(key)!.push(app);
    });

    if (appsByNetworkId.size === 1) {
      const [networkId, apps] = Array.from(appsByNetworkId.entries())[0];
      bulkReject(
        { influencerIds: apps.map((a) => a.influencerId), feedback: bulkRejectionFeedback, network_id: networkId !== "general" ? Number(networkId) : undefined },
        {
          onSuccess: () => {
            clearSelection();
            setBulkRejectionFeedback("");
            setBulkActionType(null);
          },
        }
      );
    } else {
      const promises = selectedApps.map((app) =>
        updateStatus(
          { influencer_id: app.influencerId, status: "rejected", feedback: bulkRejectionFeedback, network_id: app.profileId ? Number(app.profileId) : undefined },
          { onError: (error: Error) => toast.error(`Erro ao reprovar ${app.profileTypeLabel}: ${error?.message || "Erro desconhecido"}`) }
        )
      );
      Promise.all(promises).then(() => {
        clearSelection();
        setBulkRejectionFeedback("");
        setBulkActionType(null);
        toast.success(`${selectedApps.length} perfil(is) reprovado(s)`);
      });
    }
  };

  const handleBulkConfirm = () => {
    if (bulkActionType === "curation") handleBulkMoveToCuration();
    else if (bulkActionType === "approve") handleBulkApprove();
    else if (bulkActionType === "reject") handleBulkReject();
  };

  const organicCount = applicationsWithProfiles.length;
  const preselectionCount = preselectionsWithProfiles.length;

  // ── Render ──────────────────────────────────────────────────────────────────

  if (tabLoading) return <ApplicationsTabSkeleton />;

  if (tabError) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-1">
          <h2 className="text-2xl font-semibold text-neutral-950">Inscrições na campanha</h2>
          <p className="text-base text-neutral-500">
            Acompanhe quem se inscreveu pelo descobrir, revise os perfis e aprove ou recuse para avançar na seleção.
          </p>
        </div>
        <div className="flex flex-col gap-3 rounded-xl border border-danger-200 bg-danger-50 px-4 py-4 text-danger-900">
          <p className="text-sm">{tabErrorMessage}</p>
          <Button type="button" variant="outline" className="w-max" onClick={() => { void applicationsQuery.refetch(); void preSelectionQuery.refetch(); }}>
            Tentar novamente
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-6">
        {/* Título */}
        <div className="flex flex-col gap-1">
          <h2 className="text-2xl font-semibold text-neutral-950">Inscrições na campanha</h2>
          <p className="text-base text-neutral-500">
            Acompanhe quem se inscreveu pelo descobrir, revise os perfis e aprove ou recuse para avançar na seleção.
          </p>
        </div>

        {/* Segment tabs */}
        <div>
          <div className="bg-white rounded-lg rounded-b-none p-1 flex w-full max-w-md">
            <div className="flex gap-1 bg-[#F0F0F0] w-full p-1 rounded-lg">
              {(["organic", "preselection"] as const).map((seg) => {
                const labels = { organic: `Inscrições Orgânicas (${organicCount})`, preselection: `Pré-seleções Enviadas (${preselectionCount})` };
                return (
                  <button
                    key={seg}
                    type="button"
                    onClick={() => markSegmentSeen(seg)}
                    className={`flex-1 py-2.5 px-5 rounded-md border text-sm font-medium transition-colors cursor-pointer ${
                      segmentTab === seg
                        ? "bg-white text-neutral-950 border-neutral-300 shadow-sm"
                        : "text-neutral-500 hover:text-neutral-700 border-transparent"
                    }`}
                  >
                    {labels[seg]}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="bg-white rounded-xl rounded-tl-none p-6">
            {/* Toolbar de seleção em massa (só orgânicas) */}
            {segmentTab === "organic" && (
              <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
                <div className="flex items-center gap-2">
                  <Checkbox checked={isAllSelected} onCheckedChange={handleSelectAll} />
                  <label className="text-sm font-medium text-neutral-950 cursor-pointer">
                    Selecionar todos ({currentFilteredList.length})
                  </label>
                </div>
                {selectedInfluencers.size > 0 && (
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setBulkActionType("curation")} className="h-11 rounded-full font-semibold">
                      <Icon name="ArrowRight" color="#404040" size={16} className="mr-2" />
                      Mover para Curadoria
                    </Button>
                    <Button variant="outline" onClick={() => setBulkActionType("approve")} className="h-11 rounded-full font-semibold text-success-600 border-success-200 hover:bg-success-50">
                      <Icon name="Check" color="#16a34a" size={16} className="mr-2" />
                      Aprovar selecionados
                    </Button>
                    <Button variant="outline" onClick={() => setBulkActionType("reject")} className="h-11 rounded-full font-semibold text-danger-600 border-danger-200 hover:bg-danger-50">
                      <Icon name="X" color="#dc2626" size={16} className="mr-2" />
                      Reprovar selecionados
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Filtros */}
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
                <input type="number" placeholder="0" value={filterFollowersMin} onChange={(e) => setFilterFollowersMin(e.target.value)} className="w-full bg-neutral-100 rounded-full px-4 py-3 text-base text-neutral-950 placeholder:text-neutral-400 outline-none border-0" />
              </div>
              <div className="flex-1 min-w-[120px] flex flex-col gap-1">
                <label className="text-base font-medium text-neutral-950">Seguidores (máx)</label>
                <input type="number" placeholder="∞" value={filterFollowersMax} onChange={(e) => setFilterFollowersMax(e.target.value)} className="w-full bg-neutral-100 rounded-full px-4 py-3 text-base text-neutral-950 placeholder:text-neutral-400 outline-none border-0" />
              </div>
              <div className="flex-1 min-w-[120px] flex flex-col gap-1">
                <label className="text-base font-medium text-neutral-950">Engajamento (mín)</label>
                <input type="number" placeholder="0" value={filterEngagementMin} onChange={(e) => setFilterEngagementMin(e.target.value)} className="w-full bg-neutral-100 rounded-full px-4 py-3 text-base text-neutral-950 placeholder:text-neutral-400 outline-none border-0" />
              </div>
              <div className="flex-1 min-w-[120px] flex flex-col gap-1">
                <label className="text-base font-medium text-neutral-950">Engajamento (máx)</label>
                <input type="number" placeholder="100" value={filterEngagementMax} onChange={(e) => setFilterEngagementMax(e.target.value)} className="w-full bg-neutral-100 rounded-full px-4 py-3 text-base text-neutral-950 placeholder:text-neutral-400 outline-none border-0" />
              </div>
            </div>

            {/* Grid de cards */}
            {segmentTab === "organic" && applicationsWithProfiles.length === 0 ? (
              <div className="text-center py-12">
                <Icon name="Users" color="#A3A3A3" size={48} />
                <p className="text-neutral-600 mt-4">Nenhuma inscrição no momento</p>
              </div>
            ) : segmentTab === "preselection" && preselectionsWithProfiles.length === 0 ? (
              <div className="text-center py-12">
                <Icon name="Send" color="#A3A3A3" size={48} />
                <p className="text-neutral-600 mt-4">Nenhuma pré-seleção enviada</p>
              </div>
            ) : currentFilteredList.length === 0 ? (
              <div className="text-center py-12">
                <Icon name="Search" color="#A3A3A3" size={48} />
                <p className="text-neutral-600 mt-4">Nenhum perfil encontrado com os filtros aplicados</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {currentFilteredList.map((app) => {
                  const nicheName = resolveNicheDisplayName(app.influencerNiche, niches, app.influencerNicheName);
                  const sentAtLabel = app.sentAt
                    ? `Enviado em: ${new Date(app.sentAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" })}`
                    : "Enviado em: —";
                  const isPreselection = segmentTab === "preselection";
                  const actionLoading = isPreselection
                    ? isUpdatingStatus || isMovingToPreSelectionCuration
                    : isUpdatingStatus;

                  return (
                    <InfluencerProfileCard
                      key={app.profileKey}
                      data={app}
                      nicheName={nicheName}
                      isSelected={selectedInfluencers.has(app.profileKey)}
                      isActionLoading={actionLoading}
                      metaLabel={sentAtLabel}
                      selectable={!isPreselection}
                      onSelect={!isPreselection ? () => handleSelectApplication(app.profileKey) : undefined}
                      onApprove={!isPreselection ? () => handleApprove(app) : undefined}
                      onReject={!isPreselection ? () => handleReject(app) : undefined}
                      onMoveToCuration={
                        isPreselection
                          ? () => handleMoveToPreSelectionCuration(app)
                          : () => handleMoveToCuration(app)
                      }
                      onViewProfile={() => navigate({ to: "/influencer/$influencerId", params: { influencerId: app.influencerId } })}
                    />
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal de reprovação individual */}
      {rejectTarget && (
        <RejectionModal
          influencer={rejectTarget}
          onConfirm={handleConfirmRejection}
          onClose={() => setRejectTarget(null)}
        />
      )}

      {/* Modal de visualização de redes sociais */}
      {isProfileModalOpen && selectedProfileInfluencer && (
        <Modal
          title={`Redes Sociais - ${selectedProfileInfluencer.name}`}
          onClose={() => { setIsProfileModalOpen(false); setSelectedProfileInfluencer(null); }}
        >
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-4">
              <Avatar src={selectedProfileInfluencer.avatar} alt={selectedProfileInfluencer.name} size="lg" />
              <div>
                <h3 className="text-lg font-semibold text-neutral-950">{selectedProfileInfluencer.name}</h3>
                <p className="text-neutral-600">@{selectedProfileInfluencer.username}</p>
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
                      <div key={network.id} className="flex items-center justify-between p-3 bg-white rounded-xl border border-neutral-200">
                        <div className="flex items-center gap-3">
                          <SocialNetworkIcon networkType={network.type} size={20} color="#404040" />
                          <div>
                            <p className="text-sm font-semibold text-neutral-950">
                              {getNetworkLabel(network.type, network.name || network.type)}
                            </p>
                            {network.username && <p className="text-xs text-neutral-600">@{network.username}</p>}
                            {network.name && network.name !== network.username && <p className="text-xs text-neutral-600">{network.name}</p>}
                          </div>
                        </div>
                        {network.members !== undefined && network.members > 0 && (
                          <div className="text-right">
                            <p className="text-sm font-semibold text-neutral-950">{network.members.toLocaleString("pt-BR")}</p>
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
                <p className="text-sm text-neutral-600">Nenhuma rede social cadastrada</p>
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
                <p className="text-lg font-semibold text-neutral-950">{selectedProfileInfluencer.engagement}%</p>
              </div>
              <div className="col-span-2">
                <p className="text-sm text-neutral-600 mb-1">Nicho</p>
                <Badge
                  text={resolveNicheDisplayName(selectedProfileInfluencer.niche, niches, selectedProfileInfluencer.nicheName) ?? "-"}
                  backgroundColor="bg-tertiary-50"
                  textColor="text-tertiary-900"
                />
              </div>
            </div>

            <Button
              variant="outline"
              onClick={() => { setIsProfileModalOpen(false); setSelectedProfileInfluencer(null); }}
              className="w-full"
            >
              Fechar
            </Button>
          </div>
        </Modal>
      )}

      {/* Modal de ação em massa */}
      <BulkActionModal
        actionType={bulkActionType}
        count={selectedInfluencers.size}
        rejectionFeedback={bulkRejectionFeedback}
        onRejectionFeedbackChange={setBulkRejectionFeedback}
        onConfirm={handleBulkConfirm}
        onClose={() => { setBulkActionType(null); setBulkRejectionFeedback(""); }}
        isLoading={isApproving || isRejecting || isUpdatingStatus}
      />
    </>
  );
}
