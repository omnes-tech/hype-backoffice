import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getInfluencerMessages,
  sendMessage,
  type SendMessageData,
} from "@/shared/services/chat";

export function useInfluencerMessages(
  campaignId: string,
  influencerId: string
) {
  return useQuery({
    queryKey: [
      "campaigns",
      campaignId,
      "influencers",
      influencerId,
      "messages",
    ],
    queryFn: () => getInfluencerMessages(campaignId, influencerId),
    enabled: !!campaignId && !!influencerId,
    staleTime: 5000, // 5 segundos
    refetchInterval: 10000, // Refetch a cada 10 segundos para chat em tempo real
  });
}

export function useSendMessage(
  campaignId: string,
  influencerId: string
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: SendMessageData) =>
      sendMessage(campaignId, influencerId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [
          "campaigns",
          campaignId,
          "influencers",
          influencerId,
          "messages",
        ],
      });
    },
  });
}

