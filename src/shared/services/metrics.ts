import { getApiUrl, getAuthToken, getWorkspaceId } from "@/lib/utils/api";
import type { ContentMetrics, IdentifiedPost } from "../types";

export interface CampaignMetrics {
  reach: number;
  engagement: number;
  published_content: number;
  active_influencers: number;
  conversion_rate?: number;
}

export interface InfluencerMetrics {
  influencer_id: string;
  influencer_name: string;
  influencer_avatar: string;
  total_views: number;
  total_likes: number;
  total_comments: number;
  total_shares: number;
  total_reach: number;
  average_engagement: number;
  contents_count: number;
}

/**
 * Busca métricas gerais da campanha
 */
export async function getCampaignMetrics(
  campaignId: string
): Promise<CampaignMetrics> {
  const workspaceId = getWorkspaceId();
  if (!workspaceId) {
    throw new Error("Workspace ID é obrigatório");
  }

  const request = await fetch(getApiUrl(`/campaigns/${campaignId}/metrics`), {
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
    throw error || "Failed to get campaign metrics";
  }

  const response = await request.json();
  return response.data;
}

/**
 * Busca métricas por influenciador
 */
export async function getInfluencerMetrics(
  campaignId: string
): Promise<InfluencerMetrics[]> {
  const workspaceId = getWorkspaceId();
  if (!workspaceId) {
    throw new Error("Workspace ID é obrigatório");
  }

  const request = await fetch(
    getApiUrl(`/campaigns/${campaignId}/metrics/influencers`),
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
    throw error || "Failed to get influencer metrics";
  }

  const response = await request.json();
  return response.data;
}

/**
 * Busca métricas de um conteúdo específico
 */
export async function getContentMetrics(
  campaignId: string,
  contentId: string
): Promise<ContentMetrics> {
  const workspaceId = getWorkspaceId();
  if (!workspaceId) {
    throw new Error("Workspace ID é obrigatório");
  }

  const request = await fetch(
    getApiUrl(`/campaigns/${campaignId}/contents/${contentId}/metrics`),
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
    throw error || "Failed to get content metrics";
  }

  const response = await request.json();
  return response.data;
}

/**
 * Busca publicações identificadas automaticamente
 */
export async function getIdentifiedPosts(
  campaignId: string,
  filters?: {
    phase_id?: string;
  }
): Promise<IdentifiedPost[]> {
  const workspaceId = getWorkspaceId();
  if (!workspaceId) {
    throw new Error("Workspace ID é obrigatório");
  }

  const params = new URLSearchParams();
  if (filters?.phase_id) params.append("phase_id", filters.phase_id);

  const url = `/campaigns/${campaignId}/metrics/identified-posts${
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
    throw error || "Failed to get identified posts";
  }

  const response = await request.json();
  return response.data;
}

