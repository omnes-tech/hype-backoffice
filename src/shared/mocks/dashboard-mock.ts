import type {
  DashboardResponse,
  DashboardPhase,
  DashboardInfluencer,
  DashboardContent,
  DashboardMetrics,
} from "../services/dashboard";

/**
 * Dados mock completos para o dashboard da campanha
 * Inclui influenciadores em todos os status possíveis, fases, conteúdos e métricas
 */

const MOCK_CAMPAIGN_ID = "e0c7d2b8-4e86-49a2-ae89-ba14eac9d067";
const MOCK_PHASE_1_ID = "550e8400-e29b-41d4-a716-446655440000";
const MOCK_PHASE_2_ID = "550e8400-e29b-41d4-a716-446655440001";
const MOCK_PHASE_3_ID = "550e8400-e29b-41d4-a716-446655440002";

/**
 * Fases mock da campanha
 */
const mockPhases: DashboardPhase[] = [
  {
    id: MOCK_PHASE_1_ID,
    order: 1,
    objective: "awareness",
    publish_date: "2024-02-15",
    publish_time: "10:00:00",
    content_submission_deadline: "2024-02-10",
    correction_submission_deadline: "2024-02-12",
    contents: [
      {
        type: "instagram",
        options: [
          { type: "post", quantity: 2 },
          { type: "story", quantity: 3 },
        ],
      },
    ],
    created_at: "2024-01-01T00:00:00.000Z",
    updated_at: "2024-01-01T00:00:00.000Z",
  },
  {
    id: MOCK_PHASE_2_ID,
    order: 2,
    objective: "engagement",
    publish_date: "2024-02-22",
    publish_time: "14:00:00",
    content_submission_deadline: "2024-02-17",
    correction_submission_deadline: "2024-02-19",
    contents: [
      {
        type: "instagram",
        options: [{ type: "reel", quantity: 1 }],
      },
      {
        type: "tiktok",
        options: [{ type: "video", quantity: 1 }],
      },
    ],
    created_at: "2024-01-01T00:00:00.000Z",
    updated_at: "2024-01-01T00:00:00.000Z",
  },
  {
    id: MOCK_PHASE_3_ID,
    order: 3,
    objective: "conversion",
    publish_date: "2024-03-01",
    publish_time: "18:00:00",
    content_submission_deadline: "2024-02-25",
    correction_submission_deadline: "2024-02-27",
    contents: [
      {
        type: "instagram",
        options: [{ type: "post", quantity: 1 }],
      },
    ],
    created_at: "2024-01-01T00:00:00.000Z",
    updated_at: "2024-01-01T00:00:00.000Z",
  },
];

/**
 * Influenciadores mock - cobrindo todos os status possíveis
 */
const mockInfluencers: DashboardInfluencer[] = [
  // Status: convidados (Convite enviado)
  {
    id: "1",
    name: "Maria Silva",
    username: "@mariabeleza",
    avatar: "https://i.pravatar.cc/150?img=1",
    followers: 125000,
    engagement: 3.2,
    niche: "9", // beauty
    social_network: "instagram",
    status: "convidados",
    phase: undefined,
  },
  {
    id: "2",
    name: "João Santos",
    username: "@joaofitness",
    avatar: "https://i.pravatar.cc/150?img=2",
    followers: 89000,
    engagement: 4.1,
    niche: "4", // athlete
    social_network: "instagram",
    status: "convidados",
    phase: undefined,
  },

  // Status: aprovados (Aprovado para participar)
  {
    id: "3",
    name: "Ana Costa",
    username: "@anacostabeauty",
    avatar: "https://i.pravatar.cc/150?img=3",
    followers: 250000,
    engagement: 5.8,
    niche: "9", // beauty
    social_network: "instagram",
    status: "aprovados",
    phase: undefined,
  },
  {
    id: "4",
    name: "Pedro Oliveira",
    username: "@pedrostyle",
    avatar: "https://i.pravatar.cc/150?img=4",
    followers: 180000,
    engagement: 4.5,
    niche: "9", // beauty
    social_network: "instagram",
    status: "aprovados",
    phase: MOCK_PHASE_1_ID,
  },
  {
    id: "5",
    name: "Carla Mendes",
    username: "@carlamakeup",
    avatar: "https://i.pravatar.cc/150?img=5",
    followers: 320000,
    engagement: 6.2,
    niche: "9", // beauty
    social_network: "instagram",
    status: "aprovados",
    phase: MOCK_PHASE_1_ID,
  },

  // Status: rejeitados (Rejeitado)
  {
    id: "6",
    name: "Roberto Lima",
    username: "@robertotech",
    avatar: "https://i.pravatar.cc/150?img=6",
    followers: 45000,
    engagement: 2.1,
    niche: "1", // agriculture
    social_network: "instagram",
    status: "rejeitados",
    phase: undefined,
  },

  // Status: curadoria (Em curadoria)
  {
    id: "7",
    name: "Fernanda Alves",
    username: "@fernandaskin",
    avatar: "https://i.pravatar.cc/150?img=7",
    followers: 195000,
    engagement: 5.1,
    niche: "9", // beauty
    social_network: "instagram",
    status: "curadoria",
    phase: undefined,
  },
  {
    id: "8",
    name: "Lucas Pereira",
    username: "@lucashair",
    avatar: "https://i.pravatar.cc/150?img=8",
    followers: 145000,
    engagement: 4.8,
    niche: "11", // hair
    social_network: "instagram",
    status: "curadoria",
    phase: undefined,
  },

  // Status: conteudo_submetido (Conteúdo submetido)
  {
    id: "9",
    name: "Juliana Rocha",
    username: "@julianabeauty",
    avatar: "https://i.pravatar.cc/150?img=9",
    followers: 275000,
    engagement: 5.5,
    niche: "9", // beauty
    social_network: "instagram",
    status: "conteudo_submetido",
    phase: MOCK_PHASE_1_ID,
  },
  {
    id: "10",
    name: "Rafael Souza",
    username: "@rafaelstyle",
    avatar: "https://i.pravatar.cc/150?img=10",
    followers: 165000,
    engagement: 4.3,
    niche: "9", // beauty
    social_network: "instagram",
    status: "conteudo_submetido",
    phase: MOCK_PHASE_1_ID,
  },

  // Status: conteudo_aprovado (Conteúdo aprovado)
  {
    id: "11",
    name: "Beatriz Martins",
    username: "@beatrizmakeup",
    avatar: "https://i.pravatar.cc/150?img=11",
    followers: 410000,
    engagement: 7.2,
    niche: "9", // beauty
    social_network: "instagram",
    status: "conteudo_aprovado",
    phase: MOCK_PHASE_1_ID,
  },
  {
    id: "12",
    name: "Gabriel Ferreira",
    username: "@gabrielskincare",
    avatar: "https://i.pravatar.cc/150?img=12",
    followers: 220000,
    engagement: 5.9,
    niche: "9", // beauty
    social_network: "instagram",
    status: "conteudo_aprovado",
    phase: MOCK_PHASE_2_ID,
  },

  // Status: conteudo_rejeitado (Conteúdo rejeitado)
  {
    id: "13",
    name: "Mariana Dias",
    username: "@marianabeauty",
    avatar: "https://i.pravatar.cc/150?img=13",
    followers: 135000,
    engagement: 3.8,
    niche: "9", // beauty
    social_network: "instagram",
    status: "conteudo_rejeitado",
    phase: MOCK_PHASE_1_ID,
  },
];

/**
 * Conteúdos mock - variando status e fases
 */
const mockContents: DashboardContent[] = [
  // Conteúdos pendentes
  {
    id: "content-1",
    campaign_id: MOCK_CAMPAIGN_ID,
    influencer_id: "9",
    influencer_name: "Juliana Rocha",
    influencer_avatar: "https://i.pravatar.cc/150?img=9",
    social_network: "instagram",
    content_type: "post",
    preview_url: "https://picsum.photos/400/400?random=1",
    post_url: null,
    status: "pending",
    phase_id: MOCK_PHASE_1_ID,
    submitted_at: "2024-02-05T10:00:00.000Z",
    published_at: null,
    feedback: null,
    ai_evaluation: {
      score: 85,
      feedback: "Conteúdo alinhado com as diretrizes",
      compliance: {
        mentionsBrand: true,
        usesHashtag: true,
        showsProduct: true,
        followsGuidelines: true,
      },
    },
  },
  {
    id: "content-2",
    campaign_id: MOCK_CAMPAIGN_ID,
    influencer_id: "10",
    influencer_name: "Rafael Souza",
    influencer_avatar: "https://i.pravatar.cc/150?img=10",
    social_network: "instagram",
    content_type: "story",
    preview_url: "https://picsum.photos/400/700?random=2",
    post_url: null,
    status: "pending",
    phase_id: MOCK_PHASE_1_ID,
    submitted_at: "2024-02-06T14:30:00.000Z",
    published_at: null,
    feedback: null,
    ai_evaluation: {
      score: 78,
      feedback: "Bom conteúdo, mas falta mencionar a marca",
      compliance: {
        mentionsBrand: false,
        usesHashtag: true,
        showsProduct: true,
        followsGuidelines: true,
      },
    },
  },

  // Conteúdos aprovados
  {
    id: "content-3",
    campaign_id: MOCK_CAMPAIGN_ID,
    influencer_id: "11",
    influencer_name: "Beatriz Martins",
    influencer_avatar: "https://i.pravatar.cc/150?img=11",
    social_network: "instagram",
    content_type: "post",
    preview_url: "https://picsum.photos/400/400?random=3",
    post_url: "https://instagram.com/p/abc123",
    status: "approved",
    phase_id: MOCK_PHASE_1_ID,
    submitted_at: "2024-02-03T09:00:00.000Z",
    published_at: "2024-02-15T10:00:00.000Z",
    feedback: "Excelente trabalho! Conteúdo aprovado.",
    ai_evaluation: {
      score: 95,
      feedback: "Conteúdo perfeito, seguindo todas as diretrizes",
      compliance: {
        mentionsBrand: true,
        usesHashtag: true,
        showsProduct: true,
        followsGuidelines: true,
      },
    },
  },
  {
    id: "content-4",
    campaign_id: MOCK_CAMPAIGN_ID,
    influencer_id: "12",
    influencer_name: "Gabriel Ferreira",
    influencer_avatar: "https://i.pravatar.cc/150?img=12",
    social_network: "instagram",
    content_type: "reel",
    preview_url: "https://picsum.photos/400/600?random=4",
    post_url: "https://instagram.com/reel/xyz789",
    status: "approved",
    phase_id: MOCK_PHASE_2_ID,
    submitted_at: "2024-02-10T11:00:00.000Z",
    published_at: null,
    feedback: "Aprovado! Aguardando publicação.",
    ai_evaluation: {
      score: 88,
      feedback: "Ótimo conteúdo, muito engajador",
      compliance: {
        mentionsBrand: true,
        usesHashtag: true,
        showsProduct: true,
        followsGuidelines: true,
      },
    },
  },

  // Conteúdos publicados
  {
    id: "content-5",
    campaign_id: MOCK_CAMPAIGN_ID,
    influencer_id: "4",
    influencer_name: "Pedro Oliveira",
    influencer_avatar: "https://i.pravatar.cc/150?img=4",
    social_network: "instagram",
    content_type: "post",
    preview_url: "https://picsum.photos/400/400?random=5",
    post_url: "https://instagram.com/p/def456",
    status: "published",
    phase_id: MOCK_PHASE_1_ID,
    submitted_at: "2024-02-01T08:00:00.000Z",
    published_at: "2024-02-15T10:05:00.000Z",
    feedback: null,
    ai_evaluation: null,
  },
  {
    id: "content-6",
    campaign_id: MOCK_CAMPAIGN_ID,
    influencer_id: "5",
    influencer_name: "Carla Mendes",
    influencer_avatar: "https://i.pravatar.cc/150?img=5",
    social_network: "instagram",
    content_type: "story",
    preview_url: "https://picsum.photos/400/700?random=6",
    post_url: "https://instagram.com/stories/ghi789",
    status: "published",
    phase_id: MOCK_PHASE_1_ID,
    submitted_at: "2024-02-02T12:00:00.000Z",
    published_at: "2024-02-15T10:10:00.000Z",
    feedback: null,
    ai_evaluation: null,
  },
  {
    id: "content-7",
    campaign_id: MOCK_CAMPAIGN_ID,
    influencer_id: "3",
    influencer_name: "Ana Costa",
    influencer_avatar: "https://i.pravatar.cc/150?img=3",
    social_network: "instagram",
    content_type: "post",
    preview_url: "https://picsum.photos/400/400?random=7",
    post_url: "https://instagram.com/p/jkl012",
    status: "published",
    phase_id: MOCK_PHASE_1_ID,
    submitted_at: "2024-02-04T15:00:00.000Z",
    published_at: "2024-02-15T10:15:00.000Z",
    feedback: null,
    ai_evaluation: null,
  },

  // Conteúdo rejeitado
  {
    id: "content-8",
    campaign_id: MOCK_CAMPAIGN_ID,
    influencer_id: "13",
    influencer_name: "Mariana Dias",
    influencer_avatar: "https://i.pravatar.cc/150?img=13",
    social_network: "instagram",
    content_type: "post",
    preview_url: "https://picsum.photos/400/400?random=8",
    post_url: null,
    status: "rejected",
    phase_id: MOCK_PHASE_1_ID,
    submitted_at: "2024-02-07T16:00:00.000Z",
    published_at: null,
    feedback: "O conteúdo não está de acordo com as diretrizes da marca. Por favor, revise e reenvie.",
    ai_evaluation: {
      score: 45,
      feedback: "Conteúdo não menciona a marca e não segue as diretrizes",
      compliance: {
        mentionsBrand: false,
        usesHashtag: false,
        showsProduct: false,
        followsGuidelines: false,
      },
    },
  },
];

/**
 * Métricas mock
 */
const mockMetrics: DashboardMetrics = {
  reach: 13, // Total de influenciadores
  engagement: 5.2, // Média de engajamento
  published_content: 3, // Conteúdos publicados
  active_influencers: 8, // Influenciadores aprovados + com conteúdo
};

/**
 * Retorna dados mock completos do dashboard
 */
export function getMockDashboardData(): DashboardResponse {
  return {
    phases: mockPhases,
    influencers: mockInfluencers,
    contents: mockContents,
    metrics: mockMetrics,
  };
}

/**
 * Retorna dados mock do dashboard para um campaignId específico
 * Útil para desenvolvimento/testes
 */
export function getMockDashboardDataForCampaign(
  campaignId: string
): DashboardResponse {
  const data = getMockDashboardData();
  
  // Atualizar campaign_id em todos os conteúdos
  const updatedContents = data.contents.map((content) => ({
    ...content,
    campaign_id: campaignId,
  }));

  return {
    ...data,
    contents: updatedContents,
  };
}

