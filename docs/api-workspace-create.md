# API — Criação de workspace

Documentação para alinhar o **backend** com o novo fluxo de cadastro de workspace no backoffice.  
O front agora envia campos jurídicos e de endereço junto com os dados básicos da marca.

---

## Contexto

- **Autenticação**: `Authorization: Bearer <token>` obrigatório.
- **Base URL**: configurada em `VITE_SERVER_URL`. Os caminhos abaixo são sufixos após essa base.
- **Envelope de sucesso**: `{ "data": { ...workspace } }`.
- **Erros**: HTTP 4xx/5xx com `{ "message": "string" }`. O front exibe essa mensagem ao usuário.

---

## Endpoint atualizado

**`POST /workspaces`**

### Campos enviados pelo front

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `name` | string | sim | Nome da marca (3–20 chars) |
| `niche_id` | number | não | ID do nicho principal |
| `description` | string | não | Descrição da marca (10–1000 chars) |
| `legal_name` | string | não | Razão social da empresa |
| `tax_id` | string | não | CNPJ (14 dígitos, só números, sem formatação) |
| `postal_code` | string | não | CEP (8 dígitos, só números) |
| `street` | string | não | Logradouro (rua/avenida) |
| `street_number` | string | não | Número do endereço |
| `unit` | string | não | Complemento (apto, sala, etc.) |
| `neighborhood` | string | não | Bairro |
| `city` | string | não | Cidade |
| `state` | string | não | Sigla do estado (2 chars, ex.: `SP`) |

### Exemplo de body

```json
{
  "name": "Minha Marca",
  "niche_id": 3,
  "description": "Marca de moda sustentável focada no público jovem.",
  "legal_name": "Minha Marca Comércio Ltda.",
  "tax_id": "12345678000195",
  "postal_code": "01310100",
  "street": "Avenida Paulista",
  "street_number": "1000",
  "unit": "Sala 42",
  "neighborhood": "Bela Vista",
  "city": "São Paulo",
  "state": "SP"
}
```

### Resposta de sucesso — `201`

O front só precisa do `id` (UUID) imediatamente após a criação para fazer o upload da foto.  
Retornar o objeto completo do workspace é suficiente:

```json
{
  "data": {
    "id": "uuid-do-workspace",
    "name": "Minha Marca",
    "description": "Marca de moda sustentável focada no público jovem.",
    "photo": null,
    "niche_id": 3,
    "legal_name": "Minha Marca Comércio Ltda.",
    "tax_id": "12345678000195",
    "postal_code": "01310100",
    "street": "Avenida Paulista",
    "street_number": "1000",
    "unit": "Sala 42",
    "neighborhood": "Bela Vista",
    "city": "São Paulo",
    "state": "SP",
    "created_at": "2026-04-16T12:00:00Z",
    "updated_at": "2026-04-16T12:00:00Z"
  }
}
```

### Erros esperados

| Status | Situação | `message` sugerida |
|---|---|---|
| `400` | Campo obrigatório ausente ou inválido | Descrição do campo com problema |
| `409` | Workspace com mesmo nome já existe no account | `"Já existe uma marca com este nome."` |
| `422` | CNPJ inválido (validação extra no backend) | `"CNPJ inválido."` |
| `401` | Token ausente ou expirado | `"Não autenticado."` |

---

## Endpoint de upload de foto (inalterado)

**`POST /workspaces/:workspaceId/photo`**

Chamado imediatamente após a criação se o usuário selecionou uma foto.  
Sem mudanças neste endpoint — documentado apenas para referência de sequência.

- **Content-Type**: `multipart/form-data`
- **Campo do arquivo**: `photo`
- **Formatos aceitos**: `image/jpeg`, `image/png`
- **Tamanho máximo**: 10 MB

---

## Novos papéis de membro (workspace roles)

O front passou a enviar e exibir os seguintes valores para o campo `role` de membros do workspace.  
O backend deve aceitar e persistir esses valores:

| Valor (`role`) | Descrição |
|---|---|
| `owner` | Proprietário — acesso total (atribuído internamente) |
| `admin` | Administrador — acesso total |
| `analista` | Pode executar ações em campanhas existentes, mas não criar novas |
| `aprovador` | Pode apenas aprovar ou recusar influenciador/roteiro/conteúdo |
| `financeiro` | Ações financeiras: saldo, pagamentos, relatórios |
| `juridico` | Ações apenas na aba Contratos |
| `observador` | Somente visualização, sem ações |
| `member` | Papel legado — mantido por compatibilidade |

O campo `role` trafega como string simples em `POST /workspaces/:id/members` e `PATCH /workspaces/:id/members/:userId`.
