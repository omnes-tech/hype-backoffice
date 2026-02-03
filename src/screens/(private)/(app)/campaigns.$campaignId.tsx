import { useState, useMemo, useEffect } from "react";
import { createFileRoute, useNavigate, useParams, Outlet, useLocation } from "@tanstack/react-router";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Badge } from "@/components/ui/badge";
import { Tabs } from "@/components/ui/tabs";

import { DashboardTab } from "@/components/campaign-tabs/dashboard-tab";
import { ManagementTab } from "@/components/campaign-tabs/management-tab";
import { InfluencerSelectionTab } from "@/components/campaign-tabs/influencer-selection-tab";
import { ApplicationsTab } from "@/components/campaign-tabs/applications-tab";
import { CurationTab } from "@/components/campaign-tabs/curation-tab";
import { ContentApprovalTab } from "@/components/campaign-tabs/content-approval-tab";
import { ScriptApprovalTab } from "@/components/campaign-tabs/script-approval-tab";
import { ContractsTab } from "@/components/campaign-tabs/contracts-tab";
import { MetricsTab } from "@/components/campaign-tabs/metrics-tab";
import { ShareCampaignModal } from "@/components/share-campaign-modal";

import { useCampaign } from "@/hooks/use-campaigns";
import { useCampaignDashboard } from "@/hooks/use-campaign-dashboard";
import { useIdentifiedPosts } from "@/hooks/use-campaign-metrics";
import { useCampaignUsers } from "@/hooks/use-campaign-users";
import { useNiches } from "@/hooks/use-niches";
import { getSubnicheValueByLabel } from "@/shared/data/subniches";
import { formatCurrency } from "@/shared/utils/masks";

export const Route = createFileRoute("/(private)/(app)/campaigns/$campaignId")({
  component: RouteComponent,
});

const tabs = [
  { id: "dashboard", label: "Dashboard" },
  { id: "selection", label: "Seleção de influenciadores" },
  { id: "management", label: "Gerenciamento" },
  { id: "applications", label: "Inscrições" },
  { id: "curation", label: "Curadoria" },
  { id: "approval", label: "Aprovações de conteúdo" },
  { id: "script-approval", label: "Aprovações de roteiro" },
  { id: "contracts", label: "Contratos" },
  { id: "metrics", label: "Métricas e conteúdos" },
];

function RouteComponent() {
  const navigate = useNavigate();
  const location = useLocation();
  const { campaignId } = useParams({ from: "/(private)/(app)/campaigns/$campaignId" });
  const [activeTab, setActiveTab] = useState("dashboard");
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  
  // Ler search params da URL para navegação de notificações
  const searchParams = new URLSearchParams(location.search);
  const tabFromUrl = searchParams.get("tab");
  const openChatInfluencerId = searchParams.get("openChat");

  // Mudar para a aba correta se especificada na URL
  useEffect(() => {
    if (tabFromUrl && tabs.some(tab => tab.id === tabFromUrl)) {
      setActiveTab(tabFromUrl);
      // Limpar os parâmetros da URL após usar (tab e openChat)
      const newSearchParams = new URLSearchParams(location.search);
      newSearchParams.delete("tab");
      newSearchParams.delete("openChat");
      const remainingParams = Object.fromEntries(newSearchParams);
      navigate({
        to: location.pathname,
        search: Object.keys(remainingParams).length > 0 ? remainingParams : undefined,
        replace: true,
      });
    }
  }, [tabFromUrl, location.search, location.pathname, navigate]);

  // Se estiver na rota de edição, renderizar apenas o Outlet
  if (location.pathname.includes("/edit")) {
    return <Outlet />;
  }

  // Query principal da campanha (dados básicos)
  const {
    data: campaign,
    isLoading: isLoadingCampaign,
    error: campaignError,
  } = useCampaign(campaignId);

  // Query do dashboard (fases, influenciadores, conteúdos, métricas) - UMA ÚNICA CHAMADA
  const {
    data: dashboardData,
    isLoading: isLoadingDashboard,
  } = useCampaignDashboard(campaignId);

  // Query de posts identificados (ainda não está no dashboard)
  const {
    data: identifiedPosts = [],
  } = useIdentifiedPosts(campaignId);

  // Query de usuários inscritos na campanha
  const {
    data: campaignUsers = [],
  } = useCampaignUsers(campaignId);

  // Buscar nichos para determinar o nicho principal
  const { data: niches = [] } = useNiches();

  // Extrair dados do dashboard
  const phases = dashboardData?.phases || [];
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
    
    // Determinar o nicho principal a partir do primeiro subnicho selecionado
    let mainNicheId = "";
    if (subnicheIds.length > 0 && niches.length > 0) {
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
        ? formatCurrency(campaign.payment_method_details.amount.toString())
        : "",
      paymentSwapItem: campaign.payment_method === "swap" && campaign.payment_method_details?.description
        ? campaign.payment_method_details.description.split(" - Valor de mercado:")[0]?.trim() || ""
        : "",
      paymentSwapMarketValue: campaign.payment_method === "swap" && campaign.payment_method_details?.amount
        ? formatCurrency(campaign.payment_method_details.amount.toString())
        : "",
      paymentCpaActions: campaign.payment_method === "cpa" && campaign.payment_method_details?.description
        ? campaign.payment_method_details.description
            .replace("Ações que geram CPA:", "")
            .split(" - Valor:")[0]
            ?.trim() || ""
        : "",
      paymentCpaValue: campaign.payment_method === "cpa" && campaign.payment_method_details?.amount
        ? formatCurrency(campaign.payment_method_details.amount.toString())
        : "",
      paymentCpmValue: campaign.payment_method === "cpm" && campaign.payment_method_details?.amount
        ? formatCurrency(campaign.payment_method_details.amount.toString())
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
      phases: phases, // Já vem transformado do hook useCampaignDashboard
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
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
          <p className="text-sm text-neutral-600">Carregando campanha...</p>
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
            influencers={influencers}
            campaignPhases={phases}
            campaignUsers={campaignUsers}
            openChatInfluencerId={openChatInfluencerId || undefined}
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
          />
        );
      case "applications":
        return <ApplicationsTab influencers={influencers} />;
      case "curation":
        return <CurationTab influencers={influencers} />;
      case "approval":
        return (
          <ContentApprovalTab
            campaignPhases={phases}
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
    <div className="flex flex-col h-full bg-neutral-100">
      {/* Header fixo */}
      <div className="bg-white border-b border-neutral-200 sticky top-0 z-10 shadow-sm">
        <div className="p-6 pb-0">
          <div className="flex items-center justify-between mb-4">
            <div className="flex flex-col justify-start gap-4">
              <Button
                variant="outline"
                onClick={() => navigate({ to: "/campaigns" })}
                style={{ width: "40%", height: "36px" }}
              >
                <div className="flex items-center gap-2">
                  <Icon name="ArrowLeft" size={16} color="#404040" />
                  <span className="text-neutral-700 font-medium">Voltar</span>
                </div>
              </Button>
              <div>
                <h1 className="text-2xl font-semibold text-neutral-950">
                  {campaignFormData.title}
                </h1>
                <div className="flex items-center gap-2 mt-1">
                  <Badge
                    text={campaign?.status === "published" ? "Ativa" : "Rascunho"}
                    backgroundColor={
                      campaign?.status === "published"
                        ? "bg-success-50"
                        : "bg-neutral-100"
                    }
                    textColor={
                      campaign?.status === "published"
                        ? "text-success-900"
                        : "text-neutral-700"
                    }
                  />
                  <span className="text-sm text-neutral-600">
                    {campaignFormData.influencersCount} influenciadores •{" "}
                    {progressPercentage}% concluído
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {((campaign?.status as any)?.value === "draft" || campaign?.status === "draft") && (
                <Button
                  variant="outline"
                  onClick={() => navigate({ to: "/campaigns/$campaignId/edit", params: { campaignId } })}
                >
                  <div className="flex items-center gap-2">
                    <Icon name="Pencil" color="#404040" size={16} />
                    <span>Editar</span>
                  </div>
                </Button>
              )}
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
        </div>

        {/* Tabs */}
        <Tabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />
      </div>

      {/* Conteúdo das tabs */}
      <div className="flex-1 overflow-y-auto p-6 px-0">
        {renderTabContent()}
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
    </div>
  );
}
