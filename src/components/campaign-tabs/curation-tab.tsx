import { useState, useMemo } from "react";
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
import { useUpdateInfluencerStatus } from "@/hooks/use-campaign-influencers";
import { useNiches } from "@/hooks/use-niches";
import { getUploadUrl } from "@/lib/utils/api";

interface CurationTabProps {
  influencers: Influencer[];
  isLoading?: boolean;
}

function Skeleton({ className }: { className?: string }) {
  return <div className={`skeleton ${className ?? ""}`} aria-hidden />;
}

/** Skeleton da aba Curadoria — espelha o layout real */
export function CurationTabSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4">
        <Skeleton className="h-8 w-80" />
        <Skeleton className="h-5 w-full max-w-2xl" />
      </div>
      <div className="bg-white rounded-xl p-4 border border-neutral-200">
        <div className="flex flex-wrap items-end gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex-1 min-w-[140px] flex flex-col gap-1">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-11 w-full rounded-full" />
            </div>
          ))}
        </div>
      </div>
      <div className="bg-white rounded-xl p-5 border border-neutral-200">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <Skeleton className="h-6 w-52" />
          <div className="flex gap-1">
            <Skeleton className="h-11 w-28 rounded-full" />
            <Skeleton className="h-11 w-24 rounded-full" />
            <Skeleton className="h-11 w-28 rounded-full" />
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-2">
            <Skeleton className="size-6 rounded" />
            <Skeleton className="h-5 w-44" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-11 w-44 rounded-full" />
            <Skeleton className="h-11 w-48 rounded-full" />
          </div>
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
              <Skeleton className="h-5 w-40" />
              <div className="flex gap-2">
                <Skeleton className="flex-1 h-11 rounded-full" />
                <Skeleton className="h-4 w-16" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Status do perfil na curadoria (Pendentes / Aprovados / Reprovados)
type CurationProfileStatus = "curation" | "approved" | "rejected";

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
  profileKey: string;
  profileStatus: CurationProfileStatus; // curation = Pendentes, approved = Aprovados, rejected = Reprovados
}

export function CurationTab({ influencers, isLoading }: CurationTabProps) {
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
    "approve" | "reject" | null
  >(null);
  const [bulkRejectionFeedback, setBulkRejectionFeedback] = useState("");

  // Filtro de status: Pendentes | Aprovados | Reprovados (Figma)
  const [statusFilter, setStatusFilter] = useState<"pending" | "approved" | "rejected">("pending");

  // Estados de filtros (Figma: Buscar, Nicho, Localização, Idade)
  const [searchTerm, setSearchTerm] = useState("");
  const [filterNiche, setFilterNiche] = useState("");
  const [filterLocation, setFilterLocation] = useState("");
  const [filterAge, setFilterAge] = useState("");

  // Hooks para bulk operations
  const {
    approve: bulkApprove,
    reject: bulkReject,
    isApproving,
    isRejecting,
  } = useBulkInfluencerActions({ campaignId });
  const { mutate: updateStatus } = useUpdateInfluencerStatus(campaignId);

  const applicationsWithProfiles = useMemo<ApplicationWithProfile[]>(() => {
    const applications: ApplicationWithProfile[] = [];
    const networkLabels: { [key: string]: string } = {
      instagram: "Instagram",
      tiktok: "TikTok",
      youtube: "YouTube",
      ugc: "UGC",
    };

    influencers.forEach((inf) => {
      const profiles = inf.social_networks || [];
      // pre_selection_curation aparece como "curation" (Pendentes) na aba Curadoria
      const statusMap: Record<string, CurationProfileStatus> = {
        curation: "curation",
        pre_selection_curation: "curation",
        approved: "approved",
        rejected: "rejected",
      };

      const relevantProfiles = profiles.filter((profile) => {
        const s = profile.status?.toLowerCase()?.trim();
        return s === "curation" || s === "pre_selection_curation" || s === "approved" || s === "rejected";
      });

      if (relevantProfiles.length === 0) {
        const infStatus = inf.status?.toLowerCase()?.trim();
        if ((infStatus === "curation" || infStatus === "pre_selection_curation") && profiles.length === 0) {
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
            profileStatus: "curation",
          });
        }
        return;
      }

      relevantProfiles.forEach((profile) => {
        const s = profile.status?.toLowerCase()?.trim();
        const profileStatus: CurationProfileStatus = statusMap[s ?? ""] ?? "curation";
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
          profileTypeLabel: networkLabels[profile.type?.toLowerCase() ?? ""] || profile.name || profile.type,
          profileUsername: profile.username || inf.username,
          profileFollowers: profile.members ?? inf.followers,
          profileKey: `${inf.id}-${profile.id}`,
          profileStatus,
        });
      });
    });

    return applications;
  }, [influencers]);

  // Mapeamento statusFilter (UI) -> profileStatus (dados)
  const statusFilterToProfileStatus: Record<string, CurationProfileStatus> = {
    pending: "curation",
    approved: "approved",
    rejected: "rejected",
  };

  const filteredApplications = useMemo(() => {
    const targetStatus = statusFilterToProfileStatus[statusFilter];
    return applicationsWithProfiles.filter((app) => {
      if (app.profileStatus !== targetStatus) return false;
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const matchesSearch =
          app.influencerName.toLowerCase().includes(searchLower) ||
          app.influencerUsername.toLowerCase().includes(searchLower) ||
          app.profileUsername.toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;
      }
      if (filterNiche && app.influencerNiche !== filterNiche) return false;
      return true;
    });
  }, [applicationsWithProfiles, statusFilter, searchTerm, filterNiche]);

  const nicheOptions = useMemo(() => {
    const uniqueNiches = new Set<string>();
    applicationsWithProfiles.forEach((app) => {
      if (app.influencerNiche) {
        const niche = niches.find((n) => n.id.toString() === app.influencerNiche.toString());
        if (niche) uniqueNiches.add(niche.id.toString());
      }
    });
    return Array.from(uniqueNiches).map((id) => {
      const niche = niches.find((n) => n.id.toString() === id);
      return { value: id, label: niche?.name || id };
    });
  }, [applicationsWithProfiles, niches]);

  const pendingCount = useMemo(
    () => applicationsWithProfiles.filter((a) => a.profileStatus === "curation").length,
    [applicationsWithProfiles]
  );
  const approvedCount = useMemo(
    () => applicationsWithProfiles.filter((a) => a.profileStatus === "approved").length,
    [applicationsWithProfiles]
  );
  const rejectedCount = useMemo(
    () => applicationsWithProfiles.filter((a) => a.profileStatus === "rejected").length,
    [applicationsWithProfiles]
  );

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
    if (selectedInfluencers.size === filteredApplications.length) {
      setSelectedInfluencers(new Set());
    } else {
      setSelectedInfluencers(new Set(filteredApplications.map((app) => app.profileKey)));
    }
  };

  const handleBulkApprove = () => {
    const selectedApps = filteredApplications.filter((app) =>
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
      const selectedApps = filteredApplications.filter((app) =>
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

  const getNicheName = (nicheId: string) => {
    if (!nicheId) return null;
    const n = niches.find((x) => x.id.toString() === nicheId.toString());
    return n?.name ?? nicheId;
  };

  if (isLoading) {
    return <CurationTabSkeleton />;
  }

  return (
    <>
      <div className="flex flex-col gap-6">
        {/* Título e descrição (Figma) */}
        <div className="flex flex-col gap-4">
          <h2 className="text-2xl font-semibold text-neutral-950">
            Curadoria de perfis e conteúdo
          </h2>
          <p className="text-base text-neutral-500 max-w-2xl">
            Centralize a análise: valide perfis, organize aprovações e garanta que tudo esteja alinhado com as regras da campanha.
          </p>
        </div>

        {/* Barra de filtros (Figma): Buscar, Nicho, Localização, Idade */}
        <div className="bg-white rounded-xl p-4">
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
                options={[{ value: "", label: "Selecione um nicho" }, ...nicheOptions]}
                value={filterNiche}
                onChange={setFilterNiche}
                isSearchable
              />
            </div>
            <div className="flex-1 min-w-[140px] flex flex-col gap-1">
              <label className="text-base font-medium text-neutral-950">Localização</label>
              <Select
                placeholder="Selecione o local"
                options={[{ value: "", label: "Selecione o local" }]}
                value={filterLocation}
                onChange={setFilterLocation}
              />
            </div>
            <div className="flex-1 min-w-[140px] flex flex-col gap-1">
              <label className="text-base font-medium text-neutral-950">Idade</label>
              <Select
                placeholder="Selecione a idade"
                options={[{ value: "", label: "Selecione a idade" }]}
                value={filterAge}
                onChange={setFilterAge}
              />
            </div>
          </div>
        </div>

        {/* Aprovações da Curadoria (Figma) */}
        <div className="bg-white rounded-xl p-5">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <h3 className="text-xl font-semibold text-neutral-950">
              Aprovações da Curadoria
            </h3>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => setStatusFilter("pending")}
                className={`h-11 px-4 rounded-full text-base font-semibold transition-colors ${statusFilter === "pending"
                    ? "bg-primary-600 text-white"
                    : "border border-neutral-200 text-neutral-500 hover:bg-neutral-50"
                  }`}
              >
                Pendentes ({pendingCount})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("approved")}
                className={`h-11 px-4 rounded-full text-base font-semibold transition-colors ${statusFilter === "approved"
                    ? "bg-primary-600 text-white"
                    : "border border-neutral-200 text-neutral-500 hover:bg-neutral-50"
                  }`}
              >
                Aprovados ({approvedCount})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("rejected")}
                className={`h-11 px-4 rounded-full text-base font-semibold transition-colors ${statusFilter === "rejected"
                    ? "bg-primary-600 text-white"
                    : "border border-neutral-200 text-neutral-500 hover:bg-neutral-50"
                  }`}
              >
                Reprovados ({rejectedCount})
              </button>
            </div>
          </div>

          {/* Toolbar: Selecionar todos + Múltiplas aprovações/reprovações */}
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-2">
              <Checkbox
                checked={
                  selectedInfluencers.size === filteredApplications.length &&
                  filteredApplications.length > 0
                }
                onCheckedChange={handleSelectAll}
              />
              <label className="text-base font-normal text-neutral-950 cursor-pointer">
                Selecionar todos ({filteredApplications.length})
              </label>
            </div>
            {selectedInfluencers.size > 0 && statusFilter === "pending" && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setBulkActionType("approve");
                    setIsBulkActionModalOpen(true);
                  }}
                  className="h-11 rounded-full font-semibold"
                >
                  Múltiplas aprovações
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setBulkActionType("reject");
                    setIsBulkActionModalOpen(true);
                  }}
                  className="h-11 rounded-full font-semibold text-danger-600 border-danger-200 hover:bg-danger-50"
                >
                  Múltiplas reprovações
                </Button>
              </div>
            )}
          </div>

          {filteredApplications.length === 0 ? (
            <div className="text-center py-12">
              <Icon name="Users" color="#A3A3A3" size={48} />
              <p className="text-neutral-600 mt-4">
                {statusFilter === "pending"
                  ? "Nenhum influenciador pendente"
                  : statusFilter === "approved"
                    ? "Nenhum aprovado"
                    : "Nenhum reprovado"}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {filteredApplications.map((app) => {
                const followers = app.profileFollowers > 0 ? app.profileFollowers : app.influencerFollowers;
                const nicheName = getNicheName(app.influencerNiche);
                const isPending = app.profileStatus === "curation";

                return (
                  <div
                    key={app.profileKey}
                    className={`relative bg-neutral-100 rounded-xl p-4 flex flex-col gap-5 border transition-colors ${selectedInfluencers.has(app.profileKey) && isPending
                        ? "border-primary-500 ring-1 ring-primary-200"
                        : "border-transparent"
                      }`}
                  >
                    <div className="relative flex items-start justify-between">
                      <img
                        src={getUploadUrl(app.influencerAvatar) ?? undefined}
                        alt={app.influencerName}
                        className="size-[60px] rounded-2xl object-cover bg-neutral-200"
                      />
                      <button
                        type="button"
                        className="size-10 rounded-lg bg-warning-200 flex items-center justify-center shrink-0"
                        aria-label="Salvar"
                      >
                        <Icon name="Bookmark" size={20} color="var(--color-warning-700)" />
                      </button>
                    </div>
                    <div className="space-y-1">
                      <p className="text-lg font-medium text-neutral-950 truncate">
                        {app.influencerName}
                      </p>
                      <p className="text-sm text-neutral-500 truncate">
                        @{app.profileUsername}
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-neutral-200 rounded-lg p-3">
                        <p className="text-xs text-neutral-500">Seguidores</p>
                        <p className="text-sm font-semibold text-neutral-950">
                          {followers.toLocaleString("pt-BR")}
                        </p>
                      </div>
                      <div className="bg-neutral-200 rounded-lg p-3">
                        <p className="text-xs text-neutral-500">Engajamento</p>
                        <p className="text-sm font-semibold text-neutral-950">
                          {app.influencerEngagement}%
                        </p>
                      </div>
                    </div>
                    {nicheName && (
                      <span className="inline-flex items-center px-3 py-1.5 rounded-xl bg-primary-100 text-primary-600 text-sm font-medium w-fit">
                        {nicheName}
                      </span>
                    )}
                    <div className="space-y-4 pt-1">
                      <p className="text-sm font-medium text-neutral-500">
                        {app.profileStatus === "curation"
                          ? "Enviado em: —"
                          : app.profileStatus === "approved"
                            ? "Aprovado em: —"
                            : "Reprovado em: —"}
                      </p>
                      {isPending ? (
                        <>
                          <div className="flex gap-2">
                            <Button
                              onClick={() => handleApprove(app)}
                              className="flex-1 h-11 rounded-full font-semibold bg-primary-600 hover:bg-primary-700 text-white border-0 w-min"
                            >
                              <Icon name="Check" size={20} color="#fff"/>
                              Aprovar
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => handleReject(app)}
                              className="flex-1 h-11 rounded-full font-semibold text-neutral-600 border-neutral-200 hover:bg-neutral-50 w-min"
                            >
                              <Icon name="X" size={20} color="#525252"/>
                              Reprovar
                            </Button>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              navigate({
                                to: "/campaigns/$campaignId/influencer/$influencerId",
                                params: { campaignId: campaignId ?? "", influencerId: app.influencerId },
                              });
                            }}
                            className="flex items-center gap-2 text-sm text-neutral-500 hover:text-neutral-700 underline"
                          >
                            <Icon name="ExternalLink" size={16} color="#737373" />
                            Ver perfil
                          </button>
                        </>
                      ) : (
                        <>
                          <p className="text-sm font-medium text-neutral-600">
                            {app.profileStatus === "approved"
                              ? "Aprovado para campanha"
                              : "× Reprovado"}
                          </p>
                          <button
                            type="button"
                            onClick={() => {
                              navigate({
                                to: "/campaigns/$campaignId/influencer/$influencerId",
                                params: { campaignId: campaignId ?? "", influencerId: app.influencerId },
                              });
                            }}
                            className="flex items-center gap-2 text-sm text-neutral-500 hover:text-neutral-700 underline"
                          >
                            <Icon name="ExternalLink" size={16} color="#737373" />
                            Ver perfil
                          </button>
                        </>
                      )}
                    </div>
                    {isPending && (
                      <div className="absolute top-2 left-2">
                        <Checkbox
                          checked={selectedInfluencers.has(app.profileKey)}
                          onCheckedChange={() => handleSelectApplication(app.profileKey)}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
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
            bulkActionType === "approve"
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
              {bulkActionType === "approve"
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
                onClick={
                  bulkActionType === "approve"
                    ? handleBulkApprove
                    : handleBulkReject
                }
                disabled={
                  (bulkActionType === "reject" &&
                    !bulkRejectionFeedback.trim()) ||
                  isApproving ||
                  isRejecting
                }
                className="flex-1"
              >
                {isApproving || isRejecting ? "Processando..." : "Confirmar"}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
