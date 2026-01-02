import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getCampaignUsers,
  updateCampaignUserStatus,
  type UpdateUserStatusData,
} from "@/shared/services/campaign-users";

export function useCampaignUsers(campaignId: string) {
  return useQuery({
    queryKey: ["campaigns", campaignId, "users"],
    queryFn: () => getCampaignUsers(campaignId),
    enabled: !!campaignId,
  });
}

export function useUpdateCampaignUserStatus(campaignId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, data }: { userId: string; data: UpdateUserStatusData }) =>
      updateCampaignUserStatus(campaignId, userId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["campaigns", campaignId, "users"],
      });
    },
  });
}

