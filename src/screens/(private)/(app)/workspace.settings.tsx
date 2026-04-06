import { useCallback, useEffect, useRef, useState } from "react";
import { clsx } from "clsx";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";

import { useAuth } from "@/contexts/auth-context";
import { useWorkspaceContext } from "@/contexts/workspace-context";
import {
  deleteWorkspace,
  getMyWorkspaces,
  updateWorkspace,
  uploadWorkspacePhoto,
} from "@/shared/services/workspace";
import type { WorkspaceMember, WorkspaceRole } from "@/shared/types";
import {
  getUploadUrl,
  removeWorkspaceId,
  saveWorkspaceId,
} from "@/lib/utils/api";
import { useNiches } from "@/hooks/use-niches";
import {
  useInviteWorkspaceMember,
  useRemoveWorkspaceMember,
  useUpdateWorkspaceMemberRole,
  useWorkspaceMembersQuery,
} from "@/hooks/use-workspace-members";

import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/text-area";

export const Route = createFileRoute("/(private)/(app)/workspace/settings")({
  component: WorkspaceSettingsScreen,
});

const ROLE_LABEL: Record<WorkspaceRole, string> = {
  owner: "Proprietário",
  admin: "Administrador",
  member: "Membro",
};

const workspaceFormSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome da marca").max(120),
  description: z.string().max(2000).optional(),
  niche_id: z.string().optional(),
});

type WorkspaceFormValues = z.infer<typeof workspaceFormSchema>;

/** Usuário já tem conta no backoffice — só vincular ao workspace. */
const inviteExistingSchema = z.object({
  email: z.string().trim().email("E-mail inválido"),
  role: z.enum(["admin", "member"]),
});

type InviteExistingFormValues = z.infer<typeof inviteExistingSchema>;

/** Criar conta no backoffice e já vincular ao workspace. */
const createMemberSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome").max(120),
  email: z.string().trim().email("E-mail inválido"),
  role: z.enum(["admin", "member"]),
});

type CreateMemberFormValues = z.infer<typeof createMemberSchema>;

function apiErr(e: unknown): string {
  if (e instanceof Error) {
    const st = (e as { status?: number }).status;
    if (st === 409) {
      const msg = e.message.toLowerCase();
      if (
        msg.includes("membro") ||
        msg.includes("workspace") ||
        msg.includes("already")
      ) {
        return "Este e-mail já faz parte deste workspace.";
      }
      return e.message || "Conflito: e-mail já em uso.";
    }
    return e.message;
  }
  if (e && typeof e === "object" && "message" in e) {
    const m = (e as { message: unknown }).message;
    if (typeof m === "string") return m;
    if (Array.isArray(m)) return m.filter(Boolean).join(", ");
  }
  return "Não foi possível concluir a ação.";
}

function toastAfterMemberInvite(createdAccount: boolean) {
  if (createdAccount) {
    toast.success(
      "Conta criada. A pessoa receberá um e-mail com o código de 6 dígitos para definir a senha em Redefinir senha.",
    );
  } else {
    toast.success(
      "Adicionado ao workspace. O usuário já tinha conta e receberá um e-mail avisando.",
    );
  }
}

function WorkspaceSettingsScreen() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { selectedWorkspace, selectWorkspace } = useWorkspaceContext();
  const workspaceId = selectedWorkspace?.id;
  const perms = selectedWorkspace?.permissions;

  const { data: members = [], isLoading: loadingMembers } =
    useWorkspaceMembersQuery(workspaceId);
  const { data: niches = [] } = useNiches();

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [confirmDeleteName, setConfirmDeleteName] = useState("");
  const [memberAddMode, setMemberAddMode] = useState<"invite" | "create">(
    "invite",
  );
  const photoInputRef = useRef<HTMLInputElement>(null);

  const nicheOptions = [
    { value: "", label: "Nenhum / não alterar nicho" },
    ...niches.map((n) => ({ value: String(n.id), label: n.name })),
  ];

  const syncWorkspaceFromServer = useCallback(async () => {
    if (!workspaceId) return;
    const list = await queryClient.fetchQuery({
      queryKey: ["me-workspaces"],
      queryFn: getMyWorkspaces,
    });
    const w = list.find((x) => x.id === workspaceId);
    if (w) selectWorkspace(w);
  }, [queryClient, workspaceId, selectWorkspace]);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isDirty },
  } = useForm<WorkspaceFormValues>({
    resolver: zodResolver(workspaceFormSchema),
    defaultValues: {
      name: "",
      description: "",
      niche_id: "",
    },
  });

  const nicheSelectValue = watch("niche_id") ?? "";

  useEffect(() => {
    if (!selectedWorkspace) return;
    reset({
      name: selectedWorkspace.name ?? "",
      description: selectedWorkspace.description ?? "",
      niche_id:
        selectedWorkspace.niche_id != null
          ? String(selectedWorkspace.niche_id)
          : "",
    });
  }, [selectedWorkspace, reset]);

  const updateMutation = useMutation({
    mutationFn: (values: WorkspaceFormValues) => {
      if (!workspaceId) throw new Error("Sem workspace");
      return updateWorkspace(workspaceId, {
        name: values.name.trim(),
        description:
          values.description?.trim() === ""
            ? null
            : (values.description?.trim() ?? null),
        niche_id:
          values.niche_id && values.niche_id !== ""
            ? Number(values.niche_id)
            : null,
      });
    },
    onSuccess: async () => {
      toast.success("Dados do workspace atualizados.");
      await syncWorkspaceFromServer();
    },
    onError: (e) => toast.error(apiErr(e)),
  });

  const photoMutation = useMutation({
    mutationFn: (file: File) => {
      if (!workspaceId) throw new Error("Sem workspace");
      return uploadWorkspacePhoto(workspaceId, file);
    },
    onSuccess: async () => {
      toast.success("Foto atualizada.");
      await syncWorkspaceFromServer();
    },
    onError: (e) => toast.error(apiErr(e)),
  });

  const inviteMutation = useInviteWorkspaceMember(workspaceId ?? "");
  const roleMutation = useUpdateWorkspaceMemberRole(workspaceId ?? "");
  const removeMutation = useRemoveWorkspaceMember(workspaceId ?? "");

  const deleteMutation = useMutation({
    mutationFn: () => {
      if (!workspaceId) throw new Error("Sem workspace");
      return deleteWorkspace(workspaceId);
    },
    onSuccess: async () => {
      toast.success("Workspace excluído.");
      setDeleteOpen(false);
      await queryClient.invalidateQueries({ queryKey: ["me-workspaces"] });
      const list = await queryClient.fetchQuery({
        queryKey: ["me-workspaces"],
        queryFn: getMyWorkspaces,
      });
      if (list.length > 0) {
        selectWorkspace(list[0]);
        saveWorkspaceId(list[0].id);
        navigate({ to: "/" });
      } else {
        removeWorkspaceId();
        navigate({ to: "/onboarding/create-workspace" });
      }
    },
    onError: (e) => toast.error(apiErr(e)),
  });

  const {
    register: registerInviteExisting,
    handleSubmit: submitInviteExisting,
    reset: resetInviteExisting,
    watch: watchInviteExisting,
    setValue: setInviteExistingRole,
    formState: { errors: inviteExistingErrors },
  } = useForm<InviteExistingFormValues>({
    resolver: zodResolver(inviteExistingSchema),
    defaultValues: { email: "", role: "member" },
  });

  const inviteExistingRole = watchInviteExisting("role") ?? "member";

  const {
    register: registerCreateMember,
    handleSubmit: submitCreateMember,
    reset: resetCreateMember,
    watch: watchCreateMember,
    setValue: setCreateMemberRole,
    formState: { errors: createMemberErrors },
  } = useForm<CreateMemberFormValues>({
    resolver: zodResolver(createMemberSchema),
    defaultValues: { name: "", email: "", role: "member" },
  });

  const createMemberRole = watchCreateMember("role") ?? "member";

  const canRead = perms?.workspace_read !== false;
  const canEditSettings = perms?.workspace_settings_write === true;
  const canPhoto = perms?.workspace_photo_write === true;
  const canListMembers = perms?.members_list === true;
  const canInvite = perms?.members_invite === true;
  const canRoleWrite = perms?.members_role_write === true;
  const canRemove = perms?.members_remove === true;
  const removeOnlyMember = perms?.members_remove_only_member_role === true;
  const canDeleteWs = perms?.workspace_delete === true;

  const canRemoveMember = (m: WorkspaceMember) => {
    if (!canRemove) return false;
    if (removeOnlyMember) return m.role === "member";
    return true;
  };

  if (!selectedWorkspace || !workspaceId) {
    return (
      <div className="mx-auto max-w-lg rounded-xl border border-neutral-200 bg-white p-6 text-sm text-neutral-600">
        Selecione um workspace no topo da página para gerenciar.
      </div>
    );
  }

  if (!canRead) {
    return (
      <div className="mx-auto max-w-lg rounded-xl border border-neutral-200 bg-white p-6 text-sm text-neutral-600">
        Você não tem permissão para ver as configurações deste workspace.
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-10 pb-12">
      <div>
        <h1 className="text-2xl font-semibold text-neutral-950">
          Gerenciar workspace
        </h1>
        <p className="mt-1 text-sm text-neutral-600">
          Dados da marca, foto e equipe com acesso ao backoffice deste workspace.
        </p>
      </div>

      <section className="flex flex-col gap-4 rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center gap-4">
          <Avatar
            size="lg"
            src={getUploadUrl(selectedWorkspace.photo)}
            alt={selectedWorkspace.name}
          />
          <div className="flex flex-col gap-2">
            <input
              ref={photoInputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                if (f) photoMutation.mutate(f);
              }}
            />
            <Button
              type="button"
              variant="outline"
              disabled={!canPhoto || photoMutation.isPending}
              className="w-auto px-4"
              onClick={() => photoInputRef.current?.click()}
            >
              {photoMutation.isPending ? "Enviando…" : "Alterar foto"}
            </Button>
            {!canPhoto ? (
              <p className="text-xs text-neutral-500">
                Apenas administradores podem alterar a foto.
              </p>
            ) : null}
          </div>
        </div>

        <form
          className="mt-2 flex flex-col gap-4"
          onSubmit={handleSubmit((values) => updateMutation.mutate(values))}
        >
          <Input
            label="Nome da marca"
            disabled={!canEditSettings}
            error={errors.name?.message}
            {...register("name")}
          />

          <Textarea
            label="Descrição"
            id="ws-description"
            disabled={!canEditSettings}
            placeholder="Sobre o workspace…"
            error={errors.description?.message}
            {...register("description")}
          />

          <Select
            label="Nicho principal"
            options={nicheOptions}
            value={nicheSelectValue}
            disabled={!canEditSettings}
            onChange={(v) => setValue("niche_id", v, { shouldDirty: true })}
            error={errors.niche_id?.message}
          />

          <Button
            type="submit"
            disabled={!canEditSettings || !isDirty || updateMutation.isPending}
            className="w-full sm:w-auto"
          >
            {updateMutation.isPending ? "Salvando…" : "Salvar dados do workspace"}
          </Button>
          {!canEditSettings ? (
            <p className="text-xs text-neutral-500">
              Somente administradores podem editar nome, descrição e nicho.
            </p>
          ) : null}
        </form>
      </section>

      {canListMembers ? (
        <section className="flex flex-col gap-4 rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-neutral-950">Equipe</h2>
          <p className="text-sm text-neutral-600">
            Pessoas com acesso a este workspace no backoffice. Use o bloco abaixo
            para convidar quem já tem conta ou para criar um usuário novo já
            vinculado.
          </p>

          {loadingMembers ? (
            <p className="text-sm text-neutral-500">Carregando membros…</p>
          ) : members.length === 0 ? (
            <p className="text-sm text-neutral-500">Nenhum membro listado.</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-neutral-200">
              <table className="w-full min-w-[520px] text-left text-sm">
                <thead className="border-b border-neutral-200 bg-neutral-50 text-neutral-600">
                  <tr>
                    <th className="px-3 py-2 font-medium">Nome</th>
                    <th className="px-3 py-2 font-medium">E-mail</th>
                    <th className="px-3 py-2 font-medium">Papel</th>
                    <th className="px-3 py-2 font-medium w-28" />
                  </tr>
                </thead>
                <tbody>
                  {members.map((m) => {
                    const isSelf = user?.id === m.user_id;
                    const roleOptions: { value: string; label: string }[] = [
                      { value: "owner", label: ROLE_LABEL.owner },
                      { value: "admin", label: ROLE_LABEL.admin },
                      { value: "member", label: ROLE_LABEL.member },
                    ];
                    return (
                      <tr
                        key={m.user_id}
                        className="border-b border-neutral-100 last:border-0"
                      >
                        <td className="px-3 py-2.5 text-neutral-950">
                          {m.name}
                          {isSelf ? (
                            <span className="ml-2 text-xs text-neutral-400">
                              (você)
                            </span>
                          ) : null}
                        </td>
                        <td className="px-3 py-2.5 text-neutral-700">
                          {m.email}
                        </td>
                        <td className="px-3 py-2.5">
                          {canRoleWrite ? (
                            <div className="max-w-[200px]">
                              <Select
                                options={roleOptions}
                                value={m.role}
                                disabled={roleMutation.isPending}
                                onChange={(v) => {
                                  const next = v as WorkspaceRole;
                                  if (next === m.role) return;
                                  roleMutation.mutate(
                                    { userId: m.user_id, role: next },
                                    {
                                      onSuccess: () =>
                                        toast.success("Papel atualizado."),
                                      onError: (e) => toast.error(apiErr(e)),
                                    },
                                  );
                                }}
                              />
                            </div>
                          ) : (
                            <span className="text-neutral-800">
                              {ROLE_LABEL[m.role]}
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2.5">
                          {canRemoveMember(m) && !isSelf ? (
                            <button
                              type="button"
                              className="text-sm font-medium text-red-600 hover:text-red-700 disabled:opacity-50"
                              disabled={removeMutation.isPending}
                              onClick={() => {
                                if (
                                  !confirm(
                                    `Remover ${m.name} deste workspace?`,
                                  )
                                )
                                  return;
                                removeMutation.mutate(m.user_id, {
                                  onSuccess: () =>
                                    toast.success("Membro removido."),
                                  onError: (e) => toast.error(apiErr(e)),
                                });
                              }}
                            >
                              Remover
                            </button>
                          ) : null}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ) : null}

      {canInvite ? (
        <section className="flex flex-col gap-4 rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-neutral-950">
            Adicionar à equipe
          </h2>
          <p className="text-sm text-neutral-600">
            Escolha se a pessoa já tem login no backoffice ou se você quer criar o
            acesso agora.
          </p>

          <div
            className="flex rounded-xl border border-neutral-200 bg-neutral-100/80 p-1"
            role="tablist"
            aria-label="Forma de adicionar membro"
          >
            <button
              type="button"
              role="tab"
              aria-selected={memberAddMode === "invite"}
              className={clsx(
                "flex-1 rounded-lg py-2.5 px-3 text-sm font-medium transition-colors",
                memberAddMode === "invite"
                  ? "bg-white text-neutral-950 shadow-sm"
                  : "text-neutral-600 hover:text-neutral-900",
              )}
              onClick={() => setMemberAddMode("invite")}
            >
              Convidar
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={memberAddMode === "create"}
              className={clsx(
                "flex-1 rounded-lg py-2.5 px-3 text-sm font-medium transition-colors",
                memberAddMode === "create"
                  ? "bg-white text-neutral-950 shadow-sm"
                  : "text-neutral-600 hover:text-neutral-900",
              )}
              onClick={() => setMemberAddMode("create")}
            >
              Criar usuário
            </button>
          </div>

          {memberAddMode === "invite" ? (
            <form
              className="flex flex-col gap-4"
              onSubmit={submitInviteExisting((values) => {
                if (!workspaceId) return;
                inviteMutation.mutate(
                  {
                    email: values.email.trim(),
                    role: values.role,
                  },
                  {
                    onSuccess: (result) => {
                      toastAfterMemberInvite(result.created_account);
                      resetInviteExisting({ email: "", role: "member" });
                    },
                    onError: (e) => toast.error(apiErr(e)),
                  },
                );
              })}
            >
              <p className="text-sm text-neutral-600">
                Para quem já tem cadastro no backoffice. Se o e-mail ainda não
                existir, a API pede nome: use a aba <strong>Criar usuário</strong>.
              </p>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:items-end">
                <Input
                  label="E-mail"
                  type="email"
                  placeholder="colega@empresa.com"
                  error={inviteExistingErrors.email?.message}
                  {...registerInviteExisting("email")}
                />
                <div className="w-full min-w-0 sm:max-w-[220px]">
                  <Select
                    label="Papel"
                    options={[
                      { value: "member", label: ROLE_LABEL.member },
                      { value: "admin", label: ROLE_LABEL.admin },
                    ]}
                    value={inviteExistingRole}
                    openUp
                    onChange={(v) =>
                      setInviteExistingRole(
                        "role",
                        v as InviteExistingFormValues["role"],
                        {
                          shouldValidate: true,
                          shouldDirty: true,
                        },
                      )
                    }
                  />
                </div>
              </div>
              <Button
                type="submit"
                disabled={inviteMutation.isPending}
                className="w-full sm:w-auto sm:min-w-[140px]"
              >
                {inviteMutation.isPending ? "Enviando…" : "Enviar convite"}
              </Button>
            </form>
          ) : (
            <form
              className="flex flex-col gap-4"
              onSubmit={submitCreateMember((values) => {
                if (!workspaceId) return;
                inviteMutation.mutate(
                  {
                    email: values.email.trim(),
                    role: values.role,
                    name: values.name.trim(),
                  },
                  {
                    onSuccess: (result) => {
                      toastAfterMemberInvite(result.created_account);
                      resetCreateMember({
                        name: "",
                        email: "",
                        role: "member",
                      });
                    },
                    onError: (e) => toast.error(apiErr(e)),
                  },
                );
              })}
            >
              <p className="text-sm text-neutral-600">
                O servidor cria a conta, vincula ao workspace e envia e-mail
                com código de 6 dígitos (válido 1 hora). A pessoa define a primeira
                senha em{" "}
                <Link
                  to="/reset-password"
                  search={{ email: "" }}
                  className="font-medium text-primary-600 underline underline-offset-2 hover:text-primary-700"
                >
                  Redefinir senha
                </Link>{" "}
                com esse código e a nova senha.
              </p>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Input
                  label="Nome completo"
                  placeholder="Nome do novo usuário"
                  error={createMemberErrors.name?.message}
                  {...registerCreateMember("name")}
                />
                <Input
                  label="E-mail"
                  type="email"
                  placeholder="colega@empresa.com"
                  error={createMemberErrors.email?.message}
                  {...registerCreateMember("email")}
                />
              </div>
              <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end">
                <div className="w-full min-w-0 sm:w-56 sm:shrink-0">
                  <Select
                    label="Papel inicial"
                    options={[
                      { value: "member", label: ROLE_LABEL.member },
                      { value: "admin", label: ROLE_LABEL.admin },
                    ]}
                    value={createMemberRole}
                    openUp
                    onChange={(v) =>
                      setCreateMemberRole("role", v as CreateMemberFormValues["role"], {
                        shouldValidate: true,
                        shouldDirty: true,
                      })
                    }
                  />
                </div>
                <Button
                  type="submit"
                  disabled={inviteMutation.isPending}
                  className="w-full sm:w-auto sm:min-w-[180px]"
                >
                  {inviteMutation.isPending ? "Salvando…" : "Criar e vincular"}
                </Button>
              </div>
            </form>
          )}
        </section>
      ) : null}

      {canDeleteWs ? (
        <section className="flex flex-col gap-3 rounded-xl border border-red-200 bg-red-50/40 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-red-900">Zona de risco</h2>
          <p className="text-sm text-red-800/90">
            Excluir o workspace remove campanhas e dados associados conforme as
            regras do servidor. Esta ação não pode ser desfeita.
          </p>
          <Button
            type="button"
            variant="outline"
            className="w-full border-red-300 text-red-700 hover:bg-red-50 sm:w-auto"
            onClick={() => {
              setConfirmDeleteName("");
              setDeleteOpen(true);
            }}
          >
            Excluir workspace
          </Button>
        </section>
      ) : null}

      {deleteOpen ? (
        <Modal
          title="Excluir workspace"
          onClose={() => {
            setDeleteOpen(false);
            setConfirmDeleteName("");
          }}
          panelClassName="max-w-md"
        >
          <p className="text-sm text-neutral-600 mb-4">
            Digite o nome do workspace{" "}
            <span className="font-semibold text-neutral-900">
              {selectedWorkspace.name}
            </span>{" "}
            para confirmar.
          </p>
          <Input
            label="Nome do workspace"
            value={confirmDeleteName}
            onChange={(e) => setConfirmDeleteName(e.target.value)}
            placeholder={selectedWorkspace.name}
          />
          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              className="sm:w-auto"
              onClick={() => {
                setDeleteOpen(false);
                setConfirmDeleteName("");
              }}
            >
              Cancelar
            </Button>
            <button
              type="button"
              className="w-full h-11 rounded-2xl px-6 font-medium text-sm bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 sm:w-auto"
              disabled={
                deleteMutation.isPending ||
                confirmDeleteName.trim() !== selectedWorkspace.name.trim()
              }
              onClick={() => deleteMutation.mutate()}
            >
              {deleteMutation.isPending ? "Excluindo…" : "Excluir definitivamente"}
            </button>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}
