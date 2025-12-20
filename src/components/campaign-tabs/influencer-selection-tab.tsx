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

interface InfluencerSelectionTabProps {
  influencers: Influencer[];
  campaignPhases?: Array<{ id: string; label: string }>;
}

export function InfluencerSelectionTab({
  influencers,
  campaignPhases = [],
}: InfluencerSelectionTabProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterNiche, setFilterNiche] = useState("");
  const [isMuralActive, setIsMuralActive] = useState(false);
  const [selectedInfluencer, setSelectedInfluencer] = useState<Influencer | null>(null);
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

  const filteredInfluencers = influencers.filter((inf) => {
    const matchesSearch =
      inf.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inf.username.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesNiche = !filterNiche || inf.niche === filterNiche;
    return matchesSearch && matchesNiche;
  });

  const niches = Array.from(new Set(influencers.map((inf) => inf.niche)));

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
                  onCheckedChange={(checked) => setIsMuralActive(checked === true)}
                />
                <label className="text-sm font-medium text-neutral-950">
                  Ativar Mural
                </label>
              </div>
              <Badge
                text={isMuralActive ? "Mural Ativo" : "Mural Inativo"}
                backgroundColor={isMuralActive ? "bg-success-50" : "bg-neutral-100"}
                textColor={isMuralActive ? "text-success-900" : "text-neutral-600"}
              />
            </div>
            <Button
              variant="outline"
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
              text={`${filteredInfluencers.length} perfis encontrados`}
              backgroundColor="bg-primary-50"
              textColor="text-primary-900"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredInfluencers.map((influencer) => (
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
                  <Button
                    variant="outline"
                    onClick={() => handleAction(influencer, "discover")}
                  >
                    <span>Ativar Discover</span>
                  </Button>
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
          {filteredInfluencers.length === 0 && (
            <div className="text-center py-12">
              <p className="text-neutral-600">Nenhum influenciador encontrado</p>
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
    </>
  );
}

