import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/ui/icon";
import { Modal } from "@/components/ui/modal";
import { Avatar } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/text-area";
import { Checkbox } from "@/components/ui/checkbox";
import type { CampaignContent, AIEvaluation } from "@/shared/types";

interface ContentApprovalTabProps {
  contents: CampaignContent[];
}

export function ContentApprovalTab({ contents }: ContentApprovalTabProps) {
  const [selectedContent, setSelectedContent] = useState<CampaignContent | null>(null);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [rejectionFeedback, setRejectionFeedback] = useState("");
  const [selectedContents, setSelectedContents] = useState<Set<string>>(new Set());
  const [isBulkActionModalOpen, setIsBulkActionModalOpen] = useState(false);
  const [bulkActionType, setBulkActionType] = useState<"approve" | "reject" | null>(null);
  const [bulkRejectionFeedback, setBulkRejectionFeedback] = useState("");

  // Mock de avaliação da IA
  const getAIEvaluation = (contentId: string): AIEvaluation => {
    return {
      score: 85,
      feedback:
        "O conteúdo está bem alinhado com as diretrizes da campanha. Menciona a marca corretamente e usa a hashtag oficial.",
      compliance: {
        mentionsBrand: true,
        usesHashtag: true,
        showsProduct: true,
        followsGuidelines: true,
      },
      suggestions: [
        "Considere adicionar mais informações sobre o produto",
        "O horário de postagem poderia ser otimizado",
      ],
    };
  };

  const pendingContents = contents.filter((content) => content.status === "pending");

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
    if (selectedContents.size === pendingContents.length) {
      setSelectedContents(new Set());
    } else {
      setSelectedContents(new Set(pendingContents.map((content) => content.id)));
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
    // Aqui seria feita a chamada à API
    console.log("Approve content:", content);
  };

  const handleReject = (content: CampaignContent) => {
    setSelectedContent(content);
    setIsRejectModalOpen(true);
  };

  const handleConfirmRejection = () => {
    if (selectedContent && rejectionFeedback.trim()) {
      // Aqui seria feita a chamada à API
      console.log("Reject content:", selectedContent, "Feedback:", rejectionFeedback);
      setIsRejectModalOpen(false);
      setSelectedContent(null);
      setRejectionFeedback("");
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
                text={`${pendingContents.length} conteúdos`}
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

          {pendingContents.length === 0 ? (
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
                  checked={selectedContents.size === pendingContents.length}
                  onCheckedChange={handleSelectAll}
                />
                <label className="text-sm font-medium text-neutral-950">
                  Selecionar todos
                </label>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {pendingContents.map((content) => {
                  const aiEvaluation = getAIEvaluation(content.id);
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

                      {/* Avaliação da IA */}
                      <div className="mb-3 bg-primary-50 rounded-xl p-3">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Icon name="Sparkles" color="#9e2cfa" size={16} />
                            <span className="text-xs font-medium text-primary-900">
                              Avaliação IA
                            </span>
                          </div>
                          <Badge
                            text={`${aiEvaluation.score}%`}
                            backgroundColor="bg-primary-600"
                            textColor="text-neutral-50"
                          />
                        </div>
                        <p className="text-xs text-primary-900 line-clamp-2">
                          {aiEvaluation.feedback}
                        </p>
                        <Button
                          variant="ghost"
                          className="w-full mt-2 text-xs"
                          onClick={() => {
                            setSelectedContent(content);
                            setIsDetailModalOpen(true);
                          }}
                        >
                          Ver avaliação completa
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

                      <div className="flex items-center gap-2 mb-3">
                        <Icon
                          name={getSocialNetworkIcon(content.socialNetwork)}
                          color="#404040"
                          size={16}
                        />
                        <span className="text-sm text-neutral-600">
                          {content.socialNetwork} • {content.contentType}
                        </span>
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
                  disabled={!rejectionFeedback.trim()}
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
          }}
        >
          {isDetailModalOpen && (
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

              {(() => {
                const aiEval = getAIEvaluation(selectedContent.id);
                return (
                  <div className="bg-primary-50 rounded-2xl p-4">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <Icon name="Sparkles" color="#9e2cfa" size={20} />
                        <h4 className="font-semibold text-primary-900">
                          Avaliação da IA
                        </h4>
                      </div>
                      <Badge
                        text={`${aiEval.score}%`}
                        backgroundColor="bg-primary-600"
                        textColor="text-neutral-50"
                      />
                    </div>
                    <p className="text-sm text-primary-900 mb-4">{aiEval.feedback}</p>
                    <div className="grid grid-cols-2 gap-2 mb-4">
                      <div
                        className={`p-2 rounded-lg ${
                          aiEval.compliance.mentionsBrand
                            ? "bg-success-100"
                            : "bg-danger-100"
                        }`}
                      >
                        <p className="text-xs font-medium">
                          {aiEval.compliance.mentionsBrand ? "✓" : "✗"} Menciona marca
                        </p>
                      </div>
                      <div
                        className={`p-2 rounded-lg ${
                          aiEval.compliance.usesHashtag ? "bg-success-100" : "bg-danger-100"
                        }`}
                      >
                        <p className="text-xs font-medium">
                          {aiEval.compliance.usesHashtag ? "✓" : "✗"} Usa hashtag
                        </p>
                      </div>
                      <div
                        className={`p-2 rounded-lg ${
                          aiEval.compliance.showsProduct
                            ? "bg-success-100"
                            : "bg-danger-100"
                        }`}
                      >
                        <p className="text-xs font-medium">
                          {aiEval.compliance.showsProduct ? "✓" : "✗"} Mostra produto
                        </p>
                      </div>
                      <div
                        className={`p-2 rounded-lg ${
                          aiEval.compliance.followsGuidelines
                            ? "bg-success-100"
                            : "bg-danger-100"
                        }`}
                      >
                        <p className="text-xs font-medium">
                          {aiEval.compliance.followsGuidelines ? "✓" : "✗"} Segue diretrizes
                        </p>
                      </div>
                    </div>
                    {aiEval.suggestions.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-primary-900 mb-2">
                          Sugestões:
                        </p>
                        <ul className="list-disc list-inside text-xs text-primary-900">
                          {aiEval.suggestions.map((suggestion, idx) => (
                            <li key={idx}>{suggestion}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                );
              })()}

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => handleApprove(selectedContent)}
                  className="flex-1"
                >
                  <div className="flex items-center gap-2">
                    <Icon name="Check" color="#16a34a" size={16} />
                    <span>Aprovar</span>
                  </div>
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsDetailModalOpen(false);
                    handleReject(selectedContent);
                  }}
                  className="flex-1"
                >
                  <div className="flex items-center gap-2">
                    <Icon name="X" color="#dc2626" size={16} />
                    <span>Reprovar</span>
                  </div>
                </Button>
              </div>
            </div>
          )}
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

