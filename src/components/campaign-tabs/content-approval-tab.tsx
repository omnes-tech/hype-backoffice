import { useState } from "react";
import { useParams } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/ui/icon";
import { Modal } from "@/components/ui/modal";
import { Avatar } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/text-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Select } from "@/components/ui/select";
import type { CampaignContent, AIEvaluation, CampaignPhase } from "@/shared/types";
import { useApproveContent, useRejectContent } from "@/hooks/use-campaign-contents";
import { getContentEvaluation } from "@/shared/services/content";

interface ExtendedCampaignContent extends CampaignContent {
  phaseId?: string;
}

interface ContentApprovalTabProps {
  contents: CampaignContent[];
  campaignPhases?: CampaignPhase[];
}

export function ContentApprovalTab({ contents, campaignPhases = [] }: ContentApprovalTabProps) {
  const { campaignId } = useParams({ from: "/(private)/(app)/campaigns/$campaignId" });
  const [selectedContent, setSelectedContent] = useState<ExtendedCampaignContent | null>(null);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [rejectionFeedback, setRejectionFeedback] = useState("");
  const [selectedContents, setSelectedContents] = useState<Set<string>>(new Set());
  const [isBulkActionModalOpen, setIsBulkActionModalOpen] = useState(false);
  const [bulkActionType, setBulkActionType] = useState<"approve" | "reject" | null>(null);
  const [bulkRejectionFeedback, setBulkRejectionFeedback] = useState("");
  const [selectedPhaseFilter, setSelectedPhaseFilter] = useState<string>("all");
  const [aiEvaluation, setAiEvaluation] = useState<AIEvaluation | null>(null);
  const [isLoadingEvaluation, setIsLoadingEvaluation] = useState(false);

  // Hooks para mutations
  const { mutate: approveContent, isPending: isApproving } = useApproveContent(campaignId);
  const { mutate: rejectContent, isPending: isRejecting } = useRejectContent(campaignId);

  // Buscar avaliação da IA quando modal de detalhes abrir
  const getAIEvaluation = async (contentId: string) => {
    setIsLoadingEvaluation(true);
    try {
      const evaluation = await getContentEvaluation(campaignId, contentId);
      if (evaluation) {
        // Transformar resposta da API para formato AIEvaluation
        setAiEvaluation({
          score: evaluation.score,
          feedback: evaluation.recommendations?.join(". ") || "Avaliação disponível",
          compliance: {
            mentionsBrand: evaluation.criteria?.relevance ? evaluation.criteria.relevance >= 7 : false,
            usesHashtag: evaluation.criteria?.relevance ? evaluation.criteria.relevance >= 7 : false,
            showsProduct: evaluation.criteria?.quality ? evaluation.criteria.quality >= 7 : false,
            followsGuidelines: evaluation.criteria?.engagement ? evaluation.criteria.engagement >= 7 : false,
          },
          suggestions: evaluation.recommendations || [],
        });
      } else {
        setAiEvaluation(null);
      }
    } catch (error) {
      console.error("Erro ao buscar avaliação da IA:", error);
      setAiEvaluation(null);
    } finally {
      setIsLoadingEvaluation(false);
    }
  };

  // Extend contents with phase information
  const extendedContents: ExtendedCampaignContent[] = contents.map((content, index) => ({
    ...content,
    phaseId: campaignPhases.length > 0 ? campaignPhases[index % campaignPhases.length].id : undefined,
  }));

  const pendingContents = extendedContents.filter((content) => content.status === "pending");

  const filteredPendingContents =
    selectedPhaseFilter === "all"
      ? pendingContents
      : pendingContents.filter((content) => content.phaseId === selectedPhaseFilter);

  const phaseOptions = [
    { value: "all", label: "Todas as fases" },
    ...campaignPhases.map((phase, index) => ({
      value: phase.id,
      label: `Fase ${index + 1}`,
    })),
  ];

  const getPhaseLabel = (phaseId?: string) => {
    if (!phaseId) return "Sem fase";
    const phaseIndex = campaignPhases.findIndex((p) => p.id === phaseId);
    return phaseIndex >= 0 ? `Fase ${phaseIndex + 1}` : "Sem fase";
  };

  const handleSelectContent = (contentId: string) => {
    setSelectedContents((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(contentId)) {
        newSet.delete(contentId);
      } else {
        newSet.add(contentId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectedContents.size === filteredPendingContents.length) {
      setSelectedContents(new Set());
    } else {
      setSelectedContents(new Set(filteredPendingContents.map((content) => content.id)));
    }
  };

  const handleBulkApprove = () => {
    console.log("Bulk approve:", Array.from(selectedContents));
    setSelectedContents(new Set());
    setIsBulkActionModalOpen(false);
  };

  const handleBulkReject = () => {
    if (bulkRejectionFeedback.trim()) {
      console.log("Bulk reject:", Array.from(selectedContents), bulkRejectionFeedback);
      setSelectedContents(new Set());
      setBulkRejectionFeedback("");
      setIsBulkActionModalOpen(false);
      setBulkActionType(null);
    }
  };

  const handleApprove = (content: CampaignContent) => {
    approveContent(
      { content_id: content.id },
      {
        onSuccess: () => {
          toast.success("Conteúdo aprovado com sucesso!");
          setSelectedContent(null);
        },
        onError: (error: any) => {
          toast.error(error?.message || "Erro ao aprovar conteúdo");
        },
      }
    );
  };

  const handleReject = (content: CampaignContent) => {
    setSelectedContent(content);
    setIsRejectModalOpen(true);
  };

  const handleConfirmRejection = () => {
    if (selectedContent && rejectionFeedback.trim()) {
      rejectContent(
        {
          content_id: selectedContent.id,
          feedback: rejectionFeedback,
        },
        {
          onSuccess: () => {
            toast.success("Conteúdo reprovado");
            setIsRejectModalOpen(false);
            setSelectedContent(null);
            setRejectionFeedback("");
          },
          onError: (error: any) => {
            toast.error(error?.message || "Erro ao reprovar conteúdo");
          },
        }
      );
    }
  };

  const getSocialNetworkIcon = (network: string) => {
    const icons: { [key: string]: keyof typeof import("lucide-react").icons } = {
      instagram: "Instagram",
      youtube: "Youtube",
      tiktok: "Music",
      facebook: "Facebook",
      twitter: "Twitter",
    };
    return icons[network] || "Share2";
  };

  return (
    <>
      <div className="flex flex-col gap-6">
        <div className="bg-white rounded-3xl p-6 border border-neutral-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <h3 className="text-lg font-semibold text-neutral-950">
                Conteúdos pendentes de aprovação
              </h3>
              <Badge
                text={`${filteredPendingContents.length} conteúdos`}
                backgroundColor="bg-warning-50"
                textColor="text-warning-900"
              />
              {selectedContents.size > 0 && (
                <Badge
                  text={`${selectedContents.size} selecionado(s)`}
                  backgroundColor="bg-tertiary-50"
                  textColor="text-tertiary-900"
                />
              )}
            </div>
            <div className="flex items-center gap-4">
              {campaignPhases.length > 0 && (
                <div className="w-48">
                  <Select
                    placeholder="Filtrar por fase"
                    options={phaseOptions}
                    value={selectedPhaseFilter}
                    onChange={setSelectedPhaseFilter}
                  />
                </div>
              )}
            </div>
            {selectedContents.size > 0 && (
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
            )}
          </div>

          {filteredPendingContents.length === 0 ? (
            <div className="text-center py-12">
              <Icon name="FileCheck" color="#A3A3A3" size={48} />
              <p className="text-neutral-600 mt-4">
                Nenhum conteúdo pendente de aprovação
              </p>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 mb-4">
                <Checkbox
                  checked={selectedContents.size === filteredPendingContents.length && filteredPendingContents.length > 0}
                  onCheckedChange={handleSelectAll}
                />
                <label className="text-sm font-medium text-neutral-950">
                  Selecionar todos
                </label>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredPendingContents.map((content) => {
                  return (
                    <div
                      key={content.id}
                      className={`bg-neutral-50 rounded-2xl p-4 border transition-colors ${
                        selectedContents.has(content.id)
                          ? "border-primary-600 bg-primary-50"
                          : "border-neutral-200"
                      }`}
                    >
                      <div className="flex items-start gap-2 mb-3">
                        <Checkbox
                          checked={selectedContents.has(content.id)}
                          onCheckedChange={() => handleSelectContent(content.id)}
                        />
                        <div className="flex items-center gap-3 flex-1">
                          <Avatar
                            src={content.influencerAvatar}
                            alt={content.influencerName}
                            size="md"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-neutral-950 truncate">
                              {content.influencerName}
                            </p>
                            <p className="text-xs text-neutral-600">
                              {new Date(content.submittedAt).toLocaleDateString("pt-BR")}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Avaliação da IA - será carregada quando necessário */}
                      <div className="mb-3 bg-primary-50 rounded-xl p-3">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Icon name="Sparkles" color="#9e2cfa" size={16} />
                            <span className="text-xs font-medium text-primary-900">
                              Avaliação IA
                            </span>
                          </div>
                          <Badge
                            text="Ver detalhes"
                            backgroundColor="bg-primary-600"
                            textColor="text-neutral-50"
                          />
                        </div>
                        <p className="text-xs text-primary-900 line-clamp-2">
                          Clique em "Ver avaliação completa" para ver os detalhes da avaliação da IA
                        </p>
                        <Button
                          variant="ghost"
                          className="w-full mt-2 text-xs"
                          onClick={() => {
                            setSelectedContent(content);
                            setIsDetailModalOpen(true);
                            getAIEvaluation(content.id);
                          }}
                          disabled={isLoadingEvaluation}
                        >
                          {isLoadingEvaluation ? "Carregando..." : "Ver avaliação completa"}
                        </Button>
                      </div>

                      <div className="mb-3 rounded-xl overflow-hidden bg-neutral-200 aspect-video">
                        {content.previewUrl ? (
                          <img
                            src={content.previewUrl}
                            alt="Preview"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Icon name="Image" color="#A3A3A3" size={32} />
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Icon
                            name={getSocialNetworkIcon(content.socialNetwork)}
                            color="#404040"
                            size={16}
                          />
                          <span className="text-sm text-neutral-600">
                            {content.socialNetwork} • {content.contentType}
                          </span>
                        </div>
                        {content.phaseId && (
                          <Badge
                            text={getPhaseLabel(content.phaseId)}
                            backgroundColor="bg-tertiary-600"
                            textColor="text-neutral-50"
                          />
                        )}
                      </div>

                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          onClick={() => handleApprove(content)}
                          className="flex-1"
                        >
                          <div className="flex items-center gap-2">
                            <Icon name="Check" color="#16a34a" size={16} />
                            <span>Aprovar</span>
                          </div>
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => handleReject(content)}
                          className="flex-1"
                        >
                          <div className="flex items-center gap-2">
                            <Icon name="X" color="#dc2626" size={16} />
                            <span>Reprovar</span>
                          </div>
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Modal de reprovação */}
      {selectedContent && (
        <Modal
          title="Reprovar conteúdo"
          onClose={() => {
            setIsRejectModalOpen(false);
            setSelectedContent(null);
            setRejectionFeedback("");
          }}
        >
          {isRejectModalOpen && (
            <div className="flex flex-col gap-6">
              <div className="flex items-center gap-4">
                <Avatar
                  src={selectedContent.influencerAvatar}
                  alt={selectedContent.influencerName}
                  size="lg"
                />
                <div>
                  <h3 className="text-lg font-semibold text-neutral-950">
                    {selectedContent.influencerName}
                  </h3>
                  <p className="text-neutral-600">
                    {selectedContent.socialNetwork} • {selectedContent.contentType}
                  </p>
                </div>
              </div>

              <div className="rounded-xl overflow-hidden bg-neutral-200 aspect-video">
                {selectedContent.previewUrl ? (
                  <img
                    src={selectedContent.previewUrl}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Icon name="Image" color="#A3A3A3" size={48} />
                  </div>
                )}
              </div>

              <div className="bg-danger-50 rounded-2xl p-4">
                <p className="text-sm text-danger-900">
                  O feedback é obrigatório ao reprovar um conteúdo. Ele será enviado ao
                  influenciador para que possa fazer as correções necessárias.
                </p>
              </div>

              <Textarea
                label="Feedback de reprovação"
                placeholder="Explique o que precisa ser ajustado no conteúdo..."
                value={rejectionFeedback}
                onChange={(e) => setRejectionFeedback(e.target.value)}
                error={
                  !rejectionFeedback.trim() ? "Este campo é obrigatório" : undefined
                }
              />

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsRejectModalOpen(false);
                    setSelectedContent(null);
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
                  Confirmar reprovação
                </Button>
              </div>
            </div>
          )}
        </Modal>
      )}

      {/* Modal de detalhes com avaliação IA completa */}
      {selectedContent && isDetailModalOpen && (
        <Modal
          title="Avaliação completa do conteúdo"
          onClose={() => {
            setIsDetailModalOpen(false);
            setSelectedContent(null);
            setAiEvaluation(null);
          }}
        >
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-4">
              <Avatar
                src={selectedContent.influencerAvatar}
                alt={selectedContent.influencerName}
                size="lg"
              />
              <div>
                <h3 className="text-lg font-semibold text-neutral-950">
                  {selectedContent.influencerName}
                </h3>
                <p className="text-neutral-600">
                  {selectedContent.socialNetwork} • {selectedContent.contentType}
                </p>
              </div>
            </div>

            <div className="rounded-xl overflow-hidden bg-neutral-200 aspect-video">
              {selectedContent.previewUrl ? (
                <img
                  src={selectedContent.previewUrl}
                  alt="Preview"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Icon name="Image" color="#A3A3A3" size={48} />
                </div>
              )}
            </div>

            <div>
              <h4 className="text-sm font-semibold text-neutral-950 mb-3">
                Avaliação da IA
              </h4>
              {isLoadingEvaluation ? (
                <div className="bg-neutral-50 rounded-2xl p-4 text-center">
                  <p className="text-neutral-600">Carregando avaliação...</p>
                </div>
              ) : aiEvaluation ? (
                <div className="bg-primary-50 rounded-2xl p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Icon name="Sparkles" color="#9e2cfa" size={20} />
                      <h4 className="font-semibold text-primary-900">
                        Avaliação da IA
                      </h4>
                    </div>
                    <Badge
                      text={`${aiEvaluation.score}%`}
                      backgroundColor="bg-primary-600"
                      textColor="text-neutral-50"
                    />
                  </div>
                  <p className="text-sm text-primary-900 mb-4">{aiEvaluation.feedback}</p>
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    <div
                      className={`p-2 rounded-lg ${
                        aiEvaluation.compliance.mentionsBrand
                          ? "bg-success-100"
                          : "bg-danger-100"
                      }`}
                    >
                      <p className="text-xs font-medium">
                        {aiEvaluation.compliance.mentionsBrand ? "✓" : "✗"} Menciona marca
                      </p>
                    </div>
                    <div
                      className={`p-2 rounded-lg ${
                        aiEvaluation.compliance.usesHashtag ? "bg-success-100" : "bg-danger-100"
                      }`}
                    >
                      <p className="text-xs font-medium">
                        {aiEvaluation.compliance.usesHashtag ? "✓" : "✗"} Usa hashtag
                      </p>
                    </div>
                    <div
                      className={`p-2 rounded-lg ${
                        aiEvaluation.compliance.showsProduct
                          ? "bg-success-100"
                          : "bg-danger-100"
                      }`}
                    >
                      <p className="text-xs font-medium">
                        {aiEvaluation.compliance.showsProduct ? "✓" : "✗"} Mostra produto
                      </p>
                    </div>
                    <div
                      className={`p-2 rounded-lg ${
                        aiEvaluation.compliance.followsGuidelines
                          ? "bg-success-100"
                          : "bg-danger-100"
                      }`}
                    >
                      <p className="text-xs font-medium">
                        {aiEvaluation.compliance.followsGuidelines ? "✓" : "✗"} Segue diretrizes
                      </p>
                    </div>
                  </div>
                  {aiEvaluation.suggestions && aiEvaluation.suggestions.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-primary-900 mb-2">
                        Sugestões:
                      </p>
                      <ul className="list-disc list-inside text-xs text-primary-900">
                        {aiEvaluation.suggestions.map((suggestion: string, idx: number) => (
                          <li key={idx}>{suggestion}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-neutral-50 rounded-2xl p-4 text-center">
                  <p className="text-neutral-600">Avaliação da IA não disponível</p>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => handleApprove(selectedContent)}
                disabled={isApproving}
                className="flex-1"
              >
                <div className="flex items-center gap-2">
                  <Icon name="Check" color="#16a34a" size={16} />
                  <span>{isApproving ? "Aprovando..." : "Aprovar"}</span>
                </div>
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setIsDetailModalOpen(false);
                  handleReject(selectedContent);
                }}
                disabled={isRejecting}
                className="flex-1"
              >
                <div className="flex items-center gap-2">
                  <Icon name="X" color="#dc2626" size={16} />
                  <span>Reprovar</span>
                </div>
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
              ? "Aprovar conteúdos selecionados"
              : "Reprovar conteúdos selecionados"
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
                ? `Você está prestes a aprovar ${selectedContents.size} conteúdo(s).`
                : `Você está prestes a reprovar ${selectedContents.size} conteúdo(s).`}
            </p>

            {bulkActionType === "reject" && (
              <>
                <div className="bg-danger-50 rounded-2xl p-4">
                  <p className="text-sm text-danger-900">
                    O feedback é obrigatório ao reprovar conteúdos em massa. Ele será
                    enviado a todos os influenciadores dos conteúdos selecionados.
                  </p>
                </div>
                <Textarea
                  label="Feedback de reprovação"
                  placeholder="Explique o que precisa ser ajustado..."
                  value={bulkRejectionFeedback}
                  onChange={(e) => setBulkRejectionFeedback(e.target.value)}
                  error={
                    !bulkRejectionFeedback.trim() ? "Este campo é obrigatório" : undefined
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
                  bulkActionType === "approve" ? handleBulkApprove : handleBulkReject
                }
                disabled={bulkActionType === "reject" && !bulkRejectionFeedback.trim()}
                className="flex-1"
              >
                Confirmar
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}

