import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getCampaignContracts,
  sendContractTemplate,
  getContractTemplates,
  getContractStatus,
  resendContract,
  type SendContractTemplateData,
} from "@/shared/services/contract";
import {
  useWorkspaceQueryKey,
  withWorkspaceKey,
} from "@/hooks/use-workspace-query-key";

export function useCampaignContracts(
  campaignId: string,
  filters?: { status?: string; influencer_id?: string }
) {
  const workspaceId = useWorkspaceQueryKey();
  return useQuery({
    queryKey: withWorkspaceKey(
      ["campaigns", campaignId, "contracts", filters],
      workspaceId,
    ),
    queryFn: () => getCampaignContracts(campaignId, filters),
    enabled: !!campaignId && !!workspaceId,
    refetchInterval: 10000, // Refetch a cada 10 segundos para acompanhamento em tempo real
  });
}

export function useContractTemplates() {
  const workspaceId = useWorkspaceQueryKey();
  return useQuery({
    queryKey: withWorkspaceKey(["contract-templates"], workspaceId),
    queryFn: () => getContractTemplates(),
    enabled: !!workspaceId,
    staleTime: 5 * 60 * 1000, // Cache por 5 minutos
  });
}

export function useContractStatus(campaignId: string, contractId: string) {
  const workspaceId = useWorkspaceQueryKey();
  return useQuery({
    queryKey: withWorkspaceKey(
      ["campaigns", campaignId, "contracts", contractId],
      workspaceId,
    ),
    queryFn: () => getContractStatus(campaignId, contractId),
    enabled: !!campaignId && !!contractId && !!workspaceId,
    refetchInterval: 5000, // Refetch a cada 5 segundos para acompanhamento em tempo real
  });
}

export function useSendContractTemplate(campaignId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: SendContractTemplateData) =>
      sendContractTemplate(campaignId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["campaigns", campaignId, "contracts"],
      });
      queryClient.invalidateQueries({
        queryKey: ["campaigns", campaignId, "dashboard"],
      });
    },
  });
}

export function useResendContract(campaignId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (contractId: string) => resendContract(campaignId, contractId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["campaigns", campaignId, "contracts"],
      });
      queryClient.invalidateQueries({
        queryKey: ["campaigns", campaignId, "dashboard"],
      });
    },
  });
}
