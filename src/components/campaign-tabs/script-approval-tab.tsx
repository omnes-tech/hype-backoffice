import { useState, useMemo } from "react";
import { useParams } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/ui/icon";
import { Modal } from "@/components/ui/modal";
import { Avatar } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/text-area";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select } from "@/components/ui/select";
import type { CampaignScript, CampaignPhase } from "@/shared/types";
import { useCampaignScripts } from "@/hooks/use-campaign-scripts";
import { useApproveScript, useRejectScript } from "@/hooks/use-campaign-scripts";
import { useBulkScriptActions } from "@/hooks/use-bulk-script-actions";

interface ScriptApprovalTabProps {
  campaignPhases?: CampaignPhase[];
}

export function ScriptApprovalTab({ campaignPhases = [] }: ScriptApprovalTabProps) {
  const { campaignId } = useParams({ from: "/(private)/(app)/campaigns/$campaignId" });
  
  // Estados de filtros
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>("pending");
  const [selectedPhaseFilter, setSelectedPhaseFilter] = useState<string>("all");
  const [searchInfluencer, setSearchInfluencer] = useState("");
  
  // Estados de UI
  const [selectedScript, setSelectedScript] = useState<CampaignScript | null>(null);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [rejectionFeedback, setRejectionFeedback] = useState("");
  const [selectedScripts, setSelectedScripts] = useState<Set<string>>(new Set());
  const [isBulkActionModalOpen, setIsBulkActionModalOpen] = useState(false);
  const [bulkActionType, setBulkActionType] = useState<"approve" | "reject" | null>(null);
  const [bulkRejectionFeedback, setBulkRejectionFeedback] = useState("");

  // Buscar roteiros com filtros dinâmicos
  // Nota: A API aceita apenas 'pending', 'approved', 'correction' no filtro
  // Mas os roteiros podem vir com status 'awaiting_approval', então tratamos no frontend
  const filters = useMemo(() => {
    const filter: { status?: string; phase_id?: string } = {};
    // Se o filtro for "pending", não enviamos filtro de status para a API
    // e filtramos no frontend para incluir tanto "pending" quanto "awaiting_approval"
    if (selectedStatusFilter !== "all" && selectedStatusFilter !== "pending") {
      filter.status = selectedStatusFilter;
    }
    if (selectedPhaseFilter !== "all") {
      filter.phase_id = selectedPhaseFilter;
    }
    return filter;
  }, [selectedStatusFilter, selectedPhaseFilter]);

  const {
    data: scripts = [],
    isLoading: isLoadingScripts,
    refetch: refetchScripts,
  } = useCampaignScripts(campaignId || "", filters);

  // Normalizar roteiros conforme formato da API
  const normalizedScripts = useMemo(() => {
    return scripts.map((script: any) => ({
      id: script.id,
      campaign_id: script.campaign_id,
      influencer_id: script.influencer_id,
      influencerId: script.influencer_id,
      influencer_name: script.influencer_name,
      influencerName: script.influencer_name || "",
      influencer_avatar: script.influencer_avatar,
      influencerAvatar: script.influencer_avatar || "",
      social_network: script.social_network,
      script: script.script,
      script_text: script.script,
      scriptText: script.script || "",
      file_url: script.file_url,
      status: script.status,
      phase_id: script.phase_id,
      submitted_at: script.submitted_at,
      submittedAt: script.submitted_at || "",
      approved_at: script.approved_at,
      feedback: script.feedback,
    })) as CampaignScript[];
  }, [scripts]);

  // Filtrar roteiros baseado nos filtros selecionados
  const filteredScripts = useMemo(() => {
    let filtered = normalizedScripts;

    // Filtro por fase já é aplicado na query, mas garantimos aqui também
    if (selectedPhaseFilter !== "all") {
      filtered = filtered.filter((script) => script.phase_id === selectedPhaseFilter);
    }

    // Filtro por status (tratar awaiting_approval como pending)
    if (selectedStatusFilter !== "all") {
      if (selectedStatusFilter === "pending") {
        // Quando filtrar por "pending", incluir também "awaiting_approval"
        filtered = filtered.filter((script) => 
          script.status === "pending" || script.status === "awaiting_approval"
        );
      } else {
        filtered = filtered.filter((script) => script.status === selectedStatusFilter);
      }
    }

    // Filtro por busca de influenciador
    if (searchInfluencer) {
      const searchLower = searchInfluencer.toLowerCase();
      filtered = filtered.filter((script) =>
        (script.influencerName || script.influencer_name || "").toLowerCase().includes(searchLower)
      );
    }

    return filtered;
  }, [normalizedScripts, selectedPhaseFilter, selectedStatusFilter, searchInfluencer]);

  // Hooks para mutations
  const { mutate: approveScript, isPending: isApproving } = useApproveScript(campaignId || "");
  const { mutate: rejectScript, isPending: isRejecting } = useRejectScript(campaignId || "");
  const {
    approve: bulkApprove,
    reject: bulkReject,
    isApproving: isBulkApproving,
    isRejecting: isBulkRejecting,
  } = useBulkScriptActions({ campaignId: campaignId || "" });

  const handleApprove = (script: CampaignScript) => {
    approveScript(
      { script_id: script.id },
      {
        onSuccess: () => {
          toast.success("Roteiro aprovado com sucesso!");
          refetchScripts();
        },
        onError: (error: any) => {
          toast.error(error?.message || "Erro ao aprovar roteiro");
        },
      }
    );
  };

  const handleReject = (script: CampaignScript) => {
    setSelectedScript(script);
    setIsRejectModalOpen(true);
    setRejectionFeedback("");
  };

  const handleConfirmRejection = () => {
    if (!selectedScript) return;

    if (!rejectionFeedback.trim()) {
      toast.error("Feedback é obrigatório para rejeição");
      return;
    }

    rejectScript(
      {
        script_id: selectedScript.id,
        feedback: rejectionFeedback,
      },
      {
        onSuccess: () => {
          toast.success("Roteiro rejeitado com sucesso!");
          setIsRejectModalOpen(false);
          setSelectedScript(null);
          setRejectionFeedback("");
          refetchScripts();
        },
        onError: (error: any) => {
          toast.error(error?.message || "Erro ao rejeitar roteiro");
        },
      }
    );
  };

  const handleSelectScript = (scriptId: string) => {
    setSelectedScripts((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(scriptId)) {
        newSet.delete(scriptId);
      } else {
        newSet.add(scriptId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectedScripts.size === filteredScripts.length) {
      setSelectedScripts(new Set());
    } else {
      setSelectedScripts(new Set(filteredScripts.map((s) => s.id)));
    }
  };

  const handleBulkApprove = () => {
    const scriptIds = Array.from(selectedScripts);
    if (scriptIds.length === 0) {
      toast.error("Selecione pelo menos um roteiro");
      return;
    }

    bulkApprove(scriptIds, {
      onSuccess: () => {
        setSelectedScripts(new Set());
        setIsBulkActionModalOpen(false);
        setBulkActionType(null);
        refetchScripts();
      },
    });
  };

  const handleBulkReject = () => {
    if (!bulkRejectionFeedback.trim()) {
      toast.error("Feedback é obrigatório para reprovação em massa");
      return;
    }

    const scriptIds = Array.from(selectedScripts);
    if (scriptIds.length === 0) {
      toast.error("Selecione pelo menos um roteiro");
      return;
    }

    bulkReject(
      { scriptIds, feedback: bulkRejectionFeedback },
      {
        onSuccess: () => {
          setSelectedScripts(new Set());
          setBulkRejectionFeedback("");
          setIsBulkActionModalOpen(false);
          setBulkActionType(null);
          refetchScripts();
        },
      }
    );
  };

  const handleOpenDetailModal = (script: CampaignScript) => {
    setSelectedScript(script);
    setIsDetailModalOpen(true);
  };

  const getStatusBadge = (status: CampaignScript["status"]) => {
    // Mapear awaiting_approval para pending visualmente
    const normalizedStatus = status === "awaiting_approval" ? "pending" : status;
    
    const statusConfig = {
      pending: { text: "Pendente", bg: "bg-yellow-50", textColor: "text-yellow-900" },
      awaiting_approval: { text: "Pendente", bg: "bg-yellow-50", textColor: "text-yellow-900" },
      approved: { text: "Aprovado", bg: "bg-green-50", textColor: "text-green-900" },
      correction: {
        text: "Correção Solicitada",
        bg: "bg-orange-50",
        textColor: "text-orange-900",
      },
    };

    const config = statusConfig[normalizedStatus] || statusConfig.pending;
    return (
      <Badge
        text={config.text}
        backgroundColor={config.bg}
        textColor={config.textColor}
      />
    );
  };

  const phaseOptions = [
    { value: "all", label: "Todas as fases" },
    ...campaignPhases.map((phase, index) => ({
      value: phase.id,
      label: `Fase ${index + 1}`,
    })),
  ];

  const statusOptions = [
    { value: "all", label: "Todos os status" },
    { value: "pending", label: "Pendente" },
    { value: "approved", label: "Aprovado" },
    { value: "correction", label: "Correção Solicitada" },
  ];

  return (
    <>
      <div className="flex flex-col gap-6">
        {/* Filtros */}
        <div className="bg-white rounded-3xl p-6 border border-neutral-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <h3 className="text-lg font-semibold text-neutral-950">
                Aprovações de roteiro
              </h3>
              <Badge
                text={`${filteredScripts.length} de ${normalizedScripts.length} roteiro(s)`}
                backgroundColor="bg-primary-50"
                textColor="text-primary-900"
              />
              {selectedScripts.size > 0 && (
                <Badge
                  text={`${selectedScripts.size} selecionado(s)`}
                  backgroundColor="bg-tertiary-50"
                  textColor="text-tertiary-900"
                />
              )}
            </div>
          </div>
          <div className="flex items-center gap-4 mb-4 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <Input
                label="Buscar por influenciador"
                placeholder="Nome do influenciador..."
                value={searchInfluencer}
                onChange={(e) => setSearchInfluencer(e.target.value)}
                icon={<Icon name="Search" color="#737373" size={16} />}
              />
            </div>
            <div className="w-48">
              <Select
                label="Filtrar por fase"
                placeholder="Todas as fases"
                options={phaseOptions}
                value={selectedPhaseFilter}
                onChange={setSelectedPhaseFilter}
              />
            </div>
            <div className="w-48">
              <Select
                label="Filtrar por status"
                placeholder="Todos os status"
                options={statusOptions}
                value={selectedStatusFilter}
                onChange={setSelectedStatusFilter}
              />
            </div>
          </div>

          {selectedScripts.size > 0 && (
            <div className="flex items-center justify-end pt-4 border-t border-neutral-200">
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setBulkActionType("approve");
                    setIsBulkActionModalOpen(true);
                  }}
                >
                  <div className="flex items-center gap-2">
                    <Icon name="Check" color="#16a34a" size={16} />
                    <span>Aprovar selecionados</span>
                  </div>
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setBulkActionType("reject");
                    setIsBulkActionModalOpen(true);
                  }}
                >
                  <div className="flex items-center gap-2">
                    <Icon name="X" color="#dc2626" size={16} />
                    <span>Reprovar selecionados</span>
                  </div>
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Lista de roteiros */}
        <div className="bg-white rounded-3xl p-6 border border-neutral-200">
          {isLoadingScripts ? (
            <div className="text-center py-12">
              <p className="text-neutral-600">Carregando roteiros...</p>
            </div>
          ) : filteredScripts.length === 0 ? (
            <div className="text-center py-12">
              <Icon name="FileText" color="#A3A3A3" size={48} />
              <p className="text-neutral-600 mt-4">
                Nenhum roteiro encontrado
              </p>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 mb-4">
                <Checkbox
                  checked={selectedScripts.size === filteredScripts.length}
                  onCheckedChange={handleSelectAll}
                />
                <label className="text-sm font-medium text-neutral-950">
                  Selecionar todos
                </label>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredScripts.map((script) => (
                  <div
                    key={script.id}
                    className={`bg-neutral-50 rounded-2xl p-4 border transition-colors ${
                      selectedScripts.has(script.id)
                        ? "border-primary-600 bg-primary-50"
                        : "border-neutral-200"
                    }`}
                  >
                    <div className="flex items-start gap-3 mb-3">
                      <Checkbox
                        checked={selectedScripts.has(script.id)}
                        onCheckedChange={() => handleSelectScript(script.id)}
                      />
                      <Avatar
                        src={script.influencerAvatar || ""}
                        alt={script.influencerName || script.influencer_name || ""}
                        size="lg"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-base font-semibold text-neutral-950 truncate">
                          {script.influencerName || script.influencer_name || "Sem nome"}
                        </p>
                        <p className="text-sm text-neutral-600 truncate">
                          @{(script.influencerName || script.influencer_name || "").split(" ")[0]}
                        </p>
                      </div>
                    </div>

                    <div className="mb-3">
                      {getStatusBadge(script.status)}
                    </div>

                    <div className="mb-3">
                      <p className="text-xs text-neutral-500 mb-1">Roteiro:</p>
                      <p className="text-sm text-neutral-950 line-clamp-3">
                        {script.script || script.scriptText || script.script_text || "Sem texto"}
                      </p>
                    </div>
                    {script.file_url && (
                      <div className="mb-3">
                        <a
                          href={script.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-primary-600 hover:text-primary-700 flex items-center gap-1"
                        >
                          <Icon name="File" color="#2563eb" size={14} />
                          <span>Ver arquivo anexado</span>
                        </a>
                      </div>
                    )}

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={() => handleApprove(script)}
                        className="flex-1"
                        disabled={isApproving || isRejecting}
                      >
                        <div className="flex items-center gap-2">
                          <Icon name="Check" color="#16a34a" size={16} />
                          <span>Aprovar</span>
                        </div>
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => handleReject(script)}
                        className="flex-1"
                        disabled={isApproving || isRejecting}
                      >
                        <div className="flex items-center gap-2">
                          <Icon name="X" color="#dc2626" size={16} />
                          <span>Reprovar</span>
                        </div>
                      </Button>
                    </div>
                    <Button
                      variant="ghost"
                      className="w-full mt-2 text-sm"
                      onClick={() => handleOpenDetailModal(script)}
                    >
                      <div className="flex items-center gap-2">
                        <Icon name="ExternalLink" color="#404040" size={14} />
                        <span>Ver roteiro completo</span>
                      </div>
                    </Button>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Modal de detalhes do roteiro */}
      {selectedScript && isDetailModalOpen && (
        <Modal
          title="Roteiro completo"
          onClose={() => {
            setIsDetailModalOpen(false);
            setSelectedScript(null);
          }}
        >
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-4">
              <Avatar
                src={selectedScript.influencerAvatar || ""}
                alt={selectedScript.influencerName || selectedScript.influencer_name || ""}
                size="lg"
              />
              <div>
                <h3 className="text-lg font-semibold text-neutral-950">
                  {selectedScript.influencerName || selectedScript.influencer_name || "Sem nome"}
                </h3>
                <div className="mt-2">{getStatusBadge(selectedScript.status)}</div>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-neutral-950 mb-2 block">
                Roteiro:
              </label>
              <div className="bg-neutral-50 rounded-2xl p-4 max-h-96 overflow-y-auto">
                <p className="text-sm text-neutral-950 whitespace-pre-wrap">
                  {selectedScript.script || selectedScript.scriptText || selectedScript.script_text || "Sem texto"}
                </p>
              </div>
            </div>

            {selectedScript.file_url && (
              <div>
                <label className="text-sm font-medium text-neutral-950 mb-2 block">
                  Arquivo anexado:
                </label>
                <a
                  href={selectedScript.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-2"
                >
                  <Icon name="File" color="#2563eb" size={16} />
                  <span>Baixar arquivo</span>
                </a>
              </div>
            )}

            {selectedScript.social_network && (
              <div>
                <label className="text-sm font-medium text-neutral-950 mb-2 block">
                  Rede social:
                </label>
                <p className="text-sm text-neutral-600 capitalize">
                  {selectedScript.social_network}
                </p>
              </div>
            )}

            {selectedScript.feedback && (
              <div>
                <label className="text-sm font-medium text-neutral-950 mb-2 block">
                  Feedback:
                </label>
                <div className="bg-warning-50 rounded-2xl p-4">
                  <p className="text-sm text-warning-900">
                    {selectedScript.feedback}
                  </p>
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setIsDetailModalOpen(false);
                  setSelectedScript(null);
                }}
                className="flex-1"
              >
                Fechar
              </Button>
              <Button
                onClick={() => {
                  setIsDetailModalOpen(false);
                  handleApprove(selectedScript);
                }}
                className="flex-1"
                disabled={isApproving || isRejecting}
              >
                Aprovar
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setIsDetailModalOpen(false);
                  handleReject(selectedScript);
                }}
                className="flex-1"
                disabled={isApproving || isRejecting}
              >
                Reprovar
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal de reprovação */}
      {selectedScript && isRejectModalOpen && (
        <Modal
          title="Reprovar roteiro"
          onClose={() => {
            setIsRejectModalOpen(false);
            setSelectedScript(null);
            setRejectionFeedback("");
          }}
        >
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-4">
              <Avatar
                src={selectedScript.influencerAvatar || ""}
                alt={selectedScript.influencerName || selectedScript.influencer_name || ""}
                size="lg"
              />
              <div>
                <h3 className="text-lg font-semibold text-neutral-950">
                  {selectedScript.influencerName || selectedScript.influencer_name || "Sem nome"}
                </h3>
              </div>
            </div>

            <div className="bg-danger-50 rounded-2xl p-4">
              <p className="text-sm text-danger-900">
                O feedback é obrigatório ao reprovar um roteiro. Ele será enviado
                ao influenciador para que possa entender o motivo da reprovação.
              </p>
            </div>

            <Textarea
              label="Feedback de reprovação"
              placeholder="Explique o motivo da reprovação..."
              value={rejectionFeedback}
              onChange={(e) => setRejectionFeedback(e.target.value)}
              error={
                !rejectionFeedback.trim()
                  ? "Este campo é obrigatório"
                  : undefined
              }
            />


            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setIsRejectModalOpen(false);
                  setSelectedScript(null);
                  setRejectionFeedback("");
                }}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleConfirmRejection}
                disabled={!rejectionFeedback.trim() || isRejecting}
                className="flex-1"
              >
                {isRejecting ? "Processando..." : "Confirmar reprovação"}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal de ação em massa */}
      {isBulkActionModalOpen && bulkActionType && (
        <Modal
          title={
            bulkActionType === "approve"
              ? "Aprovar roteiros selecionados"
              : "Reprovar roteiros selecionados"
          }
          onClose={() => {
            setIsBulkActionModalOpen(false);
            setBulkActionType(null);
            setBulkRejectionFeedback("");
          }}
        >
          <div className="flex flex-col gap-6">
            <p className="text-sm text-neutral-600">
              {bulkActionType === "approve"
                ? `Você está prestes a aprovar ${selectedScripts.size} roteiro(s).`
                : `Você está prestes a reprovar ${selectedScripts.size} roteiro(s).`}
            </p>

            {bulkActionType === "reject" && (
              <>
                <div className="bg-danger-50 rounded-2xl p-4">
                  <p className="text-sm text-danger-900">
                    O feedback é obrigatório ao reprovar roteiros em massa. Ele
                    será enviado a todos os influenciadores selecionados.
                  </p>
                </div>
                <Textarea
                  label="Feedback de reprovação"
                  placeholder="Explique o motivo da reprovação..."
                  value={bulkRejectionFeedback}
                  onChange={(e) => setBulkRejectionFeedback(e.target.value)}
                  error={
                    !bulkRejectionFeedback.trim()
                      ? "Este campo é obrigatório"
                      : undefined
                  }
                />
              </>
            )}

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setIsBulkActionModalOpen(false);
                  setBulkActionType(null);
                  setBulkRejectionFeedback("");
                }}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                onClick={
                  bulkActionType === "approve"
                    ? handleBulkApprove
                    : handleBulkReject
                }
                disabled={
                  (bulkActionType === "reject" &&
                    !bulkRejectionFeedback.trim()) ||
                  isBulkApproving ||
                  isBulkRejecting
                }
                className="flex-1"
              >
                {isBulkApproving || isBulkRejecting
                  ? "Processando..."
                  : "Confirmar"}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
