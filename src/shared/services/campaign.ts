import { getApiUrl, getAuthToken, getWorkspaceId } from "@/lib/utils/api";
import type { Campaign } from "../types";

export interface CampaignListItem {
  id: string;
  title: string;
  description: string;
  status: string;
  max_influencers: number;
  banner?: string;
  created_at: string;
  updated_at: string;
}

export interface CampaignDetail extends Campaign {
  id: string;
  public_id?: string;
  workspace_id?: string;
  secondary_niches?: Array<{ id: number; name: string }>;
  payment_method_details?: {
    amount?: number;
    currency?: string;
    description?: string;
  };
  segment_min_followers?: number;
  segment_state?: string;
  segment_city?: string;
  segment_genders?: string[];
  image_rights_period?: number;
  rules_does?: string;
  rules_does_not?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateCampaignData {
  title: string;
  description: string;
  objective: string;
  secondary_niches: Array<{ id: number; name: string }>;
  max_influencers: number;
  payment_method: string;
  payment_method_details: {
    amount?: number;
    currency?: string;
    description?: string;
  };
  benefits?: string;
  rules_does: string;
  rules_does_not: string;
  segment_min_followers?: number;
  segment_state?: string;
  segment_city?: string;
  segment_genders?: string[];
  image_rights_period: number;
  banner?: string;
}

export interface UpdateCampaignData extends Partial<CreateCampaignData> {}

/**
 * Lista todas as campanhas do workspace
 */
export async function getCampaigns(): Promise<CampaignListItem[]> {
  const workspaceId = getWorkspaceId();
  if (!workspaceId) {
    throw new Error("Workspace ID é obrigatório. Por favor, selecione um workspace.");
  }

  // Garantir que workspaceId é uma string válida (UUID), não um número simples
  if (workspaceId === "1" || workspaceId === "0" || /^\d+$/.test(workspaceId)) {
    console.error("Workspace ID inválido detectado:", workspaceId);
    throw new Error("Workspace ID inválido. Por favor, selecione um workspace válido.");
  }

  const request = await fetch(getApiUrl("/campaigns"), {
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
    throw error || "Failed to get campaigns";
  }

  const response = await request.json();
  return response.data;
}

/**
 * Busca uma campanha específica por ID
 */
export async function getCampaign(campaignId: string): Promise<CampaignDetail> {
  const workspaceId = getWorkspaceId();
  if (!workspaceId) {
    throw new Error("Workspace ID é obrigatório");
  }

  const request = await fetch(getApiUrl(`/campaigns/${campaignId}`), {
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
    throw error || "Failed to get campaign";
  }

  const response = await request.json();
  return response.data;
}

/**
 * Cria uma nova campanha
 */
export async function createCampaign(
  data: CreateCampaignData
): Promise<CampaignDetail> {
  const workspaceId = getWorkspaceId();
  if (!workspaceId) {
    throw new Error("Workspace ID é obrigatório");
  }

  const request = await fetch(getApiUrl("/campaigns"), {
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
    throw error || "Failed to create campaign";
  }

  const response = await request.json();
  return response.data;
}

/**
 * Atualiza uma campanha existente
 */
export async function updateCampaign(
  campaignId: string,
  data: UpdateCampaignData
): Promise<void> {
  const workspaceId = getWorkspaceId();
  if (!workspaceId) {
    throw new Error("Workspace ID é obrigatório");
  }

  const request = await fetch(getApiUrl(`/campaigns/${campaignId}`), {
    method: "PUT",
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
    throw error || "Failed to update campaign";
  }
}

/**
 * Exclui uma campanha
 */
export async function deleteCampaign(campaignId: string): Promise<void> {
  const workspaceId = getWorkspaceId();
  if (!workspaceId) {
    throw new Error("Workspace ID é obrigatório");
  }

  const request = await fetch(getApiUrl(`/campaigns/${campaignId}`), {
    method: "DELETE",
    headers: {
      Accept: "application/json",
      "Client-Type": "backoffice",
      Authorization: `Bearer ${getAuthToken()}`,
      "Workspace-Id": workspaceId,
    },
  });

  if (!request.ok) {
    const error = await request.json();
    throw error || "Failed to delete campaign";
  }
}

