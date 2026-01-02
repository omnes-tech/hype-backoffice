import { useState, useMemo } from "react";
import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Badge } from "@/components/ui/badge";
import { Tabs } from "@/components/ui/tabs";

import { DashboardTab } from "@/components/campaign-tabs/dashboard-tab";
import { ManagementTab } from "@/components/campaign-tabs/management-tab";
import { InfluencerSelectionTab } from "@/components/campaign-tabs/influencer-selection-tab";
import { CurationTab } from "@/components/campaign-tabs/curation-tab";
import { ContentApprovalTab } from "@/components/campaign-tabs/content-approval-tab";
import { MetricsTab } from "@/components/campaign-tabs/metrics-tab";

import { useCampaign } from "@/hooks/use-campaigns";
import { useCampaignDashboard } from "@/hooks/use-campaign-dashboard";
import { useIdentifiedPosts } from "@/hooks/use-campaign-metrics";
import { useCampaignUsers } from "@/hooks/use-campaign-users";

export const Route = createFileRoute("/(private)/(app)/campaigns/$campaignId")({
  component: RouteComponent,
});

const tabs = [
  { id: "dashboard", label: "Dashboard" },
  { id: "management", label: "Gerenciamento" },
  { id: "selection", label: "Seleção de influenciadores" },
  { id: "curation", label: "Curadoria" },
  { id: "approval", label: "Aprovações de conteúdo" },
  { id: "metrics", label: "Métricas e conteúdos" },
];

function RouteComponent() {
  const navigate = useNavigate();
  const { campaignId } = useParams({ from: "/(private)/(app)/campaigns/$campaignId" });
  const [activeTab, setActiveTab] = useState("dashboard");

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

  // Extrair dados do dashboard
  const phases = dashboardData?.phases || [];
  const influencers = dashboardData?.influencers || [];
  const contents = dashboardData?.contents || [];
  const metrics = dashboardData?.metrics;

  const campaignFormData = useMemo(() => {
    if (!campaign) return null;

    return {
      title: campaign.title || "",
      description: campaign.description || "",
      subniches: Array.isArray(campaign.secondary_niches)
        ? campaign.secondary_niches.map((n: any) => (typeof n === 'object' ? n.name : String(n))).join(", ")
        : String(campaign.secondary_niches || ""),
      influencersCount: campaign.max_influencers?.toString() || "0",
      minFollowers: campaign.segment_min_followers?.toString() || "0",
      state: campaign.segment_state || "",
      city: campaign.segment_city || "",
      gender: Array.isArray(campaign.segment_genders)
        ? campaign.segment_genders.join(", ")
        : campaign.segment_genders || "all",
      paymentType: campaign.payment_method || "",
      benefits: campaign.benefits || "",
      generalObjective: campaign.objective || "",
      whatToDo: campaign.rules_does || "",
      whatNotToDo: campaign.rules_does_not || "",
      banner: campaign.banner || "",
      imageRightsPeriod: campaign.image_rights_period?.toString() || "0",
      brandFiles: "",
      phasesCount: phases.length.toString(),
      phases: phases.map((phase: any) => ({
        id: phase.id,
        objective: phase.objective,
        postDate: phase.publish_date,
        postTime: phase.publish_time,
        formats: phase.contents?.map((content: any) => ({
          id: content.id || Math.random().toString(),
          socialNetwork: content.type,
          contentType: content.options?.[0]?.type || "post",
          quantity: content.options?.[0]?.quantity?.toString() || "1",
        })) || [],
        files: "",
      })),
    };
  }, [campaign, phases]);

  // Calcular progresso
  const progressPercentage = useMemo(() => {
    if (!contents.length) return 0;
    const published = contents.filter((c) => c.status === "published").length;
    return Math.round((published / contents.length) * 100);
  }, [contents]);

  // Métricas formatadas (já vêm formatadas do dashboard)
  const formattedMetrics = useMemo(() => {
    if (!metrics) {
      return {
        reach: 0,
        engagement: 0,
        publishedContent: 0,
        activeInfluencers: 0,
      };
    }

    return {
      reach: metrics.reach || 0,
      engagement: metrics.engagement || 0,
      publishedContent: metrics.publishedContent || 0,
      activeInfluencers: metrics.activeInfluencers || 0,
    };
  }, [metrics]);

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
          />
        );
      case "selection":
        return (
          <InfluencerSelectionTab
            influencers={influencers}
            campaignPhases={phases.map((phase: any, index: number) => ({
              id: phase.id,
              label: `Fase ${index + 1}`,
            }))}
          />
        );
      case "curation":
        return <CurationTab influencers={influencers} />;
      case "approval":
        return (
          <ContentApprovalTab
            contents={contents}
            campaignPhases={phases}
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
              <Button variant="outline">
                <div className="flex items-center gap-2">
                  <Icon name="Pencil" color="#404040" size={16} />
                  <span>Editar</span>
                </div>
              </Button>
              <Button variant="outline">
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
    </div>
  );
}
