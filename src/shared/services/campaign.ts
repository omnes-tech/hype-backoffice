import { getApiUrl, getAuthToken, getWorkspaceId } from "@/lib/utils/api";
import type { CampaignPhaseUpsertPayload, CreatePhaseData } from "./phase";
import type { DashboardPhase } from "./dashboard";
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
  /** Quando presente no GET /campaigns/:id, substitui a necessidade de fases vindas só do /dashboard */
  phases?: DashboardPhase[];
  secondary_niches?: Array<{ id: number; name: string }>;
  payment_method_details?: {
    amount?: number;
    currency?: string;
    description?: string;
  };
  segment_min_followers?: number;
  segment_state?: string[];
  segment_city?: string[];
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
  secondary_niches: number[];
  max_influencers: number;
  payment_method: string;
  payment_method_details: {
    amount?: number;
    currency?: string;
    description?: string;
  };
  benefits?: string[]; // Array de itens
  rules_does: string[]; // Array de itens
  rules_does_not: string[]; // Array de itens
  segment_min_followers?: number;
  segment_state?: string[];
  segment_city?: string[];
  segment_genders?: string[];
  /** Obrigatório na API; inteiro ≥ 0 */
  image_rights_period: number;
  /**
   * Fases criadas na mesma transação da campanha (POST /backoffice/campaigns).
   * Omitir ou `[]` cria só a campanha; fases podem ser criadas depois via POST /campaigns/:id/phases.
   */
  phases?: CreatePhaseData[];
  banner?: string | null;
  // banner por upload: use uploadCampaignBanner após o create
}

/**
 * PUT `/campaigns/:id` — ver `api-backoffice-update-campaign.md`.
 * Campos opcionais omitidos preservam valor no servidor; `phases` omitido não altera fases.
 */
export interface UpdateCampaignData extends Partial<Omit<CreateCampaignData, "phases">> {
  phases?: CampaignPhaseUpsertPayload[];
  status?: string;
}

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
    let errorData;
    try {
      errorData = await request.json();
    } catch {
      errorData = { message: "Failed to get campaigns" };
    }
    throw errorData || "Failed to get campaigns";
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
    let errorData;
    try {
      errorData = await request.json();
    } catch {
      errorData = { message: "Failed to get campaign" };
    }
    throw errorData || "Failed to get campaign";
    }

  const response = await request.json();
  return response.data;
}

/**
 * Resposta 201: ou `{ data: campaign }` ou `{ data: { campaign, phases } }` quando `phases` veio no body.
 */
function parseCreateCampaignResponseBody(data: unknown): CampaignDetail {
  if (
    data &&
    typeof data === "object" &&
    "campaign" in data &&
    (data as { campaign: unknown }).campaign &&
    typeof (data as { campaign: unknown }).campaign === "object"
  ) {
    return (data as { campaign: CampaignDetail }).campaign;
  }
  return data as CampaignDetail;
}

/**
 * Cria uma nova campanha (draft). Opcionalmente envia `phases` no mesmo POST (uma transação no servidor).
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
    let errorData;
    try {
      errorData = await request.json();
    } catch {
      errorData = { message: "Failed to create campaign" };
    }
    throw errorData || "Failed to create campaign";
    }

  const response = await request.json();
  return parseCreateCampaignResponseBody(response.data);
}

/**
 * Faz upload do banner da campanha
 */
export async function uploadCampaignBanner(
  campaignId: string,
  banner: File
): Promise<void> {
  const workspaceId = getWorkspaceId();
  if (!workspaceId) {
    throw new Error("Workspace ID é obrigatório");
  }

  const formData = new FormData();
  formData.append("banner", banner);

  const request = await fetch(getApiUrl(`/campaigns/${campaignId}/banner`), {
    method: "POST",
    headers: {
      "Client-Type": "backoffice",
      Authorization: `Bearer ${getAuthToken()}`,
      "Workspace-Id": workspaceId,
    },
    body: formData,
  });

  if (!request.ok) {
    let errorData;
    try {
      errorData = await request.json();
    } catch {
      errorData = { message: "Failed to upload campaign banner" };
    }

    const error = new Error(
      errorData?.message || "Failed to upload campaign banner"
    ) as any;
    error.status = request.status;
    throw error;
  }
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
    let errorData;
    try {
      errorData = await request.json();
    } catch {
      errorData = { message: "Failed to update campaign" };
    }
    throw errorData || "Failed to update campaign";
  }
  /** Resposta documentada: 204 No Content (sem corpo). */
  if (request.status === 204) {
    return;
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
    let errorData;
    try {
      errorData = await request.json();
    } catch {
      errorData = { message: "Failed to delete campaign" };
    }
    throw errorData || "Failed to delete campaign";
    }
}

