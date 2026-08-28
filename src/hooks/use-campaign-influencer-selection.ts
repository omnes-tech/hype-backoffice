import { useQuery } from "@tanstack/react-query";
import { getCampaignInfluencerSelection } from "@/shared/services/campaign-influencer-selection";
import {
  useWorkspaceQueryKey,
  withWorkspaceKey,
} from "@/hooks/use-workspace-query-key";

export function useCampaignInfluencerSelection(
  campaignId: string | undefined,
  /** Nicho selecionado — filtrado no servidor, então entra na queryKey. */
  nicheId?: string | null,
) {
  const workspaceId = useWorkspaceQueryKey();
  const niche = nicheId && nicheId.trim() !== "" ? nicheId.trim() : null;
  return useQuery({
    queryKey: withWorkspaceKey(
      ["campaigns", campaignId, "influencer-selection", niche],
      workspaceId,
    ),
    queryFn: () => getCampaignInfluencerSelection(campaignId!, niche),
    enabled: !!campaignId && !!workspaceId,
    staleTime: 60_000,
  });
}
