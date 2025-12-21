import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/ui/icon";
import { Select } from "@/components/ui/select";
import { Modal } from "@/components/ui/modal";
import { Avatar } from "@/components/ui/avatar";
import type { Influencer, CampaignPhase } from "@/shared/types";

interface ManagementTabProps {
  influencers: Influencer[];
  campaignPhases?: CampaignPhase[];
}

const kanbanColumns = [
  { id: "selected", label: "Selecionados", color: "bg-blue-50" },
  { id: "invited", label: "Convidados", color: "bg-yellow-50" },
  { id: "active", label: "Ativos", color: "bg-green-50" },
  { id: "published", label: "Publicados", color: "bg-purple-50" },
];

export function ManagementTab({
  influencers,
  campaignPhases = [],
}: ManagementTabProps) {
  const [selectedInfluencer, setSelectedInfluencer] = useState<Influencer | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isChatModalOpen, setIsChatModalOpen] = useState(false);
  const [selectedPhaseFilter, setSelectedPhaseFilter] = useState<string>("all");

  const getInfluencersByStatus = (status: string) => {
    let filtered = influencers.filter((inf) => inf.status === status);
    
    // Filtrar por fase se selecionado
    if (selectedPhaseFilter !== "all") {
      filtered = filtered.filter((inf) => inf.phase === selectedPhaseFilter);
    }
    
    return filtered;
  };

  const phaseOptions = [
    { value: "all", label: "Todas as fases" },
    ...campaignPhases.map((phase, index) => ({
      value: phase.id,
      label: `Fase ${index + 1}`,
    })),
  ];

  const handleInfluencerClick = (influencer: Influencer) => {
    setSelectedInfluencer(influencer);
    setIsModalOpen(true);
  };

  return (
    <>
      <div className="flex flex-col gap-6">
        {/* Kanban Board */}
        <div className="bg-white rounded-3xl p-6 border border-neutral-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-neutral-950">
              Fases da campanha
            </h3>
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {kanbanColumns.map((column) => {
              const columnInfluencers = getInfluencersByStatus(column.id);
              return (
                <div
                  key={column.id}
                  className={`${column.color} rounded-2xl p-4 min-h-[200px]`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold text-neutral-950">{column.label}</h4>
                    <Badge
                      text={columnInfluencers.length.toString()}
                      backgroundColor="bg-neutral-200"
                      textColor="text-neutral-700"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    {columnInfluencers.map((influencer) => (
                      <div
                        key={influencer.id}
                        onClick={() => handleInfluencerClick(influencer)}
                        className="bg-white rounded-xl p-3 cursor-pointer hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-center gap-2">
                          <Avatar
                            src={influencer.avatar}
                            alt={influencer.name}
                            size="sm"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-neutral-950 truncate">
                              {influencer.name}
                            </p>
                            <p className="text-xs text-neutral-600 truncate">
                              @{influencer.username}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                    {columnInfluencers.length === 0 && (
                      <div className="text-sm text-neutral-400 text-center py-4">
                        Nenhum influenciador
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Cards de influenciadores */}
        <div className="bg-white rounded-3xl p-6 border border-neutral-200">
          <h3 className="text-lg font-semibold text-neutral-950 mb-4">
            Todos os influenciadores
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {influencers.map((influencer) => (
              <div
                key={influencer.id}
                onClick={() => handleInfluencerClick(influencer)}
                className="bg-neutral-50 rounded-2xl p-4 border border-neutral-200 cursor-pointer hover:shadow-md transition-shadow"
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
                <div className="flex items-center justify-between text-sm">
                  <span className="text-neutral-600">
                    {influencer.followers.toLocaleString("pt-BR")} seguidores
                  </span>
                  <span className="text-neutral-600">
                    {influencer.engagement}% engajamento
                  </span>
                </div>
                {influencer.status && (
                  <div className="mt-3">
                    <Badge
                      text={
                        influencer.status === "selected"
                          ? "Selecionado"
                          : influencer.status === "invited"
                          ? "Convidado"
                          : influencer.status === "active"
                          ? "Ativo"
                          : "Publicado"
                      }
                      backgroundColor="bg-primary-50"
                      textColor="text-primary-900"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modal do influenciador */}
      {isModalOpen && selectedInfluencer && (
        <Modal
          title={`${selectedInfluencer.name} - Detalhes`}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedInfluencer(null);
          }}
        >
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-4">
              <Avatar
                src={selectedInfluencer.avatar}
                alt={selectedInfluencer.name}
                size="2xl"
              />
              <div>
                <h3 className="text-xl font-semibold text-neutral-950">
                  {selectedInfluencer.name}
                </h3>
                <p className="text-neutral-600">@{selectedInfluencer.username}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-neutral-600 mb-1">Seguidores</p>
                <p className="text-lg font-semibold text-neutral-950">
                  {selectedInfluencer.followers.toLocaleString("pt-BR")}
                </p>
              </div>
              <div>
                <p className="text-sm text-neutral-600 mb-1">Engajamento</p>
                <p className="text-lg font-semibold text-neutral-950">
                  {selectedInfluencer.engagement}%
                </p>
              </div>
              <div>
                <p className="text-sm text-neutral-600 mb-1">Nicho</p>
                <p className="text-lg font-semibold text-neutral-950">
                  {selectedInfluencer.niche}
                </p>
              </div>
              <div>
                <p className="text-sm text-neutral-600 mb-1">Status</p>
                <Badge
                  text={
                    selectedInfluencer.status === "selected"
                      ? "Selecionado"
                      : selectedInfluencer.status === "invited"
                      ? "Convidado"
                      : selectedInfluencer.status === "active"
                      ? "Ativo"
                      : "Publicado"
                  }
                  backgroundColor="bg-primary-50"
                  textColor="text-primary-900"
                />
              </div>
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setIsModalOpen(false);
                  setIsChatModalOpen(true);
                }}
              >
                <div className="flex items-center gap-2">
                  <Icon name="MessageCircle" color="#404040" size={16} />
                  <span>Abrir chat</span>
                </div>
              </Button>
              <Button variant="outline" className="flex-1">
                <div className="flex items-center gap-2">
                  <Icon name="User" color="#404040" size={16} />
                  <span>Ver perfil completo</span>
                </div>
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal de Chat */}
      {selectedInfluencer && isChatModalOpen && (
        <ChatModal
          influencer={selectedInfluencer}
          onClose={() => {
            setIsChatModalOpen(false);
            setSelectedInfluencer(null);
          }}
        />
      )}
    </>
  );
}

// Componente de Chat
function ChatModal({
  influencer,
  onClose,
}: {
  influencer: Influencer;
  onClose: () => void;
}) {
  const [messages, setMessages] = useState([
    {
      id: "1",
      senderId: "campaign",
      senderName: "Você",
      senderAvatar: "",
      message: "Olá! Bem-vindo à campanha.",
      timestamp: new Date().toISOString(),
      isFromInfluencer: false,
    },
    {
      id: "2",
      senderId: influencer.id,
      senderName: influencer.name,
      senderAvatar: influencer.avatar,
      message: "Obrigado pelo convite! Estou animado para participar.",
      timestamp: new Date().toISOString(),
      isFromInfluencer: true,
    },
  ]);
  const [newMessage, setNewMessage] = useState("");

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;

    const message = {
      id: Date.now().toString(),
      senderId: "campaign",
      senderName: "Você",
      senderAvatar: "",
      message: newMessage,
      timestamp: new Date().toISOString(),
      isFromInfluencer: false,
    };

    setMessages([...messages, message]);
    setNewMessage("");
  };

  return (
    <Modal title={`Chat com ${influencer.name}`} onClose={onClose}>
      <div className="flex flex-col h-[600px]">
        <div className="flex-1 overflow-y-auto flex flex-col gap-4 mb-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3 ${
                msg.isFromInfluencer ? "justify-start" : "justify-end"
              }`}
            >
              {msg.isFromInfluencer && (
                <Avatar src={msg.senderAvatar} alt={msg.senderName} size="sm" />
              )}
              <div
                className={`max-w-[70%] rounded-2xl p-3 ${
                  msg.isFromInfluencer
                    ? "bg-neutral-100 text-neutral-950"
                    : "bg-primary-600 text-neutral-50"
                }`}
              >
                <p className="text-sm font-medium mb-1">{msg.senderName}</p>
                <p className="text-sm">{msg.message}</p>
                <p className="text-xs opacity-70 mt-1">
                  {new Date(msg.timestamp).toLocaleTimeString("pt-BR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
              {!msg.isFromInfluencer && (
                <Avatar src={msg.senderAvatar} alt={msg.senderName} size="sm" />
              )}
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
            placeholder="Digite sua mensagem..."
            className="flex-1 h-11 rounded-3xl px-4 bg-neutral-100 outline-none focus:bg-neutral-200/70"
          />
          <Button onClick={handleSendMessage}>
            <Icon name="Send" color="#FAFAFA" size={16} />
          </Button>
        </div>
      </div>
    </Modal>
  );
}

