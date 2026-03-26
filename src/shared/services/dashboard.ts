import { getApiUrl, getAuthToken, getWorkspaceId } from "@/lib/utils/api";
import type { CampaignPhase, Influencer, CampaignContent } from "../types";

/**
 * Tipos retornados pela API do dashboard
 */
export interface DashboardPhase {
  id: string;
  order: number;
  objective: string;
  publish_date: string;
  /** Pode vir ausente na API; o front usa 18:00 como padrão */
  publish_time?: string | null;
  content_submission_deadline?: string | null;
  correction_submission_deadline?: string | null;
  hashtag?: string | null;
  contents?: Array<{
    type: string;
    options: Array<{
      type: string;
      quantity: number;
    }>;
  }>;
  created_at: string;
  updated_at: string;
}

export interface DashboardInfluencer {
  id: string;
  name: string;
  username: string;
  avatar: string | null;
  followers: number;
  engagement: number;
  niche: string | undefined;
  social_network: string | undefined;
  social_networks?: Array<{
    id: number | string;
    type: string;
    name: string;
    username?: string;
    members?: number;
    status?: string;
  }>;
  status: string;
  phase: string | undefined;
}

export interface DashboardContent {
  id: string;
  campaign_id: string;
  influencer_id: string;
  influencer_name: string;
  influencer_avatar: string | null;
  social_network: string | null;
  content_type: string;
  preview_url: string | null;
  post_url: string | null;
  status: string;
  phase_id: string | null;
  submitted_at: string;
  published_at: string | null;
  feedback: string | null;
  ai_evaluation: any | null;
}

export interface DashboardMetrics {
  reach: number;
  engagement: number;
  published_content: number;
  active_influencers: number;
}

export interface DashboardResponse {
  phases: DashboardPhase[];
  influencers: DashboardInfluencer[];
  contents: DashboardContent[];
  metrics: DashboardMetrics;
}

/**
 * Busca todos os dados da campanha em uma única chamada
 */
export async function getCampaignDashboard(
  campaignId: string
): Promise<DashboardResponse> {
  const workspaceId = getWorkspaceId();
  if (!workspaceId) {
    throw new Error("Workspace ID é obrigatório");
  }

  const request = await fetch(
    getApiUrl(`/campaigns/${campaignId}/dashboard`),
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
      errorData = { message: "Failed to get campaign dashboard" };
    }

    const error = new Error(
      errorData?.message || "Failed to get campaign dashboard"
    ) as any;
    error.status = request.status;
    throw error;
  }

  const response = await request.json();
  return response.data;
}

/**
 * Transforma DashboardPhase para CampaignPhase (formato usado no frontend)
 */
export function transformDashboardPhase(phase: DashboardPhase): CampaignPhase {
  const publishTimeRaw =
    phase.publish_time != null ? String(phase.publish_time).trim() : "";
  const postTime = publishTimeRaw !== "" ? publishTimeRaw : "18:00";
  const hashtag =
    phase.hashtag != null && String(phase.hashtag).trim() !== ""
      ? String(phase.hashtag).trim()
      : undefined;

  return {
    id: phase.id,
    order: phase.order,
    createdAt: phase.created_at,
    objective: phase.objective,
    postDate: phase.publish_date ?? "",
    postTime,
    contentSubmissionDeadline:
      phase.content_submission_deadline?.trim() || undefined,
    correctionSubmissionDeadline:
      phase.correction_submission_deadline?.trim() || undefined,
    hashtag,
    formats: (phase.contents ?? []).flatMap((content) =>
      (content.options ?? []).map((option, idx) => ({
        id: `${content.type}-${option.type}-${option.quantity}-${idx}`,
        socialNetwork: content.type,
        contentType: option.type,
        quantity: String(option.quantity ?? 1),
      }))
    ),
    files: "", // Não vem na API do dashboard
  };
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
 * Transforma DashboardInfluencer para Influencer (formato usado no frontend)
 */
export function transformDashboardInfluencer(
  influencer: DashboardInfluencer
): Influencer {
  // Garantir que o status seja preservado em cada perfil e normalizado
  const social_networks: Influencer["social_networks"] = influencer.social_networks?.map((network) => ({
    id: network.id,
    type: network.type,
    name: network.name,
    username: network.username,
    members: network.members,
    status: network.status ? (normalizeStatus(network.status) as "applications" | "curation" | "invited" | "contract_pending" | "approved" | "script_pending" | "content_pending" | "pending_approval" | "in_correction" | "content_approved" | "payment_pending" | "published" | "rejected" | undefined) : undefined,
  }));
  
  return {
    id: influencer.id,
    name: influencer.name,
    username: influencer.username,
    avatar: influencer.avatar || "",
    followers: influencer.followers,
    engagement: influencer.engagement,
    niche: influencer.niche || "",
    status: normalizeStatus(influencer.status) as Influencer["status"],
    phase: influencer.phase,
    social_networks,
  };
}

/**
 * Transforma DashboardContent para CampaignContent (formato usado no frontend)
 */
export function transformDashboardContent(
  content: DashboardContent
): CampaignContent {
  return {
    id: content.id,
    influencerId: content.influencer_id,
    influencerName: content.influencer_name,
    influencerAvatar: content.influencer_avatar || "",
    socialNetwork: content.social_network || "",
    contentType: content.content_type,
    previewUrl: content.preview_url || "",
    postUrl: content.post_url || "",
    status: content.status as CampaignContent["status"],
    submittedAt: content.submitted_at,
    publishedAt: content.published_at || undefined,
    feedback: content.feedback || undefined,
  };
}

