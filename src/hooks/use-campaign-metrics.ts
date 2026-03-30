import { useQuery } from "@tanstack/react-query";
import {
  getCampaignMetrics,
  getInfluencerMetrics,
  getContentMetrics,
  getIdentifiedPosts,
  getCampaignTabContentsMetrics,
  getCampaignTopCities,
  getCampaignAudienceByAge,
} from "@/shared/services/metrics";

export function useCampaignMetrics(campaignId: string) {
  return useQuery({
    queryKey: ["campaigns", campaignId, "metrics"],
    queryFn: () => getCampaignMetrics(campaignId),
    enabled: !!campaignId,
  });
}

export function useInfluencerMetrics(campaignId: string) {
  return useQuery({
    queryKey: ["campaigns", campaignId, "metrics", "influencers"],
    queryFn: () => getInfluencerMetrics(campaignId),
    enabled: !!campaignId,
  });
}

export function useContentMetrics(
  campaignId: string,
  contentId: string,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: ["campaigns", campaignId, "metrics", "contents", contentId],
    queryFn: () => getContentMetrics(campaignId, contentId),
    enabled:
      (options?.enabled ?? true) && !!campaignId && !!contentId,
  });
}

/** Métricas por conteúdo (lote) — tab Métricas e conteúdos */
export function useCampaignTabContentsMetrics(
  campaignId: string,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: ["campaigns", campaignId, "metrics-tab", "contents"],
    queryFn: () => getCampaignTabContentsMetrics(campaignId),
    enabled: (options?.enabled ?? true) && !!campaignId,
  });
}

export function useCampaignTopCities(
  campaignId: string,
  limit = 5,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: ["campaigns", campaignId, "metrics-tab", "top-cities", limit],
    queryFn: () => getCampaignTopCities(campaignId, limit),
    enabled: (options?.enabled ?? true) && !!campaignId,
  });
}

export function useCampaignAudienceByAge(
  campaignId: string,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: ["campaigns", campaignId, "metrics-tab", "audience-by-age"],
    queryFn: () => getCampaignAudienceByAge(campaignId),
    enabled: (options?.enabled ?? true) && !!campaignId,
  });
}

export function useIdentifiedPosts(
  campaignId: string,
  filters?: { phase_id?: string }
) {
  return useQuery({
    queryKey: ["campaigns", campaignId, "identified-posts", filters],
    queryFn: () => getIdentifiedPosts(campaignId, filters),
    enabled: !!campaignId,
  });
}

