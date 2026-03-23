import { useQuery, useQueries } from "@tanstack/react-query";
import {
  getCampaignInscriptions,
  getCampaignCuration,
  type InscriptionsSegment,
  type CurationColumn,
} from "@/shared/services/campaign-tab-influencers";

export function useCampaignInscriptions(
  campaignId: string | undefined,
  segment: InscriptionsSegment,
  options?: { enabled?: boolean }
) {
  const enabled =
    !!campaignId && (options?.enabled !== undefined ? options.enabled : true);

  return useQuery({
    queryKey: ["campaigns", campaignId, "inscriptions", segment],
    queryFn: () => getCampaignInscriptions(campaignId!, segment),
    enabled,
    staleTime: 30_000,
  });
}

export function useCampaignCuration(
  campaignId: string | undefined,
  column: CurationColumn,
  options?: { enabled?: boolean }
) {
  const enabled =
    !!campaignId && (options?.enabled !== undefined ? options.enabled : true);

  return useQuery({
    queryKey: ["campaigns", campaignId, "curation", column],
    queryFn: () => getCampaignCuration(campaignId!, column),
    enabled,
    staleTime: 30_000,
  });
}

const CURATION_COLUMNS = ["pending", "approved", "rejected"] as const;

/** Três queries em paralelo para contagens nas pills e listas por coluna. */
export function useCampaignCurationColumns(campaignId: string | undefined) {
  return useQueries({
    queries: CURATION_COLUMNS.map((column) => ({
      queryKey: ["campaigns", campaignId, "curation", column] as const,
      queryFn: () => getCampaignCuration(campaignId!, column),
      enabled: !!campaignId,
      staleTime: 30_000,
    })),
  });
}
