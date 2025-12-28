# Documentação Técnica - Backoffice API

## Índice

1. [Visão Geral](#visão-geral)
2. [Arquitetura](#arquitetura)
3. [Autenticação e Autorização](#autenticação-e-autorização)
4. [Endpoints](#endpoints)
5. [Modelos de Dados](#modelos-de-dados)
6. [Validações](#validações)
7. [Resources (Transformadores)](#resources-transformadores)
8. [Middlewares](#middlewares)
9. [Políticas de Acesso](#políticas-de-acesso)
10. [Estrutura Nest.js](#estrutura-nestjs)
11. [Fluxos Principais](#fluxos-principais)
12. [Segurança](#segurança)

---

## Visão Geral

O Backoffice API é um sistema de gerenciamento para clientes, agências e administradores gerenciarem campanhas de marketing de influenciadores. O sistema utiliza multi-tenancy através de workspaces, onde cada workspace pode ter múltiplos usuários com diferentes níveis de permissão.

### Características Principais

- **Multi-tenancy**: Sistema baseado em workspaces isolados
- **Autenticação por Token**: Utiliza Laravel Sanctum (Laravel) ou JWT (Nest.js)
- **Autorização por Abilities**: Sistema de permissões baseado em abilities
- **Tipos de Usuário**: Cliente, Agência e Administrador
- **Gestão de Campanhas**: CRUD completo de campanhas de marketing
- **Gestão de Workspaces**: Criação, edição e exclusão de workspaces

### Stack Tecnológica

- **Laravel** (versão atual): PHP 8.1+, Laravel Sanctum, Eloquent ORM
- **Nest.js** (em migração): TypeScript, Drizzle ORM, JWT
- **Banco de Dados**: PostgreSQL
- **Autenticação**: Token-based (Sanctum/JWT)

---

## Arquitetura

### Estrutura de Diretórios (Laravel)

```
app/
├── Http/
│   ├── Controllers/
│   │   └── Backoffice/
│   │       ├── Auth/
│   │       │   ├── LoginController.php
│   │       │   ├── RegisterController.php
│   │       │   └── LogoutController.php
│   │       ├── Me/
│   │       │   ├── GetController.php
│   │       │   ├── UpdatePhoneController.php
│   │       │   └── VerifyPhoneController.php
│   │       ├── Workspace/
│   │       │   ├── GetController.php
│   │       │   ├── StoreController.php
│   │       │   ├── UpdateController.php
│   │       │   └── DeleteController.php
│   │       └── Campaign/
│   │           ├── IndexController.php
│   │           ├── GetController.php
│   │           ├── StoreController.php
│   │           ├── UpdateController.php
│   │           └── DeleteController.php
│   ├── Middleware/
│   │   ├── EnsureClientTypeMiddleware.php
│   │   └── EnsureWorkspaceIdMiddleware.php
│   ├── Requests/
│   │   └── Backoffice/
│   │       ├── Auth/
│   │       ├── Me/
│   │       ├── Workspace/
│   │       └── Campaign/
│   └── Resources/
│       └── Backoffice/
│           ├── UserResource.php
│           ├── WorkspaceResource.php
│           └── CampaignResource.php
├── Models/
│   ├── User.php
│   ├── Workspace.php
│   └── Campaign.php
├── Enums/
│   ├── UserTypeEnum.php
│   ├── WorkspaceRoleEnum.php
│   └── CampaignStatusEnum.php
└── Policies/
    └── WorkspacePolicy.php
```

### Estrutura de Diretórios (Nest.js)

```
src/
├── modules/
│   └── backoffice/
│       ├── backoffice.module.ts
│       ├── controllers/
│       │   ├── auth.controller.ts
│       │   ├── me.controller.ts
│       │   ├── workspaces.controller.ts
│       │   ├── campaigns.controller.ts
│       │   ├── campaign-steps.controller.ts
│       │   ├── campaign-users.controller.ts
│       │   ├── campaign-contents.controller.ts
│       │   ├── campaign-metrics.controller.ts
│       │   ├── campaign-mural.controller.ts
│       │   ├── campaign-messages.controller.ts
│       │   └── influencers-catalog.controller.ts
│       ├── dto/
│       │   ├── update-influencer-status.dto.ts
│       │   ├── invite-influencer.dto.ts
│       │   ├── move-to-curation.dto.ts
│       │   ├── reject-content.dto.ts
│       │   ├── create-phase.dto.ts
│       │   ├── activate-mural.dto.ts
│       │   └── send-message.dto.ts
├── resources/
│   └── backoffice/
│       ├── campaign.resource.ts
│       ├── user.resource.ts
│       ├── workspace.resource.ts
│       ├── influencer.resource.ts
│       ├── metrics.resource.ts
│       └── identified-post.resource.ts
│       │   ├── campaign-messages.controller.ts
│       │   ├── influencers-catalog.controller.ts
│       │   └── niches.controller.ts
│       └── dto/
│           ├── login.dto.ts
│           ├── register.dto.ts
│           ├── store-workspace.dto.ts
│           ├── update-workspace.dto.ts
│           ├── store-campaign.dto.ts
│           ├── update-campaign.dto.ts
│           ├── update-influencer-status.dto.ts
│           ├── invite-influencer.dto.ts
│           ├── move-to-curation.dto.ts
│           ├── reject-content.dto.ts
│           ├── create-phase.dto.ts
│           ├── activate-mural.dto.ts
│           └── send-message.dto.ts
├── common/
│   ├── guards/
│   │   ├── client-type.guard.ts
│   │   ├── auth.guard.ts
│   │   ├── ability.guard.ts
│   │   └── workspace.guard.ts
│   └── decorators/
│       ├── user.decorator.ts
│       ├── workspace.decorator.ts
│       └── ability.decorator.ts
└── resources/
    └── backoffice/
        ├── user.resource.ts
        ├── workspace.resource.ts
        └── campaign.resource.ts
```

---

## Autenticação e Autorização

### Fluxo de Autenticação

1. **Login/Register**: Usuário fornece credenciais
2. **Validação**: Sistema valida email/senha e tipo de usuário
3. **Token Generation**: Gera token com abilities específicas
4. **Token Storage**: Token armazenado no banco (Sanctum) ou JWT assinado
5. **Request Authentication**: Token enviado no header `Authorization: Bearer {token}`

### Tipos de Usuário Permitidos

```php
// app/Enums/UserTypeEnum.php
enum UserTypeEnum: int
{
    case Influencer = 10;  // Não permitido no backoffice
    case Client = 20;       // Permitido
    case Agency = 30;       // Permitido
    case Admin = 100;       // Permitido
}
```

### Client Type

Todos os usuários do backoffice recebem a ability `client_type:backoffice`:

```php
$clientType = $user->type->clientType(); // Retorna 'backoffice'
$token = $user->createToken('backoffice', ["client_type:{$clientType}"]);
```

### Headers Obrigatórios

Todas as requisições devem incluir:

```
Client-Type: backoffice
Authorization: Bearer {token}
```

Para rotas de campanhas, também é necessário:

```
Workspace-Id: {workspace_public_id}
```

---

## Endpoints

### Base URL

```
/api/backoffice
```

### Autenticação

#### POST `/auth/login`

Autentica um usuário existente.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response (200):**
```json
{
  "data": {
    "token": "1|xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
  }
}
```

**Validações:**
- `email`: obrigatório, formato válido
- `password`: obrigatório, string

**Regras de Negócio:**
- Usuário deve existir
- Senha deve ser válida
- Tipo de usuário deve ser: Client, Agency ou Admin
- Retorna erro genérico: "E-mail ou senha inválidos"

#### POST `/auth/register`

Registra um novo usuário.

**Request:**
```json
{
  "name": "John Doe",
  "email": "user@example.com",
  "password": "password123"
}
```

**Response (201):**
```json
{
  "data": {
    "token": "1|xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
  }
}
```

**Validações:**
- `name`: obrigatório, string
- `email`: obrigatório, formato válido, único
- `password`: obrigatório, string, mínimo 8 caracteres

**Regras de Negócio:**
- Tipo de usuário padrão: `Client`
- Token gerado automaticamente após registro
- Email deve ser único no sistema

#### POST `/auth/logout`

Revoga o token do usuário autenticado.

**Headers:**
```
Authorization: Bearer {token}
```

**Response (200):**
```json
{
  "data": {
    "message": "Logout realizado com sucesso"
  }
}
```

---

### Perfil do Usuário

#### GET `/me`

Retorna os dados do usuário autenticado.

**Response (200):**
```json
{
  "data": {
    "id": 1,
    "name": "John Doe",
    "email": "user@example.com",
    "phone": "+5511999999999",
    "created_at": "2024-01-01T00:00:00.000000Z",
    "updated_at": "2024-01-01T00:00:00.000000Z"
  }
}
```

#### POST `/me/phone`

Envia código de verificação para o telefone.

**Request:**
```json
{
  "phone": "+5511999999999"
}
```

**Response (204):**

**Regras de Negócio:**
- Código gerado: `123456` (hardcoded, TODO: implementar SMS real)
- Código armazenado em cache por 15 minutos
- Chave do cache: `user_phone_{user_id}_{phone_hash}`

#### POST `/me/phone/verify`

Verifica e atualiza o telefone do usuário.

**Request:**
```json
{
  "code": "123456"
}
```

**Response (200):**
```json
{
  "data": {
    "message": "Telefone verificado com sucesso"
  }
}
```

**Regras de Negócio:**
- Código deve corresponder ao código em cache
- Telefone atualizado após verificação bem-sucedida
- Cache limpo após verificação

---

### Workspaces

#### GET `/workspaces`

Lista todos os workspaces do usuário autenticado.

**Response (200):**
```json
{
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "My Workspace",
      "created_at": "2024-01-01T00:00:00.000000Z",
      "updated_at": "2024-01-01T00:00:00.000000Z"
    }
  ]
}
```

**Política de Acesso:**
- Usuário pode ver apenas workspaces aos quais pertence
- Verificação via `WorkspacePolicy::viewAny()`

#### POST `/workspaces`

Cria um novo workspace.

**Request:**
```json
{
  "name": "New Workspace"
}
```

**Response (201):**
```json
{
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "New Workspace",
    "created_at": "2024-01-01T00:00:00.000000Z",
    "updated_at": "2024-01-01T00:00:00.000000Z"
  }
}
```

**Validações:**
- `name`: obrigatório, string, mínimo 3 caracteres, máximo 100 caracteres

**Regras de Negócio:**
- Workspace criado com `public_id` (UUID)
- Usuário automaticamente associado como `Owner`
- Política: `WorkspacePolicy::create()` sempre retorna `true`

#### PUT `/workspaces/{id}`

Atualiza um workspace existente.

**Request:**
```json
{
  "name": "Updated Workspace Name"
}
```

**Response (200):**
```json
{
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Updated Workspace Name",
    "created_at": "2024-01-01T00:00:00.000000Z",
    "updated_at": "2024-01-01T12:00:00.000000Z"
  }
}
```

**Política de Acesso:**
- Usuário deve pertencer ao workspace
- Role deve ser `Owner` ou `Admin`
- Verificação via `WorkspacePolicy::update()`

#### DELETE `/workspaces/{id}`

Exclui um workspace.

**Response (204):**

**Política de Acesso:**
- Usuário deve pertencer ao workspace
- Role deve ser `Owner` (apenas)
- Verificação via `WorkspacePolicy::delete()`

---

### Campanhas

Todas as rotas de campanhas requerem o header `Workspace-Id`.

#### GET `/campaigns`

Lista todas as campanhas do workspace.

**Headers:**
```
Workspace-Id: {workspace_public_id}
```

**Response (200):**
```json
{
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "title": "Campanha de Verão",
      "description": "Descrição da campanha",
      "objective": "Objetivo da campanha",
      "secondary_niches": [1, 2, 3],
      "max_influencers": 10,
      "payment_method": "fixed",
      "payment_method_details": {
        "amount": 1000
      },
      "benefits": "Benefícios da campanha",
      "rules_does": "Regras do que fazer",
      "rules_does_not": "Regras do que não fazer",
      "segment_min_followers": 10000,
      "segment_state": "SP",
      "segment_city": "São Paulo",
      "segment_genders": ["male", "female"],
      "image_rights_period": 12,
      "status": "draft",
      "created_at": "2024-01-01T00:00:00.000000Z",
      "updated_at": "2024-01-01T00:00:00.000000Z"
    }
  ]
}
```

**Regras de Negócio:**
- Apenas campanhas do workspace especificado
- Paginação implementada (Laravel) ou lista completa (Nest.js)

#### GET `/campaigns/{campaignId}`

Retorna uma campanha específica.

**Response (200):**
```json
{
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "title": "Campanha de Verão",
    ...
  }
}
```

**Erros:**
- `404`: Campanha não encontrada ou não pertence ao workspace

#### POST `/campaigns`

Cria uma nova campanha.

**Request:**
```json
{
  "title": "Campanha de Verão",
  "description": "Descrição da campanha",
  "objective": "Objetivo da campanha",
  "secondary_niches": [
    { "id": 1, "name": "Beleza" },
    { "id": 2, "name": "Moda" }
  ],
  "max_influencers": 10,
  "payment_method": "fixed",
  "payment_method_details": {
    "amount": 1000
  },
  "benefits": "Benefícios da campanha",
  "rules_does": "Regras do que fazer",
  "rules_does_not": "Regras do que não fazer",
  "segment_min_followers": 10000,
  "segment_state": "SP",
  "segment_city": "São Paulo",
  "segment_genders": ["male", "female"],
  "image_rights_period": 12
}
```

**Response (201):**
```json
{
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    ...
  }
}
```

**Validações:**
- `title`: obrigatório, string, máximo 100 caracteres
- `description`: obrigatório, string, máximo 255 caracteres
- `objective`: obrigatório, string, máximo 255 caracteres
- `secondary_niches`: obrigatório, array, cada item com `id` (numérico, existe) e `name` (string, mínimo 3 caracteres)
- `max_influencers`: obrigatório, inteiro, mínimo 1
- `payment_method`: obrigatório, enum (`fixed`, `variable`, etc.)
- `payment_method_details`: obrigatório, array, mínimo 1 item
- `benefits`: opcional, string, máximo 255 caracteres
- `rules_does`: obrigatório, string, máximo 255 caracteres
- `rules_does_not`: obrigatório, string, máximo 255 caracteres
- `segment_min_followers`: opcional, inteiro, mínimo 1
- `segment_state`: opcional, string, exatamente 2 caracteres
- `segment_city`: opcional, string, mínimo 3 caracteres
- `segment_genders`: opcional, array, mínimo 1 item, enum (`male`, `female`, `other`)
- `image_rights_period`: obrigatório, inteiro, mínimo 1

**Regras de Negócio:**
- Status inicial: `draft`
- `secondary_niches` armazenado como array de IDs
- Campanha vinculada ao workspace do header

#### PUT `/campaigns/{campaignId}`

Atualiza uma campanha existente.

**Request:** (mesmo formato do POST)

**Response (204):**

**Validações:** (mesmas do POST)

**Regras de Negócio:**
- Campanha deve existir e pertencer ao workspace
- Status não pode ser alterado via update (endpoint separado)

#### DELETE `/campaigns/{campaignId}`

Exclui uma campanha.

**Response (204):**

**Regras de Negócio:**
- Soft delete (se implementado)
- Campanha deve pertencer ao workspace

### Gestão de Influenciadores

Todas as rotas de influenciadores requerem o header `Workspace-Id`.

#### GET `/campaigns/{campaignId}/influencers`

Lista todos os influenciadores da campanha.

**Headers:**
```
Workspace-Id: {workspace_public_id}
```

**Query Parameters:**
- `status` (opcional): Filtra por status do influenciador
- `phase_id` (opcional): Filtra por fase da campanha

**Response (200):**
```json
{
  "data": [
    {
      "id": "10",
      "name": "Influencer Name",
      "username": "influencer_username",
      "avatar": "https://example.com/photo.jpg",
      "followers": 50000,
      "engagement": 0,
      "niche": "1",
      "social_network": "instagram",
      "status": "aprovados",
      "phase": null
    }
  ]
}
```

**Nota:** A resposta usa o formato padronizado do `InfluencerResource`, transformado via `transformInfluencer()`.

**Regras de Negócio:**
- Apenas influenciadores da campanha especificada
- Filtros opcionais por status e fase

#### PUT `/campaigns/{campaignId}/influencers/{influencerId}/status`

Atualiza o status do influenciador na campanha.

**Request:**
```json
{
  "status": "aprovados",
  "feedback": "Feedback opcional sobre a mudança de status"
}
```

**Response (204):**

**Validações:**
- `status`: obrigatório, enum válido
- `feedback`: opcional, string

**Regras de Negócio:**
- Status registrado no histórico
- Feedback opcional pode ser incluído

#### POST `/campaigns/{campaignId}/influencers/invite`

Convida um influenciador para participar da campanha.

**Request:**
```json
{
  "influencer_id": 10,
  "message": "Mensagem opcional de convite"
}
```

**Response (204):**

**Validações:**
- `influencer_id`: obrigatório, inteiro, deve existir
- `message`: opcional, string

**Regras de Negócio:**
- Verifica se influenciador já está na campanha
- Verifica limite máximo de influenciadores
- Status inicial: `convidados`
- Registra histórico com mensagem de convite

#### POST `/campaigns/{campaignId}/influencers/{influencerId}/curation`

Move um influenciador para a fase de curadoria.

**Request:**
```json
{
  "notes": "Notas opcionais sobre a curadoria"
}
```

**Response (204):**

**Validações:**
- `notes`: opcional, string

**Regras de Negócio:**
- Status alterado para `curadoria`
- Registra histórico com notas

#### GET `/campaigns/{campaignId}/influencers/{influencerId}/history`

Busca o histórico de mudanças de status do influenciador.

**Response (200):**
```json
{
  "data": [
    {
      "id": "1",
      "status": "convidados",
      "timestamp": "2024-01-01T00:00:00.000000Z",
      "notes": "Convite enviado"
    },
    {
      "id": "2",
      "status": "aprovados",
      "timestamp": "2024-01-02T00:00:00.000000Z",
      "notes": "Aprovado para participar"
    }
  ]
}
```

**Regras de Negócio:**
- Retorna histórico ordenado por data (mais recente primeiro)
- Inclui status, timestamp e notas opcionais

### Gestão de Conteúdos

Todas as rotas de conteúdos requerem o header `Workspace-Id`.

#### GET `/campaigns/{campaignId}/contents`

Lista todos os conteúdos da campanha.

**Headers:**
```
Workspace-Id: {workspace_public_id}
```

**Query Parameters:**
- `status` (opcional): Filtra por status do conteúdo (`pending`, `approved`, `rejected`, `published`)
- `phase_id` (opcional): Filtra por fase da campanha

**Response (200):**
```json
{
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "campaign_id": "550e8400-e29b-41d4-a716-446655440001",
      "influencer_id": "10",
      "influencer_name": "Influencer Name",
      "influencer_avatar": "https://example.com/photo.jpg",
      "social_network": "instagram",
      "content_type": "post",
      "preview_url": "https://example.com/preview.jpg",
      "post_url": "https://instagram.com/p/abc123",
      "status": "pending",
      "phase_id": "550e8400-e29b-41d4-a716-446655440002",
      "submitted_at": "2024-01-01T00:00:00.000000Z",
      "published_at": null,
      "feedback": null,
      "ai_evaluation": null
    }
  ]
}
```

**Regras de Negócio:**
- Apenas conteúdos da campanha especificada
- Filtros opcionais por status e fase
- Inclui informações do influenciador e rede social

#### POST `/campaigns/{campaignId}/contents/{contentId}/approve`

Aprova um conteúdo submetido.

**Response (204):**

**Regras de Negócio:**
- Status alterado para `approved`
- Conteúdo pode ser publicado posteriormente

#### POST `/campaigns/{campaignId}/contents/{contentId}/reject`

Rejeita um conteúdo submetido.

**Request:**
```json
{
  "feedback": "Motivo da rejeição do conteúdo"
}
```

**Response (204):**

**Validações:**
- `feedback`: obrigatório, string

**Regras de Negócio:**
- Status alterado para `rejected`
- Feedback armazenado para o influenciador

#### GET `/campaigns/{campaignId}/contents/{contentId}/evaluation`

Busca a avaliação da IA do conteúdo.

**Response (200):**
```json
{
  "data": {
    "score": 8.5,
    "criteria": {
      "relevance": 9,
      "quality": 8,
      "engagement": 8.5
    },
    "recommendations": ["Melhorar qualidade da imagem"]
  }
}
```

**Regras de Negócio:**
- Retorna avaliação da IA se disponível
- Retorna `null` se não houver avaliação

### Métricas

Todas as rotas de métricas requerem o header `Workspace-Id`.

#### GET `/campaigns/{campaignId}/metrics`

Retorna métricas gerais da campanha.

**Response (200):**
```json
{
  "data": {
    "reach": 15,
    "engagement": 0,
    "published_content": 18,
    "active_influencers": 10
  }
}
```

**Nota:** A resposta usa o formato padronizado do `CampaignMetricsResource`, transformado via `transformCampaignMetrics()`. Os campos são mapeados:
- `reach`: Total de influenciadores
- `engagement`: Engajamento (pode ser calculado posteriormente)
- `published_content`: Conteúdos publicados
- `active_influencers`: Influenciadores aprovados

**Regras de Negócio:**
- Métricas agregadas da campanha
- Contadores de influenciadores e conteúdos por status

#### GET `/campaigns/{campaignId}/metrics/influencers`

Retorna métricas agrupadas por influenciador.

**Response (200):**
```json
{
  "data": [
    {
      "influencer_id": "10",
      "total_contents": 5,
      "approved_contents": 4,
      "status": "aprovados"
    }
  ]
}
```

**Regras de Negócio:**
- Uma entrada por influenciador
- Contadores de conteúdos por influenciador

#### GET `/campaigns/{campaignId}/metrics/contents/{contentId}`

Retorna métricas de um conteúdo específico.

**Response (200):**
```json
{
  "data": {
    "content_id": "550e8400-e29b-41d4-a716-446655440000",
    "status": "published",
    "submitted_at": "2024-01-01T00:00:00.000000Z",
    "published_at": "2024-01-02T00:00:00.000000Z",
    "views": 0,
    "likes": 0,
    "comments": 0,
    "shares": 0
  }
}
```

**Regras de Negócio:**
- Métricas básicas do conteúdo
- Métricas de engajamento podem ser integradas posteriormente

#### GET `/campaigns/{campaignId}/metrics/identified-posts`

Retorna publicações identificadas automaticamente.

**Query Parameters:**
- `phase_id` (opcional): Filtra por fase da campanha

**Response (200):**
```json
{
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "influencerId": "10",
      "influencerName": "Influencer Name",
      "influencerAvatar": "https://example.com/photo.jpg",
      "previewUrl": "https://example.com/preview.jpg",
      "postUrl": "https://instagram.com/p/abc123",
      "socialNetwork": "instagram",
      "identifiedAt": "2024-01-01T00:00:00.000000Z",
      "phaseId": "550e8400-e29b-41d4-a716-446655440002"
    }
  ]
}
```

**Nota:** A resposta usa o formato padronizado do `IdentifiedPostResource`, transformado via `transformIdentifiedPost()`. Inclui informações completas do influenciador e da publicação.

**Regras de Negócio:**
- Posts identificados automaticamente pela IA
- Filtro opcional por fase

### Fases da Campanha

Todas as rotas de fases requerem o header `Workspace-Id`.

**Nota:** As rotas de fases são acessadas via `/campaigns/{campaignId}/steps` no código, mas podem ser referenciadas como `/phases` na documentação da API.

#### GET `/campaigns/{campaignId}/phases`

Lista todas as fases da campanha.

**Response (200):**
```json
{
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "order": 1,
      "objective": "awareness",
      "publish_date": "2024-01-15",
      "publish_time": "10:00:00",
      "content_submission_deadline": "2024-01-11",
      "correction_submission_deadline": "2024-01-13",
      "contents": [
        {
          "type": "instagram",
          "options": [
            {
              "type": "post",
              "quantity": 1
            }
          ]
        }
      ],
      "created_at": "2024-01-01T00:00:00.000000Z",
      "updated_at": "2024-01-01T00:00:00.000000Z"
    }
  ]
}
```

**Regras de Negócio:**
- Fases ordenadas por `order`
- Inclui deadlines calculados automaticamente

#### POST `/campaigns/{campaignId}/phases`

Cria uma nova fase da campanha.

**Request:**
```json
{
  "objective": "awareness",
  "post_date": "2024-01-15",
  "post_time": "10:00:00",
  "formats": [
    {
      "type": "instagram",
      "options": [
        {
          "type": "post",
          "quantity": 1
        }
      ]
    }
  ],
  "files": []
}
```

**Response (201):**
```json
{
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "order": 1,
    "objective": "awareness",
    "publish_date": "2024-01-15",
    "publish_time": "10:00:00",
    "content_submission_deadline": "2024-01-11",
    "correction_submission_deadline": "2024-01-13",
    "contents": [...],
    "created_at": "2024-01-01T00:00:00.000000Z",
    "updated_at": "2024-01-01T00:00:00.000000Z"
  }
}
```

**Validações:**
- `objective`: obrigatório, enum válido
- `post_date`: obrigatório, data válida
- `post_time`: obrigatório, formato HH:MM:SS
- `formats`: obrigatório, array
- `files`: opcional, array

**Regras de Negócio:**
- Primeira fase: data deve ser >= 10 dias a partir de hoje
- Fases subsequentes: data deve ser >= 3 dias da fase anterior
- Deadlines calculados automaticamente:
  - Content submission: 4 dias antes da publicação
  - Correction submission: 2 dias antes da publicação
- Ordem calculada automaticamente se não fornecida

#### PUT `/campaigns/{campaignId}/phases/{phaseId}`

Atualiza uma fase existente.

**Request:** (mesmo formato do POST, todos os campos opcionais)

**Response (200):**
```json
{
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    ...
  }
}
```

**Regras de Negócio:**
- Validações de data aplicadas se `publish_date` for atualizado
- Deadlines recalculados automaticamente

#### DELETE `/campaigns/{campaignId}/phases/{phaseId}`

Exclui uma fase da campanha.

**Response (204):**

**Regras de Negócio:**
- Exclusão em cascata de associações com redes sociais

### Mural de Influenciadores

Todas as rotas de mural requerem o header `Workspace-Id`.

#### POST `/campaigns/{campaignId}/mural/activate`

Ativa o mural da campanha para receber inscrições de influenciadores.

**Request:**
```json
{
  "end_date": "2024-01-31"
}
```

**Response (204):**

**Validações:**
- `end_date`: obrigatório, data válida

**Regras de Negócio:**
- Mural ativado para a campanha
- Data limite configurada
- Se mural já existir, apenas atualiza status e data

#### POST `/campaigns/{campaignId}/mural/deactivate`

Desativa o mural da campanha.

**Response (204):**

**Regras de Negócio:**
- Mural desativado após data limite ou manualmente
- Influenciadores não podem mais se inscrever

#### GET `/campaigns/{campaignId}/mural/status`

Retorna o status atual do mural.

**Response (200):**
```json
{
  "data": {
    "active": true,
    "end_date": "2024-01-31"
  }
}
```

**Regras de Negócio:**
- Retorna status e data limite se mural existir
- Retorna `active: false` se mural não existir

### Chat com Influenciadores

Todas as rotas de mensagens requerem o header `Workspace-Id`.

#### GET `/campaigns/{campaignId}/influencers/{influencerId}/messages`

Lista todas as mensagens do chat com o influenciador.

**Response (200):**
```json
{
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "campaign_id": "550e8400-e29b-41d4-a716-446655440001",
      "influencer_id": "10",
      "sender_id": "5",
      "sender_name": "Backoffice User",
      "sender_avatar": "https://example.com/avatar.jpg",
      "message": "Olá! Gostaria de esclarecer algumas dúvidas sobre a campanha.",
      "attachments": [],
      "read_at": null,
      "created_at": "2024-01-01T00:00:00.000000Z"
    }
  ]
}
```

**Regras de Negócio:**
- Mensagens ordenadas por data (mais recente primeiro)
- Inclui informações do remetente

#### POST `/campaigns/{campaignId}/influencers/{influencerId}/messages`

Envia uma mensagem para o influenciador.

**Request:**
```json
{
  "message": "Olá! Gostaria de esclarecer algumas dúvidas sobre a campanha.",
  "attachments": ["https://example.com/file.pdf"]
}
```

**Response (201):**
```json
{
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "campaign_id": "550e8400-e29b-41d4-a716-446655440001",
    "influencer_id": "10",
    "sender_id": "5",
    "sender_name": "Backoffice User",
    "sender_avatar": "https://example.com/avatar.jpg",
    "message": "Olá! Gostaria de esclarecer algumas dúvidas sobre a campanha.",
    "attachments": ["https://example.com/file.pdf"],
    "read_at": null,
    "created_at": "2024-01-01T00:00:00.000000Z"
  }
}
```

**Validações:**
- `message`: obrigatório, string
- `attachments`: opcional, array de URLs

**Regras de Negócio:**
- Mensagem vinculada à campanha e influenciador
- Remetente é o usuário autenticado do backoffice

### Catálogo de Influenciadores

Todas as rotas de catálogo requerem o header `Workspace-Id`.

#### GET `/influencers/catalog`

Lista o catálogo de influenciadores disponíveis.

**Query Parameters:**
- `social_network` (opcional): Filtra por rede social
- `age_range` (opcional): Filtra por faixa etária
- `gender` (opcional): Filtra por gênero
- `followers_min` (opcional): Mínimo de seguidores
- `followers_max` (opcional): Máximo de seguidores
- `niche` (opcional): Filtra por nicho
- `country` (opcional): Filtra por país
- `state` (opcional): Filtra por estado
- `city` (opcional): Filtra por cidade

**Response (200):**
```json
{
  "data": [
    {
      "id": "10",
      "name": "Influencer Name",
      "username": "influencer_username",
      "avatar": "https://example.com/photo.jpg",
      "followers": 50000,
      "engagement": 4.5,
      "niche": "1",
      "social_network": "instagram",
      "age_range": "25-30",
      "location": {
        "country": "BR",
        "state": "SP",
        "city": "São Paulo"
      }
    }
  ]
}
```

**Regras de Negócio:**
- Filtros opcionais aplicados
- Apenas influenciadores (tipo de usuário `Influencer`)
- Busca redes sociais do workspace do influenciador
- Inclui informações de nicho e localização quando disponíveis
- Formato padronizado via `transformInfluencer()`

#### GET `/influencers/campaigns/{campaignId}/recommendations`

Retorna recomendações automáticas de influenciadores para a campanha.

**Response (200):**
```json
{
  "data": [
    {
      "influencer": {
        "id": "10",
        "name": "Influencer Name",
        "avatar": "https://example.com/photo.jpg"
      },
      "reason": "Recomendado com base no perfil da campanha"
    }
  ]
}
```

**Regras de Negócio:**
- Recomendações baseadas no perfil da campanha
- Exclui influenciadores já vinculados à campanha
- Algoritmo de recomendação pode ser aprimorado

---

## Modelos de Dados

### User

```php
// app/Models/User.php
protected $fillable = [
    'type',
    'name',
    'email',
    'phone',
    'document',
    'document_type',
    'birth_date',
    'gender',
    'password',
];

protected $casts = [
    'type' => UserTypeEnum::class,
    'email_verified_at' => 'datetime',
    'password' => 'hashed',
];
```

**Relacionamentos:**
- `workspaces()`: BelongsToMany (com pivot `role`)
- `niches()`: BelongsToMany
- `integrations()`: MorphMany
- `address()`: MorphOne

### Workspace

```php
// app/Models/Workspace.php
protected $fillable = [
    'public_id',
    'name',
];
```

**Relacionamentos:**
- `users()`: BelongsToMany (com pivot `role`)
- `campaigns()`: HasMany
- `socialNetworks()`: HasMany

**Trait:**
- `HasPublicId`: Gera e gerencia `public_id` (UUID)

### Campaign

```php
// app/Models/Campaign.php
protected $fillable = [
    'public_id',
    'workspace_id',
    'title',
    'description',
    'objective',
    'secondary_niches',
    'max_influencers',
    'payment_method',
    'payment_method_details',
    'benefits',
    'rules_does',
    'rules_does_not',
    'segment_min_followers',
    'segment_state',
    'segment_city',
    'segment_genders',
    'image_rights_period',
    'status',
];

protected $casts = [
    'secondary_niches' => 'array',
    'payment_method' => PaymentMethodEnum::class,
    'payment_method_details' => 'array',
    'segment_genders' => 'array',
    'status' => CampaignStatusEnum::class,
];
```

**Relacionamentos:**
- `workspace()`: BelongsTo
- `steps()`: HasMany

**Status:**
- `draft`: Rascunho
- `published`: Publicado

---

## Validações

### Form Requests (Laravel)

Todas as validações estão em `app/Http/Requests/Backoffice/`:

- **Auth/LoginRequest**: Email e senha
- **Auth/RegisterRequest**: Nome, email e senha
- **Me/UpdatePhoneRequest**: Telefone
- **Me/VerifyPhoneRequest**: Código de verificação
- **Workspace/StoreRequest**: Nome do workspace
- **Workspace/UpdateRequest**: Nome do workspace
- **Campaign/StoreRequest**: Todos os campos da campanha
- **Campaign/UpdateRequest**: Campos atualizáveis da campanha

### DTOs (Nest.js)

Todas as validações estão em `src/modules/backoffice/dto/` usando `class-validator`:

- **LoginDto**: Email e senha
- **RegisterDto**: Nome, email, senha e tipo (opcional)
- **StoreWorkspaceDto**: Nome
- **UpdateWorkspaceDto**: Nome
- **StoreCampaignDto**: Todos os campos da campanha
- **UpdateCampaignDto**: Campos atualizáveis
- **UpdateInfluencerStatusDto**: Status e feedback do influenciador
- **InviteInfluencerDto**: ID do influenciador e mensagem de convite
- **MoveToCurationDto**: Notas sobre curadoria
- **RejectContentDto**: Feedback de rejeição
- **CreatePhaseDto**: Dados para criar fase (objective, post_date, post_time, formats, files)
- **ActivateMuralDto**: Data final do mural
- **SendMessageDto**: Mensagem e anexos

### Mensagens de Erro

Todas as mensagens de validação são em **português**:

```php
'email.required' => 'Email é obrigatório',
'email.email' => 'Email deve ter um formato válido',
'password.required' => 'Senha é obrigatória',
```

---

## Resources (Transformadores)

Os Resources são funções que transformam os dados do modelo em formato de resposta da API, padronizando a estrutura para o frontend.

### Resources Laravel (PHP)

#### UserResource

```php
// app/Http/Resources/Backoffice/UserResource.php
public function toArray(Request $request): array
{
    return [
        'id' => $this->id,
        'name' => $this->name,
        'email' => $this->email,
        'phone' => $this->phone,
        'created_at' => $this->created_at,
        'updated_at' => $this->updated_at,
    ];
}
```

#### WorkspaceResource

```php
// app/Http/Resources/Backoffice/WorkspaceResource.php
public function toArray(Request $request): array
{
    return [
        'id' => $this->public_id,
        'name' => $this->name,
        'created_at' => $this->created_at,
        'updated_at' => $this->updated_at,
    ];
}
```

#### CampaignResource

```php
// app/Http/Resources/Backoffice/CampaignResource.php
public function toArray(Request $request): array
{
    return [
        'id' => $this->public_id,
        'title' => $this->title,
        'description' => $this->description,
        'objective' => $this->objective,
        'secondary_niches' => $this->secondary_niches,
        'max_influencers' => $this->max_influencers,
        'payment_method' => $this->payment_method,
        'payment_method_details' => $this->payment_method_details,
        'benefits' => $this->benefits,
        'rules_does' => $this->rules_does,
        'rules_does_not' => $this->rules_does_not,
        'segment_min_followers' => $this->segment_min_followers,
        'segment_state' => $this->segment_state,
        'segment_city' => $this->segment_city,
        'segment_genders' => $this->segment_genders,
        'image_rights_period' => $this->image_rights_period,
        'status' => $this->status,
        'created_at' => $this->created_at,
        'updated_at' => $this->updated_at,
    ];
}
```

### Resources Nest.js (TypeScript) ⭐ Novos

#### InfluencerResource

**Arquivo:** `src/resources/backoffice/influencer.resource.ts`

**Funções:**
- `transformInfluencer(campaignUser: any, user?: any, socialNetwork?: any): InfluencerResource`
- `transformInfluencerWithHistory(campaignUser: any, user?: any, socialNetwork?: any, history?: any[]): InfluencerResource`

**Uso:** Transforma dados de influenciadores para formato esperado pelo frontend

**Formato:**
```typescript
{
  id: string;
  name: string;
  username: string;
  avatar: string;
  followers?: number;
  engagement?: number;
  niche?: string;
  social_network?: string;
  age_range?: string;
  location?: {
    country?: string;
    state?: string;
    city?: string;
  };
  status?: string;
  phase?: string;
  status_history?: Array<{
    id: string;
    status: string;
    timestamp: string;
    notes?: string;
  }>;
}
```

#### CampaignMetricsResource

**Arquivo:** `src/resources/backoffice/metrics.resource.ts`

**Funções:**
- `transformCampaignMetrics(metrics: any): CampaignMetricsResource`
- `transformInfluencerMetrics(metrics: any[]): InfluencerMetricsResource[]`
- `transformContentMetrics(content: any): ContentMetricsResource`

**Uso:** Transforma métricas para formato padronizado

**Formato:**
```typescript
{
  reach: number;              // Total de influenciadores
  engagement: number;         // Engajamento (pode ser calculado posteriormente)
  published_content: number;  // Conteúdos publicados
  active_influencers: number; // Influenciadores aprovados
}
```

#### IdentifiedPostResource

**Arquivo:** `src/resources/backoffice/identified-post.resource.ts`

**Função:** `transformIdentifiedPost(post: any, user?: any): IdentifiedPostResource`

**Uso:** Transforma posts identificados com dados completos do influenciador

**Formato:**
```typescript
{
  id: string;
  influencerId: string;
  influencerName: string;
  influencerAvatar: string;
  previewUrl: string;
  postUrl: string;
  socialNetwork: string;
  identifiedAt: string;
  phaseId?: string;
}
```

**Nota:** Todos os resources Nest.js padronizam as respostas para garantir compatibilidade com o frontend.

---

## Middlewares

### EnsureClientTypeMiddleware

Valida o header `Client-Type` em todas as requisições.

```php
// app/Http/Middleware/EnsureClientTypeMiddleware.php
public function handle(Request $request, Closure $next): Response
{
    $clientType = $request->header('Client-Type');
    $allowedClientTypes = ['backoffice', 'app', 'ai'];

    if (!$clientType || !in_array(strtolower($clientType), $allowedClientTypes)) {
        return response()->json([
            'message' => 'Unable to access the application',
        ], 400);
    }

    return $next($request);
}
```

**Resposta de Erro:**
- `400`: "Unable to access the application"

### EnsureWorkspaceIdMiddleware

Valida o header `Workspace-Id` e verifica permissões.

```php
// app/Http/Middleware/EnsureWorkspaceIdMiddleware.php
public function handle(Request $request, Closure $next): Response
{
    $workspaceId = $request->header('Workspace-Id');

    if (!$workspaceId) {
        return response()->json([
            'message' => 'Workspace ID é obrigatório.',
        ], 400);
    }

    $workspace = Workspace::byPublicId($workspaceId)->first();

    if (!$workspace) {
        return response()->json([
            'message' => 'Você não tem permissão para acessar esse workspace.',
        ], 403);
    }

    $userHasThisWorkspace = $request->user()
        ->workspaces()
        ->where('workspace_id', $workspace->id)
        ->wherePivot('role', WorkspaceRoleEnum::Owner)
        ->exists();

    if (!$userHasThisWorkspace) {
        return response()->json([
            'message' => 'Você não tem permissão para acessar esse workspace.',
        ], 403);
    }

    $request->attributes->set('workspaceResolver', $workspace);

    return $next($request);
}
```

**Respostas de Erro:**
- `400`: "Workspace ID é obrigatório."
- `403`: "Você não tem permissão para acessar esse workspace."

**Nota:** O workspace é injetado no request via `$request->workspace()` helper method.

---

## Políticas de Acesso

### WorkspacePolicy

```php
// app/Policies/WorkspacePolicy.php
class WorkspacePolicy
{
    public function viewAny(): bool
    {
        return true; // Qualquer usuário autenticado pode listar seus workspaces
    }

    public function view(User $user, Workspace $workspace): bool
    {
        return $user->workspaces->contains($workspace);
    }

    public function create(): bool
    {
        return true; // Qualquer usuário autenticado pode criar workspace
    }

    public function update(User $user, Workspace $workspace): bool
    {
        if (!$user->workspaces->contains($workspace)) {
            return false;
        }

        $workspaceUser = $workspace->users->where('id', $user->id)->first();
        $role = WorkspaceRoleEnum::from($workspaceUser->pivot->role);

        return in_array($role, [WorkspaceRoleEnum::Owner, WorkspaceRoleEnum::Admin]);
    }

    public function delete(User $user, Workspace $workspace): bool
    {
        if (!$user->workspaces->contains($workspace)) {
            return false;
        }

        $workspaceUser = $workspace->users->where('id', $user->id)->first();
        $role = WorkspaceRoleEnum::from($workspaceUser->pivot->role);

        return $role === WorkspaceRoleEnum::Owner;
    }
}
```

### WorkspaceRoleEnum

```php
// app/Enums/WorkspaceRoleEnum.php
enum WorkspaceRoleEnum: string
{
    case Owner = 'owner';    // Pode tudo (incluindo deletar)
    case Admin = 'admin';     // Pode editar, não pode deletar
    case Member = 'member';  // Apenas visualização
}
```

---

## Estrutura Nest.js

### Módulo Backoffice

```typescript
// src/modules/backoffice/backoffice.module.ts
@Module({
  imports: [CommonModule, DatabaseModule, WorkspacesModule, ServicesModule],
  controllers: [
    BackofficeAuthController,
    BackofficeMeController,
    BackofficeWorkspacesController,
    BackofficeCampaignsController,
    BackofficeCampaignStepsController,
    BackofficeCampaignUsersController,
    BackofficeCampaignContentsController,
    BackofficeCampaignMetricsController,
    BackofficeCampaignMuralController,
    BackofficeCampaignMessagesController,
    BackofficeInfluencersCatalogController,
    BackofficeNichesController,
  ],
})
export class BackofficeModule {}
```

### Guards

#### ClientTypeGuard

```typescript
// src/common/guards/client-type.guard.ts
@Injectable()
export class ClientTypeGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const clientType = request.headers['client-type'];
    const allowed = ['app', 'backoffice', 'ai'];
    return allowed.includes(clientType?.toLowerCase());
  }
}
```

#### AuthGuard

Valida o token JWT e injeta o usuário no request.

#### AbilityGuard

Verifica se o usuário possui a ability necessária (ex: `client_type:backoffice`).

#### WorkspaceGuard

Valida o header `Workspace-Id` e injeta o workspace no request.

### Decorators

#### @User()

Injeta o usuário autenticado no parâmetro.

```typescript
async getMe(@User() user: any) {
  // user está disponível
}
```

#### @Workspace()

Injeta o workspace validado no parâmetro.

```typescript
async listCampaigns(@Workspace() workspace: any) {
  // workspace está disponível
}
```

#### @RequireAbility()

Especifica a ability necessária para acessar a rota.

```typescript
@RequireAbility('client_type:backoffice')
async getMe(@User() user: any) {
  // ...
}
```

---

## Fluxos Principais

### Fluxo de Autenticação

```
1. Cliente → POST /api/backoffice/auth/login
   Headers: Client-Type: backoffice
   Body: { email, password }

2. Servidor valida:
   - Email existe
   - Senha correta
   - Tipo de usuário permitido (Client, Agency, Admin)

3. Servidor gera token:
   - Token com ability: client_type:backoffice
   - Token armazenado (Sanctum) ou assinado (JWT)

4. Cliente recebe token

5. Cliente usa token em requisições subsequentes:
   Headers:
   - Client-Type: backoffice
   - Authorization: Bearer {token}
```

### Fluxo de Criação de Campanha

```
1. Cliente → POST /api/backoffice/campaigns
   Headers:
   - Client-Type: backoffice
   - Authorization: Bearer {token}
   - Workspace-Id: {workspace_public_id}
   Body: { title, description, ... }

2. Middlewares executam:
   - EnsureClientTypeMiddleware: Valida Client-Type
   - AuthGuard: Valida token
   - AbilityGuard: Verifica client_type:backoffice
   - EnsureWorkspaceIdMiddleware: Valida Workspace-Id e permissões

3. Controller valida dados (StoreRequest/StoreCampaignDto)

4. Controller cria campanha:
   - Status: draft
   - Vinculada ao workspace
   - public_id gerado (UUID)

5. Cliente recebe campanha criada
```

### Fluxo de Gestão de Workspace

```
1. Cliente → POST /api/backoffice/workspaces
   Headers:
   - Client-Type: backoffice
   - Authorization: Bearer {token}
   Body: { name }

2. Middlewares executam:
   - EnsureClientTypeMiddleware
   - AuthGuard
   - AbilityGuard

3. Controller valida dados

4. Controller cria workspace:
   - public_id gerado (UUID)
   - Usuário associado como Owner

5. Cliente recebe workspace criado
```

---

## Segurança

### Autenticação

- **Token-based**: Laravel Sanctum ou JWT
- **Expiração**: Tokens têm validade (configurável)
- **Revogação**: Logout revoga o token

### Autorização

- **Abilities**: Sistema de permissões baseado em abilities
- **Workspace Isolation**: Usuários só acessam workspaces aos quais pertencem
- **Role-based**: Permissões baseadas em roles (Owner, Admin, Member)

### Validação de Entrada

- **Form Requests/DTOs**: Todas as entradas são validadas
- **Sanitização**: Dados sanitizados antes de processamento
- **Type Safety**: Enums para valores restritos

### Headers Obrigatórios

- `Client-Type`: Sempre obrigatório
- `Authorization`: Obrigatório para rotas protegidas
- `Workspace-Id`: Obrigatório para rotas de campanhas

### Mensagens de Erro

- **Genéricas**: Não expõem detalhes internos
- **Português**: Todas as mensagens em português
- **Consistentes**: Formato padronizado

### Proteção contra Ataques

- **CSRF**: Proteção via tokens (Laravel)
- **SQL Injection**: Proteção via ORM (Eloquent/Drizzle)
- **XSS**: Sanitização de dados
- **Rate Limiting**: Implementado (se configurado)

---

## Observações Importantes

### Migração Laravel → Nest.js

O projeto está em processo de migração do Laravel para Nest.js. Ambos os sistemas coexistem:

- **Laravel**: Sistema atual em produção
- **Nest.js**: Sistema em desenvolvimento/migração

### Compatibilidade

- Ambos os sistemas compartilham o mesmo banco de dados
- Estrutura de dados idêntica
- Validações equivalentes
- Recursos (Resources) equivalentes

### Novas Funcionalidades Implementadas

1. **Gestão de Influenciadores**: Endpoints completos para gerenciar influenciadores em campanhas
2. **Gestão de Conteúdos**: Aprovação, rejeição e avaliação de conteúdos submetidos
3. **Métricas**: Sistema de métricas agregadas e por influenciador/conteúdo
4. **Mural de Influenciadores**: Sistema de ativação/desativação do mural de inscrições
5. **Chat com Influenciadores**: Sistema de mensagens entre backoffice e influenciadores
6. **Catálogo de Influenciadores**: Busca e recomendações de influenciadores

### TODOs Identificados

1. **SMS Service**: Implementação real de envio de SMS (atualmente hardcoded)
2. **Campaign Status**: Endpoint para alterar status de campanha
3. **Soft Delete**: Implementação de soft delete em campanhas
4. **Paginação**: Padronização de paginação entre Laravel e Nest.js
5. **Métricas de Engajamento**: Integração com APIs de redes sociais para métricas reais
6. **Sistema de Recomendações**: Aprimorar algoritmo de recomendação de influenciadores

---

## Conclusão

O Backoffice API é um sistema robusto de gerenciamento de campanhas com:

- ✅ Autenticação e autorização seguras
- ✅ Multi-tenancy via workspaces
- ✅ CRUD completo de campanhas
- ✅ Gestão de workspaces
- ✅ Validações robustas
- ✅ Estrutura escalável
- ✅ Migração em andamento para Nest.js

Para mais informações sobre endpoints específicos, consulte a documentação de rotas ou os controllers correspondentes.

