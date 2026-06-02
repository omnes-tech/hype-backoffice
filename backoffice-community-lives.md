# Backoffice — Comunidade ▸ Lives (Integração)

Guia de integração do **backoffice** com a feature de Lives da Comunidade: criar/abrir/agendar
uma live, transmitir e assistir a própria live como criador, ver histórico, gravações (VOD) e
tudo que conecta com o que já existe no app.

> **Status de implementação (2026-06-02):** este documento é o **contrato** acordado.
> O app (consumo das lives) já existe (migrations 068–070). A camada de **gestão no backoffice**
> e o **streaming WebRTC** estão em construção:
>
> | Componente | Estado |
> |---|---|
> | App: listar / detalhe / chat / likes / views (read) | ✅ implementado |
> | DB `community_lives` + comments/likes/views | ✅ (migrations 068–070, aplicar no Supabase) |
> | Migration `071` (workspace_id, description, VOD, provider) | ⏳ a implementar |
> | Backoffice: gestão de lives (este doc) | ⏳ a implementar |
> | Streaming WebRTC (LiveKit) + tokens + egress/VOD | ⏳ a implementar |
> | Webhooks LiveKit (status/VOD) | ⏳ a implementar |
>
> Os contratos abaixo são estáveis; o frontend pode começar a montar as telas em paralelo usando mocks.

---

## 1. Arquitetura em uma tela

```
                          ┌──────────────────────────────────────────┐
   BACKOFFICE (criador)   │  1. POST /backoffice/community/lives      │  cria/agenda (upcoming)
   ───────────────────►   │  2. POST .../:id/start                    │  → status=live + publish token
                          │  3. conecta no LiveKit com publish token  │  → publica câmera/mic/tela
                          │  4. POST .../:id/end                       │  → status=ended (grava VOD)
                          └──────────────────────────────────────────┘
                                          │  (mídia WebRTC via LiveKit SFU)
                                          ▼
                          ┌──────────────────────────────────────────┐
   APP (espectadores)     │  GET /app/community/lives?status=live     │  descobre lives
   ───────────────────►   │  GET /app/community/lives/:id             │  → viewer token (subscribe)
                          │  conecta no LiveKit (subscribe-only)      │  → assiste
                          │  WS /community/live: chat + tap-like       │  → interage
                          └──────────────────────────────────────────┘
```

- **Mídia (vídeo/áudio):** WebRTC via **LiveKit** (SFU). Sala (`room`) = 1 por live.
  - Criador recebe **publish token** (pode publicar).
  - Espectadores recebem **subscribe-only token** (só assistem).
  - Tokens são **JWT efêmeros mintados sob demanda** — nunca persistidos, sempre por-usuário, com TTL.
- **Chat / curtidas / contador de viewers:** trafegam fora da mídia, pelo **WebSocket socket.io**
  já existente (`/community/live`). O backoffice pode assistir o chat da própria live pelo mesmo canal.
- **Gravação (VOD):** o LiveKit **Egress** grava a sala automaticamente para o Storage; ao terminar,
  um webhook preenche `recording_url` e a live passada fica reassistível.
- **Escopo:** lives são **workspace-scoped** na gestão (cada cliente gerencia as suas), mas
  **visíveis para todos os usuários do app** (o feed do app não filtra por workspace).

---

## 2. Autenticação & headers

Todas as rotas de gestão exigem **usuário do backoffice autenticado** e o **workspace ativo**.

| Header | Valor | Obrigatório |
|---|---|---|
| `Authorization` | `Bearer <access_token>` | sim |
| `Workspace-Id` | UUID do workspace ativo | sim |
| `Content-Type` | `application/json` (exceto upload de thumbnail) | sim |

- O usuário precisa pertencer ao workspace informado (mesma stack de guards de Campanhas:
  `ClientType → Auth → Ability → Workspace → WorkspacePermission`).
- Quem pode abrir/gerir lives: **qualquer membro do workspace** com a permissão da feature
  (nesta entrega, alinhado às demais ações de gestão do workspace).
- `creator_id` é gravado a partir do token; `workspace_id` a partir do `Workspace-Id`.

---

## 3. Convenções

- **Envelope:** respostas de leitura/escrita retornam `{ "data": ... }`. Listas adicionam
  `{ "data": [...], "meta": { ... } }`.
- **Datas:** ISO 8601 UTC (`2026-06-10T20:00:00.000Z`).
- **Paginação (cursor):** opaca e assinada. Query: `?limit=20&cursor=<opaco>`.
  - `limit` default **20**, máximo **50**.
  - `meta`: `{ "next_cursor": string | null, "has_more": boolean }`.
  - Para a próxima página, repasse `next_cursor` em `cursor`. **Não** construa o cursor manualmente.
- **IDs:** o `id` exposto é sempre o `public_id` (UUID). O id serial interno não vaza.
- **Erros:** envelope `{ "message": string, "code": string }`. Catálogo na §11.

---

## 4. Modelo de dados — objeto `Live`

```ts
type LiveStatus = 'upcoming' | 'live' | 'ended' | 'cancelled';
type RecordingStatus = 'none' | 'processing' | 'ready' | 'failed';

interface Live {
  id: string;                    // public_id (UUID)
  title: string;                 // 1..150
  description: string | null;    // 0..2000
  thumbnail_url: string | null;  // URL absoluta (upload prévio)
  host_display_name: string | null; // nome exibido no app (default: nome do workspace/marca)
  status: LiveStatus;

  scheduled_at: string;          // ISO — quando foi agendada
  started_at: string | null;     // ISO — quando entrou ao vivo
  ended_at: string | null;       // ISO — quando encerrou
  duration_seconds: number | null;

  views_count: number;           // espectadores únicos (janela 5min)
  likes_count: number;           // tap-likes (ao vivo) + toggle (encerrada)

  // VOD — só relevante quando status === 'ended'
  recording_status: RecordingStatus;
  recording_url: string | null;  // playback do VOD quando recording_status === 'ready'

  creator: {                     // membro do backoffice que criou
    id: string;
    name: string;
    avatar_url: string | null;
  };

  created_at: string;
  updated_at: string;
}
```

### Credenciais de transmissão (`BroadcasterCredentials`)

Retornadas **apenas** por `POST /:id/start` e `POST /:id/broadcaster-token`. Nunca persista no front
além do necessário para a conexão; renove via `/broadcaster-token` quando o token expirar.

```ts
interface BroadcasterCredentials {
  provider: 'livekit';
  url: string;       // wss://... endpoint do LiveKit
  room: string;      // nome da sala (== live id)
  token: string;     // JWT de PUBLISH, TTL curto (ex.: 6h)
  identity: string;  // identidade do publicador na sala
  expires_at: string;// ISO — quando o token expira
}
```

---

## 5. Máquina de estados

```
            POST /                       POST /:id/start                 POST /:id/end
   (criar) ───────────►  upcoming  ───────────────────────►  live  ───────────────────►  ended
                            │  │                                                            │
            POST /:id/cancel│  │ PATCH /:id (editar enquanto upcoming)                      │ egress finaliza
                            ▼  ▼                                                            ▼
                        cancelled                                              recording_status: processing → ready
```

| De → Para | Endpoint | Regras |
|---|---|---|
| — → `upcoming` | `POST /` | `scheduled_at` pode ser agora (abrir já) ou futuro (agendar). |
| `upcoming` → `live` | `POST /:id/start` | grava `started_at`, cria a sala, inicia gravação, devolve credenciais. |
| `upcoming` → `cancelled` | `POST /:id/cancel` | só agendadas; soft-delete lógico, somem do app. |
| `upcoming` → `upcoming` | `PATCH /:id` | editar título/descrição/thumb/horário. |
| `live` → `ended` | `POST /:id/end` | grava `ended_at`+`duration_seconds`, finaliza egress (VOD). |
| `live` → `ended` | (auto via webhook) | se o criador cair e a sala fechar, o webhook encerra. |

Transições inválidas retornam `409 live_invalid_state`.

---

## 6. Endpoints de gestão

Base: `/backoffice/community/lives`

### 6.1 Criar / agendar — `POST /`

```jsonc
// Request
{
  "title": "Bate-papo com criadores",
  "description": "Tire suas dúvidas ao vivo.",   // opcional
  "thumbnail_url": "https://.../thumb.jpg",       // opcional (upload prévio — §6.9)
  "host_display_name": "Minha Marca",             // opcional (default: nome do workspace)
  "scheduled_at": "2026-06-10T20:00:00.000Z"      // futuro = agenda; passado/agora = abrir já
}
```

```jsonc
// 201 → { "data": Live }  (status: "upcoming")
```

Validações: `title` 1..150, `description` ≤ 2000, `scheduled_at` ISO válida.
Para **abrir imediatamente**, crie com `scheduled_at` = agora e em seguida chame `POST /:id/start`.

### 6.2 Listar / histórico — `GET /`

```
GET /backoffice/community/lives?status=upcoming&limit=20&cursor=<opaco>
```

| Query | Valores | Default |
|---|---|---|
| `status` | `live` \| `upcoming` \| `past` \| `cancelled` \| `all` | `all` |
| `limit` | 1..50 | 20 |
| `cursor` | opaco | — |

```jsonc
// 200
{
  "data": [ Live, ... ],   // ordenação: upcoming=scheduled_at ASC; past=ended_at DESC; demais=created_at DESC
  "meta": { "next_cursor": "…", "has_more": true }
}
```

Escopo: **apenas as lives do workspace** do header `Workspace-Id`.

### 6.3 Detalhe — `GET /:id`

```jsonc
// 200 → { "data": Live }   (404 live_not_found se de outro workspace ou inexistente)
```

Visão de gestão. **Não** retorna credenciais de transmissão (use `/start` ou `/broadcaster-token`).

### 6.4 Editar — `PATCH /:id`

Permitido enquanto `status = upcoming`. Campos opcionais: `title`, `description`, `thumbnail_url`,
`host_display_name`, `scheduled_at`.

```jsonc
// 200 → { "data": Live }   (409 live_invalid_state se já está live/ended/cancelled)
```

### 6.5 Ir ao vivo — `POST /:id/start`

Transita `upcoming → live`, cria a sala WebRTC, inicia a gravação e devolve as credenciais de
**publish** do criador.

```jsonc
// 200
{
  "data": {
    "live": Live,                       // agora status: "live", started_at preenchido
    "broadcaster": BroadcasterCredentials
  }
}
```

Erros: `409 live_invalid_state` (não está em upcoming), `503 streaming_unavailable` (provider off).

### 6.6 Renovar token do criador — `POST /:id/broadcaster-token`

Re-minta o publish token (reconexão / token expirado). Só funciona com `status = live`.

```jsonc
// 200 → { "data": BroadcasterCredentials }
```

### 6.7 Encerrar — `POST /:id/end`

Transita `live → ended`, grava `ended_at` + `duration_seconds`, finaliza a sala e a gravação.
A gravação entra em `recording_status: "processing"`; quando o VOD fica pronto (webhook),
vira `"ready"` e `recording_url` é preenchido.

```jsonc
// 200 → { "data": Live }   (status: "ended")
```

### 6.8 Cancelar agendada — `POST /:id/cancel`

Só para `status = upcoming`. Marca `cancelled` (soft-delete) — some do app e do feed.

```jsonc
// 200 → { "data": Live }   (status: "cancelled")
```

### 6.9 Upload de thumbnail — `POST /backoffice/community/lives/uploads`

`multipart/form-data`, campo `image`. Limite **5MB**, mimes `image/jpeg|png|webp`.

```jsonc
// 201 → { "data": { "url": "https://.../thumb.jpg" } }
```

Use a `url` no `thumbnail_url` ao criar/editar a live.

---

## 7. Transmitir e assistir a própria live (criador)

O backoffice usa o **SDK cliente do LiveKit** (`livekit-client`) no navegador. O backend só fornece
`url` + `token` + `room`; **a publicação da mídia acontece no front, P2P/SFU, sem passar pela API.**

Fluxo recomendado:

```ts
import { Room, createLocalTracks } from 'livekit-client';

// 1) abrir a live e obter credenciais
const { data } = await api.post(`/backoffice/community/lives/${id}/start`);
const { url, token } = data.broadcaster;

// 2) conectar e publicar câmera + microfone (o criador se vê no preview local)
const room = new Room({ adaptiveStream: true, dynacast: true });
await room.connect(url, token);
const tracks = await createLocalTracks({ audio: true, video: true });
for (const t of tracks) await room.localParticipant.publishTrack(t);

// preview local do próprio criador:
//   tracks.find(t => t.kind === 'video')?.attach(videoEl)

// 3) compartilhar tela (opcional)
await room.localParticipant.setScreenShareEnabled(true);

// 4) encerrar
await room.disconnect();
await api.post(`/backoffice/community/lives/${id}/end`);
```

- **Ver a própria live como o público vê:** o criador já tem o vídeo local no preview. Para ver
  exatamente o que o espectador recebe (com latência do SFU), basta abrir a tela de detalhe que
  também *assina* a sala — ou usar uma segunda aba do app. Não há endpoint extra: o publish token
  do criador também pode assinar as próprias tracks.
- **Reconexão:** se `room` emitir `Disconnected` por expiração de token, chame
  `POST /:id/broadcaster-token` e reconecte com o novo token.
- **Telas sugeridas no backoffice:**
  - *Estúdio da Live* (pré-live): seleção de câmera/mic, preview, botão **Ir ao vivo**.
  - *Ao vivo*: preview + painel de chat (WS, §8) + contadores de viewers/likes + botão **Encerrar**.
  - *Histórico*: lista de `past`/`cancelled` com métricas e link do VOD.

---

## 8. Chat, curtidas e viewers ao vivo (WebSocket)

A interação em tempo real **não** passa pela mídia — usa o socket.io existente. O backoffice pode
plugar o mesmo canal para o criador acompanhar (e futuramente moderar) o chat da própria live.

- **Namespace:** `/community/live`
- **Auth:** `Bearer <token>` no handshake (`auth.token`, header `Authorization` ou `?token=`).

Eventos cliente → servidor:

| Evento | Payload | Efeito |
|---|---|---|
| `join_live` | `{ liveId: "<public_id>" }` | entra na sala; incrementa viewers |
| `leave_live` | — | sai; decrementa viewers |
| `comment` | `{ type: "comment", data: { content } }` | publica comentário (1..200), só com live rodando |
| `tap_like` | `{ type: "tap_like" }` | curtida cumulativa (bufferizada ~1s) |

Eventos servidor → cliente (`frame`):

```jsonc
{ "type": "comment",      "data": { "id","live_id","author","content","created_at" } }
{ "type": "like_burst",   "data": { "likes_count" } }
{ "type": "viewer_count", "data": { "views_count" } }
```

Fallback HTTP do chat (para backfill/histórico): `GET /app/community/lives/:id/comments` (cursor).

> Moderação (deletar comentário / banir viewer) **não** está nesta entrega — é evolução natural
> e seria exposta sob `/backoffice/community/lives/:id/...`.

---

## 9. Gravação (VOD) / lives passadas

- Ao `POST /:id/end` (ou encerramento por webhook), inicia-se o processamento da gravação.
- `recording_status`: `processing` → `ready` (ou `failed`).
- Quando `ready`, `recording_url` aponta para o vídeo reassistível.
- No app, a live passada com `recording_status = ready` é reproduzida a partir de `recording_url`.
- No backoffice, exiba o player do VOD na tela de histórico quando `ready`; um aviso de
  "processando gravação" enquanto `processing`.

---

## 10. Variáveis de ambiente / setup

Necessárias no servidor para o streaming funcionar (sem elas, `/start` responde `503 streaming_unavailable`,
mas a criação/agendamento/edição continuam operando — modo degradado, igual ao `StorageService`):

| Var | Descrição |
|---|---|
| `LIVEKIT_URL` | endpoint `wss://...` (LiveKit Cloud ou self-host) |
| `LIVEKIT_API_KEY` | API key |
| `LIVEKIT_API_SECRET` | API secret (assina os JWT + valida webhooks) |
| `LIVEKIT_EGRESS_*` | destino do VOD (Storage S3-compatível — reaproveita Supabase Storage) |

Webhook do LiveKit deve apontar para `POST /webhooks/livekit` (assinatura verificada com o secret).

---

## 11. Catálogo de erros

| HTTP | `code` | Quando |
|---|---|---|
| 400 | `validation_error` | payload inválido (título, datas, etc.) |
| 401 | `unauthenticated` | token ausente/expirado |
| 403 | `forbidden` | sem permissão no workspace |
| 404 | `live_not_found` | live inexistente ou de outro workspace |
| 409 | `live_invalid_state` | transição inválida (ex.: `start` em live já encerrada) |
| 413 | `file_too_large` | thumbnail > 5MB |
| 415 | `unsupported_media_type` | mime de thumbnail fora de jpeg/png/webp |
| 429 | `rate_limited` | excedeu rate limit |
| 503 | `streaming_unavailable` | provider de streaming não configurado/indisponível |

---

## 12. Rate limits (sugeridos)

| Ação | Limite |
|---|---|
| Criar/editar live | 30 / min / usuário |
| `start` / `end` / `broadcaster-token` | 20 / min / usuário |
| Upload de thumbnail | 10 / min / usuário |
| `comment` (WS) | 30 / min / usuário |
| `tap_like` (WS) | 10 / s / usuário |

---

## 13. Checklist de integração (frontend backoffice)

- [ ] Tela **Lives** no menu lateral (lista com abas: Ao vivo / Agendadas / Passadas / Canceladas).
- [ ] Form **Abrir/Agendar live** (título, descrição, thumbnail via upload, data/hora, host).
- [ ] Upload de thumbnail (`/uploads`) antes de salvar `thumbnail_url`.
- [ ] **Estúdio da Live**: integrar `livekit-client`, preview de câmera/mic, screen-share, botão *Ir ao vivo* (`/start`).
- [ ] Painel ao vivo: chat (WS `/community/live`), contadores `viewer_count`/`like_burst`, botão *Encerrar* (`/end`).
- [ ] Reconexão via `/broadcaster-token`.
- [ ] Histórico com métricas + player de **VOD** quando `recording_status = ready`.
- [ ] Cancelar agendada (`/cancel`).
- [ ] Tratamento de `503 streaming_unavailable` (provider off) e `409 live_invalid_state`.

---

## 14. Referências

- App (consumo das lives): controller `src/modules/app/community/controllers/lives.controller.ts`.
- WebSocket de chat/likes: `src/modules/app/community/gateways/live.gateway.ts`.
- DB: migrations `068`–`070` (+ `071` desta feature).
- Padrão de guards workspace-scoped: `src/modules/backoffice/controllers/campaigns.controller.ts`.
