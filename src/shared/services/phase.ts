import { getApiUrl, getAuthToken, getWorkspaceId } from "@/lib/utils/api";
import type { CampaignPhase } from "../types";

export interface CreatePhaseData {
  objective: string;
  post_date: string;
  post_time: string;
  formats: Array<{
    type: string;
    options: Array<{
      type: string;
      quantity: number;
    }>;
  }>;
  files?: string[];
}

export interface UpdatePhaseData extends Partial<CreatePhaseData> {}

/**
 * Lista todas as fases da campanha
 */
export async function getCampaignPhases(
  campaignId: string
): Promise<CampaignPhase[]> {
  const workspaceId = getWorkspaceId();
  if (!workspaceId) {
    throw new Error("Workspace ID é obrigatório");
  }

  const request = await fetch(getApiUrl(`/campaigns/${campaignId}/phases`), {
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
    throw error || "Failed to get campaign phases";
  }

  const response = await request.json();
  return response.data;
}

/**
 * Cria uma nova fase da campanha
 */
export async function createCampaignPhase(
  campaignId: string,
  data: CreatePhaseData
): Promise<CampaignPhase> {
  const workspaceId = getWorkspaceId();
  if (!workspaceId) {
    throw new Error("Workspace ID é obrigatório");
  }

  const request = await fetch(getApiUrl(`/campaigns/${campaignId}/phases`), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "Client-Type": "backoffice",
      Authorization: `Bearer ${getAuthToken()}`,
      "Workspace-Id": workspaceId,
    },
    body: JSON.stringify(data),
  });

  if (!request.ok) {
    const error = await request.json();
    throw error || "Failed to create campaign phase";
  }

  const response = await request.json();
  return response.data;
}

/**
 * Atualiza uma fase existente
 */
export async function updateCampaignPhase(
  campaignId: string,
  phaseId: string,
  data: UpdatePhaseData
): Promise<CampaignPhase> {
  const workspaceId = getWorkspaceId();
  if (!workspaceId) {
    throw new Error("Workspace ID é obrigatório");
  }

  const request = await fetch(
    getApiUrl(`/campaigns/${campaignId}/phases/${phaseId}`),
    {
      method: "PUT",
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
    throw error || "Failed to update campaign phase";
  }

  const response = await request.json();
  return response.data;
}

/**
 * Exclui uma fase da campanha
 */
export async function deleteCampaignPhase(
  campaignId: string,
  phaseId: string
): Promise<void> {
  const workspaceId = getWorkspaceId();
  if (!workspaceId) {
    throw new Error("Workspace ID é obrigatório");
  }

  const request = await fetch(
    getApiUrl(`/campaigns/${campaignId}/phases/${phaseId}`),
    {
      method: "DELETE",
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
    throw error || "Failed to delete campaign phase";
  }
}

