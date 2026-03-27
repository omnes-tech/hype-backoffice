import { useState, useMemo, useEffect, useCallback } from "react";
import { createFileRoute, useNavigate, useParams, Outlet, useLocation } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Tabs } from "@/components/ui/tabs";

import { DashboardTab, DashboardTabSkeleton } from "@/components/campaign-tabs/dashboard-tab";
import { ManagementTab } from "@/components/campaign-tabs/management-tab";
import { InfluencerSelectionTab } from "@/components/campaign-tabs/influencer-selection-tab";
import { ApplicationsTab } from "@/components/campaign-tabs/applications-tab";
import { CurationTab } from "@/components/campaign-tabs/curation-tab";
import { ContentApprovalTab } from "@/components/campaign-tabs/content-approval-tab";
import { ScriptApprovalTab } from "@/components/campaign-tabs/script-approval-tab";
import { ContractsTab } from "@/components/campaign-tabs/contracts-tab";
import { MetricsTab } from "@/components/campaign-tabs/metrics-tab";
import { ShareCampaignModal } from "@/components/share-campaign-modal";
import { Modal } from "@/components/ui/modal";
import { InputDate } from "@/components/ui/input-date";
import { validateMuralEndDate, formatDateForInput, addDays } from "@/shared/utils/date-validations";

import { useCampaign, useUpdateCampaign } from "@/hooks/use-campaigns";
import { useActivateMural } from "@/hooks/use-campaign-mural";
import { useCampaignDashboard } from "@/hooks/use-campaign-dashboard";
import { useIdentifiedPosts } from "@/hooks/use-campaign-metrics";
import { useCampaignManagement } from "@/hooks/use-campaign-management";
import { useNiches } from "@/hooks/use-niches";
import {
  checkCampaignPublicationTracking,
  mapApiPhasesToCampaignPhases,
} from "@/shared/services/dashboard";
import { getSubnicheValueByLabel } from "@/shared/data/subniches";
import { formatReais } from "@/shared/utils/masks";
import {
  getCampaignStatusDisplayLabel,
  getCampaignStatusValue,
} from "@/shared/utils/campaign-status";

export const Route = createFileRoute("/(private)/(app)/campaigns/$campaignId")({
  component: RouteComponent,
});

const tabs = [
  { id: "dashboard", label: "Dashboard" },
  { id: "selection", label: "Seleção de influenciadores" },
  { id: "applications", label: "Inscrições" },
  { id: "curation", label: "Curadoria" },
  { id: "management", label: "Gerenciamento" },
  { id: "contracts", label: "Contratos" },
  { id: "script-approval", label: "Aprovações de roteiro" },
  { id: "approval", label: "Aprovações de conteúdo" },
  { id: "metrics", label: "Métricas e conteúdos" },
];

function RouteComponent() {
  const navigate = useNavigate();
  const location = useLocation();
  const { campaignId } = useParams({ from: "/(private)/(app)/campaigns/$campaignId" });
  const [activeTab, setActiveTab] = useState("dashboard");
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [showMuralDateModal, setShowMuralDateModal] = useState(false);
  const [tempMuralEndDate, setTempMuralEndDate] = useState("");
  const [showUnpublishModal, setShowUnpublishModal] = useState(false);

  /** Deep links vindos de notificações — guardados antes de limpar a URL */
  const [pendingOpenChat, setPendingOpenChat] = useState<string | null>(null);
  const [pendingFocusCampaignUser, setPendingFocusCampaignUser] = useState<
    string | null
  >(null);
  const [pendingContentId, setPendingContentId] = useState<string | null>(null);

  const handleOpenChatConsumed = useCallback(() => setPendingOpenChat(null), []);
  const handleFocusUserConsumed = useCallback(
    () => setPendingFocusCampaignUser(null),
    []
  );
  const handleHighlightContentConsumed = useCallback(
    () => setPendingContentId(null),
    []
  );

  // Ler search params da URL para navegação de notificações
  useEffect(() => {
    const sp = new URLSearchParams(location.search);
    const tabParam = sp.get("tab");
    const openChat = sp.get("openChat");
    const focusCampaignUser = sp.get("focusCampaignUser");
    const contentId = sp.get("contentId");

    const validTabIds = new Set(tabs.map((t) => t.id));
    let targetTab: string | null =
      tabParam && validTabIds.has(tabParam) ? tabParam : null;

    if (!targetTab) {
      if (openChat) targetTab = "management";
      else if (contentId) targetTab = "approval";
      else if (focusCampaignUser) targetTab = "curation";
    }

    if (
      !targetTab &&
      !openChat &&
      !focusCampaignUser &&
      !contentId
    ) {
      return;
    }

    if (targetTab) {
      setActiveTab(targetTab);
    }
    if (openChat) setPendingOpenChat(openChat);
    if (focusCampaignUser) setPendingFocusCampaignUser(focusCampaignUser);
    if (contentId) setPendingContentId(contentId);

    const next = new URLSearchParams(location.search);
    for (const k of ["tab", "openChat", "focusCampaignUser", "contentId"]) {
      next.delete(k);
    }
    const rest = Object.fromEntries(next);
    navigate({
      to: location.pathname,
      search: Object.keys(rest).length > 0 ? rest : undefined,
      replace: true,
    });
  }, [location.search, location.pathname, navigate]);

  // Query principal da campanha (dados básicos)
  const queryClient = useQueryClient();
  const {
    data: campaign,
    isLoading: isLoadingCampaign,
    error: campaignError,
  } = useCampaign(campaignId);
  const updateCampaignMutation = useUpdateCampaign();
  const checkPublicationTrackingMutation = useMutation({
    mutationFn: () => checkCampaignPublicationTracking(campaignId),
    onSuccess: (result) => {
      toast.success(
        `Varredura concluída: ${result.published}/${result.checked} publicados`
      );

      if ((result.errors?.length ?? 0) > 0) {
        toast.warning(
          `A varredura terminou com ${result.errors.length} erro(s) pontuais.`
        );
      }

      void queryClient.invalidateQueries({
        queryKey: ["campaigns", campaignId],
      });
      void queryClient.invalidateQueries({
        queryKey: ["campaigns", campaignId, "dashboard"],
      });
      void queryClient.invalidateQueries({
        queryKey: ["campaigns", campaignId, "identified-posts"],
      });
      void queryClient.invalidateQueries({
        queryKey: ["campaigns", campaignId, "metrics"],
      });
    },
    onError: (err: unknown) => {
      const e = err as {
        message?: string | string[];
        errors?: string[];
      };
      const msg = Array.isArray(e?.message)
        ? e.message.join(", ")
        : e?.message || e?.errors?.join(", ") || "Erro ao verificar publicações";
      toast.error(msg);
    },
  });

  // Dashboard: influenciadores, conteúdos e métricas (fases vêm de GET campanha quando a API envia `phases`)
  const {
    data: dashboardData,
    isLoading: isLoadingDashboard,
  } = useCampaignDashboard(campaignId);

  // Query de posts identificados (ainda não está no dashboard)
  const {
    data: identifiedPosts = [],
  } = useIdentifiedPosts(campaignId);

  const {
    data: managementData,
    isLoading: isLoadingManagement,
    error: managementError,
  } = useCampaignManagement(campaignId, {
    enabled: activeTab === "management",
  });

  const { mutate: activateMural, isPending: isActivatingMural } = useActivateMural(campaignId);

  // Buscar nichos para determinar o nicho principal
  const { data: niches = [] } = useNiches();

  const phasesFromCampaignDetail = useMemo(() => {
    if (campaign?.phases === undefined || campaign.phases === null) {
      return null;
    }
    return mapApiPhasesToCampaignPhases(campaign.phases);
  }, [campaign?.phases]);

  const phases =
    phasesFromCampaignDetail !== null
      ? phasesFromCampaignDetail
      : dashboardData?.phases ?? [];
  const influencers = dashboardData?.influencers || [];
  const contents = dashboardData?.contents || [];
  const metrics = dashboardData?.metrics;

  const campaignFormData = useMemo(() => {
    if (!campaign) return null;

    // Processar subnichos
    const subnicheIds = Array.isArray(campaign.secondary_niches)
      ? campaign.secondary_niches
        .map((n: any) => {
          const name = typeof n === 'object' ? n.name : String(n);
          return getSubnicheValueByLabel(name);
        })
        .filter(Boolean)
      : campaign.secondary_niches
        ? [getSubnicheValueByLabel(String(campaign.secondary_niches))]
        : [];

    // Nicho primário: API `primary_niche` ou inferido pelo primeiro subnicho
    let mainNicheId = "";
    if (campaign.primary_niche?.id != null) {
      mainNicheId = String(campaign.primary_niche.id);
    } else if (subnicheIds.length > 0 && niches.length > 0) {
      const firstSubnicheId = parseInt(subnicheIds[0], 10);
      const firstSubniche = niches.find((n) => n.id === firstSubnicheId);
      if (firstSubniche?.parent_id) {
        mainNicheId = firstSubniche.parent_id.toString();
      }
    }

    return {
      title: campaign.title || "",
      description: campaign.description || "",
      mainNiche: mainNicheId,
      primaryNicheName: campaign.primary_niche?.name ?? "",
      subniches: subnicheIds.join(","),
      influencersCount: campaign.max_influencers?.toString() || "0",
      minFollowers: campaign.segment_min_followers?.toString() || "0",
      state: Array.isArray(campaign.segment_state)
        ? campaign.segment_state.join(",")
        : campaign.segment_state || "",
      city: Array.isArray(campaign.segment_city)
        ? campaign.segment_city.join(",")
        : campaign.segment_city || "",
      gender: Array.isArray(campaign.segment_genders)
        ? campaign.segment_genders.join(", ")
        : campaign.segment_genders || "all",
      paymentType: campaign.payment_method || "",
      paymentFixedAmount: campaign.payment_method === "fixed" && campaign.payment_method_details?.amount
        ? formatReais(campaign.payment_method_details.amount)
        : "",
      paymentSwapItem: campaign.payment_method === "swap" && campaign.payment_method_details?.description
        ? campaign.payment_method_details.description.split(" - Valor de mercado:")[0]?.trim() || ""
        : "",
      paymentSwapMarketValue: campaign.payment_method === "swap" && campaign.payment_method_details?.amount
        ? formatReais(campaign.payment_method_details.amount)
        : "",
      paymentCpaActions: campaign.payment_method === "cpa" && campaign.payment_method_details?.description
        ? campaign.payment_method_details.description
          .replace("Ações que geram CPA:", "")
          .split(" - Valor:")[0]
          ?.trim() || ""
        : "",
      paymentCpaValue: campaign.payment_method === "cpa" && campaign.payment_method_details?.amount
        ? formatReais(campaign.payment_method_details.amount)
        : "",
      paymentCpmValue: campaign.payment_method === "cpm" && campaign.payment_method_details?.amount
        ? formatReais(campaign.payment_method_details.amount)
        : "",
      benefits: campaign.benefits
        ? (Array.isArray(campaign.benefits)
          ? campaign.benefits
          : campaign.benefits.split(/\n/).map(line => line.trim()).filter(line => line).length > 0
            ? campaign.benefits.split(/\n/).map(line => line.trim()).filter(line => line)
            : [""])
        : [""],
      generalObjective: campaign.objective || "",
      whatToDo: Array.isArray(campaign.rules_does)
        ? campaign.rules_does
        : campaign.rules_does
          ? [campaign.rules_does]
          : [""],
      whatNotToDo: Array.isArray(campaign.rules_does_not)
        ? campaign.rules_does_not
        : campaign.rules_does_not
          ? [campaign.rules_does_not]
          : [""],
      banner: campaign.banner || "",
      imageRightsPeriod: campaign.image_rights_period?.toString() || "0",
      brandFiles: "",
      phasesCount: phases.length.toString(),
      phases, // GET campanha (`phases`) ou, em fallback, dashboard
    };
  }, [campaign, phases, niches]);

  // Calcular progresso
  const progressPercentage = useMemo(() => {
    if (!contents.length) return 0;
    const published = contents.filter((c) => c.status === "published").length;
    return Math.round((published / contents.length) * 100);
  }, [contents]);

  // Métricas calculadas conforme especificações
  const formattedMetrics = useMemo(() => {
    // Status que contam como "Aprovados/Em andamento" para frente
    const activeStatuses = [
      "approved",
      "pending_approval",
      "in_correction",
      "content_approved",
      "published",
    ];

    // Influenciadores ativos: somatória de influenciadores da etapa "Aprovados/Em andamento" para frente
    const activeInfluencersCount = influencers.filter((inf) =>
      activeStatuses.includes(inf.status || "")
    ).length;

    // Conteúdos publicados: conteúdos com status "published" (identificados via hashtag)
    const publishedContents = contents.filter(
      (content) => content.status === "published"
    );
    const publishedContentCount = publishedContents.length;

    // Alcance total: somatória de visualizações dos conteúdos publicados
    // Usa as métricas dos posts identificados quando disponíveis
    const postsWithMetrics = identifiedPosts.filter(
      (post) => post.metrics && post.metrics.views > 0
    );
    const totalReach =
      postsWithMetrics.length > 0
        ? postsWithMetrics.reduce((sum, post) => sum + (post.metrics?.views || 0), 0)
        : metrics?.reach || 0;

    // Engajamento: média dos engajamentos individuais dos conteúdos publicados
    // Calcula a média dos engajamentos individuais que já estão calculados
    const postsWithEngagement = identifiedPosts.filter(
      (post) => post.metrics && post.metrics.engagement !== undefined
    );
    const averageEngagement =
      postsWithEngagement.length > 0
        ? postsWithEngagement.reduce(
          (sum, post) => sum + (post.metrics?.engagement || 0),
          0
        ) / postsWithEngagement.length
        : metrics?.engagement || 0;

    return {
      reach: totalReach,
      engagement: averageEngagement,
      publishedContent: publishedContentCount,
      activeInfluencers: activeInfluencersCount,
    };
  }, [influencers, contents, identifiedPosts, metrics]);

  // Loading state (agora só 2 queries: campaign e dashboard)
  const isLoading = isLoadingCampaign || isLoadingDashboard;

  // Se estiver na rota de edição ou no perfil do influenciador, renderizar apenas o Outlet (após todos os hooks)
  if (location.pathname.includes("/edit")) {
    return <Outlet />;
  }
  if (location.pathname.includes("/influencer/")) {
    return <Outlet />;
  }

  // Error handling
  if (campaignError) {
    toast.error("Erro ao carregar campanha");
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-lg font-semibold text-neutral-950 mb-2">
            Erro ao carregar campanha
          </p>
          <p className="text-sm text-neutral-600 mb-4">
            Não foi possível carregar os dados da campanha.
          </p>
          <Button onClick={() => navigate({ to: "/campaigns" })}>
            Voltar para campanhas
          </Button>
        </div>
      </div>
    );
  }

  if (isLoading || !campaignFormData) {
    return (
      <div className="flex flex-col h-full max-w-7xl mx-auto">
        <div className="flex-1 pb-6">
          <div className="bg-white rounded-xl overflow-hidden">
            <div className="px-4 pt-4 pb-0 flex flex-col gap-5">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-1 text-sm text-neutral-500">
                  <span>Campanhas</span>
                  <Icon name="ChevronRight" size={16} color="#7c7c7c" />
                  <span className="text-neutral-400">Detalhes da campanha</span>
                </div>
                <div className="flex gap-3">
                  <div className="skeleton h-9 w-24 rounded-md" />
                  <div className="skeleton h-9 w-20 rounded-md" />
                  <div className="skeleton h-9 w-28 rounded-md" />
                </div>
              </div>
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="skeleton h-8 w-72 max-w-full" />
                <div className="flex items-center gap-2.5">
                  <div className="skeleton h-4 w-28" />
                  <span className="size-1 rounded-full bg-neutral-300" aria-hidden />
                  <div className="skeleton h-4 w-24" />
                  <div className="skeleton h-8 w-20 rounded-xl" />
                </div>
              </div>
            </div>
            <Tabs tabs={tabs} activeTab="dashboard" onTabChange={() => { }} />
          </div>
          <div className="mt-6">
            <DashboardTabSkeleton />
          </div>
        </div>
      </div>
    );
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case "dashboard":
        return (
          <DashboardTab
            campaign={campaignFormData}
            metrics={formattedMetrics}
            progressPercentage={progressPercentage}
          />
        );
      case "management":
        return (
          <ManagementTab
            participants={managementData?.participants ?? []}
            isLoading={isLoadingManagement}
            error={managementError}
            openChatInfluencerId={pendingOpenChat ?? undefined}
            onOpenChatConsumed={handleOpenChatConsumed}
          />
        );
      case "selection":
        return (
          <InfluencerSelectionTab
            influencers={influencers}
            campaignPhases={phases.map((phase: any, index: number) => ({
              id: phase.id,
              label: `Fase ${index + 1}`,
              publish_date: phase.publish_date,
            }))}
            maxInfluencers={campaign?.max_influencers || 0}
            phasesWithFormats={phases}
            onOpenMuralModal={() => setShowMuralDateModal(true)}
          />
        );
      case "applications":
        return (
          <ApplicationsTab
            focusCampaignUserId={pendingFocusCampaignUser}
            onFocusUserConsumed={handleFocusUserConsumed}
          />
        );
      case "curation":
        return (
          <CurationTab
            focusCampaignUserId={pendingFocusCampaignUser}
            onFocusUserConsumed={handleFocusUserConsumed}
          />
        );
      case "approval":
        return (
          <ContentApprovalTab
            campaignPhases={phases}
            highlightContentId={pendingContentId}
            onHighlightContentConsumed={handleHighlightContentConsumed}
          />
        );
      case "script-approval":
        return (
          <ScriptApprovalTab
            campaignPhases={phases}
          />
        );
      case "contracts":
        return (
          <ContractsTab
            influencers={influencers.map((inf: any) => ({
              id: inf.id,
              name: inf.name,
              avatar: inf.avatar,
            }))}
          />
        );
      case "metrics":
        return (
          <MetricsTab
            contents={contents}
            metrics={{}}
            campaignPhases={phases}
            identifiedPosts={identifiedPosts}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-full max-w-7xl mx-auto">
      <div className="flex-1 pb-6">
        <div className="bg-white rounded-xl overflow-hidden">
          {/* Breadcrumb + título + status + ações */}
          <div className="px-4 pt-4 pb-0 flex flex-col gap-5">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <button
                type="button"
                onClick={() => navigate({ to: "/campaigns" })}
                className="flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-700"
              >
                <span>Campanhas</span>
                <Icon name="ChevronRight" size={16} color="#7c7c7c" />
                <span className="text-neutral-950">Detalhes da campanha</span>
              </button>
              <div className="flex items-center gap-3">
                {
                  getCampaignStatusValue(campaign?.status) === "draft" && (
                    <Button
                      type="button"
                      disabled={
                        getCampaignStatusValue(campaign?.status) === "published"
                      }
                      title={
                        getCampaignStatusValue(campaign?.status) === "published"
                          ? "Esta campanha já está publicada"
                          : undefined
                      }
                      onClick={() => setShowMuralDateModal(true)}
                      className="bg-primary-500 hover:bg-primary-600 text-white border-0 disabled:hover:bg-primary-500"
                    >
                      <div className="flex items-center gap-2">
                        <Icon name="Send" color="#fff" size={16} />
                        <span>Publicar</span>
                      </div>
                    </Button>
                  )
                }
                <Button
                  variant="outline"
                  disabled={checkPublicationTrackingMutation.isPending}
                  onClick={() => checkPublicationTrackingMutation.mutate()}
                  className="flex-1"
                >
                  <div className="flex items-center gap-2">
                    <span>
                      {checkPublicationTrackingMutation.isPending
                        ? "Verificando..."
                        : "Verificar publicações"}
                    </span>
                  </div>
                </Button>
                <Button
                  variant="outline"
                  onClick={() => navigate({ to: "/campaigns/$campaignId/edit", params: { campaignId } })}
                >
                  <div className="flex items-center gap-2">
                    <Icon name="Pencil" color="#404040" size={16} />
                    <span>Editar</span>
                  </div>
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setIsShareModalOpen(true)}
                >
                  <div className="flex items-center gap-2">
                    <Icon name="Share2" color="#404040" size={16} />
                    <span>Compartilhar</span>
                  </div>
                </Button>
              </div>
            </div>
            <div className="flex items-center justify-between flex-wrap gap-4">
              <h1 className="text-[28px] font-semibold text-neutral-950 leading-tight">
                {campaignFormData.title}
              </h1>
              <div className="flex items-center gap-2.5">
                <span className="text-sm text-neutral-500">
                  {campaignFormData.influencersCount} influenciadores
                </span>
                <span className="size-1 rounded-full bg-neutral-400" aria-hidden />
                <span className="text-sm text-neutral-500">
                  {progressPercentage}% Concluído
                </span>
                {getCampaignStatusValue(campaign?.status) === "published" ? (
                  <button
                    type="button"
                    onClick={() => setShowUnpublishModal(true)}
                    title="Despublicar campanha"
                    className="px-3 py-2 rounded-xl bg-green-100 text-left transition-colors hover:bg-green-200/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500 cursor-pointer"
                  >
                    <span className="text-sm font-normal text-success-800">
                      {getCampaignStatusDisplayLabel(campaign?.status)}
                    </span>
                  </button>
                ) : (
                  <div className="px-3 py-2 rounded-xl bg-neutral-200">
                    <span className="text-sm font-normal text-neutral-950">
                      {getCampaignStatusDisplayLabel(campaign?.status)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Tabs (estilo Figma: borda inferior roxa na ativa) */}
          <Tabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />
        </div>

        {/* Conteúdo das tabs */}
        <div className="mt-6">
          {renderTabContent()}
        </div>
      </div>

      {/* Modal de compartilhamento */}
      {campaign && (
        <ShareCampaignModal
          isOpen={isShareModalOpen}
          onClose={() => setIsShareModalOpen(false)}
          campaignId={campaignId}
          campaignTitle={campaign.title}
        />
      )}

      {showUnpublishModal && (
        <Modal
          title="Despublicar campanha"
          onClose={() =>
            !updateCampaignMutation.isPending && setShowUnpublishModal(false)
          }
          panelClassName="max-w-md"
        >
          <p className="mb-6 text-sm text-neutral-600">
            A campanha voltará ao estado de rascunho e deixará de constar como
            publicada. Confirme se deseja continuar.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button
              type="button"
              variant="outline"
              className="flex-1 min-w-[120px]"
              disabled={updateCampaignMutation.isPending}
              onClick={() => setShowUnpublishModal(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              className="flex-1 min-w-[120px] bg-danger-600 hover:bg-danger-700 text-white border-0"
              disabled={updateCampaignMutation.isPending}
              onClick={() => {
                updateCampaignMutation.mutate(
                  { campaignId, data: { status: "draft" } },
                  {
                    onSuccess: () => {
                      toast.success("Campanha despublicada.");
                      setShowUnpublishModal(false);
                      void queryClient.invalidateQueries({
                        queryKey: ["campaigns", campaignId, "dashboard"],
                      });
                    },
                    onError: (err: unknown) => {
                      const e = err as {
                        message?: string | string[];
                        errors?: string[];
                      };
                      const msg = Array.isArray(e?.message)
                        ? e.message.join(", ")
                        : e?.message ||
                        e?.errors?.join(", ") ||
                        "Não foi possível despublicar a campanha.";
                      toast.error(msg);
                    },
                  }
                );
              }}
            >
              {updateCampaignMutation.isPending
                ? "Despublicando…"
                : "Despublicar"}
            </Button>
          </div>
        </Modal>
      )}

      {/* Modal Ativar Descobrir (aberto pelo botão Publicar ou pela aba de seleção) */}
      {showMuralDateModal && (() => {
        const phase1Date = phases?.[0]?.postDate || "";
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
                  onClick={() => {
                    if (!tempMuralEndDate) return;
                    activateMural(
                      { end_date: tempMuralEndDate },
                      {
                        onSuccess: () => {
                          toast.success("Descobrir ativado com sucesso!");
                          setShowMuralDateModal(false);
                          setTempMuralEndDate("");
                        },
                        onError: (error: any) => {
                          toast.error(error?.message || "Erro ao ativar Descobrir");
                        },
                      }
                    );
                  }}
                  disabled={!tempMuralEndDate || isActivatingMural || !validation.valid}
                  className="flex-1 bg-primary-500 hover:bg-primary-600 text-white border-0"
                >
                  {isActivatingMural ? "Ativando..." : "Ativar Descobrir"}
                </Button>
              </div>
            </div>
          </Modal>
        );
      })()}
    </div>
  );
}
