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

const BR_STATES = [
  { value: "AC", label: "AC – Acre" },
  { value: "AL", label: "AL – Alagoas" },
  { value: "AP", label: "AP – Amapá" },
  { value: "AM", label: "AM – Amazonas" },
  { value: "BA", label: "BA – Bahia" },
  { value: "CE", label: "CE – Ceará" },
  { value: "DF", label: "DF – Distrito Federal" },
  { value: "ES", label: "ES – Espírito Santo" },
  { value: "GO", label: "GO – Goiás" },
  { value: "MA", label: "MA – Maranhão" },
  { value: "MT", label: "MT – Mato Grosso" },
  { value: "MS", label: "MS – Mato Grosso do Sul" },
  { value: "MG", label: "MG – Minas Gerais" },
  { value: "PA", label: "PA – Pará" },
  { value: "PB", label: "PB – Paraíba" },
  { value: "PR", label: "PR – Paraná" },
  { value: "PE", label: "PE – Pernambuco" },
  { value: "PI", label: "PI – Piauí" },
  { value: "RJ", label: "RJ – Rio de Janeiro" },
  { value: "RN", label: "RN – Rio Grande do Norte" },
  { value: "RS", label: "RS – Rio Grande do Sul" },
  { value: "RO", label: "RO – Rondônia" },
  { value: "RR", label: "RR – Roraima" },
  { value: "SC", label: "SC – Santa Catarina" },
  { value: "SP", label: "SP – São Paulo" },
  { value: "SE", label: "SE – Sergipe" },
  { value: "TO", label: "TO – Tocantins" },
];

interface ViaCepResponse {
  logradouro: string;
  complemento: string;
  bairro: string;
  localidade: string;
  uf: string;
  erro?: boolean;
}

async function lookupPostalCode(raw: string): Promise<ViaCepResponse | null> {
  const digits = raw.replace(/\D/g, "");
  if (digits.length !== 8) return null;
  const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
  if (!res.ok) return null;
  const data: ViaCepResponse = await res.json();
  if (data.erro) return null;
  return data;
}

const companyFormSchema = z.object({
  legalName: z.string().trim().max(200, "Máximo 200 caracteres"),
  taxId: z
    .string()
    .trim()
    .refine((v) => v === "" || v.replace(/\D/g, "").length === 14, "CNPJ deve ter 14 dígitos"),
  postalCode: z
    .string()
    .trim()
    .refine((v) => v === "" || v.replace(/\D/g, "").length === 8, "CEP deve ter 8 dígitos"),
  street: z.string().trim(),
  streetNumber: z.string().trim().regex(/^\d*$/, "Apenas números"),
  unit: z.string().trim(),
  neighborhood: z.string().trim(),
  city: z.string().trim(),
  state: z.string().trim(),
});

type CompanyFormValues = z.infer<typeof companyFormSchema>;

const ROLE_LABEL: Record<WorkspaceRole, string> = {
  owner: "Proprietário",
  admin: "Administrador",
  member: "Membro",
  aprovador: "Aprovador",
  observador: "Observador",
  juridico: "Jurídico",
  financeiro: "Financeiro",
  analista: "Analista",
};

const PERMISSION_GROUPS: Array<{
  label: string;
  items: Array<{ key: string; label: string }>;
}> = [
  {
    label: "Workspace",
    items: [
      { key: "workspace_read", label: "Ver workspace" },
      { key: "workspace_settings_write", label: "Editar configurações" },
      { key: "workspace_photo_write", label: "Alterar foto" },
      { key: "workspace_delete", label: "Excluir workspace" },
    ],
  },
  {
    label: "Membros",
    items: [
      { key: "members_list", label: "Listar membros" },
      { key: "members_invite", label: "Convidar membros" },
      { key: "members_remove", label: "Remover membros" },
      { key: "members_role_write", label: "Gerenciar papéis e permissões" },
    ],
  },
  {
    label: "Campanhas",
    items: [
      { key: "campaigns_read", label: "Ver campanhas" },
      { key: "campaigns_create", label: "Criar campanhas" },
      { key: "campaigns_write", label: "Editar campanhas" },
      { key: "campaigns_delete", label: "Excluir campanhas" },
      { key: "campaigns_publish", label: "Publicar campanhas" },
    ],
  },
  {
    label: "Influenciadores",
    items: [
      { key: "influencers_read", label: "Ver influenciadores" },
      { key: "influencers_invite", label: "Convidar influenciadores" },
      { key: "influencers_approve", label: "Aprovar influenciadores" },
      { key: "influencers_reject", label: "Rejeitar influenciadores" },
    ],
  },
  {
    label: "Roteiros",
    items: [
      { key: "scripts_read", label: "Ver roteiros" },
      { key: "scripts_write", label: "Escrever roteiros" },
      { key: "scripts_approve", label: "Aprovar roteiros" },
      { key: "scripts_reject", label: "Rejeitar roteiros" },
    ],
  },
  {
    label: "Conteúdo",
    items: [
      { key: "content_read", label: "Ver conteúdo" },
      { key: "content_write", label: "Enviar conteúdo" },
      { key: "content_approve", label: "Aprovar conteúdo" },
      { key: "content_reject", label: "Rejeitar conteúdo" },
    ],
  },
  {
    label: "Contratos",
    items: [
      { key: "contracts_read", label: "Ver contratos" },
      { key: "contracts_write", label: "Gerenciar contratos" },
    ],
  },
  {
    label: "Financeiro",
    items: [
      { key: "financial_read", label: "Ver financeiro" },
      { key: "financial_balance_add", label: "Adicionar saldo" },
      { key: "financial_payments_approve", label: "Aprovar pagamentos" },
      { key: "financial_reports_export", label: "Exportar relatórios" },
    ],
  },
];

function PermissionsSelector({
  value,
  onChange,
  disabled,
}: {
  value: string[];
  onChange: (v: string[]) => void;
  disabled?: boolean;
}) {
  const toggle = (key: string) => {
    onChange(value.includes(key) ? value.filter((k) => k !== key) : [...value, key]);
  };

  const toggleGroup = (group: (typeof PERMISSION_GROUPS)[number]) => {
    const allSelected = group.items.every((i) => value.includes(i.key));
    if (allSelected) {
      onChange(value.filter((k) => !group.items.some((i) => i.key === k)));
    } else {
      const toAdd = group.items.map((i) => i.key).filter((k) => !value.includes(k));
      onChange([...value, ...toAdd]);
    }
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {PERMISSION_GROUPS.map((group) => {
        const allChecked = group.items.every((i) => value.includes(i.key));
        return (
          <div
            key={group.label}
            className="rounded-lg border border-neutral-200 bg-neutral-50 p-3"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">
                {group.label}
              </span>
              {!disabled && (
                <button
                  type="button"
                  className="text-xs text-primary-600 hover:text-primary-700"
                  onClick={() => toggleGroup(group)}
                >
                  {allChecked ? "Desmarcar todos" : "Selecionar todos"}
                </button>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              {group.items.map((item) => (
                <label
                  key={item.key}
                  className={clsx(
                    "flex items-center gap-2 select-none",
                    disabled ? "cursor-default opacity-60" : "cursor-pointer",
                  )}
                >
                  <input
                    type="checkbox"
                    checked={value.includes(item.key)}
                    onChange={() => !disabled && toggle(item.key)}
                    disabled={disabled}
                    className="h-4 w-4 rounded border-neutral-300 accent-primary-600"
                  />
                  <span className="text-sm text-neutral-700">{item.label}</span>
                </label>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

const workspaceFormSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome da marca").max(120),
  description: z.string().max(2000).optional(),
  niche_id: z.string().optional(),
});

type WorkspaceFormValues = z.infer<typeof workspaceFormSchema>;

/** Usuário já tem conta no backoffice — só vincular ao workspace. */
const inviteExistingSchema = z.object({
  email: z.string().trim().email("E-mail inválido"),
  role: z.enum(["admin", "member", "aprovador", "observador", "juridico", "financeiro", "analista"]),
});

type InviteExistingFormValues = z.infer<typeof inviteExistingSchema>;

/** Criar conta no backoffice e já vincular ao workspace. */
const createMemberSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome").max(120),
  email: z.string().trim().email("E-mail inválido"),
  role: z.enum(["admin", "member", "aprovador", "observador", "juridico", "financeiro", "analista"]),
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
    if (st === 400 && e.message.toLowerCase().includes("name")) {
      return "Este e-mail não tem cadastro no backoffice. Use a aba \"Criar usuário\" para criar uma conta com nome e e-mail.";
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

  // Permissões customizadas para os formulários de convite/criação
  const [invitePermissions, setInvitePermissions] = useState<string[]>([]);
  const [showInvitePermissions, setShowInvitePermissions] = useState(false);
  const [createPermissions, setCreatePermissions] = useState<string[]>([]);
  const [showCreatePermissions, setShowCreatePermissions] = useState(false);

  // Modal de edição de permissões de membro existente
  const [permModalMember, setPermModalMember] = useState<WorkspaceMember | null>(null);
  const [permModalValues, setPermModalValues] = useState<string[]>([]);

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

  const [addressVisible, setAddressVisible] = useState(false);
  const [postalCodeLoading, setPostalCodeLoading] = useState(false);

  const {
    register: registerCompany,
    handleSubmit: handleSubmitCompany,
    reset: resetCompany,
    setValue: setCompanyValue,
    setError: setCompanyError,
    clearErrors: clearCompanyErrors,
    watch: watchCompany,
    formState: { errors: companyErrors, isDirty: isCompanyDirty },
  } = useForm<CompanyFormValues>({
    resolver: zodResolver(companyFormSchema),
    defaultValues: {
      legalName: "",
      taxId: "",
      postalCode: "",
      street: "",
      streetNumber: "",
      unit: "",
      neighborhood: "",
      city: "",
      state: "",
    },
  });

  const companyState = watchCompany("state") ?? "";

  useEffect(() => {
    if (!selectedWorkspace) return;
    const ws = selectedWorkspace;
    const hasAddress = !!(ws.postal_code || ws.street);
    resetCompany({
      legalName: ws.legal_name ?? "",
      taxId: ws.tax_id ?? "",
      postalCode: ws.postal_code ?? "",
      street: ws.street ?? "",
      streetNumber: ws.street_number ?? "",
      unit: ws.unit ?? "",
      neighborhood: ws.neighborhood ?? "",
      city: ws.city ?? "",
      state: ws.state ?? "",
    });
    setAddressVisible(hasAddress);
  }, [selectedWorkspace, resetCompany]);

  const updateCompanyMutation = useMutation({
    mutationFn: (values: CompanyFormValues) => {
      if (!workspaceId || !selectedWorkspace) throw new Error("Sem workspace");
      return updateWorkspace(workspaceId, {
        name: selectedWorkspace.name,
        legal_name: values.legalName || null,
        tax_id: values.taxId ? values.taxId.replace(/\D/g, "") : null,
        postal_code: values.postalCode ? values.postalCode.replace(/\D/g, "") : null,
        street: values.street || null,
        street_number: values.streetNumber || null,
        unit: values.unit || null,
        neighborhood: values.neighborhood || null,
        city: values.city || null,
        state: values.state || null,
      });
    },
    onSuccess: async () => {
      toast.success("Dados da empresa atualizados.");
      await syncWorkspaceFromServer();
    },
    onError: (e) => toast.error(apiErr(e)),
  });

  const handlePostalCodeBlur = async (e: { target: HTMLInputElement }) => {
    const digits = e.target.value.replace(/\D/g, "");
    if (digits.length !== 8) {
      setAddressVisible(false);
      return;
    }
    setPostalCodeLoading(true);
    clearCompanyErrors("postalCode");
    try {
      const result = await lookupPostalCode(digits);
      if (!result) {
        setCompanyError("postalCode", { message: "CEP não encontrado" });
        setAddressVisible(false);
      } else {
        setCompanyValue("street", result.logradouro, { shouldValidate: true, shouldDirty: true });
        setCompanyValue("neighborhood", result.bairro, { shouldValidate: true, shouldDirty: true });
        setCompanyValue("city", result.localidade, { shouldValidate: true, shouldDirty: true });
        setCompanyValue("state", result.uf, { shouldValidate: true, shouldDirty: true });
        if (result.complemento) setCompanyValue("unit", result.complemento, { shouldDirty: true });
        setAddressVisible(true);
      }
    } catch {
      setCompanyError("postalCode", { message: "Erro ao buscar CEP. Tente novamente." });
      setAddressVisible(false);
    } finally {
      setPostalCodeLoading(false);
    }
  };

  const canRead = perms?.workspace_read !== false;
  const canEditSettings = perms?.workspace_settings_write === true;
  const canPhoto = perms?.workspace_photo_write === true;
  const canListMembers = perms?.members_list === true;
  const canInvite = perms?.members_invite === true;
  const canRoleWrite = perms?.members_role_write === true;
  const canRemove = perms?.members_remove === true;
  const removeOnlyMember = perms?.members_remove_only_member_role === true;
  const canDeleteWs = perms?.workspace_delete === true;
  /** Pode definir/editar permissões de outros membros. */
  const canManagePermissions = canRoleWrite;

  const NON_PRIVILEGED_ROLES: WorkspaceRole[] = ["member", "aprovador", "observador", "juridico", "financeiro", "analista"];

  const canRemoveMember = (m: WorkspaceMember) => {
    if (!canRemove) return false;
    if (removeOnlyMember) return NON_PRIVILEGED_ROLES.includes(m.role);
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
              className="w-auto px-4 min-w-max"
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

      {/* Company / legal data — owner only */}
      {selectedWorkspace.role === "owner" && (
        <section className="flex flex-col gap-4 rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
          <div>
            <h2 className="text-lg font-semibold text-neutral-950">Dados da empresa</h2>
            <p className="mt-1 text-sm text-neutral-600">
              Razão social, CNPJ e endereço do workspace. Visível apenas para o proprietário.
            </p>
          </div>

          <form
            className="flex flex-col gap-4"
            onSubmit={handleSubmitCompany((values) => updateCompanyMutation.mutate(values))}
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="Razão social"
                placeholder="Ex.: Empresa Exemplo Ltda."
                disabled={updateCompanyMutation.isPending}
                error={companyErrors.legalName?.message}
                {...registerCompany("legalName")}
              />
              <Input
                label="CNPJ"
                placeholder="00.000.000/0000-00"
                disabled={updateCompanyMutation.isPending}
                error={companyErrors.taxId?.message}
                {...registerCompany("taxId")}
              />
            </div>

            <div className="relative">
              <Input
                label="CEP"
                placeholder="00000-000"
                disabled={updateCompanyMutation.isPending}
                error={companyErrors.postalCode?.message}
                {...registerCompany("postalCode", { onBlur: handlePostalCodeBlur })}
              />
              {postalCodeLoading && (
                <span className="absolute right-3 top-9 text-xs text-neutral-400">
                  Buscando…
                </span>
              )}
            </div>

            {addressVisible && (
              <>
                <Input
                  label="Rua / Avenida"
                  placeholder="Nome da rua"
                  disabled={updateCompanyMutation.isPending}
                  error={companyErrors.street?.message}
                  {...registerCompany("street")}
                />

                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Número"
                    placeholder="Ex.: 123"
                    inputMode="numeric"
                    disabled={updateCompanyMutation.isPending}
                    error={companyErrors.streetNumber?.message}
                    {...registerCompany("streetNumber", {
                      onChange: (e) => {
                        e.target.value = e.target.value.replace(/\D/g, "");
                      },
                    })}
                  />
                  <Input
                    label="Complemento"
                    placeholder="Apto, sala… (opcional)"
                    disabled={updateCompanyMutation.isPending}
                    error={companyErrors.unit?.message}
                    {...registerCompany("unit")}
                  />
                </div>

                <Input
                  label="Bairro"
                  placeholder="Nome do bairro"
                  disabled={updateCompanyMutation.isPending}
                  error={companyErrors.neighborhood?.message}
                  {...registerCompany("neighborhood")}
                />

                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Cidade"
                    placeholder="Nome da cidade"
                    disabled={updateCompanyMutation.isPending}
                    error={companyErrors.city?.message}
                    {...registerCompany("city")}
                  />
                  <Select
                    label="Estado"
                    placeholder="Selecione"
                    options={BR_STATES}
                    value={companyState}
                    disabled={updateCompanyMutation.isPending}
                    onChange={(v) => setCompanyValue("state", v, { shouldDirty: true, shouldValidate: true })}
                    error={companyErrors.state?.message}
                  />
                </div>
              </>
            )}

            <Button
              type="submit"
              disabled={!isCompanyDirty || updateCompanyMutation.isPending}
              className="w-full sm:w-auto"
            >
              {updateCompanyMutation.isPending ? "Salvando…" : "Salvar dados da empresa"}
            </Button>
          </form>
        </section>
      )}

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
                    const assignableRoleOptions: { value: string; label: string }[] = [
                      { value: "admin", label: ROLE_LABEL.admin },
                      { value: "analista", label: ROLE_LABEL.analista },
                      { value: "aprovador", label: ROLE_LABEL.aprovador },
                      { value: "financeiro", label: ROLE_LABEL.financeiro },
                      { value: "juridico", label: ROLE_LABEL.juridico },
                      { value: "observador", label: ROLE_LABEL.observador },
                      { value: "member", label: ROLE_LABEL.member },
                    ];
                    const isOwner = m.role === "owner";
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
                          {canRoleWrite && !isOwner ? (
                            <div className="max-w-[200px]">
                              <Select
                                options={assignableRoleOptions}
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
                          <div className="flex items-center gap-3">
                            {canManagePermissions && m.role !== "owner" && (
                              <button
                                type="button"
                                className="text-sm font-medium text-primary-600 hover:text-primary-700"
                                onClick={() => {
                                  setPermModalMember(m);
                                  setPermModalValues(m.permissions ?? []);
                                }}
                              >
                                Permissões
                              </button>
                            )}
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
                          </div>
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
                    permissions: canManagePermissions && invitePermissions.length > 0 ? invitePermissions : undefined,
                  },
                  {
                    onSuccess: (result) => {
                      toastAfterMemberInvite(result.created_account);
                      resetInviteExisting({ email: "", role: "member" });
                      setInvitePermissions([]);
                      setShowInvitePermissions(false);
                    },
                    onError: (e) => {
                      const st = (e as { status?: number }).status;
                      const msg = (e as Error).message?.toLowerCase() ?? "";
                      if (st === 400 && msg.includes("name")) {
                        setMemberAddMode("create");
                        toast.error("Este e-mail não tem cadastro. Preencha o nome para criar uma conta.");
                      } else {
                        toast.error(apiErr(e));
                      }
                    },
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
                      { value: "admin", label: ROLE_LABEL.admin },
                      { value: "analista", label: ROLE_LABEL.analista },
                      { value: "aprovador", label: ROLE_LABEL.aprovador },
                      { value: "financeiro", label: ROLE_LABEL.financeiro },
                      { value: "juridico", label: ROLE_LABEL.juridico },
                      { value: "observador", label: ROLE_LABEL.observador },
                      { value: "member", label: ROLE_LABEL.member },
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
              {canManagePermissions && (
                <div className="flex flex-col gap-3">
                  <button
                    type="button"
                    className="flex items-center gap-1.5 text-sm text-primary-600 hover:text-primary-700 w-fit"
                    onClick={() => setShowInvitePermissions((v) => !v)}
                  >
                    <span>{showInvitePermissions ? "▾" : "▸"}</span>
                    <span>
                      Permissões personalizadas
                      {invitePermissions.length > 0 && (
                        <span className="ml-1.5 rounded-full bg-primary-100 px-2 py-0.5 text-xs font-medium text-primary-700">
                          {invitePermissions.length} selecionadas
                        </span>
                      )}
                    </span>
                  </button>
                  {showInvitePermissions && (
                    <PermissionsSelector
                      value={invitePermissions}
                      onChange={setInvitePermissions}
                    />
                  )}
                </div>
              )}
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
                    permissions: canManagePermissions && createPermissions.length > 0 ? createPermissions : undefined,
                  },
                  {
                    onSuccess: (result) => {
                      toastAfterMemberInvite(result.created_account);
                      resetCreateMember({
                        name: "",
                        email: "",
                        role: "member",
                      });
                      setCreatePermissions([]);
                      setShowCreatePermissions(false);
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
              <div className="w-full min-w-0 sm:w-56 sm:shrink-0">
                <Select
                  label="Papel inicial"
                  options={[
                    { value: "admin", label: ROLE_LABEL.admin },
                    { value: "analista", label: ROLE_LABEL.analista },
                    { value: "aprovador", label: ROLE_LABEL.aprovador },
                    { value: "financeiro", label: ROLE_LABEL.financeiro },
                    { value: "juridico", label: ROLE_LABEL.juridico },
                    { value: "observador", label: ROLE_LABEL.observador },
                    { value: "member", label: ROLE_LABEL.member },
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
              {canManagePermissions && (
                <div className="flex flex-col gap-3">
                  <button
                    type="button"
                    className="flex items-center gap-1.5 text-sm text-primary-600 hover:text-primary-700 w-fit"
                    onClick={() => setShowCreatePermissions((v) => !v)}
                  >
                    <span>{showCreatePermissions ? "▾" : "▸"}</span>
                    <span>
                      Permissões personalizadas
                      {createPermissions.length > 0 && (
                        <span className="ml-1.5 rounded-full bg-primary-100 px-2 py-0.5 text-xs font-medium text-primary-700">
                          {createPermissions.length} selecionadas
                        </span>
                      )}
                    </span>
                  </button>
                  {showCreatePermissions && (
                    <PermissionsSelector
                      value={createPermissions}
                      onChange={setCreatePermissions}
                    />
                  )}
                </div>
              )}
              <Button
                type="submit"
                disabled={inviteMutation.isPending}
                className="w-full sm:w-auto sm:min-w-[180px]"
              >
                {inviteMutation.isPending ? "Salvando…" : "Criar e vincular"}
              </Button>
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

      {permModalMember && (
        <Modal
          title={`Permissões — ${permModalMember.name}`}
          onClose={() => setPermModalMember(null)}
          panelClassName="max-w-3xl"
        >
          <p className="text-sm text-neutral-600 mb-4">
            Selecione as permissões para <strong>{permModalMember.name}</strong>.
            As permissões selecionadas substituem as padrão do papel{" "}
            <strong>{ROLE_LABEL[permModalMember.role]}</strong>.
          </p>
          <PermissionsSelector
            value={permModalValues}
            onChange={setPermModalValues}
          />
          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              className="sm:w-auto"
              onClick={() => setPermModalMember(null)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              disabled={roleMutation.isPending}
              className="sm:w-auto sm:min-w-[140px]"
              onClick={() => {
                roleMutation.mutate(
                  {
                    userId: permModalMember.user_id,
                    role: permModalMember.role,
                    permissions: permModalValues,
                  },
                  {
                    onSuccess: () => {
                      toast.success("Permissões atualizadas.");
                      setPermModalMember(null);
                    },
                    onError: (e) => toast.error(apiErr(e)),
                  },
                );
              }}
            >
              {roleMutation.isPending ? "Salvando…" : "Salvar permissões"}
            </Button>
          </div>
        </Modal>
      )}

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
