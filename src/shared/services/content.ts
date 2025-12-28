import { getApiUrl, getAuthToken, getWorkspaceId } from "@/lib/utils/api";
import type { CampaignContent } from "../types";

export interface ApproveContentData {
  content_id: string;
}

export interface RejectContentData {
  content_id: string;
  feedback: string;
}

/**
 * Lista conteúdos de uma campanha
 */
export async function getCampaignContents(
  campaignId: string,
  filters?: {
    status?: string;
    phase_id?: string;
  }
): Promise<CampaignContent[]> {
  const workspaceId = getWorkspaceId();
  if (!workspaceId) {
    throw new Error("Workspace ID é obrigatório");
  }

  const params = new URLSearchParams();
  if (filters?.status) params.append("status", filters.status);
  if (filters?.phase_id) params.append("phase_id", filters.phase_id);

  const url = `/campaigns/${campaignId}/contents${
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
    throw error || "Failed to get campaign contents";
  }

  const response = await request.json();
  return response.data;
}

/**
 * Aprova um conteúdo
 */
export async function approveContent(
  campaignId: string,
  data: ApproveContentData
): Promise<void> {
  const workspaceId = getWorkspaceId();
  if (!workspaceId) {
    throw new Error("Workspace ID é obrigatório");
  }

  const request = await fetch(
    getApiUrl(`/campaigns/${campaignId}/contents/${data.content_id}/approve`),
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "Client-Type": "backoffice",
        Authorization: `Bearer ${getAuthToken()}`,
        "Workspace-Id": workspaceId,
      },
    }
  );

  if (!request.ok) {
    const error = await request.json();
    throw error || "Failed to approve content";
  }
}

/**
 * Rejeita um conteúdo
 */
export async function rejectContent(
  campaignId: string,
  data: RejectContentData
): Promise<void> {
  const workspaceId = getWorkspaceId();
  if (!workspaceId) {
    throw new Error("Workspace ID é obrigatório");
  }

  const request = await fetch(
    getApiUrl(`/campaigns/${campaignId}/contents/${data.content_id}/reject`),
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "Client-Type": "backoffice",
        Authorization: `Bearer ${getAuthToken()}`,
        "Workspace-Id": workspaceId,
      },
      body: JSON.stringify({
        feedback: data.feedback,
      }),
    }
  );

  if (!request.ok) {
    const error = await request.json();
    throw error || "Failed to reject content";
  }
}

/**
 * Busca a avaliação da IA do conteúdo
 */
export async function getContentEvaluation(
  campaignId: string,
  contentId: string
): Promise<{
  score: number;
  criteria: {
    relevance: number;
    quality: number;
    engagement: number;
  };
  recommendations: string[];
} | null> {
  const workspaceId = getWorkspaceId();
  if (!workspaceId) {
    throw new Error("Workspace ID é obrigatório");
  }

  const request = await fetch(
    getApiUrl(
      `/campaigns/${campaignId}/contents/${contentId}/evaluation`
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
    throw error || "Failed to get content evaluation";
  }

  const response = await request.json();
  return response.data;
}

