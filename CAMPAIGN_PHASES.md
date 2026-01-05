# Como Funcionam as Fases da Campanha

## Visão Geral

As **fases** (ou **steps**) são etapas sequenciais dentro de uma campanha. Cada fase define:
- Quando o conteúdo deve ser publicado (data e hora)
- Quais formatos de conteúdo são esperados (por rede social)
- Prazos para envio e correção de conteúdo

## Estrutura de Dados

### Tabela `campaign_steps`

Cada fase é armazenada na tabela `campaign_steps` com os seguintes campos:

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | integer | ID interno |
| `public_id` | uuid | ID público (usado nas APIs) |
| `campaign_id` | integer | ID da campanha (FK) |
| `order` | integer | Ordem da fase (1, 2, 3, ...) |
| `objective` | varchar(50) | Objetivo específico da fase |
| `publish_date` | date | Data prevista de publicação |
| `publish_time` | time | Hora prevista de publicação |
| `contents` | jsonb | Formatos de conteúdo esperados |
| `content_submission_deadline` | date | Prazo para envio (calculado automaticamente) |
| `correction_submission_deadline` | date | Prazo para correção (calculado automaticamente) |
| `hashtag` | varchar(255) | Hashtag da fase (opcional) |

## Endpoints Disponíveis

### 1. Criar Fase
```
POST /api/backoffice/campaigns/{campaign_id}/phases
```

**Payload:**
```json
{
  "objective": "Lançamento da campanha",
  "post_date": "2024-02-01",
  "post_time": "14:30",
  "formats": [
    {
      "type": "instagram",
      "options": [
        { "type": "post", "quantity": 2 },
        { "type": "story", "quantity": 3 }
      ]
    },
    {
      "type": "tiktok",
      "options": [
        { "type": "video", "quantity": 1 }
      ]
    }
  ],
  "files": ["https://example.com/briefing.pdf"]
}
```

### 2. Listar Fases
```
GET /api/backoffice/campaigns/{campaign_id}/phases
```

Retorna todas as fases da campanha ordenadas por `order`.

### 3. Buscar Fase Específica
```
GET /api/backoffice/campaigns/{campaign_id}/steps/{step_id}
```

### 4. Atualizar Fase
```
PUT /api/backoffice/campaigns/{campaign_id}/steps/{step_id}
```

### 5. Deletar Fase
```
DELETE /api/backoffice/campaigns/{campaign_id}/steps/{step_id}
```

## Regras de Negócio

### 1. Ordem das Fases

- A ordem é calculada automaticamente se não fornecida
- A primeira fase recebe `order = 1`
- Fases subsequentes recebem o próximo número disponível
- Cada campanha pode ter apenas uma fase com cada número de ordem (constraint única)

### 2. Validação de Datas

#### Primeira Fase (order = 1)
- **Regra:** `publish_date` deve ser **>= 10 dias** a partir da data atual
- **Motivo:** Dar tempo para os influenciadores se inscreverem e prepararem o conteúdo

#### Fases Subsequentes (order > 1)
- **Regra:** `publish_date` deve ser **>= 3 dias** após a fase anterior
- **Motivo:** Dar tempo entre as publicações

**Exemplo:**
```
Hoje: 2024-01-01
Fase 1: 2024-01-11 (mínimo 10 dias) ✅
Fase 2: 2024-01-14 (mínimo 3 dias após Fase 1) ✅
Fase 3: 2024-01-17 (mínimo 3 dias após Fase 2) ✅
```

### 3. Deadlines Automáticos

Os deadlines são calculados automaticamente com base na `publish_date`:

- **`content_submission_deadline`**: 4 dias antes de `publish_date`
  - Prazo para influenciadores enviarem o conteúdo
- **`correction_submission_deadline`**: 1 dia antes de `publish_date`
  - Prazo para enviar correções após feedback

**Exemplo:**
```
publish_date: 2024-02-01
content_submission_deadline: 2024-01-28 (4 dias antes)
correction_submission_deadline: 2024-01-31 (1 dia antes)
```

### 4. Formatos de Conteúdo (`formats`)

O campo `formats` define quais tipos de conteúdo são esperados em cada rede social:

```json
{
  "formats": [
    {
      "type": "instagram",  // Rede social
      "options": [
        {
          "type": "post",     // Tipo: post, story, reel
          "quantity": 2       // Quantidade
        },
        {
          "type": "story",
          "quantity": 3
        }
      ]
    },
    {
      "type": "tiktok",
      "options": [
        {
          "type": "video",
          "quantity": 1
        }
      ]
    }
  ]
}
```

**Redes Sociais Suportadas:**
- `instagram` - Instagram
- `tiktok` - TikTok
- `youtube` - YouTube
- `twitter` ou `x` - Twitter/X

**Tipos de Conteúdo:**
- `post` - Post no feed
- `story` - Stories
- `reel` - Reels (Instagram)
- `video` - Vídeo (TikTok, YouTube)
- `tweet` - Tweet (Twitter)

### 5. Associação com Redes Sociais

Quando uma fase é criada, o sistema automaticamente:
1. Extrai os tipos de redes sociais dos `formats`
2. Busca as redes sociais correspondentes no workspace
3. Cria associações na tabela `campaign_step_social_networks`

Isso permite vincular a fase às redes sociais do workspace.

## Fluxo Completo

### Exemplo: Campanha com 3 Fases

```javascript
// 1. Criar campanha
const campaign = await createCampaign({
  title: "Campanha Verão 2024",
  // ... outros campos
});

// 2. Criar Fase 1 - Lançamento
const phase1 = await createPhase(campaign.id, {
  objective: "Lançamento da campanha",
  post_date: "2024-02-01",  // >= 10 dias de hoje
  post_time: "10:00",
  formats: [
    {
      type: "instagram",
      options: [
        { type: "post", quantity: 1 },
        { type: "story", quantity: 5 }
      ]
    }
  ]
});

// 3. Criar Fase 2 - Engajamento
const phase2 = await createPhase(campaign.id, {
  objective: "Aumentar engajamento",
  post_date: "2024-02-04",  // >= 3 dias após Fase 1
  post_time: "14:00",
  formats: [
    {
      type: "instagram",
      options: [
        { type: "reel", quantity: 1 }
      ]
    },
    {
      type: "tiktok",
      options: [
        { type: "video", quantity: 1 }
      ]
    }
  ]
});

// 4. Criar Fase 3 - Finalização
const phase3 = await createPhase(campaign.id, {
  objective: "Encerramento da campanha",
  post_date: "2024-02-07",  // >= 3 dias após Fase 2
  post_time: "18:00",
  formats: [
    {
      type: "instagram",
      options: [
        { type: "post", quantity: 1 }
      ]
    }
  ]
});
```

## Relacionamentos

### Fase → Campanha
- Uma fase pertence a uma campanha (`campaign_id`)
- Se a campanha for deletada, as fases são deletadas automaticamente (CASCADE)

### Fase → Redes Sociais
- Uma fase pode estar associada a múltiplas redes sociais
- Associação feita através de `campaign_step_social_networks`

### Fase → Conteúdos
- Influenciadores enviam conteúdos para uma fase específica
- Conteúdos são vinculados através de `campaign_contents.campaign_step_id`

## Validações e Erros

### Erros Comuns

1. **Data muito próxima (primeira fase)**
   ```
   Erro: "A data de publicação da primeira fase deve ser pelo menos 10 dias a partir de hoje"
   ```

2. **Data muito próxima (fase subsequente)**
   ```
   Erro: "A data de publicação deve ser pelo menos 3 dias após a fase anterior"
   ```

3. **Ordem duplicada**
   ```
   Erro: "Já existe uma fase com esta ordem nesta campanha"
   ```

4. **Campanha não encontrada**
   ```
   Erro: "Campanha não encontrada"
   ```

## Exemplo de Resposta Completa

```json
{
  "data": {
    "id": "uuid-da-fase",
    "order": 1,
    "objective": "Lançamento da campanha",
    "post_date": "2024-02-01",
    "post_time": "14:30:00",
    "content_submission_deadline": "2024-01-28",
    "correction_submission_deadline": "2024-01-31",
    "contents": [
      {
        "type": "instagram",
        "options": [
          { "type": "post", "quantity": 2 },
          { "type": "story", "quantity": 3 }
        ]
      }
    ],
    "hashtag": null,
    "created_at": "2024-01-01T00:00:00.000Z",
    "updated_at": "2024-01-01T00:00:00.000Z"
  }
}
```

## Notas Importantes

1. **Ordem Sequencial**: As fases são ordenadas por `order` e devem seguir uma sequência lógica
2. **Deadlines Automáticos**: Não é necessário calcular os deadlines manualmente
3. **Formats Interno**: O campo `formats` é convertido para `contents` (formato interno) antes de salvar
4. **Associação Automática**: As redes sociais são associadas automaticamente baseadas nos `formats`
5. **Múltiplas Fases**: Uma campanha pode ter quantas fases forem necessárias
6. **Flexibilidade**: Cada fase pode ter formatos diferentes e datas diferentes

