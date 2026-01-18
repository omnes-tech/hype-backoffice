# 📊 Status do Usuário na Campanha (Campaign User Status)

Documentação completa dos status disponíveis para usuários (influenciadores) em campanhas.

## 📋 Lista de Status

### 1. `applications` - Inscrições
**Label:** "Applications"  
**Descrição:** Status inicial quando o influenciador se inscreve na campanha.  
**Quando é usado:**
- Quando um influenciador se inscreve em uma campanha disponível
- Status padrão ao criar um novo registro `campaign_users`

**Próximos status possíveis:**
- `curation` - Quando vai para curadoria
- `invited` - Quando recebe convite
- `rejected` - Quando é rejeitado

---

### 2. `curation` - Curadoria
**Label:** "Curation"  
**Descrição:** Influenciador está em processo de avaliação interna pela marca.  
**Quando é usado:**
- Quando o backoffice move o influenciador para curadoria
- Durante o processo de seleção de influenciadores

**Próximos status possíveis:**
- `invited` - Quando recebe convite após curadoria
- `approved` - Quando é aprovado diretamente
- `rejected` - Quando é rejeitado

---

### 3. `invited` - Convidado
**Label:** "Invited (in selection)"  
**Descrição:** Influenciador recebeu convite para participar da campanha, mas ainda não aceitou.  
**Quando é usado:**
- Quando o backoffice envia um convite para o influenciador
- O influenciador ainda não aceitou o convite

**Próximos status possíveis:**
- `approved` - Quando aceita o convite e começa a participar
- `rejected` - Quando rejeita o convite ou é removido

---

### 4. `approved` - Aprovado/Em Andamento
**Label:** "Approved/In Progress"  
**Descrição:** Influenciador está participando ativamente da campanha e pode enviar conteúdos.  
**Quando é usado:**
- Quando o influenciador aceita o convite
- Quando o backoffice aprova o influenciador diretamente
- Status ativo durante a participação na campanha

**Próximos status possíveis:**
- `pending_approval` - Quando envia conteúdo e aguarda aprovação
- `rejected` - Quando é removido da campanha

---

### 5. `pending_approval` - Aguardando Aprovação
**Label:** "Pending Approval"  
**Descrição:** Influenciador enviou conteúdo e está aguardando revisão do backoffice.  
**Quando é usado:**
- Automaticamente quando o influenciador envia conteúdo pela primeira vez
- Quando reenvia conteúdo após correção

**Próximos status possíveis:**
- `content_approved` - Quando o conteúdo é aprovado
- `in_correction` - Quando o conteúdo precisa de ajustes

**Transições automáticas:**
- `pending_approval` → `content_approved` (quando conteúdo aprovado)
- `pending_approval` → `in_correction` (quando conteúdo rejeitado)

---

### 6. `in_correction` - Em Correção
**Label:** "In Correction"  
**Descrição:** Conteúdo foi rejeitado e o influenciador precisa fazer ajustes.  
**Quando é usado:**
- **Automaticamente** quando o backoffice rejeita um conteúdo (`POST /contents/:id/reject`)
- O influenciador recebe feedback e nova data de envio

**Ações do influenciador:**
- Deve corrigir o conteúdo conforme o feedback
- Pode fazer upload novamente até a nova data de envio
- Deve usar a rota de reenvio de conteúdo

**Próximos status possíveis:**
- `pending_approval` - Quando reenvia o conteúdo corrigido

**Transições automáticas:**
- `in_correction` → `pending_approval` (quando reenvia conteúdo)

**Notificações:**
- Recebe notificação com feedback detalhado
- Recebe nova data de envio (`correction_deadline`)
- Push notification informando sobre a necessidade de correção

---

### 7. `content_approved` - Conteúdo Aprovado/Aguardando Publicação
**Label:** "Content Approved/Awaiting Publication"  
**Descrição:** Conteúdo foi aprovado e o influenciador deve aguardar a data de postagem para publicar.  
**Quando é usado:**
- **Automaticamente** quando o backoffice aprova um conteúdo (`POST /contents/:id/approve`)
- O influenciador deve agendar a publicação para a data especificada

**Ações do influenciador:**
- Deve agendar a publicação para a data e horário informados
- Deve usar a hashtag da campanha na publicação
- Deve aguardar o dia da postagem

**Próximos status possíveis:**
- `published` - Quando a publicação é identificada pelo bot

**Transições automáticas:**
- `content_approved` → `published` (quando bot identifica publicação no dia correto)

**Notificações:**
- Recebe notificação com data e horário de postagem
- Recebe hashtag da campanha
- Push notification reforçando a data de publicação

**Metadata da notificação:**
```json
{
  "publish_date": "2026-01-27T00:00:00.000Z",
  "publish_time": "14:00:00",
  "hashtag": "#campanha2026"
}
```

---

### 8. `published` - Publicado
**Label:** "Published"  
**Descrição:** Conteúdo foi publicado nas redes sociais do influenciador e identificado pelo bot.  
**Quando é usado:**
- Automaticamente quando o bot identifica a publicação no dia correto
- Quando o sistema confirma que o conteúdo foi publicado com a hashtag correta

**Próximos status possíveis:**
- Nenhum (status final para essa fase)
- Pode voltar para `pending_approval` se houver nova fase

---

### 9. `rejected` - Rejeitado
**Label:** "Rejected"  
**Descrição:** Influenciador foi rejeitado ou removido da campanha.  
**Quando é usado:**
- Quando o backoffice rejeita o influenciador durante a seleção
- Quando o influenciador é removido da campanha
- Quando o influenciador rejeita um convite

**Próximos status possíveis:**
- Nenhum (status final)

---

## 🔄 Fluxo Completo de Status

```
applications (Inscrição)
    ↓
curation (Curadoria) ──→ rejected (Rejeitado)
    ↓
invited (Convidado) ──→ rejected (Rejeitado)
    ↓
approved (Aprovado/Em Andamento)
    ↓
pending_approval (Aguardando Aprovação)
    ↓                    ↓
content_approved    in_correction
(Aprovado/Aguardando)   (Em Correção)
    ↓                    ↓
published          pending_approval
(Publicado)        (Reenvio)
```

## 📝 Transições Automáticas

### Quando Conteúdo é Aprovado
```typescript
// Status do conteúdo: 'approved'
// Status do campaign_user: 'pending_approval' → 'content_approved'
```

### Quando Conteúdo é Rejeitado
```typescript
// Status do conteúdo: 'adjustment_requested'
// Status do campaign_user: 'pending_approval' → 'in_correction'
```

### Quando Conteúdo é Reenviado Após Correção
```typescript
// Status do conteúdo: 'pending'
// Status do campaign_user: 'in_correction' → 'pending_approval'
```

### Quando Publicação é Identificada
```typescript
// Status do conteúdo: 'published'
// Status do campaign_user: 'content_approved' → 'published'
```

---

## 🎯 Status por Contexto

### Status Iniciais (Seleção)
- `applications` - Inscrições abertas
- `curation` - Em avaliação
- `invited` - Convite pendente

### Status Ativos (Participação)
- `approved` - Participando ativamente
- `pending_approval` - Aguardando revisão de conteúdo
- `in_correction` - Corrigindo conteúdo rejeitado
- `content_approved` - Conteúdo aprovado, aguardando publicação
- `published` - Conteúdo publicado

### Status Finais
- `rejected` - Rejeitado/Removido

---

## 🔍 Como Usar no Frontend

### Exibir Status no Card do Influenciador

```typescript
const statusLabels: Record<string, string> = {
  applications: 'Inscrições',
  curation: 'Curadoria',
  invited: 'Convidado',
  approved: 'Aprovado/Em Andamento',
  pending_approval: 'Aguardando Aprovação',
  in_correction: 'Em Correção',
  content_approved: 'Aprovado/Aguardando Publicação',
  published: 'Publicado',
  rejected: 'Rejeitado',
};

// Exibir no card
<div className={`status-badge status-${status}`}>
  {statusLabels[status]}
</div>
```

### Filtrar por Status

```typescript
// GET /api/backoffice/campaigns/:campaignId/users?status=pending_approval
const response = await fetch(
  `/api/backoffice/campaigns/${campaignId}/users?status=pending_approval`
);
```

### Verificar Status Específicos

```typescript
// Verificar se está em correção
if (campaignUser.status === 'in_correction') {
  // Mostrar feedback e nova data de envio
  showCorrectionFeedback(campaignUser);
}

// Verificar se está aguardando publicação
if (campaignUser.status === 'content_approved') {
  // Mostrar data de postagem e hashtag
  showPublicationInfo(campaignUser);
}
```

---

## 📊 Endpoints Relacionados

### Listar Usuários por Status
```
GET /api/backoffice/campaigns/:campaignId/users?status={status}
```

### Atualizar Status Manualmente
```
PUT /api/backoffice/campaigns/:campaignId/users/:userId
Body: { "action": "approve" | "reject" | "curation" | ... }
```

### Status Automáticos (via Aprovação/Rejeição de Conteúdo)
```
POST /api/backoffice/campaigns/:campaignId/contents/:contentId/approve
→ Atualiza para 'content_approved'

POST /api/backoffice/campaigns/:campaignId/contents/:contentId/reject
→ Atualiza para 'in_correction'
```

---

## ⚠️ Observações Importantes

1. **Status Automáticos:** `in_correction` e `content_approved` são atualizados automaticamente quando conteúdo é rejeitado/aprovado.

2. **Múltiplos Conteúdos:** Se um influenciador tem múltiplos conteúdos, o status reflete o estado geral:
   - Se algum conteúdo está `adjustment_requested` → `in_correction`
   - Se todos estão `approved` → `content_approved`

3. **Fases Múltiplas:** Em campanhas com múltiplas fases, o status pode voltar para `pending_approval` quando uma nova fase começa.

4. **Compatibilidade:** O sistema aceita tanto valores em inglês (`in_correction`) quanto em português (`em_correcao`) para compatibilidade.

---

**Última Atualização:** Janeiro 2026
