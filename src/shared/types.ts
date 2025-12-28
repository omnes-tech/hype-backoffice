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
  benefits?: string;
  rules_does?: string;
  rules_does_not?: string;
  segment_min_followers?: number;
  segment_state?: string;
  segment_city?: string;
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
  postTime: string;
  formats: SocialFormat[];
  files: string;
}

export interface CampaignFormData {
  title: string;
  description: string;
  subniches: string;
  influencersCount: string;
  minFollowers: string;
  state: string;
  city: string;
  gender: string;
  paymentType: string;
  benefits: string;
  generalObjective: string;
  whatToDo: string;
  whatNotToDo: string;
  banner: string;
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
  status?: "selected" | "invited" | "active" | "published" | "curation" | "rejected";
  phase?: string;
}

export interface CampaignContent {
  id: string;
  influencerId: string;
  influencerName: string;
  influencerAvatar: string;
  socialNetwork: string;
  contentType: string;
  previewUrl: string;
  postUrl: string;
  status: "pending" | "approved" | "rejected" | "published";
  submittedAt: string;
  publishedAt?: string;
  feedback?: string;
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
  senderId: string;
  senderName: string;
  senderAvatar: string;
  message: string;
  timestamp: string;
  isFromInfluencer: boolean;
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