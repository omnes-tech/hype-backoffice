# População da aba **Métricas e conteúdos**

Este documento descreve **de onde vêm os dados hoje**, **o que está fixo/mock** e **o que a API/backend precisa expor** para a tela refletir métricas reais.

---

## Onde a tela é montada

- Rota: `campaigns.$campaignId` → aba `metrics`.
- Componente: `src/components/campaign-tabs/metrics-tab.tsx`.
- Props atuais (em `campaigns.$campaignId.tsx`):
  - `contents` — lista normalizada do **GET `/campaigns/{id}/dashboard`** (via `useCampaignDashboard`).
  - `campaignPhases` — fases da campanha (detalhe da campanha ou fallback do dashboard).
  - `identifiedPosts` — **GET** rota usada em `getIdentifiedPosts` (`/campaigns/{id}/metrics/identified-posts`).
  - **`metrics` — hoje é sempre `{}`**. Por isso totais por conteúdo, Top 4 e cards de conteúdo aparecem com **0 ou “—”** para views/likes/comentários/engajamento, mesmo com conteúdos publicados listados.

**Ação prioritária no front:** passar um mapa `{ [contentId]: ContentMetrics }` preenchido (ver abaixo). Enquanto for `{}`, a maior parte das métricas agregadas continuará vazia.

---

## Modelo esperado: `ContentMetrics`

Definido em `src/shared/types.ts`:

| Campo         | Uso na aba                                              |
|---------------|---------------------------------------------------------|
| `contentId`   | Chave no mapa `metrics`                                 |
| `views`       | Visualizações totais, Alcance/Visu, gráfico por dia     |
| `likes`       | Curtidas totais, interações no tooltip do gráfico       |
| `comments`    | Comentários totais, interações no tooltip               |
| `shares`      | Modal de detalhe                                        |
| `engagement`  | Taxa (%) — média no Top 4 e série do gráfico de linha   |
| `reach`       | Modal de detalhe                                        |

---

## Seção a seção

### 1. Métricas totais (cards + filtros)

**O que já funciona só com dashboard**

- Lista de **redes** no filtro: derivada de `contents[].socialNetwork`.
- Lista de **fases**: `campaignPhases`.
- **Período** (Geral, Hoje, 7D, …): filtra conteúdos publicados por `publishedAt` / `published_at`.

**O que depende de `metrics`**

- **Visualizações / Curtidas / Comentários:** soma dos `ContentMetrics` dos conteúdos **publicados** que passam pelos filtros (rede, fase, período).
- **Gráfico “Engajamento” (linha por dia da semana):** para cada conteúdo publicado com métrica e data de publicação, o front acumula por **dia da semana** (Seg–Dom): `engagement`, `views`, `likes + comments` como interações.

**O que não vem da API hoje (mock no código)**

- **Gráfico de barras (faixa etária Instagram vs YouTube):** constantes `DEMO_*` em `metrics-tab.tsx`. Os textos “Maior público Instagram / YouTube” são calculados **só** a partir desses mocks.

**Backend sugerido**

- **Opção A — Incluir métricas no dashboard:** cada item de `contents` já traz `views`, `likes`, `comments`, `engagement`, `reach`, etc., e o front monta o mapa por `id`.
- **Opção B — Endpoint agregado:** ex.: `GET /campaigns/{id}/metrics/contents?phase_id=&network=&from=&to=` retornando lista `{ content_id, ...ContentMetrics }` ou um único objeto agregado + série temporal se quiserem substituir o agrupamento por dia no servidor.
- **Opção C — Reuso dos endpoints já esboçados** em `src/shared/services/metrics.ts`:
  - `GET /campaigns/{id}/contents/{contentId}/metrics` — útil, mas **N+1** se chamado para cada conteúdo; melhor expor **bulk** ou embutir no dashboard.
- **Demografia:** novo contrato, por exemplo:
  - `GET /campaigns/{id}/metrics/audience-by-age` com séries por rede (`instagram`, `youtube`, …) e faixas (`18-29`, `30-49`, …) em **percentual** ou contagem.

---

### 2. Cidades com melhor performance

**Estado atual:** lista e números são **placeholders** (`CITY_PLACEHOLDERS` + texto fixo “1,2k de engajamento”). Não há `city` em `CampaignContent` nem no `DashboardInfluencer` usado hoje.

**Backend sugerido**

- Agregação por cidade (ou região) para a campanha, por exemplo:
  - `GET /campaigns/{id}/metrics/top-cities?limit=5&order=engagement`
- Resposta mínima: `rank`, `city_name` (ou `region`), `engagement` (ou score) para ordenar e exibir.

**Opcional no front:** se o influenciador passar a ter `city`/`state` no dashboard, dá para um ranking aproximado até existir endpoint dedicado (com ressalvas de qualidade).

---

### 3. Top 4 influenciadores

**Fonte atual:** conteúdos com `status === "published"`, agrupados por `influencerId`, ordenados pela **soma de `views`** (das métricas por conteúdo).

**Dependências**

- Mesmo mapa `metrics[contentId]` preenchido.
- Avatares/nomes já vêm dos conteúdos normalizados (`transformDashboardContent`).

**Campos derivados**

- **Post `1/N`:** hoje `N` = quantidade de conteúdos publicados daquele influenciador na campanha (o “1” é placeholder de entrega; pode evoluir para “entregues/total contratado” se a API enviar meta por influenciador/fase).

**Botão Performance**

- Ainda sem rota/ação; pode ligar a um modal ou página de detalhe quando existir endpoint (ex. métricas do influenciador na campanha — já há esboço em `getInfluencerMetrics`).

---

### 4. Conteúdos publicados

**Fonte:** `contents` filtrados por `status === "published"` (até 8 itens na lista).

**Necessário da API (já parcialmente no dashboard)**

- `previewUrl` / `preview_url`, `postUrl` / `post_url`, `publishedAt`, `phase` ou `phase_id`, `influencerName`, `influencerAvatar`, `socialNetwork`.

**Métricas nos cards**

- Curtidas e Alcance/Visu: vêm de `metrics[content.id]` — de novo, exige mapa preenchido.

---

### 5. Publicações identificadas

**Fonte:** `useIdentifiedPosts` → `getIdentifiedPosts` (`/campaigns/{id}/metrics/identified-posts`).

**Para ficar completo**

- Itens com `previewUrl`, `postUrl`, `publishedAt`, `phaseHashtag`, `metrics` opcional (`IdentifiedPost.metrics`), conforme `src/shared/types.ts`.

---

## Endpoints já referenciados no código (não necessariamente ligados à aba)

| Método / caminho (serviço) | Função no front        | Uso na aba hoje      |
|----------------------------|------------------------|----------------------|
| `GET .../dashboard`        | Conteúdos, fases, etc. | Sim                  |
| `GET .../metrics/identified-posts` | Posts identificados | Sim          |
| `GET .../metrics`          | `getCampaignMetrics`   | Não usado na tab     |
| `GET .../metrics/influencers` | `getInfluencerMetrics` | Não usado na tab  |
| `GET .../contents/:id/metrics` | `getContentMetrics` | Não usado na tab     |

Integrar **métricas por conteúdo** (bulk ou no dashboard) e, se desejado, **campanha agregada** / **influenciadores** reduz chamadas e duplica lógica.

---

## Checklist rápido (backend + front)

1. **Garantir** que cada conteúdo publicado tenha **métricas** acessíveis (no payload do dashboard ou endpoint bulk).
2. **No front:** construir `metrics` e passar para `<MetricsTab metrics={...} />` (substituir `{}`).
3. **Demografia:** definir contrato e trocar `DemographicsBarChart` + textos “Maior público …” para dados reais.
4. **Cidades:** definir endpoint ou campos de localização + agregação; remover placeholders.
5. **Performance (Top 4):** definir UX + endpoint (pode alinhar com `metrics/influencers`).
6. **Ver mais** (Top 4 / Conteúdos): hoje sem ação; pode abrir lista paginada ou nova rota quando existir API de listagem estendida.

---

## Referências de arquivo

- `src/components/campaign-tabs/metrics-tab.tsx` — UI, agregações e mocks.
- `src/screens/(private)/(app)/campaigns.$campaignId.tsx` — props da tab (`metrics={{}}`).
- `src/shared/services/metrics.ts` — chamadas HTTP de métricas.
- `src/shared/services/dashboard.ts` — `transformDashboardContent`, tipos do dashboard.
- `src/shared/types.ts` — `ContentMetrics`, `IdentifiedPost`, `CampaignContent`.
