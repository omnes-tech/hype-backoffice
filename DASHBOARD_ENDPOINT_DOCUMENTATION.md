# 📊 Dashboard Endpoint - Documentação Técnica

## Visão Geral

O endpoint `/dashboard` foi criado para otimizar o carregamento de dados da campanha, reduzindo significativamente o tempo de resposta ao consolidar múltiplas chamadas em uma única requisição.

### Problema Resolvido

**Antes:** O frontend fazia 4+ chamadas HTTP separadas:
- `GET /campaigns/{id}/phases` (~5s)
- `GET /campaigns/{id}/influencers` (~5s)
- `GET /campaigns/{id}/contents` (~5s)
- `GET /campaigns/{id}/metrics` (~5s)
- **Total: ~20 segundos**

**Depois:** Uma única chamada HTTP:
- `GET /campaigns/{id}/dashboard` (~2-3s)
- **Redução de 85-90% no tempo de resposta**

---

## Endpoint

### `GET /api/backoffice/campaigns/:campaignId/dashboard`

Retorna todos os dados da campanha em uma única resposta: fases, influenciadores, conteúdos e métricas.

**Base URL:** `http://localhost:3000/api/backoffice/campaigns`

---

## Autenticação e Autorização

### Headers Obrigatórios

```http
Client-Type: backoffice
Authorization: Bearer {token}
Workspace-Id: {workspace_public_id}
```

### Permissões

- Requer autenticação (`AuthGuard`)
- Requer ability: `client_type:backoffice`
- Valida acesso ao workspace via `WorkspaceGuard`

---

## Request

### URL Parameters

| Parâmetro | Tipo | Obrigatório | Descrição |
|-----------|------|-------------|-----------|
| `campaignId` | string (UUID) | Sim | ID público da campanha |

### Exemplo de Request

```http
GET /api/backoffice/campaigns/e0c7d2b8-4e86-49a2-ae89-ba14eac9d067/dashboard
Host: localhost:3000
Client-Type: backoffice
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Workspace-Id: 550e8400-e29b-41d4-a716-446655440000
```

### cURL

```bash
curl -X GET \
  'http://localhost:3000/api/backoffice/campaigns/e0c7d2b8-4e86-49a2-ae89-ba14eac9d067/dashboard' \
  -H 'Client-Type: backoffice' \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -H 'Workspace-Id: YOUR_WORKSPACE_ID'
```

---

## Response

### Status Codes

| Código | Descrição |
|--------|-----------|
| `200` | Sucesso - Dados retornados |
| `400` | Erro de validação (campaignId inválido) |
| `401` | Não autenticado |
| `403` | Sem permissão para acessar o workspace |
| `404` | Campanha não encontrada |
| `500` | Erro interno do servidor |

### Response Body (200 OK)

```json
{
  "data": {
    "phases": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "order": 1,
        "objective": "post",
        "publish_date": "2024-01-15",
        "publish_time": "10:00:00",
        "content_submission_deadline": "2024-01-10",
        "correction_submission_deadline": "2024-01-12",
        "contents": [
          {
            "type": "post",
            "options": [
              {
                "type": "image",
                "quantity": 3
              }
            ]
          }
        ],
        "created_at": "2024-01-01T00:00:00.000Z",
        "updated_at": "2024-01-01T00:00:00.000Z"
      }
    ],
    "influencers": [
      {
        "id": "10",
        "name": "João Silva",
        "username": "@joaosilva",
        "avatar": "https://example.com/photo.jpg",
        "followers": 50000,
        "engagement": 0,
        "niche": "5",
        "social_network": "instagram",
        "status": "aprovados",
        "phase": null
      }
    ],
    "contents": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440001",
        "campaign_id": "e0c7d2b8-4e86-49a2-ae89-ba14eac9d067",
        "influencer_id": "10",
        "influencer_name": "João Silva",
        "influencer_avatar": "https://example.com/photo.jpg",
        "social_network": "instagram",
        "content_type": "post",
        "preview_url": "https://example.com/preview.jpg",
        "post_url": "https://instagram.com/p/abc123",
        "status": "pending",
        "phase_id": "550e8400-e29b-41d4-a716-446655440000",
        "submitted_at": "2024-01-05T00:00:00.000Z",
        "published_at": null,
        "feedback": null,
        "ai_evaluation": null
      }
    ],
    "metrics": {
      "reach": 10,
      "engagement": 0,
      "published_content": 5,
      "active_influencers": 8
    }
  }
}
```

---

## Estrutura de Dados

### Phases (Fases)

Array de objetos representando as fases da campanha.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | string (UUID) | ID público da fase |
| `order` | number | Ordem da fase na campanha |
| `objective` | string | Objetivo da fase (`post`, `story`, `reel`, etc.) |
| `publish_date` | string (YYYY-MM-DD) | Data de publicação |
| `publish_time` | string (HH:MM:SS) | Hora de publicação |
| `content_submission_deadline` | string (YYYY-MM-DD) \| null | Prazo para submissão de conteúdo |
| `correction_submission_deadline` | string (YYYY-MM-DD) \| null | Prazo para correção de conteúdo |
| `contents` | array | Configuração de conteúdos da fase |
| `created_at` | string (ISO 8601) | Data de criação |
| `updated_at` | string (ISO 8601) | Data de atualização |

### Influencers (Influenciadores)

Array de objetos representando os influenciadores da campanha.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | string | ID do usuário/influenciador |
| `name` | string | Nome completo |
| `username` | string | Nome de usuário na rede social |
| `avatar` | string \| null | URL da foto de perfil |
| `followers` | number | Número de seguidores |
| `engagement` | number | Taxa de engajamento (atualmente 0) |
| `niche` | string \| undefined | ID do nicho |
| `social_network` | string \| undefined | Tipo de rede social (`instagram`, `tiktok`, etc.) |
| `status` | string | Status do influenciador na campanha |
| `phase` | string \| undefined | ID da fase atual |

**Status possíveis:**
- `convidados` - Convite enviado
- `aprovados` - Aprovado para participar
- `rejeitados` - Rejeitado
- `curadoria` - Em curadoria
- `conteudo_submetido` - Conteúdo submetido
- `conteudo_aprovado` - Conteúdo aprovado
- `conteudo_rejeitado` - Conteúdo rejeitado

### Contents (Conteúdos)

Array de objetos representando os conteúdos submetidos.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | string (UUID) | ID público do conteúdo |
| `campaign_id` | string (UUID) | ID da campanha |
| `influencer_id` | string | ID do influenciador |
| `influencer_name` | string | Nome do influenciador |
| `influencer_avatar` | string \| null | Avatar do influenciador |
| `social_network` | string \| null | Tipo de rede social |
| `content_type` | string | Tipo de conteúdo (`post`, `story`, `reel`) |
| `preview_url` | string \| null | URL da prévia |
| `post_url` | string \| null | URL do post publicado |
| `status` | string | Status do conteúdo |
| `phase_id` | string (UUID) \| null | ID da fase relacionada |
| `submitted_at` | string (ISO 8601) | Data de submissão |
| `published_at` | string (ISO 8601) \| null | Data de publicação |
| `feedback` | string \| null | Feedback do backoffice |
| `ai_evaluation` | object \| null | Avaliação da IA |

**Status possíveis:**
- `pending` - Aguardando aprovação
- `approved` - Aprovado
- `rejected` - Rejeitado
- `published` - Publicado

### Metrics (Métricas)

Objeto com métricas agregadas da campanha.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `reach` | number | Total de influenciadores na campanha |
| `engagement` | number | Engajamento total (atualmente 0) |
| `published_content` | number | Total de conteúdos publicados |
| `active_influencers` | number | Total de influenciadores aprovados |

---

## Otimizações Implementadas

### 1. Queries Paralelas

Todas as queries principais são executadas em paralelo usando `Promise.all()`:

```typescript
const [steps, campaignUsersList, contents, metrics] = await Promise.all([
  // Query 1: Steps
  // Query 2: Influencers
  // Query 3: Contents
  // Query 4: Metrics
]);
```

### 2. Batch Loading (Eliminação de N+1)

**Antes (N+1 queries):**
```typescript
// Para cada influenciador (10 influenciadores = 30 queries)
for (influencer of influencers) {
  await db.select().from(userWorkspaces).where(userId = influencer.id); // Query 1
  await db.select().from(socialNetworks).where(workspaceId = ...);     // Query 2
  await db.select().from(nicheUsers).where(userId = influencer.id);    // Query 3
}
```

**Depois (3 queries totais):**
```typescript
// Carrega todos de uma vez
const userWorkspaces = await db.select()
  .from(userWorkspaces)
  .where(inArray(userId, [1, 2, 3, ..., 10])); // 1 query

const socialNetworks = await db.select()
  .from(socialNetworks)
  .where(inArray(workspaceId, [1, 2, 3])); // 1 query

const niches = await db.select()
  .from(nicheUsers)
  .where(inArray(userId, [1, 2, 3, ..., 10])); // 1 query
```

### 3. JOINs Otimizados

Uso de `INNER JOIN` e `LEFT JOIN` para trazer dados relacionados em uma única query:

```typescript
.select({
  // ... campos principais
  user: { id, name, photo },           // JOIN com users
  socialNetwork: { type },            // LEFT JOIN com social_networks
  step: { publicId }                  // LEFT JOIN com campaign_steps
})
.from(campaignContents)
.innerJoin(users, ...)
.leftJoin(socialNetworks, ...)
.leftJoin(campaignSteps, ...)
```

### 4. Índices de Performance

Execute o script `add-performance-indexes.sql` no banco para criar índices que aceleram as queries:

```sql
-- Índices criados:
- idx_campaign_users_campaign_id
- idx_campaign_users_campaign_status
- idx_campaign_contents_campaign_user
- idx_campaign_steps_campaign_order
-- E mais...
```

---

## Comparação de Performance

### Cenário: Campanha com 10 influenciadores, 5 fases, 20 conteúdos

#### Endpoint Agregado (`/dashboard`)

```
Request: 1 chamada HTTP
Queries: ~7 queries paralelas
Tempo: ~2-3 segundos
```

**Queries executadas:**
1. Validação da campanha (1 query)
2. Buscar steps (1 query)
3. Buscar campaign_users com JOIN users (1 query)
4. Buscar contents com JOINs (1 query)
5. Batch load user_workspaces (1 query)
6. Batch load social_networks (1 query)
7. Batch load niches (1 query)
8. Métricas paralelas (4 queries em paralelo)

**Total: ~8 queries principais**

#### Endpoints Individuais (antigo)

```
Requests: 4 chamadas HTTP
Queries: ~50+ queries sequenciais
Tempo: ~20 segundos
```

**Queries por endpoint:**
- `/phases`: 1 query
- `/influencers`: 1 + (10 × 3) = 31 queries (N+1)
- `/contents`: 1 + (20 × 1) = 21 queries (N+1)
- `/metrics`: 1 + (10 × 2) = 21 queries (N+1)

**Total: ~74 queries**

---

## Exemplos de Uso

### TypeScript/JavaScript

```typescript
interface DashboardResponse {
  data: {
    phases: Phase[];
    influencers: Influencer[];
    contents: Content[];
    metrics: Metrics;
  };
}

async function loadCampaignDashboard(campaignId: string) {
  const response = await fetch(
    `/api/backoffice/campaigns/${campaignId}/dashboard`,
    {
      method: 'GET',
      headers: {
        'Client-Type': 'backoffice',
        'Authorization': `Bearer ${token}`,
        'Workspace-Id': workspaceId,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const data: DashboardResponse = await response.json();
  return data.data;
}

// Uso
const dashboard = await loadCampaignDashboard('e0c7d2b8-4e86-49a2-ae89-ba14eac9d067');

console.log('Fases:', dashboard.phases);
console.log('Influenciadores:', dashboard.influencers);
console.log('Conteúdos:', dashboard.contents);
console.log('Métricas:', dashboard.metrics);
```

### React Hook

```typescript
import { useState, useEffect } from 'react';

function useCampaignDashboard(campaignId: string) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchDashboard() {
      try {
        setLoading(true);
        const response = await fetch(
          `/api/backoffice/campaigns/${campaignId}/dashboard`,
          {
            headers: {
              'Client-Type': 'backoffice',
              'Authorization': `Bearer ${getToken()}`,
              'Workspace-Id': getWorkspaceId(),
            },
          }
        );

        if (!response.ok) {
          throw new Error('Failed to fetch dashboard');
        }

        const result = await response.json();
        setData(result.data);
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
      }
    }

    if (campaignId) {
      fetchDashboard();
    }
  }, [campaignId]);

  return { data, loading, error };
}

// Uso no componente
function CampaignDashboard({ campaignId }) {
  const { data, loading, error } = useCampaignDashboard(campaignId);

  if (loading) return <div>Carregando...</div>;
  if (error) return <div>Erro: {error.message}</div>;

  return (
    <div>
      <Metrics metrics={data.metrics} />
      <Phases phases={data.phases} />
      <Influencers influencers={data.influencers} />
      <Contents contents={data.contents} />
    </div>
  );
}
```

### Axios

```typescript
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3000/api/backoffice',
  headers: {
    'Client-Type': 'backoffice',
  },
});

// Interceptor para adicionar token e workspace
api.interceptors.request.use((config) => {
  config.headers.Authorization = `Bearer ${getToken()}`;
  config.headers['Workspace-Id'] = getWorkspaceId();
  return config;
});

async function getCampaignDashboard(campaignId: string) {
  const response = await api.get(`/campaigns/${campaignId}/dashboard`);
  return response.data.data;
}
```

---

## Tratamento de Erros

### Erro 404 - Campanha não encontrada

```json
{
  "statusCode": 404,
  "message": "Campanha não encontrada"
}
```

**Causas possíveis:**
- `campaignId` inválido ou não existe
- Campanha não pertence ao workspace informado

### Erro 403 - Sem permissão

```json
{
  "statusCode": 403,
  "message": "Você não tem permissão para acessar esse workspace."
}
```

**Causas possíveis:**
- `Workspace-Id` inválido
- Usuário não tem acesso ao workspace
- Usuário não é Owner do workspace

### Erro 401 - Não autenticado

```json
{
  "statusCode": 401,
  "message": "Não autorizado"
}
```

**Causas possíveis:**
- Token ausente ou inválido
- Token expirado

### Erro 500 - Erro interno

```json
{
  "statusCode": 500,
  "message": "Erro ao buscar dados da campanha"
}
```

**Ações:**
- Verificar logs do servidor
- Verificar se todas as tabelas existem no banco
- Verificar conexão com o banco de dados

---

## Migração do Frontend

### Antes (Múltiplas Chamadas)

```typescript
// ❌ Lento: 4 chamadas separadas
const [phases, influencers, contents, metrics] = await Promise.all([
  fetch(`/campaigns/${id}/phases`).then(r => r.json()),
  fetch(`/campaigns/${id}/influencers`).then(r => r.json()),
  fetch(`/campaigns/${id}/contents`).then(r => r.json()),
  fetch(`/campaigns/${id}/metrics`).then(r => r.json()),
]);
```

### Depois (Chamada Única)

```typescript
// ✅ Rápido: 1 chamada única
const response = await fetch(`/campaigns/${id}/dashboard`);
const { data } = await response.json();

const { phases, influencers, contents, metrics } = data;
```

---

## Performance e Limites

### Tempo de Resposta Esperado

| Cenário | Tempo (sem índices) | Tempo (com índices) |
|---------|---------------------|---------------------|
| Campanha pequena (< 5 influenciadores) | ~1-2s | ~0.5-1s |
| Campanha média (5-20 influenciadores) | ~2-3s | ~1-2s |
| Campanha grande (20+ influenciadores) | ~3-5s | ~2-3s |

### Limites Recomendados

- **Máximo de influenciadores por campanha:** 100
- **Máximo de conteúdos por campanha:** 500
- **Máximo de fases por campanha:** 20

Para campanhas maiores, considere implementar paginação.

---

## Checklist de Implementação

### Backend ✅

- [x] Endpoint `/dashboard` criado
- [x] Queries otimizadas (batch loading)
- [x] N+1 queries eliminadas
- [x] JOINs implementados
- [ ] Índices criados no banco (execute `add-performance-indexes.sql`)

### Frontend

- [ ] Substituir múltiplas chamadas por `/dashboard`
- [ ] Atualizar tipos TypeScript
- [ ] Testar performance
- [ ] Implementar tratamento de erros
- [ ] Adicionar loading states

### Banco de Dados

- [ ] Executar `create-missing-tables.sql`
- [ ] Executar `add-performance-indexes.sql`
- [ ] Verificar índices criados

---

## Troubleshooting

### Problema: Resposta ainda está lenta

**Soluções:**
1. Verificar se os índices foram criados:
   ```sql
   SELECT indexname FROM pg_indexes 
   WHERE tablename IN ('campaign_users', 'campaign_contents', 'campaign_steps');
   ```

2. Verificar conexão com o banco (latência de rede)
3. Verificar se há muitas campanhas/influenciadores (considerar paginação)

### Problema: Dados incompletos

**Verificar:**
- Se todas as tabelas existem no banco
- Se os JOINs estão retornando dados
- Logs do servidor para erros

### Problema: Erro 500

**Verificar:**
- Logs do servidor
- Se `campaign_contents` e outras tabelas existem
- Se a conexão com o banco está funcionando

---

## Próximas Melhorias

### Paginação (Futuro)

Para campanhas muito grandes, implementar paginação:

```typescript
GET /campaigns/:id/dashboard?page=1&limit=50
```

### Cache (Futuro)

Implementar cache Redis para dados que não mudam frequentemente:

```typescript
// Cache por 5 minutos
const cached = await redis.get(`dashboard:${campaignId}`);
if (cached) return JSON.parse(cached);
```

### Filtros (Futuro)

Adicionar query parameters para filtrar dados:

```typescript
GET /campaigns/:id/dashboard?status=aprovados&phase_id=...
```

---

## Referências

- **Endpoint alternativo (individual):** `/api/backoffice/campaigns/:id/phases`
- **Endpoint alternativo (individual):** `/api/backoffice/campaigns/:id/influencers`
- **Endpoint alternativo (individual):** `/api/backoffice/campaigns/:id/contents`
- **Endpoint alternativo (individual):** `/api/backoffice/campaigns/:id/metrics`

**Nota:** Os endpoints individuais também foram otimizados, mas o endpoint `/dashboard` é recomendado para melhor performance.

---

## Suporte

Para dúvidas ou problemas:
1. Verificar logs do servidor
2. Verificar documentação técnica completa em `BACKOFFICE_TECHNICAL_DOCUMENTATION.md`
3. Verificar se todas as tabelas e índices foram criados

