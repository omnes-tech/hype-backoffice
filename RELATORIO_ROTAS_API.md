# Relatório de Rotas da Hype API - Frontend Backoffice

Este documento lista todas as rotas da API que são chamadas pelo frontend do backoffice.

**Base URL**: Configurada via variável de ambiente `VITE_SERVER_URL`

**Headers Padrão**:
- `Accept: application/json`
- `Content-Type: application/json` (quando aplicável)
- `Client-Type: backoffice`
- `Authorization: Bearer {token}` (quando autenticado)
- `Workspace-Id: {workspaceId}` (quando aplicável)

---

## 📋 Índice

1. [Autenticação](#autenticação)
2. [Usuário](#usuário)
3. [Workspaces](#workspaces)
4. [Campanhas](#campanhas)
5. [Fases de Campanha](#fases-de-campanha)
6. [Influenciadores](#influenciadores)
7. [Catálogo de Influenciadores](#catálogo-de-influenciadores)
8. [Conteúdos](#conteúdos)
9. [Chat](#chat)
10. [Dashboard](#dashboard)
11. [Métricas](#métricas)
12. [Mural](#mural)
13. [Usuários da Campanha](#usuários-da-campanha)
14. [Operações em Massa de Influenciadores](#operações-em-massa-de-influenciadores)
15. [Operações em Massa de Conteúdos](#operações-em-massa-de-conteúdos)
16. [Listas de Influenciadores](#listas-de-influenciadores)

---

## 🔐 Autenticação

### POST `/auth/login`
**Arquivo**: `src/shared/services/auth.ts`  
**Função**: `signIn()`  
**Autenticação**: Não requerida  
**Body**:
```json
{
  "email": "string",
  "password": "string"
}
```
**Resposta**: `{ token: string }`

---

### POST `/auth/register`
**Arquivo**: `src/shared/services/auth.ts`  
**Função**: `signUp()`  
**Autenticação**: Não requerida  
**Body**:
```json
{
  "name": "string",
  "email": "string",
  "password": "string",
  "password_confirmation": "string"
}
```
**Resposta**: `{ token: string }`

---

### POST `/auth/forgot-password`
**Arquivo**: `src/shared/services/auth.ts`  
**Função**: `forgotPassword()`  
**Autenticação**: Não requerida  
**Body**:
```json
{
  "email": "string"
}
```

---

### POST `/auth/reset-password`
**Arquivo**: `src/shared/services/auth.ts`  
**Função**: `resetPassword()`  
**Autenticação**: Não requerida  
**Body**:
```json
{
  "token": "string",
  "password": "string",
  "passwordConfirmation": "string"
}
```

---

### POST `/auth/logout`
**Arquivo**: `src/shared/services/auth.ts`  
**Função**: `logout()`  
**Autenticação**: Requerida (Bearer Token)

---

## 👤 Usuário

### GET `/me`
**Arquivo**: `src/shared/services/me.ts`  
**Função**: `getCurrentUser()`  
**Autenticação**: Requerida (Bearer Token)  
**Resposta**: `User` object

---

### POST `/me/phone`
**Arquivo**: `src/shared/services/me.ts`  
**Função**: `updatePhone()`  
**Autenticação**: Requerida (Bearer Token)  
**Body**:
```json
{
  "phone": "string"
}
```

---

### POST `/me/phone/verify`
**Arquivo**: `src/shared/services/me.ts`  
**Função**: `verifyPhone()`  
**Autenticação**: Requerida (Bearer Token)  
**Body**:
```json
{
  "phone": "string",
  "code": "string"
}
```

---

## 🏢 Workspaces

### GET `/workspaces`
**Arquivo**: `src/shared/services/workspace.ts`  
**Função**: `getWorkspaces()`  
**Autenticação**: Requerida (Bearer Token)  
**Resposta**: `Workspace[]`

---

### POST `/workspaces`
**Arquivo**: `src/shared/services/workspace.ts`  
**Função**: `createWorkspace()`  
**Autenticação**: Requerida (Bearer Token)  
**Body**:
```json
{
  "name": "string",
  "niche": "string",
  "description": "string"
}
```
**Resposta**: `Workspace`

---

### PUT `/workspaces/{workspaceId}`
**Arquivo**: `src/shared/services/workspace.ts`  
**Função**: `updateWorkspace()`  
**Autenticação**: Requerida (Bearer Token)  
**Parâmetros**: `workspaceId` (path)  
**Body**:
```json
{
  "name": "string"
}
```
**Resposta**: `Workspace`

---

### DELETE `/workspaces/{workspaceId}`
**Arquivo**: `src/shared/services/workspace.ts`  
**Função**: `deleteWorkspace()`  
**Autenticação**: Requerida (Bearer Token)  
**Parâmetros**: `workspaceId` (path)

---

## 📢 Campanhas

### GET `/campaigns`
**Arquivo**: `src/shared/services/campaign.ts`  
**Função**: `getCampaigns()`  
**Autenticação**: Requerida (Bearer Token + Workspace-Id)  
**Resposta**: `CampaignListItem[]`

---

### GET `/campaigns/{campaignId}`
**Arquivo**: `src/shared/services/campaign.ts`  
**Função**: `getCampaign()`  
**Autenticação**: Requerida (Bearer Token + Workspace-Id)  
**Parâmetros**: `campaignId` (path)  
**Resposta**: `CampaignDetail`

---

### POST `/campaigns`
**Arquivo**: `src/shared/services/campaign.ts`  
**Função**: `createCampaign()`  
**Autenticação**: Requerida (Bearer Token + Workspace-Id)  
**Body**:
```json
{
  "title": "string",
  "description": "string",
  "objective": "string",
  "secondary_niches": [{"id": 0, "name": "string"}],
  "max_influencers": 0,
  "payment_method": "string",
  "payment_method_details": {
    "amount": 0,
    "currency": "string",
    "description": "string"
  },
  "benefits": "string",
  "rules_does": "string",
  "rules_does_not": "string",
  "segment_min_followers": 0,
  "segment_state": "string",
  "segment_city": "string",
  "segment_genders": ["string"],
  "image_rights_period": 0,
  "banner": "string"
}
```
**Resposta**: `CampaignDetail`

---

### PUT `/campaigns/{campaignId}`
**Arquivo**: `src/shared/services/campaign.ts`  
**Função**: `updateCampaign()`  
**Autenticação**: Requerida (Bearer Token + Workspace-Id)  
**Parâmetros**: `campaignId` (path)  
**Body**: `UpdateCampaignData` (parcial de `CreateCampaignData`)

---

### DELETE `/campaigns/{campaignId}`
**Arquivo**: `src/shared/services/campaign.ts`  
**Função**: `deleteCampaign()`  
**Autenticação**: Requerida (Bearer Token + Workspace-Id)  
**Parâmetros**: `campaignId` (path)

---

## 📅 Fases de Campanha

### GET `/campaigns/{campaignId}/phases`
**Arquivo**: `src/shared/services/phase.ts`  
**Função**: `getCampaignPhases()`  
**Autenticação**: Requerida (Bearer Token + Workspace-Id)  
**Parâmetros**: `campaignId` (path)  
**Resposta**: `CampaignPhase[]`

---

### POST `/campaigns/{campaignId}/phases`
**Arquivo**: `src/shared/services/phase.ts`  
**Função**: `createCampaignPhase()`  
**Autenticação**: Requerida (Bearer Token + Workspace-Id)  
**Parâmetros**: `campaignId` (path)  
**Body**:
```json
{
  "objective": "string",
  "post_date": "string",
  "post_time": "string",
  "formats": [
    {
      "type": "string",
      "options": [
        {
          "type": "string",
          "quantity": 0
        }
      ]
    }
  ],
  "files": ["string"]
}
```
**Resposta**: `CampaignPhase`

---

### PUT `/campaigns/{campaignId}/phases/{phaseId}`
**Arquivo**: `src/shared/services/phase.ts`  
**Função**: `updateCampaignPhase()`  
**Autenticação**: Requerida (Bearer Token + Workspace-Id)  
**Parâmetros**: `campaignId` (path), `phaseId` (path)  
**Body**: `UpdatePhaseData` (parcial de `CreatePhaseData`)  
**Resposta**: `CampaignPhase`

---

### DELETE `/campaigns/{campaignId}/phases/{phaseId}`
**Arquivo**: `src/shared/services/phase.ts`  
**Função**: `deleteCampaignPhase()`  
**Autenticação**: Requerida (Bearer Token + Workspace-Id)  
**Parâmetros**: `campaignId` (path), `phaseId` (path)

---

## 👥 Influenciadores

### GET `/campaigns/{campaignId}/influencers`
**Arquivo**: `src/shared/services/influencer.ts`  
**Função**: `getCampaignInfluencers()`  
**Autenticação**: Requerida (Bearer Token + Workspace-Id)  
**Parâmetros**: `campaignId` (path)  
**Resposta**: `Influencer[]`

---

### PUT `/campaigns/{campaignId}/influencers/{influencerId}/status`
**Arquivo**: `src/shared/services/influencer.ts`  
**Função**: `updateInfluencerStatus()`  
**Autenticação**: Requerida (Bearer Token + Workspace-Id)  
**Parâmetros**: `campaignId` (path), `influencerId` (path)  
**Body**:
```json
{
  "status": "string",
  "feedback": "string"
}
```

---

### POST `/campaigns/{campaignId}/influencers/invite`
**Arquivo**: `src/shared/services/influencer.ts`  
**Função**: `inviteInfluencer()`  
**Autenticação**: Requerida (Bearer Token + Workspace-Id)  
**Parâmetros**: `campaignId` (path)  
**Body**:
```json
{
  "influencer_id": "string",
  "message": "string"
}
```

---

### POST `/campaigns/{campaignId}/influencers/{influencerId}/curation`
**Arquivo**: `src/shared/services/influencer.ts`  
**Função**: `moveToCuration()`  
**Autenticação**: Requerida (Bearer Token + Workspace-Id)  
**Parâmetros**: `campaignId` (path), `influencerId` (path)  
**Body**:
```json
{
  "notes": "string"
}
```

---

### GET `/campaigns/{campaignId}/influencers/{influencerId}/history`
**Arquivo**: `src/shared/services/influencer.ts`  
**Função**: `getInfluencerHistory()`  
**Autenticação**: Requerida (Bearer Token + Workspace-Id)  
**Parâmetros**: `campaignId` (path), `influencerId` (path)  
**Resposta**: Array de histórico de status

---

## 🔍 Catálogo de Influenciadores

### GET `/influencers/catalog`
**Arquivo**: `src/shared/services/catalog.ts`  
**Função**: `getInfluencersCatalog()`  
**Autenticação**: Requerida (Bearer Token + Workspace-Id)  
**Query Parameters**:
- `social_network` (string)
- `age_range` (string)
- `gender` (string)
- `followers_min` (number)
- `followers_max` (number)
- `niche` (string)
- `country` (string)
- `state` (string)
- `city` (string)
**Resposta**: `Influencer[]`

---

### GET `/influencers/campaigns/{campaignId}/recommendations`
**Arquivo**: `src/shared/services/catalog.ts`  
**Função**: `getCampaignRecommendations()`  
**Autenticação**: Requerida (Bearer Token + Workspace-Id)  
**Parâmetros**: `campaignId` (path)  
**Resposta**: `Recommendation[]`

---

## 📄 Conteúdos

### GET `/campaigns/{campaignId}/contents`
**Arquivo**: `src/shared/services/content.ts`  
**Função**: `getCampaignContents()`  
**Autenticação**: Requerida (Bearer Token + Workspace-Id)  
**Parâmetros**: `campaignId` (path)  
**Query Parameters**:
- `status` (string)
- `phase_id` (string)
**Resposta**: `CampaignContent[]`

---

### POST `/campaigns/{campaignId}/contents/{contentId}/approve`
**Arquivo**: `src/shared/services/content.ts`  
**Função**: `approveContent()`  
**Autenticação**: Requerida (Bearer Token + Workspace-Id)  
**Parâmetros**: `campaignId` (path), `contentId` (path)

---

### POST `/campaigns/{campaignId}/contents/{contentId}/reject`
**Arquivo**: `src/shared/services/content.ts`  
**Função**: `rejectContent()`  
**Autenticação**: Requerida (Bearer Token + Workspace-Id)  
**Parâmetros**: `campaignId` (path), `contentId` (path)  
**Body**:
```json
{
  "feedback": "string"
}
```

---

### GET `/campaigns/{campaignId}/contents/{contentId}/evaluation`
**Arquivo**: `src/shared/services/content.ts`  
**Função**: `getContentEvaluation()`  
**Autenticação**: Requerida (Bearer Token + Workspace-Id)  
**Parâmetros**: `campaignId` (path), `contentId` (path)  
**Resposta**:
```json
{
  "score": 0,
  "criteria": {
    "relevance": 0,
    "quality": 0,
    "engagement": 0
  },
  "recommendations": ["string"]
}
```

---

## 💬 Chat

### GET `/campaigns/{campaignId}/influencers/{influencerId}/messages`
**Arquivo**: `src/shared/services/chat.ts`  
**Função**: `getInfluencerMessages()`  
**Autenticação**: Requerida (Bearer Token + Workspace-Id)  
**Parâmetros**: `campaignId` (path), `influencerId` (path)  
**Resposta**: `ChatMessage[]`

---

### POST `/campaigns/{campaignId}/influencers/{influencerId}/messages`
**Arquivo**: `src/shared/services/chat.ts`  
**Função**: `sendMessage()`  
**Autenticação**: Requerida (Bearer Token + Workspace-Id)  
**Parâmetros**: `campaignId` (path), `influencerId` (path)  
**Body**:
```json
{
  "message": "string",
  "attachments": ["string"]
}
```
**Resposta**: `ChatMessage`

---

## 📊 Dashboard

### GET `/campaigns/{campaignId}/dashboard`
**Arquivo**: `src/shared/services/dashboard.ts`  
**Função**: `getCampaignDashboard()`  
**Autenticação**: Requerida (Bearer Token + Workspace-Id)  
**Parâmetros**: `campaignId` (path)  
**Resposta**: `DashboardResponse` contendo:
- `phases`: `DashboardPhase[]`
- `influencers`: `DashboardInfluencer[]`
- `contents`: `DashboardContent[]`
- `metrics`: `DashboardMetrics`

---

## 📈 Métricas

### GET `/campaigns/{campaignId}/metrics`
**Arquivo**: `src/shared/services/metrics.ts`  
**Função**: `getCampaignMetrics()`  
**Autenticação**: Requerida (Bearer Token + Workspace-Id)  
**Parâmetros**: `campaignId` (path)  
**Resposta**: `CampaignMetrics`

---

### GET `/campaigns/{campaignId}/metrics/influencers`
**Arquivo**: `src/shared/services/metrics.ts`  
**Função**: `getInfluencerMetrics()`  
**Autenticação**: Requerida (Bearer Token + Workspace-Id)  
**Parâmetros**: `campaignId` (path)  
**Resposta**: `InfluencerMetrics[]`

---

### GET `/campaigns/{campaignId}/contents/{contentId}/metrics`
**Arquivo**: `src/shared/services/metrics.ts`  
**Função**: `getContentMetrics()`  
**Autenticação**: Requerida (Bearer Token + Workspace-Id)  
**Parâmetros**: `campaignId` (path), `contentId` (path)  
**Resposta**: `ContentMetrics`

---

### GET `/campaigns/{campaignId}/metrics/identified-posts`
**Arquivo**: `src/shared/services/metrics.ts`  
**Função**: `getIdentifiedPosts()`  
**Autenticação**: Requerida (Bearer Token + Workspace-Id)  
**Parâmetros**: `campaignId` (path)  
**Query Parameters**:
- `phase_id` (string)
**Resposta**: `IdentifiedPost[]`

---

## 🎨 Mural

### POST `/campaigns/{campaignId}/mural/activate`
**Arquivo**: `src/shared/services/mural.ts`  
**Função**: `activateMural()`  
**Autenticação**: Requerida (Bearer Token + Workspace-Id)  
**Parâmetros**: `campaignId` (path)  
**Body**:
```json
{
  "end_date": "string"
}
```

---

### POST `/campaigns/{campaignId}/mural/deactivate`
**Arquivo**: `src/shared/services/mural.ts`  
**Função**: `deactivateMural()`  
**Autenticação**: Requerida (Bearer Token + Workspace-Id)  
**Parâmetros**: `campaignId` (path)

---

### GET `/campaigns/{campaignId}/mural/status`
**Arquivo**: `src/shared/services/mural.ts`  
**Função**: `getMuralStatus()`  
**Autenticação**: Requerida (Bearer Token + Workspace-Id)  
**Parâmetros**: `campaignId` (path)  
**Resposta**: `MuralStatus`

---

## 👥 Usuários da Campanha

### GET `/campaigns/{campaignId}/users`
**Arquivo**: `src/shared/services/campaign-users.ts`  
**Função**: `getCampaignUsers()`  
**Autenticação**: Requerida (Bearer Token + Workspace-Id)  
**Parâmetros**: `campaignId` (path)  
**Resposta**: Array de usuários da campanha com seus respectivos status (inscricoes, aprovado, curadoria, recusado)

---

### PUT `/campaigns/{campaignId}/users/{userId}`
**Arquivo**: `src/shared/services/campaign-users.ts`  
**Função**: `updateCampaignUserStatus()`  
**Autenticação**: Requerida (Bearer Token + Workspace-Id)  
**Parâmetros**: `campaignId` (path), `userId` (path)  
**Body**:
```json
{
  "action": "aprovado" | "curadoria" | "recusado" | "inscricoes"
}
```
**Descrição**: Atualiza o status de um usuário na campanha. Usado quando o usuário é arrastado para diferentes colunas do Kanban.

----

## 📦 Operações em Massa de Influenciadores

### POST `/campaigns/{campaignId}/influencers/bulk-approve`
**Arquivo**: `src/shared/services/influencer.ts`  
**Função**: `bulkApproveInfluencers()`  
**Autenticação**: Requerida (Bearer Token + Workspace-Id)  
**Parâmetros**: `campaignId` (path)  
**Body**:
```json
{
  "influencer_ids": string[],
  "feedback": string (opcional)
}
```
**Descrição**: Aprova múltiplos influenciadores em massa. Usado na aba de curadoria para aprovar vários influenciadores de uma vez.

----

### POST `/campaigns/{campaignId}/influencers/bulk-reject`
**Arquivo**: `src/shared/services/influencer.ts`  
**Função**: `bulkRejectInfluencers()`  
**Autenticação**: Requerida (Bearer Token + Workspace-Id)  
**Parâmetros**: `campaignId` (path)  
**Body**:
```json
{
  "influencer_ids": string[],
  "feedback": string (obrigatório)
}
```
**Descrição**: Reprova múltiplos influenciadores em massa. Usado na aba de curadoria para reprovar vários influenciadores de uma vez. O feedback é obrigatório.

----

### POST `/campaigns/{campaignId}/influencers/bulk-add`
**Arquivo**: `src/shared/services/influencer-lists.ts`  
**Função**: `bulkAddInfluencersToCampaign()`  
**Autenticação**: Requerida (Bearer Token + Workspace-Id)  
**Parâmetros**: `campaignId` (path)  
**Body**:
```json
{
  "influencer_ids": string[] (opcional),
  "list_id": string (opcional)
}
```
**Descrição**: Adiciona múltiplos influenciadores à campanha. Pode ser feito via array de IDs ou via ID de uma lista salva. Usado para adicionar uma lista completa de influenciadores à campanha.

----

## 📦 Operações em Massa de Conteúdos

### POST `/campaigns/{campaignId}/contents/bulk-approve`
**Arquivo**: `src/shared/services/content.ts`  
**Função**: `bulkApproveContents()`  
**Autenticação**: Requerida (Bearer Token + Workspace-Id)  
**Parâmetros**: `campaignId` (path)  
**Body**:
```json
{
  "content_ids": string[]
}
```
**Descrição**: Aprova múltiplos conteúdos em massa. Usado na aba de aprovação de conteúdo para aprovar vários conteúdos de uma vez.

----

### POST `/campaigns/{campaignId}/contents/bulk-reject`
**Arquivo**: `src/shared/services/content.ts`  
**Função**: `bulkRejectContents()`  
**Autenticação**: Requerida (Bearer Token + Workspace-Id)  
**Parâmetros**: `campaignId` (path)  
**Body**:
```json
{
  "content_ids": string[],
  "feedback": string (obrigatório)
}
```
**Descrição**: Reprova múltiplos conteúdos em massa. Usado na aba de aprovação de conteúdo para reprovar vários conteúdos de uma vez. O feedback é obrigatório.

----

## 📋 Listas de Influenciadores

### GET `/influencer-lists`
**Arquivo**: `src/shared/services/influencer-lists.ts`  
**Função**: `getInfluencerLists()`  
**Autenticação**: Requerida (Bearer Token + Workspace-Id)  
**Descrição**: Lista todas as listas de influenciadores do workspace. Usado para exibir as listas disponíveis no seletor de listas.

**Resposta**:
```json
{
  "data": [
    {
      "id": "string",
      "name": "string",
      "created_at": "string",
      "influencer_count": number
    }
  ]
}
```

----

### GET `/influencer-lists/{listId}`
**Arquivo**: `src/shared/services/influencer-lists.ts`  
**Função**: `getInfluencerList()`  
**Autenticação**: Requerida (Bearer Token + Workspace-Id)  
**Parâmetros**: `listId` (path)  
**Descrição**: Obtém detalhes de uma lista específica, incluindo todos os influenciadores da lista.

**Resposta**:
```json
{
  "data": {
    "id": "string",
    "name": "string",
    "influencers": [
      {
        "id": number,
        "name": "string",
        "email": "string",
        "photo": "string | null"
      }
    ],
    "created_at": "string"
  }
}
```

----

---

## 📊 Estatísticas Gerais

### Total de Rotas: **55**

#### Por Método HTTP:
- **GET**: 20 rotas
- **POST**: 20 rotas
- **PUT**: 6 rotas
- **DELETE**: 2 rotas

#### Por Categoria:
- **Autenticação**: 5 rotas
- **Usuário**: 3 rotas
- **Workspaces**: 4 rotas
- **Campanhas**: 5 rotas
- **Fases de Campanha**: 4 rotas
- **Influenciadores**: 5 rotas
- **Catálogo de Influenciadores**: 2 rotas
- **Conteúdos**: 4 rotas
- **Chat**: 2 rotas
- **Dashboard**: 1 rota
- **Métricas**: 4 rotas
- **Mural**: 3 rotas
- **Usuários da Campanha**: 2 rotas
- **Operações em Massa de Influenciadores**: 3 rotas
- **Operações em Massa de Conteúdos**: 2 rotas
- **Listas de Influenciadores**: 2 rotas

#### Requerem Autenticação:
- **Com Bearer Token**: 48 rotas
- **Sem autenticação**: 5 rotas (login, register, forgot-password, reset-password)

#### Requerem Workspace-Id:
- **Com Workspace-Id**: 46 rotas
- **Sem Workspace-Id**: 9 rotas (auth, me, workspaces)

---

## 🔍 Observações Importantes

1. **Headers Padrão**: Todas as requisições incluem `Client-Type: backoffice` para identificar o cliente.

2. **Autenticação**: A maioria das rotas requer autenticação via Bearer Token armazenado no localStorage.

3. **Workspace-Id**: A maioria das rotas relacionadas a campanhas requer o header `Workspace-Id` obtido do localStorage.

4. **Tratamento de Erros**: Todas as funções seguem um padrão de tratamento de erro consistente, retornando mensagens de erro da API ou mensagens padrão.

5. **Formato de Resposta**: A API retorna dados no formato `{ data: ... }`, e os serviços extraem o campo `data` antes de retornar.

6. **Query Parameters**: Algumas rotas suportam filtros via query parameters (especialmente catálogo, conteúdos e métricas).

---

**Última atualização**: Gerado automaticamente a partir da análise do código fonte.

