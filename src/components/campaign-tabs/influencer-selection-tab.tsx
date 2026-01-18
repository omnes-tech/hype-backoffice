import { useState, useMemo } from "react";
import { useParams } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Modal } from "@/components/ui/modal";
import { Avatar } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/text-area";
import { Checkbox } from "@/components/ui/checkbox";
import type { Influencer } from "@/shared/types";
import { useCampaignRecommendations } from "@/hooks/use-catalog";
import { useInfluencersCatalog } from "@/hooks/use-catalog";
import { useMuralStatus, useActivateMural } from "@/hooks/use-campaign-mural";
import { useInviteInfluencer, useUpdateInfluencerStatus } from "@/hooks/use-campaign-influencers";
import { useCampaignUsers } from "@/hooks/use-campaign-users";
import { validateMuralEndDate, formatDateForInput, addDays } from "@/shared/utils/date-validations";
import { ListSelector } from "@/components/influencer-lists/list-selector";

interface ExtendedInfluencer extends Influencer {
  socialNetwork?: string;
  ageRange?: string;
  location?: {
    country?: string;
    state?: string;
    city?: string;
  };
  recommendationReason?: string;
}

interface InfluencerSelectionTabProps {
  influencers: Influencer[];
  campaignPhases?: Array<{ id: string; label: string; publish_date?: string }>;
}

export function InfluencerSelectionTab({
  influencers: _influencers,
  campaignPhases: _campaignPhases = [],
}: InfluencerSelectionTabProps) {
  const { campaignId } = useParams({ from: "/(private)/(app)/campaigns/$campaignId" });
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterNiche, setFilterNiche] = useState("");
  const [filterSocialNetwork, setFilterSocialNetwork] = useState("");
  const [filterAgeRange, setFilterAgeRange] = useState("");
  const [filterGender, setFilterGender] = useState("");
  const [filterFollowersMin, setFilterFollowersMin] = useState("");
  const [filterFollowersMax, setFilterFollowersMax] = useState("");
  const [filterLocationCountry, setFilterLocationCountry] = useState("");
  const [filterLocationState, setFilterLocationState] = useState("");
  const [filterLocationCity, setFilterLocationCity] = useState("");
  const [showMuralDateModal, setShowMuralDateModal] = useState(false);
  const [selectedInfluencer, setSelectedInfluencer] = useState<ExtendedInfluencer | null>(null);
  const [modalType, setModalType] = useState<
    "discover" | "invite" | "curation" | "selectList" | null
  >(null);
  const [inviteMessage, setInviteMessage] = useState("");
  const [curationNotes, setCurationNotes] = useState("");
  const [tempMuralEndDate, setTempMuralEndDate] = useState("");

  // Hooks para dados reais
  const { data: muralStatus } = useMuralStatus(campaignId);
  const { mutate: activateMural, isPending: isActivatingMural } = useActivateMural(campaignId);
  const { data: recommendations = [], isLoading: isLoadingRecommendations } = useCampaignRecommendations(campaignId);
  const { data: catalogData = [], isLoading: isLoadingCatalog } = useInfluencersCatalog({
    social_network: filterSocialNetwork || undefined,
    age_range: filterAgeRange || undefined,
    gender: filterGender || undefined,
    followers_min: filterFollowersMin ? parseInt(filterFollowersMin) : undefined,
    followers_max: filterFollowersMax ? parseInt(filterFollowersMax) : undefined,
    niche: filterNiche || undefined,
    country: filterLocationCountry || undefined,
    state: filterLocationState || undefined,
    city: filterLocationCity || undefined,
  });
  const { mutate: inviteInfluencer, isPending: isInviting } = useInviteInfluencer(campaignId);
  const { mutate: updateStatus, isPending: isUpdatingStatus } = useUpdateInfluencerStatus(campaignId);
  const { data: campaignUsers = [] } = useCampaignUsers(campaignId);

  const isMuralActive = muralStatus?.active || false;
  const muralEndDate = muralStatus?.end_date || "";

  // Função para verificar se um influenciador está em curadoria
  const isInfluencerInCuration = (influencerId: string | number): boolean => {
    const influencerIdStr = String(influencerId);
    const influencerIdNum = typeof influencerId === "string" ? parseInt(influencerId, 10) : influencerId;
    
    const campaignUser = campaignUsers.find((user) => {
      // Verificar por user_id (influencerId)
      if (user.user_id) {
        const userId = typeof user.user_id === "string" ? parseInt(user.user_id, 10) : user.user_id;
        if (userId === influencerIdNum) {
          return true;
        }
      }
      // Verificar por id (campaignUserId) - caso o influencer.id seja o campaignUserId
      const campaignUserId = typeof user.id === "string" ? parseInt(String(user.id), 10) : Number(user.id);
      if (campaignUserId === influencerIdNum || String(user.id) === influencerIdStr) {
        return true;
      }
      return false;
    });

    if (!campaignUser) {
      return false;
    }

    // Normalizar status para comparação
    const status = campaignUser.status?.toLowerCase() || "";
    return status === "curation" || status === "curadoria";
  };

  // Transformar recomendações para formato ExtendedInfluencer
  const recommendedInfluencers: ExtendedInfluencer[] = useMemo(() => {
    return recommendations.map((rec: any) => ({
      id: rec.influencer.id,
      name: rec.influencer.name,
      username: rec.influencer.username || "",
      avatar: rec.influencer.avatar || "",
      followers: rec.influencer.followers || 0,
      engagement: rec.influencer.engagement || 0,
      niche: rec.influencer.niche || "",
      socialNetwork: rec.influencer.social_network,
      recommendationReason: rec.reason,
    }));
  }, [recommendations]);

  // Transformar catálogo para formato ExtendedInfluencer
  const catalogInfluencers: ExtendedInfluencer[] = useMemo(() => {
    return catalogData.map((inf: any) => ({
      id: inf.id,
      name: inf.name,
      username: inf.username || "",
      avatar: inf.avatar || "",
      followers: inf.followers || 0,
      engagement: inf.engagement || 0,
      niche: inf.niche || "",
      socialNetwork: inf.social_network,
      ageRange: inf.age_range,
      location: inf.location,
    }));
  }, [catalogData]);

  // Filtros são aplicados no backend via useInfluencersCatalog
  // Apenas filtro de busca local para recomendações
  const filteredRecommended = useMemo(() => {
    if (!searchTerm) return recommendedInfluencers;
    const searchLower = searchTerm.toLowerCase();
    return recommendedInfluencers.filter((inf) => {
      return (
        inf.name.toLowerCase().includes(searchLower) ||
        inf.username.toLowerCase().includes(searchLower)
      );
    });
  }, [recommendedInfluencers, searchTerm]);

  // Catálogo já vem filtrado do backend, apenas busca local
  const filteredCatalog = useMemo(() => {
    if (!searchTerm) return catalogInfluencers;
    const searchLower = searchTerm.toLowerCase();
    return catalogInfluencers.filter((inf) => {
      return (
        inf.name.toLowerCase().includes(searchLower) ||
        inf.username.toLowerCase().includes(searchLower)
      );
    });
  }, [catalogInfluencers, searchTerm]);

  // Extrair opções de filtros dos dados do catálogo
  const niches = useMemo(() => {
    const allNiches = new Set<string>();
    catalogInfluencers.forEach((inf) => {
      if (inf.niche) allNiches.add(inf.niche);
    });
    return Array.from(allNiches);
  }, [catalogInfluencers]);

  const socialNetworks = useMemo(() => {
    const allNetworks = new Set<string>();
    catalogInfluencers.forEach((inf) => {
      if (inf.socialNetwork) allNetworks.add(inf.socialNetwork);
    });
    return Array.from(allNetworks);
  }, [catalogInfluencers]);

  const ageRanges = useMemo(() => {
    const allRanges = new Set<string>();
    catalogInfluencers.forEach((inf) => {
      if (inf.ageRange) allRanges.add(inf.ageRange);
    });
    return Array.from(allRanges);
  }, [catalogInfluencers]);

  const countries = useMemo(() => {
    const allCountries = new Set<string>();
    catalogInfluencers.forEach((inf) => {
      if (inf.location?.country) allCountries.add(inf.location.country);
    });
    return Array.from(allCountries);
  }, [catalogInfluencers]);

  const states = useMemo(() => {
    const allStates = new Set<string>();
    catalogInfluencers.forEach((inf) => {
      if (inf.location?.state) allStates.add(inf.location.state);
    });
    return Array.from(allStates);
  }, [catalogInfluencers]);

  const cities = useMemo(() => {
    const allCities = new Set<string>();
    catalogInfluencers.forEach((inf) => {
      if (inf.location?.city) allCities.add(inf.location.city);
    });
    return Array.from(allCities);
  }, [catalogInfluencers]);

  const handleMuralToggle = (checked: boolean) => {
    if (checked) {
      setShowMuralDateModal(true);
    } else {
      // Only allow deactivation if end date has passed
      if (muralEndDate && new Date(muralEndDate) > new Date()) {
        toast.error("Não é possível desativar o mural antes da data limite");
        return;
      }
      // Deactivation handled by backend
    }
  };

  const handleActivateMural = () => {
    if (!tempMuralEndDate) {
      toast.error("Por favor, selecione uma data limite");
      return;
    }

    activateMural(
      { end_date: tempMuralEndDate },
      {
        onSuccess: () => {
          toast.success("Mural ativado com sucesso!");
          setShowMuralDateModal(false);
          setTempMuralEndDate("");
        },
        onError: (error: any) => {
          toast.error(error?.message || "Erro ao ativar mural");
        },
      }
    );
  };

  const getSocialNetworkIcon = (network?: string) => {
    const icons: { [key: string]: keyof typeof import("lucide-react").icons } = {
      instagram: "Instagram",
      youtube: "Youtube",
      tiktok: "Music",
      facebook: "Facebook",
      twitter: "Twitter",
    };
    return icons[network || ""] || "Share2";
  };

  const getSocialNetworkLabel = (network?: string) => {
    const labels: { [key: string]: string } = {
      instagram: "Instagram",
      youtube: "YouTube",
      tiktok: "TikTok",
      facebook: "Facebook",
      twitter: "Twitter",
    };
    return labels[network || ""] || network || "N/A";
  };

  const handleAction = (influencer: Influencer, action: "discover" | "invite" | "curation") => {
    setSelectedInfluencer(influencer);
    setModalType(action);
  };

  const handleCloseModal = () => {
    setModalType(null);
    setSelectedInfluencer(null);
    setInviteMessage("");
    setCurationNotes("");
  };

  const handleConfirm = async () => {
    if (!selectedInfluencer) return;

    if (modalType === "invite") {
      inviteInfluencer(
        {
          influencer_id: selectedInfluencer.id,
          message: inviteMessage || undefined,
        },
        {
          onSuccess: () => {
            // Invalidar queries para atualizar os dados automaticamente
            queryClient.invalidateQueries({
              queryKey: ["campaigns", campaignId, "influencers"],
            });
            queryClient.invalidateQueries({
              queryKey: ["campaigns", campaignId, "dashboard"],
            });
            queryClient.invalidateQueries({
              queryKey: ["campaigns", campaignId, "users"],
            });
            toast.success("Influenciador convidado com sucesso!");
            handleCloseModal();
          },
          onError: (error: any) => {
            toast.error(error?.message || "Erro ao convidar influenciador");
          },
        }
      );
    } else if (modalType === "curation") {
      // Tenta atualizar o status primeiro (caso o influenciador já esteja na campanha)
      updateStatus(
        {
          influencer_id: selectedInfluencer.id,
          status: "curation",
          feedback: curationNotes || undefined,
        },
        {
          onSuccess: () => {
            // Invalidar queries para atualizar os dados automaticamente
            queryClient.invalidateQueries({
              queryKey: ["campaigns", campaignId, "influencers"],
            });
            queryClient.invalidateQueries({
              queryKey: ["campaigns", campaignId, "dashboard"],
            });
            queryClient.invalidateQueries({
              queryKey: ["campaigns", campaignId, "users"],
            });
            toast.success("Influenciador adicionado para curadoria!");
            handleCloseModal();
          },
          onError: (error: any) => {
            // Se o erro for que o influenciador não está na campanha, adiciona primeiro
            const errorMessage = error?.message || "";
            if (
              errorMessage.includes("não encontrado") ||
              errorMessage.includes("not found") ||
              errorMessage.includes("não está") ||
              errorMessage.includes("not in")
            ) {
              // Adiciona o influenciador à campanha primeiro
              inviteInfluencer(
                {
                  influencer_id: selectedInfluencer.id,
                  message: undefined,
                },
                {
                  onSuccess: () => {
                    // Após adicionar, atualiza o status para "curation"
                    updateStatus(
                      {
                        influencer_id: selectedInfluencer.id,
                        status: "curation",
                        feedback: curationNotes || undefined,
                      },
                      {
                        onSuccess: () => {
                          // Invalidar queries para atualizar os dados automaticamente
                          queryClient.invalidateQueries({
                            queryKey: ["campaigns", campaignId, "influencers"],
                          });
                          queryClient.invalidateQueries({
                            queryKey: ["campaigns", campaignId, "dashboard"],
                          });
                          queryClient.invalidateQueries({
                            queryKey: ["campaigns", campaignId, "users"],
                          });
                          toast.success("Influenciador adicionado para curadoria!");
                          handleCloseModal();
                        },
                        onError: (updateError: any) => {
                          toast.error(updateError?.message || "Erro ao atualizar status para curadoria");
                        },
                      }
                    );
                  },
                  onError: (inviteError: any) => {
                    toast.error(inviteError?.message || "Erro ao adicionar influenciador à campanha");
                  },
                }
              );
            } else {
              toast.error(errorMessage || "Erro ao adicionar influenciador para curadoria");
            }
          },
        }
      );
    } else {
      // Outras ações (discover) podem ser implementadas aqui
      handleCloseModal();
    }
  };

  return (
    <>
      <div className="flex flex-col gap-6">
        {/* Controles principais */}
        <div className="bg-white rounded-3xl p-6 border border-neutral-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={isMuralActive}
                  onCheckedChange={(checked) => handleMuralToggle(checked === true)}
                  disabled={isMuralActive && muralEndDate ? new Date(muralEndDate) > new Date() : false}
                />
                <label className="text-sm font-medium text-neutral-950">
                  Ativar Mural
                </label>
              </div>
              <Badge
                text={
                  isMuralActive
                    ? muralEndDate
                      ? `Mural Ativo até ${new Date(muralEndDate).toLocaleDateString("pt-BR")}`
                      : "Mural Ativo"
                    : "Mural Inativo"
                }
                backgroundColor={isMuralActive ? "bg-success-50" : "bg-neutral-100"}
                textColor={isMuralActive ? "text-success-900" : "text-neutral-600"}
              />
              {isMuralActive && muralEndDate && new Date(muralEndDate) > new Date() && (
                <p className="text-xs text-neutral-600">
                  O mural não pode ser desativado até a data limite
                </p>
              )}
            </div>
            <Button
              variant="outline"
              style={{ width: '20%' }}
              onClick={() => setModalType("selectList")}
            >
              <div className="flex items-center gap-2">
                <Icon name="List" color="#404040" size={16} />
                <span>Selecionar lista</span>
              </div>
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Buscar influenciador"
              placeholder="Nome ou @username"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              icon={<Icon name="Search" color="#A3A3A3" size={20} />}
            />
            <Select
              label="Filtrar por nicho"
              placeholder="Todos os nichos"
              options={niches.map((niche) => ({ value: niche, label: niche }))}
              value={filterNiche}
              onChange={setFilterNiche}
            />
          </div>
        </div>

        {/* Recomendações */}
        <div className="bg-white rounded-3xl p-6 border border-neutral-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-neutral-950">
              Recomendações automáticas
            </h3>
            <Badge
              text={`${filteredRecommended.length} perfis encontrados`}
              backgroundColor="bg-primary-50"
              textColor="text-primary-900"
            />
          </div>
          {isLoadingRecommendations ? (
            <div className="text-center py-8">
              <p className="text-neutral-600">Carregando recomendações...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredRecommended.map((influencer) => (
              <div
                key={influencer.id}
                className="bg-neutral-50 rounded-2xl p-4 border border-neutral-200"
              >
                <div className="flex items-center gap-3 mb-3">
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
                <div className="flex items-center gap-2 mb-3">
                  <Icon
                    name={getSocialNetworkIcon(influencer.socialNetwork)}
                    color="#404040"
                    size={16}
                  />
                  <span className="text-sm text-neutral-600">
                    {getSocialNetworkLabel(influencer.socialNetwork)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm mb-3">
                  <span className="text-neutral-600">
                    {influencer.followers.toLocaleString("pt-BR")} seguidores
                  </span>
                  <span className="text-neutral-600">
                    {influencer.engagement}% engajamento
                  </span>
                </div>
                <div className="mb-3">
                  <Badge
                    text={influencer.niche}
                    backgroundColor="bg-tertiary-50"
                    textColor="text-tertiary-900"
                  />
                </div>
                {influencer.recommendationReason && (
                  <div className="mb-3 bg-primary-50 rounded-xl p-3">
                    <p className="text-xs font-medium text-primary-900 mb-1">Por que recomendamos:</p>
                    <p className="text-xs text-primary-900">{influencer.recommendationReason}</p>
                  </div>
                )}
                <div className="flex flex-col gap-2">
                  <div className={`grid gap-2 ${isInfluencerInCuration(influencer.id) ? "grid-cols-1" : "grid-cols-2"}`}>
                    {!isInfluencerInCuration(influencer.id) && (
                      <Button
                        variant="outline"
                        onClick={() => handleAction(influencer, "invite")}
                      >
                        <span>Convidar</span>
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      onClick={() => handleAction(influencer, "curation")}
                    >
                      <span>Curadoria</span>
                    </Button>
                  </div>
                  <Button variant="ghost" className="text-sm">
                    <div className="flex items-center gap-2">
                      <Icon name="ExternalLink" color="#404040" size={14} />
                      <span>Ver perfil completo</span>
                    </div>
                  </Button>
                </div>
              </div>
              ))}
            </div>
          )}
          {!isLoadingRecommendations && filteredRecommended.length === 0 && (
            <div className="text-center py-12">
              <p className="text-neutral-600">Nenhum influenciador encontrado</p>
            </div>
          )}
        </div>

        {/* Catálogo de influenciadores */}
        <div className="bg-white rounded-3xl p-6 border border-neutral-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-neutral-950">
              Catálogo de influenciadores
            </h3>
            <Badge
              text={`${filteredCatalog.length} perfis encontrados`}
              backgroundColor="bg-primary-50"
              textColor="text-primary-900"
            />
          </div>
          
          {/* Filtros do catálogo */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            <Select
              label="Rede social"
              placeholder="Todas as redes"
              options={socialNetworks.map((network) => ({
                value: network,
                label: getSocialNetworkLabel(network),
              }))}
              value={filterSocialNetwork}
              onChange={setFilterSocialNetwork}
            />
            <Select
              label="Faixa etária"
              placeholder="Todas as faixas"
              options={ageRanges.map((range) => ({
                value: range,
                label: range,
              }))}
              value={filterAgeRange}
              onChange={setFilterAgeRange}
            />
            <Select
              label="Gênero"
              placeholder="Todos"
              options={[
                { value: "all", label: "Todos" },
                { value: "male", label: "Masculino" },
                { value: "female", label: "Feminino" },
              ]}
              value={filterGender}
              onChange={setFilterGender}
            />
            <Input
              label="Seguidores (de)"
              placeholder="Mínimo"
              type="number"
              value={filterFollowersMin}
              onChange={(e) => setFilterFollowersMin(e.target.value)}
            />
            <Input
              label="Seguidores (até)"
              placeholder="Máximo"
              type="number"
              value={filterFollowersMax}
              onChange={(e) => setFilterFollowersMax(e.target.value)}
            />
            <Select
              label="Nicho"
              placeholder="Todos os nichos"
              options={niches.map((niche) => ({ value: niche, label: niche }))}
              value={filterNiche}
              onChange={setFilterNiche}
            />
            <Select
              label="País"
              placeholder="Todos os países"
              options={countries.map((country) => ({
                value: country,
                label: country,
              }))}
              value={filterLocationCountry}
              onChange={setFilterLocationCountry}
            />
            <Select
              label="Estado"
              placeholder="Todos os estados"
              options={states.map((state) => ({
                value: state,
                label: state,
              }))}
              value={filterLocationState}
              onChange={setFilterLocationState}
            />
            <Select
              label="Cidade"
              placeholder="Todas as cidades"
              options={cities.map((city) => ({
                value: city,
                label: city,
              }))}
              value={filterLocationCity}
              onChange={setFilterLocationCity}
            />
          </div>

          {isLoadingCatalog ? (
            <div className="text-center py-8">
              <p className="text-neutral-600">Carregando catálogo...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredCatalog.map((influencer) => (
              <div
                key={influencer.id}
                className="bg-neutral-50 rounded-2xl p-4 border border-neutral-200"
              >
                <div className="flex items-center gap-3 mb-3">
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
                <div className="flex items-center gap-2 mb-3">
                  <Icon
                    name={getSocialNetworkIcon(influencer.socialNetwork)}
                    color="#404040"
                    size={16}
                  />
                  <span className="text-sm text-neutral-600">
                    {getSocialNetworkLabel(influencer.socialNetwork)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm mb-3">
                  <span className="text-neutral-600">
                    {influencer.followers.toLocaleString("pt-BR")} seguidores
                  </span>
                  <span className="text-neutral-600">
                    {influencer.engagement}% engajamento
                  </span>
                </div>
                <div className="mb-3">
                  <Badge
                    text={influencer.niche}
                    backgroundColor="bg-tertiary-50"
                    textColor="text-tertiary-900"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <div className={`grid gap-2 ${isInfluencerInCuration(influencer.id) ? "grid-cols-1" : "grid-cols-2"}`}>
                    {!isInfluencerInCuration(influencer.id) && (
                      <Button
                        variant="outline"
                        onClick={() => handleAction(influencer, "invite")}
                      >
                        <span>Convidar</span>
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      onClick={() => handleAction(influencer, "curation")}
                    >
                      <span>Curadoria</span>
                    </Button>
                  </div>
                  <Button variant="ghost" className="text-sm">
                    <div className="flex items-center gap-2">
                      <Icon name="ExternalLink" color="#404040" size={14} />
                      <span>Ver perfil completo</span>
                    </div>
                  </Button>
                </div>
              </div>
              ))}
            </div>
          )}
          {!isLoadingCatalog && filteredCatalog.length === 0 && (
            <div className="text-center py-12">
              <p className="text-neutral-600">Nenhum influenciador encontrado no catálogo</p>
            </div>
          )}
        </div>
      </div>

      {/* Modais */}
      {selectedInfluencer && modalType && (
        <Modal
          title={
            modalType === "discover"
              ? "Ativar Discover"
              : modalType === "invite"
              ? "Convidar para campanha"
              : "Adicionar para curadoria"
          }
          onClose={handleCloseModal}
        >
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-4">
              <Avatar
                src={selectedInfluencer?.avatar || ""}
                alt={selectedInfluencer?.name || ""}
                size="lg"
              />
              <div>
                <h3 className="text-lg font-semibold text-neutral-950">
                  {selectedInfluencer?.name}
                </h3>
                <p className="text-neutral-600">@{selectedInfluencer?.username}</p>
              </div>
            </div>

            {modalType === "discover" && (
              <div className="bg-primary-50 rounded-2xl p-4">
                <p className="text-sm text-primary-900">
                  O Discover permite que este influenciador encontre sua campanha
                  automaticamente através de recomendações baseadas no perfil dele.
                </p>
              </div>
            )}

            {modalType === "invite" && (
              <div className="flex flex-col gap-4">
                <Textarea
                  label="Mensagem de convite"
                  placeholder="Escreva uma mensagem personalizada para o influenciador..."
                  value={inviteMessage}
                  onChange={(e) => setInviteMessage(e.target.value)}
                />
              </div>
            )}

            {modalType === "curation" && (
              <div className="flex flex-col gap-4">
                <Textarea
                  label="Notas para curadoria"
                  placeholder="Adicione observações sobre este influenciador..."
                  value={curationNotes}
                  onChange={(e) => setCurationNotes(e.target.value)}
                />
              </div>
            )}

            {modalType !== "selectList" && (
              <div className="flex gap-3">
                <Button variant="outline" onClick={handleCloseModal} className="flex-1">
                  Cancelar
                </Button>
                <Button onClick={handleConfirm} className="flex-1" disabled={isInviting || isUpdatingStatus}>
                  {isInviting || isUpdatingStatus 
                    ? "Processando..." 
                    : modalType === "invite" 
                      ? "Enviar convite" 
                      : modalType === "curation"
                        ? "Adicionar para curadoria"
                        : "Confirmar"}
                </Button>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Modal de seleção de lista */}
      {modalType === "selectList" && (
        <ListSelector
          campaignId={campaignId}
          onClose={handleCloseModal}
        />
      )}

      {/* Modal de data limite do mural */}
      {showMuralDateModal && (() => {
        const phase1Date = _campaignPhases?.[0]?.publish_date || "";
        const validation = tempMuralEndDate 
          ? validateMuralEndDate(tempMuralEndDate, phase1Date)
          : { valid: true };
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const minDate = formatDateForInput(addDays(today, 1));
        const maxDate = validation.maxDate;

        return (
          <Modal
            title="Definir data limite do mural (Ativar Descobrir)"
            onClose={() => {
              setShowMuralDateModal(false);
              setTempMuralEndDate("");
            }}
          >
            <div className="flex flex-col gap-6">
              <p className="text-sm text-neutral-600">
                Defina até quando o mural ficará visível para os influenciadores. A data limite precisa ser maior que a data atual e pelo menos 7 dias menor que a data prevista da fase 1.
              </p>
              <Input
                label="Data limite para receber inscrições"
                type="date"
                value={tempMuralEndDate}
                onChange={(e) => setTempMuralEndDate(e.target.value)}
                min={minDate}
                max={maxDate}
                error={validation.error}
              />
              {phase1Date && (
                <p className="text-xs text-neutral-500">
                  Data da fase 1: {new Date(phase1Date).toLocaleDateString("pt-BR")} | 
                  Data máxima permitida: {maxDate ? new Date(maxDate).toLocaleDateString("pt-BR") : "N/A"}
                </p>
              )}
              {tempMuralEndDate && validation.valid && (
                <div className="bg-primary-50 rounded-2xl p-4">
                  <p className="text-sm text-primary-900">
                    O mural ficará ativo até{" "}
                    <strong>{new Date(tempMuralEndDate).toLocaleDateString("pt-BR")}</strong> e não poderá ser desativado antes desta data.
                  </p>
                </div>
              )}
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowMuralDateModal(false);
                    setTempMuralEndDate("");
                  }}
                  disabled={isActivatingMural}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleActivateMural}
                  disabled={!tempMuralEndDate || isActivatingMural || !validation.valid}
                  className="flex-1"
                >
                  {isActivatingMural ? "Ativando..." : "Ativar mural"}
                </Button>
              </div>
            </div>
          </Modal>
        );
      })()}
    </>
  );
}

