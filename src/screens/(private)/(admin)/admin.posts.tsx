import { useDeferredValue, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Modal } from "@/components/ui/modal";
import { Tabs } from "@/components/ui/tabs";
import {
  useCommunityPosts,
  useDeleteCommunityPost,
} from "@/hooks/use-community-posts";
import { getUploadUrl } from "@/lib/utils/api";
import { PostMedia } from "@/components/groups/post-media";
import type { CommunityPostModeration } from "@/shared/services/community-posts";

export const Route = createFileRoute(
  "/(private)/(admin)/admin/posts" as "/(private)/(admin)/admin/posts",
)({
  component: AdminPosts,
});

type ScopeTab = "all" | "none";

const TABS: Array<{ id: ScopeTab; label: string }> = [
  { id: "all", label: "Todos" },
  { id: "none", label: "Feed geral" },
];

function formatDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? ""
    : d.toLocaleString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
}

function AdminPosts() {
  const [scope, setScope] = useState<ScopeTab>("all");
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search.trim());
  const [target, setTarget] = useState<CommunityPostModeration | null>(null);

  const {
    data,
    isLoading,
    error,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = useCommunityPosts({ group: scope, search: deferredSearch });
  const deletePost = useDeleteCommunityPost();

  const posts = useMemo(
    () => data?.pages.flatMap((p) => p.items) ?? [],
    [data],
  );

  const handleDelete = async () => {
    if (!target) return;
    try {
      await deletePost.mutateAsync(target.id);
      toast.success("Post excluído.");
      setTarget(null);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Não foi possível excluir.",
      );
    }
  };

  return (
    <div className="flex flex-col gap-6 px-6 py-6 pb-12">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold text-neutral-950">
          Posts da comunidade
        </h1>
        <p className="text-sm text-neutral-600">
          Modere publicações do feed geral e dos grupos. A exclusão arquiva o
          post (soft-delete) e ele some do app.
        </p>
      </div>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex-1">
          <Tabs
            tabs={TABS}
            activeTab={scope}
            onTabChange={(id) => setScope(id as ScopeTab)}
          />
        </div>
        <div className="flex h-11 min-w-[220px] items-center gap-2 rounded-2xl bg-neutral-100 px-4">
          <Icon name="Search" size={16} color="#737373" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar no conteúdo..."
            className="h-full w-full bg-transparent text-sm text-neutral-950 outline-none placeholder:text-neutral-400"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex min-h-[40vh] items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-primary-600" />
        </div>
      ) : error ? (
        <div className="flex min-h-[40vh] flex-col items-center justify-center gap-2 text-center">
          <Icon name="TriangleAlert" size={26} color="#dc2626" />
          <p className="text-lg font-semibold text-neutral-950">
            Erro ao carregar os posts
          </p>
          <span className="text-sm text-neutral-600">
            {error instanceof Error ? error.message : "Tente novamente."}
          </span>
        </div>
      ) : posts.length === 0 ? (
        <div className="flex min-h-[40vh] flex-col items-center justify-center gap-2 text-center">
          <Icon name="FileText" size={26} color="#a3a3a3" />
          <p className="text-lg font-semibold text-neutral-950">
            Nenhum post encontrado
          </p>
          <span className="text-sm text-neutral-600">
            {deferredSearch
              ? "Ajuste a busca."
              : "Publicações da comunidade aparecem aqui."}
          </span>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {posts.map((post) => (
            <PostRow key={post.id} post={post} onDelete={setTarget} />
          ))}

          {hasNextPage && (
            <div className="flex justify-center pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
                className="rounded-full"
              >
                {isFetchingNextPage ? "Carregando..." : "Carregar mais"}
              </Button>
            </div>
          )}
        </div>
      )}

      {target && (
        <Modal
          title="Excluir post"
          onClose={() => setTarget(null)}
          panelClassName="max-w-md"
        >
          <div className="flex flex-col gap-6">
            <p className="text-sm text-neutral-600">
              Excluir este post de <strong>{target.author.name}</strong>? Ele
              deixa de aparecer no app. A ação é um soft-delete.
            </p>
            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setTarget(null)}
                disabled={deletePost.isPending}
                className="rounded-full"
              >
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={handleDelete}
                disabled={deletePost.isPending}
                className="rounded-full bg-red-600 hover:bg-red-700"
              >
                {deletePost.isPending ? "Excluindo..." : "Excluir"}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function PostRow({
  post,
  onDelete,
}: {
  post: CommunityPostModeration;
  onDelete: (post: CommunityPostModeration) => void;
}) {
  const avatar = getUploadUrl(post.author.avatar_url);

  return (
    <div className="flex gap-3 rounded-2xl border border-neutral-200 bg-white p-4">
      <div className="size-9 shrink-0 overflow-hidden rounded-full bg-neutral-200">
        {avatar && (
          <img
            src={avatar}
            alt={post.author.name}
            className="h-full w-full object-cover"
          />
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-neutral-900">
            {post.author.name}
          </span>
          <span className="text-xs text-neutral-400">
            {formatDate(post.created_at)}
          </span>
          <span
            className={
              post.group
                ? "rounded-full bg-primary-100 px-2 py-0.5 text-xs font-medium text-primary-700"
                : "rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-600"
            }
          >
            {post.group ? post.group.name : "Feed geral"}
          </span>
        </div>
        <p className="whitespace-pre-wrap text-sm text-neutral-700">
          {post.content}
        </p>
        <PostMedia
          imageUrl={post.image_url}
          videoUrl={post.video_url}
          videoThumbnailUrl={post.video_thumbnail_url}
        />
        <div className="mt-1 flex items-center gap-3 text-xs text-neutral-400">
          <span className="flex items-center gap-1">
            <Icon name="Heart" size={12} color="#a3a3a3" />
            {post.likes_count}
          </span>
          <span className="flex items-center gap-1">
            <Icon name="MessageCircle" size={12} color="#a3a3a3" />
            {post.comments_count}
          </span>
        </div>
      </div>
      <button
        type="button"
        onClick={() => onDelete(post)}
        className="h-fit rounded-lg p-2 text-red-500 transition-colors hover:bg-red-50"
        aria-label="Excluir post"
      >
        <Icon name="Trash2" size={16} color="#ef4444" />
      </button>
    </div>
  );
}
