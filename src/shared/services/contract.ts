import { getApiUrl, getAuthToken, getWorkspaceId } from "@/lib/utils/api";
import type { CampaignContract } from "../types";

export interface SendContractTemplateData {
  influencer_id: string;
  template_id?: string;
  expires_at?: string; // ISO 8601 timestamp
}

export interface ContractTemplate {
  id: string;
  name: string;
  content: string;
  created_at: string;
  updated_at: string;
}

/**
 * Lista contratos de uma campanha
 */
export async function getCampaignContracts(
  campaignId: string,
  filters?: {
    status?: string;
    influencer_id?: string;
  }
): Promise<CampaignContract[]> {
  const workspaceId = getWorkspaceId();
  if (!workspaceId) {
    throw new Error("Workspace ID é obrigatório");
  }

  const params = new URLSearchParams();
  if (filters?.status) params.append("status", filters.status);
  if (filters?.influencer_id) params.append("influencer_id", filters.influencer_id);

  const url = `/campaigns/${campaignId}/contracts${
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
    throw error || "Failed to get campaign contracts";
  }

  const response = await request.json();
  return response.data;
}

/**
 * Envia template de contrato para um influenciador
 */
export async function sendContractTemplate(
  campaignId: string,
  data: SendContractTemplateData
): Promise<CampaignContract> {
  const workspaceId = getWorkspaceId();
  if (!workspaceId) {
    throw new Error("Workspace ID é obrigatório");
  }

  const request = await fetch(
    getApiUrl(`/campaigns/${campaignId}/contracts/send`),
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
        influencer_id: data.influencer_id,
        template_id: data.template_id,
        ...(data.expires_at && { expires_at: data.expires_at }),
      }),
    }
  );

  if (!request.ok) {
    const error = await request.json();
    throw error || "Failed to send contract template";
  }

  const response = await request.json();
  return response.data;
}

/**
 * Busca templates de contrato disponíveis
 */
export async function getContractTemplates(): Promise<ContractTemplate[]> {
  const workspaceId = getWorkspaceId();
  if (!workspaceId) {
    throw new Error("Workspace ID é obrigatório");
  }

  const request = await fetch(getApiUrl("/contracts/templates"), {
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
    throw error || "Failed to get contract templates";
  }

  const response = await request.json();
  return response.data || [];
}

/**
 * Busca status de um contrato específico
 */
export async function getContractStatus(
  campaignId: string,
  contractId: string
): Promise<CampaignContract> {
  const workspaceId = getWorkspaceId();
  if (!workspaceId) {
    throw new Error("Workspace ID é obrigatório");
  }

  const request = await fetch(
    getApiUrl(`/campaigns/${campaignId}/contracts/${contractId}`),
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
    throw error || "Failed to get contract status";
  }

  const response = await request.json();
  return response.data;
}

/**
 * Reenvia contrato para um influenciador
 */
export async function resendContract(
  campaignId: string,
  contractId: string
): Promise<void> {
  const workspaceId = getWorkspaceId();
  if (!workspaceId) {
    throw new Error("Workspace ID é obrigatório");
  }

  const request = await fetch(
    getApiUrl(`/campaigns/${campaignId}/contracts/${contractId}/resend`),
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
    throw error || "Failed to resend contract";
  }
}
