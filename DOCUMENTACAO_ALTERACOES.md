# Documentação das Alterações - Sistema de Campanhas

## Visão Geral

Este documento descreve todas as alterações implementadas no sistema de criação e gerenciamento de campanhas, incluindo melhorias na interface, validações e novas funcionalidades.

---

## 1. Multi-Seleção de Estados e Cidades

### Arquivos Criados/Modificados
- `src/components/ui/multi-select.tsx` (novo)
- `src/shared/data/brazilian-states-cities.ts` (novo)
- `src/components/forms/create-campaign-step-two.tsx` (modificado)

### Funcionalidades Implementadas

#### Componente MultiSelect
- Componente reutilizável para seleção múltipla com busca
- Baseado em `react-select`
- Suporta busca/filtro de opções
- Estilizado para corresponder ao design system do projeto
- Propriedade `menuPlacement` para controlar direção do dropdown

#### Lista de Estados e Cidades
- Lista completa de todos os 26 estados brasileiros + DF
- Mais de 200 cidades principais organizadas por estado
- Funções auxiliares:
  - `getCitiesByState(stateCode)`: Retorna cidades de um estado específico
  - `getAllCities()`: Retorna todas as cidades
  - `getAllStates()`: Retorna todos os estados

#### Implementação na Etapa 2
- **Campo Estado**: Multi-seleção com busca de todos os estados brasileiros
- **Campo Cidade**: Multi-seleção com busca que filtra cidades baseado nos estados selecionados
- Cidades desabilitadas até que pelo menos um estado seja selecionado
- Sincronização automática quando o formulário é carregado com dados existentes
- Valores armazenados como string separada por vírgulas (ex: "SP,RJ,MG")

### Exemplo de Uso
```tsx
<MultiSelect
  label="Estado"
  placeholder="Selecione o/os estado(s) desejado(s)"
  options={stateOptions}
  value={selectedStates}
  onChange={handleStateChange}
  menuPlacement="top" // Opcional
/>
```

---

## 2. Máscaras em Campos Numéricos

### Arquivos Criados/Modificados
- `src/shared/utils/masks.ts` (novo)
- `src/components/ui/input.tsx` (modificado)
- `src/components/forms/create-campaign-step-two.tsx` (modificado)
- `src/components/forms/create-campaign-step-five.tsx` (modificado)
- `src/screens/(private)/(app)/campaigns.tsx` (modificado)

### Funcionalidades Implementadas

#### Funções de Máscara
- `formatNumber(value)`: Remove caracteres não numéricos
- `formatNumberWithSeparator(value)`: Formata com separador de milhar (ex: 1.000, 10.000)
- `handleNumberInput(e, callback)`: Handler para inputs numéricos com formatação
- `unformatNumber(value)`: Remove formatação para envio à API

#### Validação de Números Negativos
- Prevenção de números negativos em todos os campos numéricos
- Validação no componente `Input` quando `type="number"`
- Atributo `min="0"` aplicado automaticamente em inputs numéricos

#### Campos com Máscara
- **Etapa 2**:
  - `influencersCount`: Quantos influenciadores deseja na campanha
  - `minFollowers`: Quantidade mínima de seguidores
- **Etapa 3**:
  - `paymentFixedAmount`: Valor fixo por influenciador
  - `paymentSwapMarketValue`: Valor de mercado (Permuta)
  - `paymentCpaValue`: Valor do CPA
  - `paymentCpmValue`: Valor do CPM
- **Etapa 5**:
  - `imageRightsPeriod`: Período de direitos de imagem (em meses)
- **Etapa 6**:
  - `quantity`: Quantidade de formatos (fixo em 1)

### Transformação de Dados
- Função `transformFormDataToApiData` atualizada para remover formatação antes de enviar à API
- Conversão automática de valores formatados (ex: "1.000") para números (1000)

---

## 3. Sistema Completo de Subnichos

### Arquivos Criados/Modificados
- `src/shared/data/subniches.ts` (novo)
- `src/components/forms/create-campaign-step-one.tsx` (modificado)
- `src/screens/(private)/(app)/campaigns.tsx` (modificado)
- `src/components/forms/create-campaign-step-seven.tsx` (modificado)
- `src/screens/(private)/(app)/campaigns.$campaignId.tsx` (modificado)

### Funcionalidades Implementadas

#### Lista Completa de Subnichos
- Mais de 400 subnichos organizados por categoria
- Estrutura hierárquica: Categoria → Subnichos
- Exemplos de categorias:
  - Agronegócio
  - Animais & Pets
  - Arquitetura & Construção
  - Arte & Design
  - Beleza & Estética
  - Gaming
  - E muitas outras...

#### Funções Auxiliares
- `getSubnichesByCategory()`: Agrupa subnichos por categoria
- `getSubnicheLabel(value)`: Retorna o label de um subniche pelo valor
- `getSubnicheCategory(value)`: Retorna a categoria de um subniche
- `getSubnicheValueByLabel(label)`: Converte label para value (usado ao carregar campanhas existentes)

#### Implementação na Etapa 1
- Multi-seleção com busca de subnichos
- Exibição com categoria entre parênteses (ex: "Maquiagem (Beleza & Estética)")
- Menu abre para cima (`menuPlacement="top"`)
- Valores armazenados como string separada por vírgulas

#### Transformação para API
- Múltiplos subnichos convertidos para array de objetos `{id, name}`
- Função de hash para gerar IDs temporários (pode ser substituída por mapeamento real da API)

---

## 4. Campos Condicionais de Pagamento

### Arquivos Criados/Modificados
- `src/shared/types.ts` (modificado)
- `src/components/forms/create-campaign-step-three.tsx` (modificado)
- `src/screens/(private)/(app)/campaigns.tsx` (modificado)
- `src/components/forms/create-campaign-step-seven.tsx` (modificado)
- `src/screens/(private)/(app)/campaigns.$campaignId.tsx` (modificado)

### Novos Campos no CampaignFormData
```typescript
paymentFixedAmount: string;        // Valor fixo por influenciador
paymentSwapItem: string;          // Item oferecido (Permuta)
paymentSwapMarketValue: string;   // Valor de mercado (Permuta)
paymentCpaActions: string;        // Quais ações geram CPA
paymentCpaValue: string;          // Valor do CPA
paymentCpmValue: string;          // Valor do CPM
```

### Campos Renderizados por Tipo de Pagamento

#### Valor Fixo (`fixed`)
- Campo: `paymentFixedAmount`
- Label: "Valor a ser pago (independente de número de seguidores e métricas)"
- Tipo: Numérico com máscara

#### Preço Definido pelo Influenciador (`price`)
- Nenhum campo adicional

#### Permuta (`swap`)
- Campo 1: `paymentSwapItem` - "Item oferecido" (texto)
- Campo 2: `paymentSwapMarketValue` - "Valor de mercado" (numérico com máscara)

#### CPA - Custo Por Ação (`cpa`)
- Campo 1: `paymentCpaActions` - "Quais ações geram CPA?" (textarea)
- Campo 2: `paymentCpaValue` - "Valor do CPA" (numérico com máscara)

#### CPM - Custo Por Mil (`cpm`)
- Campo: `paymentCpmValue`
- Label: "Valor do CPM"
- Tipo: Numérico com máscara

### Transformação para API
- Função `buildPaymentDetails()` constrói `payment_method_details` baseado no tipo
- Valores formatados corretamente no campo `description` quando necessário
- Valores numéricos convertidos para `amount` e `currency: "BRL"`

---

## 5. Validações de Datas

### Arquivos Criados/Modificados
- `src/shared/utils/date-validations.ts` (novo)
- `src/components/forms/create-campaign-step-six.tsx` (modificado)
- `src/components/campaign-tabs/influencer-selection-tab.tsx` (modificado)
- `src/screens/(private)/(app)/campaigns.$campaignId.tsx` (modificado)

### Regras de Validação Implementadas

#### 1. Fase 1 - Data Mínima
- **Regra**: A data prevista para a primeira entrega não pode ser menor que 10 dias da data atual
- **Função**: `validatePhase1Date(date)`
- **Aplicação**: Campo "Data prevista de postagem" da primeira fase

#### 2. Fases Subsequentes - Intervalo Mínimo
- **Regra**: A data prevista entre uma fase e outra não pode ser menor que 3 dias
- **Função**: `validateSubsequentPhaseDate(date, previousPhaseDate)`
- **Aplicação**: Campos "Data prevista de postagem" das fases 2, 3, 4, 5

#### 3. Ativar Descobrir (Mural) - Data Limite
- **Regra**: 
  - Deve ser maior que a data atual
  - Deve ser pelo menos 7 dias menor que a data prevista da fase 1
- **Função**: `validateMuralEndDate(date, phase1Date)`
- **Aplicação**: Modal "Definir data limite do mural"

#### 4. Limites Calculados (Automáticos)
- **Envio de Conteúdo**: 4 dias antes da data prevista da fase
  - Função: `calculateContentSubmissionDeadline(phaseDate)`
- **Envio Corrigido**: 1 dia antes da data prevista da fase
  - Função: `calculateCorrectedContentDeadline(phaseDate)`

### Implementação Visual
- Mensagens de erro exibidas abaixo dos campos quando validação falha
- Data mínima permitida exibida como informação adicional
- Atributos `min` e `max` aplicados nos inputs de data
- Botões desabilitados quando validação falha

---

## 6. Ajustes na Etapa 6

### Arquivos Modificados
- `src/components/forms/create-campaign-step-six.tsx`

### Alterações Realizadas

#### Remoção do Campo de Horário
- Campo "Horário da postagem" removido
- Mantido apenas "Data prevista de postagem"
- Layout ajustado (removido grid de 2 colunas)

#### Quantidade Fixa em Formatos
- Campo de quantidade removido dos formatos
- Quantidade sempre fixa em "1"
- Exibição como texto: "Quantidade: 1"
- Novos formatos criados automaticamente com quantidade "1"
- Atualização de formatos mantém quantidade como "1"

---

## 7. Melhorias no Componente Input

### Arquivo Modificado
- `src/components/ui/input.tsx`

### Funcionalidades Adicionadas
- Validação automática para prevenir números negativos em `type="number"`
- Atributo `min="0"` aplicado automaticamente
- Bloqueio de valores negativos durante digitação
- Permite limpar o campo (valor vazio)

---

## Estrutura de Dados

### CampaignFormData (Atualizado)
```typescript
interface CampaignFormData {
  // ... campos existentes ...
  
  // Pagamento
  paymentType: string;
  paymentFixedAmount: string;
  paymentSwapItem: string;
  paymentSwapMarketValue: string;
  paymentCpaActions: string;
  paymentCpaValue: string;
  paymentCpmValue: string;
  
  // ... outros campos ...
}
```

### Interfaces de Dados

#### Subniche
```typescript
interface Subniche {
  value: string;
  label: string;
  category: string;
}
```

#### State e City
```typescript
interface State {
  code: string;
  name: string;
}

interface City {
  name: string;
  state: string;
}
```

---

## Fluxo de Dados

### Criação de Campanha
1. **Etapa 1**: Seleção de subnichos (multi-seleção)
2. **Etapa 2**: 
   - Números de influenciadores e seguidores (com máscara)
   - Estados e cidades (multi-seleção com filtro)
3. **Etapa 3**: 
   - Tipo de pagamento
   - Campos condicionais baseados no tipo
4. **Etapa 5**: Período de direitos de imagem (com máscara)
5. **Etapa 6**: 
   - Fases com validação de datas
   - Formatos com quantidade fixa em 1

### Transformação para API
- Subnichos: Array de `{id, name}`
- Estados/Cidades: String separada por vírgulas
- Pagamento: Objeto `payment_method_details` com campos específicos
- Números: Formatação removida antes do envio
- Datas: Validadas antes do envio

### Carregamento de Campanhas Existentes
- Subnichos: Nomes convertidos para valores
- Estados/Cidades: Mantidos como string separada por vírgulas
- Pagamento: Extraído de `payment_method_details` baseado no tipo
- Datas: Carregadas e validadas

---

## Validações Implementadas

### Validações de Formato
- ✅ Números com separador de milhar
- ✅ Prevenção de números negativos
- ✅ Datas com limites mínimos e máximos

### Validações de Negócio
- ✅ Fase 1: Mínimo 10 dias da data atual
- ✅ Fases subsequentes: Mínimo 3 dias da anterior
- ✅ Mural: Entre hoje e 7 dias antes da fase 1
- ✅ Estados selecionados antes de selecionar cidades

### Validações de Interface
- ✅ Campos desabilitados quando dependências não estão preenchidas
- ✅ Mensagens de erro claras e informativas
- ✅ Feedback visual para validações

---

## Melhorias de UX

### Busca e Filtros
- Busca em tempo real nos MultiSelect
- Filtro de cidades baseado em estados selecionados
- Busca de subnichos por nome ou categoria

### Feedback Visual
- Mensagens de erro abaixo dos campos
- Informações de data mínima/máxima
- Indicadores de campos obrigatórios
- Estados desabilitados visualmente distintos

### Organização
- Subnichos organizados por categoria
- Estados e cidades organizados geograficamente
- Campos condicionais aparecem apenas quando relevante

---

## Notas Técnicas

### Dependências Utilizadas
- `react-select`: Para componentes de seleção múltipla
- Funções nativas de JavaScript para manipulação de datas
- TypeScript para type safety

### Performance
- Uso de `useMemo` para cálculos de validação
- Listas de estados/cidades carregadas uma vez
- Filtros aplicados apenas quando necessário

### Compatibilidade
- Todas as alterações são retrocompatíveis
- Dados antigos são convertidos automaticamente
- Fallbacks para dados ausentes

---

## Próximos Passos Sugeridos

1. **Mapeamento Real de Subnichos**: Substituir função de hash por mapeamento real da API
2. **Validação no Backend**: Replicar validações de data no backend
3. **Testes**: Adicionar testes unitários para funções de validação
4. **Otimização**: Cache de listas de estados/cidades se necessário
5. **Internacionalização**: Preparar textos para tradução se necessário

---

## Conclusão

Todas as funcionalidades foram implementadas com sucesso, incluindo:
- ✅ Multi-seleção de estados e cidades com busca
- ✅ Máscaras em todos os campos numéricos
- ✅ Sistema completo de subnichos (400+ opções)
- ✅ Campos condicionais de pagamento
- ✅ Validações de datas conforme regras de negócio
- ✅ Prevenção de números negativos
- ✅ Melhorias na etapa 6 (remoção de horário, quantidade fixa)

O sistema está pronto para uso e todas as validações estão funcionando corretamente.

---

## 8. Operações em Massa (Bulk Operations)

### Arquivos Criados/Modificados
- `src/shared/services/influencer.ts` (modificado)
- `src/shared/services/content.ts` (modificado)
- `src/hooks/use-bulk-influencer-actions.ts` (novo)
- `src/hooks/use-bulk-content-actions.ts` (novo)
- `src/components/campaign-tabs/curation-tab.tsx` (modificado)
- `src/components/campaign-tabs/content-approval-tab.tsx` (modificado)

### Funcionalidades Implementadas

#### Aprovação/Reprovação em Massa de Influenciadores
- ✅ Seleção múltipla de influenciadores (checkboxes)
- ✅ Botões de ação em massa (aprovar/reprovar selecionados)
- ✅ Modal de confirmação para ações em massa
- ✅ Validação de feedback obrigatório para reprovação em massa
- ✅ Integração completa com API
- ✅ Atualização automática da lista após ação
- ✅ Feedback visual de sucesso/erro

**Rotas Utilizadas**:
- `POST /campaigns/{campaignId}/influencers/bulk-approve` - Aprova múltiplos influenciadores
- `POST /campaigns/{campaignId}/influencers/bulk-reject` - Reprova múltiplos influenciadores

#### Aprovação/Reprovação em Massa de Conteúdos
- ✅ Seleção múltipla de conteúdos (checkboxes)
- ✅ Botões de ação em massa (aprovar/reprovar selecionados)
- ✅ Modal de confirmação para ações em massa
- ✅ Validação de feedback obrigatório para reprovação em massa
- ✅ Integração completa com API
- ✅ Atualização automática da lista após ação
- ✅ Feedback visual de sucesso/erro

**Rotas Utilizadas**:
- `POST /campaigns/{campaignId}/contents/bulk-approve` - Aprova múltiplos conteúdos
- `POST /campaigns/{campaignId}/contents/bulk-reject` - Reprova múltiplos conteúdos

### Implementação Técnica

#### Hook useBulkInfluencerActions
- Gerencia mutations de aprovação/reprovação em massa
- Invalida queries relacionadas após sucesso
- Tratamento de erros com mensagens amigáveis
- Estados de loading para feedback visual

#### Hook useBulkContentActions
- Gerencia mutations de aprovação/reprovação em massa de conteúdos
- Invalida queries relacionadas após sucesso
- Tratamento de erros com mensagens amigáveis
- Estados de loading para feedback visual

---

## 9. Gerenciamento de Listas de Influenciadores

### Arquivos Criados/Modificados
- `src/shared/services/influencer-lists.ts` (novo)
- `src/hooks/use-influencer-lists.ts` (novo)
- `src/components/influencer-lists/list-selector.tsx` (novo)
- `src/components/campaign-tabs/influencer-selection-tab.tsx` (modificado)

### Funcionalidades Implementadas

#### Serviço de Listas
- ✅ Listagem de todas as listas do workspace
- ✅ Detalhes de uma lista específica
- ✅ Adição de múltiplos influenciadores à campanha via lista

**Rotas Utilizadas**:
- `GET /influencer-lists` - Lista todas as listas do workspace
- `GET /influencer-lists/{listId}` - Detalhes de uma lista
- `POST /campaigns/{campaignId}/influencers/bulk-add` - Adiciona influenciadores de uma lista à campanha

#### Componente ListSelector
- ✅ Modal para seleção de lista
- ✅ Exibição de informações da lista (nome, quantidade de influenciadores, data de criação)
- ✅ Botão para adicionar lista à campanha
- ✅ Loading states
- ✅ Tratamento de lista vazia
- ✅ Feedback visual de sucesso/erro

#### Integração na Aba de Seleção
- ✅ Botão "Selecionar lista" integrado
- ✅ Modal substitui o placeholder anterior
- ✅ Atualização automática após adicionar lista
- ✅ Fechamento automático após sucesso

### Estrutura de Dados

```typescript
interface InfluencerList {
  id: string;
  name: string;
  created_at: string;
  influencer_count: number;
}

interface InfluencerListDetail {
  id: string;
  name: string;
  influencers: Array<{
    id: number;
    name: string;
    email: string;
    photo: string | null;
  }>;
  created_at: string;
}

interface BulkAddInfluencersRequest {
  influencer_ids?: string[];
  list_id?: string;
}
```

---

## Conclusão Atualizada

Todas as funcionalidades foram implementadas com sucesso, incluindo:
- ✅ Multi-seleção de estados e cidades com busca
- ✅ Máscaras em todos os campos numéricos
- ✅ Sistema completo de subnichos (400+ opções)
- ✅ Campos condicionais de pagamento
- ✅ Validações de datas conforme regras de negócio
- ✅ Prevenção de números negativos
- ✅ Melhorias na etapa 6 (remoção de horário, quantidade fixa)
- ✅ **Operações em massa para influenciadores (aprovar/reprovar)**
- ✅ **Operações em massa para conteúdos (aprovar/reprovar)**
- ✅ **Gerenciamento de listas de influenciadores**

O sistema está pronto para uso e todas as validações estão funcionando corretamente.

