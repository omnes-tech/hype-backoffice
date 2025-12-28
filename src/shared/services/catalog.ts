import { getApiUrl, getAuthToken, getWorkspaceId } from "@/lib/utils/api";
import type { Influencer } from "../types";

export interface CatalogFilters {
  social_network?: string;
  age_range?: string;
  gender?: string;
  followers_min?: number;
  followers_max?: number;
  niche?: string;
  country?: string;
  state?: string;
  city?: string;
}

export interface Recommendation {
  influencer: {
    id: string;
    name: string;
    avatar: string;
  };
  reason: string;
}

/**
 * Lista o catálogo de influenciadores disponíveis
 */
export async function getInfluencersCatalog(
  filters?: CatalogFilters
): Promise<Influencer[]> {
  const workspaceId = getWorkspaceId();
  if (!workspaceId) {
    throw new Error("Workspace ID é obrigatório");
  }

  const params = new URLSearchParams();
  if (filters?.social_network)
    params.append("social_network", filters.social_network);
  if (filters?.age_range) params.append("age_range", filters.age_range);
  if (filters?.gender) params.append("gender", filters.gender);
  if (filters?.followers_min)
    params.append("followers_min", filters.followers_min.toString());
  if (filters?.followers_max)
    params.append("followers_max", filters.followers_max.toString());
  if (filters?.niche) params.append("niche", filters.niche);
  if (filters?.country) params.append("country", filters.country);
  if (filters?.state) params.append("state", filters.state);
  if (filters?.city) params.append("city", filters.city);

  const url = `/influencers/catalog${
    params.toString() ? `?${params.toString()}` : ""
  }`;

  const request = await fetch(getApiUrl(url), {
    method: "GET",
    headers: {
      Accept: "application/json",
      "Client-Type": "backoffice",
      Authorization: `Bearer ${getAuthToken()}`,
      "Workspace-Id": workspaceId,
    },
  });

  if (!request.ok) {
    const error = await request.json();
    throw error || "Failed to get influencers catalog";
  }

  const response = await request.json();
  return response.data;
}

/**
 * Retorna recomendações automáticas de influenciadores para a campanha
 */
export async function getCampaignRecommendations(
  campaignId: string
): Promise<Recommendation[]> {
  const workspaceId = getWorkspaceId();
  if (!workspaceId) {
    throw new Error("Workspace ID é obrigatório");
  }

  const request = await fetch(
    getApiUrl(`/influencers/campaigns/${campaignId}/recommendations`),
    {
      method: "GET",
      headers: {
        Accept: "application/json",
        "Client-Type": "backoffice",
        Authorization: `Bearer ${getAuthToken()}`,
        "Workspace-Id": workspaceId,
      },
    }
  );

  if (!request.ok) {
    const error = await request.json();
    throw error || "Failed to get campaign recommendations";
  }

  const response = await request.json();
  return response.data;
}

