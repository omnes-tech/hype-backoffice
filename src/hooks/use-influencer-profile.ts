import { useQuery } from "@tanstack/react-query";
import { getInfluencerProfile } from "@/shared/services/influencer";
import {
  useWorkspaceQueryKey,
  withWorkspaceKey,
} from "@/hooks/use-workspace-query-key";

export function useInfluencerProfile(influencerId: string) {
  const workspaceId = useWorkspaceQueryKey();
  return useQuery({
    queryKey: withWorkspaceKey(
      ["influencers", influencerId, "profile"],
      workspaceId,
    ),
    queryFn: () => getInfluencerProfile(influencerId),
    enabled: Boolean(influencerId) && !!workspaceId,
  });
}
