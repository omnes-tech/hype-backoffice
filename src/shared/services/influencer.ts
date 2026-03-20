import { getApiUrl, getAuthToken, getWorkspaceId } from "@/lib/utils/api";
import type { Influencer } from "../types";

/** Métricas por rede (ex.: instagram, tiktok, youtube) */
export interface MetricsByNetwork {
  gender_split?: { women_percent?: number; men_percent?: number };
  followers?: number;
  likes?: number;
  average_reach?: number;
  engagement_percent?: number;
}

/** Item de top conteúdos */
export interface TopContentItem {
  id: string;
  image_url?: string | null;
  views?: number;
  likes?: number;
  post_url?: string | null;
}

/** Campanha do influenciador no Hypeapp */
export interface HypeappCampaignItem {
  id: string;
  logo_url?: string | null;
  campaign_name?: string | null;
  brand_name?: string | null;
  date?: string | null;
  rating?: number | null;
  description?: string | null;
  delivery_thumbnails?: string[];
  views?: number;
  likes?: number;
}

/** Resposta do GET /campaigns/:campaignId/influencer/:influencerId (perfil do influenciador na campanha) */
export interface CampaignInfluencerProfileResponse {
  campaign: {
    id: string;
    title: string;
  };
  influencer: {
    id: string;
    name: string;
    username: string;
    avatar: string | null;
    followers: number;
    engagement: number;
    niche?: string;
    niche_name: string | null;
    sub_niche_names?: string[];
    status?: string;
    phase?: string;
    social_networks?: Array<{
      id: number | string;
      type: string;
      name: string;
      username?: string;
      members?: number;
      status?: string;
    }>;
    location?: { state?: string; city?: string };
    bio?: string | null;
    rating?: number | null;
    rating_max?: number;
  };
  metrics_by_network?: Record<string, MetricsByNetwork>;
  total_posts_in_hypeapp?: number;
  campaigns_participated_in_hypeapp?: number;
  trust_index?: number | null;
  top_contents?: TopContentItem[];
  hypeapp_campaigns?: HypeappCampaignItem[];
}

/**
 * Busca dados do perfil do influenciador no contexto da campanha.
 * GET /campaigns/:campaignId/influencer/:influencerId
 * influencerId = id do campaign_user (mesmo da lista do dashboard).
 * Retorna 404 se campanha ou influenciador não existirem.
 */
export async function getCampaignInfluencerProfile(
  campaignId: string,
  influencerId: string
): Promise<CampaignInfluencerProfileResponse> {
  const workspaceId = getWorkspaceId();
  if (!workspaceId) {
    throw new Error("Workspace ID é obrigatório");
  }

  const request = await fetch(
    getApiUrl(`/campaigns/${campaignId}/influencer/${influencerId}`),
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
    if (request.status === 404) {
      const error = new Error("Influenciador ou campanha não encontrados") as any;
      error.status = 404;
      throw error;
    }
    let errorData;
    try {
      errorData = await request.json();
    } catch {
      errorData = { message: "Failed to get influencer profile" };
    }
    const error = new Error(
      errorData?.message || "Failed to get influencer profile"
    ) as any;
    error.status = request.status;
    throw error;
  }

  const response = await request.json();
  return response.data;
}

export interface InfluencerStatusUpdate {
  influencer_id: string;
  status: string;
  feedback?: string;
  network_id?: number | string;
}

export interface InfluencerProfile {
  id: string;
  type: string; // "tiktok", "youtube", "instagram", etc.
  type_label: string; // "TikTok", "YouTube", "Instagram", etc.
  name: string;
  username: string;
  members: number; // Número de seguidores/membros
  created_at?: string;
  /** Foto do perfil na rede (path de upload ou URL) */
  avatar?: string | null;
  /** Engajamento % nesta rede social */
  engagement_percent?: number | null;
  /** Quando a API lista todos os perfis, indica se pode ser convidado nesta campanha */
  can_invite?: boolean;
}

function numOrUndef(v: unknown): number | undefined {
  if (v == null || v === "") return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

function firstString(...vals: unknown[]): string | undefined {
  for (const v of vals) {
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return undefined;
}

/** Normaliza item da API (camelCase ou snake_case) */
function normalizeInfluencerProfile(raw: unknown): InfluencerProfile {
  const p = raw as Record<string, unknown>;
  const engagement =
    numOrUndef(p.engagement_percent) ??
    numOrUndef(p.engagement_rate) ??
    numOrUndef(p.engagement);
  const inviteFalse =
    p.can_invite === false ||
    p.invite_eligible === false ||
    p.eligible_for_invite === false;
  const inviteTrue =
    p.can_invite === true ||
    p.invite_eligible === true ||
    p.eligible_for_invite === true;

  return {
    id: String(p.id ?? ""),
    type: String(p.type ?? ""),
    type_label: String(p.type_label ?? p.type ?? ""),
    name: String(p.name ?? ""),
    username: String(p.username ?? p.handle ?? p.user_name ?? ""),
    members:
      numOrUndef(p.members) ??
      numOrUndef(p.followers) ??
      numOrUndef(p.followers_count) ??
      0,
    created_at: p.created_at != null ? String(p.created_at) : undefined,
    avatar:
      firstString(
        p.avatar,
        p.photo,
        p.picture,
        p.image_url,
        p.profile_picture,
        p.profile_image_url,
        p.thumbnail_url,
        p.thumbnail
      ) ?? null,
    engagement_percent:
      engagement != null ? engagement : null,
    can_invite: inviteFalse ? false : inviteTrue ? true : undefined,
  };
}

export interface InfluencerInviteData {
  influencer_id: string;
  message?: string;
  profile_ids?: string[]; // IDs dos perfis selecionados
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
    getApiUrl(`/campaigns/${campaignId}/users/${data.influencer_id}/status`),
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
        network_id: data.network_id,
      }),
    }
  );

  if (!request.ok) {
    const error = await request.json();
    throw error || "Failed to update influencer status";
  }
}

/**
 * Busca os perfis (contas sociais) de um influenciador
 */
export async function getInfluencerProfiles(
  influencerId: string
): Promise<InfluencerProfile[]> {
  const workspaceId = getWorkspaceId();
  if (!workspaceId) {
    throw new Error("Workspace ID é obrigatório");
  }

  const request = await fetch(
    getApiUrl(`/influencers/${influencerId}/profiles`),
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
    throw error || "Failed to get influencer profiles";
  }

  const response = await request.json();
  const profiles = response.data?.profiles;

  if (!profiles) {
    return [];
  }

  if (!Array.isArray(profiles)) {
    console.warn("getInfluencerProfiles: profiles não é um array", profiles);
    return [];
  }

  return profiles.map((item) => normalizeInfluencerProfile(item));
}

function extractProfilesFromCampaignInfluencerResponse(response: {
  data?: unknown;
}): unknown[] {
  const d = response.data;
  if (Array.isArray(d)) return d;
  if (d && typeof d === "object") {
    const o = d as Record<string, unknown>;
    if (Array.isArray(o.profiles)) return o.profiles;
    if (Array.isArray(o.invitable_profiles)) return o.invitable_profiles;
    if (Array.isArray(o.invite_profiles)) return o.invite_profiles;
  }
  return [];
}

/**
 * Perfis do influenciador que podem ser convidados nesta campanha (regras da campanha / vínculos).
 * GET /campaigns/:campaignId/influencers/:influencerId/invite-profiles
 */
export async function getCampaignInfluencerInvitableProfiles(
  campaignId: string,
  influencerId: string
): Promise<InfluencerProfile[]> {
  const workspaceId = getWorkspaceId();
  if (!workspaceId) {
    throw new Error("Workspace ID é obrigatório");
  }

  const request = await fetch(
    getApiUrl(
      `/campaigns/${campaignId}/influencers/${influencerId}/invite-profiles`
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

  if (request.status === 404) {
    const all = await getInfluencerProfiles(influencerId);
    const anyInviteFlag = all.some((p) => p.can_invite !== undefined);
    return anyInviteFlag ? all.filter((p) => p.can_invite !== false) : all;
  }

  if (!request.ok) {
    const error = await request.json().catch(() => ({}));
    throw error || "Failed to get invitable influencer profiles";
  }

  const response = await request.json();
  const raw = extractProfilesFromCampaignInfluencerResponse(response);
  const mapped = raw.map((item) => normalizeInfluencerProfile(item));
  return mapped.filter((profile) => profile.can_invite !== false);
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
 * Move um influenciador para pré-seleção (POST backoffice/campaigns/:campaignId/users/pre-selection).
 * Body igual ao convite: InviteInfluencerDto (influencer_id obrigatório; network_id/social_network_id/profile_ids e message opcionais).
 */
export async function addToPreSelection(
  campaignId: string,
  data: InfluencerInviteData
): Promise<void> {
  const workspaceId = getWorkspaceId();
  if (!workspaceId) {
    throw new Error("Workspace ID é obrigatório");
  }

  const request = await fetch(
    getApiUrl(`/campaigns/${campaignId}/users/pre-selection`),
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
    throw error || "Failed to add influencer to pre-selection";
  }
}

/** Body para mover da pré-seleção para curadoria da pré-seleção (MoveToCurationDto) */
export interface MoveToPreSelectionCurationData {
  network_id?: number;
  notes?: string;
}

/**
 * Move um influenciador da pré-seleção para curadoria da pré-seleção.
 * POST .../campaigns/:campaignId/users/:influencerId/pre-selection-curation
 */
export async function moveToPreSelectionCuration(
  campaignId: string,
  influencerId: string,
  data: MoveToPreSelectionCurationData = {}
): Promise<void> {
  const workspaceId = getWorkspaceId();
  if (!workspaceId) {
    throw new Error("Workspace ID é obrigatório");
  }

  const request = await fetch(
    getApiUrl(`/campaigns/${campaignId}/users/${influencerId}/pre-selection-curation`),
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
    throw error || "Failed to move to pre-selection curation";
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
  feedback?: string,
  network_id?: number | string
): Promise<void> {
  const workspaceId = getWorkspaceId();
  if (!workspaceId) {
    throw new Error("Workspace ID é obrigatório");
  }

  const request = await fetch(
    getApiUrl(`/campaigns/${campaignId}/users/bulk-approve`),
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
        network_id,
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
  feedback: string,
  network_id?: number | string
): Promise<void> {
  const workspaceId = getWorkspaceId();
  if (!workspaceId) {
    throw new Error("Workspace ID é obrigatório");
  }

  const request = await fetch(
    getApiUrl(`/campaigns/${campaignId}/users/bulk-reject`),
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
        network_id,
      }),
    }
  );

  if (!request.ok) {
    const error = await request.json();
    throw error || "Failed to bulk reject influencers";
  }
}

