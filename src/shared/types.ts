export interface User {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  email_verified_at?: string;
  created_at: string;
  updated_at: string;
}

export interface Workspace {
  id: string; // public_id (UUID)
  name: string;
  photo?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Niche {
  id: number;
  parent_id: number | null;
  name: string;
}
export interface Campaign {
  id: string; // public_id (UUID)
  title: string;
  description: string;
  objective: string;
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

export interface SocialFormat {
  id: string;
  socialNetwork: string;
  contentType: string;
  quantity: string;
}

export interface CampaignPhase {
  id: string;
  objective: string;
  postDate: string;
  postTime?: string;
  formats: SocialFormat[];
  files: string;
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
}

export interface Influencer {
  id: string;
  name: string;
  username: string;
  avatar: string;
  followers: number;
  engagement: number;
  niche: string;
  status?: "applications" | "curation" | "invited" | "approved" | "pending_approval" | "in_correction" | "content_approved" | "published" | "rejected";
  phase?: string;
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
  content_type?: string;
  contentType: string;
  preview_url?: string;
  previewUrl: string;
  preview_urls?: string[]; // Array com todas as URLs de preview
  previewUrls?: string[]; // Alias para compatibilidade
  post_url?: string;
  postUrl: string;
  status: "pending" | "approved" | "adjustment_requested" | "rejected" | "published";
  phase_id?: string | null;
  submitted_at?: string;
  submittedAt: string;
  published_at?: string | null;
  publishedAt?: string;
  feedback?: string | null;
  ai_evaluation?: any | null;
}

export interface CampaignScript {
  id: string;
  campaign_id?: string;
  influencer_id?: string;
  influencerId: string;
  influencer_name?: string;
  influencerName: string;
  influencer_avatar?: string;
  influencerAvatar: string;
  script_text?: string;
  scriptText: string;
  status: "pending" | "approved" | "adjustment_requested" | "rejected";
  phase_id?: string | null;
  submitted_at?: string;
  submittedAt: string;
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