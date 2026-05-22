import { useMemo, useState } from "react";
import { useParams } from "@tanstack/react-router";
import { toast } from "sonner";

import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import {
  useCampaignContracts,
  useContractTemplates,
  useDownloadContract,
  useResendContract,
} from "@/hooks/use-campaign-contracts";
import type { CampaignContract, ContractStatus } from "@/shared/types";

import {
  SendContractModal,
  type InfluencerOption,
} from "./contracts/send-contract-modal";
import { TemplatePreviewModal } from "./contracts/template-preview-modal";

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

interface ContractsTabProps {
  /**
   * Lista do dashboard — mantida para compat com a screen pai e para passar
   * `username` aos componentes. A fonte de verdade da aba é `/contracts`.
   */
  influencers?: InfluencerOption[];
}

// ---------------------------------------------------------------------------
// Constantes
// ---------------------------------------------------------------------------

const STATUS_FILTERS: Array<{ value: ContractStatus | "all"; label: string }> = [
  { value: "all", label: "Todos os status" },
  { value: "pending", label: "Pendente de envio" },
  { value: "sent", label: "Enviado" },
  { value: "viewed", label: "Visualizado" },
  { value: "signed", label: "Assinado" },
  { value: "rejected", label: "Rejeitado" },
  { value: "expired", label: "Expirado" },
];

const STATUS_BADGE: Record<
  ContractStatus,
  { text: string; bg: string; textColor: string }
> = {
  pending: { text: "Pendente de envio", bg: "bg-neutral-100", textColor: "text-neutral-700" },
  sent: { text: "Enviado", bg: "bg-blue-50", textColor: "text-blue-700" },
  viewed: { text: "Visualizado", bg: "bg-amber-50", textColor: "text-amber-800" },
  signed: { text: "Assinado", bg: "bg-green-50", textColor: "text-green-700" },
  rejected: { text: "Rejeitado", bg: "bg-red-50", textColor: "text-red-700" },
  expired: { text: "Expirado", bg: "bg-orange-50", textColor: "text-orange-700" },
};

const TYPE_LABEL: Record<NonNullable<CampaignContract["contract_type"]>, string> = {
  platform: "Padrão",
  custom: "Upload próprio",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Linha pending = contrato ainda não criado (backend devolve `id: null`). */
function isPendingRow(c: CampaignContract): boolean {
  return c.id === null;
}

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------

export function ContractsTab({ influencers = [] }: ContractsTabProps) {
  const { campaignId } = useParams({
    from: "/(private)/(app)/campaigns/$campaignId",
  });

  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [influencerFilter, setInfluencerFilter] = useState<string>("");
  const [sendModalOpen, setSendModalOpen] = useState(false);
  const [presetCampaignUserId, setPresetCampaignUserId] = useState<string>("");
  const [detail, setDetail] = useState<CampaignContract | null>(null);
  const [templatesModalOpen, setTemplatesModalOpen] = useState(false);

  const queryFilters = useMemo(() => {
    const f: { status?: string } = {};
    // O filtro "pending" é resolvido no frontend (linhas com id: null).
    if (statusFilter !== "all" && statusFilter !== "pending") {
      f.status = statusFilter;
    }
    return f;
  }, [statusFilter]);

  const {
    data: contracts = [],
    isLoading,
    refetch,
  } = useCampaignContracts(campaignId || "", queryFilters);

  const { mutate: resend, isPending: isResending } = useResendContract(
    campaignId || "",
  );
  const { mutate: download, isPending: isDownloading } = useDownloadContract(
    campaignId || "",
  );

  // Templates da plataforma — usados também pelo modal de envio, então o
  // hook já está warm no cache (staleTime 5min). Aqui só consumimos a query.
  const { data: templates = [], isLoading: isLoadingTemplates } =
    useContractTemplates();

  // -----------------------------------------------------------------------
  // Enriquecimento opcional com username vindo do dashboard
  // -----------------------------------------------------------------------
  const usernameByUserId = useMemo(() => {
    const map = new Map<string, string>();
    for (const inf of influencers) {
      if (inf.user_id && inf.username) {
        map.set(String(inf.user_id), inf.username);
      }
    }
    return map;
  }, [influencers]);

  // -----------------------------------------------------------------------
  // Listagem visível (com filtros locais)
  // -----------------------------------------------------------------------
  const visibleRows = useMemo(() => {
    let rows = contracts;

    if (statusFilter === "pending") {
      rows = rows.filter(isPendingRow);
    }
    if (influencerFilter) {
      rows = rows.filter((c) => c.campaign_user_id === influencerFilter);
    }

    // Pending primeiro; depois por data de envio desc.
    return [...rows].sort((a, b) => {
      const aPending = isPendingRow(a) ? 0 : 1;
      const bPending = isPendingRow(b) ? 0 : 1;
      if (aPending !== bPending) return aPending - bPending;
      const aDate = a.sent_at ?? a.created_at ?? "";
      const bDate = b.sent_at ?? b.created_at ?? "";
      return bDate.localeCompare(aDate);
    });
  }, [contracts, statusFilter, influencerFilter]);

  // Candidatos a envio no modal (pending vindos do backend + selecionável atual).
  const sendCandidates: InfluencerOption[] = useMemo(() => {
    return contracts.map((c) => ({
      // No contexto do modal, `id` é o `campaign_user_id` (chave para o payload).
      id: c.campaign_user_id,
      name: c.influencer_name,
      avatar: c.influencer_photo ?? "",
      username:
        c.influencer_id != null
          ? usernameByUserId.get(String(c.influencer_id))
          : undefined,
      status: c.kanban_status ?? undefined,
    }));
  }, [contracts, usernameByUserId]);

  const influencerFilterOptions = useMemo(
    () => [
      { value: "", label: "Todos os influenciadores" },
      ...contracts
        .reduce<Array<{ value: string; label: string }>>((acc, c) => {
          if (acc.some((o) => o.value === c.campaign_user_id)) return acc;
          acc.push({ value: c.campaign_user_id, label: c.influencer_name });
          return acc;
        }, [])
        .sort((a, b) => a.label.localeCompare(b.label)),
    ],
    [contracts],
  );

  // -----------------------------------------------------------------------
  // Handlers
  // -----------------------------------------------------------------------
  const openSendModal = (campaignUserId?: string) => {
    setPresetCampaignUserId(campaignUserId ?? "");
    setSendModalOpen(true);
  };

  const closeSendModal = () => {
    setSendModalOpen(false);
    setPresetCampaignUserId("");
  };

  const handleResend = (contract: CampaignContract) => {
    if (!contract.id) return;
    resend(contract.id, {
      onSuccess: () => {
        toast.success("Contrato reenviado.");
        refetch();
      },
      onError: (e) =>
        toast.error(
          e instanceof Error ? e.message : "Erro ao reenviar contrato.",
        ),
    });
  };

  /**
   * Visualiza o template padrão da plataforma.
   *  - 0 templates: avisa que ainda não há modelo cadastrado.
   *  - 1 template: abre direto em nova aba — evita modal desnecessário.
   *  - 2+ templates: abre modal de seleção para o usuário escolher qual revisar.
   */
  const handleViewTemplate = () => {
    if (isLoadingTemplates) return;
    if (templates.length === 0) {
      toast.info("Nenhum template padrão cadastrado ainda.");
      return;
    }
    if (templates.length === 1) {
      const url = templates[0]?.content;
      if (!url) {
        toast.error("O template padrão não possui URL disponível.");
        return;
      }
      window.open(url, "_blank", "noopener");
      return;
    }
    setTemplatesModalOpen(true);
  };

  const handleDownload = (contract: CampaignContract) => {
    if (!contract.id) return;
    // Quando o backend já entrega a URL direta, abrir nova aba é mais barato
    // (zero round-trip) e mantém o histórico de download no DocuSign.
    if (contract.signed_file_url) {
      window.open(contract.signed_file_url, "_blank", "noopener");
      return;
    }
    const filename = `contrato-${contract.influencer_name
      .toLowerCase()
      .replace(/\s+/g, "-")}.pdf`;
    download(
      { contractId: contract.id, filename },
      {
        onError: (e) =>
          toast.error(
            e instanceof Error ? e.message : "Erro ao baixar contrato.",
          ),
      },
    );
  };

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------
  return (
    <>
      <div className="flex flex-col gap-6">
        {/* Header / filtros */}
        <div className="bg-white rounded-3xl p-6 border border-neutral-200">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex flex-col gap-1">
              <h3 className="text-lg font-semibold text-neutral-950">
                Contratos
              </h3>
              <p className="text-sm text-neutral-500">
                Acompanhe o status dos envelopes e gere novos contratos.
              </p>
            </div>
            <div className="flex flex-wrap items-end gap-3">
              <div className="w-full sm:w-52">
                <Select
                  label="Status"
                  placeholder="Todos os status"
                  options={STATUS_FILTERS}
                  value={statusFilter}
                  onChange={setStatusFilter}
                />
              </div>
              <div className="w-full sm:w-52">
                <Select
                  label="Influenciador"
                  placeholder="Todos os influenciadores"
                  options={influencerFilterOptions}
                  value={influencerFilter}
                  onChange={setInfluencerFilter}
                  isSearchable
                />
              </div>
              <Button
                variant="outline"
                onClick={handleViewTemplate}
                disabled={isLoadingTemplates}
                title="Visualizar o modelo do contrato padrão"
              >
                <span className="inline-flex items-center gap-2">
                  <Icon name="FileText" color="#404040" size={16} />
                  {isLoadingTemplates
                    ? "Carregando..."
                    : "Ver template padrão"}
                </span>
              </Button>
              <Button onClick={() => openSendModal()}>
                <span className="inline-flex items-center gap-2">
                  <Icon name="Send" color="#FAFAFA" size={16} />
                  Enviar contrato
                </span>
              </Button>
            </div>
          </div>
        </div>

        {/* Lista */}
        <div className="bg-white rounded-3xl border border-neutral-200 overflow-hidden">
          {isLoading ? (
            <ContractsTableSkeleton />
          ) : visibleRows.length === 0 ? (
            <EmptyState onSend={() => openSendModal()} />
          ) : (
            <ContractsTable
              rows={visibleRows}
              usernameByUserId={usernameByUserId}
              onSendNow={(campaignUserId) => openSendModal(campaignUserId)}
              onResend={handleResend}
              onDownload={handleDownload}
              onDetails={setDetail}
              isResending={isResending}
              isDownloading={isDownloading}
            />
          )}
        </div>
      </div>

      {/* Modal de envio */}
      {sendModalOpen && (
        <SendContractModal
          campaignId={campaignId || ""}
          influencers={sendCandidates}
          initialInfluencerId={presetCampaignUserId || undefined}
          onClose={closeSendModal}
          onSuccess={refetch}
        />
      )}

      {/* Modal de seleção de templates (só quando há mais de um) */}
      {templatesModalOpen && (
        <TemplatePreviewModal
          templates={templates}
          onClose={() => setTemplatesModalOpen(false)}
        />
      )}

      {/* Modal de detalhes */}
      {detail && (
        <ContractDetailModal
          contract={detail}
          username={
            detail.influencer_id != null
              ? usernameByUserId.get(String(detail.influencer_id))
              : undefined
          }
          onClose={() => setDetail(null)}
          onResend={() => {
            handleResend(detail);
            setDetail(null);
          }}
          onDownload={() => handleDownload(detail)}
          isResending={isResending}
          isDownloading={isDownloading}
        />
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Tabela
// ---------------------------------------------------------------------------

interface ContractsTableProps {
  rows: CampaignContract[];
  usernameByUserId: Map<string, string>;
  onSendNow: (campaignUserId: string) => void;
  onResend: (c: CampaignContract) => void;
  onDownload: (c: CampaignContract) => void;
  onDetails: (c: CampaignContract) => void;
  isResending: boolean;
  isDownloading: boolean;
}

function ContractsTable({
  rows,
  usernameByUserId,
  onSendNow,
  onResend,
  onDownload,
  onDetails,
  isResending,
  isDownloading,
}: ContractsTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead className="bg-neutral-50/80 text-xs font-semibold uppercase tracking-wide text-neutral-500">
          <tr>
            <th className="text-left px-6 py-3">Influenciador</th>
            <th className="text-left px-4 py-3">Tipo</th>
            <th className="text-left px-4 py-3">Status</th>
            <th className="text-left px-4 py-3">Enviado em</th>
            <th className="text-right px-6 py-3">Ações</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-100">
          {rows.map((row) => {
            const username =
              row.influencer_id != null
                ? usernameByUserId.get(String(row.influencer_id))
                : undefined;
            if (isPendingRow(row)) {
              return (
                <PendingRow
                  key={`pending-${row.campaign_user_id}`}
                  contract={row}
                  username={username}
                  onSend={() => onSendNow(row.campaign_user_id)}
                />
              );
            }
            return (
              <ContractRowItem
                key={row.id ?? row.campaign_user_id}
                contract={row}
                username={username}
                onResend={() => onResend(row)}
                onDownload={() => onDownload(row)}
                onDetails={() => onDetails(row)}
                isResending={isResending}
                isDownloading={isDownloading}
              />
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function StatusBadge({ status }: { status: ContractStatus }) {
  const cfg = STATUS_BADGE[status];
  return (
    <Badge
      text={cfg.text}
      backgroundColor={cfg.bg}
      textColor={cfg.textColor}
    />
  );
}

function PendingRow({
  contract,
  username,
  onSend,
}: {
  contract: CampaignContract;
  username?: string;
  onSend: () => void;
}) {
  return (
    <tr className="bg-amber-50/30 hover:bg-amber-50/60 transition-colors">
      <td className="px-6 py-3">
        <div className="flex items-center gap-3 min-w-0">
          <Avatar
            src={contract.influencer_photo ?? undefined}
            alt={contract.influencer_name}
            size="md"
          />
          <div className="min-w-0">
            <p className="font-medium text-neutral-900 truncate">
              {contract.influencer_name}
            </p>
            <p className="text-xs text-neutral-500 truncate">
              {username ? `@${username}` : "—"}
              <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-800">
                Aguardando contrato
              </span>
            </p>
          </div>
        </div>
      </td>
      <td className="px-4 py-3 text-neutral-400">—</td>
      <td className="px-4 py-3">
        <StatusBadge status="pending" />
      </td>
      <td className="px-4 py-3 text-neutral-400">—</td>
      <td className="px-6 py-3 text-right">
        <Button onClick={onSend} className="h-9 px-4 text-xs">
          <span className="inline-flex items-center gap-1.5">
            <Icon name="Send" color="#FAFAFA" size={14} />
            Enviar agora
          </span>
        </Button>
      </td>
    </tr>
  );
}

function ContractRowItem({
  contract,
  username,
  onResend,
  onDownload,
  onDetails,
  isResending,
  isDownloading,
}: {
  contract: CampaignContract;
  username?: string;
  onResend: () => void;
  onDownload: () => void;
  onDetails: () => void;
  isResending: boolean;
  isDownloading: boolean;
}) {
  const showDownload = contract.status === "signed";
  const showResend =
    contract.status === "sent" ||
    contract.status === "viewed" ||
    contract.status === "rejected" ||
    contract.status === "expired";

  return (
    <tr className="hover:bg-neutral-50/60 transition-colors">
      <td className="px-6 py-3">
        <div className="flex items-center gap-3 min-w-0">
          <Avatar
            src={contract.influencer_photo ?? undefined}
            alt={contract.influencer_name}
            size="md"
          />
          <div className="min-w-0">
            <p className="font-medium text-neutral-900 truncate">
              {contract.influencer_name}
            </p>
            <p className="text-xs text-neutral-500 truncate">
              {username ? `@${username}` : "—"}
            </p>
          </div>
        </div>
      </td>
      <td className="px-4 py-3 text-neutral-700">
        {contract.contract_type ? TYPE_LABEL[contract.contract_type] : "—"}
      </td>
      <td className="px-4 py-3">
        <StatusBadge status={contract.status} />
      </td>
      <td className="px-4 py-3 text-neutral-700 whitespace-nowrap">
        {formatDate(contract.sent_at)}
      </td>
      <td className="px-6 py-3">
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="ghost"
            onClick={onDetails}
            className="h-9 px-3 text-xs"
            title="Ver detalhes"
          >
            <span className="inline-flex items-center gap-1.5">
              <Icon name="Eye" color="#525252" size={14} />
              Detalhes
            </span>
          </Button>
          {showDownload && (
            <Button
              variant="outline"
              onClick={onDownload}
              disabled={isDownloading}
              className="h-9 px-3 text-xs"
            >
              <span className="inline-flex items-center gap-1.5">
                <Icon name="Download" color="#404040" size={14} />
                {isDownloading ? "Baixando..." : "Baixar"}
              </span>
            </Button>
          )}
          {showResend && (
            <Button
              variant="outline"
              onClick={onResend}
              disabled={isResending}
              className="h-9 px-3 text-xs"
            >
              <span className="inline-flex items-center gap-1.5">
                <Icon name="Send" color="#404040" size={14} />
                {isResending ? "Reenviando..." : "Reenviar"}
              </span>
            </Button>
          )}
        </div>
      </td>
    </tr>
  );
}

// ---------------------------------------------------------------------------
// Empty / Skeleton
// ---------------------------------------------------------------------------

function ContractsTableSkeleton() {
  return (
    <div className="p-6 flex flex-col gap-3">
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="h-16 w-full rounded-xl bg-neutral-100 animate-pulse"
        />
      ))}
    </div>
  );
}

function EmptyState({ onSend }: { onSend: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 px-6 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-neutral-100">
        <Icon name="FileText" color="#737373" size={24} />
      </div>
      <div className="flex flex-col gap-1">
        <p className="text-base font-semibold text-neutral-900">
          Nenhum contrato por aqui ainda
        </p>
        <p className="text-sm text-neutral-500 max-w-sm">
          Quando você enviar contratos para os influenciadores, eles aparecerão
          aqui com o status em tempo real.
        </p>
      </div>
      <Button onClick={onSend} className="mt-2">
        <span className="inline-flex items-center gap-2">
          <Icon name="Send" color="#FAFAFA" size={16} />
          Enviar primeiro contrato
        </span>
      </Button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Modal de detalhes
// ---------------------------------------------------------------------------

function ContractDetailModal({
  contract,
  username,
  onClose,
  onResend,
  onDownload,
  isResending,
  isDownloading,
}: {
  contract: CampaignContract;
  username?: string;
  onClose: () => void;
  onResend: () => void;
  onDownload: () => void;
  isResending: boolean;
  isDownloading: boolean;
}) {
  const showDownload = contract.status === "signed";
  const showResend =
    contract.status === "sent" ||
    contract.status === "viewed" ||
    contract.status === "rejected" ||
    contract.status === "expired";

  return (
    <Modal
      title="Detalhes do contrato"
      onClose={onClose}
      panelClassName="max-w-2xl"
    >
      <div className="flex flex-col gap-6">
        {/* Cabeçalho */}
        <div className="flex items-center gap-4">
          <Avatar
            src={contract.influencer_photo ?? undefined}
            alt={contract.influencer_name}
            size="lg"
          />
          <div className="flex flex-col gap-1.5">
            <h3 className="text-lg font-semibold text-neutral-950">
              {contract.influencer_name}
            </h3>
            {username && (
              <span className="text-xs text-neutral-500">@{username}</span>
            )}
            <div className="flex items-center gap-2">
              <StatusBadge status={contract.status} />
              {contract.contract_type && (
                <span className="text-xs text-neutral-500">
                  · {TYPE_LABEL[contract.contract_type]}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Timeline / dados */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-2xl border border-neutral-200 p-4">
          <DetailItem label="Enviado em" value={formatDate(contract.sent_at)} />
          <DetailItem
            label="Visualizado em"
            value={formatDate(contract.viewed_at)}
          />
          <DetailItem
            label="Assinado em"
            value={formatDate(contract.signed_at)}
            highlight={contract.status === "signed"}
          />
          <DetailItem
            label="Expira em"
            value={formatDate(contract.expiration_at)}
          />
        </div>

        {/* Signatários */}
        <div className="flex flex-col gap-2 rounded-2xl border border-neutral-200 p-4">
          <p className="text-sm font-semibold text-neutral-900">Signatários</p>
          <div className="flex flex-col gap-1 text-xs text-neutral-600">
            <SignerLine
              label="Influenciador"
              value="Resolvido pelo cadastro do app"
            />
            <SignerLine
              label="Representante da marca"
              value={contract.representative_email}
            />
            <SignerLine
              label="Testemunha 1"
              value={contract.witness_1_email}
            />
            <SignerLine
              label="Testemunha 2"
              value={contract.witness_2_email}
            />
          </div>
        </div>

        {/* Rejeição */}
        {contract.rejection_reason && (
          <div className="rounded-2xl border border-red-200 bg-red-50/60 p-4">
            <p className="text-sm font-semibold text-red-700 mb-1">
              Motivo da rejeição
            </p>
            <p className="text-sm text-red-700">{contract.rejection_reason}</p>
          </div>
        )}

        {/* Envelope */}
        {contract.automation_operation_id && (
          <div className="text-xs text-neutral-500">
            Envelope{" "}
            {contract.automation_provider
              ? `(${contract.automation_provider})`
              : ""}
            :{" "}
            <code className="font-mono text-neutral-700">
              {contract.automation_operation_id}
            </code>
          </div>
        )}

        {/* Ações */}
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end pt-2 border-t border-neutral-100">
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
          {showDownload && (
            <Button onClick={onDownload} disabled={isDownloading}>
              <span className="inline-flex items-center gap-2">
                <Icon name="Download" color="#FAFAFA" size={16} />
                {isDownloading ? "Baixando..." : "Baixar contrato"}
              </span>
            </Button>
          )}
          {showResend && (
            <Button onClick={onResend} disabled={isResending}>
              <span className="inline-flex items-center gap-2">
                <Icon name="Send" color="#FAFAFA" size={16} />
                {isResending ? "Reenviando..." : "Reenviar contrato"}
              </span>
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}

function DetailItem({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
        {label}
      </span>
      <span
        className={
          highlight
            ? "text-sm font-semibold text-green-700"
            : "text-sm text-neutral-800"
        }
      >
        {value}
      </span>
    </div>
  );
}

function SignerLine({
  label,
  value,
}: {
  label: string;
  value?: string | null;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-neutral-500">{label}</span>
      <span className="font-medium text-neutral-800 truncate max-w-[60%]">
        {value || "—"}
      </span>
    </div>
  );
}
