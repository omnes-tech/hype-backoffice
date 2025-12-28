import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getCampaignContents,
  approveContent,
  rejectContent,
  type ApproveContentData,
  type RejectContentData,
} from "@/shared/services/content";

export function useCampaignContents(
  campaignId: string,
  filters?: { status?: string; phase_id?: string }
) {
  return useQuery({
    queryKey: ["campaigns", campaignId, "contents", filters],
    queryFn: () => getCampaignContents(campaignId, filters),
    enabled: !!campaignId,
  });
}

export function useApproveContent(campaignId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ApproveContentData) =>
      approveContent(campaignId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["campaigns", campaignId, "contents"],
      });
    },
  });
}

export function useRejectContent(campaignId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: RejectContentData) => rejectContent(campaignId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["campaigns", campaignId, "contents"],
      });
    },
  });
}

