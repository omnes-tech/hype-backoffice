import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getCampaigns,
  getCampaign,
  createCampaign,
  updateCampaign,
  deleteCampaign,
  type CreateCampaignData,
  type UpdateCampaignData,
} from "@/shared/services/campaign";

export function useCampaigns(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ["campaigns"],
    queryFn: getCampaigns,
    enabled: options?.enabled !== false,
  });
}

export function useCampaign(campaignId: string) {
  return useQuery({
    queryKey: ["campaigns", campaignId],
    queryFn: () => getCampaign(campaignId),
    enabled: !!campaignId,
  });
}

export function useCreateCampaign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateCampaignData) => createCampaign(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
    },
  });
}

export function useUpdateCampaign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      campaignId,
      data,
    }: {
      campaignId: string;
      data: UpdateCampaignData;
    }) => updateCampaign(campaignId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      queryClient.invalidateQueries({
        queryKey: ["campaigns", variables.campaignId],
      });
    },
  });
}

export function useDeleteCampaign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (campaignId: string) => deleteCampaign(campaignId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
    },
  });
}

