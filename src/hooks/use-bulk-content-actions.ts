import { useMutation, useQueryClient } from "@tanstack/react-query";
import { bulkApproveContents, bulkRejectContents } from "@/shared/services/content";
import { toast } from "sonner";

interface BulkContentActionsParams {
  campaignId: string;
}

export function useBulkContentActions({ campaignId }: BulkContentActionsParams) {
  const queryClient = useQueryClient();

  const approveMutation = useMutation({
    mutationFn: (contentIds: string[]) =>
      bulkApproveContents(campaignId, contentIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaigns", campaignId, "contents"] });
      queryClient.invalidateQueries({ queryKey: ["campaigns", campaignId, "dashboard"] });
      toast.success("Conteúdos aprovados com sucesso");
    },
    onError: (error: any) => {
      const message = error?.message || "Erro ao aprovar conteúdos";
      toast.error(message);
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ contentIds, feedback }: { contentIds: string[]; feedback: string }) =>
      bulkRejectContents(campaignId, contentIds, feedback),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaigns", campaignId, "contents"] });
      queryClient.invalidateQueries({ queryKey: ["campaigns", campaignId, "dashboard"] });
      toast.success("Conteúdos reprovados com sucesso");
    },
    onError: (error: any) => {
      const message = error?.message || "Erro ao reprovar conteúdos";
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

