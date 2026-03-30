import { getApiUrl, getAuthToken, getWorkspaceId } from "@/lib/utils/api";
import type { ContentMetrics, IdentifiedPost } from "../types";

/** Item em `GET .../metrics/contents` (mapa `by_content_id`) */
export interface TabContentMetricsBatchItem {
  content_id: string;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  engagement: number;
  reach: number;
}

export interface TabContentMetricsBatchPayload {
  by_content_id: Record<string, TabContentMetricsBatchItem>;
}

export interface TopCityRow {
  rank: number;
  city_name: string;
  state: string;
  engagement_score: number;
}

export interface AgeBucket {
  label: string;
  percent: number;
}

export interface NetworkAudienceAge {
  has_data: boolean;
  age_buckets: AgeBucket[];
}

export interface AudienceByAgePayload {
  networks: Record<string, NetworkAudienceAge>;
}

export function tabBatchItemToContentMetrics(
  row: TabContentMetricsBatchItem
): ContentMetrics {
  return {
    contentId: row.content_id,
    views: row.views ?? 0,
    likes: row.likes ?? 0,
    comments: row.comments ?? 0,
    shares: row.shares ?? 0,
    engagement: row.engagement ?? 0,
    reach: row.reach ?? 0,
  };
}

export function mapTabContentsMetricsBatchToMap(
  payload: TabContentMetricsBatchPayload
): Record<string, ContentMetrics> {
  const by = payload.by_content_id ?? {};
  const out: Record<string, ContentMetrics> = {};
  for (const [key, row] of Object.entries(by)) {
    const id = row.content_id ?? key;
    out[id] = tabBatchItemToContentMetrics({ ...row, content_id: id });
  }
  return out;
}

export async function getCampaignTabContentsMetrics(
  campaignId: string
): Promise<Record<string, ContentMetrics>> {
  const workspaceId = getWorkspaceId();
  if (!workspaceId) {
    throw new Error("Workspace ID é obrigatório");
  }

  const request = await fetch(
    getApiUrl(`/campaigns/${campaignId}/metrics/contents`),
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
    let errorData;
    try {
      errorData = await request.json();
    } catch {
      errorData = { message: "Failed to get tab contents metrics" };
    }
    throw errorData || "Failed to get tab contents metrics";
  }

  const response = await request.json();
  const data = response.data as TabContentMetricsBatchPayload;
  return mapTabContentsMetricsBatchToMap(data ?? { by_content_id: {} });
}

export async function getCampaignTopCities(
  campaignId: string,
  limit = 5
): Promise<TopCityRow[]> {
  const workspaceId = getWorkspaceId();
  if (!workspaceId) {
    throw new Error("Workspace ID é obrigatório");
  }

  const safe = Math.min(50, Math.max(1, Math.trunc(limit)));
  const request = await fetch(
    getApiUrl(`/campaigns/${campaignId}/metrics/top-cities?limit=${safe}`),
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
    let errorData;
    try {
      errorData = await request.json();
    } catch {
      errorData = { message: "Failed to get top cities" };
    }
    throw errorData || "Failed to get top cities";
  }

  const response = await request.json();
  return (response.data as TopCityRow[]) ?? [];
}

export async function getCampaignAudienceByAge(
  campaignId: string
): Promise<AudienceByAgePayload> {
  const workspaceId = getWorkspaceId();
  if (!workspaceId) {
    throw new Error("Workspace ID é obrigatório");
  }

  const request = await fetch(
    getApiUrl(`/campaigns/${campaignId}/metrics/audience-by-age`),
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
    let errorData;
    try {
      errorData = await request.json();
    } catch {
      errorData = { message: "Failed to get audience by age" };
    }
    throw errorData || "Failed to get audience by age";
  }

  const response = await request.json();
  const data = response.data as AudienceByAgePayload;
  return data ?? { networks: {} };
}

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
    let errorData;
    try {
      errorData = await request.json();
    } catch {
      errorData = { message: "Failed to get campaign metrics" };
    }
    throw errorData || "Failed to get campaign metrics";
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
    let errorData;
    try {
      errorData = await request.json();
    } catch {
      errorData = { message: "Failed to get influencer metrics" };
    }
    throw errorData || "Failed to get influencer metrics";
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
    getApiUrl(`/campaigns/${campaignId}/metrics/contents/${contentId}`),
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
    let errorData;
    try {
      errorData = await request.json();
    } catch {
      errorData = { message: "Failed to get content metrics" };
    }
    throw errorData || "Failed to get content metrics";
    }

  const response = await request.json();
  const d = response.data as TabContentMetricsBatchItem & {
    content_id?: string;
    status?: string;
  };
  const cid = d.content_id ?? contentId;
  return tabBatchItemToContentMetrics({
    content_id: cid,
    views: d.views ?? 0,
    likes: d.likes ?? 0,
    comments: d.comments ?? 0,
    shares: d.shares ?? 0,
    engagement: d.engagement ?? 0,
    reach: d.reach ?? 0,
  });
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
    let errorData;
    try {
      errorData = await request.json();
    } catch {
      errorData = { message: "Failed to get identified posts" };
    }
    throw errorData || "Failed to get identified posts";
    }

  const response = await request.json();
  return response.data;
}

