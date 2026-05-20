# API — Super Admin Dashboard

Conjunto de endpoints administrativos com **escopo global** (sem `Workspace-Id`)
para a tela de Super Admin Dashboard. Consome agregações cross-workspace de
criadores, campanhas, financeiro e métricas SaaS.

> **Status:** especificação. Frontend já implementado em
> `src/screens/(private)/(admin)/admin.dashboard.tsx`, consumindo via
> `src/shared/services/admin-dashboard.ts` + `src/hooks/use-admin-dashboard.ts`.
> Enquanto backend não implementa, a tela mostra empty/error states.
> Tela visível só pra usuários platform admin — ver §3.

---

## Sumário

1. [Princípios e prioridades](#1-princípios-e-prioridades)
2. [Contrato dos endpoints](#2-contrato-dos-endpoints)
3. [Controle de acesso](#3-controle-de-acesso)
4. [Modelagem de dados](#4-modelagem-de-dados)
5. [Performance](#5-performance)
6. [Segurança](#6-segurança)
7. [Convenções de payload](#7-convenções-de-payload)
8. [Definições de negócio](#8-definições-de-negócio)
9. [Cálculo das métricas SaaS](#9-cálculo-das-métricas-saas)
10. [Observabilidade / SLOs](#10-observabilidade--slos)
11. [Checklist de implementação](#11-checklist-de-implementação)
12. [Decisões pendentes](#12-decisões-pendentes)

---

## 1. Princípios e prioridades

Seguindo `CLAUDE.md`, qualquer trade-off respeita: **Performance → Segurança →
Escalabilidade**.

1. **Performance** — agregações globais precisam ser sub-500ms p95. Queries
   pesadas devem usar materialized views ou snapshots diários, não scans
   on-the-fly de tabelas com milhões de linhas.
2. **Segurança** — endpoints só acessíveis por `platform_role = 'admin'`.
   Nunca expor dados financeiros sem o guard. Auditoria de acesso é
   obrigatória (logs com `user_id`, `endpoint`, `from/to`).
3. **Escalabilidade** — KPIs simples devem ser baratos via materialized
   views ou contadores. KPIs complexos (CHURN, NRR) rodam em job batch
   noturno e gravam snapshots em `platform_metrics_daily`.

---

## 2. Contrato dos endpoints

Todos os endpoints abaixo:

- Prefixo: `/api/admin/dashboard/*` (separado de `/api/backoffice/*`).
- Protegidos por `PlatformAdminGuard` (ver §3).
- **Não enviam `Workspace-Id`** no header — escopo global.
- Headers obrigatórios:
  ```
  Authorization: Bearer {token}
  Client-Type: backoffice
  Accept: application/json
  ```
- Query params de período comuns: `from=YYYY-MM-DD&to=YYYY-MM-DD`.
- Respostas seguem padrão `{ data: ... }` consistente com o resto da API.

### 2.1 Tabela de endpoints

| Método | Endpoint                                              | Descrição                                                                                  | Query params                                  |
|--------|-------------------------------------------------------|--------------------------------------------------------------------------------------------|-----------------------------------------------|
| GET    | `/admin/dashboard/summary`                            | Bundle: KPIs de criadores, campanhas e financeiro em uma única chamada                     | `from, to`                                    |
| GET    | `/admin/dashboard/creators/stats`                     | KPIs de criadores + série temporal `growth_series`                                         | `from, to, granularity=day|week|month`        |
| GET    | `/admin/dashboard/creators/niche-distribution`        | Top-N nichos por número de criadores                                                       | `from, to, limit=8`                           |
| GET    | `/admin/dashboard/creators/size-distribution`         | Distribuição por categoria (UGC/Nano/Micro/Mid/Macro/Mega)                                 | `from, to`                                    |
| GET    | `/admin/dashboard/creators/geo-distribution`          | Contagem de criadores por UF (fase 2)                                                      | `from, to`                                    |
| GET    | `/admin/dashboard/campaigns/stats`                    | KPIs de campanhas + série temporal `evolution`                                             | `from, to, granularity=day|week|month`        |
| GET    | `/admin/dashboard/financial/stats`                    | KPIs financeiros + série temporal `volume_series`                                          | `from, to, granularity=day|week|month`        |
| GET    | `/admin/dashboard/saas/metrics`                       | CHURN, LTV, ARPU, NRR, ticket médio, ativação, lifetime, CAC opcional                      | `from, to`                                    |
| GET    | `/admin/dashboard/workspaces/ranking`                 | Top-N workspaces ordenados por critério                                                    | `from, to, sort_by=campaigns|volume|influencers, limit=10` |

### 2.2 Exemplo `GET /admin/dashboard/summary`

```json
{
  "data": {
    "period": { "from": "2026-04-20", "to": "2026-05-20" },
    "creators": {
      "total": 4820,
      "new_in_period": 312,
      "active_in_period": 1940,
      "total_social_networks": 9640,
      "avg_networks_per_creator": 2.0,
      "activation_rate": 40.2
    },
    "campaigns": {
      "total": 280,
      "active": 34,
      "finished": 198,
      "draft": 48,
      "created_in_period": 67,
      "avg_influencers_per_campaign": 8.4,
      "workspaces_with_active_campaigns": 22,
      "draft_to_active_rate": 78.5
    },
    "financial": {
      "custody_balance": 182500.00,
      "total_volume_in_period": 940000.00,
      "paid_to_creators": 720000.00,
      "total_deposits": 900000.00,
      "platform_fees": 28200.00,
      "pending_payments": 15400.00
    }
  }
}
```

### 2.3 Exemplo `GET /admin/dashboard/creators/stats`

```json
{
  "data": {
    "total": 4820,
    "new_in_period": 312,
    "active_in_period": 1940,
    "total_social_networks": 9640,
    "avg_networks_per_creator": 2.0,
    "activation_rate": 40.2,
    "growth_series": [
      { "bucket": "2026-04-20", "value": 12 },
      { "bucket": "2026-04-27", "value": 28 },
      { "bucket": "2026-05-04", "value": 45 }
    ]
  }
}
```

### 2.4 Exemplo `GET /admin/dashboard/campaigns/stats`

```json
{
  "data": {
    "total": 280, "active": 34, "finished": 198, "draft": 48,
    "created_in_period": 67, "avg_influencers_per_campaign": 8.4,
    "workspaces_with_active_campaigns": 22, "draft_to_active_rate": 78.5,
    "evolution": [
      { "bucket": "2026-03", "created": 18, "published": 12, "finished": 8 },
      { "bucket": "2026-04", "created": 22, "published": 18, "finished": 14 },
      { "bucket": "2026-05", "created": 27, "published": 24, "finished": 20 }
    ]
  }
}
```

### 2.5 Exemplo `GET /admin/dashboard/financial/stats`

```json
{
  "data": {
    "custody_balance": 182500.00,
    "total_volume_in_period": 940000.00,
    "paid_to_creators": 720000.00,
    "total_deposits": 900000.00,
    "platform_fees": 28200.00,
    "pending_payments": 15400.00,
    "volume_series": [
      { "bucket": "2026-03", "deposits": 280000.00, "payments": 220000.00 },
      { "bucket": "2026-04", "deposits": 305000.00, "payments": 240000.00 },
      { "bucket": "2026-05", "deposits": 315000.00, "payments": 260000.00 }
    ]
  }
}
```

### 2.6 Exemplo `GET /admin/dashboard/creators/niche-distribution`

```json
{
  "data": [
    { "niche_id": 1, "niche_name": "Moda & Beleza", "count": 1240, "percentage": 25.7 },
    { "niche_id": 2, "niche_name": "Fitness", "count": 890, "percentage": 18.5 },
    { "niche_id": 9, "niche_name": "Outros", "count": 380, "percentage": 7.9 }
  ]
}
```

### 2.7 Exemplo `GET /admin/dashboard/creators/size-distribution`

```json
{
  "data": [
    { "bucket": "ugc",   "count": 1240, "percentage": 25.7 },
    { "bucket": "nano",  "count":  980, "percentage": 20.3 },
    { "bucket": "micro", "count":  1450,"percentage": 30.1 },
    { "bucket": "mid",   "count":  720, "percentage": 14.9 },
    { "bucket": "macro", "count":  300, "percentage": 6.2 },
    { "bucket": "mega",  "count":  130, "percentage": 2.7 }
  ]
}
```

### 2.8 Exemplo `GET /admin/dashboard/saas/metrics`

```json
{
  "data": {
    "churn_rate": 5.4,
    "ltv_estimate": 18420.00,
    "arpu": 2150.50,
    "nrr": 112.3,
    "avg_ticket_per_campaign": 6280.00,
    "activation_rate_new_clients": 58.7,
    "avg_customer_lifetime_days": 412,
    "cac": null
  }
}
```

### 2.9 Exemplo `GET /admin/dashboard/workspaces/ranking`

```json
{
  "data": [
    {
      "workspace_id": "ws_abc",
      "workspace_name": "Marca X",
      "active_campaigns": 8,
      "total_volume": 120000.00,
      "influencers_contracted": 64
    }
  ]
}
```

---

## 3. Controle de acesso

### 3.1 Conceito novo: papel de plataforma

Hoje o backend usa papéis em nível de workspace (`owner | admin | member` em
`WorkspaceRole`). É necessário um conceito **independente do workspace**
armazenado no próprio usuário backoffice.

**Sugestão (mais simples):** coluna booleana `is_platform_admin` em
`backoffice_users` (ou equivalente).

**Sugestão escalável:** coluna `platform_role` enum (`null | 'admin' | 'support'`)
+ tabela `platform_abilities` para granularidade futura (ex.: `'platform:admin'`,
`'platform:financial_read'`).

### 3.2 Migration sugerida

```sql
ALTER TABLE backoffice_users
  ADD COLUMN platform_role VARCHAR(32) DEFAULT NULL;
CREATE INDEX idx_backoffice_users_platform_role
  ON backoffice_users (platform_role)
  WHERE platform_role IS NOT NULL;
```

### 3.3 Expor em `GET /me`

A resposta de `GET /api/backoffice/me` deve incluir uma flag boolean para que o
frontend renderize/oculte o item de menu e o guard de rota sem chamada extra:

```json
{
  "data": {
    "id": 1,
    "name": "Murillo",
    "email": "admin@hypeapp.com",
    "is_platform_admin": true,
    "platform_role": "admin"
  }
}
```

O frontend já aceita qualquer uma das três formas — ver `src/shared/services/me.ts:13-19`:
- Campo direto `is_platform_admin: true`
- `platform_role === "admin"`
- `abilities` contém `"platform:admin"`

### 3.4 Guards backend (NestJS)

```typescript
@UseGuards(AuthGuard, ClientTypeGuard, PlatformAdminGuard)
@Controller('admin/dashboard')
export class AdminDashboardController { ... }

// PlatformAdminGuard verifica:
// 1. user autenticado (delegado a AuthGuard)
// 2. client_type === 'backoffice' (delegado a ClientTypeGuard)
// 3. user.platform_role === 'admin' OU user.is_platform_admin === true
//    OU ability 'platform:admin' ativa
// NÃO usa WorkspaceGuard — sem escopo de workspace.
```

### 3.5 Auditoria

Toda chamada a `/api/admin/dashboard/*` deve gerar entrada em
`platform_audit_log` com:
- `user_id`
- `endpoint`
- `query` (from/to/extras)
- `response_time_ms`
- `status_code`
- `created_at`

---

## 4. Modelagem de dados

### 4.1 Tabela de snapshots diários (recomendado)

Para evitar queries pesadas on-the-fly em tabelas grandes, criar uma tabela
de snapshots populada por job noturno (CRON ~03:00):

```sql
CREATE TABLE platform_metrics_daily (
  date DATE PRIMARY KEY,
  -- Creators
  creators_total INT NOT NULL,
  creators_new INT NOT NULL,
  creators_active INT NOT NULL,
  social_networks_total INT NOT NULL,
  -- Campaigns
  campaigns_total INT NOT NULL,
  campaigns_active INT NOT NULL,
  campaigns_finished INT NOT NULL,
  campaigns_draft INT NOT NULL,
  campaigns_created INT NOT NULL,
  -- Financial (em reais; aceita NUMERIC(14,2))
  custody_balance NUMERIC(14,2) NOT NULL,
  volume_total NUMERIC(14,2) NOT NULL,
  paid_to_creators NUMERIC(14,2) NOT NULL,
  total_deposits NUMERIC(14,2) NOT NULL,
  platform_fees NUMERIC(14,2) NOT NULL,
  pending_payments NUMERIC(14,2) NOT NULL,
  -- SaaS
  workspaces_active INT NOT NULL,
  churn_rate NUMERIC(5,2),
  arpu NUMERIC(14,2),
  nrr NUMERIC(5,2),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_pmd_date_range ON platform_metrics_daily (date);
```

Endpoints de KPIs simples leem direto desta tabela (uma linha por dia no
range). Endpoints com série temporal podem usar agregação por `bucket`
(`date_trunc('week', date)`).

### 4.2 Índices necessários nas tabelas operacionais

Mesmo com snapshot, o job noturno precisa fazer agregações eficientes:

```sql
CREATE INDEX idx_users_created_at ON users (created_at);
CREATE INDEX idx_campaigns_created_at ON campaigns (created_at);
CREATE INDEX idx_campaigns_status ON campaigns (status);
CREATE INDEX idx_campaign_users_updated_at ON campaign_users (updated_at);
CREATE INDEX idx_financial_transactions_workspace_created
  ON financial_transactions (workspace_id, created_at);
CREATE INDEX idx_financial_transactions_type_created
  ON financial_transactions (type, created_at);
```

### 4.3 Campo `followers` consolidado por criador (necessário)

Para `size-distribution` ser performático, deve haver uma coluna materializada
por criador com o maior número de seguidores entre suas redes:

```sql
ALTER TABLE users ADD COLUMN max_followers INT DEFAULT 0;
CREATE INDEX idx_users_max_followers ON users (max_followers);
```

Atualizar via trigger ao mudar `social_networks.followers`, ou em job noturno.
Sem isso, classificação por tamanho exige JOIN + MAX por user a cada request —
inaceitável em base grande.

---

## 5. Performance

### 5.1 Estratégia geral

| Tipo de KPI                     | Estratégia                                       | SLO p95 |
|---------------------------------|--------------------------------------------------|---------|
| KPIs simples (counts, sums)     | Materialized view ou contadores incrementais     | 100ms   |
| Séries temporais (creators/campaigns/financial) | Leitura de `platform_metrics_daily` por range  | 200ms   |
| Distribuições (niche/size)      | Materialized view refrescada de hora em hora     | 300ms   |
| SaaS metrics (CHURN/LTV/NRR/etc)| Cálculo em job noturno, leitura direta da tabela | 200ms   |
| Ranking de workspaces           | Materialized view com índice ordenado            | 300ms   |
| `summary` (bundle de 3 blocos)  | Composição em 1 query da tabela snapshot         | 250ms   |

### 5.2 Cache HTTP

- `Cache-Control: private, max-age=60` em endpoints não-financeiros.
- Financeiros e `summary`: `max-age=0, must-revalidate` (frontend já refeta a
  cada 5 min via React Query).

---

## 6. Segurança

1. **Guard obrigatório** em todos os endpoints (§3).
2. **Auditoria** de toda chamada (§3.5).
3. **Rate limit dedicado**: 60 req/min por usuário admin é suficiente.
4. **Mascarar valores em logs** — nunca logar `total_volume`, `custody_balance`
   etc. em logs aplicacionais.
5. **CORS restrito** ao domínio do backoffice; nada de `*`.

---

## 7. Convenções de payload

- **Valores financeiros**: em reais (BRL) como `number` decimal (ex.: `182500.00`).
  Não usar centavos no payload — frontend já trata `number` direto via
  `formatReais` em `src/shared/utils/masks.ts`.
- **Datas**: ISO 8601 (`YYYY-MM-DD`). Sem timezone offset para datas puras.
- **Percentuais**: número decimal já em base 100 (ex.: `40.2` significa 40,2%).
  Frontend não multiplica por 100; só formata.
- **Buckets de série temporal**: string baseada na granularidade:
  - `day` → `YYYY-MM-DD`
  - `week` → `YYYY-MM-DD` (sempre o início da semana ISO)
  - `month` → `YYYY-MM`
- **Tamanho de criador**: enum em snake_case (`ugc | nano | micro | mid | macro | mega`).

---

## 8. Definições de negócio

### 8.1 Criador "ativo no período"

Criador que **participou de ≥1 campanha** com `campaign_users.updated_at`
dentro de `[from, to]`. Não basta criar conta — precisa ter ação.

### 8.2 Workspace "ativo"

Workspace que **teve ≥1 campanha criada ou atualizada nos últimos 30 dias**
contados a partir do `to` da consulta.

### 8.3 Workspace "churned"

Workspace que era ativo no período `[from-30d, from]` e **não é mais ativo**
em `[to-30d, to]`. Usa a definição de "ativo" da §8.2.

### 8.4 Classificação por tamanho (`size-distribution`)

| Bucket | Range de `max_followers`         |
|--------|----------------------------------|
| `ugc`  | `< 1.000` ou sem rede social     |
| `nano` | `1.000 — 9.999`                  |
| `micro`| `10.000 — 99.999`                |
| `mid`  | `100.000 — 499.999`              |
| `macro`| `500.000 — 999.999`              |
| `mega` | `≥ 1.000.000`                    |

### 8.5 Status de campanha

| Frontend          | Tabela `campaigns.status`        |
|-------------------|----------------------------------|
| Ativa             | `active`, `published`            |
| Finalizada        | `finished`, `completed`          |
| Rascunho          | `draft`                          |

### 8.6 Tipos de transação financeira

Backend deve mapear o que tiver hoje para os tipos canônicos usados na resposta:

| Tipo canônico         | Significado                                            |
|-----------------------|--------------------------------------------------------|
| `deposit`             | Aporte do workspace para a plataforma                  |
| `payment_to_creator`  | Pagamento liberado para criador                        |
| `platform_fee`        | Comissão/taxa retida pela Hype App                     |
| `hold`                | Valor retido em custódia (não realizado ainda)         |
| `refund`              | Estorno (caso exista)                                  |

⚠️ Esses nomes podem não bater com a nomenclatura atual do banco. Mapeamento é
responsabilidade do controller — manter o payload da API estável.

---

## 9. Cálculo das métricas SaaS

Recomenda-se que TODAS sejam pré-calculadas em job noturno e gravadas em
`platform_metrics_daily`. Endpoint só lê, nunca calcula on-the-fly.

### 9.1 Churn rate

```
CHURN = (workspaces_inativos_no_periodo / workspaces_ativos_inicio) × 100
```

Cálculo:
- `workspaces_ativos_inicio` = `COUNT` de workspaces com ≥1 campanha
  criada/atualizada em `[from-30d, from]`.
- `workspaces_inativos_no_periodo` = subset dos anteriores que **não** estão
  ativos em `[to-30d, to]`.

### 9.2 ARPU

```
ARPU = SUM(platform_fees em [from, to]) / COUNT(workspaces_ativos em [from, to])
```

### 9.3 LTV estimado

Forma simples (suficiente para MVP):

```
LTV = ARPU × (1 / CHURN_rate)   -- onde CHURN_rate é decimal (0.054 não 5.4)
```

Quando houver workspaces "encerrados" suficientes (>20% da base), evoluir para:

```
LTV = AVG(SUM(platform_fees por workspace_id durante toda a vida))
```

### 9.4 NRR (Net Revenue Retention)

```
NRR = (MRR_inicio + expansão - contração - churn) / MRR_inicio × 100
```

Aproximação operacional com transações reais:

```
Para cada workspace_id presente em [from-30d, from]:
  receita_anterior = SUM(platform_fees em [from-30d, from])
  receita_atual    = SUM(platform_fees em [to-30d, to])

NRR = SUM(receita_atual) / SUM(receita_anterior) × 100
```

### 9.5 Ticket médio por campanha

```
ticket = AVG(SUM(financial_transactions.amount por campaign_id))
         WHERE campaign.status IN ('finished','completed')
         AND campaign.finished_at IN [from, to]
```

### 9.6 Taxa de ativação de novos clientes

```
ativacao = (novos_workspaces_com_1a_campanha_em_30d / novos_workspaces) × 100
```

Para cada workspace criado em `[from, to]`, verificar se existe pelo menos
1 campanha com `created_at BETWEEN workspace.created_at AND workspace.created_at + 30d`.

### 9.7 Customer lifetime médio

```
Para cada workspace:
  primeiro_uso = MIN(campaign.created_at)
  ultimo_uso   = MAX(campaign.updated_at)
  lifetime_dias = ultimo_uso - primeiro_uso

AVG(lifetime_dias) sobre todos os workspaces com >0 campanhas
```

Para workspaces ativos hoje, `ultimo_uso = COALESCE(MAX(...), now())`.

### 9.8 CAC (manual)

Backend pode aceitar input manual via `POST /admin/dashboard/saas/cac` (fase 2)
que grava em `platform_metrics_config (key, value, valid_from)`. Endpoint
`saas/metrics` lê o valor mais recente. Por enquanto retorna `cac: null`.

---

## 10. Observabilidade / SLOs

- **Métricas Prometheus** por endpoint: `admin_dashboard_request_duration_seconds`,
  `admin_dashboard_request_errors_total`.
- **Logs estruturados** (JSON) com `user_id`, `endpoint`, `from`, `to`,
  `granularity`, `response_time_ms`.
- **Dashboard Grafana** dedicado para esses endpoints — alerta se p95 > 1s
  ou error rate > 1%.
- **Job noturno** de snapshot deve emitir métrica `platform_metrics_snapshot_completed_at`
  para monitorar se está rodando.

---

## 11. Checklist de implementação

### Banco
- [ ] Migration `ALTER TABLE backoffice_users ADD platform_role` ou `is_platform_admin`.
- [ ] Migration `CREATE TABLE platform_metrics_daily`.
- [ ] Migration `ALTER TABLE users ADD max_followers` + trigger ou job de update.
- [ ] Índices descritos em §4.2.
- [ ] Tabela `platform_audit_log` para auditoria.

### API
- [ ] `PlatformAdminGuard` (NestJS) sem `WorkspaceGuard`.
- [ ] Decorator `@RequirePlatformAbility('platform:admin')` se for granular.
- [ ] Endpoint `GET /admin/dashboard/summary`.
- [ ] Endpoint `GET /admin/dashboard/creators/stats`.
- [ ] Endpoint `GET /admin/dashboard/creators/niche-distribution`.
- [ ] Endpoint `GET /admin/dashboard/creators/size-distribution`.
- [ ] Endpoint `GET /admin/dashboard/creators/geo-distribution` (fase 2).
- [ ] Endpoint `GET /admin/dashboard/campaigns/stats`.
- [ ] Endpoint `GET /admin/dashboard/financial/stats`.
- [ ] Endpoint `GET /admin/dashboard/saas/metrics`.
- [ ] Endpoint `GET /admin/dashboard/workspaces/ranking`.
- [ ] Atualizar `GET /me` para incluir `is_platform_admin` / `platform_role`.

### Jobs
- [ ] Job noturno (CRON 03:00) que popula `platform_metrics_daily` do dia anterior.
- [ ] Job horário (opcional) que refresca materialized views de
      niche-distribution e size-distribution.
- [ ] Job noturno que recalcula `users.max_followers` (ou trigger ao mudar
      `social_networks.followers`).

### Observabilidade
- [ ] Métricas Prometheus.
- [ ] Logs estruturados.
- [ ] Dashboard Grafana com alertas p95 e error rate.
- [ ] Documentar todos os endpoints no Swagger (`/api/docs`).

---

## 12. Decisões pendentes

Itens que precisam ser definidos com o time backend antes de começar:

1. **Schema financeiro** — quais tabelas armazenam transações hoje?
   Os nomes usados aqui (`financial_transactions`, `wallets`) são sugestões.
   Confirmar nomes reais antes de implementar.
2. **Taxa/comissão** — a plataforma cobra taxa hoje? Se sim, qual campo
   representa? Se ainda não cobra, a estrutura precisa estar pronta pra quando
   passar a cobrar. Por enquanto `platform_fees` pode retornar `0.00`.
3. **`max_followers`** — preferência por trigger ao mudar `social_networks`
   ou job noturno? Trigger é mais consistente; job é mais leve em escrita.
4. **Mapeamento de status** — confirmar quais status reais existem hoje em
   `campaigns.status` e como mapear para `active | finished | draft` no payload.
5. **Definição de churn** — 30 dias sem atividade é a regra de negócio
   correta? Validar com produto antes de implementar.
6. **Granularidade adaptiva** — para períodos > 6 meses, frontend pede
   `granularity=month`; backend pode ignorar o param e decidir sozinho a
   melhor granularidade? Decidir contrato.
7. **`platform_role` vs `is_platform_admin`** — qual abordagem? Booleana é
   mais simples; enum permite múltiplos papéis (admin, support, finance) no
   futuro. Recomendação: começar com booleana, evoluir quando precisar.
8. **CAC** — input manual via endpoint próprio ou via outro sistema (Notion,
   planilha) e injetar via integração? Decidir antes de implementar.
9. **Geo distribution** — `addresses` tem dado consistente o suficiente para
   distribuição por UF? Se a maioria dos criadores não preencheu endereço, a
   feature fica fraca; postergar pra quando enriquecer a base.
