# API — Convite público de campanha (influenciador)

Documentação para alinhar o **backend** com o fluxo da página pública  
`/campaigns/:campaignPublicId/invite` no backoffice (link compartilhável pela marca).

## Contexto

- **Sem autenticação** (`Authorization` não é enviado pelo front nessas rotas).
- **Base URL**: a mesma configurada em `VITE_SERVER_URL` (ex.: `https://api.exemplo.com/api/backoffice`). Os caminhos abaixo são **sufixos** após essa base.
- **`:campaignPublicId`**: identificador público da campanha (o mesmo que aparece na URL do convite).
- **Envelope de sucesso** (recomendado, alinhado ao restante da API): corpo JSON com `data` opcional.
- **Erros**: HTTP 4xx/5xx com JSON contendo `message` ou `error` (string legível). O front exibe essa mensagem ao usuário.

---

## 1. Obter dados do convite (página pública)

**`GET /public/campaigns/:campaignPublicId/invite`**

### Resposta de sucesso — `200`

Corpo esperado pelo front (após `response.data ?? response`):

```json
{
  "data": {
    "title": "string",
    "description": "string",
    "objective": "string (opcional)",
    "status": "string | objeto (opcional — UI normaliza rótulo)",
    "banner": "string | null (path ou URL do asset)",
    "banner_url": "string (opcional — alternativa ao banner)",
    "max_influencers": 10,
    "segment_min_followers": 5000,
    "primary_niche": { "name": "string (opcional)" },
    "payment_method": "string (opcional)",
    "payment_method_details": {
      "amount": 0,
      "currency": "BRL",
      "description": "string (opcional)"
    },
    "benefits": ["string"],
    "rules_does": ["string"],
    "rules_does_not": ["string"],
    "image_rights_period": 12,
    "allowed_social_networks": ["instagram", "tiktok"],
    "social_networks": ["instagram"],
    "phases": [
      {
        "order": 1,
        "objective": "string",
        "post_date": "2026-05-01",
        "postDate": "2026-05-01",
        "publish_time": "18:00:00",
        "formats": [
          {
            "type": "instagram",
            "options": [{ "type": "reels", "quantity": 2 }]
          }
        ]
      }
    ]
  }
}
```

#### Campos adicionais (UI do convite)

| Campo | Descrição |
|--------|-----------|
| `allowed_social_networks` | Lista de redes aceitas (ex.: `instagram`, `tiktok`, `youtube`, `ugc`). Alternativa: `social_networks`. |
| `segments.social_network` / `segments.social_networks` | Se não houver lista explícita, o front pode inferir redes a partir daqui. |
| `phases` | Fases da campanha. Cada item: `objective`, `post_date` ou `postDate`, `publish_time` ou `post_time`, `formats`. |
| `formats` (por fase) | **Formato API (criação de campanha):** `{ "type": "instagram", "options": [{ "type": "reels", "quantity": 2 }] }`. **Formato alternativo (dashboard):** `{ "socialNetwork": "instagram", "contentType": "reels", "quantity": "2" }`. |

Se `allowed_social_networks` / `social_networks` / `segments` não vierem preenchidos, o front **deduz** as redes a partir dos `formats` de todas as fases.

Campos omitidos são tratados como ausentes na UI. O front é tolerante a `title`/`name`, `banner`/`banner_url`, textos aninhados e arrays.

### Erros

- **`404`**: convite indisponível ou campanha não encontrada.
- Outros: mensagem em `message` ou `error`.

---

## 2. Aceitar convite — pré-cadastro e vínculo em inscrições

**`POST /public/campaigns/:campaignPublicId/invite/pre-register`**

### Headers

- `Content-Type: application/json`
- `Accept: application/json`

### Corpo (JSON) enviado pelo front

| Campo | Tipo | Obrigatório | Observação |
|--------|------|-------------|------------|
| `name` | string | sim | trim |
| `email` | string | sim | trim |
| `phone` | string (só dígitos) | condicional | Só é enviado se, após remover não-dígitos, tiver **≥ 10** caracteres |
| `target_stage` | string | sim (enviado pelo front) | Valor fixo: **`applications`** (inscrições na campanha) |
| `social_profiles` | array | condicional | Quando a campanha define redes aceitas no GET: um item por rede, com `network` e `profile_url` (URL validada no front por rede). |

Cada elemento de `social_profiles`:

| Campo | Tipo | Descrição |
|--------|------|-----------|
| `network` | string | Identificador da rede (`instagram`, `tiktok`, etc.), em minúsculas. |
| `profile_url` | string | URL pública do perfil (ex.: `https://instagram.com/usuario`). |

Exemplo:

```json
{
  "name": "Maria Silva",
  "email": "maria@email.com",
  "phone": "11987654321",
  "target_stage": "applications",
  "social_profiles": [
    { "network": "instagram", "profile_url": "https://www.instagram.com/maria" },
    { "network": "tiktok", "profile_url": "https://www.tiktok.com/@maria" }
  ]
}
```

### Comportamento esperado no backend

1. Registrar o pré-cadastro do influenciador (ou lead) com os dados enviados.
2. Persistir os **links dos perfis** (`social_profiles`) associados à campanha / candidatura, quando enviados.
3. **Vincular** essa pessoa à campanha identificada por `:campaignPublicId` na etapa de **inscrições** (equivalente ao estágio `applications` no backoffice — aba/lista de inscrições da campanha).
4. Responder **`200`** ou **`201`** com corpo opcional (o front não depende de um payload específico em sucesso).

### Erros

- **`400`**: validação (e-mail inválido, campos obrigatórios, campanha não aceita novos pré-cadastros, etc.).
- **`404`**: campanha não encontrada para o `campaignPublicId`.
- Corpo: `{ "message": "..." }` ou `{ "error": "..." }`.

---

## 3. Recusar convite — pré-cadastro (identificação) + motivo aberto

**`POST /public/campaigns/:campaignPublicId/invite/decline`**

### Headers

- `Content-Type: application/json`
- `Accept: application/json`

### Corpo (JSON) enviado pelo front

| Campo | Tipo | Obrigatório | Observação |
|--------|------|-------------|------------|
| `name` | string | sim | trim |
| `email` | string | sim | trim |
| `phone` | string (só dígitos) | condicional | Igual ao pré-cadastro de aceite: só enviado se ≥ 10 dígitos |
| `decline_reason` | string | sim | trim — texto livre do motivo da recusa |

Exemplo:

```json
{
  "name": "João Souza",
  "email": "joao@email.com",
  "phone": "21999887766",
  "decline_reason": "Não consigo cumprir o prazo de entrega neste mês."
}
```

### Comportamento esperado no backend

1. Persistir a **recusa** associada à campanha `:campaignPublicId`.
2. Guardar **identificação** (`name`, `email`, `phone` se houver) e **`decline_reason`** para análise da marca (CRM, relatório, etc.).
3. **Não** colocar o usuário em **inscrições** como participante ativo (a menos que o produto peça o contrário).
4. Responder **`200`** ou **`201`** em sucesso.

### Erros

- **`400`**: validação.
- **`404`**: campanha não encontrada.
- Corpo: `{ "message": "..." }` ou `{ "error": "..." }`.

---

## Resumo dos endpoints

| Método | Caminho | Uso |
|--------|---------|-----|
| `GET` | `/public/campaigns/:campaignPublicId/invite` | Carregar página pública do convite |
| `POST` | `/public/campaigns/:campaignPublicId/invite/pre-register` | Aceite: pré-cadastro + entrada em **inscrições** (`applications`) |
| `POST` | `/public/campaigns/:campaignPublicId/invite/decline` | Recusa: identificação + **motivo aberto** |

---

## Referência no código (backoffice)

- Serviço: `src/shared/services/public-campaign-invite.ts`
- UI: `src/screens/(public)/campaigns.$campaignId.invite.tsx`
- Modais: `src/components/campaign-invite-accept-modal.tsx`, `src/components/campaign-invite-decline-modal.tsx`

Qualquer mudança de path ou contrato deve ser refletida nesse serviço e, se necessário, neste documento.
