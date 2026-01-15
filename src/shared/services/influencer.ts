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
 * Normaliza status de português para inglês
 * Garante que todos os status sejam sempre em inglês, usando os valores do enum do backend
 * Baseado em CampaignUserStatusEnum do backend
 */
function normalizeStatus(status: string | undefined): string {
  if (!status) return "applications";
  
  const statusMap: { [key: string]: string } = {
    // Valores corretos do enum do backend (mantém como está)
    applications: "applications",
    curation: "curation",
    invited: "invited",
    approved: "approved",
    pending_approval: "pending_approval",
    in_correction: "in_correction",
    content_approved: "content_approved",
    published: "published",
    rejected: "rejected",
    // Valores antigos do frontend (mapeia para valores corretos)
    inscriptions: "applications",
    approved_progress: "approved",
    awaiting_approval: "pending_approval",
    selected: "applications",
    active: "approved",
    // Status em português (converte para inglês usando valores do enum)
    inscricoes: "applications",
    aprovado: "approved",
    curadoria: "curation",
    recusado: "rejected",
    convidados: "invited",
    aprovados: "approved",
    rejeitados: "rejected",
    conteudo_submetido: "pending_approval",
    conteudo_aprovado: "content_approved",
    conteudo_rejeitado: "in_correction",
  };
  
  return statusMap[status.toLowerCase()] || status;
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
  // Normalizar status de todos os influenciadores para inglês
  return response.data.map((influencer: Influencer) => ({
    ...influencer,
    status: normalizeStatus(influencer.status),
  }));
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

/**
 * Aprova múltiplos influenciadores em massa
 */
export async function bulkApproveInfluencers(
  campaignId: string,
  influencerIds: string[],
  feedback?: string
): Promise<void> {
  const workspaceId = getWorkspaceId();
  if (!workspaceId) {
    throw new Error("Workspace ID é obrigatório");
  }

  const request = await fetch(
    getApiUrl(`/campaigns/${campaignId}/influencers/bulk-approve`),
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
        influencer_ids: influencerIds,
        feedback,
      }),
    }
  );

  if (!request.ok) {
    const error = await request.json();
    throw error || "Failed to bulk approve influencers";
  }
}

/**
 * Reprova múltiplos influenciadores em massa
 */
export async function bulkRejectInfluencers(
  campaignId: string,
  influencerIds: string[],
  feedback: string
): Promise<void> {
  const workspaceId = getWorkspaceId();
  if (!workspaceId) {
    throw new Error("Workspace ID é obrigatório");
  }

  const request = await fetch(
    getApiUrl(`/campaigns/${campaignId}/influencers/bulk-reject`),
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
        influencer_ids: influencerIds,
        feedback,
      }),
    }
  );

  if (!request.ok) {
    const error = await request.json();
    throw error || "Failed to bulk reject influencers";
  }
}

