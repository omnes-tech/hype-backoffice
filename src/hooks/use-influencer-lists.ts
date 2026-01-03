import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getInfluencerLists,
  getInfluencerList,
  bulkAddInfluencersToCampaign,
  type BulkAddInfluencersRequest,
} from "@/shared/services/influencer-lists";
import { toast } from "sonner";

export function useInfluencerLists() {
  return useQuery({
    queryKey: ["influencer-lists"],
    queryFn: getInfluencerLists,
  });
}

export function useInfluencerList(listId: string | null) {
  return useQuery({
    queryKey: ["influencer-list", listId],
    queryFn: () => getInfluencerList(listId!),
    enabled: !!listId,
  });
}

export function useBulkAddInfluencers(campaignId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: BulkAddInfluencersRequest) =>
      bulkAddInfluencersToCampaign(campaignId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaigns", campaignId, "users"] });
      queryClient.invalidateQueries({ queryKey: ["campaigns", campaignId, "influencers"] });
      queryClient.invalidateQueries({ queryKey: ["campaigns", campaignId, "dashboard"] });
      toast.success("Influenciadores adicionados com sucesso");
    },
    onError: (error: any) => {
      const message = error?.message || "Erro ao adicionar influenciadores";
      toast.error(message);
    },
  });
}

