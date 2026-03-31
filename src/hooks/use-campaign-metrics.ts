import { useQuery } from "@tanstack/react-query";
import {
  getCampaignMetrics,
  getInfluencerMetrics,
  getContentMetrics,
  getIdentifiedPosts,
  getCampaignContentsMetricsMap,
  getCampaignTopCities,
  getCampaignAudienceByAge,
} from "@/shared/services/metrics";

function resolveQueryEnabled(
  enabledOrOptions?: boolean | { enabled?: boolean }
): boolean {
  if (enabledOrOptions === undefined) return true;
  if (typeof enabledOrOptions === "object" && enabledOrOptions !== null) {
    return enabledOrOptions.enabled ?? true;
  }
  return enabledOrOptions;
}

export function useCampaignMetrics(campaignId: string) {
  return useQuery({
    queryKey: ["campaigns", campaignId, "metrics"],
    queryFn: () => getCampaignMetrics(campaignId),
    enabled: !!campaignId,
  });
}

/** Mapa em lote: GET .../metrics/contents */
export function useCampaignContentsMetricsMap(campaignId: string, enabled = true) {
  return useQuery({
    queryKey: ["campaigns", campaignId, "metrics", "contents-map"],
    queryFn: () => getCampaignContentsMetricsMap(campaignId),
    enabled: !!campaignId && enabled,
    staleTime: 30_000,
  });
}

/** GET .../metrics/top-cities */
export function useCampaignTopCities(
  campaignId: string,
  limit = 5,
  enabledOrOptions?: boolean | { enabled?: boolean }
) {
  const enabled = resolveQueryEnabled(enabledOrOptions);
  return useQuery({
    queryKey: ["campaigns", campaignId, "metrics", "top-cities", limit],
    queryFn: () => getCampaignTopCities(campaignId, limit),
    enabled: !!campaignId && enabled,
    staleTime: 30_000,
  });
}

/** GET .../metrics/audience-by-age */
export function useCampaignAudienceByAge(
  campaignId: string,
  enabledOrOptions?: boolean | { enabled?: boolean }
) {
  const enabled = resolveQueryEnabled(enabledOrOptions);
  return useQuery({
    queryKey: ["campaigns", campaignId, "metrics", "audience-by-age"],
    queryFn: () => getCampaignAudienceByAge(campaignId),
    enabled: !!campaignId && enabled,
    staleTime: 30_000,
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

/** Métricas por conteúdo (lote) — mesmo cache que useCampaignContentsMetricsMap */
export function useCampaignTabContentsMetrics(
  campaignId: string,
  options?: { enabled?: boolean }
) {
  return useCampaignContentsMetricsMap(campaignId, options?.enabled ?? true);
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

