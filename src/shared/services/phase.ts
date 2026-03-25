import { getApiUrl, getAuthToken, getWorkspaceId } from "@/lib/utils/api";
import type { CampaignPhase } from "../types";

export interface CreatePhaseData {
  objective: string;
  post_date: string;
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

  const url = getApiUrl(`/campaigns/${campaignId}/phases`);
  console.log("🔵 POST", url);
  console.log("Payload:", JSON.stringify(data, null, 2));

  const request = await fetch(url, {
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

  console.log("Response status:", request.status);
  console.log("Response ok:", request.ok);

  if (!request.ok) {
    let errorData;
    try {
      errorData = await request.json();
      console.error("❌ Erro da API:", errorData);
    } catch {
      const text = await request.text();
      console.error("❌ Erro da API (texto):", text);
      errorData = { message: "Failed to create campaign phase" };
    }
    const error = new Error(errorData?.message || errorData?.error || "Failed to create campaign phase") as any;
    error.status = request.status;
    error.data = errorData;
    throw error;
  }

  const response = await request.json();
  console.log("✅ Resposta da API:", response);
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
    getApiUrl(`/campaigns/${campaignId}/steps/${phaseId}`),
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
    let errorData;
    try {
      errorData = await request.json();
    } catch {
      errorData = { message: "Failed to update campaign phase" };
    }
    const error = new Error(errorData?.message || errorData?.error || "Failed to update campaign phase") as any;
    error.status = request.status;
    error.data = errorData;
    throw error;
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
    getApiUrl(`/campaigns/${campaignId}/steps/${phaseId}`),
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

