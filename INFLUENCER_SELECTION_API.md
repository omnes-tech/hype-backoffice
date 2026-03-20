# API — Seleção de influenciadores por campanha

Endpoint para a tela de **seleção de influenciadores**: combina **recomendados** (alinhados ao segmento da campanha) e **catálogo** (maiores perfis por rede), **agrupados por tipo de rede social**. Cada item representa **um perfil social** (`social_networks`), não um usuário agregado.

## Rota

```http
GET /api/backoffice/campaigns/:campaignId/influencer-selection
```

### Headers obrigatórios

| Header | Descrição |
|--------|-----------|
| `Authorization` | Bearer token (usuário backoffice) |
| `Workspace-Id` | ID do workspace (marca) dono da campanha |

### Parâmetros de URL

| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `campaignId` | UUID | `public_id` da campanha |

### Respostas HTTP

| Código | Situação |
|--------|----------|
| `200` | Payload em `data` |
| `400` | `Workspace-Id` inválido |
| `404` | Campanha não encontrada ou não pertence ao workspace |
| `500` | Erro interno |

---

## Corpo da resposta (`200`)

O backoffice aceita **dois formatos** em `data`:

### A) Agrupado por rede (`networks`)

```json
{
  "data": {
    "campaign": {
      "id": "uuid-da-campanha",
      "title": "Nome da campanha"
    },
    "networks": [
      {
        "type": "instagram",
        "label": "Instagram",
        "recommended": [ /* perfis */ ],
        "catalog": [ /* perfis */ ]
      }
    ]
  }
}
```

### B) Listas planas (`recommended` + `catalog`)

Cada item inclui `social_network.type`; o front agrupa por tipo na mesma ordem visual.

```json
{
  "data": {
    "campaign": { "id": "…", "title": "…" },
    "recommended": [ /* perfis */ ],
    "catalog": [ /* perfis */ ]
  }
}
```

### Ordem de `networks`

Sempre nesta ordem (mesmo que listas vazias):

1. `instagram`
2. `instagram_facebook`
3. `tiktok`
4. `youtube`
5. `ugc`

### Item de perfil (`recommended` / `catalog`)

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `social_network` | objeto | Perfil na rede (chave da listagem) |
| `social_network.id` | number | PK de `social_networks` |
| `social_network.type` | string | Tipo da rede |
| `social_network.name` | string | Nome exibido no perfil |
| `social_network.username` | string | @ / handle |
| `social_network.members` | number | Seguidores / inscritos |
| `social_network.photo` | string \| null | URL da foto do perfil |
| `user` | objeto | Dono do workspace do influenciador |
| `user.id` | number | PK `users` (convites / API de usuário) |
| `user.name` | string | Nome do influenciador |
| `user.photo` | string \| null | Foto de perfil do app |
| `user.gender` | string \| null | Gênero (`male`, `female`, …) |
| `niche_ids` | number[] | Nichos do usuário (`niche_user`) |
| `match_reason` | string | **Somente em `recommended`**: texto explicando o match |

### `recommended` vs `catalog`

| Lista | Critério | Limite por rede |
|-------|----------|-----------------|
| **recommended** | Atende ao **segmento da campanha** (ver abaixo) | 24 |
| **catalog** | Demais perfis da mesma rede, ordenados por `members` (sem repetir `social_network.id` já listado em `recommended`) | 24 |

Quem já está em `campaign_users` da campanha **não** aparece em nenhuma das listas.

---

## Regras de segmento (recomendados)

Alinhado à lógica em `InfluencerSelectionService` e na RPC `get_campaign_influencer_selection`:

1. **Seguidores** — `social_network.members >= campaign.segment_min_followers` (se `segment_min_followers` preenchido).
2. **Gênero** — se `segment_genders` (JSON array) não vazio, `user.gender` deve estar na lista.
3. **Estado** — se `segment_state` não vazio, endereço do usuário (`addresses.state`) deve estar na lista.
4. **Cidade** — se `segment_city` não vazio, `addresses.city` na lista.
5. **Nicho** — se houver ao menos um nicho alvo, o usuário precisa ter interseção com:
   - `workspaces.niche_id` da **marca** (workspace da campanha), e/ou
   - IDs em `campaigns.secondary_niches`  
   Se **não** houver nicho alvo (marca sem nicho e sem secundários), o filtro de nicho **não** é aplicado.

---

## Performance

### RPC (preferencial)

A função PostgreSQL **`get_campaign_influencer_selection(p_campaign_public_id UUID, p_workspace_id INTEGER)`** agrega tudo em **uma ida ao banco** (com CTEs e `json_agg`).

- Migração: `supabase/migrations/014_campaign_influencer_selection_rpc.sql`
- Permissão: `GRANT EXECUTE … TO authenticated`

### Índice

A mesma migração cria:

```sql
CREATE INDEX IF NOT EXISTS idx_social_networks_workspace_type_members
  ON social_networks (workspace_id, type, members DESC);
```

Índices já existentes úteis: `idx_user_workspace_workspace_id`, `idx_niche_user_user_id`, `idx_addresses_addressable`, `idx_campaign_users_campaign_id`.

### Fallback (Node)

Se a RPC falhar (função ausente, erro de conexão, etc.), o serviço registra um **warn** e usa **`buildForCampaignViaQueries`** (várias queries Drizzle), com as **mesmas regras** de negócio.

---

## Aplicar a migração

Rodar o SQL no Postgres (Supabase CLI, painel SQL, ou pipeline de migrations do projeto).

---

## Exemplo `curl`

```bash
curl -sS \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Workspace-Id: <WORKSPACE_NUMERIC_ID>" \
  "https://<API>/api/backoffice/campaigns/1d79767f-d47f-4dda-bee6-48e4515ffefe/influencer-selection"
```

---

## Relação com outros endpoints

| Endpoint | Diferença |
|----------|-----------|
| `GET /backoffice/influencers/catalog` | Catálogo global com query params; retorno **por usuário**, não por rede. |
| `GET /backoffice/influencers/campaigns/:id/recommendations` | Lista simples por usuário; sem agrupamento por rede nem catálogo separado. |

Para a nova UX de seleção, preferir **`/campaigns/:id/influencer-selection`**.
