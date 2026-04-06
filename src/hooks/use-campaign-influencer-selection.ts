import { useQuery } from "@tanstack/react-query";
import { getCampaignInfluencerSelection } from "@/shared/services/campaign-influencer-selection";
import {
  useWorkspaceQueryKey,
  withWorkspaceKey,
} from "@/hooks/use-workspace-query-key";

export function useCampaignInfluencerSelection(campaignId: string | undefined) {
  const workspaceId = useWorkspaceQueryKey();
  return useQuery({
    queryKey: withWorkspaceKey(
      ["campaigns", campaignId, "influencer-selection"],
      workspaceId,
    ),
    queryFn: () => getCampaignInfluencerSelection(campaignId!),
    enabled: !!campaignId && !!workspaceId,
    staleTime: 60_000,
  });
}
