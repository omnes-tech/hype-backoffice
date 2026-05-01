# Sistema de Saldo

Documentação de integração para **frontend (backoffice web)** e **app mobile**.

---

## Visão geral

O saldo de um usuário (influencer ou backoffice) é composto por entradas individuais, cada uma associada a uma campanha. Cada entrada percorre um ciclo de vida com 4 status:

```
[RESERVADO] ──── campanha encerra ────► [AGUARDANDO LIBERAÇÃO]
                                               │
                                        30 dias passam
                                               │
                                               ▼
                                      [DISPONÍVEL PARA SAQUE]
                                               │
                                       usuário saca
                                               │
                                               ▼
                                           [SACADO]
```

**Todos os valores na API são em centavos** (ex.: R$ 150,00 = `15000`). Os campos `amount` (string `"150.00"`) são fornecidos por conveniência para exibição.

---

## Autenticação

Todos os endpoints requerem o header:

```
Authorization: Bearer <token>
```

- Endpoints `/app/*` → token do influencer (app mobile)
- Endpoints `/backoffice/*` → token do usuário backoffice

---

## Status de referência

### Status de entrada (`balance_entry.status`)

| Valor | Label | Descrição |
|---|---|---|
| `reserved` | Reservado (Em Campanha) | Valor bloqueado enquanto a campanha está ativa |
| `pending_release` | Aguardando Liberação | Campanha encerrada; carência de 30 dias em andamento |
| `available` | Disponível para Saque | Pode ser sacado |
| `withdrawn` | Sacado | Incluído em um pedido de saque |

### Status de saque (`withdrawal.status`)

| Valor | Label | Descrição |
|---|---|---|
| `pending` | Aguardando Processamento | Solicitado pelo usuário; aguarda processamento |
| `paid` | Pago | Transferência efetuada |

### Tipos de chave PIX (`pix_key_type`)

`cpf` · `cnpj` · `email` · `phone` · `random`

---

## Endpoints — App (influencer)

Base: `/app/balance`

---

### `GET /app/balance`

Retorna o resumo consolidado do saldo do influencer autenticado.

**Response `200`**

```json
{
  "data": {
    "reserved_cents": 20000,
    "pending_release_cents": 15000,
    "available_cents": 5000,
    "withdrawn_cents": 10000,
    "total_earned_cents": 50000
  }
}
```

**Exemplo de uso (tela de carteira)**

```
Reservado (Em Campanha)     R$ 200,00
Aguardando Liberação        R$ 150,00
Disponível para Saque       R$  50,00
─────────────────────────────────────
Total ganho                 R$ 500,00
```

---

### `GET /app/balance/entries`

Histórico paginado de entradas de saldo do influencer autenticado.

**Query params**

| Param | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `page` | number | não | Página (padrão: 1) |
| `per_page` | number | não | Itens por página (padrão: 15) |
| `status` | string | não | Filtrar por status (`reserved`, `pending_release`, `available`, `withdrawn`) |

**Response `200`**

```json
{
  "data": [
    {
      "id": "uuid-da-entrada",
      "amount_cents": 15000,
      "amount": "150.00",
      "status": {
        "value": "pending_release",
        "label": "Aguardando Liberação"
      },
      "description": "Pagamento campanha Verão 2025",
      "released_at": "2025-04-20T10:00:00.000Z",
      "available_at": "2025-05-20T10:00:00.000Z",
      "withdrawn_at": null,
      "campaign": {
        "id": "uuid-da-campanha",
        "title": "Campanha Verão 2025"
      },
      "created_at": "2025-04-01T08:00:00.000Z"
    }
  ],
  "meta": {
    "total": 12,
    "page": 1,
    "per_page": 15,
    "last_page": 1
  }
}
```

> **Dica para o app:** use `available_at` para exibir um contador regressivo na tela de "Aguardando Liberação".

---

### `GET /app/balance/withdrawals`

Histórico paginado de saques do influencer autenticado.

**Query params:** `page`, `per_page`

**Response `200`**

```json
{
  "data": [
    {
      "id": "uuid-do-saque",
      "amount_cents": 5000,
      "amount": "50.00",
      "status": {
        "value": "pending",
        "label": "Aguardando Processamento"
      },
      "pix_key": "influencer@email.com",
      "pix_key_type": "email",
      "processed_at": null,
      "created_at": "2025-04-28T14:30:00.000Z"
    }
  ],
  "meta": {
    "total": 3,
    "page": 1,
    "per_page": 15,
    "last_page": 1
  }
}
```

---

### `POST /app/balance/withdrawals`

Solicita um saque do saldo disponível via PIX.

O valor é deduzido do saldo `available` imediatamente (seleção FIFO das entradas mais antigas). O saque fica com status `pending` até ser processado.

**Body**

```json
{
  "amount_cents": 5000,
  "pix_key": "influencer@email.com",
  "pix_key_type": "email"
}
```

| Campo | Tipo | Obrigatório | Regras |
|---|---|---|---|
| `amount_cents` | integer | sim | Mínimo: `100` (R$ 1,00) |
| `pix_key` | string | sim | Chave PIX do influencer |
| `pix_key_type` | string | sim | `cpf`, `cnpj`, `email`, `phone` ou `random` |

**Response `201`**

```json
{
  "data": {
    "id": "uuid-do-saque",
    "amount_cents": 5000,
    "amount": "50.00",
    "status": {
      "value": "pending",
      "label": "Aguardando Processamento"
    },
    "pix_key": "influencer@email.com",
    "pix_key_type": "email",
    "processed_at": null,
    "created_at": "2025-04-28T14:30:00.000Z"
  }
}
```

**Erros possíveis**

| Status | Mensagem | Causa |
|---|---|---|
| `400` | `Saldo disponível insuficiente. Disponível: R$ X,XX` | `amount_cents` maior que o saldo `available` |
| `400` | `O valor deve ser maior que zero` | `amount_cents` ≤ 0 |

---

## Endpoints — Backoffice

Base: `/backoffice/balance`

---

### `GET /backoffice/balance`

Retorna o resumo consolidado do saldo do usuário backoffice autenticado.

**Response `200`** — mesmo formato de `/app/balance`

---

### `GET /backoffice/balance/entries`

Histórico paginado de entradas de saldo do usuário backoffice autenticado.

**Query params:** `page`, `per_page`, `status`

**Response `200`** — mesmo formato de `/app/balance/entries`

---

### `GET /backoffice/balance/withdrawals`

Histórico paginado de saques do usuário backoffice autenticado.

**Query params:** `page`, `per_page`

**Response `200`** — mesmo formato de `/app/balance/withdrawals`

---

### `POST /backoffice/balance/withdrawals`

Solicita um saque do saldo disponível via PIX.

Mesmo comportamento de `/app/balance/withdrawals`.

**Body / Response / Erros:** mesmo formato do endpoint do app.

---

### `GET /backoffice/balance/influencers/:userId`

Resumo de saldo de um influencer específico (visão administrativa).

**Params:** `:userId` (integer)

**Response `200`**

```json
{
  "data": {
    "user": {
      "id": 42,
      "name": "João Silva",
      "email": "joao@email.com"
    },
    "reserved_cents": 20000,
    "pending_release_cents": 15000,
    "available_cents": 5000,
    "withdrawn_cents": 10000,
    "total_earned_cents": 50000
  }
}
```

---

### `GET /backoffice/balance/influencers/:userId/entries`

Histórico de entradas de saldo de um influencer específico.

**Query params:** `page`, `per_page`

**Response:** mesmo formato de `/app/balance/entries`

---

### `GET /backoffice/balance/workspace/:workspaceId`

Retorna o saldo atual do workspace (cliente).

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
|---|---|
| `balance_cents` | Total carregado |
| `committed_cents` | Reservado para influencers aprovados |
| `available_cents` | Disponível para novas aprovações (`balance - committed`) |

---

### `POST /backoffice/balance/workspace/:workspaceId/top-up`

Recarrega o saldo do workspace. Use ao registrar um depósito recebido.

**Body**

```json
{ "amount_cents": 50000 }
```

**Response `200`** — saldo atualizado (mesmo formato do GET acima)

---

### `POST /backoffice/balance/entries`

Cria uma entrada de saldo manualmente para um influencer.

**Body**

```json
{
  "user_id": 42,
  "amount_cents": 15000,
  "description": "Pagamento campanha Verão 2025",
  "campaign_id": 7,
  "campaign_user_id": 123,
  "released": false
}
```

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `user_id` | integer | sim | ID do influencer |
| `amount_cents` | integer | sim | Mínimo: `100` |
| `description` | string | não | Descrição legível |
| `campaign_id` | integer | não | ID interno da campanha |
| `campaign_user_id` | integer | não | ID do vínculo campanha-influencer |
| `released` | boolean | não | `true` = entra como `pending_release` (carência inicia agora). `false` (padrão) = entra como `reserved` |

**Response `201`:** objeto de entrada (mesmo formato de `/app/balance/entries`)

---

## Automação (crons)

Toda a progressão de saldo é automática — nenhuma ação manual é necessária do frontend.

| Horário | Job | O que faz |
|---|---|---|
| **01:00** | `CampaignFinalizationScheduler` | Busca campanhas `published` cuja última fase (`MAX(publish_date)`) já passou. Marca como `finished` e move todos os saldos `reserved` → `pending_release` (`available_at = now + 30 dias`) |
| **02:00** | `BalanceReleaseScheduler` | Busca entradas `pending_release` cujo `available_at < now` e move para `available` |

---

## Exemplos de fluxo completo

### Tela de carteira (app / backoffice)

```
1. GET /app/balance  (ou /backoffice/balance)
   → exibe os 4 buckets

2. GET /app/balance/entries?status=pending_release
   → lista entradas com countdown até available_at

3. GET /app/balance/entries?status=available
   → lista entradas que podem ser sacadas

4. POST /app/balance/withdrawals  { amount_cents, pix_key, pix_key_type }
   → cria saque, saldo available é reduzido imediatamente

5. GET /app/balance/withdrawals
   → usuário acompanha o status do saque
```

### Ciclo automático de saldo (sem ação do frontend)

```
[cron 01:00] Campanha com última fase expirada
   → status muda para "finished"
   → saldos reserved → pending_release (available_at = hoje + 30 dias)

[cron 02:00] 30 dias depois
   → pending_release → available
   → usuário pode solicitar saque
```

---

## Validação de saldo na aprovação

Ao aprovar um influencer (individual ou em lote), o sistema verifica automaticamente se o workspace tem saldo suficiente para cobrir o pagamento.

**Campanhas monetárias** (`fixed`, `exchange`, `swap`) — bloqueiam se saldo insuficiente.  
**Outras** (`cpa`, `cpm`, `influencer_price`, `to_be_agreed`) — sem validação (valor não é fixo no momento da aprovação).

**Erro retornado ao aprovar sem saldo:**

```json
{
  "statusCode": 400,
  "message": "Saldo insuficiente. Disponível: R$ 50,00, necessário: R$ 150,00"
}
```

**Erro retornado no bulk approve:**

```json
{
  "statusCode": 400,
  "message": "Saldo insuficiente para aprovar todos os influencers. Disponível: R$ 200,00, necessário: R$ 450,00"
}
```

> No bulk, a validação do total é feita **antes** de qualquer atualização — ou todos são aprovados ou nenhum.

---

## Notas de implementação

- **Valores:** sempre trafegue `amount_cents` (integer) para operações. Use `amount` (string) apenas para exibição.
- **IDs públicos:** todos os IDs expostos na API são UUIDs (`public_id`). IDs numéricos internos não são expostos nos endpoints do app.
- **FIFO de saques:** ao solicitar um saque, as entradas `available` mais antigas são consumidas primeiro.
- **Saque parcial:** é possível sacar um valor menor que o total disponível. As entradas não consumidas permanecem `available`.
qu
