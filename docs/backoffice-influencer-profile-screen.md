# Servidor — tela **Sobre o influenciador** (backoffice)

Documento de referência para o backend: o que expor, em que formato e como manter a experiência **rápida e escalável**. Baseado em `influencer.$influencerId` e em `getInfluencerProfile` / `CampaignInfluencerProfileResponse`.

---

## 1. Visão geral

| Item | Detalhe |
|------|---------|
| **Tela** | `src/screens/(private)/(app)/influencer.$influencerId.tsx` |
| **Rota no browser** | `/influencer/:influencerId` (links antigos `/campaigns/:campaignId/influencer/:id` redirecionam para cá) |
| **Chamada atual** | **Uma única** `GET` por abertura da página |
| **URL (API)** | `GET {VITE_SERVER_URL}/influencers/:influencerId/profile` |
| **Headers** | Igual às demais rotas backoffice: `Authorization`, `Workspace-Id`, `Client-Type: backoffice`, `Accept: application/json` |
| **Corpo de sucesso** | `{ "data": <CampaignInfluencerProfileResponse> }` |
| **404** | Influenciador inexistente, fora do workspace, ou id não resolvível |

### Identificadores

- **`:influencerId`** — O mesmo valor que o front envia ao abrir “Ver perfil” a partir das abas da campanha: em vários fluxos é **id do `campaign_user`** ou **user id da plataforma** (ex.: gerenciamento). O backend deve aceitar o contrato único acordado com o produto (ou mapear os ids suportados para o mesmo payload).

---

## 2. Contrato da resposta (`data`)

Estrutura alinhada a `src/shared/services/influencer.ts` (`CampaignInfluencerProfileResponse`).

### 2.1 `campaign` (breadcrumb opcional)

| Campo | Tipo | Obrigatório | Uso na UI |
|-------|------|-------------|-----------|
| `id` | string | não | Link “voltar” para `/campaigns/:id` no breadcrumb |
| `title` | string | não | Texto do crumb intermediário quando `campaign` veio preenchido |

Se omitido ou `null`, a UI mostra apenas **Campanhas → Sobre o influenciador** (sem crumb da campanha).

### 2.2 `influencer` (hero + nicho + bio)

| Campo | Tipo | Obrigatório | Uso na UI |
|-------|------|-------------|-----------|
| `id` | string | sim | Chave |
| `name` | string | sim | Nome |
| `username` | string | sim | Exibido como `@username` |
| `avatar` | string \| null | não | Path de upload ou URL; o front usa `getUploadUrl` |
| `followers` | number | não | Legado no tipo; a UI de métricas por rede usa `metrics_by_network` |
| `engagement` | number | não | Legado no tipo |
| `niche` | string | não | Opcional |
| `niche_name` | string \| null | não | Chip “Nicho” |
| `sub_niche_names` | string[] | não | Chips “Sub-nicho” |
| `location` | `{ state?, city? }` | não | Label “Local” (estado, cidade) |
| `bio` | string \| null | não | Bloco “Sobre o influenciador” |
| `rating` | number \| null | não | Nota |
| `rating_max` | number | não | Denominador (ex.: “4.8 / 5”) |
| `status`, `phase`, `social_networks` | vários | não | Presentes no tipo para outros fluxos; esta tela não depende deles para layout principal |

### 2.3 `metrics_by_network` (aba Instagram / Tiktok / Youtube)

Objeto **record** cujas chaves devem ser **lowercase** e bater com o que o front usa: `instagram`, `tiktok`, `youtube`.

Cada valor: `MetricsByNetwork`:

| Campo | Tipo | Uso na UI |
|-------|------|-----------|
| `gender_split.women_percent` | number | % mulheres (fallback UI: 40) |
| `gender_split.men_percent` | number | % homens (fallback UI: 60) |
| `followers` | number | Card “Seguidores” |
| `likes` | number | Card “Curtidas” |
| `average_reach` | number | Card “Alcance Médio” |
| `engagement_percent` | number | Card “Engajamento” (o front concatena `%`) |

**Requisito de consistência:** para cada rede presente no segment control, ideal ter **todos** os campos usados nos cards; ausência → a UI mostra “—” (exceto gênero, que tem placeholder visual fixo).

### 2.4 Blocos agregados Hypeapp

| Campo | Tipo | Uso na UI |
|-------|------|-----------|
| `total_posts_in_hypeapp` | number | “Publicações totais dentro do Hype app” |
| `campaigns_participated_in_hypeapp` | number | “Campanhas participadas no Hype app” |
| `trust_index` | number \| null | Selo “Índice de Confiança” (%); `null` → “Em análise” |

### 2.5 `top_contents` (Top 4)

Array de `TopContentItem`. A UI usa **no máximo 4** (`slice(0, 4)`).

| Campo | Tipo | Uso |
|-------|------|-----|
| `id` | string | `key` no React |
| `image_url` | string \| null | Thumbnail |
| `views`, `likes` | number | Overlay no card |
| `post_url` | string \| null | Link “Visualizar postagem” |

**Sugestão de servidor:** já ordenar por relevância (ex.: views) e **limitar a 4** no SQL/API para não serializar lista grande.

### 2.6 `hypeapp_campaigns` (carrossel horizontal)

Array de `HypeappCampaignItem`. Sem limite explícito no front (renderiza todos → risco de payload pesado).

| Campo | Tipo | Uso |
|-------|------|-----|
| `id` | string | `key` |
| `logo_url` | string \| null | Logo (URL absoluta ou path de upload) |
| `campaign_name`, `brand_name` | string \| null | Títulos |
| `date` | string \| null | Data formatada no cliente (`pt-BR`) |
| `rating` | number \| null | Estrelas (1–5) |
| `description` | string \| null | Até 2 linhas (`line-clamp`) |
| `delivery_thumbnails` | string[] | No máximo **5** thumbnails exibidos por card |
| `views`, `likes` | number | Rodapé do card |

### 2.7 `audience_by_age` (audiência por idade — abaixo de Métricas)

Opcional. Mesmo contrato de **`GET /campaigns/:campaignId/metrics/audience-by-age`** (ver `docs/backoffice-campaign-metrics-tab.md`): objeto com `networks` (chaves em minúsculas, ex.: `instagram`, `youtube`), cada rede com `has_data` e `age_buckets: { label, percent }[]`.

Se omitido ou sem faixas, o front exibe **dados ilustrativos** no gráfico e um aviso discreto, até a API passar a enviar o bloco.

---

## 3. Mapa seção da UI × dados

| Seção | Origem dos dados |
|-------|------------------|
| Breadcrumb campanha (opcional) | `campaign.id`, `campaign.title` |
| Avatar, nome, @ | `influencer.*` |
| Local | `influencer.location` |
| Avaliação Hypeapp (estrela) | `influencer.rating` / `rating_max` |
| Nicho / Sub-nicho | `niche_name`, `sub_niche_names` |
| Bio | `influencer.bio` |
| Métricas por rede | `metrics_by_network[networkKey]` com `networkKey ∈ { instagram, tiktok, youtube }` |
| Audiência por idade (Instagram / YouTube) | `audience_by_age.networks` |
| Publicações / campanhas Hypeapp | `total_posts_in_hypeapp`, `campaigns_participated_in_hypeapp` |
| Selo confiança | `trust_index` |
| Top 4 conteúdos | `top_contents` |
| Campanhas no Hypeapp | `hypeapp_campaigns` |

Botões do rodapé (“Salvar influenciador”, “Copiar link”, convites) estão **sem integração** no código atual; não exigem endpoints para a tela “ler”, apenas futuras mutações.

---

## 4. Performance e boas práticas no servidor

### 4.1 Uma requisição agregada (padrão atual)

**Prós:** um RTT, simples para o front, fácil de cachear com uma chave `influencerId` (e workspace).

**Contras:** payload pode crescer com muitas campanhas em `hypeapp_campaigns`.

**Recomendações:**

1. **Limitar e paginar no servidor** o que for lista:
   - `top_contents`: máximo **4** itens.
   - `hypeapp_campaigns`: definir **limite** (ex.: 10–20) + ordenação; se precisar de mais, expor `?campaigns_cursor=` ou rota separada lazy.
2. **Truncar texto** longo antes de JSON (`description` etc.) para reduzir banda.
3. **Não repetir** blobs grandes: URLs de mídia como path relativo de upload (o front monta URL base).
4. **Consulta única ao banco** com joins planejados; evitar N+1 ao montar redes, top contents e campanhas.
5. **Índices** sugeridos (ajustar ao schema real):
   - resolução do influenciador pelo id exposto na URL (workspace + id);
   - agregações de métricas por `user_id` + `social_network_id` / tipo de rede.

### 4.2 Cache HTTP / aplicação

- `Cache-Control` / `ETag` / `Last-Modified` para respostas que mudam pouco (ex.: histórico de campanhas antigas).
- TTL curto (30–120s) ou invalidação quando houver eventos de “novo post identificado” / atualização de métricas.
- O front usa **React Query** com `staleTime: 60_000` ms para esta rota — alinhar política de revalidação no servidor (stale-while-revalidate, etc.) se usar CDN.

### 4.3 Evolução: resposta “lean” + lazy load (opcional)

Se o payload ficar grande:

| Endpoint adicional | Conteúdo |
|--------------------|----------|
| `GET …/influencer/:id/summary` | `campaign`, `influencer`, `metrics_by_network`, contagens básicas |
| `GET …/influencer/:id/top-contents?limit=4` | `top_contents` |
| `GET …/influencer/:id/hypeapp-campaigns?limit=12&cursor=` | `hypeapp_campaigns` |

O front precisaria ser alterado para disparar essas chamadas em paralelo ou após o primeiro paint. **Só vale a pena** se medição mostrar TTFB ou JSON > ~200–300 KB.

### 4.4 Segurança e multi-tenant

- Validar **workspace** em todo handler (o influenciador deve ser acessível no contexto do workspace autenticado).
- Não vazar dados de influenciadores de outros workspaces.
- Resposta 404 uniforme quando o recurso não existir ou não for acessível (evita enumeração).

---

## 5. Checklist rápido para o time de API

- [ ] `GET /campaigns/:campaignId/influencer/:influencerId` retorna `{ data: { ... } }`.
- [ ] `:influencerId` é o mesmo identificador usado na navegação a partir do dashboard.
- [ ] `metrics_by_network` usa chaves `instagram`, `tiktok`, `youtube` (minúsculas).
- [ ] `top_contents` limitado (ideal: 4) e ordenado.
- [ ] `hypeapp_campaigns` com limite ou paginação documentada.
- [ ] Imagens como path de upload ou URL; consistente com `getUploadUrl` no front.
- [ ] 404 quando influenciador inválido ou fora do workspace.
- [ ] Queries agregadas sem N+1; índices nos filtros principais.

---

## 6. Referências no repositório

| Artefato | Caminho |
|----------|---------|
| Tela | `src/screens/(private)/(app)/influencer.$influencerId.tsx` |
| Redirect (URL legada) | `src/screens/(private)/(app)/campaigns.$campaignId.influencer.$influencerId.tsx` |
| Hook | `src/hooks/use-influencer-profile.ts` |
| Cliente HTTP + tipos | `src/shared/services/influencer.ts` (`getInfluencerProfile`, `CampaignInfluencerProfileResponse`, `MetricsByNetwork`, `TopContentItem`, `HypeappCampaignItem`) |
