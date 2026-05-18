# API — Catálogo de Criadores: filtro "Perto de mim"

Extensão do endpoint `GET /influencers` (catálogo público de criadores no
backoffice) para suportar busca por proximidade geográfica usando a
localização do admin (capturada pelo navegador) e a localização salva dos
influenciadores (já presente no banco, alimentada pelo app dos criadores).

> **Status:** especificação. Frontend já enviando `lat`/`lng`/`radius_km`
> em `src/screens/(private)/(app)/creators.tsx` quando o admin permite
> geolocalização. Backend ainda precisa aceitar os novos params; até lá
> devem ser ignorados silenciosamente (não retornar 422 só por presença).

---

## Sumário

1. [Princípios e prioridades](#1-princípios-e-prioridades)
2. [Contrato do endpoint](#2-contrato-do-endpoint)
3. [Modelagem de dados](#3-modelagem-de-dados)
4. [Performance](#4-performance)
5. [Segurança](#5-segurança)
6. [Escalabilidade](#6-escalabilidade)
7. [Frescor da localização](#7-frescor-da-localização)
8. [Comportamento sem geo](#8-comportamento-sem-geo)
9. [Ordenação](#9-ordenação)
10. [Observabilidade / SLOs](#10-observabilidade--slos)
11. [Telemetria](#11-telemetria)
12. [Checklist de implementação](#12-checklist-de-implementação)
13. [Decisões pendentes](#13-decisões-pendentes)
14. [Glossário](#14-glossário)

---

## 1. Princípios e prioridades

Toda decisão técnica abaixo respeita a ordem definida em `CLAUDE.md`:

1. **Performance** — query espacial precisa ser sub-30ms p95 mesmo com
   100k+ influenciadores. Índice GiST/SP-GiST é obrigatório; scan
   sequencial é inaceitável.
2. **Segurança** — coordenadas raw dos influenciadores **nunca** trafegam
   na resposta. Só `distance_km` derivado. Rate limit para impedir
   triangulação por varredura sistemática.
3. **Escalabilidade** — cap rígido de raio (500 km), paginação preservada,
   colunas/índices preparados para particionamento futuro por região.

---

## 2. Contrato do endpoint

### 2.1 Request

`GET /influencers`

Parâmetros novos (todos opcionais; quando algum é informado, os três são
obrigatórios juntos):

| Param        | Tipo              | Range                | Descrição                                      |
|--------------|-------------------|----------------------|------------------------------------------------|
| `lat`        | float             | `[-90, 90]`          | Latitude do admin (origem da busca).           |
| `lng`        | float             | `[-180, 180]`        | Longitude do admin.                            |
| `radius_km` | float             | `(0, 500]`           | Raio em quilômetros. Default sugerido: `50`.   |

Validações:

- `lat` e `lng` precisam ser informados em conjunto. Falhar com `422 Unprocessable Entity` se apenas um vier.
- `radius_km` só é aceito quando `lat`/`lng` estão presentes.
- Fora do range → `422` com `errors.lat`, `errors.lng`, `errors.radius_km` específicos.
- Quando `radius_km` > 500: retornar `422` (não fazer clamp silencioso — frontend já valida).

Parâmetros existentes (`q`, `social_network`, `niche`, `state`, `city`,
`followers_min`, `followers_max`, `page`, `per_page`) permanecem
inalterados e **compõem** com a busca geográfica via `AND`.

### 2.2 Response

Estrutura existente (`{ data: [...], meta: {...} }`) preservada. Cada item
em `data` ganha campo opcional:

```jsonc
{
  "data": [
    {
      "social_network": { "id": 42, "type": "instagram", ... },
      "user": { "id": 17, "name": "Fulana", ... },
      "niches": [...],
      "distance_km": 12.4    // ← novo, presente só quando lat/lng/radius_km foram enviados
    }
  ],
  "meta": {
    "page": 1,
    "per_page": 20,
    "total": 134,
    "total_pages": 7,
    "origin": { "lat": -23.5505, "lng": -46.6333, "radius_km": 50 }  // ← novo, eco para auditoria
  }
}
```

- `distance_km`: float arredondado a uma casa decimal (1.234 km vira `1.2`).
  Calculado com `ST_Distance(geog, origin_geog)` em metros / 1000.
- `meta.origin`: eco dos parâmetros para o frontend confirmar que aplicou.
  **Não inclui** coordenadas dos influenciadores.

### 2.3 Códigos de erro

| HTTP | Quando                                                    |
|------|-----------------------------------------------------------|
| 200  | OK — pode retornar `data: []` se ninguém no raio.         |
| 422  | `lat`/`lng`/`radius_km` inválidos ou inconsistentes.       |
| 429  | Rate limit estourado (ver §5.3).                          |
| 500  | Falha interna (logar com `origin` para diagnóstico).      |

---

## 3. Modelagem de dados

### 3.1 Schema

Assumindo que o app dos criadores já popula uma tabela `user_locations`
(ou similar). Se a coluna ainda for `lat`/`lng` separadas, **adicionar**
uma coluna `geog geography(Point, 4326)` derivada via trigger ou
generated column. Trabalhar em `geography` (e não `geometry`) elimina o
problema de projeção e dá distâncias diretamente em metros.

```sql
ALTER TABLE user_locations
  ADD COLUMN geog geography(Point, 4326)
  GENERATED ALWAYS AS (
    ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography
  ) STORED;
```

> ⚠️ **Atenção à ordem `(lng, lat)` no `ST_MakePoint`** — convenção PostGIS,
> inverte da forma como humanos falam.

### 3.2 Índice

```sql
CREATE INDEX idx_user_locations_geog ON user_locations USING GIST (geog);
```

GiST é o índice padrão para `geography`. Para volumes muito altos (>10M)
considerar SP-GiST, mas GiST é suficiente para o cenário atual.

### 3.3 Coluna de auditoria

```sql
ALTER TABLE user_locations
  ADD COLUMN location_updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW();
```

Atualizada pelo trigger do app sempre que o influencer envia uma nova
posição. Crítico para o filtro de frescor (§7).

### 3.4 Composição com `users`

Influencer sem registro em `user_locations` (ou com `geog IS NULL`) é
**automaticamente excluído** quando `lat`/`lng`/`radius_km` estão na
query. Sem fallback para city/state — se o admin quer proximidade real,
quem não tem coords não conta.

---

## 4. Performance

### 4.1 Query base

```sql
SELECT
  i.*,
  ROUND(
    ST_Distance(ul.geog, ST_MakePoint(:lng, :lat)::geography)::numeric / 1000,
    1
  ) AS distance_km
FROM influencers i
JOIN user_locations ul ON ul.user_id = i.user_id
WHERE
  -- Filtro espacial (usa o índice GiST)
  ST_DWithin(
    ul.geog,
    ST_MakePoint(:lng, :lat)::geography,
    :radius_km * 1000
  )
  -- Frescor (ver §7)
  AND ul.location_updated_at > NOW() - INTERVAL '90 days'
  -- ... outros filtros existentes (niche, state, etc.)
ORDER BY distance_km ASC
LIMIT :per_page OFFSET (:page - 1) * :per_page;
```

**Por que `ST_DWithin` no `WHERE` e `ST_Distance` no `SELECT`:**
`ST_DWithin` é index-aware (usa GiST diretamente), `ST_Distance` não. Se
você puser `ST_Distance(...) < :radius` no `WHERE`, o planner faz seq
scan. Sempre `ST_DWithin` no filtro.

### 4.2 Targets

| Métrica                         | Target p95 | Target p99 |
|--------------------------------|------------|------------|
| Tempo de query                 | < 30 ms    | < 80 ms    |
| Tempo total endpoint (TTFB)    | < 80 ms    | < 200 ms   |
| Rows retornadas (raio 50 km)   | -          | < 5 000    |

Com índice GiST e 100k registros, `ST_DWithin` num raio de 50 km tipicamente roda em 1–5 ms na home/work density brasileira.

### 4.3 Cache

- **Não cachear** no Redis as respostas geográficas. Cardinalidade
  (`lat × lng × radius × filtros`) é alta demais — hit rate ficaria
  baixíssimo e gastaria memória.
- O TanStack Query no frontend cacheia por (lat, lng, radius, filtros)
  com `staleTime` de 60s. Suficiente para evitar refetch em interações
  curtas (abrir/fechar modal, scroll).

### 4.4 Paginação

Manter offset-based como hoje. **Atenção:** com `ORDER BY distance_km` e
muitos influenciadores equidistantes (raio amplo na mesma cidade), pode
haver instabilidade de ordem entre páginas. Solução:

```sql
ORDER BY distance_km ASC, i.id ASC
```

Tie-breaker por `id` garante ordem total estável.

---

## 5. Segurança

### 5.1 Privacidade — não expor coordenadas

**Regra:** a resposta **não** inclui `lat`/`lng` do influenciador em nenhum
campo. Só `distance_km` derivado.

**Por quê:** com coordenadas raw, um atacante com acesso ao backoffice
(funcionário malicioso, conta comprometida) consegue triangular o
endereço residencial do influencer fazendo 3+ requests de origens
distintas. Já com `distance_km` o atacante também consegue, mas:

- Precisa de muito mais requests (cada distância é um círculo, não um ponto).
- Rate limit (§5.3) eleva o custo dramaticamente.
- Telemetria detecta o padrão (§11).

### 5.2 Validação de input

Toda validação **server-side** (frontend já valida, mas não confia):

```python
# Pseudocódigo
if lat is not None and lng is None: error("422")
if lat is None and lng is not None: error("422")
if not (-90 <= lat <= 90): error("422")
if not (-180 <= lng <= 180): error("422")
if radius_km is not None and not (0 < radius_km <= 500): error("422")
if radius_km is not None and lat is None: error("422")
```

Sanitizar antes de logar — `lat`/`lng` em logs são PII (mesmo que sejam
do admin, não do influencer).

### 5.3 Rate limit

Endpoint `/influencers` já deve ter rate limit. Para o **uso geo**
aplicar limite **adicional**:

| Janela    | Limite por usuário (admin) | Limite por workspace |
|-----------|---------------------------|----------------------|
| 1 minuto  | 30 requests com `lat/lng` | 200                  |
| 1 hora    | 500                       | 3 000                |

Excedeu → `429 Too Many Requests` com `Retry-After`. Logar como evento
de telemetria para análise de varredura suspeita.

### 5.4 Tenancy

Comportamento existente preservado: workspace só vê influenciadores
ativos no catálogo público. Filtro geo **não bypassa** essa visibilidade.

---

## 6. Escalabilidade

### 6.1 Particionamento futuro

A tabela `user_locations` é candidata natural a particionamento por
região (ex.: por bounding box do estado ou H3 cell). Não fazer agora —
PostGIS + GiST aguenta bem até alguns milhões. Marcar como ponto de
atenção quando passar de 5M rows.

### 6.2 Cap de raio

`radius_km <= 500` é regra **rígida**:

- Brasil tem ~4.300 km no eixo maior; 500 km cobre região metropolitana
  estendida + estados vizinhos. Suficiente para "perto de mim".
- Sem cap, alguém pode pedir 10.000 km e fazer scan global travestido
  de query geo. O cap mantém o índice eficiente.

### 6.3 Limite de resultados antes da paginação

Mesmo com índice, em raios grandes pode haver dezenas de milhares de
matches. Aplicar `LIMIT 5000` antes do `ORDER BY distance_km` (subquery
ou CTE) só se isso degradar — medir primeiro. Cardinalidade real será
modesta na maioria dos casos.

---

## 7. Frescor da localização

App captura localização em tempo real (quando aberto). Mas usuário pode
não abrir por meses. Localização stale → "perto de mim" fica enganoso.

### 7.1 Filtro default

Query padrão **só inclui** influenciadores com
`location_updated_at > NOW() - INTERVAL '90 days'`. Janela de 90 dias é
balanço razoável:

- Curta o suficiente para refletir mudanças de cidade.
- Larga o suficiente para não excluir creators ativos mas com app fechado
  há algumas semanas.

### 7.2 Parâmetro opcional

Adicionar `location_max_age_days` ao request para o admin ajustar (range
`[1, 365]`). Default `90`. Útil para campanhas locais (preferir 30 dias)
ou amplas (aceitar até 180).

### 7.3 Exposição no item (opcional, fase 2)

Retornar `location_freshness: "recent" | "stale"` por item, com
"recent" sendo < 30 dias. Permite o frontend exibir um indicador "📍
posição recente". **Não retornar `location_updated_at` cru** — também é
PII de comportamento ("este creator está offline há X tempo").

---

## 8. Comportamento sem geo

Quando o request **não** inclui `lat`/`lng`/`radius_km`, o endpoint
funciona exatamente como hoje:

- Sem filtro espacial.
- `distance_km` ausente em todos os items.
- `meta.origin` ausente.
- Influenciadores sem `user_locations` aparecem normalmente.

Isso garante backwards compat: cliente velho continua funcionando.

---

## 9. Ordenação

### 9.1 Default

Quando há `lat`/`lng`: `ORDER BY distance_km ASC, id ASC` (mais perto
primeiro, tie-break estável).

Quando não há: ordenação atual da API (qualquer que seja — documentar).

### 9.2 Override

Não suportar `sort=distance` explícito enquanto o default já é distância
no modo geo. Se no futuro precisar `sort=relevance`, adicionar o param.

---

## 10. Observabilidade / SLOs

### 10.1 Métricas obrigatórias

- `creators_catalog.requests_total{has_geo}` — counter de requests, separado por geo / non-geo.
- `creators_catalog.query_duration_seconds{has_geo}` — histogram, p50/p95/p99.
- `creators_catalog.results_count{has_geo}` — histogram do tamanho do `data` retornado.
- `creators_catalog.empty_results_total{has_geo}` — counter para detectar raio/região com baixa densidade.
- `creators_catalog.radius_km{}` — histogram dos raios usados (entender comportamento).

### 10.2 SLOs

| SLO                                          | Target  |
|----------------------------------------------|---------|
| Disponibilidade (5xx rate)                    | < 0,1 % |
| Latência p95 com geo                          | < 100 ms |
| Latência p95 sem geo (regressão)              | < 50 ms |

### 10.3 Alarmes

- p95 com geo > 300 ms por 5 min → page.
- Erro 5xx > 1 % por 2 min → page.
- 429 rate > 5 % por 10 min → investigar varredura.

---

## 11. Telemetria

Eventos para análise de uso e detecção de abuso:

| Evento                       | Quando                                    | Campos relevantes                          |
|------------------------------|-------------------------------------------|--------------------------------------------|
| `creators_catalog.geo_query` | Toda request com `lat`/`lng`              | workspace_id, user_id, radius_km, has_other_filters |
| `creators_catalog.no_results`| Geo query retorna `data: []`              | radius_km, location_max_age_days           |
| `creators_catalog.rate_limited`| Cliente recebe 429                       | window, limit_kind                         |

**PII:** `lat`/`lng` exatos do admin **não vão para telemetria**. Quantizar
para 1 casa decimal (~11 km de precisão) antes de logar, ou só guardar
a cidade derivada (reverse geocode server-side).

---

## 12. Checklist de implementação

### Fase 0 — pré-requisitos
- [ ] Confirmar que `user_locations.latitude`/`longitude` existem e são
      populados pelo app dos criadores.
- [ ] Confirmar a frequência de atualização (a cada login? a cada heartbeat?).

### Fase 1 — schema
- [ ] Adicionar coluna `geog geography(Point, 4326)` (generated).
- [ ] Adicionar `location_updated_at` se não existir.
- [ ] Criar índice GiST em `geog`.
- [ ] Backfill: rodar trigger uma vez para popular `geog` em rows existentes.
- [ ] `VACUUM ANALYZE user_locations` pós-backfill.

### Fase 2 — endpoint
- [ ] Parsing e validação de `lat`/`lng`/`radius_km`.
- [ ] Query com `ST_DWithin` + frescor.
- [ ] Cálculo de `distance_km` no SELECT.
- [ ] Resposta com `distance_km` por item + `meta.origin`.
- [ ] Tie-breaker `id ASC` no `ORDER BY`.

### Fase 3 — segurança
- [ ] Rate limit específico para requests com geo.
- [ ] Telemetria de uso + rate-limit hits.
- [ ] Auditoria: garantir que `lat`/`lng` do influencer não vazam em log/response.

### Fase 4 — observabilidade
- [ ] Métricas Prometheus listadas em §10.1.
- [ ] Dashboard Grafana dedicado.
- [ ] Alarmes configurados.

### Fase 5 — frontend (já enviando)
- [x] UI do botão "Perto de mim" + Select de raio + persistência em localStorage.
- [x] Service propaga `lat`/`lng`/`radius_km` em `GET /influencers`.
- [x] Card renderiza `distance_km` quando o backend retornar.
- [ ] QA em staging assim que o backend aceitar os params.

### Fase 6 — rollout
- [ ] Canary: 10 % dos workspaces por 48 h.
- [ ] Monitorar p95 e error rate.
- [ ] Rollout 100 %.

---

## 13. Decisões pendentes

| # | Pergunta                                                                | Owner    | Default proposto                |
|---|-------------------------------------------------------------------------|----------|--------------------------------|
| 1 | Coluna `user_locations` já existe ou precisa criar?                     | Backend  | Existe (criadores já enviam)   |
| 2 | Frequência de atualização vinda do app                                  | Backend  | A cada login + a cada 6h em background |
| 3 | Aplicar frescor 90 dias mesmo quando admin não passa `location_max_age_days` | Backend  | Sim                            |
| 4 | Retornar `location_freshness` na fase 1 ou só fase 2?                   | Produto  | Fase 2                         |
| 5 | Cap de raio em 500 km ou outro valor?                                   | Produto  | 500 km                         |
| 6 | Default de `radius_km` quando frontend não envia (improvável dado o flow) | Backend | 50 km                          |

---

## 14. Glossário

- **GiST** — Generalized Search Tree. Índice multi-dimensional do
  PostgreSQL, usado por PostGIS para `geography`/`geometry`.
- **`geography` vs `geometry`** — `geography` calcula distâncias na esfera
  (resultados em metros). `geometry` opera em plano cartesiano (precisa
  de projeção apropriada). Para "perto de mim" usamos `geography`.
- **`ST_DWithin`** — função PostGIS que aceita índice. Retorna `true` se
  duas geografias estão dentro de uma distância. Diferente de
  `ST_Distance(...) < N` que **não** usa índice.
- **SRID 4326** — Sistema de coordenadas WGS84, padrão para lat/lng.
- **Stale location** — localização salva há mais tempo que o threshold de
  frescor. Excluída por default.
- **Triangulação** — técnica para descobrir um ponto a partir de várias
  medidas de distância de origens conhecidas. Mitigação: rate limit +
  não expor coordenadas.
