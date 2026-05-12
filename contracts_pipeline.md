DEMANDA DE DESENVOLVIMENTO
Aba de Contratos
Estruturação completa + Integração DocuSign
Campanha Ativa  ›  Aba Contratos  ›  Backoffice Hype App

Módulo
Campanha Ativa
Área
Frontend + Backend
Integração
DocuSign eSignature API
Arquivo
contracts-tab.tsx
Serviço
contract.ts
Status kanban
contract_pending






1
Contexto e Objetivo


A aba Contratos dentro de uma campanha ativa já existe no frontend (contracts-tab.tsx) mas ainda não está totalmente estruturada para o fluxo real de envio e assinatura. Esta demanda a estrutura de ponta a ponta:
• Escolha entre contrato padrão da plataforma ou upload de contrato próprio
• Orientação sobre variáveis dinâmicas quando optar pelo upload
• Integração com DocuSign para envio e coleta de assinatura eletrônica
• Espelhamento do status de assinatura no painel via webhook DocuSign
• Vínculo com o status contract_pending do kanban de gerenciamento

Perfil Jurídico: executa ações exclusivamente nesta aba. O Administrador também tem acesso total. Demais perfis visualizam sem executar ações.


2
Fluxo do Usuário (UX)


1
Acessa campanha ativa e clica na aba Contratos.


2
Visualiza a lista de contratos com filtros por status e influenciador.


3
Clica em "+ Enviar contrato". Abre o modal de envio.


4
Seleciona o influenciador. Status contract_pending aparecem como prioritários.


5
Escolhe tipo: Padrão da plataforma ou Upload de contrato próprio.


6
Contrato padrão: usa template cadastrado, define expiração e confirma.


7
Upload próprio: visualiza painel de variáveis, faz upload do PDF/DOCX e confirma.


8
Backend monta envelope no DocuSign e envia para as 4 partes assinarem.


9
Status do contrato atualizado automaticamente via webhook DocuSign.


10
Quando todas as partes assinarem, influenciador avança de contract_pending para approved.



3
Tela — Aba Contratos


A tabela exibe todos os contratos da campanha. Influenciadores contract_pending sem contrato aparecem como linhas "Pendente de envio" com botão de ação rápida "Enviar agora".

Figura 1 — Aba Contratos: listagem com status DocuSign, tipo de contrato e ações contextuais

Coluna
Descrição
Observação
Influenciador
Avatar + nome + @username + status kanban
Badge sutil do status abaixo do nome
Tipo de contrato
"Padrão" ou "Upload próprio"
Exibe "—" se não enviado
Status
Pill colorido — status DocuSign
Ver seção 8
Enviado em
Data do envio
Exibe "—" se pendente
Ações
Links contextuais por status
Detalhes / Reenviar / Baixar / Enviar agora


Ação "Enviar agora" aparece exclusivamente para influenciadores contract_pending sem contrato, criando atalho direto de envio.


4
Modal de Envio de Contrato


Modo A — Contrato padrão da plataforma

Figura 2 — Modal com contrato padrão: campos de e-mail pré-salvos do workspace
Dar uma opção do usuário visualizar o modelo do contrato padrão
Modo B — Upload de contrato próprio

Figura 3 — Modal com upload próprio: painel de variáveis disponíveis e área de drag-and-drop

Descrever o que é cada variável


O e-mail do influenciador NÃO é exibido ao usuário. O backend busca esse dado internamente no cadastro do app mobile no momento do envio.


5
Partes Signatárias do Contrato


Todo contrato exige 4 assinantes com routingOrder sequencial. Cada parte só recebe o convite de assinatura após a anterior concluir.

Figura 4 — Ordem de assinatura sequencial: influenciador (1º) → representante (2º) → testemunha 1 (3º) → testemunha 2 (4º)

1
Influenciador
Assina primeiro — routingOrder 1
Automático — e-mail do cadastro no app mobile





2
Representante da marca
Assina após o influenciador — routingOrder 2
Informado pelo usuário no modal — pré-salvo após 1º uso





3
Testemunha 1
Indicada pela marca — routingOrder 3
Informado pelo usuário no modal — pré-salvo após 1º uso





4
Testemunha 2
Indicada pela marca — routingOrder 4
Informado pelo usuário no modal — pré-salvo após 1º uso






DECISÃO PENDENTE: routingOrder sequencial (influenciador primeiro) ou envio simultâneo? Confirmar com o time jurídico.

Resposta: Simultânea


6
Variáveis Dinâmicas do Contrato


Substituídas pelo backend antes de criar o envelope. Formato: {{nome_variavel}}. Exibidas no modal ao selecionar "Upload próprio".
Dados do influenciador (cadastro no app mobile)
Variável
Descrição
Origem
{{influencer_name}}
Nome completo
Cadastro no app
{{influencer_cpf}}
CPF
Cadastro no app
{{influencer_rg}}
RG
Cadastro no app
{{influencer_email}}
E-mail (uso interno)
Cadastro no app
{{influencer_phone}}
Telefone
Cadastro no app
{{influencer_address}}
Endereço completo
Cadastro no app
{{influencer_bank_account}}
Dados bancários
Cadastro no app
{{influencer_username}}
Username na rede principal
Perfil vinculado no app


Dados da marca (informados no modal — padrão)
Variável
Descrição
Origem
{{brand_legal_name}}
Razão social da marca
Informado no modal de envio
{{brand_cnpj}}
CNPJ da marca
Informado no modal de envio
{{brand_address}}
Endereço da marca
Informado no modal de envio
{{representative_name}}
Nome do responsável que assina
Informado no modal de envio
{{representative_cpf}}
CPF do responsável
Informado no modal de envio
{{representative_email}}
E-mail do responsável
Informado no modal de envio


Dados da campanha (backoffice)
Variável
Descrição
Origem
{{campaign_name}}
Nome da campanha
Criação da campanha
{{brand_name}}
Nome da marca / workspace
Workspace
{{campaign_start_date}}
Data de início
Fase da campanha
{{campaign_end_date}}
Data de término
Fase da campanha
{{deliveries}}
Entregas (formatos e quantidades)
Fases da campanha
{{payment_value}}
Valor de remuneração
Remuneração da campanha
{{payment_type}}
Tipo de remuneração
Remuneração da campanha
{{briefing}}
Briefing da campanha
Etapa Briefing
{{image_rights_period}}
Período direito de imagem (meses)
Criação da campanha
{{contract_date}}
Data de geração do contrato
Sistema — momento do envio


Backend deve processar o arquivo (PDF/DOCX), localizar as tags {{variavel}} e fazer find-replace antes de criar o documento no DocuSign. Validar variáveis inválidas e alertar o usuário antes do envio.


7
Integração DocuSign — INPUTs e OUTPUTs


INPUT — O que enviamos ao DocuSign
Payload de criação do envelope — 4 assinantes com routingOrder
recipientId
routingOrder
Parte
email / name
"1"
1
Influenciador
E-mail do cadastro no app mobile
"2"
2
Representante da marca
Informado no modal (workspace_contract_defaults)
"3"
3
Testemunha 1
Informado no modal (workspace_contract_defaults)
"4"
4
Testemunha 2
Informado no modal (workspace_contract_defaults)





Campo DocuSign
Valor / Origem
emailSubject
"Contrato para participação na campanha [campaign_name]"
documents[].documentBase64
PDF após substituição de variáveis ou arquivo processado
documents[].name
"contrato-[influencer_name]-[campaign_name].pdf"
status
"sent" (envia imediatamente)
expirationDateTime
Data de expiração informada pelo usuário (ISO 8601, opcional)
eventNotification.url
URL do webhook do backend Hype App
eventNotification.envelopeEvents[]
sent, delivered, completed, declined, voided


OUTPUT — Webhook DocuSign → Hype App

Figura 5 — Fluxo do envelope: Hype App cria → DocuSign envia → webhook notifica → status atualizado

Eventos de webhook e ações correspondentes no Hype App
Evento DocuSign
Ação no Hype App
envelopeId (resposta)
Armazenar em campaign_contracts.docusign_envelope_id
sent
Atualizar status para sent
delivered
Atualizar status para viewed
completed
Atualizar status para signed — mover influenciador para approved no kanban
declined
Atualizar status para rejected — registrar rejection_reason
voided / expirado
Atualizar status para expired





SEGURANÇA: endpoint de webhook autenticado via HMAC secret (DocuSign Connect). Requisições não autenticadas retornam 401. Usar account-d.docusign.com para desenvolvimento.


8
Status de Contrato × Kanban



Figura 6 — Mapa de status: cada evento DocuSign reflete no painel com a ação correspondente no kanban

Status
Exibição
Cor
Efeito no kanban
pending
Pendente de envio
Cinza
contract_pending (sem ação)
sent
Enviado
Azul
contract_pending
viewed
Visualizado
Âmbar
contract_pending
signed
Assinado
Verde
→ avança para approved
rejected
Rejeitado
Vermelho
Mantém em contract_pending
expired
Expirado
Laranja
Mantém em contract_pending


Somente quando status = signed (completed no DocuSign) o influenciador avança automaticamente de contract_pending para approved no kanban.


9
Endpoints de Backend


Endpoints existentes — ajustes necessários
Método
Rota
Ajuste
GET
/campaigns/:id/contracts
Incluir contract_type, docusign_envelope_id. Retornar influenciadores contract_pending sem contrato como entradas pending.
POST
/campaigns/:id/contracts/send
Adicionar contract_type e file (multipart). Integrar com DocuSign. Receber representative_email, witness_1_email, witness_2_email. Quando contract_type=platform: receber também brand_legal_name, brand_cnpj, brand_address, representative_name, representative_cpf.
POST
/campaigns/:id/contracts/:cid/resend
Reenviar envelope existente (PUT /envelopes/:id com resendEnvelope=true).


Novos endpoints
Método
Rota
Descrição
POST
/webhooks/docusign
Recebe eventos DocuSign Connect. Valida HMAC, atualiza status e kanban.
POST
/campaigns/:id/contracts/upload
Upload de arquivo com substituição de variáveis.
GET
/campaigns/:id/contracts/:cid/download
Retorna PDF assinado (GET /envelopes/:id/documents/combined).
GET
/contracts/variables
Lista variáveis disponíveis para o frontend.
GET
/workspaces/:id/contract-defaults
Retorna representative_email, witness_1_email, witness_2_email + dados da marca (brand_legal_name, brand_cnpj, brand_address, representative_name, representative_cpf).
PUT
/workspaces/:id/contract-defaults
Upsert dos 3 e-mails padrão. Chamado após envio bem-sucedido.


Novos campos em campaign_contracts
Campo
Tipo
Descrição
contract_type
enum
"platform" ou "custom"
docusign_envelope_id
string
ID do envelope no DocuSign
docusign_envelope_uri
string
URI para consulta
representative_email
string
E-mail do representante neste envio (rastreabilidade)
witness_1_email
string
E-mail testemunha 1 neste envio (rastreabilidade)
witness_2_email
string
E-mail testemunha 2 neste envio (rastreabilidade)
original_file_path
string
Arquivo original (upload próprio)
processed_file_path
string
PDF processado com variáveis substituídas


10
Lógica de Pré-Salvamento de E-mails



Figura 7 — Dados salvos por workspace: e-mails + dados da marca preenchidos manualmente no 1º uso, pré-preenchidos nos seguintes

Todos os 6 campos de dados da marca (razão social, CNPJ, endereço, nome, CPF e e-mail do responsável) também são pré-salvos junto com os e-mails das testemunhas em workspace_contract_defaults.


• 1º envio: campos de dados da marca e e-mails de signatários aparecem vazios — são obrigatórios
• Após envio bem-sucedido ao DocuSign, backend faz upsert em workspace_contract_defaults
• A partir do 2º envio os campos aparecem pré-preenchidos e editáveis
• Se o usuário alterar um e-mail antes de confirmar, o novo valor sobrescreve o salvo
• Atualização dos defaults ocorre somente após envio bem-sucedido — não ao salvar rascunho
• E-mails e dados da marca salvos por workspace — qualquer membro vê os mesmos defaults em envios futuros

11
Ajustes no Frontend



Frontend


contracts-tab.tsx — alterações
• Adicionar coluna "Tipo de contrato" na tabela
• Exibir influenciadores contract_pending sem contrato como linhas pending com botão "Enviar agora"
• No modal: adicionar radio group "Contrato padrão / Upload próprio"
• Exibir painel de variáveis quando "Upload próprio" for selecionado
• Adicionar drag-and-drop de arquivo (.pdf e .docx)
• Campos de e-mail: representante + testemunha 1 + testemunha 2 (pré-preenchidos com defaults do workspace)
• E-mail do influenciador NÃO deve ser exibido ao usuário em nenhum campo do modal
• Ação "Baixar contrato" disponível quando status = signed



Frontend


shared/types.ts — CampaignContract
• Adicionar: contract_type: "platform" | "custom"
• Adicionar: docusign_envelope_id?: string
• Adicionar: representative_email?: string | witness_1_email?: string | witness_2_email?: string
• Novo tipo: WorkspaceContractDefaults { representative_email, witness_1_email, witness_2_email, brand_legal_name, brand_cnpj, brand_address, representative_name, representative_cpf }



Frontend


contract.ts (serviço) — alterações
• sendContractTemplate: suporte a FormData quando contract_type = "custom"
• sendContractTemplate: incluir representative_email, witness_1_email, witness_2_email no body
• Nova função: downloadSignedContract(campaignId, contractId)
• Nova função: getContractVariables()
• Nova função: getWorkspaceContractDefaults(workspaceId)



Frontend


hooks/use-campaign-contracts.ts — novos hooks
• useContractVariables() — busca e cacheia a lista de variáveis
• useDownloadContract() — baixa o PDF assinado
• useWorkspaceContractDefaults() — carrega e-mails padrão para pré-preencher o modal



12
Pontos de Atenção e Decisões Pendentes


#
Ponto
Sugestão
1
O que acontece com o influenciador quando o contrato é rejeitado no DocuSign?
Manter em contract_pending e notificar o usuário para reenviar.
2
Envio sequencial ou simultâneo das assinaturas?
Simultâneo
3
CPF, dados bancários disponíveis no cadastro do app mobile?
Confirmar com time de produto quais campos são obrigatórios no onboarding.
4
O contrato padrão da plataforma já existe como template?
Definir com time jurídico e cadastrar no DocuSign (Templates API).
5
Ambiente DocuSign durante desenvolvimento?
Usar conta demo account-d.docusign.com para dev e homologação.
6
Validação de variáveis inválidas no upload: alertar ou bloquear?
Alertar com toast mas não bloquear — campos podem ser opcionais.


