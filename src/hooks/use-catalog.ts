import { useQuery } from "@tanstack/react-query";
import {
  getInfluencersCatalog,
  getCampaignRecommendations,
  type CatalogFilters,
} from "@/shared/services/catalog";

export function useInfluencersCatalog(filters?: CatalogFilters) {
  return useQuery({
    queryKey: ["influencers", "catalog", filters],
    queryFn: () => getInfluencersCatalog(filters),
    staleTime: 60000, // 1 minuto - catálogo não muda frequentemente
    enabled: true,
  });
}

export function useCampaignRecommendations(campaignId: string) {
  return useQuery({
    queryKey: ["campaigns", campaignId, "recommendations"],
    queryFn: () => getCampaignRecommendations(campaignId),
    enabled: !!campaignId,
    staleTime: 30000, // 30 segundos
  });
}

