import { useState, useMemo, useEffect, useRef, useCallback, lazy, Suspense } from "react";
import { createFileRoute, useSearch, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { InputSearch } from "@/components/ui/input-search";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Modal } from "@/components/ui/modal";
import {
  InfluencerProfileCard,
  type InfluencerCardData,
} from "@/components/campaign-tabs/shared/influencer-profile-card";
import { ListMembershipModal } from "@/components/influencer-lists/list-membership-modal";
import { useWorkspaceContext, useWorkspacePermissions } from "@/contexts/workspace-context";
import { useNiches } from "@/hooks/use-niches";
import { useInfluencerLists, useInfluencerList, useInfluencerMembershipMap } from "@/hooks/use-influencer-lists";
import {
  useCreatorsCatalog,
  useCreateInfluencerList,
  useUpdateInfluencerList,
  useDeleteInfluencerList,
  useRemoveFromInfluencerList,
} from "@/hooks/use-creators-catalog";
import type {
  CatalogItem,
  CatalogOrderBy,
  CatalogOrderDir,
} from "@/shared/services/creators-catalog";
import type { Niche } from "@/shared/types";
import { UserAvatar } from "@/components/ui/user-avatar";

// Lazy: o Leaflet (~130kB) só baixa quando o usuário ativa "Perto de mim".
const NearMeMap = lazy(() =>
  import("@/components/creators/near-me-map").then((m) => ({ default: m.NearMeMap })),
);

export const Route = createFileRoute("/(private)/(app)/creators")({
  component: RouteComponent,
});

// ---------------------------------------------------------------------------
// Types & constants
// ---------------------------------------------------------------------------

type ActiveTab = "catalog" | "lists";

interface CatalogFilters {
  q: string;
  social_network: string;
  niche: string;
  state: string;
  followers_min: string;
  followers_max: string;
  gender: string;
  engagement_min: string;
  engagement_max: string;
  /** Valor combinado "campo_direção" (ex.: "followers_desc"); "" = padrão. */
  order: string;
}

const EMPTY_FILTERS: CatalogFilters = {
  q: "",
  social_network: "all",
  niche: "",
  state: "",
  followers_min: "",
  followers_max: "",
  gender: "",
  engagement_min: "",
  engagement_max: "",
  order: "",
};

const NETWORK_OPTIONS = [
  { value: "all", label: "Todas as redes" },
  { value: "instagram", label: "Instagram" },
  { value: "tiktok", label: "TikTok" },
  { value: "youtube", label: "YouTube" },
  { value: "ugc", label: "UGC" },
];

const GENDER_OPTIONS = [
  { value: "", label: "Todos os gêneros" },
  { value: "male", label: "Masculino" },
  { value: "female", label: "Feminino" },
  { value: "other", label: "Outro" },
  { value: "prefer_not_to_say", label: "Prefiro não dizer" },
];

const ORDER_OPTIONS = [
  { value: "", label: "Padrão" },
  { value: "followers_desc", label: "Seguidores (maior)" },
  { value: "followers_asc", label: "Seguidores (menor)" },
  { value: "engagement_desc", label: "Engajamento (maior)" },
  { value: "engagement_asc", label: "Engajamento (menor)" },
  { value: "name_asc", label: "Nome (A–Z)" },
  { value: "recent_desc", label: "Mais recentes" },
];

/** Quebra o valor combinado de ordenação em campo + direção para a API. */
function parseOrder(order: string): {
  order_by?: CatalogOrderBy;
  order_dir?: CatalogOrderDir;
} {
  if (!order) return {};
  const idx = order.lastIndexOf("_");
  if (idx <= 0) return {};
  return {
    order_by: order.slice(0, idx) as CatalogOrderBy,
    order_dir: order.slice(idx + 1) as CatalogOrderDir,
  };
}

/** Mantém apenas dígitos (campos de seguidores). */
function sanitizeInt(v: string): string {
  return v.replace(/\D/g, "");
}

/** Mantém dígitos e um separador decimal (campos de engajamento %). */
function sanitizeDecimal(v: string): string {
  const cleaned = v.replace(/[^\d.,]/g, "").replace(",", ".");
  const parts = cleaned.split(".");
  return parts.length <= 1 ? cleaned : `${parts[0]}.${parts.slice(1).join("")}`;
}

// ---------------------------------------------------------------------------
// "Perto de mim" — geolocalização do admin via Geolocation API
// ---------------------------------------------------------------------------

const RADIUS_OPTIONS = [
  { value: "10", label: "10 km" },
  { value: "25", label: "25 km" },
  { value: "50", label: "50 km" },
  { value: "100", label: "100 km" },
  { value: "200", label: "200 km" },
];

const DEFAULT_RADIUS_KM = 50;

/**
 * Chave versionada para o localStorage. Bump da versão (`v1` → `v2`)
 * invalida caches antigos sem precisar migrar.
 */
const NEAR_ME_STORAGE_KEY = "hypeapp:near-me-location:v1";

interface NearMeLocation {
  lat: number;
  lng: number;
  /** Epoch ms — usado pra exibir "capturado há X" no futuro, se necessário. */
  capturedAt: number;
}

function loadStoredLocation(): NearMeLocation | null {
  try {
    const raw = localStorage.getItem(NEAR_ME_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (
      parsed &&
      typeof parsed.lat === "number" &&
      typeof parsed.lng === "number" &&
      Number.isFinite(parsed.lat) &&
      Number.isFinite(parsed.lng)
    ) {
      return {
        lat: parsed.lat,
        lng: parsed.lng,
        capturedAt: typeof parsed.capturedAt === "number" ? parsed.capturedAt : Date.now(),
      };
    }
  } catch {
    // localStorage indisponível (modo privado, quota) — ignora.
  }
  return null;
}

function saveStoredLocation(loc: NearMeLocation | null): void {
  try {
    if (loc) {
      localStorage.setItem(NEAR_ME_STORAGE_KEY, JSON.stringify(loc));
    } else {
      localStorage.removeItem(NEAR_ME_STORAGE_KEY);
    }
  } catch {
    // ignora — não bloqueia a UX se localStorage falhar
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function catalogItemToCardData(item: CatalogItem): InfluencerCardData {
  const avatar = item.social_network.photo ?? item.user.photo ?? "";
  return {
    profileKey: String(item.social_network.id),
    influencerName: item.user.name,
    influencerAvatar: avatar,
    profileType: item.social_network.type,
    profileTypeLabel: item.social_network.name,
    profileUsername: item.social_network.username,
    influencerFollowers: item.social_network.members,
    profileFollowers: item.social_network.members,
    influencerEngagement: item.social_network.engagement_percent ?? 0,
    distanceKm: item.distance_km ?? null,
  };
}

// ---------------------------------------------------------------------------
// Skeletons
// ---------------------------------------------------------------------------

function CardSkeleton() {
  return (
    <div className="flex flex-col gap-5 rounded-xl bg-neutral-100 p-3 min-h-[280px]">
      <div className="flex justify-between">
        <Skeleton className="size-[60px] rounded-2xl" />
        <div className="flex gap-1.5">
          <Skeleton className="size-10 rounded-lg" />
          <Skeleton className="size-10 rounded-lg" />
        </div>
      </div>
      <Skeleton className="h-6 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
      <div className="flex gap-2">
        <Skeleton className="h-16 flex-1 rounded-lg" />
        <Skeleton className="h-16 flex-1 rounded-lg" />
      </div>
      <Skeleton className="h-8 w-full rounded-xl" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Catalog Tab
// ---------------------------------------------------------------------------

interface SelectedForList {
  userId: number;
  name: string;
}

function CatalogTab() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState<CatalogFilters>(EMPTY_FILTERS);
  const [debouncedQ, setDebouncedQ] = useState("");
  const [selectedForList, setSelectedForList] = useState<SelectedForList | null>(null);
  const membershipMap = useInfluencerMembershipMap();
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // "Perto de mim" — estado de geolocalização, persistido em localStorage
  // para não pedir permissão a cada visita. Inicializado lazy (somente uma
  // leitura no mount) para não bloquear render.
  const [nearMeLocation, setNearMeLocation] = useState<NearMeLocation | null>(
    () => loadStoredLocation(),
  );
  const [radiusKm, setRadiusKm] = useState<number>(DEFAULT_RADIUS_KM);
  const [nearMeRequesting, setNearMeRequesting] = useState(false);
  // Mapa "perto de mim" — colapsável (ocupa espaço vertical; preferência do usuário)
  const [showNearMeMap, setShowNearMeMap] = useState(true);

  // Campos numéricos (seguidores/engajamento) são debounced para não refazer a
  // query a cada tecla; selects e ordenação aplicam imediatamente (UX mais ágil).
  const [debouncedNumeric, setDebouncedNumeric] = useState({
    followers_min: "",
    followers_max: "",
    engagement_min: "",
    engagement_max: "",
  });

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(filters.q), 350);
    return () => clearTimeout(t);
  }, [filters.q]);

  useEffect(() => {
    const t = setTimeout(
      () =>
        setDebouncedNumeric({
          followers_min: filters.followers_min,
          followers_max: filters.followers_max,
          engagement_min: filters.engagement_min,
          engagement_max: filters.engagement_max,
        }),
      350,
    );
    return () => clearTimeout(t);
  }, [
    filters.followers_min,
    filters.followers_max,
    filters.engagement_min,
    filters.engagement_max,
  ]);

  const queryFilters = useMemo(
    () => ({
      q: debouncedQ || undefined,
      social_network: filters.social_network !== "all" ? filters.social_network : undefined,
      niche: filters.niche ? Number(filters.niche) : undefined,
      state: filters.state || undefined,
      followers_min: debouncedNumeric.followers_min
        ? Number(debouncedNumeric.followers_min)
        : undefined,
      followers_max: debouncedNumeric.followers_max
        ? Number(debouncedNumeric.followers_max)
        : undefined,
      gender: filters.gender || undefined,
      engagement_min: debouncedNumeric.engagement_min
        ? Number(debouncedNumeric.engagement_min)
        : undefined,
      engagement_max: debouncedNumeric.engagement_max
        ? Number(debouncedNumeric.engagement_max)
        : undefined,
      ...parseOrder(filters.order),
      // Geo só vai pro backend quando temos coords salvas (admin já permitiu)
      ...(nearMeLocation
        ? {
            lat: nearMeLocation.lat,
            lng: nearMeLocation.lng,
            radius_km: radiusKm,
          }
        : {}),
    }),
    [debouncedQ, filters, debouncedNumeric, nearMeLocation, radiusKm]
  );

  /**
   * Pede a localização atual via Geolocation API. Grava em localStorage
   * pra evitar reprompt a cada visita. Em caso de erro/negação, mostra
   * toast informativo — não bloqueia o resto do catálogo.
   */
  const handleEnableNearMe = useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      toast.error("Seu navegador não suporta geolocalização.");
      return;
    }
    setNearMeRequesting(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc: NearMeLocation = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          capturedAt: Date.now(),
        };
        setNearMeLocation(loc);
        saveStoredLocation(loc);
        setNearMeRequesting(false);
      },
      (err) => {
        setNearMeRequesting(false);
        const denied = err.code === err.PERMISSION_DENIED;
        toast.error(
          denied
            ? "Permissão negada. Habilite a localização nas configurações do navegador."
            : "Não foi possível obter sua localização agora. Tente novamente.",
        );
      },
      // Precisão alta consome bateria e não é necessária pra "perto de mim".
      // maximumAge 5min evita re-consulta cara em cliques sucessivos.
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 5 * 60_000 },
    );
  }, []);

  const handleClearNearMe = useCallback(() => {
    setNearMeLocation(null);
    saveStoredLocation(null);
  }, []);

  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useCreatorsCatalog(queryFilters);

  const { data: niches = [] } = useNiches();

  const nicheOptions = useMemo(() => {
    const topLevel = (niches as Niche[]).filter((n) => !n.parent_id);
    return [
      { value: "", label: "Todos os nichos" },
      ...topLevel.map((n) => ({ value: String(n.id), label: n.name })),
    ];
  }, [niches]);

  const allItems = useMemo(
    () => data?.pages.flatMap((p) => p.items) ?? [],
    [data]
  );

  // Criadores com localização aproximada — plotáveis no mapa "perto de mim".
  const nearMeLocatedCount = useMemo(
    () => allItems.filter((i) => i.approx_location).length,
    [allItems]
  );

  const total = data?.pages[0]?.total;

  const handleLoadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  useEffect(() => {
    const el = loadMoreRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) handleLoadMore(); },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [handleLoadMore]);

  function setFilter<K extends keyof CatalogFilters>(key: K, value: CatalogFilters[K]) {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

  function getNicheNames(item: CatalogItem): string[] {
    return item.niches.map((n) => n.name).filter((s) => s.trim().length > 0);
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="flex-1 min-w-[220px]">
          <InputSearch
            placeholder="Buscar por nome ou @username..."
            value={filters.q}
            onChange={(e) => setFilter("q", e.target.value)}
            icon={<Icon name="Search" size={18} color="#a3a3a3" />}
          />
        </div>

        <div className="w-44">
          <Select
            options={NETWORK_OPTIONS}
            value={filters.social_network}
            onChange={(v) => setFilter("social_network", v)}
            placeholder="Rede social"
          />
        </div>

        <div className="w-44">
          <Select
            options={nicheOptions}
            value={filters.niche}
            onChange={(v) => setFilter("niche", v)}
            placeholder="Nicho"
            isSearchable
          />
        </div>

        <div className="w-36">
          <InputSearch
            placeholder="Estado (ex: SP)"
            value={filters.state}
            onChange={(e) => setFilter("state", e.target.value)}
          />
        </div>

        <div className="w-44">
          <Select
            options={GENDER_OPTIONS}
            value={filters.gender}
            onChange={(v) => setFilter("gender", v)}
            placeholder="Gênero"
          />
        </div>

        {/* Faixa de seguidores */}
        <div className="w-28">
          <InputSearch
            placeholder="Seg. mín"
            inputMode="numeric"
            value={filters.followers_min}
            onChange={(e) => setFilter("followers_min", sanitizeInt(e.target.value))}
          />
        </div>
        <div className="w-28">
          <InputSearch
            placeholder="Seg. máx"
            inputMode="numeric"
            value={filters.followers_max}
            onChange={(e) => setFilter("followers_max", sanitizeInt(e.target.value))}
          />
        </div>

        {/* Faixa de engajamento (%) */}
        <div className="w-28">
          <InputSearch
            placeholder="Eng. mín %"
            inputMode="decimal"
            value={filters.engagement_min}
            onChange={(e) => setFilter("engagement_min", sanitizeDecimal(e.target.value))}
          />
        </div>
        <div className="w-28">
          <InputSearch
            placeholder="Eng. máx %"
            inputMode="decimal"
            value={filters.engagement_max}
            onChange={(e) => setFilter("engagement_max", sanitizeDecimal(e.target.value))}
          />
        </div>

        {/* Ordenação */}
        <div className="w-44">
          <Select
            options={ORDER_OPTIONS}
            value={filters.order}
            onChange={(v) => setFilter("order", v)}
            placeholder="Ordenar por"
          />
        </div>

        {/* Filtro "Perto de mim" — usa Geolocation API + filtro geo do backend
            (ver docs/api-creators-near-me.md). */}
        {nearMeLocation ? (
          <div className="flex items-center gap-2">
            <div className="w-32">
              <Select
                options={RADIUS_OPTIONS}
                value={String(radiusKm)}
                onChange={(v) => setRadiusKm(Number(v))}
                placeholder="Raio"
              />
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={handleClearNearMe}
              className="h-11 rounded-full whitespace-nowrap border-primary-300 text-primary-700"
              title="Remover filtro de proximidade"
            >
              <span className="flex items-center gap-1.5">
                <Icon name="MapPinCheck" size={16} color="var(--color-primary-600)" />
                Perto de mim
                <Icon name="X" size={14} color="var(--color-primary-600)" />
              </span>
            </Button>
          </div>
        ) : (
          <Button
            type="button"
            variant="outline"
            onClick={handleEnableNearMe}
            disabled={nearMeRequesting}
            className="h-11 rounded-full whitespace-nowrap disabled:cursor-not-allowed disabled:opacity-60"
            title="Filtrar criadores próximos a você"
          >
            <span className="flex items-center gap-1.5">
              <Icon name="MapPin" size={16} color="#404040" />
              {nearMeRequesting ? "Localizando…" : "Perto de mim"}
            </span>
          </Button>
        )}
      </div>

      {/* Mapa "Perto de mim" — visão geográfica dos criadores próximos */}
      {nearMeLocation && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Icon name="Map" size={18} color="var(--color-primary-600)" />
              <h3 className="text-sm font-semibold text-neutral-900">
                Criadores perto de você
              </h3>
              {!isLoading && (
                <span className="rounded-full bg-primary-50 px-2 py-0.5 text-xs font-medium text-primary-700">
                  {nearMeLocatedCount} no mapa
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={() => setShowNearMeMap((v) => !v)}
              className="flex items-center gap-1 text-sm text-neutral-500 transition-colors hover:text-neutral-800"
            >
              {showNearMeMap ? "Ocultar mapa" : "Mostrar mapa"}
              <Icon
                name={showNearMeMap ? "ChevronUp" : "ChevronDown"}
                size={16}
                color="currentColor"
              />
            </button>
          </div>

          {showNearMeMap &&
            (nearMeLocatedCount > 0 ? (
              <Suspense
                fallback={
                  <div className="h-80 w-full animate-pulse rounded-2xl bg-neutral-100 sm:h-96" />
                }
              >
                <NearMeMap
                  origin={{ lat: nearMeLocation.lat, lng: nearMeLocation.lng, radiusKm }}
                  items={allItems}
                  onViewProfile={(userId) =>
                    navigate({
                      to: "/influencer/$influencerId",
                      params: { influencerId: String(userId) },
                    })
                  }
                />
              </Suspense>
            ) : !isLoading ? (
              <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-neutral-200 bg-neutral-50 py-10 text-center">
                <Icon name="MapPinOff" size={28} color="#a3a3a3" />
                <p className="text-sm text-neutral-500">
                  Nenhum criador com localização neste raio
                </p>
                <p className="text-xs text-neutral-400">Aumente o raio para ver mais</p>
              </div>
            ) : (
              <div className="h-80 w-full animate-pulse rounded-2xl bg-neutral-100 sm:h-96" />
            ))}
        </div>
      )}

      {/* Count */}
      {!isLoading && total != null && (
        <p className="text-sm text-neutral-500">
          {allItems.length} de {total} perfis
        </p>
      )}

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => <CardSkeleton key={i} />)}
        </div>
      ) : allItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
          <Icon name="Users" size={40} color="#d4d4d4" />
          <p className="text-neutral-500">Nenhum criador encontrado</p>
          <p className="text-sm text-neutral-400">Tente ajustar os filtros</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {allItems.map((item) => {
              const cardData = catalogItemToCardData(item);
              const nicheNames = getNicheNames(item);

              return (
                <InfluencerProfileCard
                  key={cardData.profileKey}
                  data={cardData}
                  nicheNames={nicheNames}
                  inLists={membershipMap.get(item.user.id) ?? []}
                  onViewProfile={() =>
                    navigate({
                      to: "/influencer/$influencerId",
                      params: { influencerId: String(item.user.id) },
                    })
                  }
                  onSaveToList={() =>
                    setSelectedForList({ userId: item.user.id, name: item.user.name })
                  }
                />
              );
            })}
          </div>

          <div ref={loadMoreRef} className="py-4 flex justify-center">
            {isFetchingNextPage && (
              <div className="flex items-center gap-2 text-sm text-neutral-500">
                <Icon name="Loader" size={16} color="#a3a3a3" className="animate-spin" />
                Carregando mais...
              </div>
            )}
          </div>
        </>
      )}

      {selectedForList && (
        <ListMembershipModal
          userId={selectedForList.userId}
          influencerName={selectedForList.name}
          onClose={() => setSelectedForList(null)}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// ListDetailModal
// ---------------------------------------------------------------------------

interface ListDetailModalProps {
  listId: string;
  listName: string;
  onClose: () => void;
}

function ListDetailModal({ listId, listName, onClose }: ListDetailModalProps) {
  const { data, isLoading } = useInfluencerList(listId);
  const removeMutation = useRemoveFromInfluencerList();
  const navigate = useNavigate();

  const influencers = data?.influencers ?? [];

  async function handleRemove(userId: number) {
    await removeMutation.mutateAsync({ listId, userId });
  }

  return (
    <Modal onClose={onClose} title={listName} panelClassName="max-w-2xl">
      <div className="flex flex-col gap-4">
        {isLoading ? (
          <div className="flex flex-col gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-2xl" />
            ))}
          </div>
        ) : influencers.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <Icon name="Users" size={36} color="#d4d4d4" />
            <p className="text-neutral-500">Esta lista ainda não tem criadores</p>
            <p className="text-sm text-neutral-400">
              Vá ao catálogo e clique em "Adicionar à lista" nos cards
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <p className="text-sm text-neutral-500 mb-1">
              {influencers.length} {influencers.length === 1 ? "criador" : "criadores"}
            </p>
            {influencers.map((influencer) => {
              return (
              <div
                key={influencer.id}
                className="flex items-center gap-3 rounded-2xl border border-neutral-100 bg-neutral-50 px-4 py-3"
              >
                <UserAvatar
                  name={influencer.name}
                  src={influencer.photo}
                  className="size-10 rounded-xl"
                />

                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-neutral-900">{influencer.name}</p>
                  {influencer.email && (
                    <p className="truncate text-xs text-neutral-400">{influencer.email}</p>
                  )}
                </div>

                <div className="flex shrink-0 gap-1">
                  <button
                    type="button"
                    onClick={() =>
                      navigate({
                        to: "/influencer/$influencerId",
                        params: { influencerId: String(influencer.id) },
                      })
                    }
                    className="flex size-8 items-center justify-center rounded-lg text-neutral-400 hover:bg-neutral-200 hover:text-neutral-700 transition-colors"
                    title="Ver perfil"
                  >
                    <Icon name="ExternalLink" size={15} color="currentColor" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemove(influencer.id)}
                    disabled={removeMutation.isPending}
                    className="flex size-8 items-center justify-center rounded-lg text-neutral-400 hover:bg-red-50 hover:text-red-500 transition-colors disabled:opacity-50"
                    title="Remover da lista"
                  >
                    <Icon name="Trash2" size={15} color="currentColor" />
                  </button>
                </div>
              </div>
              );
            })}
          </div>
        )}
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Lists Tab
// ---------------------------------------------------------------------------

function ListsTab() {
  const { data: lists = [], isLoading } = useInfluencerLists();
  const createMutation = useCreateInfluencerList();
  const updateMutation = useUpdateInfluencerList();
  const deleteMutation = useDeleteInfluencerList();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newListName, setNewListName] = useState("");
  const [editingList, setEditingList] = useState<{ id: string; name: string } | null>(null);
  const [deletingListId, setDeletingListId] = useState<string | null>(null);
  const [viewingList, setViewingList] = useState<{ id: string; name: string } | null>(null);

  async function handleCreate() {
    if (!newListName.trim()) return;
    await createMutation.mutateAsync(newListName.trim());
    setNewListName("");
    setShowCreateModal(false);
  }

  async function handleUpdate() {
    if (!editingList || !editingList.name.trim()) return;
    await updateMutation.mutateAsync({ listId: editingList.id, name: editingList.name.trim() });
    setEditingList(null);
  }

  async function handleDelete() {
    if (!deletingListId) return;
    await deleteMutation.mutateAsync(deletingListId);
    setDeletingListId(null);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-neutral-500">
          {lists.length} {lists.length === 1 ? "lista" : "listas"}
        </p>
        <Button
          className="h-10 rounded-full bg-primary-600 px-5 text-sm font-semibold hover:bg-primary-700"
          onClick={() => setShowCreateModal(true)}
        >
          <Icon name="Plus" size={16} color="#fff" />
          Nova lista
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-36 rounded-2xl" />
          ))}
        </div>
      ) : lists.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
          <Icon name="ListPlus" size={40} color="#d4d4d4" />
          <p className="text-neutral-500">Nenhuma lista criada ainda</p>
          <p className="text-sm text-neutral-400">
            Crie listas para organizar criadores e importá-los em campanhas
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {lists.map((list) => (
            <div
              key={list.id}
              className="flex flex-col gap-4 rounded-2xl border border-neutral-200 bg-white p-4 cursor-pointer hover:border-primary-300 hover:shadow-sm transition-all"
              onClick={() => setViewingList({ id: list.id, name: list.name })}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-medium text-neutral-950">{list.name}</p>
                  <p className="text-sm text-neutral-500">
                    {list.influencer_count}{" "}
                    {list.influencer_count === 1 ? "criador" : "criadores"}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setEditingList({ id: list.id, name: list.name }); }}
                    className="flex size-8 items-center justify-center rounded-lg text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 transition-colors"
                  >
                    <Icon name="Pencil" size={14} color="currentColor" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setDeletingListId(list.id); }}
                    className="flex size-8 items-center justify-center rounded-lg text-neutral-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                  >
                    <Icon name="Trash2" size={14} color="currentColor" />
                  </button>
                </div>
              </div>

              <p className="text-xs text-neutral-400">
                Criada em{" "}
                {new Date(list.created_at).toLocaleDateString("pt-BR", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                })}
              </p>
            </div>
          ))}
        </div>
      )}

      {showCreateModal && (
        <Modal
          onClose={() => { setShowCreateModal(false); setNewListName(""); }}
          title="Nova lista"
        >
          <div className="flex flex-col gap-4 p-1">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-neutral-700">Nome da lista</label>
              <input
                autoFocus
                type="text"
                placeholder="Ex: Top creators fashion"
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                className="h-11 w-full rounded-2xl border border-neutral-200 px-4 text-sm outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                className="rounded-full"
                onClick={() => { setShowCreateModal(false); setNewListName(""); }}
              >
                Cancelar
              </Button>
              <Button
                className="rounded-full bg-primary-600 hover:bg-primary-700"
                onClick={handleCreate}
                disabled={createMutation.isPending || !newListName.trim()}
              >
                Criar lista
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {editingList && (
        <Modal
          onClose={() => setEditingList(null)}
          title="Renomear lista"
        >
          <div className="flex flex-col gap-4 p-1">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-neutral-700">Nome</label>
              <input
                autoFocus
                type="text"
                value={editingList.name}
                onChange={(e) =>
                  setEditingList((prev) => prev ? { ...prev, name: e.target.value } : null)
                }
                onKeyDown={(e) => e.key === "Enter" && handleUpdate()}
                className="h-11 w-full rounded-2xl border border-neutral-200 px-4 text-sm outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" className="rounded-full" onClick={() => setEditingList(null)}>
                Cancelar
              </Button>
              <Button
                className="rounded-full bg-primary-600 hover:bg-primary-700"
                onClick={handleUpdate}
                disabled={updateMutation.isPending || !editingList.name.trim()}
              >
                Salvar
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {deletingListId && (
        <Modal
          onClose={() => setDeletingListId(null)}
          title="Excluir lista"
        >
          <div className="flex flex-col gap-4 p-1">
            <p className="text-sm text-neutral-600">
              Tem certeza que deseja excluir esta lista? Esta ação não pode ser desfeita.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" className="rounded-full" onClick={() => setDeletingListId(null)}>
                Cancelar
              </Button>
              <Button
                className="rounded-full bg-red-500 hover:bg-red-600 text-white"
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
              >
                Excluir
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {viewingList && (
        <ListDetailModal
          listId={viewingList.id}
          listName={viewingList.name}
          onClose={() => setViewingList(null)}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Route Component
// ---------------------------------------------------------------------------

function RouteComponent() {
  const { selectedWorkspace } = useWorkspaceContext();
  const permissions = useWorkspacePermissions();
  const navigate = useNavigate();
  const search = useSearch({ from: "/(private)/(app)/creators" });
  const activeTab: ActiveTab =
    (search as Record<string, string>).tab === "lists" ? "lists" : "catalog";

  function setTab(tab: ActiveTab) {
    navigate({ search: tab === "lists" ? { tab: "lists" } : {} } as any);
  }

  if (!selectedWorkspace) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-neutral-500">Selecione um workspace para continuar</p>
      </div>
    );
  }

  if (!permissions.catalog_read) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-neutral-500">Você não tem permissão para acessar esta seção</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 p-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold text-neutral-950">Criadores</h1>
        <p className="text-sm text-neutral-500">
          Explore e organize influenciadores do catálogo da plataforma
        </p>
      </div>

      <div className="flex gap-1 rounded-2xl bg-neutral-100 p-1 w-fit">
        <button
          type="button"
          onClick={() => setTab("catalog")}
          className={`rounded-xl px-5 py-2 text-sm font-medium transition-colors ${
            activeTab === "catalog"
              ? "bg-white text-neutral-950 shadow-sm"
              : "text-neutral-500 hover:text-neutral-700"
          }`}
        >
          Catálogo
        </button>
        {permissions.catalog_write && (
          <button
            type="button"
            onClick={() => setTab("lists")}
            className={`rounded-xl px-5 py-2 text-sm font-medium transition-colors ${
              activeTab === "lists"
                ? "bg-white text-neutral-950 shadow-sm"
                : "text-neutral-500 hover:text-neutral-700"
            }`}
          >
            Minhas Listas
          </button>
        )}
      </div>

      {activeTab === "catalog" ? <CatalogTab /> : <ListsTab />}
    </div>
  );
}
