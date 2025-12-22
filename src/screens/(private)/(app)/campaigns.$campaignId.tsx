import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Badge } from "@/components/ui/badge";
import { Tabs } from "@/components/ui/tabs";
import type {
  CampaignFormData,
  Influencer,
  CampaignContent,
  ContentMetrics,
} from "@/shared/types";

import { DashboardTab } from "@/components/campaign-tabs/dashboard-tab";
import { ManagementTab } from "@/components/campaign-tabs/management-tab";
import { InfluencerSelectionTab } from "@/components/campaign-tabs/influencer-selection-tab";
import { CurationTab } from "@/components/campaign-tabs/curation-tab";
import { ContentApprovalTab } from "@/components/campaign-tabs/content-approval-tab";
import { MetricsTab } from "@/components/campaign-tabs/metrics-tab";

export const Route = createFileRoute("/(private)/(app)/campaigns/$campaignId")({
  component: RouteComponent,
});

// Mock data - em produção viria de uma API
const mockCampaignData: CampaignFormData = {
  title: "Verão 2024: Moda Praia",
  description:
    "Campanha focada em promover nossa nova coleção de moda praia para o verão 2024. Buscamos influenciadores que compartilhem estilo de vida praiano e fashion.",
  subniches: "beauty",
  influencersCount: "10",
  minFollowers: "5000",
  state: "São Paulo",
  city: "São Paulo",
  gender: "all",
  paymentType: "fixed",
  benefits:
    "• Participação no sorteio de gadgets (fones, teclado mecânico ou monitor portátil);\n• Acesso Premium gratuito a nossa plataforma por 30 dias.",
  generalObjective:
    "Aumentar o alcance da marca e gerar engajamento com o público-alvo através de conteúdo autêntico e relevante.",
  whatToDo:
    "• Mencionar a marca no início do vídeo.\n• Usar hashtag oficial #CampanhaBrand.\n• Mostrar o produto sendo utilizado.",
  whatNotToDo:
    "• Falar sobre marcas concorrentes.\n• Usar linguagem inadequada.\n• Postar em horários de baixo engajamento.",
  banner:
    "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.1.0",
  imageRightsPeriod: "2",
  brandFiles: "Branding.pdf (2.4 MB)",
  phasesCount: "2",
  phases: [
    {
      id: "1",
      objective: "engagement",
      postDate: "2025-01-15",
      postTime: "18:00",
      formats: [
        {
          id: "1",
          socialNetwork: "instagram",
          contentType: "reels",
          quantity: "1",
        },
        {
          id: "2",
          socialNetwork: "instagram",
          contentType: "stories",
          quantity: "3",
        },
      ],
      files: "Fase1_Materiais.zip",
    },
    {
      id: "2",
      objective: "conversion",
      postDate: "2025-01-22",
      postTime: "20:00",
      formats: [
        {
          id: "3",
          socialNetwork: "instagram",
          contentType: "post",
          quantity: "2",
        },
      ],
      files: "",
    },
  ],
};

// Mock influencers data
const mockInfluencers: Influencer[] = [
  {
    id: "1",
    name: "Maria Silva",
    username: "mariabeauty",
    avatar: "https://i.pravatar.cc/150?img=1",
    followers: 125000,
    engagement: 8.5,
    niche: "Beleza",
    status: "selected",
  },
  {
    id: "2",
    name: "João Santos",
    username: "joaofashion",
    avatar: "https://i.pravatar.cc/150?img=2",
    followers: 89000,
    engagement: 7.2,
    niche: "Moda",
    status: "invited",
  },
  {
    id: "3",
    name: "Ana Costa",
    username: "analifestyle",
    avatar: "https://i.pravatar.cc/150?img=3",
    followers: 210000,
    engagement: 9.1,
    niche: "Lifestyle",
    status: "active",
  },
  {
    id: "4",
    name: "Pedro Lima",
    username: "pedrostyle",
    avatar: "https://i.pravatar.cc/150?img=4",
    followers: 156000,
    engagement: 6.8,
    niche: "Moda",
    status: "published",
  },
  {
    id: "5",
    name: "Carla Oliveira",
    username: "carlabeauty",
    avatar: "https://i.pravatar.cc/150?img=5",
    followers: 98000,
    engagement: 8.9,
    niche: "Beleza",
    status: "curation",
  },
];

// Mock contents data
const mockContents: CampaignContent[] = [
  {
    id: "1",
    influencerId: "3",
    influencerName: "Ana Costa",
    influencerAvatar: "https://i.pravatar.cc/150?img=3",
    socialNetwork: "instagram",
    contentType: "reels",
    previewUrl: "https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=400",
    postUrl: "https://instagram.com/p/example1",
    status: "pending",
    submittedAt: "2025-01-10T10:00:00Z",
  },
  {
    id: "2",
    influencerId: "4",
    influencerName: "Pedro Lima",
    influencerAvatar: "https://i.pravatar.cc/150?img=4",
    socialNetwork: "instagram",
    contentType: "post",
    previewUrl: "https://images.unsplash.com/photo-1611162616305-c69b3c7b8d74?w=400",
    postUrl: "https://instagram.com/p/example2",
    status: "published",
    submittedAt: "2025-01-08T14:00:00Z",
    publishedAt: "2025-01-09T18:00:00Z",
  },
  {
    id: "3",
    influencerId: "3",
    influencerName: "Ana Costa",
    influencerAvatar: "https://i.pravatar.cc/150?img=3",
    socialNetwork: "instagram",
    contentType: "stories",
    previewUrl: "https://images.unsplash.com/photo-1611162618071-b39a2ec055fb?w=400",
    postUrl: "https://instagram.com/stories/example3",
    status: "published",
    submittedAt: "2025-01-07T09:00:00Z",
    publishedAt: "2025-01-07T12:00:00Z",
  },
];

// Mock metrics data
const mockMetrics: { [contentId: string]: ContentMetrics } = {
  "2": {
    contentId: "2",
    views: 45200,
    likes: 3200,
    comments: 145,
    shares: 89,
    engagement: 7.6,
    reach: 38900,
  },
  "3": {
    contentId: "3",
    views: 28900,
    likes: 2100,
    comments: 78,
    shares: 45,
    engagement: 7.7,
    reach: 24500,
  },
};

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
  const [activeTab, setActiveTab] = useState("dashboard");
  const campaign = mockCampaignData;
  const progressPercentage = 45;

  const metrics = {
    reach: 45200,
    engagement: 8.5,
    publishedContent: 2,
    activeInfluencers: 3,
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case "dashboard":
        return (
          <DashboardTab
            campaign={campaign}
            metrics={metrics}
            progressPercentage={progressPercentage}
          />
        );
      case "management":
        return (
          <ManagementTab
            influencers={mockInfluencers}
            campaignPhases={campaign.phases || []}
          />
        );
      case "selection":
        return (
          <InfluencerSelectionTab
            influencers={mockInfluencers}
            campaignPhases={campaign.phases?.map((phase, index) => ({
              id: phase.id,
              label: `Fase ${index + 1}`,
            })) || []}
          />
        );
      case "curation":
        return <CurationTab influencers={mockInfluencers} />;
      case "approval":
        return (
          <ContentApprovalTab
            contents={mockContents}
            campaignPhases={campaign.phases || []}
          />
        );
      case "metrics":
        return (
          <MetricsTab
            contents={mockContents}
            metrics={mockMetrics}
            campaignPhases={campaign.phases || []}
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
                  {campaign.title}
                </h1>
                <div className="flex items-center gap-2 mt-1">
                  <Badge
                    text="Ativa"
                    backgroundColor="bg-success-50"
                    textColor="text-success-900"
                  />
                  <span className="text-sm text-neutral-600">
                    {campaign.influencersCount} influenciadores • {progressPercentage}%
                    concluído
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
      <div className="flex-1 overflow-y-auto p-6 px-0">{renderTabContent()}</div>
    </div>
  );
}
