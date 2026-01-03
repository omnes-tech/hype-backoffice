import { getApiUrl, getAuthToken, getWorkspaceId } from "@/lib/utils/api";

export interface InfluencerList {
  id: string;
  name: string;
  created_at: string;
  influencer_count: number;
}

export interface InfluencerListDetail {
  id: string;
  name: string;
  influencers: Array<{
    id: number;
    name: string;
    email: string;
    photo: string | null;
  }>;
  created_at: string;
}

export interface BulkAddInfluencersRequest {
  influencer_ids?: string[];
  list_id?: string;
}

/**
 * Lista todas as listas de influenciadores do workspace
 */
export async function getInfluencerLists(): Promise<InfluencerList[]> {
  const workspaceId = getWorkspaceId();
  if (!workspaceId) {
    throw new Error("Workspace ID é obrigatório");
  }

  const request = await fetch(getApiUrl("/influencer-lists"), {
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
    throw error || "Failed to get influencer lists";
  }

  const response = await request.json();
  return response.data;
}

/**
 * Obtém detalhes de uma lista específica
 */
export async function getInfluencerList(
  listId: string
): Promise<InfluencerListDetail> {
  const workspaceId = getWorkspaceId();
  if (!workspaceId) {
    throw new Error("Workspace ID é obrigatório");
  }

  const request = await fetch(getApiUrl(`/influencer-lists/${listId}`), {
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
    throw error || "Failed to get influencer list";
  }

  const response = await request.json();
  return response.data;
}

/**
 * Adiciona múltiplos influenciadores à campanha (por IDs ou lista)
 */
export async function bulkAddInfluencersToCampaign(
  campaignId: string,
  data: BulkAddInfluencersRequest
): Promise<void> {
  const workspaceId = getWorkspaceId();
  if (!workspaceId) {
    throw new Error("Workspace ID é obrigatório");
  }

  const request = await fetch(
    getApiUrl(`/campaigns/${campaignId}/influencers/bulk-add`),
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "Client-Type": "backoffice",
        Authorization: `Bearer ${getAuthToken()}`,
        "Workspace-Id": workspaceId,
      },
      body: JSON.stringify(data),
    }
  );

  if (!request.ok) {
    const error = await request.json();
    throw error || "Failed to bulk add influencers";
  }
}

