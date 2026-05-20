# API — Super Admin Notifications

Sistema de notificações em massa para criadores do app mobile, disparadas pelo
Super Admin via backoffice. Suporta múltiplos canais (push, email, WhatsApp),
audiência segmentada e agendamento.

> **Status:** especificação. Frontend já implementado em
> `src/screens/(private)/(admin)/admin.notifications.tsx`, consumindo via
> `src/shared/services/admin-notifications.ts` + `src/hooks/use-admin-notifications.ts`.
> Tela visível só pra usuários platform admin (mesmo guard de
> `docs/api-super-admin-dashboard.md`).

---

## Sumário

1. [Princípios e prioridades](#1-princípios-e-prioridades)
2. [Contrato dos endpoints](#2-contrato-dos-endpoints)
3. [Modelagem de dados](#3-modelagem-de-dados)
4. [Audiência — resolução do filtro](#4-audiência--resolução-do-filtro)
5. [Worker de envio (jobs)](#5-worker-de-envio-jobs)
6. [Provedores por canal](#6-provedores-por-canal)
7. [Idempotência e retry](#7-idempotência-e-retry)
8. [Performance](#8-performance)
9. [Segurança e LGPD](#9-segurança-e-lgpd)
10. [Observabilidade / SLOs](#10-observabilidade--slos)
11. [Checklist de implementação](#11-checklist-de-implementação)
12. [Decisões pendentes](#12-decisões-pendentes)

---

## 1. Princípios e prioridades

Seguindo `CLAUDE.md`: **Performance → Segurança → Escalabilidade**.

1. **Performance** — resolver audiência de 100k+ criadores em <1s p95. O
   envio em si é assíncrono (worker), mas a estimativa (`estimate-audience`)
   roda síncrono e DEVE usar índices apropriados.
2. **Segurança** — uma chamada errada pode disparar centenas de milhares de
   mensagens com custo financeiro (WhatsApp/SMS pagos) e dano de imagem.
   Idempotência obrigatória, rate limiting agressivo, audit log completo.
3. **Escalabilidade** — disparo enfileirado em batches (~500 destinatários
   por job). Worker concurrency configurável. Backpressure pra provedores
   externos (Twilio rate limit é ~80 msg/s default).

---

## 2. Contrato dos endpoints

Todos os endpoints abaixo:

- Prefixo: `/api/admin/notifications/*`.
- Protegidos por `PlatformAdminGuard` (ver `docs/api-super-admin-dashboard.md` §3).
- **Não enviam `Workspace-Id`** — escopo global.
- POSTs aceitam header `Idempotency-Key` (UUID) — frontend já envia.

### 2.1 Tabela de endpoints

| Método | Endpoint                                            | Descrição                                                                   |
|--------|-----------------------------------------------------|-----------------------------------------------------------------------------|
| GET    | `/admin/notifications`                              | Lista notificações criadas, filtráveis por status                           |
| GET    | `/admin/notifications/{id}`                         | Detalhe + estatísticas por canal                                            |
| POST   | `/admin/notifications`                              | Cria nova notificação (envia imediatamente ou agenda)                       |
| POST   | `/admin/notifications/estimate-audience`            | Calcula quantos criadores serão atingidos por um filtro                     |
| POST   | `/admin/notifications/{id}/cancel`                  | Cancela agendamento antes do envio                                          |
| GET    | `/admin/notifications/options/campaigns`            | Lookup global de campanhas para o filtro de audiência                       |

### 2.2 `POST /admin/notifications`

Cria uma notificação. Se `scheduled_at` é `null`/omitido, enfileira imediato.

**Request:**
```json
{
  "title": "Nova campanha aberta para você!",
  "body": "A campanha XYZ está procurando criadores do seu perfil. Confira agora.",
  "cta_url": "hypeapp://campaigns/abc123",
  "channels": ["push", "email"],
  "audience": { "type": "niche", "niche_ids": [3, 7] },
  "scheduled_at": null
}
```

**Headers obrigatórios:**
```
Authorization: Bearer {token}
Client-Type: backoffice
Content-Type: application/json
Idempotency-Key: 550e8400-e29b-41d4-a716-446655440000
```

**Response (201):**
```json
{
  "data": {
    "id": "notif_01HX...",
    "title": "Nova campanha aberta para você!",
    "body": "A campanha XYZ está procurando criadores...",
    "cta_url": "hypeapp://campaigns/abc123",
    "channels": ["push", "email"],
    "audience": { "type": "niche", "niche_ids": [3, 7] },
    "status": "sending",
    "scheduled_at": null,
    "sent_at": null,
    "created_at": "2026-05-20T18:30:00-03:00",
    "created_by": { "id": 1, "name": "Murillo" },
    "stats": { "total_recipients": 1247, "delivered": 0, "failed": 0 }
  }
}
```

### 2.3 `POST /admin/notifications/estimate-audience`

Retorna a quantidade de destinatários sem disparar nada. Frontend chama via
botão "Calcular audiência" antes do envio.

**Request:**
```json
{
  "audience": {
    "type": "followers",
    "min_followers": 10000,
    "max_followers": 100000
  }
}
```

**Response:**
```json
{
  "data": {
    "total_recipients": 3420,
    "by_channel": {
      "push": 3380,
      "email": 3290,
      "whatsapp": 1850
    }
  }
}
```

`by_channel` mostra elegibilidade — nem todo criador tem device token registrado
(push), email verificado, ou opt-in de WhatsApp. Esses números **excluem
opt-outs** (ver §9).

### 2.4 `GET /admin/notifications`

Query params opcionais: `status`, `page`, `per_page`.

```json
{
  "data": [
    {
      "id": "notif_01HX...",
      "title": "Nova campanha aberta",
      "body": "...",
      "cta_url": null,
      "channels": ["push"],
      "audience": { "type": "all" },
      "status": "sent",
      "scheduled_at": null,
      "sent_at": "2026-05-20T18:30:42-03:00",
      "created_at": "2026-05-20T18:30:00-03:00",
      "created_by": { "id": 1, "name": "Murillo" },
      "stats": { "total_recipients": 4820, "delivered": 4780, "failed": 40 }
    }
  ]
}
```

### 2.5 `POST /admin/notifications/{id}/cancel`

Cancela uma notificação **somente se status = `scheduled`**. Para outros
estados retorna `409 Conflict`. Em sucesso retorna o detalhe com
`status: "cancelled"`.

### 2.6 `GET /admin/notifications/options/campaigns`

Lookup leve para o select de campanha no filtro de audiência. Query param
opcional `search` (busca por título). Pageado se necessário.

```json
{
  "data": [
    {
      "id": "camp_abc123",
      "title": "Verão 2026 — Praia",
      "workspace_name": "Marca X"
    }
  ]
}
```

Backend deve usar `pg_trgm` ou similar pra busca eficiente por título.

### 2.7 Tipos de filtro de audiência

A union `audience` aceita 5 variantes:

```typescript
type AdminAudienceFilter =
  | { type: "all" }
  | { type: "campaign"; campaign_id: string }
  | { type: "niche"; niche_ids: number[] }
  | { type: "followers"; min_followers: number; max_followers: number }
  | { type: "location"; states?: string[]; cities?: string[] };
```

**Validações backend obrigatórias:**

- `campaign`: `campaign_id` deve existir.
- `niche`: array com 1+ IDs válidos em `niches`.
- `followers`: `max > min`, ambos `>= 0`, cap superior em `10_000_000`.
- `location`: ao menos `states` ou `cities` deve estar populado.
  Estados em código ISO-3166-2 (`SP`, `RJ`, etc.).

---

## 3. Modelagem de dados

### 3.1 Tabela `platform_notifications`

```sql
CREATE TABLE platform_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(120) NOT NULL,
  body TEXT NOT NULL,
  cta_url TEXT,
  channels TEXT[] NOT NULL,          -- ['push','email','whatsapp']
  audience_type VARCHAR(20) NOT NULL,-- 'all'|'campaign'|'niche'|'followers'|'location'
  audience_payload JSONB NOT NULL,   -- dump da union completa
  status VARCHAR(20) NOT NULL DEFAULT 'scheduled',
  scheduled_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  created_by_user_id INT NOT NULL REFERENCES backoffice_users(id),
  idempotency_key UUID NOT NULL UNIQUE,
  total_recipients INT DEFAULT 0,
  delivered_count INT DEFAULT 0,
  failed_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_pn_status_scheduled
  ON platform_notifications (status, scheduled_at)
  WHERE status = 'scheduled';
CREATE INDEX idx_pn_created_at ON platform_notifications (created_at DESC);
CREATE INDEX idx_pn_idempotency ON platform_notifications (idempotency_key);
```

`idempotency_key` UNIQUE garante que o mesmo `Idempotency-Key` no header não
cria 2 registros — se vier duplicado, retorna o existente com 200.

### 3.2 Tabela `platform_notification_recipients`

Snapshot da audiência resolvida no momento do envio (não regenera filtro
durante worker — congela quem é destinatário).

```sql
CREATE TABLE platform_notification_recipients (
  id BIGSERIAL PRIMARY KEY,
  notification_id UUID NOT NULL REFERENCES platform_notifications(id) ON DELETE CASCADE,
  user_id INT NOT NULL,            -- referência a users (mobile)
  channels TEXT[] NOT NULL,        -- canais elegíveis para ESTE user
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  -- 'pending'|'sent'|'delivered'|'failed'|'opted_out'
  attempts SMALLINT DEFAULT 0,
  last_error TEXT,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_pnr_notification ON platform_notification_recipients (notification_id);
CREATE INDEX idx_pnr_status ON platform_notification_recipients (notification_id, status);
CREATE INDEX idx_pnr_user ON platform_notification_recipients (user_id);
```

### 3.3 Tabela `platform_notification_deliveries`

Log granular por canal por destinatário (cardinalidade `recipients × channels`).

```sql
CREATE TABLE platform_notification_deliveries (
  id BIGSERIAL PRIMARY KEY,
  notification_id UUID NOT NULL,
  recipient_id BIGINT NOT NULL REFERENCES platform_notification_recipients(id),
  channel VARCHAR(20) NOT NULL,    -- 'push'|'email'|'whatsapp'
  provider VARCHAR(20),            -- 'fcm'|'apns'|'sendgrid'|'twilio'
  provider_message_id TEXT,        -- ID do provedor para callbacks
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  -- 'pending'|'sent'|'delivered'|'read'|'failed'
  error_code VARCHAR(50),
  error_message TEXT,
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_pnd_notification_channel
  ON platform_notification_deliveries (notification_id, channel);
CREATE INDEX idx_pnd_provider_message
  ON platform_notification_deliveries (provider_message_id);
```

### 3.4 Tabela `platform_notification_opt_outs`

```sql
CREATE TABLE platform_notification_opt_outs (
  user_id INT NOT NULL,
  channel VARCHAR(20) NOT NULL,    -- 'push'|'email'|'whatsapp'|'marketing_all'
  reason VARCHAR(50),              -- 'user_request'|'bounce'|'whatsapp_block'
  opted_out_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (user_id, channel)
);
```

Lookup obrigatório antes de enfileirar: criadores em `opt_outs` para o canal
NÃO entram em `recipients`. Reduz custo + LGPD compliance.

### 3.5 Snapshot da audiência no `audience_payload`

Mesmo após cancelar/concluir, manter o filtro original no `audience_payload`
como JSONB. Permite auditoria ("quem o admin tentou atingir?") e debugging
de discrepâncias entre `estimate` e `total_recipients` real.

---

## 4. Audiência — resolução do filtro

### 4.1 Query base por tipo

| Tipo       | Query (PostgreSQL)                                                                                                  |
|------------|---------------------------------------------------------------------------------------------------------------------|
| `all`      | `SELECT id FROM users WHERE deleted_at IS NULL`                                                                     |
| `campaign` | `SELECT user_id FROM campaign_users WHERE campaign_id = ? AND deleted_at IS NULL`                                   |
| `niche`    | `SELECT id FROM users WHERE niche_id = ANY(?::int[]) OR id IN (SELECT user_id FROM user_niches WHERE niche_id = ANY(?))` |
| `followers`| `SELECT id FROM users WHERE max_followers BETWEEN ? AND ?` (depende de `max_followers` materializada)               |
| `location` | `SELECT u.id FROM users u JOIN addresses a ON a.user_id = u.id WHERE a.state = ANY(?) [AND a.city = ANY(?)]`        |

### 4.2 Filtro de elegibilidade por canal

Após resolver a base, aplicar:

```sql
-- push: tem device token registrado e não opted-out
EXISTS (SELECT 1 FROM device_tokens dt WHERE dt.user_id = u.id AND dt.active = true)
  AND NOT EXISTS (SELECT 1 FROM platform_notification_opt_outs WHERE user_id = u.id AND channel = 'push')

-- email: email_verified_at IS NOT NULL e não opted-out
-- whatsapp: phone IS NOT NULL e phone_verified_at IS NOT NULL e opt-in explícito para marketing
```

### 4.3 Performance da estimativa

Para `estimate-audience` ficar abaixo de 1s p95 mesmo com 100k+ criadores:

- Índice em `users.max_followers` (já documentado em
  `docs/api-super-admin-dashboard.md` §4.3).
- Índice em `addresses (user_id, state)` para filtro de localização.
- Índice composto em `campaign_users (campaign_id, deleted_at)` para
  audiência por campanha.
- Para `niche`: índice em `users (niche_id)` + materializar `user_niches`
  se houver muitos-pra-muitos.

### 4.4 Cap rígido

Limitar `total_recipients` a `200_000` por notificação. Acima disso, exigir
quebra em múltiplas notificações ou aprovação de tier superior. Frontend já
mostra warning a partir de 1.000, mas o cap é responsabilidade do backend.

---

## 5. Worker de envio (jobs)

### 5.1 Fluxo

```
[POST /admin/notifications]
  │
  ▼
1. Validar payload + idempotency check
  │
  ▼
2. Criar `platform_notifications` (status='scheduled' se scheduled_at, else 'sending')
  │
  ▼
3. Resolver audiência -> bulk insert em `platform_notification_recipients`
   (sem disparo ainda — só snapshot dos elegíveis por canal)
  │
  ▼
4. Enfileirar job batch: `dispatchNotification(notification_id)` no SQS/BullMQ
   - Se imediato: enfileira agora
   - Se agendado: enfileira com delay = (scheduled_at - now())
  │
  ▼
[Worker]
  │
  ▼
5. Lê `recipients` em batches de 500
  │
  ▼
6. Para cada recipient, dispara provedores por canal em PARALELO (await all)
   - push -> FCM/APNS
   - email -> SendGrid/AWS SES
   - whatsapp -> Twilio
  │
  ▼
7. Atualiza `deliveries` com `provider_message_id` + status='sent'
  │
  ▼
8. Webhooks dos provedores atualizam `deliveries.status` -> 'delivered'/'failed'
  │
  ▼
9. Job periódico (a cada 1min) atualiza counters em `platform_notifications`
   (`delivered_count`, `failed_count`) e marca `status='sent'` quando termina.
```

### 5.2 Recomendação de stack

- **Queue**: BullMQ (Redis) se Node, ou SQS se AWS-first.
- **Worker concurrency**: 4 workers paralelos × 500 destinatários/batch =
  ~2k destinatários/seg, suficiente pra atingir 200k em ~100s.
- **Twilio rate limit**: 80 msg/s default — implementar throttle dedicado
  pro canal WhatsApp.

### 5.3 Tratamento de cancelamento

Quando admin cancela notificação `scheduled`:
- Marca `status='cancelled'`.
- Remove job da queue (BullMQ `remove()` por ID ou flag de skip).
- Não há rollback necessário porque ainda não enviou nada.

Se cancelar durante `sending` (race condition rara): worker checa
`status` antes de cada batch. Se `cancelled`, para o processamento. Mensagens
já enviadas não voltam (irreversível).

---

## 6. Provedores por canal

### 6.1 Push

- **iOS**: APNS via FCM (recomendado) ou direto.
- **Android**: FCM.
- **Payload**:
  ```json
  {
    "notification": { "title": "...", "body": "..." },
    "data": { "cta_url": "hypeapp://..." },
    "android": { "priority": "high" },
    "apns": { "headers": { "apns-priority": "10" } }
  }
  ```
- **Device tokens** ficam em `device_tokens (user_id, token, platform, active)`.
  Quando FCM retorna `InvalidRegistration`, marcar `active = false` (cleanup
  automático em job noturno).

### 6.2 Email

- **Provedor sugerido**: SendGrid (custo competitivo em volume) ou AWS SES.
- **Template**: HTML com header HypeApp, body livre, CTA button quando
  `cta_url` informado.
- **From**: `notificacoes@hypeapp.com` (verified sender).
- **Reply-to**: `naoresponda@hypeapp.com`.
- **Tracking**: opens/clicks via tracking pixel + redirect link → webhook
  atualiza `deliveries.status='delivered'`/`'read'`.

### 6.3 WhatsApp (Twilio)

⚠️ **Mais complexo dos três** — não pode mandar texto livre.

- **Provedor**: Twilio WhatsApp Business API.
- **Templates HSM (Highly Structured Message)** registrados e aprovados pela
  Meta. Templates só com variáveis (`{{1}}`, `{{2}}`).
- **Mapeamento sugerido**: backend mantém 3-5 templates pré-aprovados:
  - `nova_campanha`: "{{1}}: {{2}} 🎯 Acesse: {{3}}"
  - `pagamento_liberado`: "Olá {{1}}! Seu pagamento de R$ {{2}} foi liberado."
  - `lembrete_geral`: "{{1}} — {{2}}"
- **Lógica**: backend escolhe o template mais apropriado baseado no contexto.
  Para MVP, usar `lembrete_geral` sempre (`{{1}}` = title, `{{2}}` = body).
- **Opt-in obrigatório**: criador deve ter aceitado receber comunicações
  marketing por WhatsApp (campo `users.whatsapp_marketing_opt_in = true`).
- **Sessão de 24h**: respostas do usuário abrem janela; fora dela, só templates.
  Notificações outbound sempre usam template.
- **Custo**: ~R$ 0,15-0,30 por mensagem (varia conforme volume). Considerar
  no orçamento.

### 6.4 Variáveis de configuração

```bash
# .env do backend
TWILIO_ACCOUNT_SID=ACxxx
TWILIO_AUTH_TOKEN=xxx
TWILIO_WHATSAPP_FROM=whatsapp:+551150500000
TWILIO_TEMPLATE_LEMBRETE_GERAL=HXxxx       # SID do template
FCM_SERVER_KEY=AAA...
SENDGRID_API_KEY=SG.xxx
```

---

## 7. Idempotência e retry

### 7.1 Idempotency Key

Frontend gera UUID v4 por mutação (já implementado em
`src/shared/services/admin-notifications.ts:48`). Backend:

1. Verifica `idempotency_key` UNIQUE constraint.
2. Se já existe: retorna o registro existente com status 200.
3. Se não existe: cria + retorna 201.

Janela de idempotência: 24h. Após esse tempo, mesma chave pode ser reusada
(garbage collect via job noturno).

### 7.2 Retry em delivery

- **Push**: 3 tentativas exponenciais (2s, 8s, 32s). Após 3 falhas, marca
  delivery como `failed` e desativa device token se erro = `InvalidRegistration`.
- **Email**: 5 tentativas (bounce vs deferred são tratados diferente — bounce
  permanente desativa email no `opt_outs`).
- **WhatsApp**: 3 tentativas. Erro 63016 (`opt-out`) registra opt-out.

---

## 8. Performance

| Operação                              | SLO p95 |
|---------------------------------------|---------|
| `estimate-audience` (até 100k base)   | 1s      |
| `POST /admin/notifications` (criação) | 2s      |
| Resolução de audiência + insert batch | 5s      |
| Worker disparo (500 destinatários)    | 30s     |
| GET /admin/notifications (lista)      | 300ms   |
| GET /admin/notifications/{id}         | 200ms   |

---

## 9. Segurança e LGPD

### 9.1 Auditoria

Toda chamada POST registra em `platform_audit_log`:
- `user_id` (admin que criou)
- `notification_id`
- `audience_type` + `total_recipients`
- `channels`
- IP + User-Agent

### 9.2 Opt-out

Endpoint público (link em todo email + setting in-app pra push/wpp):

```
GET /unsubscribe?token={signed_token}&channel={channel}
```

Token assinado contém `user_id + channel`. Insere em
`platform_notification_opt_outs` e exibe confirmação. Backend respeita opt-out
em `estimate-audience` e na resolução final.

### 9.3 Rate limit

- Por admin: 10 criações/hora.
- Por audiência: máx 200.000 destinatários por notificação.
- Em caso de violação: HTTP 429 com header `Retry-After`.

### 9.4 LGPD

- Audit log retém 5 anos.
- Recipients são deletados em cascade quando notificação é deletada.
- Right to be forgotten: deletar user em `users` cascateia em
  `recipients` e marca audit log com `user_id` anonimizado.

---

## 10. Observabilidade / SLOs

- **Prometheus metrics**:
  - `notifications_created_total{status}`
  - `notifications_recipients_count_histogram`
  - `notifications_delivery_duration_seconds{channel,provider}`
  - `notifications_delivery_failures_total{channel,provider,error_code}`
- **Logs estruturados** por delivery (level=INFO em sucesso, ERROR em falha).
- **Dashboard Grafana** dedicado com:
  - Volume por hora (24h rolling window)
  - Taxa de sucesso por canal
  - Latência p50/p95/p99 de delivery
  - Top 5 errors recentes
- **Alertas**:
  - Taxa de sucesso < 90% por 5min → crítico.
  - Worker queue lag > 5min → aviso.
  - Twilio rate limit hit > 10x/min → aviso.

---

## 11. Checklist de implementação

### Banco
- [ ] Migration `platform_notifications` (§3.1).
- [ ] Migration `platform_notification_recipients` (§3.2).
- [ ] Migration `platform_notification_deliveries` (§3.3).
- [ ] Migration `platform_notification_opt_outs` (§3.4).
- [ ] Migration `device_tokens` (se ainda não existe).
- [ ] Migration `users.whatsapp_marketing_opt_in BOOLEAN DEFAULT false`.
- [ ] Índices de §3.

### API
- [ ] `PlatformAdminGuard` reutilizado (já documentado).
- [ ] Endpoint `POST /admin/notifications` (com idempotency).
- [ ] Endpoint `POST /admin/notifications/estimate-audience`.
- [ ] Endpoint `GET /admin/notifications`.
- [ ] Endpoint `GET /admin/notifications/{id}`.
- [ ] Endpoint `POST /admin/notifications/{id}/cancel`.
- [ ] Endpoint `GET /admin/notifications/options/campaigns`.
- [ ] Endpoint público `GET /unsubscribe` (sem auth, com signed token).

### Worker
- [ ] Job `dispatchNotification(notification_id)` com batches de 500.
- [ ] Adapter para FCM/APNS (push).
- [ ] Adapter para SendGrid/SES (email).
- [ ] Adapter para Twilio (whatsapp + templates HSM).
- [ ] Job de cleanup de device tokens inválidos (noturno).
- [ ] Job de agregação de counters (a cada 1min).

### Webhooks
- [ ] Endpoint para receber callbacks do FCM (delivery status).
- [ ] Endpoint para receber callbacks do SendGrid (open/click/bounce).
- [ ] Endpoint para receber callbacks do Twilio (delivered/read/failed).

### Templates WhatsApp
- [ ] Registrar template `lembrete_geral` no Twilio + aprovar com Meta.
- [ ] Registrar template `nova_campanha` (opcional, fase 2).
- [ ] Registrar template `pagamento_liberado` (opcional, fase 2).

### Observabilidade
- [ ] Métricas Prometheus de §10.
- [ ] Logs estruturados.
- [ ] Dashboard Grafana.
- [ ] Alertas.
- [ ] Documentar endpoints em Swagger.

### LGPD / Compliance
- [ ] Audit log retain 5 anos.
- [ ] Endpoint `/unsubscribe` público.
- [ ] Footer obrigatório nos emails: "Para descadastrar, clique aqui".
- [ ] Opt-in explícito de WhatsApp no fluxo de onboarding mobile.

---

## 12. Decisões pendentes

1. **Provedor de email definitivo** — SendGrid ou AWS SES? Custo similar,
   SES integra melhor se já está em AWS. Decidir antes de implementar adapter.
2. **Templates HSM iniciais** — quais conteúdos precisamos suportar no MVP?
   Recomendação: começar com 1 template genérico (`lembrete_geral`) e
   expandir conforme demanda.
3. **Histórico — quanto guardar?** — `platform_notification_recipients` em
   notificações grandes pode ter milhões de linhas. Política de retenção:
   manter `deliveries` por 90 dias, depois arquivar em S3/cold storage?
4. **Custo do WhatsApp** — definir budget mensal e alarme quando atingir
   80% do limite. Twilio expõe API de billing.
5. **Cap de 200k destinatários é o número certo?** — depende do custo
   esperado e da capacidade do worker. Validar com time.
6. **Quebra de audiência grande** — quando exceder cap, oferecer
   "dividir em N notificações"? Por enquanto vai retornar 422.
7. **Notificação de teste** — permitir admin enviar pra si mesmo antes do
   blast? Útil pra validar template/formato. Fase 2.
8. **A/B test** — split de audiência em 50/50 com dois conteúdos diferentes?
   Fase 2 ou 3.
9. **Reagendar** — admin pode editar/reagendar antes do envio? Por enquanto
   só cancelar + criar novo. Validar UX.
