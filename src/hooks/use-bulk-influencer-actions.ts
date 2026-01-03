import { useMutation, useQueryClient } from "@tanstack/react-query";
import { bulkApproveInfluencers, bulkRejectInfluencers } from "@/shared/services/influencer";
import { toast } from "sonner";

interface BulkInfluencerActionsParams {
  campaignId: string;
}

export function useBulkInfluencerActions({ campaignId }: BulkInfluencerActionsParams) {
  const queryClient = useQueryClient();

  const approveMutation = useMutation({
    mutationFn: ({ influencerIds, feedback }: { influencerIds: string[]; feedback?: string }) =>
      bulkApproveInfluencers(campaignId, influencerIds, feedback),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaigns", campaignId, "users"] });
      queryClient.invalidateQueries({ queryKey: ["campaigns", campaignId, "influencers"] });
      queryClient.invalidateQueries({ queryKey: ["campaigns", campaignId, "dashboard"] });
      toast.success("Influenciadores aprovados com sucesso");
    },
    onError: (error: any) => {
      const message = error?.message || "Erro ao aprovar influenciadores";
      toast.error(message);
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ influencerIds, feedback }: { influencerIds: string[]; feedback: string }) =>
      bulkRejectInfluencers(campaignId, influencerIds, feedback),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaigns", campaignId, "users"] });
      queryClient.invalidateQueries({ queryKey: ["campaigns", campaignId, "influencers"] });
      queryClient.invalidateQueries({ queryKey: ["campaigns", campaignId, "dashboard"] });
      toast.success("Influenciadores reprovados com sucesso");
    },
    onError: (error: any) => {
      const message = error?.message || "Erro ao reprovar influenciadores";
      toast.error(message);
    },
  });

  return {
    approve: approveMutation.mutate,
    reject: rejectMutation.mutate,
    isApproving: approveMutation.isPending,
    isRejecting: rejectMutation.isPending,
  };
}

