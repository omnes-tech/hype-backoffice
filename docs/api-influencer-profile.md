# API – Página de perfil do influenciador

Este documento descreve **todos os dados que a API deve retornar** para popular a tela de perfil do influenciador.

**Rota (front):** `/campaigns/:campaignId/influencer/:influencerId`  
**Endpoint (back):** **GET** `/backoffice/campaigns/:campaignId/influencer/:influencerId`

- **Validação:** campanha por `campaignId` (UUID) e workspace do usuário.
- **`influencerId`:** id do `campaign_user` (mesmo id da lista do dashboard).
- **404** se campanha ou influenciador não existirem.

A tela usa **apenas** esse endpoint.

---

## 1. Resposta completa (estrutura esperada)

A resposta deve retornar todos os dados necessários para montar a tela: breadcrumb, card do influenciador, nichos, sobre, métricas por rede, selo de confiança, top conteúdos e campanhas no Hypeapp.

```json
{
  "data": {
    "campaign": {
      "id": "uuid-da-campanha",
      "title": "Nome da campanha"
    },
    "influencer": {
      "id": "7",
      "name": "Nome do influenciador",
      "username": "nome_do_usuario",
      "avatar": "path/ou/url/do/avatar.jpg",
      "followers": 50000,
      "engagement": 4.2,
      "niche": "12",
      "niche_name": "Lifestyle & Tech",
      "sub_niche_names": ["Lifestyle & Tech", "Tech"],
      "status": "approved",
      "phase": "Fase 1",
      "location": {
        "state": "São Paulo",
        "city": "São Paulo"
      },
      "bio": "Descrição ou bio do influenciador.",
      "rating": 4.8,
      "rating_max": 5,
      "social_networks": [
        {
          "id": 101,
          "type": "instagram",
          "name": "Instagram",
          "username": "usuario_ig",
          "members": 50000,
          "status": "approved"
        }
      ]
    },
    "metrics_by_network": {
      "instagram": {
        "gender_split": {
          "women_percent": 40,
          "men_percent": 60
        },
        "followers": 1200000,
        "likes": 1200,
        "average_reach": 300000,
        "engagement_percent": 12
      }
    },
    "total_posts_in_hypeapp": 24,
    "campaigns_participated_in_hypeapp": 12,
    "trust_index": 85,
    "top_contents": [
      {
        "id": "1",
        "image_url": "path/ou/url/da/imagem.jpg",
        "views": 100000,
        "likes": 20000,
        "post_url": "https://..."
      }
    ],
    "hypeapp_campaigns": [
      {
        "id": "uuid",
        "logo_url": "path/ou/url/logo.jpg",
        "campaign_name": "Nome da campanha",
        "brand_name": "Nome_da_marca",
        "date": "2026-02-10",
        "rating": 4.5,
        "description": "Estamos super empolgados em tê-lo(a) conosco nesta campanha...",
        "delivery_thumbnails": ["path/thumb1.jpg", "path/thumb2.jpg"],
        "views": 45200,
        "likes": 1200
      }
    ]
  }
}
```

---

## 2. Campos por seção da tela

### 2.1. Breadcrumb e header

| Campo | Tipo | Obrigatório | Uso na tela |
|-------|------|-------------|-------------|
| `campaign.id` | string | Sim | Contexto (navegação). |
| `campaign.title` | string | Sim | Texto do segundo item do breadcrumb (ex.: "Detalhes da campanha"). |

---

### 2.2. Card do influenciador (hero)

| Campo | Tipo | Obrigatório | Uso na tela |
|-------|------|-------------|-------------|
| `influencer.id` | string | Sim | Identificação. |
| `influencer.name` | string | Sim | Nome exibido. |
| `influencer.username` | string | Sim | Exibido como `@username`. |
| `influencer.avatar` | string \| null | Sim | Foto de perfil (path ou URL; o front usa `getUploadUrl(avatar)`). |
| `influencer.location.state` | string | Não | Local: ex. "São Paulo". Se ausente, mostra "—". |
| `influencer.location.city` | string | Não | Local: ex. "São Paulo". Montado como "state, city". |
| `influencer.rating` | number | Não | Nota Hypeapp (ex.: 4.8). Se ausente, a tela mostra "4.8 / 5.0" fixo. |
| `influencer.rating_max` | number | Não | Valor máximo da nota (ex.: 5). Usado como "4.8 / 5.0". |

---

### 2.3. Nicho e Sub-nicho

| Campo | Tipo | Obrigatório | Uso na tela |
|-------|------|-------------|-------------|
| `influencer.niche` | string | Sim | ID do nicho (uso interno). |
| `influencer.niche_name` | string \| null | Não | Nome exibido na tag "Nicho". Se null, mostra "—". |
| `influencer.sub_niche_names` | string[] | Não | Lista de nomes para as tags "Sub-Nicho". Se vazio/ausente, mostra "—". |

---

### 2.4. Sobre o influenciador

| Campo | Tipo | Obrigatório | Uso na tela |
|-------|------|-------------|-------------|
| `influencer.bio` | string \| null | Não | Texto da seção "Sobre o influenciador". Se null, mostra "Nenhuma descrição informada." |

---

### 2.5. Métricas (abas por rede)

A tela tem abas **Instagram**, **Tiktok**, **Youtube**. Os valores exibidos devem vir por rede.

| Campo | Tipo | Obrigatório | Uso na tela |
|-------|------|-------------|-------------|
| `influencer.social_networks` | array | Não | Lista de redes; as abas podem ser geradas a partir daqui. |
| `metrics_by_network` | object | Não | Chaves: `instagram`, `tiktok`, `youtube`. Cada rede pode ter (valores numéricos; o front formata 1.2M, 300k, 12% etc.): |
| `metrics_by_network.<rede>.gender_split.women_percent` | number | Não | "Divisão por gênero" – Mulheres (%). |
| `metrics_by_network.<rede>.gender_split.men_percent` | number | Não | "Divisão por gênero" – Homens (%). |
| `metrics_by_network.<rede>.followers` | number | Não | Card "Seguidores". |
| `metrics_by_network.<rede>.likes` | number | Não | Card "Curtidas". |
| `metrics_by_network.<rede>.average_reach` | number | Não | Card "Alcance Médio". |
| `metrics_by_network.<rede>.engagement_percent` | number | Não | Card "Engajamento" (%). |

Se `metrics_by_network` ou a rede estiver ausente, a tela pode usar placeholders (ex.: 1.2M, 1.2k, 300k, 12%).

---

### 2.6. Métricas Hypeapp (segunda linha de cards)

| Campo | Tipo | Obrigatório | Uso na tela |
|-------|------|-------------|-------------|
| `total_posts_in_hypeapp` | number | Não | "Publicações totais dentro do Hype app". Se ausente, pode mostrar 0 ou placeholder. |
| `campaigns_participated_in_hypeapp` | number | Não | "Campanhas participadas no Hype app". Se ausente, idem. |

---

### 2.7. Selo de Segurança Hypeapp

| Campo | Tipo | Obrigatório | Uso na tela |
|-------|------|-------------|-------------|
| `trust_index` | number | Não | "Índice de Confiança" – ex.: 85 → "85% de audiência real". Se ausente, pode mostrar 85% fixo. |

---

### 2.8. Top 4 conteúdos

| Campo | Tipo | Obrigatório | Uso na tela |
|-------|------|-------------|-------------|
| `top_contents` | array | Não | Até 4 itens. Cada item: |
| `top_contents[].id` | string | Sim | Identificador. |
| `top_contents[].image_url` | string | Não | Imagem do conteúdo (path ou URL). |
| `top_contents[].views` | number | Não | "Visualizações" (ex.: 100000 → "100K"). |
| `top_contents[].likes` | number | Não | "Curtidas" (ex.: 20000 → "20K"). |
| `top_contents[].post_url` | string | Não | Link "Visualizar postagem". |

Se ausente, a tela pode mostrar até 4 cards em branco/placeholder.

---

### 2.9. Campanhas no Hypeapp

| Campo | Tipo | Obrigatório | Uso na tela |
|-------|------|-------------|-------------|
| `hypeapp_campaigns` | array | Não | Lista de campanhas em que o influenciador participou. Cada item: |
| `hypeapp_campaigns[].id` | string | Sim | Identificador. |
| `hypeapp_campaigns[].logo_url` | string | Não | Logo da campanha/marca. |
| `hypeapp_campaigns[].campaign_name` | string | Não | "Nome da campanha". |
| `hypeapp_campaigns[].brand_name` | string | Não | "Nome_da_marca". |
| `hypeapp_campaigns[].date` | string | Não | Data (ex.: "2026-02-10" ou formatada "10/02/2026"). |
| `hypeapp_campaigns[].rating` | number | Não | Nota (ex.: 4.5) para exibir estrelas. |
| `hypeapp_campaigns[].description` | string | Não | Texto descritivo da campanha. |
| `hypeapp_campaigns[].delivery_thumbnails` | string[] | Não | URLs/paths das miniaturas em "Entregas". |
| `hypeapp_campaigns[].views` | number | Não | Visualizações (ex.: 45200 → "45.2K"). |
| `hypeapp_campaigns[].likes` | number | Não | Curtidas (ex.: 1200 → "1.2K"). |

Se ausente, a tela pode mostrar lista vazia ou placeholders.

---

### 2.10. Footer (ações)

Os botões **"Copiar link do perfil"**, **"Convidar para pré-seleção"** e **"Enviar convite"** são apenas ações do front; não dependem de campos da resposta. O link do perfil pode ser montado no front a partir da URL atual ou de um campo opcional (ex.: `influencer.profile_url`) se o back quiser enviar.

---

## 3. Resumo mínimo vs completo

**Mínimo** (para a tela funcionar sem quebrar):

- `campaign`: `id`, `title`
- `influencer`: `id`, `name`, `username`, `avatar`, `followers`, `engagement`, `niche`, `niche_name`, `status`

**Recomendado** (para preencher tudo que a tela exibe hoje):

- `influencer`: `location` (`state`, `city`), `bio`, `sub_niche_names`, `rating`, `rating_max`, `social_networks`
- `metrics_by_network` (por rede)
- `total_posts_in_hypeapp`, `campaigns_participated_in_hypeapp`
- `trust_index`
- `top_contents`
- `hypeapp_campaigns`

---

## 4. Checklist para o backend

- [ ] **GET** `/backoffice/campaigns/:campaignId/influencer/:influencerId` retorna `data.campaign` com `id` e `title`.
- [ ] Retorna `data.influencer` com pelo menos: `id`, `name`, `username`, `avatar`, `followers`, `engagement`, `niche`, `niche_name`, `status`.
- [ ] (Recomendado) `influencer.location` com `state` e `city` para o "Local".
- [ ] (Recomendado) `influencer.bio` para "Sobre o influenciador".
- [ ] (Recomendado) `influencer.sub_niche_names` (array de strings) para as tags "Sub-Nicho".
- [ ] (Recomendado) `influencer.rating` e `influencer.rating_max` para a nota Hypeapp.
- [ ] (Recomendado) `metrics_by_network` com métricas por rede (gender_split, followers, likes, average_reach, engagement_percent).
- [ ] (Recomendado) `total_posts_in_hypeapp` e `campaigns_participated_in_hypeapp`.
- [ ] (Recomendado) `trust_index` para o Selo de Segurança.
- [ ] (Recomendado) `top_contents` (até 4 itens com image_url, views, likes, post_url).
- [ ] (Recomendado) `hypeapp_campaigns` (lista com logo, nome, marca, data, rating, description, thumbnails, views, likes).

Com isso, a API cobre todos os dados que a tela de perfil do influenciador exibe.
