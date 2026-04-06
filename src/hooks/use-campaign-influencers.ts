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
import {
  useWorkspaceQueryKey,
  withWorkspaceKey,
} from "@/hooks/use-workspace-query-key";

export function useCampaignInfluencers(campaignId: string) {
  const workspaceId = useWorkspaceQueryKey();
  return useQuery({
    queryKey: withWorkspaceKey(
      ["campaigns", campaignId, "influencers"],
      workspaceId,
    ),
    queryFn: () => getCampaignInfluencers(campaignId),
    enabled: !!campaignId && !!workspaceId,
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

