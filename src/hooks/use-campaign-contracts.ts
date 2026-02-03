import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getCampaignContracts,
  sendContractTemplate,
  getContractTemplates,
  getContractStatus,
  resendContract,
  type SendContractTemplateData,
} from "@/shared/services/contract";

export function useCampaignContracts(
  campaignId: string,
  filters?: { status?: string; influencer_id?: string }
) {
  return useQuery({
    queryKey: ["campaigns", campaignId, "contracts", filters],
    queryFn: () => getCampaignContracts(campaignId, filters),
    enabled: !!campaignId,
    refetchInterval: 10000, // Refetch a cada 10 segundos para acompanhamento em tempo real
  });
}

export function useContractTemplates() {
  return useQuery({
    queryKey: ["contract-templates"],
    queryFn: () => getContractTemplates(),
    staleTime: 5 * 60 * 1000, // Cache por 5 minutos
  });
}

export function useContractStatus(campaignId: string, contractId: string) {
  return useQuery({
    queryKey: ["campaigns", campaignId, "contracts", contractId],
    queryFn: () => getContractStatus(campaignId, contractId),
    enabled: !!campaignId && !!contractId,
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
