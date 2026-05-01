# Backoffice — Saldo & Pagamentos

**Base URL:** `https://sua-api.com/api`  
**Autenticação:** `Authorization: Bearer <token>` (usuário backoffice)

---

## Rotas

| Método | Rota | Descrição |
|--------|------|-----------|
| `GET` | `/backoffice/balance` | Saldo do admin autenticado |
| `GET` | `/backoffice/balance/entries` | Histórico de entradas do admin |
| `GET` | `/backoffice/balance/withdrawals` | Histórico de saques do admin |
| `POST` | `/backoffice/balance/withdrawals` | Solicitar saque via PIX |
| `GET` | `/backoffice/balance/workspace/:workspaceId` | Saldo do workspace |
| `POST` | `/backoffice/balance/workspace/:workspaceId/top-up` | Gerar cobrança PIX para recarga |
| `GET` | `/backoffice/balance/influencers/:userId` | Saldo de um influencer |
| `GET` | `/backoffice/balance/influencers/:userId/entries` | Entradas de saldo de um influencer |
| `POST` | `/backoffice/balance/entries` | Creditar saldo manual para influencer |

---

## GET `/backoffice/balance`

Resumo do saldo do usuário backoffice autenticado.

**Response `200`**
```json
{
  "data": {
    "reserved_cents": 15000,
    "pending_release_cents": 10000,
    "available_cents": 5000,
    "withdrawn_cents": 20000,
    "total_earned_cents": 50000
  }
}
```

| Campo | Descrição |
|-------|-----------|
| `reserved_cents` | Em campanha (aguardando entrega do conteúdo) |
| `pending_release_cents` | Aprovado, em carência de 30 dias |
| `available_cents` | Disponível para saque agora |
| `withdrawn_cents` | Total já sacado |
| `total_earned_cents` | Soma de todos os buckets |

---

## GET `/backoffice/balance/entries`

Histórico de entradas de saldo do admin autenticado.

**Query Params**

| Param | Tipo | Default | Descrição |
|-------|------|---------|-----------|
| `page` | number | `1` | Número da página |
| `per_page` | number | `15` | Itens por página |
| `status` | string | — | `reserved` \| `pending_release` \| `available` \| `withdrawn` |

**Response `200`**
```json
{
  "data": [
    {
      "id": "uuid",
      "amount_cents": 15000,
      "amount": "150.00",
      "status": {
        "value": "available",
        "label": "Disponível para Saque"
      },
      "description": "Campanha: Verão 2025",
      "released_at": "2025-04-01T00:00:00.000Z",
      "available_at": "2025-05-01T00:00:00.000Z",
      "withdrawn_at": null,
      "campaign": {
        "id": "uuid-campanha",
        "title": "Campanha Verão"
      },
      "created_at": "2025-03-01T00:00:00.000Z"
    }
  ],
  "meta": {
    "total": 10,
    "page": 1,
    "per_page": 15,
    "total_pages": 1
  }
}
```

| `status.value` | Label |
|----------------|-------|
| `reserved` | Reservado (Em Campanha) |
| `pending_release` | Aguardando Liberação |
| `available` | Disponível para Saque |
| `withdrawn` | Sacado |

---

## GET `/backoffice/balance/withdrawals`

Histórico de saques do admin autenticado.

**Query Params:** `page`, `per_page`

**Response `200`**
```json
{
  "data": [
    {
      "id": "uuid",
      "amount_cents": 5000,
      "amount": "50.00",
      "status": {
        "value": "pending",
        "label": "Aguardando Processamento"
      },
      "pix_key": "admin@email.com",
      "pix_key_type": "email",
      "processed_at": null,
      "created_at": "2025-05-01T00:00:00.000Z"
    }
  ],
  "meta": {
    "total": 1,
    "page": 1,
    "per_page": 15,
    "total_pages": 1
  }
}
```

| `status.value` | Descrição |
|----------------|-----------|
| `pending` | Transferência disparada, aguardando Asaas confirmar |
| `paid` | PIX enviado com sucesso |

---

## POST `/backoffice/balance/withdrawals`

Solicita saque do saldo disponível. A transferência PIX é disparada automaticamente via Asaas. A resposta retorna imediatamente — o status muda para `paid` quando o Asaas confirmar (polling a cada 1 min).

**Body**
```json
{
  "amount_cents": 5000,
  "pix_key": "admin@email.com",
  "pix_key_type": "email"
}
```

| Campo | Obrigatório | Validação |
|-------|-------------|-----------|
| `amount_cents` | ✅ | Inteiro, mínimo `100` (R$ 1,00) |
| `pix_key` | ✅ | String não vazia |
| `pix_key_type` | ✅ | `cpf` \| `cnpj` \| `email` \| `phone` \| `random` |

**Response `201`**
```json
{
  "data": {
    "id": "uuid",
    "amount_cents": 5000,
    "amount": "50.00",
    "status": {
      "value": "pending",
      "label": "Aguardando Processamento"
    },
    "pix_key": "admin@email.com",
    "pix_key_type": "email",
    "processed_at": null,
    "created_at": "2025-05-01T00:00:00.000Z"
  }
}
```

**Erros**

| Status | Mensagem |
|--------|----------|
| `400` | `Saldo disponível insuficiente. Disponível: R$ X` |
| `400` | `O valor deve ser maior que zero` |

---

## GET `/backoffice/balance/workspace/:workspaceId`

Saldo do workspace (cliente).

**Path Params:** `workspaceId` — UUID público do workspace

**Response `200`**
```json
{
  "data": {
    "balance_cents": 100000,
    "committed_cents": 30000,
    "available_cents": 70000
  }
}
```

| Campo | Descrição |
|-------|-----------|
| `balance_cents` | Total depositado pelo workspace |
| `committed_cents` | Reservado para aprovações em andamento |
| `available_cents` | Disponível para novas aprovações (`balance - committed`) |

**Erros**

| Status | Mensagem |
|--------|----------|
| `404` | `Workspace não encontrado` |

---

## POST `/backoffice/balance/workspace/:workspaceId/top-up`

Gera uma cobrança PIX via Asaas para o workspace depositar créditos. O saldo é creditado automaticamente após confirmação do pagamento (polling a cada 2 min).

> **Pré-requisito:** o workspace deve ter CNPJ cadastrado no campo `tax_id`.

**Path Params:** `workspaceId` — UUID público do workspace

**Body**
```json
{
  "amount_cents": 50000
}
```

| Campo | Obrigatório | Validação |
|-------|-------------|-----------|
| `amount_cents` | ✅ | Inteiro, mínimo `100` (R$ 1,00) |

**Response `201`**
```json
{
  "data": {
    "amount_cents": 50000,
    "amount": "500.00",
    "pix_qr_code": "iVBORw0KGgoAAAANSUhEUgAA...",
    "pix_copy_paste": "00020126580014br.gov.bcb.pix0136...",
    "expires_at": "2025-05-02T23:59:59.000Z",
    "status": "pending"
  }
}
```

| Campo | Descrição |
|-------|-----------|
| `pix_qr_code` | Imagem do QR Code em Base64 |
| `pix_copy_paste` | Código PIX copia e cola |
| `expires_at` | Data/hora de expiração da cobrança |
| `status` | Sempre `pending` na criação |

**Como renderizar no frontend**

```tsx
// QR Code
<img src={`data:image/png;base64,${data.pix_qr_code}`} alt="QR Code PIX" />

// Botão copiar
<button onClick={() => navigator.clipboard.writeText(data.pix_copy_paste)}>
  Copiar código PIX
</button>

// Expiração
<p>Válido até: {new Date(data.expires_at).toLocaleString('pt-BR')}</p>
```

**Fluxo completo**

```
Frontend chama top-up → exibe QR Code
→ Usuário paga o PIX no banco
→ Asaas confirma o pagamento
→ Polling detecta (até 2 min) → credita workspace_balances automaticamente
→ Frontend atualiza saldo chamando GET /workspace/:id
```

**Erros**

| Status | Mensagem |
|--------|----------|
| `400` | `O workspace não possui CNPJ/CPF cadastrado. Atualize os dados fiscais antes de gerar uma cobrança.` |
| `404` | `Workspace não encontrado` |
| `500` | `Erro ao gerar cobrança PIX` (falha na API do Asaas) |

---

## GET `/backoffice/balance/influencers/:userId`

Saldo de um influencer específico (visão administrativa).

**Path Params:** `userId` — ID interno do usuário

**Response `200`**
```json
{
  "data": {
    "user": {
      "id": 42,
      "name": "João Silva",
      "email": "joao@email.com"
    },
    "reserved_cents": 15000,
    "pending_release_cents": 10000,
    "available_cents": 5000,
    "withdrawn_cents": 20000,
    "total_earned_cents": 50000
  }
}
```

**Erros**

| Status | Mensagem |
|--------|----------|
| `404` | `Usuário não encontrado` |

---

## GET `/backoffice/balance/influencers/:userId/entries`

Histórico de entradas de saldo de um influencer.

**Path Params:** `userId` — ID interno do usuário  
**Query Params:** `page`, `per_page`

**Response `200`** — mesma estrutura de `GET /backoffice/balance/entries`

---

## POST `/backoffice/balance/entries`

Credita saldo manualmente para um influencer. Operação administrativa, sem envolver o Asaas.

**Body**
```json
{
  "user_id": 42,
  "amount_cents": 15000,
  "description": "Bônus manual",
  "campaign_id": 7,
  "campaign_user_id": 123,
  "released": false
}
```

| Campo | Obrigatório | Descrição |
|-------|-------------|-----------|
| `user_id` | ✅ | ID do influencer |
| `amount_cents` | ✅ | Mínimo `100` |
| `description` | ❌ | Texto livre |
| `campaign_id` | ❌ | Vincula a uma campanha |
| `campaign_user_id` | ❌ | Vincula ao registro de campanha |
| `released` | ❌ | `true` = entra direto em carência de 30 dias (pula fase `reserved`) |

**Response `201`** — objeto da entrada criada (mesma estrutura de `/entries`)

**Erros**

| Status | Mensagem |
|--------|----------|
| `400` | `O valor deve ser maior que zero` |
