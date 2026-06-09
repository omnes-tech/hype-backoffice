import { useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Tabs } from "@/components/ui/tabs";
import { GroupForm, type GroupFormSubmit } from "@/components/groups/group-form";
import {
  useAddGroupModerator,
  useDeleteGroup,
  useDeleteGroupPost,
  useGroup,
  useGroupPosts,
  useRemoveGroupModerator,
  useUpdateGroup,
  useUploadGroupCover,
} from "@/hooks/use-groups";
import { getUploadUrl } from "@/lib/utils/api";
import type { GroupPost } from "@/shared/types";

export const Route = createFileRoute(
  "/(private)/(admin)/admin/groups/$groupId" as "/(private)/(admin)/admin/groups/$groupId",
)({
  component: EditGroup,
});

type EditTab = "edit" | "content" | "moderators";

const TABS: Array<{ id: EditTab; label: string }> = [
  { id: "edit", label: "Editar" },
  { id: "content", label: "Conteúdos" },
  { id: "moderators", label: "Moderadores" },
];

function formatDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? ""
    : d.toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
}

function EditGroup() {
  const { groupId } = Route.useParams();
  const navigate = useNavigate();
  const [tab, setTab] = useState<EditTab>("edit");
  const [confirmDelete, setConfirmDelete] = useState(false);

  const { data: group, isLoading, error } = useGroup(groupId);
  const updateMutation = useUpdateGroup(groupId);
  const deleteMutation = useDeleteGroup();
  const uploadCover = useUploadGroupCover();

  const handleSubmit = async (values: GroupFormSubmit, coverFile: File | null) => {
    try {
      let coverUrl: string | undefined;
      if (coverFile) {
        try {
          const uploaded = await uploadCover.mutateAsync(coverFile);
          coverUrl = uploaded.url;
        } catch {
          toast.warning("Não foi possível enviar a capa; salvando sem alterá-la.");
        }
      }

      await updateMutation.mutateAsync({
        name: values.name,
        description: values.description,
        is_official: values.is_official,
        rules: values.rules,
        required_level: values.required_level,
        required_hype_points: values.required_hype_points,
        ...(coverUrl !== undefined ? { cover_url: coverUrl } : {}),
      });

      toast.success("Grupo atualizado.");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Não foi possível salvar.",
      );
    }
  };

  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync(groupId);
      toast.success("Grupo excluído.");
      navigate({ to: "/admin/groups" });
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Não foi possível excluir.",
      );
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-primary-600" />
      </div>
    );
  }

  if (error || !group) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-center">
        <Icon name="TriangleAlert" size={28} color="#dc2626" />
        <p className="text-lg font-semibold text-neutral-950">
          Grupo não encontrado
        </p>
        <Link
          to="/admin/groups"
          className="text-sm font-semibold text-primary-600"
        >
          Voltar para Grupos
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 px-6 py-6 pb-12">
      <div className="flex flex-col gap-2">
        <Link
          to="/admin/groups"
          className="flex w-fit items-center gap-1 text-sm text-neutral-500 transition-colors hover:text-neutral-800"
        >
          <Icon name="ChevronLeft" size={16} color="#737373" />
          Voltar para Grupos
        </Link>
        <h1 className="text-2xl font-semibold text-neutral-950">{group.name}</h1>
        <p className="text-sm text-neutral-600">
          {group.members_count} membro(s)
          {typeof group.posts_count === "number"
            ? ` · ${group.posts_count} conteúdo(s)`
            : ""}
        </p>
      </div>

      <Tabs
        tabs={TABS}
        activeTab={tab}
        onTabChange={(id) => setTab(id as EditTab)}
      />

      {tab === "edit" && (
        <div className="flex flex-col gap-6">
          <GroupForm
            initial={{
              name: group.name,
              description: group.description,
              is_official: group.is_official,
              rules: group.rules,
              required_level: group.required_level,
              required_hype_points: group.required_hype_points,
            }}
            initialCoverUrl={getUploadUrl(group.cover_url) ?? null}
            submitLabel="Salvar alterações"
            submittingLabel="Salvando..."
            isSubmitting={updateMutation.isPending || uploadCover.isPending}
            onSubmit={handleSubmit}
            onCancel={() => navigate({ to: "/admin/groups" })}
          />

          {/* Zona de perigo */}
          <div className="flex flex-col gap-3 rounded-2xl border border-red-200 bg-red-50/50 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-1">
              <h3 className="text-sm font-semibold text-red-700">
                Excluir grupo
              </h3>
              <p className="text-xs text-red-600/80">
                O grupo é arquivado (soft-delete) e some do app. Os conteúdos são
                preservados.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => setConfirmDelete(true)}
              className="rounded-full border-red-200 text-red-600 hover:bg-red-100 hover:text-red-700"
            >
              <Icon name="Trash2" size={16} color="#dc2626" />
              Excluir
            </Button>
          </div>
        </div>
      )}

      {tab === "content" && <GroupContent groupId={groupId} />}

      {tab === "moderators" && (
        <GroupModerators
          groupId={groupId}
          moderators={group.moderators}
        />
      )}

      {confirmDelete && (
        <Modal
          title="Excluir grupo"
          onClose={() => setConfirmDelete(false)}
          panelClassName="max-w-md"
        >
          <div className="flex flex-col gap-6">
            <p className="text-sm text-neutral-600">
              Tem certeza que deseja excluir <strong>{group.name}</strong>? Ele
              será arquivado e deixará de aparecer no app.
            </p>
            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setConfirmDelete(false)}
                disabled={deleteMutation.isPending}
                className="rounded-full"
              >
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
                className="rounded-full bg-red-600 hover:bg-red-700"
              >
                {deleteMutation.isPending ? "Excluindo..." : "Excluir"}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Aba: Conteúdos (moderação de posts)
// ---------------------------------------------------------------------------

function GroupContent({ groupId }: { groupId: string }) {
  const {
    data,
    isLoading,
    error,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = useGroupPosts(groupId);
  const deletePost = useDeleteGroupPost(groupId);
  const [target, setTarget] = useState<GroupPost | null>(null);

  const posts = useMemo(
    () => data?.pages.flatMap((p) => p.items) ?? [],
    [data],
  );

  const handleDelete = async () => {
    if (!target) return;
    try {
      await deletePost.mutateAsync(target.id);
      toast.success("Conteúdo removido.");
      setTarget(null);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Não foi possível remover.",
      );
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[30vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary-600" />
      </div>
    );
  }

  if (error) {
    return (
      <p className="py-8 text-center text-sm text-neutral-600">
        {error instanceof Error ? error.message : "Erro ao carregar conteúdos."}
      </p>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="flex min-h-[30vh] flex-col items-center justify-center gap-2 text-center">
        <Icon name="FileText" size={26} color="#a3a3a3" />
        <p className="text-sm text-neutral-600">
          Nenhum conteúdo publicado neste grupo.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {posts.map((post) => {
        const avatar = getUploadUrl(post.author.avatar_url);
        const image = getUploadUrl(post.image_url);
        return (
          <div
            key={post.id}
            className="flex gap-3 rounded-2xl border border-neutral-200 bg-white p-4"
          >
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
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-neutral-900">
                  {post.author.name}
                </span>
                <span className="text-xs text-neutral-400">
                  {formatDate(post.created_at)}
                </span>
              </div>
              <p className="whitespace-pre-wrap text-sm text-neutral-700">
                {post.content}
              </p>
              {image && (
                <img
                  src={image}
                  alt="Conteúdo do post"
                  className="mt-1 max-h-48 w-fit rounded-xl object-cover"
                />
              )}
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
              onClick={() => setTarget(post)}
              className="h-fit rounded-lg p-2 text-red-500 transition-colors hover:bg-red-50"
              aria-label="Remover conteúdo"
            >
              <Icon name="Trash2" size={16} color="#ef4444" />
            </button>
          </div>
        );
      })}

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

      {target && (
        <Modal
          title="Remover conteúdo"
          onClose={() => setTarget(null)}
          panelClassName="max-w-md"
        >
          <div className="flex flex-col gap-6">
            <p className="text-sm text-neutral-600">
              Remover este conteúdo de <strong>{target.author.name}</strong>?
              Esta ação faz soft-delete do post.
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
                {deletePost.isPending ? "Removendo..." : "Remover"}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Aba: Moderadores
// ---------------------------------------------------------------------------

function GroupModerators({
  groupId,
  moderators,
}: {
  groupId: string;
  moderators: { id: string; name: string; username: string; avatar_url: string | null }[];
}) {
  const [userId, setUserId] = useState("");
  const addMod = useAddGroupModerator(groupId);
  const removeMod = useRemoveGroupModerator(groupId);

  const handleAdd = async () => {
    const id = userId.trim();
    if (!id) {
      toast.error("Informe o ID do usuário.");
      return;
    }
    try {
      await addMod.mutateAsync(id);
      toast.success("Moderador adicionado.");
      setUserId("");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Não foi possível adicionar.",
      );
    }
  };

  const handleRemove = async (id: string) => {
    try {
      await removeMod.mutateAsync(id);
      toast.success("Moderador removido.");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Não foi possível remover.",
      );
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 rounded-2xl border border-neutral-200 bg-white p-6">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
          Adicionar moderador
        </h3>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <Input
              label="ID do usuário"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder="UUID do usuário"
            />
          </div>
          <Button
            type="button"
            onClick={handleAdd}
            disabled={addMod.isPending}
            className="rounded-full"
          >
            <Icon name="UserPlus" size={16} color="#ffffff" />
            <span className="font-semibold text-white">
              {addMod.isPending ? "Adicionando..." : "Adicionar"}
            </span>
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {moderators.length === 0 ? (
          <p className="py-6 text-center text-sm text-neutral-500">
            Nenhum moderador neste grupo.
          </p>
        ) : (
          moderators.map((mod) => {
            const avatar = getUploadUrl(mod.avatar_url);
            return (
              <div
                key={mod.id}
                className="flex items-center gap-3 rounded-2xl border border-neutral-200 bg-white p-3"
              >
                <div className="size-9 shrink-0 overflow-hidden rounded-full bg-neutral-200">
                  {avatar && (
                    <img
                      src={avatar}
                      alt={mod.name}
                      className="h-full w-full object-cover"
                    />
                  )}
                </div>
                <div className="flex flex-1 flex-col">
                  <span className="text-sm font-semibold text-neutral-900">
                    {mod.name}
                  </span>
                  <span className="text-xs text-neutral-500">
                    @{mod.username}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemove(mod.id)}
                  disabled={removeMod.isPending}
                  className="rounded-lg p-2 text-red-500 transition-colors hover:bg-red-50 disabled:opacity-50"
                  aria-label="Remover moderador"
                >
                  <Icon name="UserMinus" size={16} color="#ef4444" />
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
