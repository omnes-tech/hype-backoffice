import { useQuery } from "@tanstack/react-query";
import { getCampaignManagement } from "@/shared/services/campaign-management";

export function useCampaignManagement(
  campaignId: string | undefined,
  options?: { enabled?: boolean }
) {
  const enabled =
    !!campaignId && (options?.enabled !== undefined ? options.enabled : true);

  return useQuery({
    queryKey: ["campaigns", campaignId, "management"],
    queryFn: () => getCampaignManagement(campaignId!),
    enabled,
    staleTime: 30_000,
  });
}
