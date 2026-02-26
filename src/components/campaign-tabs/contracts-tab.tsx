import { useState, useMemo } from "react";
import { useParams } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/ui/icon";
import { Modal } from "@/components/ui/modal";
import { Avatar } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { CampaignContract } from "@/shared/types";
import { useCampaignContracts, useContractTemplates, useSendContractTemplate, useResendContract } from "@/hooks/use-campaign-contracts";

interface ContractsTabProps {
  influencers?: Array<{ id: string; name: string; avatar: string }>;
}

export function ContractsTab({ influencers = [] }: ContractsTabProps) {
  const { campaignId } = useParams({ from: "/(private)/(app)/campaigns/$campaignId" });
  
  // Estados de filtros
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>("all");
  
  // Estados de UI
  const [selectedInfluencer, setSelectedInfluencer] = useState<string>("");
  const [isSendModalOpen, setIsSendModalOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [expiresAt, setExpiresAt] = useState("");
  const [selectedContract, setSelectedContract] = useState<CampaignContract | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Buscar contratos com filtros dinâmicos
  const filters = useMemo(() => {
    const filter: { status?: string; influencer_id?: string } = {};
    if (selectedStatusFilter !== "all") {
      filter.status = selectedStatusFilter;
    }
    if (selectedInfluencer) {
      filter.influencer_id = selectedInfluencer;
    }
    return filter;
  }, [selectedStatusFilter, selectedInfluencer]);

  const {
    data: contracts = [],
    isLoading: isLoadingContracts,
    refetch: refetchContracts,
  } = useCampaignContracts(campaignId || "", filters);

  const { data: templates = [], isLoading: isLoadingTemplates } = useContractTemplates();
  const { mutate: sendContract, isPending: isSending } = useSendContractTemplate(campaignId || "");
  const { mutate: resendContract, isPending: isResending } = useResendContract(campaignId || "");

  // Normalizar contratos (garantir compatibilidade com diferentes formatos da API)
  const normalizedContracts = useMemo(() => {
    return contracts.map((contract: any) => ({
      id: contract.id,
      campaign_id: contract.campaign_id,
      influencer_id: contract.influencer_id || contract.influencerId,
      influencerId: contract.influencerId || contract.influencer_id,
      influencer_name: contract.influencer_name || contract.influencerName,
      influencerName: contract.influencerName || contract.influencer_name,
      influencer_avatar: contract.influencer_avatar || contract.influencerAvatar,
      influencerAvatar: contract.influencerAvatar || contract.influencer_avatar,
      template_id: contract.template_id || contract.templateId,
      templateId: contract.templateId || contract.template_id,
      contract_url: contract.contract_url || contract.contractUrl,
      contractUrl: contract.contractUrl || contract.contract_url,
      status: contract.status,
      sent_at: contract.sent_at || contract.sentAt,
      sentAt: contract.sentAt || contract.sent_at,
      viewed_at: contract.viewed_at || contract.viewedAt,
      viewedAt: contract.viewedAt || contract.viewed_at,
      signed_at: contract.signed_at || contract.signedAt,
      signedAt: contract.signedAt || contract.signed_at,
      expires_at: contract.expires_at || contract.expiresAt,
      expiresAt: contract.expiresAt || contract.expires_at,
      rejection_reason: contract.rejection_reason || contract.rejectionReason,
      rejectionReason: contract.rejectionReason || contract.rejection_reason,
    })) as CampaignContract[];
  }, [contracts]);

  const handleSendContract = () => {
    if (!selectedInfluencer) {
      toast.error("Selecione um influenciador");
      return;
    }

    sendContract(
      {
        influencer_id: selectedInfluencer,
        template_id: selectedTemplate || undefined,
        ...(expiresAt && { expires_at: new Date(expiresAt).toISOString() }),
      },
      {
        onSuccess: () => {
          toast.success("Contrato enviado com sucesso!");
          setIsSendModalOpen(false);
          setSelectedInfluencer("");
          setSelectedTemplate("");
          setExpiresAt("");
          refetchContracts();
        },
        onError: (error: any) => {
          toast.error(error?.message || "Erro ao enviar contrato");
        },
      }
    );
  };

  const handleResendContract = (contract: CampaignContract) => {
    resendContract(contract.id, {
      onSuccess: () => {
        toast.success("Contrato reenviado com sucesso!");
        refetchContracts();
      },
      onError: (error: any) => {
        toast.error(error?.message || "Erro ao reenviar contrato");
      },
    });
  };

  const handleOpenDetailModal = (contract: CampaignContract) => {
    setSelectedContract(contract);
    setIsDetailModalOpen(true);
  };

  const getStatusBadge = (status: CampaignContract["status"]) => {
    const statusConfig = {
      pending: { text: "Pendente", bg: "bg-neutral-50", textColor: "text-neutral-900" },
      sent: { text: "Enviado", bg: "bg-blue-50", textColor: "text-blue-900" },
      viewed: { text: "Visualizado", bg: "bg-yellow-50", textColor: "text-yellow-900" },
      signed: { text: "Assinado", bg: "bg-green-50", textColor: "text-green-900" },
      rejected: { text: "Rejeitado", bg: "bg-red-50", textColor: "text-red-900" },
      expired: { text: "Expirado", bg: "bg-orange-50", textColor: "text-orange-900" },
    };

    const config = statusConfig[status] || statusConfig.pending;
    return (
      <Badge
        text={config.text}
        backgroundColor={config.bg}
        textColor={config.textColor}
      />
    );
  };

  const statusOptions = [
    { value: "all", label: "Todos os status" },
    { value: "pending", label: "Pendente" },
    { value: "sent", label: "Enviado" },
    { value: "viewed", label: "Visualizado" },
    { value: "signed", label: "Assinado" },
    { value: "rejected", label: "Rejeitado" },
    { value: "expired", label: "Expirado" },
  ];

  const influencerOptions = [
    { value: "", label: "Todos os influenciadores" },
    ...influencers.map((inf) => ({
      value: inf.id,
      label: inf.name,
    })),
  ];

  const templateOptions = [
    { value: "", label: "Template padrão" },
    ...templates.map((template) => ({
      value: template.id,
      label: template.name,
    })),
  ];

  return (
    <>
      <div className="flex flex-col gap-6">
        {/* Filtros e ações */}
        <div className="bg-white rounded-3xl p-6 border border-neutral-200">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <h3 className="text-lg font-semibold text-neutral-950 shrink-0">
              Contratos
            </h3>
            <div className="flex flex-wrap items-end gap-4">
              <div className="w-full sm:w-48 min-w-0">
                <Select
                  label="Filtrar por status"
                  placeholder="Todos os status"
                  options={statusOptions}
                  value={selectedStatusFilter}
                  onChange={setSelectedStatusFilter}
                />
              </div>
              <div className="w-full sm:w-48 min-w-0">
                <Select
                  label="Filtrar por influenciador"
                  placeholder="Todos os influenciadores"
                  options={influencerOptions}
                  value={selectedInfluencer}
                  onChange={setSelectedInfluencer}
                />
              </div>
              <div className="shrink-0">
                <Button onClick={() => setIsSendModalOpen(true)}>
                  <div className="flex items-center gap-2">
                    <Icon name="Send" color="#FAFAFA" size={16} />
                    <span>Enviar contrato</span>
                  </div>
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Lista de contratos */}
        <div className="bg-white rounded-3xl p-6 border border-neutral-200">
          {isLoadingContracts ? (
            <div className="text-center py-12">
              <p className="text-neutral-600">Carregando contratos...</p>
            </div>
          ) : normalizedContracts.length === 0 ? (
            <div className="text-center py-12">
              <Icon name="FileText" color="#A3A3A3" size={48} />
              <p className="text-neutral-600 mt-4">
                Nenhum contrato encontrado
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {normalizedContracts.map((contract) => (
                <div
                  key={contract.id}
                  className="bg-neutral-50 rounded-2xl p-4 border border-neutral-200"
                >
                  <div className="flex items-start gap-3 mb-3">
                    <Avatar
                      src={contract.influencerAvatar}
                      alt={contract.influencerName}
                      size="lg"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-base font-semibold text-neutral-950 truncate">
                        {contract.influencerName}
                      </p>
                      <div className="mt-1">{getStatusBadge(contract.status)}</div>
                    </div>
                  </div>

                  <div className="space-y-2 mb-3">
                    {contract.sentAt && (
                      <div className="text-xs text-neutral-600">
                        <span className="font-medium">Enviado:</span>{" "}
                        {new Date(contract.sentAt).toLocaleString("pt-BR")}
                      </div>
                    )}
                    {contract.viewedAt && (
                      <div className="text-xs text-neutral-600">
                        <span className="font-medium">Visualizado:</span>{" "}
                        {new Date(contract.viewedAt).toLocaleString("pt-BR")}
                      </div>
                    )}
                    {contract.signedAt && (
                      <div className="text-xs text-green-600 font-medium">
                        <span className="font-medium">Assinado:</span>{" "}
                        {new Date(contract.signedAt).toLocaleString("pt-BR")}
                      </div>
                    )}
                    {contract.expiresAt && (
                      <div className="text-xs text-neutral-600">
                        <span className="font-medium">Expira em:</span>{" "}
                        {new Date(contract.expiresAt).toLocaleString("pt-BR")}
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => handleOpenDetailModal(contract)}
                      className="flex-1"
                    >
                      <div className="flex items-center gap-2">
                        <Icon name="Eye" color="#404040" size={16} />
                        <span>Ver detalhes</span>
                      </div>
                    </Button>
                    {contract.status !== "signed" && contract.status !== "rejected" && (
                      <Button
                        variant="outline"
                        onClick={() => handleResendContract(contract)}
                        disabled={isResending}
                        className="flex-1"
                      >
                        <div className="flex items-center gap-2">
                          <Icon name="Send" color="#404040" size={16} />
                          <span>Reenviar</span>
                        </div>
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal de enviar contrato */}
      {isSendModalOpen && (
        <Modal
          title="Enviar contrato"
          onClose={() => {
            setIsSendModalOpen(false);
            setSelectedInfluencer("");
            setSelectedTemplate("");
            setExpiresAt("");
          }}
        >
          <div className="flex flex-col gap-6">
            <div className="w-full">
              <Select
                label="Influenciador"
                placeholder="Selecione um influenciador"
                options={influencers.map((inf) => ({
                  value: inf.id,
                  label: inf.name,
                }))}
                value={selectedInfluencer}
                onChange={setSelectedInfluencer}
                error={!selectedInfluencer ? "Selecione um influenciador" : undefined}
              />
            </div>

            <div className="w-full">
              <Select
                label="Template (opcional)"
                placeholder="Usar template padrão"
                options={templateOptions}
                value={selectedTemplate}
                onChange={setSelectedTemplate}
                disabled={isLoadingTemplates}
              />
            </div>

            <div className="w-full">
              <Input
                label="Data de expiração (opcional)"
                type="datetime-local"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                min={new Date(Date.now() + 60 * 1000).toISOString().slice(0, 16)}
              />
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setIsSendModalOpen(false);
                  setSelectedInfluencer("");
                  setSelectedTemplate("");
                  setExpiresAt("");
                }}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSendContract}
                disabled={!selectedInfluencer || isSending}
                className="flex-1"
              >
                {isSending ? "Enviando..." : "Enviar contrato"}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal de detalhes do contrato */}
      {selectedContract && isDetailModalOpen && (
        <Modal
          title="Detalhes do contrato"
          onClose={() => {
            setIsDetailModalOpen(false);
            setSelectedContract(null);
          }}
        >
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-4">
              <Avatar
                src={selectedContract.influencerAvatar}
                alt={selectedContract.influencerName}
                size="lg"
              />
              <div>
                <h3 className="text-lg font-semibold text-neutral-950">
                  {selectedContract.influencerName}
                </h3>
                <div className="mt-2">{getStatusBadge(selectedContract.status)}</div>
              </div>
            </div>

            <div className="space-y-3">
              {selectedContract.sentAt && (
                <div>
                  <label className="text-sm font-medium text-neutral-950 mb-1 block">
                    Enviado em:
                  </label>
                  <p className="text-sm text-neutral-600">
                    {new Date(selectedContract.sentAt).toLocaleString("pt-BR")}
                  </p>
                </div>
              )}

              {selectedContract.viewedAt && (
                <div>
                  <label className="text-sm font-medium text-neutral-950 mb-1 block">
                    Visualizado em:
                  </label>
                  <p className="text-sm text-neutral-600">
                    {new Date(selectedContract.viewedAt).toLocaleString("pt-BR")}
                  </p>
                </div>
              )}

              {selectedContract.signedAt && (
                <div>
                  <label className="text-sm font-medium text-green-600 mb-1 block">
                    Assinado em:
                  </label>
                  <p className="text-sm text-green-600 font-medium">
                    {new Date(selectedContract.signedAt).toLocaleString("pt-BR")}
                  </p>
                </div>
              )}

              {selectedContract.expiresAt && (
                <div>
                  <label className="text-sm font-medium text-neutral-950 mb-1 block">
                    Expira em:
                  </label>
                  <p className="text-sm text-neutral-600">
                    {new Date(selectedContract.expiresAt).toLocaleString("pt-BR")}
                  </p>
                </div>
              )}

              {selectedContract.rejectionReason && (
                <div>
                  <label className="text-sm font-medium text-red-600 mb-1 block">
                    Motivo da rejeição:
                  </label>
                  <p className="text-sm text-red-600">
                    {selectedContract.rejectionReason}
                  </p>
                </div>
              )}

              {selectedContract.contractUrl && (
                <div>
                  <label className="text-sm font-medium text-neutral-950 mb-1 block">
                    Link do contrato:
                  </label>
                  <a
                    href={selectedContract.contractUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary-600 hover:underline flex items-center gap-2"
                  >
                    <Icon name="ExternalLink" color="#9e2cfa" size={16} />
                    Abrir contrato
                  </a>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setIsDetailModalOpen(false);
                  setSelectedContract(null);
                }}
                className="flex-1"
              >
                Fechar
              </Button>
              {selectedContract.status !== "signed" && selectedContract.status !== "rejected" && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsDetailModalOpen(false);
                    handleResendContract(selectedContract);
                    setSelectedContract(null);
                  }}
                  disabled={isResending}
                  className="flex-1"
                >
                  {isResending ? "Reenviando..." : "Reenviar contrato"}
                </Button>
              )}
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
