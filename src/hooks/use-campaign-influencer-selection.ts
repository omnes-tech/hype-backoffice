import { useQuery } from "@tanstack/react-query";
import { getCampaignInfluencerSelection } from "@/shared/services/campaign-influencer-selection";

export function useCampaignInfluencerSelection(campaignId: string | undefined) {
  return useQuery({
    queryKey: ["campaigns", campaignId, "influencer-selection"],
    queryFn: () => getCampaignInfluencerSelection(campaignId!),
    enabled: !!campaignId,
    staleTime: 60_000,
  });
}
