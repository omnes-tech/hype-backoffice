# Análise da Documentação da API vs Frontend

## ✅ Endpoints Documentados e Implementados

Todos os endpoints principais estão documentados na `BACKOFFICE_TECHNICAL_DOCUMENTATION.md`:

### ✅ Gestão de Influenciadores (5 endpoints)
- ✅ GET `/campaigns/{campaignId}/influencers`
- ✅ PUT `/campaigns/{campaignId}/influencers/{influencerId}/status`
- ✅ POST `/campaigns/{campaignId}/influencers/invite`
- ✅ POST `/campaigns/{campaignId}/influencers/{influencerId}/curation`
- ✅ GET `/campaigns/{campaignId}/influencers/{influencerId}/history`

### ✅ Gestão de Conteúdos (4 endpoints)
- ✅ GET `/campaigns/{campaignId}/contents`
- ✅ POST `/campaigns/{campaignId}/contents/{contentId}/approve`
- ✅ POST `/campaigns/{campaignId}/contents/{contentId}/reject`
- ✅ GET `/campaigns/{campaignId}/contents/{contentId}/evaluation`

### ✅ Métricas (4 endpoints)
- ✅ GET `/campaigns/{campaignId}/metrics`
- ✅ GET `/campaigns/{campaignId}/metrics/influencers`
- ✅ GET `/campaigns/{campaignId}/metrics/contents/{contentId}`
- ✅ GET `/campaigns/{campaignId}/metrics/identified-posts`

### ✅ Fases da Campanha (4 endpoints)
- ✅ GET `/campaigns/{campaignId}/phases`
- ✅ POST `/campaigns/{campaignId}/phases`
- ✅ PUT `/campaigns/{campaignId}/phases/{phaseId}`
- ✅ DELETE `/campaigns/{campaignId}/phases/{phaseId}`

### ✅ Mural de Influenciadores (3 endpoints)
- ✅ POST `/campaigns/{campaignId}/mural/activate`
- ✅ POST `/campaigns/{campaignId}/mural/deactivate`
- ✅ GET `/campaigns/{campaignId}/mural/status`

### ✅ Chat com Influenciadores (2 endpoints)
- ✅ GET `/campaigns/{campaignId}/influencers/{influencerId}/messages`
- ✅ POST `/campaigns/{campaignId}/influencers/{influencerId}/messages`

### ✅ Catálogo de Influenciadores (2 endpoints)
- ✅ GET `/influencers/catalog`
- ✅ GET `/campaigns/{campaignId}/recommendations`

---

## ⚠️ Inconsistências Identificadas

### 1. Estrutura de Resposta de Influenciadores

**Documentação da API:**
```json
{
  "id": 1,
  "user": {
    "id": 10,
    "name": "Influencer Name",
    "email": "influencer@example.com",
    "photo": "https://example.com/photo.jpg"
  },
  "status": {
    "value": "aprovados",
    "label": "Aprovados/Em andamento"
  },
  "invited_by": 5,
  "invited_at": "2024-01-01T00:00:00.000000Z",
  "joined_at": "2024-01-02T00:00:00.000000Z"
}
```

**Frontend Espera:**
```typescript
interface Influencer {
  id: string;
  name: string;
  username: string;
  avatar: string;
  followers: number;
  engagement: number;
  niche: string;
  status?: string;
  socialNetwork?: string;
  statusHistory?: StatusHistory[];
}
```

**Ação Necessária:**
- Criar função de transformação (`transformInfluencer`) para converter resposta da API para formato do frontend
- OU atualizar tipos do frontend para corresponder à estrutura da API

### 2. Endpoint de Posts Identificados

**Documentação:** `/campaigns/{campaignId}/metrics/identified-posts`
**Serviço Frontend:** `/campaigns/{campaignId}/identified-posts`

**Ação Necessária:**
- Verificar qual é o endpoint correto no backend
- Atualizar serviço do frontend se necessário

### 3. Estrutura de Métricas

**Documentação da API - Métricas Gerais:**
```json
{
  "total_influencers": 15,
  "approved_influencers": 10,
  "total_contents": 25,
  "approved_contents": 20,
  "published_contents": 18
}
```

**Frontend Espera:**
```typescript
interface CampaignMetrics {
  reach: number;
  engagement: number;
  published_content: number;
  active_influencers: number;
  conversion_rate?: number;
}
```

**Ação Necessária:**
- Alinhar estrutura de métricas entre API e frontend
- Criar função de transformação ou atualizar tipos

### 4. Estrutura de Métricas por Influenciador

**Documentação da API:**
```json
{
  "influencer_id": "10",
  "total_contents": 5,
  "approved_contents": 4,
  "status": "aprovados"
}
```

**Frontend Espera:**
```typescript
interface InfluencerMetrics {
  influencer_id: string;
  influencer_name: string;
  influencer_avatar: string;
  total_views: number;
  total_likes: number;
  total_comments: number;
  total_shares: number;
  total_reach: number;
  average_engagement: number;
  contents_count: number;
}
```

**Ação Necessária:**
- Verificar se a API retorna todos os campos necessários
- Se não, adicionar campos faltantes na documentação/API

### 5. Estrutura de Posts Identificados

**Documentação da API:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "campaign_id": "550e8400-e29b-41d4-a716-446655440001",
  "phase_id": "550e8400-e29b-41d4-a716-446655440002",
  "user_id": "10",
  "post_url": "https://instagram.com/p/abc123",
  "post_id": "abc123",
  "identified_at": "2024-01-01T00:00:00.000000Z"
}
```

**Frontend Espera:**
```typescript
interface IdentifiedPost {
  id: string;
  influencerId: string;
  influencerName: string;
  influencerAvatar: string;
  socialNetwork: string;
  contentType: string;
  postUrl: string;
  previewUrl: string;
  phaseId: string;
  phaseHashtag: string;
  publishedAt: string;
  metrics?: ContentMetrics;
}
```

**Ação Necessária:**
- Verificar se a API retorna informações do influenciador e preview
- Adicionar campos faltantes se necessário

---

## 📝 Endpoints Faltando no Frontend

### 1. Serviços de Fases
- ❌ `getCampaignPhases(campaignId)`
- ❌ `createCampaignPhase(campaignId, data)`
- ❌ `updateCampaignPhase(campaignId, phaseId, data)`
- ❌ `deleteCampaignPhase(campaignId, phaseId)`

### 2. Serviços de Mural
- ❌ `activateMural(campaignId, endDate)`
- ❌ `deactivateMural(campaignId)`
- ❌ `getMuralStatus(campaignId)`

### 3. Serviços de Chat
- ❌ `getInfluencerMessages(campaignId, influencerId)`
- ❌ `sendMessage(campaignId, influencerId, data)`

### 4. Serviços de Catálogo
- ❌ `getInfluencersCatalog(filters)`
- ❌ `getCampaignRecommendations(campaignId)`

### 5. Serviços de Histórico
- ❌ `getInfluencerHistory(campaignId, influencerId)`

### 6. Serviços de Curadoria
- ❌ `moveToCuration(campaignId, influencerId, notes)`

### 7. Serviços de Avaliação de IA
- ❌ `getContentEvaluation(campaignId, contentId)`

---

## 🔧 Ações Recomendadas

### Prioridade Alta

1. **Criar funções de transformação de dados**
   - `transformInfluencer()` - Converter resposta da API para formato do frontend
   - `transformMetrics()` - Alinhar métricas
   - `transformIdentifiedPost()` - Adicionar campos faltantes

2. **Criar serviços faltantes**
   - Serviços de fases (`phase.ts`)
   - Serviços de mural (`mural.ts`)
   - Serviços de chat (`chat.ts`)
   - Serviços de catálogo (`catalog.ts`)

3. **Atualizar tipos TypeScript**
   - Adicionar tipos para respostas da API
   - Criar tipos de transformação

### Prioridade Média

4. **Verificar endpoints**
   - Confirmar URL correta de posts identificados
   - Verificar se todos os campos necessários estão sendo retornados

5. **Criar hooks React Query**
   - Hooks para fases, mural, chat, catálogo

### Prioridade Baixa

6. **Documentação**
   - Atualizar INTEGRATION_PLAN.md marcando endpoints como implementados
   - Adicionar exemplos de transformação de dados

---

## ✅ Checklist de Validação

- [ ] Todos os endpoints estão documentados
- [ ] Estruturas de resposta estão alinhadas
- [ ] Serviços do frontend correspondem aos endpoints
- [ ] Tipos TypeScript refletem a estrutura real da API
- [ ] Funções de transformação criadas onde necessário
- [ ] Hooks React Query criados para todos os serviços
- [ ] Tratamento de erros implementado
- [ ] Loading states implementados

