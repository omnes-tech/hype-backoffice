import { useQuery } from "@tanstack/react-query";
import { getInfluencerProfile } from "@/shared/services/influencer";

export function useInfluencerProfile(influencerId: string) {
  return useQuery({
    queryKey: ["influencers", influencerId, "profile"],
    queryFn: () => getInfluencerProfile(influencerId),
    enabled: Boolean(influencerId),
  });
}
