# HypeApp API — Documentação de Integração Frontend

> **Data:** 2026-04-19
> **Versão:** 1.0
> **Base URL:** `https://<host>/api`
> **Autenticação:** `Authorization: Bearer <token>`

---

## Índice

1. [Autenticação e Headers](#1-autenticação-e-headers)
2. [Tipos Globais](#2-tipos-globais)
3. [App — Redes Sociais](#3-app--redes-sociais)
4. [App — Autenticação OAuth](#4-app--autenticação-oauth)
5. [Backoffice — Perfil do Influenciador](#5-backoffice--perfil-do-influenciador)
6. [Backoffice — Refresh de Métricas](#6-backoffice--refresh-de-métricas)
7. [Métricas Granulares por Rede](#7-métricas-granulares-por-rede)
8. [Soft Delete — Redes Sociais](#8-soft-delete--redes-sociais)
9. [Tratamento de Erros](#9-tratamento-de-erros)

---

## 1. Autenticação e Headers

Todos os endpoints exigem o token de autenticação no header:

```
Authorization: Bearer <jwt_token>
```

Endpoints do backoffice também exigem o header de workspace:

```
Workspace-Id: <workspace_uuid>
```

### Tipos de cliente (`client_type`)

O tipo de cliente é declarado no JWT e determina quais rotas são acessíveis:

| Valor | Acesso |
|-------|--------|
| `app` | Rotas `/api/app/*` |
| `backoffice` | Rotas `/api/backoffice/*` |

---

## 2. Tipos Globais

### `SocialNetworkType`

```typescript
type SocialNetworkType =
  | 'instagram'
  | 'instagram_facebook'
  | 'tiktok'
  | 'youtube'
  | 'ugc';
```

### `SocialNetwork`

```typescript
interface SocialNetwork {
  id: number;
  type: SocialNetworkType;
  type_label: string;           // ex: "Instagram", "TikTok"
  name: string;
  username: string;
  photo: string | null;
  members: number;              // seguidores/inscritos
  prices: Record<string, number> | null;
  recommended_prices: Record<string, number>;
  metrics: AccountMetrics | null;
  created_at: string;           // ISO 8601
  updated_at: string;           // ISO 8601
}
```

### `AccountMetrics`

Campos salvos em `account_metrics` no banco — populados pelo refresh de métricas:

```typescript
interface AccountMetrics {
  // Campos base (todas as redes)
  recent_likes_sum: number;
  recent_comments_sum: number;
  recent_shares_sum: number;
  recent_avg_reach: number;
  recent_posts_fetched: number;
  metrics_refreshed_at: string;   // ISO 8601

  // Instagram — posts normais (IMAGE / CAROUSEL_ALBUM)
  posts_likes_sum?: number;
  posts_likes_avg?: number;
  posts_views_sum?: number;
  posts_views_avg?: number;
  posts_fetched?: number;

  // Instagram — reels (REELS / VIDEO)
  reels_likes_sum?: number;
  reels_likes_avg?: number;
  reels_views_sum?: number;
  reels_views_avg?: number;
  reels_reach_sum?: number;
  reels_reach_avg?: number;
  reels_fetched?: number;

  // TikTok
  tiktok_likes_sum?: number;
  tiktok_likes_avg?: number;
  tiktok_views_sum?: number;
  tiktok_views_avg?: number;
  tiktok_fetched?: number;

  // YouTube — Shorts (duração ≤ 60s)
  yt_shorts_likes_sum?: number;
  yt_shorts_likes_avg?: number;
  yt_shorts_views_sum?: number;
  yt_shorts_views_avg?: number;
  yt_shorts_fetched?: number;

  // YouTube — Vídeos longos (duração > 60s)
  yt_videos_likes_sum?: number;
  yt_videos_likes_avg?: number;
  yt_videos_views_sum?: number;
  yt_videos_views_avg?: number;
  yt_videos_fetched?: number;
}
```

### Formato de resposta padrão

```typescript
interface ApiResponse<T> {
  data: T;
}

interface PaginatedResponse<T> {
  data: T[];
  meta: {
    page: number;
    per_page: number;
    total: number;
    total_pages: number;
  };
}
```

---

## 3. App — Redes Sociais

**Base path:** `/api/app/social-networks`
**Permissão:** `client_type:app`

---

### `GET /api/app/social-networks`

Lista as redes sociais conectadas do influenciador autenticado. Faz refresh automático das métricas quando estão desatualizadas (> 30 min).

**Query parameters:**

| Param | Tipo | Default | Descrição |
|-------|------|---------|-----------|
| `page` | number | 1 | Página |
| `per_page` | number | 20 | Itens por página (max: 100) |

**Response `200`:**

```typescript
PaginatedResponse<SocialNetwork>
```

**Exemplo:**

```json
{
  "data": [
    {
      "id": 89,
      "type": "instagram",
      "type_label": "Instagram",
      "name": "João Silva",
      "username": "@joaosilva",
      "photo": "https://cdn.example.com/photo.jpg",
      "members": 52000,
      "prices": null,
      "recommended_prices": {},
      "metrics": {
        "recent_likes_sum": 4320,
        "recent_avg_reach": 8100,
        "posts_likes_sum": 2100,
        "posts_likes_avg": 210,
        "reels_likes_sum": 2220,
        "reels_likes_avg": 444,
        "reels_views_sum": 98000,
        "reels_views_avg": 19600,
        "metrics_refreshed_at": "2026-04-19T10:30:00.000Z"
      },
      "created_at": "2026-01-15T12:00:00.000Z",
      "updated_at": "2026-04-19T10:30:00.000Z"
    }
  ],
  "meta": {
    "page": 1,
    "per_page": 20,
    "total": 2,
    "total_pages": 1
  }
}
```

---

### `POST /api/app/social-networks/prices`

Atualiza os preços do influenciador por tipo de entrega.

**Request body:**

```typescript
interface UpdatePricesBody {
  instagram?: Record<string, number>;
  instagram_facebook?: Record<string, number>;
  tiktok?: Record<string, number>;
  youtube?: Record<string, number>;
  ugc?: Record<string, number>;
}
```

**Exemplo:**

```json
{
  "instagram": {
    "story": 500,
    "feed_post": 1200,
    "reel": 1800
  },
  "tiktok": {
    "video": 2000
  }
}
```

**Response `204`:** Sem corpo.

---

### `DELETE /api/app/social-networks/:id`

Remove (soft delete) uma rede social do influenciador. O registro é mantido no banco com `disabled_at` preenchido. Ao reconectar, o mesmo registro é reativado.

**Path params:**

| Param | Tipo | Descrição |
|-------|------|-----------|
| `id` | number | `social_networks.id` |

**Response `204`:** Sem corpo.

**Erros:**

| Status | Mensagem |
|--------|----------|
| 404 | "Workspace não encontrado" |
| 404 | "Rede social não encontrada" |

---

### `POST /api/app/social-networks/tiktok/refresh-profile`

Atualiza os dados do perfil TikTok (nome, foto, seguidores) com as informações mais recentes da API.

**Response `200`:**

```typescript
ApiResponse<{
  message: string;
  social_network: SocialNetwork;
}>
```

---

### `POST /api/app/social-networks/instagram/refresh-profile`

Mesmo comportamento do TikTok, mas para o perfil Instagram.

**Response `200`:**

```typescript
ApiResponse<{
  message: string;
  social_network: SocialNetwork;
}>
```

---

### `GET /api/app/social-networks/youtube/integrations`

Lista as integrações YouTube do usuário autenticado.

**Response `200`:**

```typescript
ApiResponse<Array<{
  id: number;
  providerId: string;
  socialNetworkId: number;
  socialNetwork: {
    id: number;
    name: string;
    username: string;
    photo: string | null;
    members: number;
  };
  hasToken: boolean;
  createdAt: string;
}>>
```

---

### `GET /api/app/social-networks/youtube/:id/videos`

Lista os vídeos do canal YouTube.

**Path params:**

| Param | Tipo | Descrição |
|-------|------|-----------|
| `id` | number | `social_networks.id` |

**Query parameters:**

| Param | Tipo | Default | Descrição |
|-------|------|---------|-----------|
| `maxResults` | number | 50 | Máximo de resultados (máx: 50) |
| `pageToken` | string | — | Token de paginação |

**Response `200`:**

```typescript
ApiResponse<{
  videos: Array<{
    videoId: string;
    title: string;
    description: string;
    thumbnail: string;
    publishedAt: string;
    channelId: string;
    channelTitle: string;
  }>;
  nextPageToken: string | null;
  prevPageToken: string | null;
  totalResults: number;
}>
```

---

### `GET /api/app/social-networks/youtube/:id/analytics`

Retorna analytics do canal YouTube para um período.

**Query parameters:**

| Param | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `startDate` | string | ✅ | Formato: `YYYY-MM-DD` |
| `endDate` | string | ✅ | Formato: `YYYY-MM-DD` |
| `metrics` | string | — | Comma-separated (ex: `views,likes`) |
| `dimensions` | string | — | Comma-separated (ex: `day`) |
| `filters` | string | — | Filtros da API do YouTube |

**Erros:**

| Status | Mensagem |
|--------|----------|
| 400 | "startDate e endDate são obrigatórios (formato: YYYY-MM-DD)" |
| 404 | "Integração YouTube não encontrada ou token inválido" |

---

### `GET /api/app/social-networks/youtube/:id/monetization`

Retorna insights de monetização (requer scope `yt-analytics-monetary.readonly`).

**Query parameters:**

| Param | Tipo | Descrição |
|-------|------|-----------|
| `startDate` | string | Formato: `YYYY-MM-DD` (default: 30 dias atrás) |
| `endDate` | string | Formato: `YYYY-MM-DD` (default: hoje) |

---

### `GET /api/app/social-networks/tiktok/:id/videos`

Lista os vídeos do usuário TikTok.

**Query parameters:**

| Param | Tipo | Default | Descrição |
|-------|------|---------|-----------|
| `maxCount` | number | 20 | Máximo de vídeos |
| `cursor` | string | — | Cursor de paginação |

---

### `GET /api/app/social-networks/tiktok/:id/stats`

Retorna estatísticas da conta TikTok.

**Response `200`:**

```typescript
ApiResponse<{
  followerCount: number;
  followingCount: number;
  videoCount: number;
  heartCount: number;
  likeCount: number;
}>
```

---

## 4. App — Autenticação OAuth

**Base path:** `/api/app/social-auth`

---

### Instagram — Fluxo completo

#### Passo 1: Obter URL de autorização

```
GET /api/app/social-auth/instagram/redirect
```

**Response `200`:**

```typescript
ApiResponse<{
  auth_url: string;   // URL para redirecionar o usuário
  state: string;      // Token CSRF para validar o callback
}>
```

O frontend deve abrir `auth_url` em um WebView ou browser externo.

#### Passo 2a: Callback via redirect (GET)

```
GET /api/app/social-auth/instagram/callback?code=...&state=...
```

Usado quando o Instagram redireciona de volta. Retorna HTML que executa deep link:

- **Sucesso:** `hypeapp://auth?success=true&user_id=<instagram_id>`
- **Erro:** `hypeapp://auth?error=<mensagem>`

O app deve interceptar o deep link para continuar o fluxo.

#### Passo 2b: Callback via POST (mobile)

```
POST /api/app/social-auth/instagram/callback
```

**Request body:**

```typescript
interface InstagramCallbackBody {
  code: string;   // authorization code recebido do Instagram (max: 2000 chars)
  state?: string;
}
```

**Response `201`:**

```typescript
ApiResponse<{
  message: string;
  social_network: {
    id: number;
    type: 'instagram' | 'instagram_facebook';
    username: string;
    name: string;
  };
}>
```

> **Nota:** Ao reconectar uma rede social previamente removida (soft delete), o mesmo registro é reativado — o `id` permanece o mesmo.

---

## 5. Backoffice — Perfil do Influenciador

**Base path:** `/api/backoffice/influencers`
**Permissão de workspace:** `influencers_read`

---

### `GET /api/backoffice/influencers/:influencerId/profile`

Retorna o perfil completo do influenciador com métricas por rede social. **Sempre executa refresh das métricas** antes de retornar os dados.

**Path params:**

| Param | Tipo | Descrição |
|-------|------|-----------|
| `influencerId` | number | `users.id` **ou** `campaign_users.id` |

**Query parameters:**

| Param | Tipo | Default | Opções | Descrição |
|-------|------|---------|--------|-----------|
| `campaignId` | string | — | UUID | Preenche o breadcrumb `data.campaign` |
| `metrics_posts` | number | 10 | 10, 20, 30, 40, 50 | Quantidade de posts recentes para calcular métricas |

**Response `200`:**

```typescript
ApiResponse<{
  campaign: {
    id: string;       // public UUID
    title: string;
  } | null;

  influencer: {
    id: string;
    name: string;
    username: string;
    avatar: string | null;
    followers: number;
    engagement: number;       // engajamento médio ponderado (%)
    niche: string | null;
    niche_id: string | null;
    niche_name: string | null;
    sub_niche_names: string[];
    status?: string;
    phase?: string;
    location?: { state?: string; city?: string };
    bio: string | null;
    rating: number | null;
    rating_max: 5;
    social_networks: Array<{
      id: number;
      type: SocialNetworkType;
      name: string;
      username: string;
      members: number;
      status?: string;
    }>;
  };

  metrics_by_network: Partial<Record<
    'instagram' | 'tiktok' | 'youtube',
    MetricsByNetwork
  >>;

  total_posts_in_hypeapp: number;
  campaigns_participated_in_hypeapp: number;
  trust_index: number | null;

  top_contents: Array<{
    id: string;
    image_url: string | null;
    views: number;
    likes: number;
    post_url: string | null;
  }>;

  hypeapp_campaigns: Array<{
    id: string;
    logo_url: string | null;
    campaign_name: string;
    brand_name: string | null;
    date: string | null;
    rating: number | null;
    description: string | null;   // truncado em 400 chars
    delivery_thumbnails: string[];
    views: number;
    likes: number;
  }>;
}>
```

#### Tipo `MetricsByNetwork`

> ⚠️ **Apenas redes conectadas aparecem.** Se o influenciador não tem YouTube, a chave `youtube` não existirá na resposta.

```typescript
interface MetricsByNetwork {
  gender_split: {
    women_percent: number;    // 0–100
    men_percent: number;      // 0–100
  };
  followers: number;
  likes: number;              // soma de curtidas recentes
  average_reach: number;      // alcance médio por post
  engagement_percent: number; // taxa de engajamento (%)
  total_posts_in_hypeapp: number;
  campaigns_participated_in_hypeapp: number;

  // Instagram — posts normais (IMAGE / CAROUSEL_ALBUM)
  posts_likes_sum: number;
  posts_likes_avg: number;
  posts_views_sum: number;
  posts_views_avg: number;
  posts_fetched: number;

  // Instagram — reels (REELS / VIDEO)
  reels_likes_sum: number;
  reels_likes_avg: number;
  reels_views_sum: number;
  reels_views_avg: number;
  reels_reach_sum: number;
  reels_reach_avg: number;
  reels_fetched: number;

  // TikTok
  tiktok_likes_sum: number;
  tiktok_likes_avg: number;
  tiktok_views_sum: number;
  tiktok_views_avg: number;
  tiktok_fetched: number;

  // YouTube — Shorts (duração ≤ 60s)
  yt_shorts_likes_sum: number;
  yt_shorts_likes_avg: number;
  yt_shorts_views_sum: number;
  yt_shorts_views_avg: number;
  yt_shorts_fetched: number;

  // YouTube — Vídeos (duração > 60s)
  yt_videos_likes_sum: number;
  yt_videos_likes_avg: number;
  yt_videos_views_sum: number;
  yt_videos_views_avg: number;
  yt_videos_fetched: number;
}
```

**Exemplo de resposta `metrics_by_network`:**

```json
{
  "instagram": {
    "gender_split": { "women_percent": 62.3, "men_percent": 37.7 },
    "followers": 52000,
    "likes": 4320,
    "average_reach": 8100,
    "engagement_percent": 3.8,
    "total_posts_in_hypeapp": 14,
    "campaigns_participated_in_hypeapp": 3,
    "posts_likes_sum": 2100,
    "posts_likes_avg": 210,
    "posts_views_sum": 45000,
    "posts_views_avg": 4500,
    "posts_fetched": 10,
    "reels_likes_sum": 2220,
    "reels_likes_avg": 444,
    "reels_views_sum": 98000,
    "reels_views_avg": 19600,
    "reels_reach_sum": 81000,
    "reels_reach_avg": 16200,
    "reels_fetched": 5
  },
  "tiktok": {
    "gender_split": { "women_percent": 55.0, "men_percent": 45.0 },
    "followers": 30000,
    "likes": 8800,
    "average_reach": 12000,
    "engagement_percent": 5.2,
    "total_posts_in_hypeapp": 6,
    "campaigns_participated_in_hypeapp": 1,
    "tiktok_likes_sum": 8800,
    "tiktok_likes_avg": 880,
    "tiktok_views_sum": 120000,
    "tiktok_views_avg": 12000,
    "tiktok_fetched": 10
  }
}
```

> `youtube` ausente — influenciador não tem YouTube conectado.

**Erros:**

| Status | Mensagem |
|--------|----------|
| 400 | "ID do influenciador inválido" |
| 404 | "Influenciador não encontrado ou sem acesso neste workspace" |
| 404 | "Campanha não encontrada" |

---

### `GET /api/backoffice/influencers/:userId/profiles`

Lista os perfis de redes sociais de um influenciador.

**Path params:**

| Param | Tipo | Descrição |
|-------|------|-----------|
| `userId` | number | `users.id` |

**Response `200`:**

```typescript
ApiResponse<{
  influencer: {
    id: string;
    name: string;
    email: string;
    photo: string | null;
  };
  profiles: Array<{
    id: string;
    type: SocialNetworkType;
    type_label: string;
    name: string;
    username: string;
    photo: string | null;
    members: number;
    created_at: string;
  }>;
}>
```

---

## 6. Backoffice — Refresh de Métricas

---

### `POST /api/backoffice/influencers/:influencerId/refresh-metrics`

Dispara refresh de métricas para **todas** as redes sociais do influenciador.

**Path params:**

| Param | Tipo | Descrição |
|-------|------|-----------|
| `influencerId` | number | `users.id` |

**Response `200`:**

```typescript
ApiResponse<{
  total: number;
  refreshed: number;
  failed: number;
}>
```

**Erros:**

| Status | Mensagem |
|--------|----------|
| 400 | "ID do influenciador inválido" |

---

### `POST /api/backoffice/influencers/:influencerId/social-networks/:socialNetworkId/refresh-metrics`

Dispara refresh de métricas para **uma rede social específica**.

**Path params:**

| Param | Tipo | Descrição |
|-------|------|-----------|
| `influencerId` | number | `users.id` |
| `socialNetworkId` | number | `social_networks.id` |

**Response `200`:**

```typescript
ApiResponse<{
  refreshed: boolean;
  metrics: AccountMetrics | null;
}>
```

**Erros:**

| Status | Mensagem |
|--------|----------|
| 400 | "ID de rede social inválido" |
| 404 | "Rede social não encontrada" |

---

## 7. Métricas Granulares por Rede

### Instagram

Os posts são divididos em dois grupos para calcular as métricas:

| Grupo | `media_type` |
|-------|-------------|
| **Posts** | `IMAGE`, `CAROUSEL_ALBUM`, ou `null` |
| **Reels** | `REELS`, `VIDEO` |

Os N últimos posts de cada grupo são usados (controlado por `metrics_posts`).

**Campos disponíveis:**

```
posts_likes_sum      Total de curtidas nos posts
posts_likes_avg      Média de curtidas por post
posts_views_sum      Total de alcance/views dos posts
posts_views_avg      Média de alcance por post
posts_fetched        Quantidade de posts analisados

reels_likes_sum      Total de curtidas nos reels
reels_likes_avg      Média de curtidas por reel
reels_views_sum      Total de visualizações dos reels
reels_views_avg      Média de views por reel
reels_reach_sum      Total de alcance dos reels
reels_reach_avg      Média de alcance por reel
reels_fetched        Quantidade de reels analisados
```

### TikTok

N últimos vídeos analisados:

```
tiktok_likes_sum     Total de curtidas
tiktok_likes_avg     Média de curtidas por vídeo
tiktok_views_sum     Total de visualizações
tiktok_views_avg     Média de views por vídeo
tiktok_fetched       Quantidade de vídeos analisados
```

### YouTube

Os vídeos são divididos por duração:

| Grupo | Critério |
|-------|----------|
| **Shorts** | duração ≤ 60 segundos |
| **Vídeos** | duração > 60 segundos |

```
yt_shorts_likes_sum    Total de curtidas nos Shorts
yt_shorts_likes_avg    Média de curtidas por Short
yt_shorts_views_sum    Total de views nos Shorts
yt_shorts_views_avg    Média de views por Short
yt_shorts_fetched      Quantidade de Shorts analisados

yt_videos_likes_sum    Total de curtidas nos Vídeos
yt_videos_likes_avg    Média de curtidas por Vídeo
yt_videos_views_sum    Total de views nos Vídeos
yt_videos_views_avg    Média de views por Vídeo
yt_videos_fetched      Quantidade de Vídeos analisados
```

---

## 8. Soft Delete — Redes Sociais

Ao deletar uma rede social (`DELETE /api/app/social-networks/:id`), o registro **não é removido** do banco — apenas o campo `disabled_at` é preenchido.

**Comportamento ao reconectar:**

- O mesmo registro é reativado (`disabled_at` volta a `null`)
- O `id` da rede social **permanece o mesmo**
- As métricas históricas são preservadas

Isso garante consistência de IDs em campanhas e histórico de posts.

---

## 9. Tratamento de Erros

### Formato de erro

```typescript
interface ApiError {
  statusCode: number;
  message: string;
  error?: string;
}
```

**Exemplo:**

```json
{
  "statusCode": 404,
  "message": "Influenciador não encontrado ou sem acesso neste workspace",
  "error": "Not Found"
}
```

### Códigos comuns

| Status | Significado | Ação sugerida |
|--------|-------------|---------------|
| 400 | Parâmetro inválido | Validar entrada antes de enviar |
| 401 | Token inválido ou expirado | Redirecionar para login |
| 403 | Sem permissão | Verificar permissões do workspace |
| 404 | Recurso não encontrado | Exibir mensagem ao usuário |
| 500 | Erro interno | Exibir mensagem genérica + retry |

### Refresh de token OAuth

O backend tenta renovar automaticamente tokens expirados de Instagram, TikTok e YouTube antes de buscar métricas. Caso falhe (ex: usuário revogou permissão), o refresh retorna `null` e as métricas não são atualizadas — mas os dados antigos ainda são retornados.

Se `metrics_refreshed_at` estiver muito desatualizado, é sinal de que o token expirou e o influenciador precisa reconectar a rede social.

---

## Resumo dos endpoints

| Método | Rota | Descrição |
|--------|------|-----------|
| `GET` | `/api/app/social-networks` | Lista redes sociais do influenciador |
| `POST` | `/api/app/social-networks/prices` | Atualiza preços |
| `DELETE` | `/api/app/social-networks/:id` | Soft delete de rede social |
| `POST` | `/api/app/social-networks/instagram/refresh-profile` | Atualiza perfil Instagram |
| `POST` | `/api/app/social-networks/tiktok/refresh-profile` | Atualiza perfil TikTok |
| `GET` | `/api/app/social-networks/youtube/integrations` | Integrações YouTube |
| `GET` | `/api/app/social-networks/youtube/:id/videos` | Vídeos do canal |
| `GET` | `/api/app/social-networks/youtube/:id/analytics` | Analytics do canal |
| `GET` | `/api/app/social-networks/youtube/:id/monetization` | Monetização do canal |
| `GET` | `/api/app/social-networks/tiktok/:id/videos` | Vídeos TikTok |
| `GET` | `/api/app/social-networks/tiktok/:id/stats` | Stats da conta TikTok |
| `GET` | `/api/app/social-auth/instagram/redirect` | URL de autorização Instagram |
| `GET` | `/api/app/social-auth/instagram/callback` | Callback Instagram (redirect) |
| `POST` | `/api/app/social-auth/instagram/callback` | Callback Instagram (mobile) |
| `GET` | `/api/backoffice/influencers/:id/profile` | Perfil completo com métricas |
| `GET` | `/api/backoffice/influencers/:id/profiles` | Lista perfis de redes sociais |
| `POST` | `/api/backoffice/influencers/:id/refresh-metrics` | Refresh de todas as métricas |
| `POST` | `/api/backoffice/influencers/:id/social-networks/:snId/refresh-metrics` | Refresh de uma rede específica |
