# API Backoffice - Gerenciamento de Roteiros

## Visão Geral

A API do backoffice permite que administradores e clientes visualizem, aprovem e rejeitem roteiros enviados pelos influenciadores nas campanhas.

## 📋 Endpoints

### 1. **Listar Roteiros da Campanha**

Lista todos os roteiros de uma campanha com filtros opcionais.

#### **Endpoint**
```
GET /backoffice/campaigns/{campaignId}/scripts
```

#### **Parâmetros de Query**
| Parâmetro | Tipo | Obrigatório | Descrição |
|-----------|------|-------------|-----------|
| `status` | string | Não | Filtrar por status: `'pending'`, `'approved'`, `'correction'` |
| `phase_id` | string (UUID) | Não | Filtrar por fase específica da campanha |

#### **Exemplo de Uso**
```bash
# Todos os roteiros
GET /backoffice/campaigns/campaign-uuid/scripts

# Apenas pendentes de aprovação
GET /backoffice/campaigns/campaign-uuid/scripts?status=pending

# Pendentes de uma fase específica
GET /backoffice/campaigns/campaign-uuid/scripts?status=pending&phase_id=phase-uuid
```

#### **Resposta de Sucesso (200 OK)**
```json
{
  "data": [
    {
      "id": "script-uuid",
      "campaign_id": "campaign-uuid",
      "influencer_id": "123",
      "influencer_name": "João Silva",
      "influencer_avatar": "https://example.com/avatar.jpg",
      "social_network": "instagram",
      "script": "Texto completo do roteiro enviado pelo influencer...",
      "file_url": "https://example.com/script.pdf",
      "status": "pending",
      "phase_id": "phase-uuid",
      "feedback": null,
      "submitted_at": "2025-01-01T10:00:00Z",
      "approved_at": null
    }
  ]
}
```

#### **Possíveis Status dos Roteiros**
- **`'pending'`** - Aguardando aprovação
- **`'approved'`** - Roteiro aprovado
- **`'correction'`** - Rejeitado, aguardando ajustes

---

### 2. **Aprovar Roteiro Individual**

Aprova um roteiro específico e notifica automaticamente o influenciador.

#### **Endpoint**
```
POST /backoffice/campaigns/{campaignId}/scripts/{scriptId}/approve
```

#### **Resposta de Sucesso (204 No Content)**
Corpo vazio - operação realizada com sucesso.

#### **Ações Automáticas**
- ✅ Status do roteiro muda para `'approved'`
- ✅ Timestamp `approved_at` é registrado
- ✅ Notificação criada no banco para o influencer
- ✅ Push notification enviada para o dispositivo do influencer

---

### 3. **Rejeitar Roteiro Individual**

Rejeita um roteiro específico com feedback obrigatório.

#### **Endpoint**
```
POST /backoffice/campaigns/{campaignId}/scripts/{scriptId}/reject
```

#### **Body da Requisição**
```json
{
  "feedback": "O roteiro precisa ser mais específico sobre os produtos mencionados e incluir mais detalhes sobre os benefícios..."
}
```

#### **Resposta de Sucesso (204 No Content)**
Corpo vazio - operação realizada com sucesso.

#### **Ações Automáticas**
- ✅ Status do roteiro muda para `'correction'`
- ✅ Feedback é salvo no banco
- ✅ Notificação criada para o influencer
- ✅ Push notification enviada com o feedback

---

### 4. **Aprovação em Massa**

Aprova múltiplos roteiros simultaneamente.

#### **Endpoint**
```
POST /backoffice/campaigns/{campaignId}/scripts/bulk-approve
```

#### **Body da Requisição**
```json
{
  "script_ids": [
    "script-uuid-1",
    "script-uuid-2",
    "script-uuid-3"
  ]
}
```

#### **Resposta de Sucesso (204 No Content)**
Corpo vazio - operação realizada com sucesso.

#### **Ações Automáticas**
- ✅ Todos os roteiros aprovados
- ✅ Notificações enviadas para cada influencer
- ✅ Push notifications em lote

---

### 5. **Rejeição em Massa**

Rejeita múltiplos roteiros simultaneamente com o mesmo feedback.

#### **Endpoint**
```
POST /backoffice/campaigns/{campaignId}/scripts/bulk-reject
```

#### **Body da Requisição**
```json
{
  "script_ids": [
    "script-uuid-1",
    "script-uuid-2"
  ],
  "feedback": "Feedback geral aplicável a todos os roteiros rejeitados..."
}
```

#### **Resposta de Sucesso (204 No Content)**
Corpo vazio - operação realizada com sucesso.

#### **Ações Automáticas**
- ✅ Todos os roteiros rejeitados
- ✅ Mesmo feedback aplicado a todos
- ✅ Notificações enviadas para cada influencer

---

## 🔐 Autenticação e Autorização

### **Headers Obrigatórios**
```
Client-Type: backoffice
Authorization: Bearer {workspace-token}
Accept: application/json
```

### **Permissões Necessárias**
- `client_type:backoffice` - Acesso ao módulo backoffice
- Workspace válido no contexto
- Propriedade da campanha (workspace deve ser dono da campanha)

### **Exemplo Completo de Request**
```bash
curl -X GET "https://api.hypeapp.com/backoffice/campaigns/campaign-uuid/scripts?status=pending" \
  -H "Client-Type: backoffice" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Accept: application/json"
```

---

## 📊 Status dos Roteiros

| Status | Label | Descrição |
|--------|-------|-----------|
| `pending` | Pendente | Aguardando avaliação |
| `approved` | Aprovado | Roteiro aprovado, influencer pode prosseguir |
| `correction` | Correção Solicitada | Rejeitado, influencer deve ajustar e reenviar |

---

## 🚨 Tratamento de Erros

### **404 Not Found**
```json
{
  "statusCode": 404,
  "message": "Campanha não encontrada",
  "error": "Not Found"
}
```

### **400 Bad Request**
```json
{
  "statusCode": 400,
  "message": "Feedback é obrigatório para rejeição",
  "error": "Bad Request"
}
```

### **403 Forbidden**
```json
{
  "statusCode": 403,
  "message": "Acesso negado",
  "error": "Forbidden"
}
```

---

## 📱 Notificações Automáticas

Quando um roteiro é aprovado ou rejeitado, o sistema automaticamente:

1. **Cria registro de notificação** na tabela `notifications`
2. **Envia push notification** via Firebase para o influencer
3. **Atualiza status do influencer** na campanha (se aplicável)

### **Tipos de Notificação**
- **Aprovação:** `script_approved`
- **Rejeição:** `script_correction_requested`

---

## 🔄 Fluxo Típico de Uso

1. **Listar roteiros pendentes:**
   ```
   GET /backoffice/campaigns/{id}/scripts?status=pending
   ```

2. **Avaliar roteiro individualmente**

3. **Aprovar ou rejeitar:**
   ```
   POST /backoffice/campaigns/{id}/scripts/{scriptId}/approve
   # ou
   POST /backoffice/campaigns/{id}/scripts/{scriptId}/reject
   ```

4. **Para ações em lote:**
   ```
   POST /backoffice/campaigns/{id}/scripts/bulk-approve
   # ou
   POST /backoffice/campaigns/{id}/scripts/bulk-reject
   ```

---

## ⚡ Performance

- **Paginação:** Implemente paginação para listas grandes
- **Filtros:** Use filtros para reduzir volume de dados
- **Índices:** As queries usam índices otimizados
- **Cache:** Considere cache para dados frequentemente acessados

---

*Documentação da API Backoffice - Roteiros | Fevereiro 2025*
