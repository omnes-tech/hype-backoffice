import {
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  bulkAddCampaignGroupMembers,
  createCampaignGroupPost,
  createCampaignGroup,
  listCampaignGroupParticipants,
  listCampaignGroups,
  updateCampaignGroupLink,
  type CampaignCommunityGroup,
} from "@/shared/services/campaign-groups";

interface GroupsTabProps {
  campaignId: string;
  canWrite: boolean;
}

export function GroupsTab({ campaignId, canWrite }: GroupsTabProps) {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const groupsQuery = useQuery({
    queryKey: ["campaign-community-groups", campaignId],
    queryFn: () => listCampaignGroups(campaignId),
  });
  const createMutation = useMutation({
    mutationFn: () =>
      createCampaignGroup(campaignId, {
        name: name.trim(),
        description: description.trim(),
        auto_join_on_approval: true,
        remove_on_campaign_exit: false,
      }),
    onSuccess: async () => {
      setName("");
      setDescription("");
      await queryClient.invalidateQueries({
        queryKey: ["campaign-community-groups", campaignId],
      });
      toast.success("Grupo privado criado e vinculado à campanha.");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const submit = () => {
    if (name.trim().length < 2 || description.trim().length < 2) {
      toast.error("Informe nome e descrição do grupo.");
      return;
    }
    createMutation.mutate();
  };

  if (groupsQuery.isLoading) {
    return <p className="p-6 text-sm text-neutral-500">Carregando grupos…</p>;
  }
  if (groupsQuery.error) {
    return (
      <div className="p-6">
        <p className="text-sm text-danger-600">
          {(groupsQuery.error as Error).message}
        </p>
        <Button className="mt-3" onClick={() => groupsQuery.refetch()}>
          Tentar novamente
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h2 className="text-xl font-semibold text-neutral-950">
          Grupo privado da campanha
        </h2>
        <p className="mt-1 text-sm text-neutral-500">
          Gerencie entrada automática, inclusão em lote e o link que pode ser
          enviado pelo chat.
        </p>
      </div>

      {canWrite && (
        <section className="grid gap-3 rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
          <h3 className="font-semibold text-neutral-900">Criar novo grupo</h3>
          <Input
            label="Nome"
            maxLength={80}
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Ex.: Creators da campanha"
          />
          <label className="flex flex-col gap-1 text-sm font-medium text-neutral-950">
            Descrição
            <textarea
              className="min-h-24 resize-y rounded-2xl border border-transparent bg-white px-4 py-3 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
              maxLength={2000}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Objetivo e regras essenciais do grupo"
            />
          </label>
          <Button
            className="w-fit"
            disabled={createMutation.isPending}
            onClick={submit}
          >
            {createMutation.isPending ? "Criando…" : "Criar e vincular"}
          </Button>
        </section>
      )}

      {(groupsQuery.data ?? []).length === 0 ? (
        <div className="rounded-2xl border border-dashed border-neutral-300 p-8 text-center text-sm text-neutral-500">
          Nenhum grupo vinculado a esta campanha.
        </div>
      ) : (
        (groupsQuery.data ?? []).map((group) => (
          <CampaignGroupPanel
            key={group.id}
            campaignId={campaignId}
            group={group}
            canWrite={canWrite}
          />
        ))
      )}
    </div>
  );
}

function CampaignGroupPanel({
  campaignId,
  group,
  canWrite,
}: {
  campaignId: string;
  group: CampaignCommunityGroup;
  canWrite: boolean;
}) {
  const queryClient = useQueryClient();
  const [autoJoin, setAutoJoin] = useState(group.auto_join_on_approval);
  const [removeOnExit, setRemoveOnExit] = useState(
    group.remove_on_campaign_exit,
  );
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search.trim());
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [postDraft, setPostDraft] = useState("");

  useEffect(() => {
    setAutoJoin(group.auto_join_on_approval);
    setRemoveOnExit(group.remove_on_campaign_exit);
  }, [group.auto_join_on_approval, group.remove_on_campaign_exit]);
  useEffect(() => {
    setPage(1);
    setSelected(new Set());
  }, [deferredSearch, status]);

  const participantKey = [
    "campaign-community-group-participants",
    campaignId,
    group.id,
    page,
    deferredSearch,
    status,
  ] as const;
  const participantsQuery = useQuery({
    queryKey: participantKey,
    queryFn: () =>
      listCampaignGroupParticipants(campaignId, group.id, {
        page,
        per_page: 25,
        search: deferredSearch || undefined,
        status,
      }),
  });

  const configMutation = useMutation({
    mutationFn: () =>
      updateCampaignGroupLink(campaignId, group.id, {
        auto_join_on_approval: autoJoin,
        remove_on_campaign_exit: removeOnExit,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["campaign-community-groups", campaignId],
      });
      toast.success("Configuração do grupo salva.");
    },
    onError: (error: Error) => toast.error(error.message),
  });
  const bulkMutation = useMutation({
    mutationFn: (ids: number[]) =>
      bulkAddCampaignGroupMembers(campaignId, group.id, ids),
    onSuccess: async (result) => {
      setSelected(new Set());
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["campaign-community-group-participants", campaignId, group.id],
        }),
        queryClient.invalidateQueries({
          queryKey: ["campaign-community-groups", campaignId],
        }),
      ]);
      const summary = `${result.meta.joined} incluído(s), ${result.meta.already_member} já estava(m) no grupo`;
      if (result.meta.failed > 0) {
        toast.error(`${summary} e ${result.meta.failed} falha(s).`);
      } else {
        toast.success(summary);
      }
    },
    onError: (error: Error) => toast.error(error.message),
  });
  const postMutation = useMutation({
    mutationFn: () =>
      createCampaignGroupPost(campaignId, group.id, postDraft.trim()),
    onSuccess: () => {
      setPostDraft("");
      toast.success("Post publicado no grupo.");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const rows = participantsQuery.data?.data ?? [];
  const selectableIds = useMemo(
    () => rows.filter((row) => !row.is_member).map((row) => row.campaign_user_id),
    [rows],
  );
  const allSelected =
    selectableIds.length > 0 &&
    selectableIds.every((id) => selected.has(id));

  const toggleAll = (checked: boolean) => {
    setSelected(checked ? new Set(selectableIds) : new Set());
  };
  const toggleOne = (id: number, checked: boolean) => {
    setSelected((current) => {
      const next = new Set(current);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };
  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(group.share_url);
      toast.success("Link seguro copiado. Cole-o no chat da campanha.");
    } catch {
      toast.error("Não foi possível copiar o link.");
    }
  };

  return (
    <section className="overflow-hidden rounded-2xl border border-neutral-200">
      <header className="flex flex-wrap items-center gap-4 border-b border-neutral-200 bg-neutral-50 p-4">
        {group.cover_url ? (
          <img
            src={group.cover_url}
            alt=""
            className="size-14 shrink-0 rounded-xl object-cover"
          />
        ) : (
          <div className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-primary-100">
            <Icon name="Users" size={24} color="#551B8C" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-semibold text-neutral-950">{group.name}</h3>
          <p className="line-clamp-2 text-sm text-neutral-500">
            {group.description}
          </p>
        </div>
        <Button type="button" onClick={copyLink}>
          Copiar link
        </Button>
      </header>

      <div className="grid gap-4 border-b border-neutral-200 p-4 md:grid-cols-2">
        <label className="flex items-start gap-3">
          <Checkbox
            disabled={!canWrite}
            checked={autoJoin}
            onCheckedChange={(value) => setAutoJoin(value === true)}
          />
          <span>
            <span className="block text-sm font-semibold text-neutral-900">
              Incluir ao aprovar
            </span>
            <span className="text-xs text-neutral-500">
              A aprovação da campanha não falha se o grupo estiver indisponível.
            </span>
          </span>
        </label>
        <label className="flex items-start gap-3">
          <Checkbox
            disabled={!canWrite}
            checked={removeOnExit}
            onCheckedChange={(value) => setRemoveOnExit(value === true)}
          />
          <span>
            <span className="block text-sm font-semibold text-neutral-900">
              Remover ao sair da campanha
            </span>
            <span className="text-xs text-neutral-500">
              Mantém o participante no grupo quando desmarcado.
            </span>
          </span>
        </label>
        {canWrite && (
          <Button
            className="w-fit md:col-span-2"
            disabled={configMutation.isPending}
            onClick={() => configMutation.mutate()}
          >
            Salvar configuração
          </Button>
        )}
      </div>

      <div className="flex flex-col gap-4 p-4">
        {canWrite && (
          <form
            className="flex flex-col gap-2 rounded-xl border border-neutral-200 bg-neutral-50 p-3"
            onSubmit={(event) => {
              event.preventDefault();
              if (postDraft.trim()) postMutation.mutate();
            }}
          >
            <label className="text-sm font-semibold text-neutral-900">
              Publicar no grupo
            </label>
            <textarea
              rows={3}
              maxLength={2000}
              value={postDraft}
              onChange={(event) => setPostDraft(event.target.value)}
              onKeyDown={(event) => {
                if (
                  event.key === "Enter" &&
                  (event.ctrlKey || event.metaKey)
                ) {
                  event.preventDefault();
                  if (postDraft.trim()) postMutation.mutate();
                }
              }}
              placeholder="Mensagem, aviso ou link HTTPS para os participantes"
              className="resize-y rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
            />
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs text-neutral-500">
                Ctrl/Cmd + Enter para publicar
              </span>
              <Button
                type="submit"
                disabled={
                  postMutation.isPending || postDraft.trim().length === 0
                }
              >
                {postMutation.isPending ? "Publicando…" : "Publicar"}
              </Button>
            </div>
          </form>
        )}

        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-56 flex-1">
            <Input
              label="Buscar participante"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Nome ou e-mail"
            />
          </div>
          <div className="w-48">
            <Select
              label="Situação no grupo"
              value={status}
              onChange={setStatus}
              options={[
                { value: "all", label: "Todos" },
                { value: "pending", label: "Não incluídos" },
                { value: "joined", label: "Incluídos" },
                { value: "failed", label: "Com falha" },
              ]}
            />
          </div>
          {canWrite && (
            <Button
              disabled={selected.size === 0 || bulkMutation.isPending}
              onClick={() => bulkMutation.mutate([...selected])}
            >
              {bulkMutation.isPending
                ? "Adicionando…"
                : `Adicionar selecionados (${selected.size})`}
            </Button>
          )}
        </div>

        {participantsQuery.isLoading ? (
          <p className="py-5 text-sm text-neutral-500">Carregando participantes…</p>
        ) : participantsQuery.error ? (
          <p className="py-5 text-sm text-danger-600">
            {(participantsQuery.error as Error).message}
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-neutral-200">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead className="bg-neutral-50 text-neutral-600">
                <tr>
                  <th className="w-12 p-3">
                    <Checkbox
                      aria-label="Selecionar página"
                      disabled={!canWrite || selectableIds.length === 0}
                      checked={allSelected}
                      onCheckedChange={(value) => toggleAll(value === true)}
                    />
                  </th>
                  <th className="p-3 font-medium">Participante</th>
                  <th className="p-3 font-medium">Campanha</th>
                  <th className="p-3 font-medium">Grupo</th>
                  <th className="p-3 font-medium">Tentativas</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={row.campaign_user_id}
                    className="border-t border-neutral-100"
                  >
                    <td className="p-3">
                      <Checkbox
                        aria-label={`Selecionar ${row.name}`}
                        disabled={!canWrite || row.is_member}
                        checked={selected.has(row.campaign_user_id)}
                        onCheckedChange={(value) =>
                          toggleOne(row.campaign_user_id, value === true)
                        }
                      />
                    </td>
                    <td className="p-3">
                      <span className="block font-medium text-neutral-900">
                        {row.name}
                      </span>
                      <span className="text-xs text-neutral-500">{row.email}</span>
                    </td>
                    <td className="p-3 text-neutral-600">{row.campaign_status}</td>
                    <td className="p-3">
                      <span
                        className={
                          row.is_member
                            ? "text-success-700"
                            : row.sync_status === "failed"
                              ? "text-danger-600"
                              : "text-neutral-500"
                        }
                        title={row.sync_error ?? undefined}
                      >
                        {row.is_member
                          ? "Incluído"
                          : row.sync_status === "failed"
                            ? "Falhou — selecione para tentar novamente"
                            : "Não incluído"}
                      </span>
                    </td>
                    <td className="p-3 text-neutral-600">
                      {row.sync_attempts ?? 0}
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-neutral-500">
                      Nenhum participante encontrado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex items-center justify-between text-sm text-neutral-500">
          <span>
            {participantsQuery.data?.meta.total ?? 0} participante(s)
          </span>
          <div className="flex gap-2">
            <Button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              Anterior
            </Button>
            <Button
              disabled={
                page >= (participantsQuery.data?.meta.total_pages ?? 0)
              }
              onClick={() => setPage((p) => p + 1)}
            >
              Próxima
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
