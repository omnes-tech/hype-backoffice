# API - Listar Conteúdos de Campanha

## Endpoint: Listar Conteúdos (App - Influenciador)

Lista todos os conteúdos enviados pelo influenciador para uma campanha, agrupados por fase. Permite visualizar quais conteúdos foram enviados e quais ainda faltam enviar.

### Endpoint

```
GET /api/app/campaigns/:campaignId/contents
```

### Descrição

Retorna todos os conteúdos enviados pelo influenciador para a campanha, organizados por fase. Cada fase mostra os conteúdos já enviados com todas as informações relevantes (rede social, formato de conteúdo, status, etc.).

**Características:**
- Retorna apenas conteúdos pré-definidos (com `campaignStepId`)
- Agrupa conteúdos por fase da campanha
- Inclui informações completas da fase, rede social e formato de conteúdo
- Mostra status de cada conteúdo (pendente, aguardando aprovação, aprovado, correção)
- Permite identificar quais conteúdos foram enviados e quais ainda faltam

### Autenticação

Requer autenticação via token JWT no header:
```
Authorization: Bearer {token}
```

### Headers

```
Client-Type: app
Authorization: Bearer {token}
Accept: application/json
```

### Parâmetros de URL

| Parâmetro | Tipo | Obrigatório | Descrição |
|-----------|------|-------------|-----------|
| `campaignId` | string (UUID) | Sim | ID público da campanha |

### Exemplo de Requisição

```bash
curl -X GET \
  'https://hypeapp-api.onrender.com/api/app/campaigns/4cc1e4b1-107a-4fee-8fda-73167de950c6/contents' \
  -H 'Client-Type: app' \
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' \
  -H 'Accept: application/json'
```

### Resposta de Sucesso

#### Status Code: `200 OK`

**Estrutura da Resposta:**

```json
{
  "data": [
    {
      "phase_number": 1,
      "phase_title": "Criação e aprovação - Fase 1",
      "contents": [
        {
          "id": "string (UUID)",
          "phase": {
            "id": "string (UUID)",
            "order": 1,
            "objective": "string",
            "publish_date": "2024-01-15",
            "publish_time": "10:00",
            "content_submission_deadline": "2024-01-10",
            "correction_submission_deadline": "2024-01-12"
          },
          "phase_id": "string (UUID)",
          "social_network": {
            "id": "5",
            "type": "instagram",
            "name": "Instagram",
            "username": "usuario_instagram"
          },
          "social_network_id": 5,
          "content_format": {
            "social_network": "instagram",
            "formats": [
              {
                "type": "reels",
                "quantity": 1
              },
              {
                "type": "post",
                "quantity": 2
              }
            ]
          },
          "content_type": "post",
          "content_format_type": "reels",
          "status": {
            "value": "awaiting_approval",
            "label": "Aguardando Aprovação"
          },
          "quantity": 1,
          "deadline": "2024-01-10T10:00:00Z",
          "preview_url": "https://storage.example.com/preview.jpg",
          "preview_urls": [
            "https://storage.example.com/preview1.jpg",
            "https://storage.example.com/preview2.jpg"
          ],
          "post_url": "https://youtube.com/watch?v=...",
          "caption": "Legenda do conteúdo...",
          "feedback": null,
          "caption_feedback": null,
          "metadata": {
            "content_format_type": "reels"
          },
          "created_at": "2024-01-05T10:00:00Z",
          "updated_at": "2024-01-05T10:00:00Z",
          "submitted_at": "2024-01-05T10:00:00Z",
          "published_at": null
        }
      ]
    }
  ]
}
```

**Exemplo de Resposta:**

```json
{
  "data": [
    {
      "phase_number": 1,
      "phase_title": "Criação e aprovação - Fase 1",
      "contents": [
        {
          "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
          "phase": {
            "id": "f1a2b3c4-d5e6-7890-abcd-ef1234567890",
            "order": 1,
            "objective": "Aumentar engajamento",
            "publish_date": "2024-01-15",
            "publish_time": "10:00",
            "content_submission_deadline": "2024-01-10",
            "correction_submission_deadline": "2024-01-12"
          },
          "phase_id": "f1a2b3c4-d5e6-7890-abcd-ef1234567890",
          "social_network": {
            "id": "5",
            "type": "instagram",
            "name": "Instagram",
            "username": "influencer_123"
          },
          "social_network_id": 5,
          "content_format": {
            "social_network": "instagram",
            "formats": [
              {
                "type": "reels",
                "quantity": 1
              }
            ]
          },
          "content_type": "post",
          "content_format_type": "reels",
          "status": {
            "value": "awaiting_approval",
            "label": "Aguardando Aprovação"
          },
          "quantity": 1,
          "deadline": "2024-01-10T10:00:00Z",
          "preview_url": "https://storage.example.com/content/preview.jpg",
          "preview_urls": [
            "https://storage.example.com/content/preview.jpg"
          ],
          "post_url": "https://youtube.com/watch?v=abc123",
          "caption": "Conteúdo incrível sobre o produto!",
          "feedback": null,
          "caption_feedback": null,
          "metadata": {
            "content_format_type": "reels"
          },
          "created_at": "2024-01-05T10:00:00Z",
          "updated_at": "2024-01-05T10:00:00Z",
          "submitted_at": "2024-01-05T10:00:00Z",
          "published_at": null
        }
      ]
    },
    {
      "phase_number": 2,
      "phase_title": "Criação e aprovação - Fase 2",
      "contents": []
    }
  ]
}
```

### Campos da Resposta

#### Fase (Phase)

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `phase_number` | number | Número da fase (ordem) |
| `phase_title` | string | Título da fase |
| `contents` | array | Lista de conteúdos enviados para esta fase |

#### Conteúdo (Content)

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | string (UUID) | ID público do conteúdo |
| `phase` | object | Informações completas da fase |
| `phase.id` | string (UUID) | ID público da fase |
| `phase.order` | number | Ordem da fase |
| `phase.objective` | string | Objetivo da fase |
| `phase.publish_date` | string (date) | Data de publicação da fase |
| `phase.publish_time` | string (time) | Horário de publicação |
| `phase.content_submission_deadline` | string (date) | Prazo para envio de conteúdo |
| `phase.correction_submission_deadline` | string (date) | Prazo para correção de conteúdo |
| `phase_id` | string (UUID) | ID público da fase (compatibilidade) |
| `social_network` | object | Informações da rede social |
| `social_network.id` | string | ID da rede social |
| `social_network.type` | string | Tipo da rede social (instagram, tiktok, youtube) |
| `social_network.name` | string | Nome da rede social |
| `social_network.username` | string | Username na rede social |
| `social_network_id` | number | ID da rede social (compatibilidade) |
| `content_format` | object | Formatos de conteúdo disponíveis para esta fase e rede social |
| `content_format.social_network` | string | Tipo de rede social |
| `content_format.formats` | array | Lista de formatos disponíveis |
| `content_format.formats[].type` | string | Tipo de formato (reels, post, video, story) |
| `content_format.formats[].quantity` | number | Quantidade necessária deste formato |
| `content_type` | string | Tipo de conteúdo |
| `content_format_type` | string | Formato específico do conteúdo (reels, post, video, story) |
| `status` | object | Status do conteúdo |
| `status.value` | string | Valor do status |
| `status.label` | string | Label do status |
| `quantity` | number | Quantidade (sempre 1) |
| `deadline` | string (ISO 8601) | Prazo para envio |
| `preview_url` | string | URL de preview (compatibilidade) |
| `preview_urls` | array | URLs de preview (array) |
| `post_url` | string | URL do conteúdo (YouTube ou Google Drive) |
| `caption` | string | Legenda do conteúdo |
| `feedback` | string | Feedback geral do cliente |
| `caption_feedback` | string | Feedback específico da legenda |
| `metadata` | object | Metadados adicionais |
| `created_at` | string (ISO 8601) | Data de criação |
| `updated_at` | string (ISO 8601) | Data de atualização |
| `submitted_at` | string (ISO 8601) | Data de envio |
| `published_at` | string (ISO 8601) | Data de publicação (se já foi publicado) |

### Status Possíveis

| Valor | Label | Descrição |
|-------|-------|-----------|
| `pending` | Pendente | Conteúdo foi criado mas ainda não foi enviado |
| `awaiting_approval` | Aguardando Aprovação | Conteúdo foi enviado e está aguardando aprovação |
| `content_approved` | Conteúdo Aprovado | Conteúdo foi aprovado pelo cliente |
| `correction` | Correção Solicitada | Cliente solicitou ajustes no conteúdo |
| `published` | Publicado | Conteúdo foi publicado |

### Respostas de Erro

#### Status Code: `404 Not Found`

**Quando a campanha não existe:**

```json
{
  "message": "Campanha não encontrada"
}
```

**Quando o usuário não participa da campanha:**

```json
{
  "message": "Você não participa desta campanha"
}
```

#### Status Code: `500 Internal Server Error`

```json
{
  "message": "Erro ao buscar conteúdos"
}
```

---

## Endpoint: Listar Conteúdos (Backoffice - Cliente)

Lista todos os conteúdos enviados pelos influenciadores para uma campanha. Permite filtrar por status e fase.

### Endpoint

```
GET /api/backoffice/campaigns/:campaignId/contents
```

### Descrição

Retorna todos os conteúdos enviados pelos influenciadores para a campanha, com todas as informações relevantes para o cliente aprovar ou reprovar. Permite filtrar por status e fase.

**Características:**
- Retorna todos os conteúdos da campanha
- Inclui informações do influenciador (nome, avatar)
- Permite filtrar por status (`status` query parameter)
- Permite filtrar por fase (`phase_id` query parameter)
- Inclui informações completas da fase, rede social e formato de conteúdo
- Mostra feedback e avaliação de IA (se disponível)

### Autenticação

Requer autenticação via token JWT no header:
```
Authorization: Bearer {token}
```

### Headers

```
Client-Type: backoffice
Authorization: Bearer {token}
Accept: application/json
```

### Parâmetros de URL

| Parâmetro | Tipo | Obrigatório | Descrição |
|-----------|------|-------------|-----------|
| `campaignId` | string (UUID) | Sim | ID público da campanha |

### Query Parameters

| Parâmetro | Tipo | Obrigatório | Descrição |
|-----------|------|-------------|-----------|
| `status` | string | Não | Filtrar por status (pending, awaiting_approval, content_approved, correction, published) |
| `phase_id` | string (UUID) | Não | Filtrar por fase específica |

### Exemplos de Requisição

#### Exemplo 1: Listar Todos os Conteúdos

```bash
curl -X GET \
  'https://hypeapp-api.onrender.com/api/backoffice/campaigns/4cc1e4b1-107a-4fee-8fda-73167de950c6/contents' \
  -H 'Client-Type: backoffice' \
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' \
  -H 'Accept: application/json'
```

#### Exemplo 2: Filtrar por Status

```bash
curl -X GET \
  'https://hypeapp-api.onrender.com/api/backoffice/campaigns/4cc1e4b1-107a-4fee-8fda-73167de950c6/contents?status=awaiting_approval' \
  -H 'Client-Type: backoffice' \
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' \
  -H 'Accept: application/json'
```

#### Exemplo 3: Filtrar por Fase

```bash
curl -X GET \
  'https://hypeapp-api.onrender.com/api/backoffice/campaigns/4cc1e4b1-107a-4fee-8fda-73167de950c6/contents?phase_id=f1a2b3c4-d5e6-7890-abcd-ef1234567890' \
  -H 'Client-Type: backoffice' \
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' \
  -H 'Accept: application/json'
```

#### Exemplo 4: Filtrar por Status e Fase

```bash
curl -X GET \
  'https://hypeapp-api.onrender.com/api/backoffice/campaigns/4cc1e4b1-107a-4fee-8fda-73167de950c6/contents?status=awaiting_approval&phase_id=f1a2b3c4-d5e6-7890-abcd-ef1234567890' \
  -H 'Client-Type: backoffice' \
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' \
  -H 'Accept: application/json'
```

### Resposta de Sucesso

#### Status Code: `200 OK`

**Estrutura da Resposta:**

```json
{
  "data": [
    {
      "id": "string (UUID)",
      "campaign_id": "string (UUID)",
      "influencer_id": "string",
      "influencer_name": "string",
      "influencer_avatar": "string | null",
      "phase": {
        "id": "string (UUID)",
        "order": 1,
        "objective": "string",
        "publish_date": "2024-01-15",
        "publish_time": "10:00"
      },
      "phase_id": "string (UUID)",
      "social_network": {
        "id": "string",
        "type": "instagram",
        "name": "Instagram"
      },
      "social_network_type": "instagram",
      "content_format": {
        "social_network": "instagram",
        "formats": [
          {
            "type": "reels",
            "quantity": 1
          }
        ]
      },
      "content_type": "post",
      "content_format_type": "reels",
      "preview_url": "string | null",
      "preview_urls": ["string"],
      "post_url": "string | null",
      "caption": "string | null",
      "status": "awaiting_approval",
      "metadata": {
        "content_format_type": "reels"
      },
      "submitted_at": "2024-01-05T10:00:00Z",
      "published_at": "string | null",
      "feedback": "string | null",
      "caption_feedback": "string | null",
      "ai_evaluation": "object | null",
      "created_at": "2024-01-05T10:00:00Z",
      "updated_at": "2024-01-05T10:00:00Z"
    }
  ]
}
```

**Exemplo de Resposta:**

```json
{
  "data": [
    {
      "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "campaign_id": "4cc1e4b1-107a-4fee-8fda-73167de950c6",
      "influencer_id": "123",
      "influencer_name": "João Silva",
      "influencer_avatar": "https://storage.example.com/avatars/123.jpg",
      "phase": {
        "id": "f1a2b3c4-d5e6-7890-abcd-ef1234567890",
        "order": 1,
        "objective": "Aumentar engajamento",
        "publish_date": "2024-01-15",
        "publish_time": "10:00"
      },
      "phase_id": "f1a2b3c4-d5e6-7890-abcd-ef1234567890",
      "social_network": {
        "id": "5",
        "type": "instagram",
        "name": "Instagram"
      },
      "social_network_type": "instagram",
      "content_format": {
        "social_network": "instagram",
        "formats": [
          {
            "type": "reels",
            "quantity": 1
          }
        ]
      },
      "content_type": "post",
      "content_format_type": "reels",
      "preview_url": "https://storage.example.com/content/preview.jpg",
      "preview_urls": [
        "https://storage.example.com/content/preview.jpg"
      ],
      "post_url": "https://youtube.com/watch?v=abc123",
      "caption": "Conteúdo incrível sobre o produto!",
      "status": "awaiting_approval",
      "metadata": {
        "content_format_type": "reels"
      },
      "submitted_at": "2024-01-05T10:00:00Z",
      "published_at": null,
      "feedback": null,
      "caption_feedback": null,
      "ai_evaluation": null,
      "created_at": "2024-01-05T10:00:00Z",
      "updated_at": "2024-01-05T10:00:00Z"
    },
    {
      "id": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
      "campaign_id": "4cc1e4b1-107a-4fee-8fda-73167de950c6",
      "influencer_id": "456",
      "influencer_name": "Maria Santos",
      "influencer_avatar": "https://storage.example.com/avatars/456.jpg",
      "phase": {
        "id": "f1a2b3c4-d5e6-7890-abcd-ef1234567890",
        "order": 1,
        "objective": "Aumentar engajamento",
        "publish_date": "2024-01-15",
        "publish_time": "10:00"
      },
      "phase_id": "f1a2b3c4-d5e6-7890-abcd-ef1234567890",
      "social_network": {
        "id": "7",
        "type": "tiktok",
        "name": "TikTok"
      },
      "social_network_type": "tiktok",
      "content_format": {
        "social_network": "tiktok",
        "formats": [
          {
            "type": "video",
            "quantity": 1
          }
        ]
      },
      "content_type": "video",
      "content_format_type": "video",
      "preview_url": "https://storage.example.com/content/preview2.jpg",
      "preview_urls": [
        "https://storage.example.com/content/preview2.jpg"
      ],
      "post_url": "https://drive.google.com/file/d/xyz789",
      "caption": "Vídeo sobre o produto!",
      "status": "content_approved",
      "metadata": {
        "content_format_type": "video"
      },
      "submitted_at": "2024-01-04T14:00:00Z",
      "published_at": "2024-01-06T10:00:00Z",
      "feedback": null,
      "caption_feedback": null,
      "ai_evaluation": {
        "score": 8.5,
        "comments": "Bom engajamento esperado"
      },
      "created_at": "2024-01-04T14:00:00Z",
      "updated_at": "2024-01-06T10:00:00Z"
    }
  ]
}
```

### Campos da Resposta

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | string (UUID) | ID público do conteúdo |
| `campaign_id` | string (UUID) | ID público da campanha |
| `influencer_id` | string | ID do influenciador |
| `influencer_name` | string | Nome do influenciador |
| `influencer_avatar` | string \| null | URL do avatar do influenciador |
| `phase` | object | Informações da fase |
| `phase.id` | string (UUID) | ID público da fase |
| `phase.order` | number | Ordem da fase |
| `phase.objective` | string | Objetivo da fase |
| `phase.publish_date` | string (date) | Data de publicação |
| `phase.publish_time` | string (time) | Horário de publicação |
| `phase_id` | string (UUID) | ID público da fase (compatibilidade) |
| `social_network` | object | Informações da rede social |
| `social_network.id` | string | ID da rede social |
| `social_network.type` | string | Tipo da rede social |
| `social_network.name` | string | Nome da rede social |
| `social_network_type` | string | Tipo da rede social (compatibilidade) |
| `content_format` | object | Formatos disponíveis para a fase e rede social |
| `content_format.social_network` | string | Tipo de rede social |
| `content_format.formats` | array | Lista de formatos disponíveis |
| `content_type` | string | Tipo de conteúdo |
| `content_format_type` | string | Formato específico do conteúdo |
| `preview_url` | string \| null | URL de preview (compatibilidade) |
| `preview_urls` | array | URLs de preview (array) |
| `post_url` | string \| null | URL do conteúdo (YouTube ou Google Drive) |
| `caption` | string \| null | Legenda do conteúdo |
| `status` | string | Status do conteúdo |
| `metadata` | object | Metadados adicionais |
| `submitted_at` | string (ISO 8601) | Data de envio |
| `published_at` | string (ISO 8601) \| null | Data de publicação |
| `feedback` | string \| null | Feedback geral do cliente |
| `caption_feedback` | string \| null | Feedback específico da legenda |
| `ai_evaluation` | object \| null | Avaliação de IA (se disponível) |
| `created_at` | string (ISO 8601) | Data de criação |
| `updated_at` | string (ISO 8601) | Data de atualização |

### Status Possíveis

| Valor | Descrição |
|-------|-----------|
| `pending` | Pendente |
| `awaiting_approval` | Aguardando Aprovação |
| `content_approved` | Conteúdo Aprovado |
| `correction` | Correção Solicitada |
| `published` | Publicado |

### Respostas de Erro

#### Status Code: `404 Not Found`

**Quando a campanha não existe:**

```json
{
  "message": "Campanha não encontrada"
}
```

#### Status Code: `500 Internal Server Error`

```json
{
  "message": "Erro ao buscar conteúdos"
}
```

---

## Notas de Implementação

### Identificando Conteúdos Faltantes (App)

Para identificar quais conteúdos ainda faltam enviar:

1. **Obter a lista de fases da campanha** usando `GET /api/app/campaigns/:campaignId`
2. **Obter os conteúdos enviados** usando `GET /api/app/campaigns/:campaignId/contents`
3. **Comparar os formatos requeridos** em cada fase (`content_format.formats`) com os conteúdos enviados (`content_format_type`)

**Exemplo de lógica:**

```javascript
// Para cada fase
phase.content_format.formats.forEach(format => {
  // Verificar se existe conteúdo enviado com este formato
  const hasContent = phase.contents.some(
    content => content.content_format_type === format.type
  );
  
  if (!hasContent) {
    // Este formato ainda não foi enviado
    console.log(`Falta enviar: ${format.type} (quantidade: ${format.quantity})`);
  }
});
```

### Filtros no Backoffice

O endpoint do backoffice suporta filtros úteis para gerenciamento:

- **`status=awaiting_approval`**: Ver apenas conteúdos aguardando aprovação
- **`status=correction`**: Ver apenas conteúdos que precisam de correção
- **`phase_id=...`**: Ver apenas conteúdos de uma fase específica
- **Combinação de filtros**: Usar ambos os parâmetros para filtrar por status e fase

### Informações Retornadas

Ambos os endpoints retornam informações completas sobre:

- **Fase**: ID, ordem, objetivo, datas de publicação e prazos
- **Rede Social**: ID, tipo, nome, username (no app)
- **Formato de Conteúdo**: Formatos disponíveis para a fase e rede social, e formato específico do conteúdo enviado
- **Status**: Status atual do conteúdo com label legível
- **Mídia**: URLs de preview e URL do conteúdo (YouTube/Drive)
- **Feedback**: Feedback geral e específico da legenda (quando disponível)
- **Metadados**: Informações adicionais armazenadas

### Compatibilidade

Ambos os endpoints mantêm campos de compatibilidade:

- `phase_id`: Além do objeto `phase` completo
- `social_network_id`: Além do objeto `social_network` completo
- `social_network_type`: Além do objeto `social_network` completo
- `preview_url`: Além do array `preview_urls`

---

*Última atualização: Março 2025*
