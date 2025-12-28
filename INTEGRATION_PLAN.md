# Plano de Integração - Backoffice Frontend ↔ API

## 📋 Resumo Executivo

Este documento detalha o plano de integração entre o frontend do backoffice e a API, identificando o que já está implementado, o que foi criado no frontend e quais endpoints precisam ser desenvolvidos no backend.

## Status da Integração

### ✅ Já Implementado

1. **Autenticação**
   - ✅ Login (`/auth/login`)
   - ✅ Registro (`/auth/register`)
   - ✅ Logout (`/auth/logout`)
   - ✅ Verificação de telefone (`/me/phone`, `/me/phone/verify`)

2. **Workspaces**
   - ✅ Listar workspaces (`/workspaces`)
   - ✅ Criar workspace (`/workspaces`)
   - ✅ Atualizar workspace (`/workspaces/{id}`) - **NOVO**
   - ✅ Deletar workspace (`/workspaces/{id}`) - **NOVO**

3. **Campanhas - Serviços Criados**
   - ✅ Listar campanhas (`/campaigns`)
   - ✅ Buscar campanha (`/campaigns/{id}`)
   - ✅ Criar campanha (`/campaigns`)
   - ✅ Atualizar campanha (`/campaigns/{id}`)
   - ✅ Deletar campanha (`/campaigns/{id}`)

### ⚠️ Endpoints que Precisam ser Criados no Backend

#### 1. Gestão de Influenciadores

```
GET    /campaigns/{campaignId}/influencers
       - Lista todos os influenciadores da campanha
       - Query params: status, phase_id
       - Response: Array<Influencer>

PUT    /campaigns/{campaignId}/influencers/{influencerId}/status
       - Atualiza status do influenciador
       - Body: { status: string, feedback?: string }
       - Response: 204

POST   /campaigns/{campaignId}/influencers/invite
       - Convida influenciador para campanha
       - Body: { influencer_id: string, message?: string }
       - Response: 204

POST   /campaigns/{campaignId}/influencers/{influencerId}/curation
       - Move influenciador para curadoria
       - Body: { notes?: string }
       - Response: 204

GET    /campaigns/{campaignId}/influencers/{influencerId}/history
       - Busca histórico de mudanças de status
       - Response: Array<{ status: string, timestamp: string, notes?: string }>
```

#### 2. Gestão de Conteúdos

```
GET    /campaigns/{campaignId}/contents
       - Lista conteúdos da campanha
       - Query params: status, phase_id
       - Response: Array<CampaignContent>

POST   /campaigns/{campaignId}/contents/{contentId}/approve
       - Aprova um conteúdo
       - Response: 204

POST   /campaigns/{campaignId}/contents/{contentId}/reject
       - Rejeita um conteúdo
       - Body: { feedback: string }
       - Response: 204

GET    /campaigns/{campaignId}/contents/{contentId}/evaluation
       - Busca avaliação da IA do conteúdo
       - Response: AIEvaluation
```

#### 3. Métricas

```
GET    /campaigns/{campaignId}/metrics
       - Métricas gerais da campanha
       - Response: CampaignMetrics

GET    /campaigns/{campaignId}/metrics/influencers
       - Métricas agrupadas por influenciador
       - Response: Array<InfluencerMetrics>

GET    /campaigns/{campaignId}/contents/{contentId}/metrics
       - Métricas de um conteúdo específico
       - Response: ContentMetrics

GET    /campaigns/{campaignId}/identified-posts
       - Publicações identificadas automaticamente
       - Query params: phase_id
       - Response: Array<IdentifiedPost>
```

#### 4. Fases da Campanha

```
GET    /campaigns/{campaignId}/phases
       - Lista fases da campanha
       - Response: Array<CampaignPhase>

POST   /campaigns/{campaignId}/phases
       - Cria nova fase
       - Body: { objective, post_date, post_time, formats, files }
       - Response: CampaignPhase

PUT    /campaigns/{campaignId}/phases/{phaseId}
       - Atualiza fase
       - Response: 204

DELETE /campaigns/{campaignId}/phases/{phaseId}
       - Deleta fase
       - Response: 204
```

#### 5. Mural de Influenciadores

```
POST   /campaigns/{campaignId}/mural/activate
       - Ativa o mural da campanha
       - Body: { end_date: string }
       - Response: 204

POST   /campaigns/{campaignId}/mural/deactivate
       - Desativa o mural (após data limite)
       - Response: 204

GET    /campaigns/{campaignId}/mural/status
       - Status do mural
       - Response: { active: boolean, end_date?: string }
```

#### 6. Chat com Influenciadores

```
GET    /campaigns/{campaignId}/influencers/{influencerId}/messages
       - Lista mensagens do chat
       - Response: Array<ChatMessage>

POST   /campaigns/{campaignId}/influencers/{influencerId}/messages
       - Envia mensagem
       - Body: { message: string, attachments?: Array<File> }
       - Response: ChatMessage
```

#### 7. Catálogo de Influenciadores

```
GET    /influencers/catalog
       - Lista catálogo de influenciadores
       - Query params: social_network, age_range, gender, followers_min, followers_max, niche, country, state, city
       - Response: Array<Influencer>

GET    /campaigns/{campaignId}/recommendations
       - Recomendações automáticas de influenciadores
       - Response: Array<{ influencer: Influencer, reason: string }>
```

## Estrutura de Dados Necessária

### Influencer (Atualizado)

```typescript
interface Influencer {
  id: string;
  name: string;
  username: string;
  avatar: string;
  followers: number;
  engagement: number;
  niche: string;
  social_network?: string;
  age_range?: string;
  location?: {
    country?: string;
    state?: string;
    city?: string;
  };
  status?: "inscriptions" | "curation" | "invited" | "approved_progress" | 
           "awaiting_approval" | "in_correction" | "content_approved" | 
           "published" | "rejected";
  phase?: string;
  status_history?: Array<{
    id: string;
    status: string;
    timestamp: string;
    notes?: string;
  }>;
}
```

### CampaignContent (Atualizado)

```typescript
interface CampaignContent {
  id: string;
  campaign_id: string;
  influencer_id: string;
  influencer_name: string;
  influencer_avatar: string;
  social_network: string;
  content_type: string;
  preview_url: string;
  post_url?: string;
  status: "pending" | "approved" | "rejected" | "published";
  phase_id?: string;
  submitted_at: string;
  published_at?: string;
  feedback?: string;
  ai_evaluation?: AIEvaluation;
}
```

## Próximos Passos

1. **Criar hooks React Query** para gerenciar estado e cache
2. **Integrar dados reais** nas tabs de campanha
3. **Implementar loading states** e error handling
4. **Adicionar mutations** para atualizações em tempo real
5. **Criar utilitários** para transformar dados da API para o formato do frontend

## Notas Importantes

- Todos os endpoints de campanha requerem o header `Workspace-Id`
- Todos os endpoints requerem autenticação (`Authorization: Bearer {token}`)
- Todos os endpoints requerem `Client-Type: backoffice`
- IDs de campanha são `public_id` (UUID), não IDs numéricos
- Status de influenciadores segue o fluxo do Kanban documentado

