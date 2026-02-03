import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getCampaignScripts,
  approveScript,
  rejectScript,
  type ApproveScriptData,
  type RejectScriptData,
} from "@/shared/services/script";

export function useCampaignScripts(
  campaignId: string,
  filters?: { status?: string; phase_id?: string }
) {
  return useQuery({
    queryKey: ["campaigns", campaignId, "scripts", filters],
    queryFn: () => getCampaignScripts(campaignId, filters),
    enabled: !!campaignId,
  });
}

export function useApproveScript(campaignId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ApproveScriptData) => approveScript(campaignId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["campaigns", campaignId, "scripts"],
      });
      queryClient.invalidateQueries({
        queryKey: ["campaigns", campaignId, "dashboard"],
      });
    },
  });
}

export function useRejectScript(campaignId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: RejectScriptData) => rejectScript(campaignId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["campaigns", campaignId, "scripts"],
      });
      queryClient.invalidateQueries({
        queryKey: ["campaigns", campaignId, "dashboard"],
      });
    },
  });
}
