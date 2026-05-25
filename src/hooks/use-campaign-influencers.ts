import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getCampaignInfluencers,
  updateInfluencerStatus,
  inviteInfluencer,
  addToPreSelection,
  moveToPreSelectionCuration,
  type InfluencerStatusUpdate,
  type InfluencerInviteData,
  type MoveToPreSelectionCurationData,
} from "@/shared/services/influencer";
import {
  useWorkspaceQueryKey,
  withWorkspaceKey,
} from "@/hooks/use-workspace-query-key";
import { useInvalidateWorkspaceBalance } from "@/hooks/use-balance";

export function useCampaignInfluencers(campaignId: string) {
  const workspaceId = useWorkspaceQueryKey();
  return useQuery({
    queryKey: withWorkspaceKey(
      ["campaigns", campaignId, "influencers"],
      workspaceId,
    ),
    queryFn: () => getCampaignInfluencers(campaignId),
    enabled: !!campaignId && !!workspaceId,
  });
}

/**
 * Invalida todas as caches afetadas por uma mudança de influencer na campanha.
 * Inclui o **saldo do workspace** — o backend reserva/libera BRL ao aceitar,
 * convidar ou pré-selecionar, então "Reservado/Disponível" precisa refetchar.
 * Centralizado para não duplicar as chaves entre as mutações.
 */
function useInvalidateCampaignInfluencerCaches(campaignId: string) {
  const queryClient = useQueryClient();
  const invalidateBalance = useInvalidateWorkspaceBalance();

  return () => {
    const scopes = [
      "influencers",
      "dashboard",
      "users",
      "management",
      "inscriptions",
      "curation",
    ] as const;
    for (const scope of scopes) {
      queryClient.invalidateQueries({
        queryKey: ["campaigns", campaignId, scope],
      });
    }
    invalidateBalance();
  };
}

export function useUpdateInfluencerStatus(campaignId: string) {
  const invalidate = useInvalidateCampaignInfluencerCaches(campaignId);

  return useMutation({
    mutationFn: (data: InfluencerStatusUpdate) =>
      updateInfluencerStatus(campaignId, data),
    onSuccess: invalidate,
  });
}

export function useInviteInfluencer(campaignId: string) {
  const invalidate = useInvalidateCampaignInfluencerCaches(campaignId);

  return useMutation({
    mutationFn: (data: InfluencerInviteData) =>
      inviteInfluencer(campaignId, data),
    onSuccess: invalidate,
  });
}

export function useAddToPreSelection(campaignId: string) {
  const invalidate = useInvalidateCampaignInfluencerCaches(campaignId);

  return useMutation({
    mutationFn: (data: InfluencerInviteData) =>
      addToPreSelection(campaignId, data),
    onSuccess: invalidate,
  });
}

export function useMoveToPreSelectionCuration(campaignId: string) {
  const invalidate = useInvalidateCampaignInfluencerCaches(campaignId);

  return useMutation({
    mutationFn: ({
      influencerId,
      data,
    }: {
      influencerId: string;
      data?: MoveToPreSelectionCurationData;
    }) => moveToPreSelectionCuration(campaignId, influencerId, data ?? {}),
    onSuccess: invalidate,
  });
}

