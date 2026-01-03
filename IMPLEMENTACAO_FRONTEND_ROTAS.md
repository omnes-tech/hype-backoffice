# 🎯 Roteiro Completo de Implementação Front-End

**Última atualização:** 2026-01-03  
**Status Backend:** ✅ 100% Implementado  
**Objetivo:** Implementar todas as funcionalidades do backend no front-end

---

## 📑 Índice

1. [Visão Geral](#visão-geral)
2. [Estrutura de Arquivos](#estrutura-de-arquivos)
3. [Fase 1: Operações em Massa (Prioridade Alta)](#fase-1-operações-em-massa-prioridade-alta)
4. [Fase 2: Métricas e Status (Prioridade Média)](#fase-2-métricas-e-status-prioridade-média)
5. [Fase 3: Funcionalidades Avançadas (Prioridade Baixa)](#fase-3-funcionalidades-avançadas-prioridade-baixa)
6. [Checklist Completo](#checklist-completo)
7. [Exemplos de Código Completos](#exemplos-de-código-completos)

---

## Visão Geral

### Status das Rotas Backend

- ✅ **Total de rotas implementadas:** 80+
- ✅ **Rotas críticas:** 100% implementadas
- ✅ **Rotas de bulk operations:** 100% implementadas
- ✅ **Rotas de métricas:** 100% implementadas
- ✅ **Rotas de avaliação:** 100% implementadas

### Priorização de Implementação

1. **🔴 Prioridade Alta:** Operações em massa (bulk) - Bloqueiam produtividade
2. **🟡 Prioridade Média:** Métricas e status - Melhoram experiência
3. **🟢 Prioridade Baixa:** Funcionalidades avançadas - Nice to have

---

## Estrutura de Arquivos

### Serviços a Criar/Atualizar

```
src/shared/services/
├── influencer.ts          # ✅ Existe (adicionar bulk operations)
├── content.ts             # ✅ Existe (adicionar bulk operations)
├── influencer-lists.ts    # ❌ Criar (NOVO)
├── metrics.ts             # ⚠️ Criar ou atualizar
├── identified-posts.ts    # ❌ Criar (NOVO)
├── evaluation.ts          # ❌ Criar (NOVO)
└── status-transitions.ts  # ❌ Criar (NOVO)
```

### Hooks a Criar

```
src/hooks/
├── use-bulk-influencer-actions.ts  # ❌ Criar
├── use-bulk-content-actions.ts    # ❌ Criar
├── use-influencer-lists.ts        # ❌ Criar
├── use-detailed-metrics.ts        # ❌ Criar
├── use-status-summary.ts           # ❌ Criar
├── use-identified-posts.ts         # ❌ Criar
├── use-evaluation.ts               # ❌ Criar
└── use-status-transitions.ts       # ❌ Criar
```

### Componentes a Criar/Atualizar

```
src/components/
├── campaign-tabs/
│   ├── curation-tab.tsx           # ⚠️ Atualizar (adicionar bulk)
│   ├── content-approval-tab.tsx    # ⚠️ Atualizar (adicionar bulk)
│   ├── influencer-selection-tab.tsx # ⚠️ Atualizar (adicionar listas)
│   └── metrics-tab.tsx            # ⚠️ Atualizar (adicionar métricas detalhadas)
├── influencer-lists/
│   └── list-selector.tsx          # ❌ Criar
├── metrics/
│   ├── detailed-metrics.tsx       # ❌ Criar
│   └── metrics-charts.tsx         # ❌ Criar
├── influencer/
│   ├── status-summary.tsx         # ❌ Criar
│   ├── evaluation-form.tsx       # ❌ Criar
│   └── evaluation-display.tsx    # ❌ Criar
├── identified-posts/
│   └── posts-list.tsx            # ❌ Criar
└── phases/
    └── hashtag-input.tsx        # ❌ Criar
```

---

## Fase 1: Operações em Massa (Prioridade Alta)

**Tempo estimado:** 1-2 semanas  
**Impacto:** Alto - Melhora significativamente a produtividade

### 🔴 1.1. Bulk Approve/Reject Influencers

#### Passo 1: Criar/Atualizar Serviço

**Arquivo:** `src/shared/services/influencer.ts`

```typescript
import { api } from '@/shared/lib/api';

// ... funções existentes ...

/**
 * Aprova múltiplos influenciadores em massa
 */
export async function bulkApproveInfluencers(
  campaignId: string,
  influencerIds: string[],
  feedback?: string
): Promise<void> {
  const response = await api.post(
    `/backoffice/campaigns/${campaignId}/influencers/bulk-approve`,
    {
      influencer_ids: influencerIds,
      feedback,
    }
  );
  return response.data;
}

/**
 * Reprova múltiplos influenciadores em massa
 */
export async function bulkRejectInfluencers(
  campaignId: string,
  influencerIds: string[],
  feedback: string
): Promise<void> {
  const response = await api.post(
    `/backoffice/campaigns/${campaignId}/influencers/bulk-reject`,
    {
      influencer_ids: influencerIds,
      feedback,
    }
  );
  return response.data;
}
```

#### Passo 2: Criar Hook

**Arquivo:** `src/hooks/use-bulk-influencer-actions.ts`

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { bulkApproveInfluencers, bulkRejectInfluencers } from '@/shared/services/influencer';
import { toast } from 'sonner';

interface BulkInfluencerActionsParams {
  campaignId: string;
}

export function useBulkInfluencerActions({ campaignId }: BulkInfluencerActionsParams) {
  const queryClient = useQueryClient();

  const approveMutation = useMutation({
    mutationFn: ({ influencerIds, feedback }: { influencerIds: string[]; feedback?: string }) =>
      bulkApproveInfluencers(campaignId, influencerIds, feedback),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaign-users', campaignId] });
      queryClient.invalidateQueries({ queryKey: ['campaign-status-summary', campaignId] });
      toast.success('Influenciadores aprovados com sucesso');
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || 'Erro ao aprovar influenciadores';
      toast.error(message);
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ influencerIds, feedback }: { influencerIds: string[]; feedback: string }) =>
      bulkRejectInfluencers(campaignId, influencerIds, feedback),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaign-users', campaignId] });
      queryClient.invalidateQueries({ queryKey: ['campaign-status-summary', campaignId] });
      toast.success('Influenciadores reprovados com sucesso');
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || 'Erro ao reprovar influenciadores';
      toast.error(message);
    },
  });

  return {
    approve: approveMutation.mutate,
    reject: rejectMutation.mutate,
    isApproving: approveMutation.isPending,
    isRejecting: rejectMutation.isPending,
  };
}
```

#### Passo 3: Atualizar Componente

**Arquivo:** `src/components/campaign-tabs/curation-tab.tsx`

```typescript
import { useState } from 'react';
import { useBulkInfluencerActions } from '@/hooks/use-bulk-influencer-actions';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { RejectModal } from '@/components/modals/reject-modal';

interface CurationTabProps {
  campaignId: string;
  influencers: Influencer[];
}

export function CurationTab({ campaignId, influencers }: CurationTabProps) {
  const [selectedInfluencers, setSelectedInfluencers] = useState<string[]>([]);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const { approve, reject, isApproving, isRejecting } = useBulkInfluencerActions({ campaignId });

  const handleSelectAll = () => {
    if (selectedInfluencers.length === influencers.length) {
      setSelectedInfluencers([]);
    } else {
      setSelectedInfluencers(influencers.map((inf) => inf.id));
    }
  };

  const handleSelectInfluencer = (influencerId: string) => {
    setSelectedInfluencers((prev) =>
      prev.includes(influencerId)
        ? prev.filter((id) => id !== influencerId)
        : [...prev, influencerId]
    );
  };

  const handleBulkApprove = () => {
    approve({ influencerIds: selectedInfluencers });
    setSelectedInfluencers([]);
  };

  const handleBulkReject = (feedback: string) => {
    reject({ influencerIds: selectedInfluencers, feedback });
    setSelectedInfluencers([]);
    setShowRejectModal(false);
  };

  return (
    <div className="space-y-4">
      {/* Header com seleção */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Checkbox
            checked={selectedInfluencers.length === influencers.length}
            onCheckedChange={handleSelectAll}
          />
          <span className="text-sm text-muted-foreground">
            {selectedInfluencers.length > 0
              ? `${selectedInfluencers.length} selecionados`
              : 'Selecionar todos'}
          </span>
        </div>

        {selectedInfluencers.length > 0 && (
          <div className="flex gap-2">
            <Button
              onClick={handleBulkApprove}
              disabled={isApproving}
              variant="default"
            >
              Aprovar ({selectedInfluencers.length})
            </Button>
            <Button
              onClick={() => setShowRejectModal(true)}
              disabled={isRejecting}
              variant="destructive"
            >
              Reprovar ({selectedInfluencers.length})
            </Button>
          </div>
        )}
      </div>

      {/* Lista de influenciadores */}
      <div className="space-y-2">
        {influencers.map((influencer) => (
          <div
            key={influencer.id}
            className="flex items-center gap-2 p-4 border rounded-lg"
          >
            <Checkbox
              checked={selectedInfluencers.includes(influencer.id)}
              onCheckedChange={() => handleSelectInfluencer(influencer.id)}
            />
            {/* Conteúdo do card do influenciador */}
          </div>
        ))}
      </div>

      {/* Modal de rejeição */}
      <RejectModal
        open={showRejectModal}
        onClose={() => setShowRejectModal(false)}
        onConfirm={handleBulkReject}
        title="Reprovar Influenciadores"
        description={`Você está prestes a reprovar ${selectedInfluencers.length} influenciador(es).`}
      />
    </div>
  );
}
```

---

### 🔴 1.2. Bulk Approve/Reject Contents

#### Passo 1: Criar/Atualizar Serviço

**Arquivo:** `src/shared/services/content.ts`

```typescript
import { api } from '@/shared/lib/api';

// ... funções existentes ...

/**
 * Aprova múltiplos conteúdos em massa
 */
export async function bulkApproveContents(
  campaignId: string,
  contentIds: string[]
): Promise<void> {
  const response = await api.post(
    `/backoffice/campaigns/${campaignId}/contents/bulk-approve`,
    {
      content_ids: contentIds,
    }
  );
  return response.data;
}

/**
 * Reprova múltiplos conteúdos em massa
 */
export async function bulkRejectContents(
  campaignId: string,
  contentIds: string[],
  feedback: string
): Promise<void> {
  const response = await api.post(
    `/backoffice/campaigns/${campaignId}/contents/bulk-reject`,
    {
      content_ids: contentIds,
      feedback,
    }
  );
  return response.data;
}
```

#### Passo 2: Criar Hook

**Arquivo:** `src/hooks/use-bulk-content-actions.ts`

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { bulkApproveContents, bulkRejectContents } from '@/shared/services/content';
import { toast } from 'sonner';

interface BulkContentActionsParams {
  campaignId: string;
}

export function useBulkContentActions({ campaignId }: BulkContentActionsParams) {
  const queryClient = useQueryClient();

  const approveMutation = useMutation({
    mutationFn: (contentIds: string[]) =>
      bulkApproveContents(campaignId, contentIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaign-contents', campaignId] });
      toast.success('Conteúdos aprovados com sucesso');
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || 'Erro ao aprovar conteúdos';
      toast.error(message);
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ contentIds, feedback }: { contentIds: string[]; feedback: string }) =>
      bulkRejectContents(campaignId, contentIds, feedback),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaign-contents', campaignId] });
      toast.success('Conteúdos reprovados com sucesso');
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || 'Erro ao reprovar conteúdos';
      toast.error(message);
    },
  });

  return {
    approve: approveMutation.mutate,
    reject: rejectMutation.mutate,
    isApproving: approveMutation.isPending,
    isRejecting: rejectMutation.isPending,
  };
}
```

#### Passo 3: Atualizar Componente

**Arquivo:** `src/components/campaign-tabs/content-approval-tab.tsx`

```typescript
import { useState } from 'react';
import { useBulkContentActions } from '@/hooks/use-bulk-content-actions';
// ... resto similar ao curation-tab.tsx
```

---

### 🔴 1.3. Gerenciamento de Listas de Influenciadores

#### Passo 1: Criar Serviço

**Arquivo:** `src/shared/services/influencer-lists.ts` (NOVO)

```typescript
import { api } from '@/shared/lib/api';

export interface InfluencerList {
  id: string;
  name: string;
  created_at: string;
  influencer_count: number;
}

export interface InfluencerListDetail {
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

export interface BulkAddInfluencersRequest {
  influencer_ids?: string[];
  list_id?: string;
}

/**
 * Lista todas as listas de influenciadores do workspace
 */
export async function getInfluencerLists(): Promise<InfluencerList[]> {
  const response = await api.get('/backoffice/influencer-lists');
  return response.data.data;
}

/**
 * Obtém detalhes de uma lista específica
 */
export async function getInfluencerList(
  listId: string
): Promise<InfluencerListDetail> {
  const response = await api.get(`/backoffice/influencer-lists/${listId}`);
  return response.data.data;
}

/**
 * Adiciona múltiplos influenciadores à campanha (por IDs ou lista)
 */
export async function bulkAddInfluencersToCampaign(
  campaignId: string,
  data: BulkAddInfluencersRequest
): Promise<void> {
  const response = await api.post(
    `/backoffice/campaigns/${campaignId}/influencers/bulk-add`,
    data
  );
  return response.data;
}
```

#### Passo 2: Criar Hook

**Arquivo:** `src/hooks/use-influencer-lists.ts` (NOVO)

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getInfluencerLists,
  getInfluencerList,
  bulkAddInfluencersToCampaign,
  type BulkAddInfluencersRequest,
} from '@/shared/services/influencer-lists';
import { toast } from 'sonner';

export function useInfluencerLists() {
  return useQuery({
    queryKey: ['influencer-lists'],
    queryFn: getInfluencerLists,
  });
}

export function useInfluencerList(listId: string | null) {
  return useQuery({
    queryKey: ['influencer-list', listId],
    queryFn: () => getInfluencerList(listId!),
    enabled: !!listId,
  });
}

export function useBulkAddInfluencers(campaignId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: BulkAddInfluencersRequest) =>
      bulkAddInfluencersToCampaign(campaignId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaign-users', campaignId] });
      queryClient.invalidateQueries({ queryKey: ['campaign-status-summary', campaignId] });
      toast.success('Influenciadores adicionados com sucesso');
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || 'Erro ao adicionar influenciadores';
      toast.error(message);
    },
  });
}
```

#### Passo 3: Criar Componente de Seleção

**Arquivo:** `src/components/influencer-lists/list-selector.tsx` (NOVO)

```typescript
import { useState } from 'react';
import { useInfluencerLists, useBulkAddInfluencers } from '@/hooks/use-influencer-lists';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Loader2 } from 'lucide-react';

interface ListSelectorProps {
  campaignId: string;
  trigger?: React.ReactNode;
}

export function ListSelector({ campaignId, trigger }: ListSelectorProps) {
  const [open, setOpen] = useState(false);
  const { data: lists, isLoading } = useInfluencerLists();
  const { mutate: addInfluencers, isPending } = useBulkAddInfluencers(campaignId);

  const handleSelectList = (listId: string) => {
    addInfluencers({ list_id: listId }, {
      onSuccess: () => {
        setOpen(false);
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || <Button>Adicionar Lista</Button>}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Selecionar Lista de Influenciadores</DialogTitle>
          <DialogDescription>
            Escolha uma lista para adicionar todos os influenciadores à campanha
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : (
          <div className="space-y-2">
            {lists?.map((list) => (
              <div
                key={list.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent cursor-pointer"
                onClick={() => handleSelectList(list.id)}
              >
                <div>
                  <p className="font-medium">{list.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {list.influencer_count} influenciador(es)
                  </p>
                </div>
                <Button
                  size="sm"
                  disabled={isPending}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSelectList(list.id);
                  }}
                >
                  Adicionar
                </Button>
              </div>
            ))}

            {lists?.length === 0 && (
              <p className="text-center text-muted-foreground py-8">
                Nenhuma lista encontrada
              </p>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
```

#### Passo 4: Integrar no Componente de Seleção

**Arquivo:** `src/components/campaign-tabs/influencer-selection-tab.tsx`

```typescript
import { ListSelector } from '@/components/influencer-lists/list-selector';

export function InfluencerSelectionTab({ campaignId }: { campaignId: string }) {
  return (
    <div className="space-y-4">
      {/* Botão para adicionar lista */}
      <div className="flex justify-end">
        <ListSelector campaignId={campaignId} />
      </div>

      {/* Resto do componente */}
    </div>
  );
}
```

---

## Fase 2: Métricas e Status (Prioridade Média)

**Tempo estimado:** 2-3 semanas  
**Impacto:** Médio - Melhora análise e acompanhamento

### 🟡 2.1. Métricas Detalhadas

#### Passo 1: Criar/Atualizar Serviço

**Arquivo:** `src/shared/services/metrics.ts` (NOVO ou atualizar)

```typescript
import { api } from '@/shared/lib/api';

export interface DetailedMetricsFilters {
  phase_id?: string;
  start_date?: string;
  end_date?: string;
}

export interface DetailedMetricsResponse {
  overall: {
    total_influencers: number;
    approved_influencers: number;
    total_contents: number;
    published_contents: number;
    engagement_rate: number;
    reach: number;
  };
  by_phase: Array<{
    phase_id: string;
    phase_name: string;
    metrics: {
      influencers_count: number;
      contents_count: number;
      published_count: number;
      engagement_rate: number;
    };
  }>;
  by_influencer: Array<{
    influencer_id: string;
    influencer_name: string;
    contents_count: number;
    published_count: number;
    engagement_rate: number;
  }>;
  trends: Array<{
    date: string;
    metrics: {
      new_contents: number;
      new_published: number;
      engagement_rate: number;
    };
  }>;
}

export interface HistoricalMetricsResponse {
  date: string;
  metrics: {
    total_influencers: number;
    approved_influencers: number;
    total_contents: number;
    published_contents: number;
    engagement_rate: number;
  };
}[]

/**
 * Obtém métricas detalhadas com filtros
 */
export async function getDetailedMetrics(
  campaignId: string,
  filters?: DetailedMetricsFilters
): Promise<DetailedMetricsResponse> {
  const params = new URLSearchParams();
  if (filters?.phase_id) params.append('phase_id', filters.phase_id);
  if (filters?.start_date) params.append('start_date', filters.start_date);
  if (filters?.end_date) params.append('end_date', filters.end_date);

  const response = await api.get(
    `/backoffice/campaigns/${campaignId}/metrics/detailed?${params.toString()}`
  );
  return response.data.data;
}

/**
 * Obtém métricas históricas
 */
export async function getHistoricalMetrics(
  campaignId: string,
  days: number = 30
): Promise<HistoricalMetricsResponse> {
  const response = await api.get(
    `/backoffice/campaigns/${campaignId}/metrics/historical?days=${days}`
  );
  return response.data.data;
}
```

#### Passo 2: Criar Hook

**Arquivo:** `src/hooks/use-detailed-metrics.ts` (NOVO)

```typescript
import { useQuery } from '@tanstack/react-query';
import {
  getDetailedMetrics,
  getHistoricalMetrics,
  type DetailedMetricsFilters,
} from '@/shared/services/metrics';

export function useDetailedMetrics(
  campaignId: string,
  filters?: DetailedMetricsFilters
) {
  return useQuery({
    queryKey: ['campaign-detailed-metrics', campaignId, filters],
    queryFn: () => getDetailedMetrics(campaignId, filters),
  });
}

export function useHistoricalMetrics(
  campaignId: string,
  days: number = 30
) {
  return useQuery({
    queryKey: ['campaign-historical-metrics', campaignId, days],
    queryFn: () => getHistoricalMetrics(campaignId, days),
  });
}
```

#### Passo 3: Criar Componente

**Arquivo:** `src/components/metrics/detailed-metrics.tsx` (NOVO)

```typescript
import { useState } from 'react';
import { useDetailedMetrics } from '@/hooks/use-detailed-metrics';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface DetailedMetricsProps {
  campaignId: string;
}

export function DetailedMetrics({ campaignId }: DetailedMetricsProps) {
  const [filters, setFilters] = useState<DetailedMetricsFilters>({});
  const { data, isLoading } = useDetailedMetrics(campaignId, filters);

  // Implementar visualização de métricas
  // Gráficos, cards, tabelas, etc.
}
```

---

### 🟡 2.2. Status Summary

#### Passo 1: Adicionar ao Serviço

**Arquivo:** `src/shared/services/influencer.ts`

```typescript
export interface StatusSummaryResponse {
  inscriptions: number;
  curation: number;
  invited: number;
  approved_progress: number;
  awaiting_approval: number;
  in_correction: number;
  content_approved: number;
  published: number;
  rejected: number;
}

export async function getStatusSummary(
  campaignId: string
): Promise<StatusSummaryResponse> {
  const response = await api.get(
    `/backoffice/campaigns/${campaignId}/influencers/status-summary`
  );
  return response.data.data;
}
```

#### Passo 2: Criar Hook

**Arquivo:** `src/hooks/use-status-summary.ts` (NOVO)

```typescript
import { useQuery } from '@tanstack/react-query';
import { getStatusSummary } from '@/shared/services/influencer';

export function useStatusSummary(campaignId: string) {
  return useQuery({
    queryKey: ['campaign-status-summary', campaignId],
    queryFn: () => getStatusSummary(campaignId),
    refetchInterval: 30000, // Atualiza a cada 30 segundos
  });
}
```

#### Passo 3: Criar Componente

**Arquivo:** `src/components/influencer/status-summary.tsx` (NOVO)

```typescript
import { useStatusSummary } from '@/hooks/use-status-summary';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface StatusSummaryProps {
  campaignId: string;
}

export function StatusSummary({ campaignId }: StatusSummaryProps) {
  const { data, isLoading } = useStatusSummary(campaignId);

  if (isLoading) return <div>Carregando...</div>;

  return (
    <div className="grid grid-cols-3 gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Inscrições</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">{data?.inscriptions || 0}</p>
        </CardContent>
      </Card>
      {/* Repetir para outros status */}
    </div>
  );
}
```

---

### 🟡 2.3. Hashtag por Fase

#### Passo 1: Criar Serviço

**Arquivo:** `src/shared/services/identified-posts.ts` (NOVO)

```typescript
import { api } from '@/shared/lib/api';

export interface IdentifiedPost {
  id: string;
  post_url: string;
  influencer: {
    id: string;
    name: string;
  };
  social_network: string;
  identified_at: string;
  phase_id?: string;
}

/**
 * Define hashtag para uma fase
 */
export async function setPhaseHashtag(
  campaignId: string,
  phaseId: string,
  hashtag: string
): Promise<void> {
  const response = await api.post(
    `/backoffice/campaigns/${campaignId}/steps/${phaseId}/hashtag`,
    { hashtag }
  );
  return response.data;
}

/**
 * Obtém posts identificados em tempo real
 */
export async function getRealtimeIdentifiedPosts(
  campaignId: string,
  since?: string
): Promise<IdentifiedPost[]> {
  const params = new URLSearchParams();
  if (since) params.append('since', since);

  const response = await api.get(
    `/backoffice/campaigns/${campaignId}/identified-posts/realtime?${params.toString()}`
  );
  return response.data.data;
}
```

#### Passo 2: Criar Componente

**Arquivo:** `src/components/phases/hashtag-input.tsx` (NOVO)

```typescript
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { setPhaseHashtag } from '@/shared/services/identified-posts';
import { toast } from 'sonner';

interface HashtagInputProps {
  campaignId: string;
  phaseId: string;
  currentHashtag?: string;
  onSuccess?: () => void;
}

export function HashtagInput({
  campaignId,
  phaseId,
  currentHashtag,
  onSuccess,
}: HashtagInputProps) {
  const [hashtag, setHashtag] = useState(currentHashtag || '');
  const [isLoading, setIsLoading] = useState(false);

  const handleSave = async () => {
    if (!hashtag.trim()) {
      toast.error('Hashtag não pode estar vazia');
      return;
    }

    setIsLoading(true);
    try {
      await setPhaseHashtag(campaignId, phaseId, hashtag);
      toast.success('Hashtag definida com sucesso');
      onSuccess?.();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Erro ao definir hashtag');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex gap-2">
      <Input
        placeholder="#hashtag"
        value={hashtag}
        onChange={(e) => setHashtag(e.target.value)}
        disabled={isLoading}
      />
      <Button onClick={handleSave} disabled={isLoading}>
        Salvar
      </Button>
    </div>
  );
}
```

---

## Fase 3: Funcionalidades Avançadas (Prioridade Baixa)

**Tempo estimado:** 1-2 semanas  
**Impacto:** Baixo - Funcionalidades complementares

### 🟢 3.1. Sistema de Avaliação

#### Passo 1: Criar Serviço

**Arquivo:** `src/shared/services/evaluation.ts` (NOVO)

```typescript
import { api } from '@/shared/lib/api';

export interface CreateEvaluationRequest {
  rating: number; // 1-5
  feedback: string;
  performance: 'excellent' | 'good' | 'average' | 'poor';
  would_work_again: boolean;
}

export interface InfluencerEvaluation {
  id: string;
  rating: number;
  feedback: string;
  performance: string;
  would_work_again: boolean;
  created_at: string;
}

export async function createEvaluation(
  campaignId: string,
  influencerId: string,
  data: CreateEvaluationRequest
): Promise<void> {
  const response = await api.post(
    `/backoffice/campaigns/${campaignId}/influencers/${influencerId}/evaluation`,
    data
  );
  return response.data;
}

export async function getEvaluation(
  campaignId: string,
  influencerId: string
): Promise<InfluencerEvaluation | null> {
  try {
    const response = await api.get(
      `/backoffice/campaigns/${campaignId}/influencers/${influencerId}/evaluation`
    );
    return response.data.data;
  } catch (error: any) {
    if (error?.response?.status === 404) return null;
    throw error;
  }
}
```

#### Passo 2: Criar Hook

**Arquivo:** `src/hooks/use-evaluation.ts` (NOVO)

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  createEvaluation,
  getEvaluation,
  type CreateEvaluationRequest,
} from '@/shared/services/evaluation';
import { toast } from 'sonner';

export function useEvaluation(campaignId: string, influencerId: string) {
  return useQuery({
    queryKey: ['influencer-evaluation', campaignId, influencerId],
    queryFn: () => getEvaluation(campaignId, influencerId),
  });
}

export function useCreateEvaluation(campaignId: string, influencerId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateEvaluationRequest) =>
      createEvaluation(campaignId, influencerId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['influencer-evaluation', campaignId, influencerId],
      });
      toast.success('Avaliação criada com sucesso');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Erro ao criar avaliação');
    },
  });
}
```

---

### 🟢 3.2. Transições Automáticas

#### Passo 1: Criar Serviço

**Arquivo:** `src/shared/services/status-transitions.ts` (NOVO)

```typescript
import { api } from '@/shared/lib/api';

export interface StatusTransitionRule {
  from_status: string;
  to_status: string;
  trigger: string;
  conditions?: object;
}

export interface StatusTransitionsResponse {
  rules: StatusTransitionRule[];
}

export async function getStatusTransitions(
  campaignId: string
): Promise<StatusTransitionsResponse> {
  const response = await api.get(
    `/backoffice/campaigns/${campaignId}/status-transitions`
  );
  return response.data.data;
}
```

---

## Checklist Completo

### Fase 1 - Prioridade Alta

- [ ] **1.1. Bulk Approve/Reject Influencers**
  - [ ] Criar/atualizar `src/shared/services/influencer.ts`
  - [ ] Criar `src/hooks/use-bulk-influencer-actions.ts`
  - [ ] Atualizar `src/components/campaign-tabs/curation-tab.tsx`
  - [ ] Criar componente `RejectModal` se não existir
  - [ ] Testar seleção múltipla
  - [ ] Testar aprovação em massa
  - [ ] Testar rejeição em massa com feedback

- [ ] **1.2. Bulk Approve/Reject Contents**
  - [ ] Criar/atualizar `src/shared/services/content.ts`
  - [ ] Criar `src/hooks/use-bulk-content-actions.ts`
  - [ ] Atualizar `src/components/campaign-tabs/content-approval-tab.tsx`
  - [ ] Testar seleção múltipla
  - [ ] Testar aprovação em massa
  - [ ] Testar rejeição em massa com feedback

- [ ] **1.3. Influencer Lists**
  - [ ] Criar `src/shared/services/influencer-lists.ts`
  - [ ] Criar `src/hooks/use-influencer-lists.ts`
  - [ ] Criar `src/components/influencer-lists/list-selector.tsx`
  - [ ] Atualizar `src/components/campaign-tabs/influencer-selection-tab.tsx`
  - [ ] Testar listagem de listas
  - [ ] Testar aplicação de lista à campanha

### Fase 2 - Prioridade Média

- [ ] **2.1. Detailed Metrics**
  - [ ] Criar/atualizar `src/shared/services/metrics.ts`
  - [ ] Criar `src/hooks/use-detailed-metrics.ts`
  - [ ] Criar `src/components/metrics/detailed-metrics.tsx`
  - [ ] Criar `src/components/metrics/metrics-charts.tsx`
  - [ ] Implementar filtros por fase/data
  - [ ] Implementar visualizações (gráficos, tabelas)

- [ ] **2.2. Status Summary**
  - [ ] Adicionar função em `src/shared/services/influencer.ts`
  - [ ] Criar `src/hooks/use-status-summary.ts`
  - [ ] Criar `src/components/influencer/status-summary.tsx`
  - [ ] Integrar no dashboard da campanha
  - [ ] Implementar atualização automática

- [ ] **2.3. Hashtag e Posts Identificados**
  - [ ] Criar `src/shared/services/identified-posts.ts`
  - [ ] Criar `src/hooks/use-identified-posts.ts`
  - [ ] Criar `src/components/phases/hashtag-input.tsx`
  - [ ] Criar `src/components/identified-posts/posts-list.tsx`
  - [ ] Implementar polling/WebSocket
  - [ ] Integrar no componente de fases

### Fase 3 - Prioridade Baixa

- [ ] **3.1. Evaluation System**
  - [ ] Criar `src/shared/services/evaluation.ts`
  - [ ] Criar `src/hooks/use-evaluation.ts`
  - [ ] Criar `src/components/influencer/evaluation-form.tsx`
  - [ ] Criar `src/components/influencer/evaluation-display.tsx`
  - [ ] Integrar no card do influenciador

- [ ] **3.2. Status Transitions**
  - [ ] Criar `src/shared/services/status-transitions.ts`
  - [ ] Criar `src/hooks/use-status-transitions.ts`
  - [ ] Criar `src/components/kanban/transition-rules.tsx`
  - [ ] Exibir regras no dashboard

---

## Exemplos de Código Completos

### Exemplo 1: Modal de Rejeição

**Arquivo:** `src/components/modals/reject-modal.tsx`

```typescript
import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface RejectModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (feedback: string) => void;
  title: string;
  description: string;
}

export function RejectModal({
  open,
  onClose,
  onConfirm,
  title,
  description,
}: RejectModalProps) {
  const [feedback, setFeedback] = useState('');

  const handleConfirm = () => {
    if (!feedback.trim()) {
      return;
    }
    onConfirm(feedback);
    setFeedback('');
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="feedback">Feedback (obrigatório)</Label>
            <Textarea
              id="feedback"
              placeholder="Explique o motivo da rejeição..."
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              rows={4}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={!feedback.trim()}
          >
            Confirmar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

---

## Próximos Passos

### Semana 1-2: Fase 1 (Prioridade Alta)
1. Implementar bulk operations para influenciadores
2. Implementar bulk operations para conteúdos
3. Implementar gerenciamento de listas
4. Testes e ajustes

### Semana 3-5: Fase 2 (Prioridade Média)
5. Implementar métricas detalhadas
6. Implementar status summary
7. Implementar hashtag e posts identificados
8. Testes e ajustes

### Semana 6-7: Fase 3 (Prioridade Baixa)
9. Implementar sistema de avaliação
10. Implementar transições automáticas
11. Testes finais

---

**Documento completo para implementação front-end**  
**Última atualização:** 2026-01-03
