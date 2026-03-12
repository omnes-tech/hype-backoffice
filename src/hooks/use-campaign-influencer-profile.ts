import { useQuery } from "@tanstack/react-query";
import { getCampaignInfluencerProfile } from "@/shared/services/influencer";
import type { CampaignInfluencerProfileResponse } from "@/shared/services/influencer";

/**
 * Hook para buscar o perfil do influenciador no contexto da campanha.
 * GET /campaigns/:campaignId/influencer/:influencerId
 * influencerId = id do campaign_user (mesmo da lista do dashboard).
 */
export function useCampaignInfluencerProfile(
  campaignId: string,
  influencerId: string
) {
  return useQuery({
    queryKey: ["campaigns", campaignId, "influencer", influencerId],
    queryFn: () => getCampaignInfluencerProfile(campaignId, influencerId),
    enabled: !!campaignId && !!influencerId,
    staleTime: 60000, // 1 minuto
  });
}

export type { CampaignInfluencerProfileResponse };
