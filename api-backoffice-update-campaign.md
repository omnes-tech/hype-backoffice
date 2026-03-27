# Backoffice — Atualizar campanha (`PUT`)

Integração do endpoint que atualiza **dados da campanha** e, opcionalmente, **todas as fases** em uma única requisição transacional.

## Endpoint

| Método | Caminho | Resposta |
|--------|---------|----------|
| `PUT` | `/backoffice/campaigns/:campaignId` | `204 No Content` (sem corpo) |

- **`campaignId`**: UUID público da campanha (campo `public_id` / `id` retornado na listagem ou no GET).

### Headers

- Credenciais de autenticação usuais do backoffice.
- **`Workspace-Id`** (ou o header que o projeto usa para o workspace), coerente com a campanha.

---

## Corpo da requisição (`UpdateCampaignDto`)

Todos os campos abaixo seguem a validação do DTO (class-validator). Em geral o cliente envia o **objeto completo** da campanha após edição no formulário.

| Campo | Tipo | Obrigatório | Notas |
|--------|------|-------------|--------|
| `title` | string | sim | |
| `description` | string | sim | |
| `objective` | string | sim | |
| `max_influencers` | number | sim | Inteiro > 0 |
| `payment_method` | enum | sim | Ex.: `pix`, `transfer`, etc. (ver `PaymentMethodEnum`) |
| `payment_method_details` | object | não | Se **omitido**, mantém o valor já salvo na campanha. |
| `secondary_niches` | `number[]` \| omitido | não | IDs de nichos. Omitir mantém o atual; `[]` ou `null` limpa. |
| `benefits` | `string[]` \| string | não | Se **omitido**, mantém benefícios atuais. Enviar `[]` limpa. |
| `rules_does` | `string[]` | sim | |
| `rules_does_not` | `string[]` | sim | |
| `segment_min_followers` | number \| null | não | Omitir mantém o atual. |
| `segment_state` | `string[]` \| null | não | UF; omitir mantém. |
| `segment_city` | `string[]` \| null | não | Omitir mantém. |
| `segment_genders` | enum[] \| null | não | Omitir mantém. |
| `image_rights_period` | number | não | ≥ 0. Omitir mantém. `0` = sem período definido. |
| `banner` | string \| null | não | URL; omitir **não altera** o banner (upload dedicado pode existir em outro endpoint). |
| **`phases`** | array \| omitido | não | Ver seção **Fases** abaixo. |

---

## Fases (`phases`)

### Comportamento

- Se **`phases` não vier no JSON** → nenhuma alteração nas fases existentes.
- Se **`phases` vier** (inclusive `[]`) → o conjunto de fases da campanha passa a ser **exatamente** o do array, **na ordem enviada**:
  - **Ordem**: índice `0` = fase 1, índice `1` = fase 2, …
  - Item **com `id`** (UUID da fase) → **atualiza** essa fase se ela existir na campanha.
  - Item **com `id` que não existe** nessa campanha → trata-se como **nova fase** (criação).
  - Item **sem `id`** → **nova fase**.
  - Qualquer fase que **já existia no banco** e **não aparece** em `phases` → **removida**.
    - Conteúdos (`campaign_contents`) ligados ao step podem ficar com `campaign_step_id` = `null` (comportamento do banco).

### Estrutura de cada fase (igual à criação de campanha / fase)

| Campo | Tipo | Obrigatório |
|--------|------|-------------|
| `id` | UUID string | não — obrigatório para **editar** uma fase existente sem duplicá-la |
| `objective` | string | sim |
| `post_date` | string `YYYY-MM-DD` | sim |
| `publish_time` | string `HH:MM` ou `HH:MM:SS` | não — default `00:00:00` |
| `formats` | array | sim — mínimo 1 item |
| `formats[].type` | string | sim — tipo de conteúdo/rede |
| `formats[].options` | array | sim |
| `formats[].options[].type` | string | sim |
| `formats[].options[].quantity` | number (inteiro) | sim |
| `files` | `string[]` | não — URLs; resposta de criação ainda reflete o fluxo legado |

### Regras de data (validação)

- A **primeira fase** do array deve obedecer à regra de “primeira publicação” (ex.: antecedência mínima em relação à data atual — ver `CampaignDateValidator.validateFirstStepDate`).
- Cada fase seguinte deve respeitar o espaçamento mínimo em relação à **data da fase anterior no mesmo payload** (`validateSubsequentStepDate`).
- Em caso de violação → `400 Bad Request` com mensagem em português.

### Associação de redes

Ao criar ou ao alterar `formats`, o backend **reconstrói** as associações em `campaign_step_social_networks` para as redes do workspace compatíveis com os tipos de conteúdo (mesma lógica do POST de fase e do PUT de step).

### Google Calendar

Após sucesso na atualização quando `phases` foi enviado, o serviço tenta **regerar eventos** no Google Calendar para todos os influenciadores da campanha (erros são logados e **não** derrubam o `PUT`).

---

## Casos de uso

### 1) Só alterar título, regras ou segmentação — **sem mexer nas fases**

- Envie o JSON completo dos campos obrigatórios da campanha.
- **Não inclua** `phases`.

**Exemplo (ilustrativo):** ajustar `title`, `rules_does`, `segment_min_followers`; omitir `phases`.

---

### 2) Editar campanha e **manter as mesmas fases** com pequenos ajustes

1. `GET /backoffice/campaigns/:campaignId` (ou `GET .../phases`) para obter as fases atuais com **`id`** de cada uma (`id` público UUID).
2. Monte `phases` na ordem desejada, **preservando os `id`** das que são atualizações.
3. Envie `PUT` com o restante dos campos da campanha + `phases`.

---

### 3) **Reordenar** fases

- Inclua todas as fases que devem existir, com os mesmos `id`, em **nova ordem** no array.
- O índice no array define a nova `order` (1-based internamente).

---

### 4) **Adicionar** uma fase no meio ou no fim

- Inclua todas as fases existentes (com `id`) + um novo objeto **sem `id`** (ou com `id` inexistente, que será tratado como criação).
- Revalide as datas em cadeia após inserir a nova data no payload.

---

### 5) **Remover** uma ou mais fases

- Envie `phases` contendo apenas as fases que devem permanecer.
- As omitidas serão apagadas (atenção a conteúdos vinculados ao step).

---

### 6) **Remover todas as fases**

- Envie `"phases": []`.
- Útil apenas se a UX permitir campanha sem fases; avalie impacto em conteúdos e relatórios.

---

### 7) Pagamento e nichos secundários **sem mudança**

- Omita `payment_method_details` e `secondary_niches` para manter valores atuais.
- Para **limpar** nichos secundários, envie `secondary_niches: []` (ou o contrato que o frontcombinar com o backend para “vazio”).

---

## Erros comuns

| Situação | Resultado típico |
|----------|-------------------|
| Campanha de outro workspace | `404` |
| Datas de fases inválidas | `400` |
| Corpo inválido (campos obrigatórios ausentes, tipos errados) | `400` (validação Nest) |
| Erro interno | `500` |

---

## Relação com outros endpoints

| Ação | Endpoint |
|------|-----------|
| Ler campanha + contexto | `GET /backoffice/campaigns/:campaignId` |
| Listar só fases | `GET /backoffice/campaigns/:campaignId/phases` |
| Criar **uma** fase avulsa | `POST /backoffice/campaigns/:campaignId/phases` |
| Atualizar **uma** fase avulsa | `PUT /backoffice/campaigns/:campaignId/steps/:stepId` |
| **Substituir conjunto inteiro de fases junto com a campanha** | **`PUT /backoffice/campaigns/:campaignId` com `phases`** |

Para o fluxo “salvar formulário completo da campanha + aba de fases”, o **`PUT` com `phases`** evita várias chamadas e garante **transação única** (campanha + fases).

---

## Notas de implementação (backend)

- Campanha e fases, quando `phases` é enviado, são persistidos na **mesma transação**; falha em fases reverte alterações na linha da campanha daquela requisição.
- O campo `benefits`: se **omitido** no `PUT`, o valor anterior é **preservado** (não zera mais por omissão).
