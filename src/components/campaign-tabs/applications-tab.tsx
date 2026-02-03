import { useState, useMemo } from "react";
import { useParams } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/ui/icon";
import { Modal } from "@/components/ui/modal";
import { Avatar } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/text-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { Influencer } from "@/shared/types";
import { useBulkInfluencerActions } from "@/hooks/use-bulk-influencer-actions";
import { useUpdateInfluencerStatus } from "@/hooks/use-campaign-influencers";
import { useNiches } from "@/hooks/use-niches";

interface ApplicationsTabProps {
  influencers: Influencer[];
}

export function ApplicationsTab({ influencers }: ApplicationsTabProps) {
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
    "curation" | "approve" | "reject" | null
  >(null);
  const [bulkRejectionFeedback, setBulkRejectionFeedback] = useState("");
  
  // Estados de filtros
  const [searchTerm, setSearchTerm] = useState("");
  const [filterNiche, setFilterNiche] = useState("");
  const [filterFollowersMin, setFilterFollowersMin] = useState("");
  const [filterFollowersMax, setFilterFollowersMax] = useState("");
  const [filterEngagementMin, setFilterEngagementMin] = useState("");
  const [filterEngagementMax, setFilterEngagementMax] = useState("");

  // Hooks para bulk operations
  const {
    approve: bulkApprove,
    reject: bulkReject,
    isApproving,
    isRejecting,
  } = useBulkInfluencerActions({ campaignId });
  const { mutate: updateStatus, isPending: isUpdatingStatus } = useUpdateInfluencerStatus(campaignId);

  const applicationsInfluencers = influencers.filter(
    (inf) => inf.status === "applications"
  );

  // Filtrar influenciadores baseado nos filtros
  const filteredInfluencers = useMemo(() => {
    return applicationsInfluencers.filter((inf) => {
      // Filtro de busca por nome/username
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const matchesSearch =
          inf.name.toLowerCase().includes(searchLower) ||
          inf.username.toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;
      }

      // Filtro por nicho
      if (filterNiche) {
        if (inf.niche !== filterNiche) return false;
      }

      // Filtro por seguidores
      if (filterFollowersMin) {
        const min = parseInt(filterFollowersMin);
        if (isNaN(min) || inf.followers < min) return false;
      }
      if (filterFollowersMax) {
        const max = parseInt(filterFollowersMax);
        if (isNaN(max) || inf.followers > max) return false;
      }

      // Filtro por engajamento
      if (filterEngagementMin) {
        const min = parseFloat(filterEngagementMin);
        if (isNaN(min) || inf.engagement < min) return false;
      }
      if (filterEngagementMax) {
        const max = parseFloat(filterEngagementMax);
        if (isNaN(max) || inf.engagement > max) return false;
      }

      return true;
    });
  }, [
    applicationsInfluencers,
    searchTerm,
    filterNiche,
    filterFollowersMin,
    filterFollowersMax,
    filterEngagementMin,
    filterEngagementMax,
  ]);

  // Opções de nichos disponíveis
  const nicheOptions = useMemo(() => {
    const uniqueNiches = new Set<string>();
    applicationsInfluencers.forEach((inf) => {
      if (inf.niche) {
        const niche = niches.find((n) => n.id.toString() === inf.niche.toString());
        if (niche) uniqueNiches.add(niche.id.toString());
      }
    });
    return Array.from(uniqueNiches).map((id) => {
      const niche = niches.find((n) => n.id.toString() === id);
      return { value: id, label: niche?.name || id };
    });
  }, [applicationsInfluencers, niches]);

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
    if (selectedInfluencers.size === filteredInfluencers.length) {
      setSelectedInfluencers(new Set());
    } else {
      setSelectedInfluencers(new Set(filteredInfluencers.map((inf) => inf.id)));
    }
  };

  const handleBulkMoveToCuration = () => {
    const influencerIds = Array.from(selectedInfluencers);
    const promises = influencerIds.map((id) =>
      updateStatus(
        {
          influencer_id: id,
          status: "curation",
          feedback: undefined,
        },
        {
          onSuccess: () => {
            // Sucesso individual
          },
          onError: (error: any) => {
            toast.error(`Erro ao mover influenciador ${id}: ${error?.message || "Erro desconhecido"}`);
          },
        }
      )
    );

    Promise.all(promises).then(() => {
      setSelectedInfluencers(new Set());
      setIsBulkActionModalOpen(false);
      setBulkActionType(null);
      toast.success(`${influencerIds.length} influenciador(es) movido(s) para curadoria`);
    });
  };

  const handleBulkApprove = () => {
    const influencerIds = Array.from(selectedInfluencers);
    bulkApprove(
      { influencerIds },
      {
        onSuccess: () => {
          setSelectedInfluencers(new Set());
          setIsBulkActionModalOpen(false);
          setBulkActionType(null);
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

  const handleMoveToCuration = (influencer: Influencer) => {
    updateStatus(
      {
        influencer_id: influencer.id,
        status: "curation",
        feedback: undefined,
      },
      {
        onSuccess: () => {
          toast.success("Influenciador movido para curadoria!");
        },
        onError: (error: any) => {
          toast.error(error?.message || "Erro ao mover influenciador");
        },
      }
    );
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

  const handleBulkAction = () => {
    if (bulkActionType === "curation") {
      handleBulkMoveToCuration();
    } else if (bulkActionType === "approve") {
      handleBulkApprove();
    } else if (bulkActionType === "reject") {
      handleBulkReject();
    }
  };

  return (
    <>
      <div className="flex flex-col gap-6">
        <div className="bg-white rounded-3xl p-6 border border-neutral-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <h3 className="text-lg font-semibold text-neutral-950">
                Inscrições
              </h3>
              <Badge
                text={`${filteredInfluencers.length} de ${applicationsInfluencers.length} perfis`}
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
                    setBulkActionType("curation");
                    setIsBulkActionModalOpen(true);
                  }}
                >
                  <div className="flex items-center gap-2">
                    <Icon name="ArrowRight" color="#404040" size={16} />
                    <span>Mover para Curadoria</span>
                  </div>
                </Button>
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

          {/* Filtros */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-4">
            <div className="xl:col-span-2">
              <Input
                label="Buscar por nome"
                placeholder="Nome ou username..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                icon={<Icon name="Search" color="#737373" size={16} />}
              />
            </div>
            <div>
              <Select
                label="Nicho"
                placeholder="Todos os nichos"
                options={[{ value: "", label: "Todos os nichos" }, ...nicheOptions]}
                value={filterNiche}
                onChange={setFilterNiche}
                isSearchable={true}
              />
            </div>
            <div>
              <Input
                label="Seguidores (mín)"
                type="number"
                placeholder="0"
                value={filterFollowersMin}
                onChange={(e) => setFilterFollowersMin(e.target.value)}
              />
            </div>
            <div>
              <Input
                label="Seguidores (máx)"
                type="number"
                placeholder="∞"
                value={filterFollowersMax}
                onChange={(e) => setFilterFollowersMax(e.target.value)}
              />
            </div>
            <div>
              <Input
                label="Engajamento (mín)"
                type="number"
                placeholder="0"
                value={filterEngagementMin}
                onChange={(e) => setFilterEngagementMin(e.target.value)}
              />
            </div>
            <div>
              <Input
                label="Engajamento (máx)"
                type="number"
                placeholder="100"
                value={filterEngagementMax}
                onChange={(e) => setFilterEngagementMax(e.target.value)}
              />
            </div>
          </div>

          {applicationsInfluencers.length === 0 ? (
            <div className="text-center py-12">
              <Icon name="Users" color="#A3A3A3" size={48} />
              <p className="text-neutral-600 mt-4">
                Nenhuma inscrição no momento
              </p>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 mb-4">
                <Checkbox
                  checked={
                    selectedInfluencers.size === filteredInfluencers.length &&
                    filteredInfluencers.length > 0
                  }
                  onCheckedChange={handleSelectAll}
                />
                <label className="text-sm font-medium text-neutral-950">
                  Selecionar todos ({filteredInfluencers.length})
                </label>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredInfluencers.length === 0 ? (
                  <div className="col-span-full text-center py-12">
                    <Icon name="Search" color="#A3A3A3" size={48} />
                    <p className="text-neutral-600 mt-4">
                      Nenhum influenciador encontrado com os filtros aplicados
                    </p>
                  </div>
                ) : (
                  filteredInfluencers.map((influencer) => (
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
                    <div className="flex flex-col gap-2">
                      <Button
                        variant="outline"
                        onClick={() => handleMoveToCuration(influencer)}
                        className="w-full"
                        disabled={isUpdatingStatus}
                      >
                        <div className="flex items-center gap-2">
                          <Icon name="ArrowRight" color="#404040" size={16} />
                          <span>Mover para Curadoria</span>
                        </div>
                      </Button>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          onClick={() => handleApprove(influencer)}
                          className="flex-1"
                          disabled={isUpdatingStatus}
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
                          disabled={isUpdatingStatus}
                        >
                          <div className="flex items-center gap-2">
                            <Icon name="X" color="#dc2626" size={16} />
                            <span>Reprovar</span>
                          </div>
                        </Button>
                      </div>
                    </div>
                    <Button variant="ghost" className="w-full mt-2 text-sm">
                      <div className="flex items-center gap-2">
                        <Icon name="ExternalLink" color="#404040" size={14} />
                        <span>Ver perfil completo</span>
                      </div>
                    </Button>
                  </div>
                ))
                )}
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
            bulkActionType === "curation"
              ? "Mover influenciadores para curadoria"
              : bulkActionType === "approve"
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
              {bulkActionType === "curation"
                ? `Você está prestes a mover ${selectedInfluencers.size} influenciador(es) para curadoria.`
                : bulkActionType === "approve"
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
                onClick={handleBulkAction}
                disabled={
                  (bulkActionType === "reject" &&
                    !bulkRejectionFeedback.trim()) ||
                  isApproving ||
                  isRejecting ||
                  isUpdatingStatus
                }
                className="flex-1"
              >
                {isApproving || isRejecting || isUpdatingStatus
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
