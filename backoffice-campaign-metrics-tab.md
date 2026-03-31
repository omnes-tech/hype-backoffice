# Backoffice — métricas da tab “Métricas e conteúdos”

Documentação dos endpoints usados para popular a tab com métricas reais (posts identificados, endereços, demografia em metadata).

## Prefixo e autenticação

| Item | Valor |
|------|--------|
| **Prefixo global** | `/api` |
| **Base** | `GET/POST … /api/backoffice/campaigns/:campaignId/metrics/…` |

**`:campaignId`** — UUID público da campanha (`campaigns.public_id`), igual às demais rotas de backoffice.

**Guards (todas as rotas abaixo):**

- `ClientTypeGuard` — cliente tipo backoffice
- `AuthGuard` — usuário autenticado
- `AbilityGuard` + `RequireAbility('client_type:backoffice')`
- `WorkspaceGuard` — campanha deve pertencer ao workspace do header/contexto usado pelo guard (padrão do módulo)

Headers/cookies de auth e workspace seguem o mesmo contrato das outras rotas `backoffice/*` do projeto.

---

## `GET /api/backoffice/campaigns/:campaignId/metrics/contents`

Retorna um **mapa em lote** de métricas por conteúdo publicado, cruzando `campaign_contents` (status `published`) com `identified_posts` da mesma campanha (match por `user_id` + rede + URL normalizada sem query/hash). Para cada par chave, usa o snapshot do post **mais recente** (`identified_at`).

Evita N+1 no front: uma chamada substitui vários `GET` por conteúdo.

### Resposta `200`

```json
{
  "data": {
    "by_content_id": {
      "<content_public_uuid>": {
        "content_id": "<content_public_uuid>",
        "views": 0,
        "likes": 0,
        "comments": 0,
        "shares": 0,
        "engagement": 0,
        "reach": 0
      }
    }
}
```

- **`engagement`**: percentual numérico (0–100), conforme `formatEngagementPercent` (base em seguidores da rede quando disponível).
- **`reach`**: alcance/impressões do metadata quando existir; caso contrário tende a espelhar views.
- Chaves de `by_content_id` são os **`public_id`** dos conteúdos; entradas só existem para conteúdos **publicados**; métricas podem ser zero se não houver post identificado compatível.

### Erros

| Status | Quando |
|--------|--------|
| `404` | Campanha não encontrada ou fora do workspace |
| `500` | Falha interna |

---

## `GET /api/backoffice/campaigns/:campaignId/metrics/top-cities`

Ranking de **cidades** por “score de engajamento”: soma de likes + comentários + compartilhamentos dos posts identificados da campanha **por influenciador**, depois agregado por **cidade + estado** usando o endereço do usuário (`addresses` com `addressable_type` de usuário). Cada usuário contribui **uma vez** (usa o primeiro endereço retornado para aquele usuário).

### Query

| Parâmetro | Tipo | Default | Observação |
|-----------|------|---------|------------|
| `limit` | integer | `5` | Entre **1** e **50** |

Exemplo: `?limit=10`

### Resposta `200`

```json
{
  "data": [
    {
      "rank": 1,
      "city_name": "São Paulo",
      "state": "SP",
      "engagement_score": 15230
    }
  ]
}
```

Ordenação: `engagement_score` decrescente. Array vazio se não houver posts com métricas ou usuários com endereço.

### Erros

| Status | Quando |
|--------|--------|
| `404` | Campanha não encontrada ou fora do workspace |
| `500` | Falha interna |

---

## `GET /api/backoffice/campaigns/:campaignId/metrics/audience-by-age`

Agrega **demografia por idade** a partir de campos no `metadata` dos posts identificados (ex.: `audienceDemographics`, estruturas `ageGroups` / `buckets`, inclusive aninhadas em `raw`). Agrupa por **tipo de rede social** (`social_networks.type`).

### Resposta `200`

```json
{
  "data": {
    "networks": {
      "youtube": {
        "has_data": true,
        "age_buckets": [
          { "label": "18-24", "percent": 12.5 }
        ]
      },
      "instagram": {
        "has_data": false,
        "age_buckets": []
      }
    }
  }
}
```

- **`percent`** em cada faixa é **média arredondada** dos percentuais vindos de cada post daquela rede (quando houver dados).
- Redes só aparecem quando existir pelo menos um post com demografia parseável.

### Erros

| Status | Quando |
|--------|--------|
| `404` | Campanha não encontrada ou fora do workspace |
| `500` | Falha interna |

---

## `GET /api/backoffice/campaigns/:campaignId/metrics/contents/:contentId`

Métricas de **um** conteúdo (UUID público `:contentId`). Corpo base do conteúdo (status, datas) + mesma lógica de métricas que o mapa em lote quando houver post identificado.

### Resposta `200`

```json
{
  "data": {
    "content_id": "<uuid>",
    "status": "published",
    "submitted_at": "...",
    "published_at": "...",
    "views": 0,
    "likes": 0,
    "comments": 0,
    "shares": 0,
    "engagement": 0,
    "reach": 0
  }
}
```

### Erros

| Status | Quando |
|--------|--------|
| `404` | Campanha ou conteúdo não encontrado |
| `500` | Falha interna |

**Nota de implementação:** hoje o handler reutiliza o cálculo em lote da campanha e extrai a chave do conteúdo; em campanhas muito grandes pode ser otimizado com consulta apenas ao conteúdo solicitado.

---

## Ordem de rotas

O segmento estático `…/metrics/contents` está registrado **antes** de `…/metrics/contents/:contentId` para o roteador não interpretar `contents` como `contentId`.

---

## Referência de código

| Peça | Arquivo |
|------|---------|
| Controller | `src/modules/backoffice/controllers/campaign-metrics.controller.ts` |
| Serviço (lote, cidades, idade) | `src/modules/backoffice/services/campaign-metrics-tab.service.ts` |
| Formato numérico / engagement | `lib/utils/post-metrics.ts`, `lib/utils/engagement.ts` |
| Resource (tipo legado + campos extras) | `src/resources/backoffice/metrics.resource.ts` |

---

## Outras rotas no mesmo controller

O prefixo `…/metrics` também expõe, entre outras: `GET /` (resumo), `GET /influencers`, `GET /identified-posts`, `GET /detailed`, `GET /historical`. Esta página cobre apenas os endpoints voltados à **tab de população** (`contents` em lote, `top-cities`, `audience-by-age` e o `GET` unitário de conteúdo atualizado).
