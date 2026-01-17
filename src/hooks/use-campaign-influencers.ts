import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getCampaignInfluencers,
  updateInfluencerStatus,
  inviteInfluencer,
  type InfluencerStatusUpdate,
  type InfluencerInviteData,
} from "@/shared/services/influencer";

export function useCampaignInfluencers(campaignId: string) {
  return useQuery({
    queryKey: ["campaigns", campaignId, "influencers"],
    queryFn: () => getCampaignInfluencers(campaignId),
    enabled: !!campaignId,
  });
}

export function useUpdateInfluencerStatus(campaignId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: InfluencerStatusUpdate) =>
      updateInfluencerStatus(campaignId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["campaigns", campaignId, "influencers"],
      });
      queryClient.invalidateQueries({
        queryKey: ["campaigns", campaignId, "dashboard"],
      });
      queryClient.invalidateQueries({
        queryKey: ["campaigns", campaignId, "users"],
      });
    },
  });
}

export function useInviteInfluencer(campaignId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: InfluencerInviteData) =>
      inviteInfluencer(campaignId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["campaigns", campaignId, "influencers"],
      });
      queryClient.invalidateQueries({
        queryKey: ["campaigns", campaignId, "dashboard"],
      });
      queryClient.invalidateQueries({
        queryKey: ["campaigns", campaignId, "users"],
      });
    },
  });
}

