import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { createFileRoute, useSearch, useNavigate } from "@tanstack/react-router";

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
import { useWorkspaceContext, useWorkspacePermissions } from "@/contexts/workspace-context";
import { useNiches } from "@/hooks/use-niches";
import { useInfluencerLists, useInfluencerList, useInfluencerMembershipMap } from "@/hooks/use-influencer-lists";
import {
  useCreatorsCatalog,
  useCreateInfluencerList,
  useUpdateInfluencerList,
  useDeleteInfluencerList,
  useAddToInfluencerList,
  useRemoveFromInfluencerList,
} from "@/hooks/use-creators-catalog";
import type { CatalogItem } from "@/shared/services/creators-catalog";
import type { Niche } from "@/shared/types";
import { getUploadUrl } from "@/lib/utils/api";

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
}

const EMPTY_FILTERS: CatalogFilters = {
  q: "",
  social_network: "all",
  niche: "",
  state: "",
  followers_min: "",
  followers_max: "",
};

const NETWORK_OPTIONS = [
  { value: "all", label: "Todas as redes" },
  { value: "instagram", label: "Instagram" },
  { value: "tiktok", label: "TikTok" },
  { value: "youtube", label: "YouTube" },
  { value: "ugc", label: "UGC" },
];

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
// ListMembershipModal — gerencia em quais listas o influenciador está
// ---------------------------------------------------------------------------

interface ListMembershipModalProps {
  userId: number;
  influencerName: string;
  onClose: () => void;
}

function ListMembershipModal({ userId, influencerName, onClose }: ListMembershipModalProps) {
  const { data: lists = [], isLoading } = useInfluencerLists();
  const membershipMap = useInfluencerMembershipMap();
  const addMutation = useAddToInfluencerList();
  const removeMutation = useRemoveFromInfluencerList();
  const createMutation = useCreateInfluencerList();
  const [newListName, setNewListName] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);

  const currentLists = membershipMap.get(userId) ?? [];
  const currentListIds = new Set(currentLists.map((l) => l.id));
  const availableLists = lists.filter((l) => !currentListIds.has(l.id));

  const isPending = addMutation.isPending || removeMutation.isPending || createMutation.isPending;

  async function handleAdd(listId: string) {
    await addMutation.mutateAsync({ listId, userId });
  }

  async function handleRemove(listId: string) {
    await removeMutation.mutateAsync({ listId, userId });
  }

  async function handleCreate() {
    if (!newListName.trim()) return;
    const list = await createMutation.mutateAsync(newListName.trim());
    await addMutation.mutateAsync({ listId: list.id, userId });
    setNewListName("");
    setShowCreateForm(false);
  }

  return (
    <Modal onClose={onClose} title="Listas" panelClassName="max-w-md">
      <div className="flex flex-col gap-4">
        <p className="text-sm text-neutral-500">
          Gerenciar listas de <strong className="text-neutral-800">{influencerName}</strong>
        </p>

        {isLoading ? (
          <div className="flex items-center gap-2 py-4 text-sm text-neutral-400">
            <Icon name="Loader" size={16} color="#a3a3a3" className="animate-spin" />
            Carregando listas...
          </div>
        ) : (
          <>
            {/* Listas em que já está */}
            {currentLists.length > 0 && (
              <div className="flex flex-col gap-2">
                <p className="text-xs font-medium uppercase tracking-wide text-neutral-400">
                  Nas listas
                </p>
                {currentLists.map((list) => (
                  <div
                    key={list.id}
                    className="flex items-center justify-between rounded-2xl border border-primary-200 bg-primary-50 px-4 py-3"
                  >
                    <p className="font-medium text-neutral-900">{list.name}</p>
                    <button
                      type="button"
                      onClick={() => handleRemove(list.id)}
                      disabled={isPending}
                      className="flex size-7 items-center justify-center rounded-lg text-neutral-400 hover:bg-red-50 hover:text-red-500 transition-colors disabled:opacity-50"
                      title="Remover da lista"
                    >
                      <Icon name="X" size={14} color="currentColor" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Listas disponíveis para adicionar */}
            {availableLists.length > 0 && (
              <div className="flex flex-col gap-2">
                {currentLists.length > 0 && (
                  <p className="text-xs font-medium uppercase tracking-wide text-neutral-400">
                    Adicionar a
                  </p>
                )}
                {availableLists.map((list) => (
                  <button
                    key={list.id}
                    type="button"
                    onClick={() => handleAdd(list.id)}
                    disabled={isPending}
                    className="flex items-center justify-between w-full rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-left hover:border-primary-300 hover:bg-primary-50 transition-colors disabled:opacity-50"
                  >
                    <div>
                      <p className="font-medium text-neutral-900">{list.name}</p>
                      <p className="text-xs text-neutral-400">
                        {list.influencer_count} {list.influencer_count === 1 ? "criador" : "criadores"}
                      </p>
                    </div>
                    <Icon name="Plus" size={18} color="#9E2CFA" />
                  </button>
                ))}
              </div>
            )}

            {/* Nenhuma lista ainda */}
            {lists.length === 0 && !showCreateForm && (
              <p className="text-sm text-neutral-400">
                Você ainda não tem nenhuma lista. Crie uma para continuar.
              </p>
            )}

            {/* Criar nova lista */}
            {!showCreateForm ? (
              <button
                type="button"
                onClick={() => setShowCreateForm(true)}
                className="flex items-center gap-2 w-full rounded-2xl border border-dashed border-neutral-300 px-4 py-3 text-sm text-neutral-500 hover:border-primary-400 hover:text-primary-600 transition-colors"
              >
                <Icon name="Plus" size={16} color="currentColor" />
                Criar nova lista
              </button>
            ) : (
              <div className="flex flex-col gap-3">
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
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="rounded-full flex-1"
                    onClick={() => { setShowCreateForm(false); setNewListName(""); }}
                  >
                    Cancelar
                  </Button>
                  <Button
                    className="rounded-full flex-1 bg-primary-600 hover:bg-primary-700"
                    onClick={handleCreate}
                    disabled={isPending || !newListName.trim()}
                  >
                    {isPending ? "Criando..." : "Criar e adicionar"}
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </Modal>
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

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(filters.q), 350);
    return () => clearTimeout(t);
  }, [filters.q]);

  const queryFilters = useMemo(
    () => ({
      q: debouncedQ || undefined,
      social_network: filters.social_network !== "all" ? filters.social_network : undefined,
      niche: filters.niche ? Number(filters.niche) : undefined,
      state: filters.state || undefined,
      followers_min: filters.followers_min ? Number(filters.followers_min) : undefined,
      followers_max: filters.followers_max ? Number(filters.followers_max) : undefined,
    }),
    [debouncedQ, filters]
  );

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

  function getNicheName(item: CatalogItem): string | null {
    return item.niches[0]?.name ?? null;
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
      </div>

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
              console.log(item)
              const cardData = catalogItemToCardData(item);
              const nicheName = getNicheName(item);

              return (
                <InfluencerProfileCard
                  key={cardData.profileKey}
                  data={cardData}
                  nicheName={nicheName}
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
// InfluencerAvatar — avatar com fallback para inicial se a imagem falhar
// ---------------------------------------------------------------------------

function InfluencerAvatar({ name, photoUrl }: { name: string; photoUrl: string | undefined }) {
  const [broken, setBroken] = useState(false);
  const initial = name.charAt(0).toUpperCase();

  if (!photoUrl || broken) {
    return (
      <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-neutral-200 text-sm font-medium text-neutral-500">
        {initial}
      </div>
    );
  }

  return (
    <img
      src={photoUrl}
      alt={name}
      className="size-10 rounded-xl object-cover bg-neutral-200 shrink-0"
      onError={() => setBroken(true)}
    />
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
              const photoUrl = getUploadUrl(influencer.photo);
              return (
              <div
                key={influencer.id}
                className="flex items-center gap-3 rounded-2xl border border-neutral-100 bg-neutral-50 px-4 py-3"
              >
                <InfluencerAvatar name={influencer.name} photoUrl={photoUrl} />

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
