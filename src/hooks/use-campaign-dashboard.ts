import { useQuery } from "@tanstack/react-query";
import {
  getCampaignDashboard,
  transformDashboardPhase,
  transformDashboardInfluencer,
  transformDashboardContent,
  type DashboardResponse,
} from "@/shared/services/dashboard";
import type { CampaignPhase, Influencer, CampaignContent } from "@/shared/types";

export interface CampaignDashboardData {
  phases: CampaignPhase[];
  influencers: Influencer[];
  contents: CampaignContent[];
  metrics: {
    reach: number;
    engagement: number;
    publishedContent: number;
    activeInfluencers: number;
  };
}

/**
 * Hook para buscar todos os dados da campanha em uma única chamada
 * Substitui múltiplas chamadas: phases, influencers, contents, metrics
 */
export function useCampaignDashboard(campaignId: string) {
  return useQuery({
    queryKey: ["campaigns", campaignId, "dashboard"],
    queryFn: async () => {
      const data: DashboardResponse = await getCampaignDashboard(campaignId);

      // Transformar dados para o formato usado no frontend
      return {
        phases: data.phases.map(transformDashboardPhase),
        influencers: data.influencers.map(transformDashboardInfluencer),
        contents: data.contents.map(transformDashboardContent),
        metrics: {
          reach: data.metrics.reach,
          engagement: data.metrics.engagement,
          publishedContent: data.metrics.published_content,
          activeInfluencers: data.metrics.active_influencers,
        },
      } as CampaignDashboardData;
    },
    enabled: !!campaignId,
    staleTime: 30000, // 30 segundos - cache por 30s
  });
}

