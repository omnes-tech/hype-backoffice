export interface User {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  email_verified_at?: string;
  created_at: string;
  updated_at: string;
  /** Foto de perfil (path relativo ou URL) — `avatar`, `photo` na API. */
  avatar?: string | null;
}

/** Papéis em `GET /backoffice/me/workspaces` — @see API_BACKOFFICE_WORKSPACES_AND_PERMISSIONS.md */
export type WorkspaceRole =
  | "owner"
  | "admin"
  | "member"
  | "aprovador"
  | "observador"
  | "juridico"
  | "financeiro"
  | "analista";

/** Permissões calculadas no servidor por workspace (UX; mutações ainda validam 403). */
export interface WorkspacePermissions {
  // Workspace
  workspace_read: boolean;
  workspace_settings_write: boolean;
  workspace_delete: boolean;
  workspace_photo_write: boolean;
  // Membros
  members_list: boolean;
  members_invite: boolean;
  members_remove: boolean;
  members_remove_only_member_role: boolean;
  members_role_write: boolean;
  // Campanhas
  campaigns_read: boolean;
  campaigns_create: boolean;
  campaigns_write: boolean;
  campaigns_delete: boolean;
  campaigns_publish: boolean;
  // Influenciadores
  influencers_read: boolean;
  influencers_invite: boolean;
  influencers_approve: boolean;
  influencers_reject: boolean;
  // Roteiros
  scripts_read: boolean;
  scripts_write: boolean;
  scripts_approve: boolean;
  scripts_reject: boolean;
  // Conteúdo
  content_read: boolean;
  content_write: boolean;
  content_approve: boolean;
  content_reject: boolean;
  // Contratos
  contracts_read: boolean;
  contracts_write: boolean;
  // Financeiro
  financial_read: boolean;
  financial_balance_add: boolean;
  financial_payments_approve: boolean;
  financial_reports_export: boolean;
  /** @deprecated use influencers_read */
  catalog_read: boolean;
  catalog_write: boolean;
  /** @deprecated use financial_read */
  billing_read: boolean;
  billing_write: boolean;
}

export interface Workspace {
  id: string; // public_id (UUID)
  name: string;
  photo?: string;
  description?: string | null;
  niche_id?: number | null;
  // Company / legal data
  legal_name?: string | null;
  tax_id?: string | null;
  postal_code?: string | null;
  street?: string | null;
  street_number?: string | null;
  unit?: string | null;
  neighborhood?: string | null;
  city?: string | null;
  state?: string | null;
  created_at?: string;
  updated_at?: string;
  role?: WorkspaceRole;
  membership_id?: number;
  joined_at?: string;
  permissions?: WorkspacePermissions;
}

/** Membro do workspace — `GET /backoffice/workspaces/:id/members`. */
export interface WorkspaceMember {
  user_id: number;
  name: string;
  email: string;
  role: WorkspaceRole;
  created_at: string;
  /** Permissões customizadas do membro — array de strings retornado pela API. */
  permissions?: string[];
}

export interface Niche {
  /** Inteiro ou string (ex.: UUID), conforme a API. */
  id: number | string;
  parent_id: number | string | null;
  name: string;
}
export interface Campaign {
  id: string; // public_id (UUID)
  title: string;
  description: string;
  objective: string;
  primary_niche?: { id: number; name: string };
  secondary_niches?: Array<{ id: number; name: string }> | number[];
  max_influencers: number;
  payment_method: string;
  payment_method_details?: {
    amount?: number;
    currency?: string;
    description?: string;
  };
  benefits?: string | string[]; // Aceita string (compatibilidade) ou array de strings
  rules_does?: string | string[]; // Aceita string (compatibilidade) ou array de strings
  rules_does_not?: string | string[]; // Aceita string (compatibilidade) ou array de strings
  segment_min_followers?: number;
  segment_state?: string[];
  segment_city?: string[];
  segment_genders?: string[];
  image_rights_period?: number;
  status?: "draft" | "published" | "active" | "completed" | "cancelled";
  banner?: string;
  created_at?: string;
  updated_at?: string;
  // Campos legados para compatibilidade
  niche_id?: number;
  payment_method_label?: string;
  payment_value?: PaymentValue;
  segments?: Segments;
  rules?: Rules;
  benefits_bonus?: string;
}

export interface PaymentValue {
  amount: number;
  currency: string;
  description: string;
}

export interface Segments {
  min_followers: number;
  location: string;
  gender: string;
  social_network: string[];
}

export interface Rules {
  do: string[];
  do_not: string[];
}

export interface Link {
  url?: string;
  label: string;
  page?: number;
  active: boolean;
}

export interface Links {
  first: string;
  last: string;
  prev: any;
  next: string;
}

export interface Meta {
  current_page: number;
  from: number;
  last_page: number;
  links: Link[];
  path: string;
  per_page: number;
  to: number;
  total: number;
}

export interface CampaignProductDraft {
  /** ID gerado no cliente para controle da lista */
  id: string;
  name: string;
  description?: string;
  /** Valor de mercado formatado em BRL (ex: "1.500,00") — convertido p/ centavos no envio */
  market_value?: string;
  weight_grams?: string;
  width_cm?: string;
  height_cm?: string;
  length_cm?: string;
  brand?: string;
  sku?: string;
  notes?: string;
}

export interface SocialFormat {
  id: string;
  socialNetwork: string;
  contentType: string;
  quantity: string;
  /** Preço do formato (BRL formatado, ex: "1.500,00") — obrigatório quando paymentType === "fixed" */
  price?: string;
}

export interface CampaignPhase {
  id: string;
  objective: string;
  postDate: string;
  postTime?: string;
  /** Prazo para envio de conteúdo (YYYY-MM-DD, dashboard / API) */
  contentSubmissionDeadline?: string;
  /** Prazo para correção (YYYY-MM-DD) */
  correctionSubmissionDeadline?: string;
  /** Hashtag da fase (opcional) */
  hashtag?: string;
  /** Sim: incluir direitos (padrão); Não: não incluir */
  includeImageRights?: boolean;
  /** Meses — quando includeImageRights é Sim */
  imageRightsPeriod?: string;
  formats: SocialFormat[];
  files: string;
  /** Ordem da fase (dashboard API) */
  order?: number;
  /** ISO — data de criação da fase (dashboard API) */
  createdAt?: string;
}

export interface CampaignFormData {
  title: string;
  description: string;
  mainNiche: string;
  subniches: string;
  influencersCount: string;
  minFollowers: string;
  state: string;
  city: string;
  gender: string;
  paymentType: string;
  // Campos específicos de pagamento
  paymentFixedAmount: string; // Valor fixo por influenciador
  paymentSwapItem: string; // Item oferecido (Permuta)
  paymentSwapMarketValue: string; // Valor de mercado (Permuta)
  paymentCpaActions: string; // Quais ações geram CPA
  paymentCpaValue: string; // Valor do CPA
  paymentCpmValue: string; // Valor do CPM
  benefitsBonus?: string; // Descrição do bônus por performance (quando toggle ativo)
  benefits: string | string[]; // Aceita string (compatibilidade) ou array de strings
  generalObjective: string;
  whatToDo: string | string[]; // Aceita string (compatibilidade) ou array de strings
  whatNotToDo: string | string[]; // Aceita string (compatibilidade) ou array de strings
  banner: string;
  bannerFile?: File; // Arquivo original do banner para upload
  imageRightsPeriod: string;
  brandFiles: string;
  phasesCount: string;
  phases: CampaignPhase[];
  /** Revisão: campanha pública ou privada */
  campaignVisibility?: "public" | "private";
  /** Produtos da campanha — preenchido quando paymentType === "swap" */
  products?: CampaignProductDraft[];
  /** Nome do nicho primário (API `primary_niche`) para exibição no dashboard */
  primaryNicheName?: string;
  /** Nomes dos nichos raízes vindos da API para exibição no dashboard. */
  nicheNames?: string[];
  /** Nomes dos subnichos (filhos) vindos da API para exibição no dashboard. */
  subNicheNames?: string[];
}

export interface Influencer {
  id: string;
  name: string;
  username: string;
  avatar: string;
  followers: number;
  engagement: number;
  niche: string;
  /** Nome legível quando a API envia além do id (ex.: niche_name). */
  nicheName?: string;
  status?:
    | "applications"
    | "pre_selection"
    | "pre_selection_curation"
    | "curation"
    | "invited"
    | "contract_pending"
    | "approved"
    | "awaiting_shipment"
    | "awaiting_receipt"
    | "script_pending"
    | "content_pending"
    | "pending_approval"
    | "in_correction"
    | "content_approved"
    | "payment_pending"
    | "published"
    | "rejected";
  phase?: string;
  /** campaign_users.id — quando a lista de inscrições vem da API enriquecida */
  campaign_user_id?: string;
  updated_at?: string;
  is_external?: boolean;
  // Perfis de rede social que se inscreveram na campanha (vem direto da API)
  social_networks?: Array<{
    id: number | string;
    type: string;
    name: string;
    username?: string;
    members?: number;
    /** Foto do perfil na rede (URL/path da API) */
    photo?: string | null;
    status?: Influencer["status"];
  }>;
}

export interface CampaignContent {
  id: string;
  campaign_id?: string;
  influencer_id?: string;
  influencerId: string;
  influencer_name?: string;
  influencerName: string;
  influencer_avatar?: string;
  influencerAvatar: string;
  social_network?: string;
  socialNetwork: string;
  social_network_type?: string;
  social_network_obj?: {
    id: string;
    type: string;
    name: string;
    username?: string;
  };
  content_type?: string;
  contentType: string;
  content_format?: {
    social_network: string;
    formats: Array<{
      type: string;
      quantity: number;
    }>;
  };
  content_format_type?: string | null;
  preview_url?: string;
  previewUrl: string;
  preview_urls?: string[]; // Array com todas as URLs de preview
  previewUrls?: string[]; // Alias para compatibilidade
  post_url?: string;
  postUrl: string;
  status: "pending" | "awaiting_approval" | "approved" | "content_approved" | "correction" | "rejected" | "published";
  phase?: {
    id: string;
    order: number;
    objective: string;
    publish_date: string;
    publish_time?: string;
    content_submission_deadline?: string;
    correction_submission_deadline?: string;
  };
  phase_id?: string | null;
  submitted_at?: string;
  submittedAt: string;
  published_at?: string | null;
  publishedAt?: string;
  feedback?: string | null;
  // Legenda enviada pelo influenciador (compatível com diferentes formatos da API)
  caption?: string | null;
  caption_feedback?: string | null;
  metadata?: {
    content_format_type?: string;
  } | null;
  ai_evaluation?: any | null;
}

export interface CampaignScript {
  id: string;
  campaign_id?: string;
  influencer_id?: string;
  influencerId?: string;
  influencer_name?: string;
  influencerName?: string;
  influencer_avatar?: string;
  influencerAvatar?: string;
  social_network?: string;
  social_network_type?: string;
  social_network_obj?: {
    id: string;
    type: string;
    name: string;
  };
  content_format?: {
    social_network: string;
    formats: Array<{
      type: string;
      quantity: number;
    }>;
  } | Array<{
    social_network: string;
    formats: Array<{
      type: string;
      quantity: number;
    }>;
  }>;
  content_format_type?: string | null;
  metadata?: {
    content_format_type?: string;
  } | null;
  phase?: {
    id: string;
    order: number;
    objective: string;
    publish_date: string;
    publish_time?: string;
  };
  script?: string;
  script_text?: string;
  scriptText?: string;
  file_url?: string;
  status: "pending" | "awaiting_approval" | "approved" | "correction" | "rejected";
  phase_id?: string | null;
  submitted_at?: string;
  submittedAt?: string;
  approved_at?: string;
  feedback?: string | null;
}

/** Formato bruto retornado pela API para `social_network` — pode ser string ou objeto. */
type RawSocialNetwork =
  | string
  | { id?: string; type: string; name?: string; username?: string }
  | undefined
  | null;

/**
 * Resposta bruta da API para conteúdos antes da normalização.
 * `social_network` chega como string ou objeto dependendo do endpoint.
 */
export interface RawCampaignContentResponse {
  id: string;
  campaign_id?: string;
  influencer_id?: string;
  influencerId?: string;
  influencer_name?: string;
  influencerName?: string;
  influencer_avatar?: string;
  influencerAvatar?: string;
  social_network?: RawSocialNetwork;
  socialNetwork?: string;
  social_network_type?: string;
  content_type?: string;
  contentType?: string;
  content_format?: CampaignContent["content_format"];
  content_format_type?: string | null;
  preview_url?: string;
  previewUrl?: string;
  preview_urls?: string[];
  previewUrls?: string[];
  post_url?: string;
  postUrl?: string;
  status: CampaignContent["status"];
  phase?: CampaignContent["phase"];
  phase_id?: string | null;
  phaseId?: string;
  submitted_at?: string;
  submittedAt?: string;
  published_at?: string | null;
  publishedAt?: string;
  feedback?: string | null;
  caption?: string | null;
  caption_feedback?: string | null;
  metadata?: { content_format_type?: string } | null;
  ai_evaluation?: unknown | null;
}

/**
 * Resposta bruta da API para roteiros antes da normalização.
 * `social_network` chega como string ou objeto dependendo do endpoint.
 */
export interface RawCampaignScriptResponse {
  id: string;
  campaign_id?: string;
  influencer_id?: string;
  influencer_name?: string;
  influencer_avatar?: string;
  social_network?: RawSocialNetwork;
  social_network_type?: string;
  content_format?: CampaignScript["content_format"];
  content_format_type?: string | null;
  metadata?: { content_format_type?: string } | null;
  phase?: CampaignScript["phase"];
  script?: string;
  file_url?: string;
  status: CampaignScript["status"];
  phase_id?: string | null;
  submitted_at?: string;
  approved_at?: string;
  feedback?: string | null;
}

export interface ContentMetrics {
  contentId: string;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  engagement: number;
  reach: number;
}

export interface InfluencerList {
  id: string;
  name: string;
  createdAt: string;
  influencerIds: string[];
}

export interface ChatMessage {
  id: string;
  campaign_id: string;
  campaign_user_id?: number; // ID do campaign_users (apenas em WebSocket)
  influencer_id?: string; // ID do influenciador (apenas em REST API)
  sender_id: string; // ID do usuário remetente
  sender_name: string; // Nome do remetente
  sender_avatar: string | null; // URL do avatar ou null
  message: string; // Texto da mensagem
  attachments: string[]; // Array de URLs de arquivos anexados
  read_at: string | null; // ISO 8601 timestamp quando foi lida, ou null
  created_at: string; // ISO 8601 timestamp de criação
  // Campos legados para compatibilidade
  senderId?: string;
  senderName?: string;
  senderAvatar?: string;
  timestamp?: string;
  isFromInfluencer?: boolean;
}

export interface AIEvaluation {
  score: number;
  feedback: string;
  compliance: {
    mentionsBrand: boolean;
    usesHashtag: boolean;
    showsProduct: boolean;
    followsGuidelines: boolean;
  };
  suggestions: string[];
}

export interface InfluencerEvaluation {
  influencerId: string;
  rating: number;
  feedback: string;
  performance: "excellent" | "good" | "average" | "poor";
  wouldWorkAgain: boolean;
}

export interface IdentifiedPost {
  id: string;
  influencerId: string;
  influencerName: string;
  influencerAvatar: string;
  socialNetwork: string;
  contentType: string;
  postUrl: string;
  previewUrl: string;
  phaseId: string;
  phaseHashtag: string;
  publishedAt: string;
  metrics?: ContentMetrics;
}

export interface CampaignContract {
  id: string;
  campaign_id: string;
  influencer_id: string;
  influencerId: string;
  influencer_name?: string;
  influencerName: string;
  influencer_avatar?: string;
  influencerAvatar: string;
  template_id?: string;
  templateId?: string;
  contract_url?: string;
  contractUrl?: string;
  status: "pending" | "sent" | "viewed" | "signed" | "rejected" | "expired";
  sent_at?: string;
  sentAt?: string;
  viewed_at?: string;
  viewedAt?: string;
  signed_at?: string;
  signedAt?: string;
  expires_at?: string;
  expiresAt?: string;
  rejection_reason?: string;
  rejectionReason?: string;
}