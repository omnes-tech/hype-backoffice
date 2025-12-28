import { useQuery } from "@tanstack/react-query";
import {
  getCampaignMetrics,
  getInfluencerMetrics,
  getContentMetrics,
  getIdentifiedPosts,
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

export function useContentMetrics(campaignId: string, contentId: string) {
  return useQuery({
    queryKey: ["campaigns", campaignId, "contents", contentId, "metrics"],
    queryFn: () => getContentMetrics(campaignId, contentId),
    enabled: !!campaignId && !!contentId,
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

