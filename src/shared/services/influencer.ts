import { getApiUrl, getAuthToken, getWorkspaceId } from "@/lib/utils/api";
import type { Influencer } from "../types";

export interface InfluencerStatusUpdate {
  influencer_id: string;
  status: string;
  feedback?: string;
}

export interface InfluencerInviteData {
  influencer_id: string;
  message?: string;
}

/**
 * Lista influenciadores de uma campanha
 */
export async function getCampaignInfluencers(
  campaignId: string
): Promise<Influencer[]> {
  const workspaceId = getWorkspaceId();
  if (!workspaceId) {
    throw new Error("Workspace ID é obrigatório");
  }

  const request = await fetch(
    getApiUrl(`/campaigns/${campaignId}/influencers`),
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
    throw error || "Failed to get campaign influencers";
  }

  const response = await request.json();
  return response.data;
}

/**
 * Atualiza status de um influenciador na campanha
 */
export async function updateInfluencerStatus(
  campaignId: string,
  data: InfluencerStatusUpdate
): Promise<void> {
  const workspaceId = getWorkspaceId();
  if (!workspaceId) {
    throw new Error("Workspace ID é obrigatório");
  }

  const request = await fetch(
    getApiUrl(`/campaigns/${campaignId}/influencers/${data.influencer_id}/status`),
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "Client-Type": "backoffice",
        Authorization: `Bearer ${getAuthToken()}`,
        "Workspace-Id": workspaceId,
      },
      body: JSON.stringify({
        status: data.status,
        feedback: data.feedback,
      }),
    }
  );

  if (!request.ok) {
    const error = await request.json();
    throw error || "Failed to update influencer status";
  }
}

/**
 * Convida um influenciador para a campanha
 */
export async function inviteInfluencer(
  campaignId: string,
  data: InfluencerInviteData
): Promise<void> {
  const workspaceId = getWorkspaceId();
  if (!workspaceId) {
    throw new Error("Workspace ID é obrigatório");
  }

  const request = await fetch(
    getApiUrl(`/campaigns/${campaignId}/influencers/invite`),
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
    throw error || "Failed to invite influencer";
  }
}

/**
 * Move um influenciador para a fase de curadoria
 */
export async function moveToCuration(
  campaignId: string,
  influencerId: string,
  notes?: string
): Promise<void> {
  const workspaceId = getWorkspaceId();
  if (!workspaceId) {
    throw new Error("Workspace ID é obrigatório");
  }

  const request = await fetch(
    getApiUrl(`/campaigns/${campaignId}/influencers/${influencerId}/curation`),
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "Client-Type": "backoffice",
        Authorization: `Bearer ${getAuthToken()}`,
        "Workspace-Id": workspaceId,
      },
      body: JSON.stringify({ notes }),
    }
  );

  if (!request.ok) {
    const error = await request.json();
    throw error || "Failed to move influencer to curation";
  }
}

/**
 * Busca o histórico de mudanças de status do influenciador
 */
export async function getInfluencerHistory(
  campaignId: string,
  influencerId: string
): Promise<
  Array<{
    id: string;
    status: string;
    timestamp: string;
    notes?: string;
  }>
> {
  const workspaceId = getWorkspaceId();
  if (!workspaceId) {
    throw new Error("Workspace ID é obrigatório");
  }

  const request = await fetch(
    getApiUrl(
      `/campaigns/${campaignId}/influencers/${influencerId}/history`
    ),
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
    throw error || "Failed to get influencer history";
  }

  const response = await request.json();
  return response.data;
}

