import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  autoReserveAfterApproval,
  getCampaignPricing,
  getInfluencerQuote,
  preflightApproval,
  setStepNetworkPrice,
} from "@/shared/services/pricing";
import { HOLDS_QUERY_KEYS } from "./use-holds";
import { HYPEPOINT_QUERY_KEYS } from "./use-hypepoint";

export const PRICING_QUERY_KEYS = {
  all: ["pricing"] as const,
  campaign: (publicId: string) =>
    [...PRICING_QUERY_KEYS.all, "campaign", publicId] as const,
  quote: (campaignUserId: number) =>
    [...PRICING_QUERY_KEYS.all, "quote", campaignUserId] as const,
};

export function useCampaignPricing(campaignPublicId: string | null | undefined) {
  return useQuery({
    queryKey: PRICING_QUERY_KEYS.campaign(campaignPublicId ?? ""),
    queryFn: () => getCampaignPricing(campaignPublicId as string),
    enabled: !!campaignPublicId,
    staleTime: 30_000,
  });
}

export function useInfluencerQuote(campaignUserId: number | null | undefined) {
  return useQuery({
    queryKey: PRICING_QUERY_KEYS.quote(campaignUserId ?? -1),
    queryFn: () => getInfluencerQuote(campaignUserId as number),
    enabled: campaignUserId != null && campaignUserId > 0,
    staleTime: 15_000,
  });
}

export function useSetStepNetworkPrice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: { stepNetworkId: number; priceHuman: string }) =>
      setStepNetworkPrice(params.stepNetworkId, params.priceHuman),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: PRICING_QUERY_KEYS.all });
    },
  });
}

export function usePreflightApproval() {
  return useMutation({
    mutationFn: (campaignUserIds: number[]) =>
      preflightApproval(campaignUserIds),
  });
}

export function useAutoReserve() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (campaignUserId: number) =>
      autoReserveAfterApproval(campaignUserId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: PRICING_QUERY_KEYS.all });
      qc.invalidateQueries({ queryKey: HOLDS_QUERY_KEYS.all });
      qc.invalidateQueries({ queryKey: HYPEPOINT_QUERY_KEYS.all });
    },
  });
}
