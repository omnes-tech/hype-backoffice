import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getInfluencerLists,
  getInfluencerList,
  bulkAddInfluencersToCampaign,
  type BulkAddInfluencersRequest,
} from "@/shared/services/influencer-lists";
import { toast } from "sonner";
import {
  useWorkspaceQueryKey,
  withWorkspaceKey,
} from "@/hooks/use-workspace-query-key";

export function useInfluencerLists() {
  const workspaceId = useWorkspaceQueryKey();
  return useQuery({
    queryKey: withWorkspaceKey(["influencer-lists"], workspaceId),
    queryFn: getInfluencerLists,
    enabled: !!workspaceId,
  });
}

export function useInfluencerList(listId: string | null) {
  const workspaceId = useWorkspaceQueryKey();
  return useQuery({
    queryKey: withWorkspaceKey(["influencer-list", listId], workspaceId),
    queryFn: () => getInfluencerList(listId!),
    enabled: !!listId && !!workspaceId,
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
      queryClient.invalidateQueries({
        queryKey: ["campaigns", campaignId, "influencer-selection"],
      });
      toast.success("Influenciadores adicionados com sucesso");
    },
    onError: (error: Error) => {
      const message = error?.message || "Erro ao adicionar influenciadores";
      toast.error(message);
    },
  });
}

