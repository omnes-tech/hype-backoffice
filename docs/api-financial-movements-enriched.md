# API — Histórico de movimentações enriquecido

Documenta o **enriquecimento server-side** do endpoint
`GET /balance/workspace/:workspace_id/movements` para alimentar a página
`/financial → Histórico de movimentações` (componente
`src/components/financial/movements-section.tsx`).

> **Objetivo:** o frontend hoje só recebe IDs crus em `related`
> (`campaign_id`, `campaign_user_id`, `hold_id`, `charge_id`). A UI nova
> mostra nome da campanha, banner, influenciador, rede social e tipo de
> conteúdo. **Esses dados precisam vir no mesmo payload**, via JOIN
> server-side — N+1 fetches no front é inaceitável (uma página com 20
> linhas dispararia ~40 GETs).

---

## 1. Resumo do que muda

O endpoint **continua o mesmo** (`GET /movements`). O que muda é o **shape
do objeto `related`** de cada item, que ganha campos enriquecidos opcionais.

- **Backwards-compatible**: clients antigos continuam funcionando — todos
  os novos campos são opcionais.
- **Performance**: 1 query SQL com JOIN cobre tudo. Sem N+1.
- **Segurança**: nenhum dado novo é sensível. Avatar/banner são URLs já
  públicas. Nomes de campanha/influenciador já são visíveis nas outras
  telas do workspace.

---

## 2. Schema atualizado de `BalanceMovement.related`

```ts
interface MovementRelated {
  // --- Já existente (mantém) ---
  charge_id: string | null;
  campaign_id: number | null;
  campaign_user_id: number | null;
  hold_id: number | null;

  // --- NOVO — enriquecimento opcional via JOIN ---

  /** `campaigns.title` */
  campaign_title?: string | null;

  /** `campaigns.public_id` (UUID) — para deep-link futuro */
  campaign_public_id?: string | null;

  /** `campaigns.banner_url` (path de upload — front resolve com getUploadUrl) */
  campaign_banner_url?: string | null;

  /** `campaigns.payment_method` */
  campaign_payment_method?: "fixed" | "cpm" | "cpa" | "swap" | "price" | null;

  /** `users.name` do influenciador (resolvido por campaign_user_id) */
  influencer_name?: string | null;

  /** `social_networks.username` do perfil envolvido no movimento (sem @) */
  influencer_username?: string | null;

  /** `users.avatar` ou `social_networks.photo` */
  influencer_avatar?: string | null;

  /** `social_networks.type` (instagram, tiktok, youtube, ugc…) */
  social_network?: string | null;

  /** Label já resolvido server-side (opcional — front faz fallback). */
  social_network_label?: string | null;

  /** Quando o movimento se refere a um conteúdo específico (post, reels, video…). */
  content_type?: string | null;
}
```

---

## 3. Origem dos campos por tipo de movimento

Nem todo movimento tem todos os campos. A tabela abaixo lista o que o
backend deve preencher por **tipo** (`movement.type`):

| `movement.type`         | campaign_* | influencer_* | social_network | content_type |
|-------------------------|:----------:|:------------:|:--------------:|:------------:|
| `top_up_pending`        | —          | —            | —              | —            |
| `top_up_confirmed`      | —          | —            | —              | —            |
| `top_up_expired`        | —          | —            | —              | —            |
| `top_up_refunded`       | —          | —            | —              | —            |
| `reserve_created`       | ✅         | ✅           | ✅             | opcional¹    |
| `reserve_released`      | ✅         | ✅           | ✅             | opcional¹    |
| `reserve_cancelled`     | ✅         | ✅           | ✅             | opcional¹    |
| `payout`                | ✅         | ✅           | ✅             | opcional¹    |
| `adjustment_credit`     | opcional   | opcional     | opcional       | —            |
| `adjustment_debit`      | opcional   | opcional     | opcional       | —            |

¹ `content_type` só faz sentido para movimentos atrelados a uma entrega
específica (ex.: pagamento por entrega `price`, gasto CPM por publicação).
Quando o movimento agrega múltiplos formatos, omitir.

---

## 4. Exemplo de payload (resposta nova)

```json
{
  "items": [
    {
      "id": "mv_01HZ...",
      "type": "reserve_created",
      "amount_cents": -150000,
      "balance_after_cents": 4500000,
      "available_after_cents": 3000000,
      "committed_after_cents": 1500000,
      "description": "Reserva de pagamento para aprovação na campanha",
      "occurred_at": "2026-05-22T13:45:18.000Z",
      "actor": {
        "type": "user",
        "user_id": 42,
        "name": "Maria Costa"
      },
      "related": {
        "charge_id": null,
        "campaign_id": 88,
        "campaign_user_id": 1024,
        "hold_id": 311,

        "campaign_title": "Lançamento Verão 2026",
        "campaign_public_id": "c4e8f0d1-…",
        "campaign_banner_url": "uploads/campaigns/c4e8f0d1/banner.jpg",
        "campaign_payment_method": "price",

        "influencer_name": "João Silva",
        "influencer_username": "joaosilva",
        "influencer_avatar": "uploads/users/42/avatar.jpg",

        "social_network": "instagram",
        "social_network_label": "Instagram",
        "content_type": "reels"
      }
    }
  ],
  "next_cursor": "eyJpZCI6Im12XzAxIn0="
}
```

---

## 5. Query SQL sugerida (PostgreSQL)

JOIN único na query de listagem — sem subqueries por linha:

```sql
SELECT
  bm.id,
  bm.type,
  bm.amount_cents,
  bm.balance_after_cents,
  bm.available_after_cents,
  bm.committed_after_cents,
  bm.description,
  bm.occurred_at,
  -- actor
  bm.actor_type,
  bm.actor_user_id,
  COALESCE(actor.name, '') AS actor_name,
  -- related (legado)
  bm.charge_id,
  bm.campaign_id,
  bm.campaign_user_id,
  bm.hold_id,
  -- enriquecimento campanha
  c.title          AS campaign_title,
  c.public_id      AS campaign_public_id,
  c.banner_url     AS campaign_banner_url,
  c.payment_method AS campaign_payment_method,
  -- enriquecimento influencer
  u.name           AS influencer_name,
  u.avatar         AS influencer_avatar,
  -- enriquecimento rede / formato
  sn.username      AS influencer_username,
  sn.type          AS social_network,
  bm.content_type  AS content_type
FROM balance_movements bm
LEFT JOIN users actor       ON actor.id = bm.actor_user_id
LEFT JOIN campaigns c       ON c.id     = bm.campaign_id
LEFT JOIN campaign_users cu ON cu.id    = bm.campaign_user_id
LEFT JOIN users u           ON u.id     = cu.user_id
LEFT JOIN social_networks sn ON sn.id   = bm.social_network_id
WHERE bm.workspace_id = $1
  AND ($2::movement_type[] IS NULL OR bm.type = ANY($2))
  AND ($3::timestamptz IS NULL OR bm.occurred_at >= $3)
  AND ($4::timestamptz IS NULL OR bm.occurred_at <  $4)
  AND ($5::bigint IS NULL OR bm.id < $5)   -- cursor (keyset)
ORDER BY bm.id DESC
LIMIT $6;
```

> Para suportar `social_network_id` o backend pode precisar adicionar essa
> coluna em `balance_movements`. Alternativa: derivar pelo `campaign_user_id`
> + a rede do contrato (quando o domínio garante 1:1).

---

## 6. Índices recomendados

```sql
-- Listagem por workspace + cursor keyset
CREATE INDEX IF NOT EXISTS idx_balance_movements_workspace_id_desc
  ON balance_movements (workspace_id, id DESC);

-- Filtro por tipo (multi-valor via ANY)
CREATE INDEX IF NOT EXISTS idx_balance_movements_workspace_type
  ON balance_movements (workspace_id, type, id DESC);

-- JOINs frequentes
CREATE INDEX IF NOT EXISTS idx_balance_movements_campaign_user
  ON balance_movements (campaign_user_id) WHERE campaign_user_id IS NOT NULL;
```

p95 alvo: **< 200ms** para `limit=20` em workspaces com 100k+ movimentos.

---

## 7. Decisões / pontos pendentes

1. **`social_network_id` no schema** — se for caro adicionar, o backend
   pode resolver via `campaign_user_id` + rede do conteúdo associado.
2. **`content_type` por movimento** — em campanhas `price`, cada entrega
   gera uma reserva separada com formato (post/reels/etc). Confirmar se a
   tabela `balance_movements` carrega esse contexto ou se precisa JOIN
   com `campaign_contents`.
3. **Privacidade** — nenhum dos campos novos é PII sensível (nome público,
   avatar público, handle público). Não há violação LGPD.
4. **Cache** — frontend usa `staleTime: 15s` no `useMovements`. Backend
   pode aplicar HTTP `Cache-Control: max-age=10, private` se quiser.

---

## 8. Checklist de implementação

- [ ] Adicionar campos enriquecidos ao DTO de resposta de
      `GET /balance/workspace/:id/movements`.
- [ ] Atualizar a query SQL com os JOINs descritos na seção 5.
- [ ] Garantir índices da seção 6.
- [ ] (opcional) Adicionar coluna `social_network_id` em
      `balance_movements` se ainda não existir.
- [ ] Testes E2E: criação de reserva → conferir que o item retornado
      traz `campaign_title`, `influencer_name`, `social_network`.
- [ ] Documentar no contrato OpenAPI (se houver).

Frontend já está pronto — assim que o payload chegar com os campos novos
a UI renderiza automaticamente. Campos ausentes seguem o fallback elegante
(ex.: `Campanha #123` quando só vem o ID).
