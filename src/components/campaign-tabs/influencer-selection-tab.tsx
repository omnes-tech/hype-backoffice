import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Modal } from "@/components/ui/modal";
import { Avatar } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/text-area";
import { Checkbox } from "@/components/ui/checkbox";
import type { Influencer, InfluencerList } from "@/shared/types";

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
  campaignPhases?: Array<{ id: string; label: string }>;
}

export function InfluencerSelectionTab({
  influencers,
  campaignPhases: _campaignPhases = [],
}: InfluencerSelectionTabProps) {
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
  const [isMuralActive, setIsMuralActive] = useState(false);
  const [muralEndDate, setMuralEndDate] = useState("");
  const [showMuralDateModal, setShowMuralDateModal] = useState(false);
  const [selectedInfluencer, setSelectedInfluencer] = useState<ExtendedInfluencer | null>(null);
  const [modalType, setModalType] = useState<
    "discover" | "invite" | "curation" | "selectList" | null
  >(null);
  const [inviteMessage, setInviteMessage] = useState("");
  const [curationNotes, setCurationNotes] = useState("");
  const [selectedList, setSelectedList] = useState<string>("");

  // Mock de listas salvas
  const savedLists: InfluencerList[] = [
    {
      id: "1",
      name: "Influenciadores Top Beleza",
      createdAt: "2025-01-01",
      influencerIds: ["1", "5"],
    },
    {
      id: "2",
      name: "Micro-influenciadores Moda",
      createdAt: "2025-01-05",
      influencerIds: ["2", "4"],
    },
  ];

  // Extend influencers with mock data for missing fields
  const extendedInfluencers: ExtendedInfluencer[] = influencers.map((inf, index) => ({
    ...inf,
    socialNetwork: ["instagram", "tiktok", "youtube", "instagram", "tiktok"][index % 5],
    ageRange: ["18-24", "25-34", "18-24", "25-34", "35-44"][index % 5],
    location: {
      country: "Brasil",
      state: ["São Paulo", "Rio de Janeiro", "Minas Gerais", "São Paulo", "Rio de Janeiro"][index % 5],
      city: ["São Paulo", "Rio de Janeiro", "Belo Horizonte", "Campinas", "Niterói"][index % 5],
    },
    recommendationReason: index < 3 ? [
      "Alto engajamento e alinhamento com o nicho da campanha",
      "Perfil ideal para o público-alvo e boa performance histórica",
      "Localização compatível e seguidores dentro da faixa desejada"
    ][index] : undefined,
  }));

  // Separate recommendations from catalog
  const recommendedInfluencers = extendedInfluencers.slice(0, 3);
  const catalogInfluencers = extendedInfluencers.slice(3);

  const filteredRecommended = recommendedInfluencers.filter((inf) => {
    const matchesSearch =
      inf.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inf.username.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesNiche = !filterNiche || inf.niche === filterNiche;
    return matchesSearch && matchesNiche;
  });

  const filteredCatalog = catalogInfluencers.filter((inf) => {
    const matchesSearch =
      inf.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inf.username.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesNiche = !filterNiche || inf.niche === filterNiche;
    const matchesSocialNetwork = !filterSocialNetwork || inf.socialNetwork === filterSocialNetwork;
    const matchesAgeRange = !filterAgeRange || inf.ageRange === filterAgeRange;
    const matchesGender = !filterGender || (filterGender === "all" ? true : inf.niche === filterGender);
    const matchesFollowersMin = !filterFollowersMin || inf.followers >= parseInt(filterFollowersMin);
    const matchesFollowersMax = !filterFollowersMax || inf.followers <= parseInt(filterFollowersMax);
    const matchesLocationCountry = !filterLocationCountry || inf.location?.country === filterLocationCountry;
    const matchesLocationState = !filterLocationState || inf.location?.state === filterLocationState;
    const matchesLocationCity = !filterLocationCity || inf.location?.city === filterLocationCity;
    
    return matchesSearch && matchesNiche && matchesSocialNetwork && matchesAgeRange && 
           matchesGender && matchesFollowersMin && matchesFollowersMax && 
           matchesLocationCountry && matchesLocationState && matchesLocationCity;
  });

  const niches = Array.from(new Set(extendedInfluencers.map((inf) => inf.niche))).filter((n): n is string => Boolean(n));
  const socialNetworks = Array.from(new Set(extendedInfluencers.map((inf) => inf.socialNetwork).filter(Boolean))).filter((n): n is string => Boolean(n));
  const ageRanges = Array.from(new Set(extendedInfluencers.map((inf) => inf.ageRange).filter(Boolean))).filter((a): a is string => Boolean(a));
  const countries = Array.from(new Set(extendedInfluencers.map((inf) => inf.location?.country).filter(Boolean))).filter((c): c is string => Boolean(c));
  const states = Array.from(new Set(extendedInfluencers.map((inf) => inf.location?.state).filter(Boolean))).filter((s): s is string => Boolean(s));
  const cities = Array.from(new Set(extendedInfluencers.map((inf) => inf.location?.city).filter(Boolean))).filter((c): c is string => Boolean(c));

  const handleMuralToggle = (checked: boolean) => {
    if (checked) {
      setShowMuralDateModal(true);
    } else {
      // Only allow deactivation if end date has passed
      if (muralEndDate && new Date(muralEndDate) > new Date()) {
        // Don't allow deactivation before end date
        return;
      }
      setIsMuralActive(false);
      setMuralEndDate("");
    }
  };

  const handleActivateMural = () => {
    if (muralEndDate) {
      setIsMuralActive(true);
      setShowMuralDateModal(false);
    }
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

  const handleConfirm = () => {
    // Aqui seria feita a chamada à API
    console.log("Action:", modalType, "Influencer:", selectedInfluencer);
    handleCloseModal();
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
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      onClick={() => handleAction(influencer, "invite")}
                    >
                      <span>Convidar</span>
                    </Button>
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
          {filteredRecommended.length === 0 && (
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
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      onClick={() => handleAction(influencer, "invite")}
                    >
                      <span>Convidar</span>
                    </Button>
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
          {filteredCatalog.length === 0 && (
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
                src={selectedInfluencer.avatar}
                alt={selectedInfluencer.name}
                size="lg"
              />
              <div>
                <h3 className="text-lg font-semibold text-neutral-950">
                  {selectedInfluencer.name}
                </h3>
                <p className="text-neutral-600">@{selectedInfluencer.username}</p>
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
                <Button onClick={handleConfirm} className="flex-1">
                  Confirmar
                </Button>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Modal de seleção de lista */}
      {modalType === "selectList" && (
        <Modal title="Selecionar lista" onClose={handleCloseModal}>
          <div className="flex flex-col gap-4">
            <p className="text-sm text-neutral-600">
              Escolha uma lista salva para importar influenciadores
            </p>
            <div className="flex flex-col gap-2">
              {savedLists.map((list) => (
                <div
                  key={list.id}
                  onClick={() => {
                    setSelectedList(list.id);
                    // Aqui seria feita a importação dos influenciadores da lista
                    console.log("Importing list:", list);
                    handleCloseModal();
                  }}
                  className={`p-4 rounded-2xl border cursor-pointer transition-colors ${
                    selectedList === list.id
                      ? "border-primary-600 bg-primary-50"
                      : "border-neutral-200 bg-neutral-50 hover:bg-neutral-100"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-neutral-950">{list.name}</p>
                      <p className="text-sm text-neutral-600">
                        {list.influencerIds.length} influenciadores • Criada em{" "}
                        {new Date(list.createdAt).toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                    <Icon name="ChevronRight" color="#404040" size={20} />
                  </div>
                </div>
              ))}
            </div>
            {savedLists.length === 0 && (
              <div className="text-center py-8">
                <p className="text-neutral-600">Nenhuma lista salva encontrada</p>
              </div>
            )}
            <div className="flex gap-3">
              <Button variant="outline" onClick={handleCloseModal} className="flex-1">
                Cancelar
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal de data limite do mural */}
      {showMuralDateModal && (
        <Modal
          title="Definir data limite do mural"
          onClose={() => {
            setShowMuralDateModal(false);
            setMuralEndDate("");
          }}
        >
          <div className="flex flex-col gap-6">
            <p className="text-sm text-neutral-600">
              Defina até quando o mural ficará visível para os influenciadores. Após ativado, não será possível desativar até a data limite.
            </p>
            <Input
              label="Data limite"
              type="date"
              value={muralEndDate}
              onChange={(e) => setMuralEndDate(e.target.value)}
              min={new Date().toISOString().split("T")[0]}
            />
            {muralEndDate && (
              <div className="bg-primary-50 rounded-2xl p-4">
                <p className="text-sm text-primary-900">
                  O mural ficará ativo até{" "}
                  <strong>{new Date(muralEndDate).toLocaleDateString("pt-BR")}</strong> e não poderá ser desativado antes desta data.
                </p>
              </div>
            )}
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setShowMuralDateModal(false);
                  setMuralEndDate("");
                }}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleActivateMural}
                disabled={!muralEndDate}
                className="flex-1"
              >
                Ativar mural
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}

