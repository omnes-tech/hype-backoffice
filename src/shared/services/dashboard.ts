// import { getApiUrl, getAuthToken, getWorkspaceId } from "@/lib/utils/api";
import type { CampaignPhase, Influencer, CampaignContent } from "../types";

/**
 * Tipos retornados pela API do dashboard
 */
export interface DashboardPhase {
  id: string;
  order: number;
  objective: string;
  publish_date: string;
  publish_time: string;
  content_submission_deadline: string | null;
  correction_submission_deadline: string | null;
  contents: Array<{
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
  // TODO: Remover quando API estiver pronta
  // Usando mock temporariamente
  await new Promise((resolve) => setTimeout(resolve, 500));
  const { getMockDashboardDataForCampaign } = await import("../mocks/dashboard-mock");
  return getMockDashboardDataForCampaign(campaignId);

  // Código da API real (comentado temporariamente)
  /*
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
  */
}

/**
 * Transforma DashboardPhase para CampaignPhase (formato usado no frontend)
 */
export function transformDashboardPhase(phase: DashboardPhase): CampaignPhase {
  return {
    id: phase.id,
    objective: phase.objective,
    postDate: phase.publish_date,
    postTime: phase.publish_time,
    formats: phase.contents.flatMap((content) =>
      content.options.map((option) => ({
        id: `${content.type}-${option.type}-${option.quantity}`,
        socialNetwork: content.type,
        contentType: option.type,
        quantity: option.quantity.toString(),
      }))
    ),
    files: "", // Não vem na API do dashboard
  };
}

/**
 * Transforma DashboardInfluencer para Influencer (formato usado no frontend)
 */
export function transformDashboardInfluencer(
  influencer: DashboardInfluencer
): Influencer {
  return {
    id: influencer.id,
    name: influencer.name,
    username: influencer.username,
    avatar: influencer.avatar || "",
    followers: influencer.followers,
    engagement: influencer.engagement,
    niche: influencer.niche || "",
    status: influencer.status as Influencer["status"],
    phase: influencer.phase,
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

