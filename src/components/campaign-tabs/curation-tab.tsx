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
import type { Influencer } from "@/shared/types";
import { useBulkInfluencerActions } from "@/hooks/use-bulk-influencer-actions";
import { useUpdateInfluencerStatus } from "@/hooks/use-campaign-influencers";
import { useNiches } from "@/hooks/use-niches";

interface CurationTabProps {
  influencers: Influencer[];
}

export function CurationTab({ influencers }: CurationTabProps) {
  const { campaignId } = useParams({
    from: "/(private)/(app)/campaigns/$campaignId",
  });
  const { data: niches = [] } = useNiches();
  const [selectedInfluencer, setSelectedInfluencer] =
    useState<Influencer | null>(null);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectionFeedback, setRejectionFeedback] = useState("");
  const [selectedInfluencers, setSelectedInfluencers] = useState<Set<string>>(
    new Set()
  );
  const [isBulkActionModalOpen, setIsBulkActionModalOpen] = useState(false);
  const [bulkActionType, setBulkActionType] = useState<
    "approve" | "reject" | null
  >(null);
  const [bulkRejectionFeedback, setBulkRejectionFeedback] = useState("");

  // Hooks para bulk operations
  const {
    approve: bulkApprove,
    reject: bulkReject,
    isApproving,
    isRejecting,
  } = useBulkInfluencerActions({ campaignId });
  const { mutate: updateStatus } = useUpdateInfluencerStatus(campaignId);

  const curationInfluencers = influencers.filter(
    (inf) => inf.status === "curation"
  );

  const handleSelectInfluencer = (influencerId: string) => {
    setSelectedInfluencers((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(influencerId)) {
        newSet.delete(influencerId);
      } else {
        newSet.add(influencerId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectedInfluencers.size === curationInfluencers.length) {
      setSelectedInfluencers(new Set());
    } else {
      setSelectedInfluencers(new Set(curationInfluencers.map((inf) => inf.id)));
    }
  };

  const handleBulkApprove = () => {
    const influencerIds = Array.from(selectedInfluencers);
    bulkApprove(
      { influencerIds },
      {
        onSuccess: () => {
          setSelectedInfluencers(new Set());
          setIsBulkActionModalOpen(false);
        },
      }
    );
  };

  const handleBulkReject = () => {
    if (bulkRejectionFeedback.trim()) {
      const influencerIds = Array.from(selectedInfluencers);
      bulkReject(
        { influencerIds, feedback: bulkRejectionFeedback },
        {
          onSuccess: () => {
            setSelectedInfluencers(new Set());
            setBulkRejectionFeedback("");
            setIsBulkActionModalOpen(false);
            setBulkActionType(null);
          },
        }
      );
    }
  };

  const handleApprove = (influencer: Influencer) => {
    updateStatus(
      {
        influencer_id: influencer.id,
        status: "approved",
        feedback: "Aprovado pelo usuário",
      },
      {
        onSuccess: () => {
          toast.success("Influenciador aprovado com sucesso!");
        },
        onError: (error: any) => {
          toast.error(error?.message || "Erro ao aprovar influenciador");
        },
      }
    );
  };

  const handleReject = (influencer: Influencer) => {
    setSelectedInfluencer(influencer);
    setIsRejectModalOpen(true);
  };

  const handleConfirmRejection = () => {
    if (selectedInfluencer && rejectionFeedback.trim()) {
      updateStatus(
        {
          influencer_id: selectedInfluencer.id,
          status: "rejected",
          feedback: rejectionFeedback,
        },
        {
          onSuccess: () => {
            toast.success("Influenciador reprovado");
            setIsRejectModalOpen(false);
            setSelectedInfluencer(null);
            setRejectionFeedback("");
          },
          onError: (error: any) => {
            toast.error(error?.message || "Erro ao reprovar influenciador");
          },
        }
      );
    }
  };

  return (
    <>
      <div className="flex flex-col gap-6">
        <div className="bg-white rounded-3xl p-6 border border-neutral-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <h3 className="text-lg font-semibold text-neutral-950">
                Influenciadores em curadoria
              </h3>
              <Badge
                text={`${curationInfluencers.length} perfis`}
                backgroundColor="bg-primary-50"
                textColor="text-primary-900"
              />
              {selectedInfluencers.size > 0 && (
                <Badge
                  text={`${selectedInfluencers.size} selecionado(s)`}
                  backgroundColor="bg-tertiary-50"
                  textColor="text-tertiary-900"
                />
              )}
            </div>
            {selectedInfluencers.size > 0 && (
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

          {curationInfluencers.length === 0 ? (
            <div className="text-center py-12">
              <Icon name="Users" color="#A3A3A3" size={48} />
              <p className="text-neutral-600 mt-4">
                Nenhum influenciador em curadoria no momento
              </p>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 mb-4">
                <Checkbox
                  checked={
                    selectedInfluencers.size === curationInfluencers.length
                  }
                  onCheckedChange={handleSelectAll}
                />
                <label className="text-sm font-medium text-neutral-950">
                  Selecionar todos
                </label>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {curationInfluencers.map((influencer) => (
                  <div
                    key={influencer.id}
                    className={`bg-neutral-50 rounded-2xl p-4 border transition-colors ${
                      selectedInfluencers.has(influencer.id)
                        ? "border-primary-600 bg-primary-50"
                        : "border-neutral-200"
                    }`}
                  >
                    <div className="flex items-start gap-3 mb-3">
                      <Checkbox
                        checked={selectedInfluencers.has(influencer.id)}
                        onCheckedChange={() =>
                          handleSelectInfluencer(influencer.id)
                        }
                      />
                      <Avatar
                        src={influencer.avatar}
                        alt={influencer.name}
                        size="lg"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-base font-semibold text-neutral-950 truncate">
                          {influencer.name}
                        </p>
                        <p className="text-sm text-neutral-600 truncate">
                          @{influencer.username}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-sm mb-3">
                      <span className="text-neutral-600">
                        {influencer.followers.toLocaleString("pt-BR")}{" "}
                        seguidores
                      </span>
                      <span className="text-neutral-600">
                        {influencer.engagement}% engajamento
                      </span>
                    </div>
                    <div className="mb-3">
                      <Badge
                        text={(() => {
                          const nicheId = influencer.niche;
                          if (!nicheId) return "-";
                          const niche = niches.find((n) => n.id.toString() === nicheId.toString());
                          return niche?.name || nicheId;
                        })()}
                        backgroundColor="bg-tertiary-50"
                        textColor="text-tertiary-900"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={() => handleApprove(influencer)}
                        className="flex-1"
                      >
                        <div className="flex items-center gap-2">
                          <Icon name="Check" color="#16a34a" size={16} />
                          <span>Aprovar</span>
                        </div>
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => handleReject(influencer)}
                        className="flex-1"
                      >
                        <div className="flex items-center gap-2">
                          <Icon name="X" color="#dc2626" size={16} />
                          <span>Reprovar</span>
                        </div>
                      </Button>
                    </div>
                    <Button variant="ghost" className="w-full mt-2 text-sm">
                      <div className="flex items-center gap-2">
                        <Icon name="ExternalLink" color="#404040" size={14} />
                        <span>Ver perfil completo</span>
                      </div>
                    </Button>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Modal de reprovação */}
      {selectedInfluencer && isRejectModalOpen && (
        <Modal
          title="Reprovar influenciador"
          onClose={() => {
            setIsRejectModalOpen(false);
            setSelectedInfluencer(null);
            setRejectionFeedback("");
          }}
        >
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-4">
              <Avatar
                src={selectedInfluencer.avatar}
                alt={selectedInfluencer.name}
                size="lg"
              />
              <div>
                <h3 className="text-lg font-semibold text-neutral-950">
                  {selectedInfluencer.name}
                </h3>
                <p className="text-neutral-600">
                  @{selectedInfluencer.username}
                </p>
              </div>
            </div>

            <div className="bg-danger-50 rounded-2xl p-4">
              <p className="text-sm text-danger-900">
                O feedback é obrigatório ao reprovar um influenciador. Ele será
                enviado ao influenciador para que possa entender o motivo da
                reprovação.
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
                  setSelectedInfluencer(null);
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
        </Modal>
      )}

      {/* Modal de ação em massa */}
      {isBulkActionModalOpen && bulkActionType && (
        <Modal
          title={
            bulkActionType === "approve"
              ? "Aprovar influenciadores selecionados"
              : "Reprovar influenciadores selecionados"
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
                ? `Você está prestes a aprovar ${selectedInfluencers.size} influenciador(es).`
                : `Você está prestes a reprovar ${selectedInfluencers.size} influenciador(es).`}
            </p>

            {bulkActionType === "reject" && (
              <>
                <div className="bg-danger-50 rounded-2xl p-4">
                  <p className="text-sm text-danger-900">
                    O feedback é obrigatório ao reprovar influenciadores em
                    massa. Ele será enviado a todos os influenciadores
                    selecionados.
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
                  isApproving ||
                  isRejecting
                }
                className="flex-1"
              >
                {isApproving || isRejecting ? "Processando..." : "Confirmar"}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
