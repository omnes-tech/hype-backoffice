import { useQuery } from "@tanstack/react-query";
import { getPublicCampaignInvite } from "@/shared/services/public-campaign-invite";

export function usePublicCampaignInvite(campaignPublicId: string) {
  return useQuery({
    queryKey: ["public-campaign-invite", campaignPublicId],
    queryFn: () => getPublicCampaignInvite(campaignPublicId),
    enabled: Boolean(campaignPublicId?.trim()),
    retry: false,
  });
}
