import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getCampaignInfluencers,
  updateInfluencerStatus,
  inviteInfluencer,
  addToPreSelection,
  moveToPreSelectionCuration,
  type InfluencerStatusUpdate,
  type InfluencerInviteData,
  type MoveToPreSelectionCurationData,
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
      queryClient.invalidateQueries({
        queryKey: ["campaigns", campaignId, "management"],
      });
      queryClient.invalidateQueries({
        queryKey: ["campaigns", campaignId, "inscriptions"],
      });
      queryClient.invalidateQueries({
        queryKey: ["campaigns", campaignId, "curation"],
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
      queryClient.invalidateQueries({
        queryKey: ["campaigns", campaignId, "management"],
      });
      queryClient.invalidateQueries({
        queryKey: ["campaigns", campaignId, "inscriptions"],
      });
      queryClient.invalidateQueries({
        queryKey: ["campaigns", campaignId, "curation"],
      });
    },
  });
}

export function useAddToPreSelection(campaignId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: InfluencerInviteData) =>
      addToPreSelection(campaignId, data),
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
      queryClient.invalidateQueries({
        queryKey: ["campaigns", campaignId, "management"],
      });
      queryClient.invalidateQueries({
        queryKey: ["campaigns", campaignId, "inscriptions"],
      });
      queryClient.invalidateQueries({
        queryKey: ["campaigns", campaignId, "curation"],
      });
    },
  });
}

export function useMoveToPreSelectionCuration(campaignId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      influencerId,
      data,
    }: {
      influencerId: string;
      data?: MoveToPreSelectionCurationData;
    }) => moveToPreSelectionCuration(campaignId, influencerId, data ?? {}),
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
      queryClient.invalidateQueries({
        queryKey: ["campaigns", campaignId, "management"],
      });
      queryClient.invalidateQueries({
        queryKey: ["campaigns", campaignId, "inscriptions"],
      });
      queryClient.invalidateQueries({
        queryKey: ["campaigns", campaignId, "curation"],
      });
    },
  });
}

