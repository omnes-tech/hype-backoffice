import { useState, useRef, useEffect } from "react";
import { useParams } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
} from "@dnd-kit/core";
import type {
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/ui/icon";
import { Select } from "@/components/ui/select";
import { Modal } from "@/components/ui/modal";
import { Avatar } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/text-area";
import type { Influencer, CampaignPhase } from "@/shared/types";
import { useUpdateInfluencerStatus } from "@/hooks/use-campaign-influencers";
import { useChat } from "@/hooks/use-chat";
import { useCampaignUsers } from "@/hooks/use-campaign-users";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useNiches } from "@/hooks/use-niches";

interface ManagementTabProps {
  influencers: Influencer[];
  campaignPhases?: CampaignPhase[];
  campaignUsers?: Array<{
    id: string | number;
    user_id?: string | number;
    name: string;
    username: string;
    avatar: string;
    followers: number;
    engagement: number;
    niche?: string;
    status: string;
  }>;
  openChatInfluencerId?: string;
}

interface StatusHistory {
  id: string;
  status: string;
  timestamp: string;
  notes?: string;
}

interface ExtendedInfluencer extends Omit<Influencer, 'id'> {
  id: string | number;
  socialNetwork?: string;
  statusHistory?: StatusHistory[];
}

// Helper para converter ID para string
const idToString = (id: string | number): string => {
  return typeof id === 'number' ? String(id) : id;
};

const kanbanColumns = [
  { id: "applications", label: "Inscrições", color: "bg-neutral-50" },
  { id: "curation", label: "Curadoria", color: "bg-blue-50" },
  { id: "invited", label: "Convidados", color: "bg-yellow-50" },
  {
    id: "contract_pending",
    label: "Contrato Pendente",
    color: "bg-teal-50",
  },
  {
    id: "approved",
    label: "Aprovado / Em Andamento",
    color: "bg-green-50",
  },
  {
    id: "script_pending",
    label: "Aguardando Aprovação Roteiro",
    color: "bg-indigo-50",
  },
  {
    id: "content_pending",
    label: "Aguardando Conteúdo",
    color: "bg-amber-50",
  },
  {
    id: "pending_approval",
    label: "Aguardando Aprovação Conteúdo",
    color: "bg-orange-50",
  },
  { id: "in_correction", label: "Em Correção", color: "bg-yellow-100" },
  {
    id: "content_approved",
    label: "Conteúdo Aprovado",
    color: "bg-purple-50",
  },
  {
    id: "payment_pending",
    label: "Aguardando Pagamento",
    color: "bg-cyan-50",
  },
  { id: "published", label: "Publicado", color: "bg-success-50" },
  {
    id: "rejected",
    label: "Recusado",
    color: "bg-danger-50",
    highlight: true,
  },
];

// Componente de Card Arrastável
function SortableInfluencerCard({
  influencer,
  onClick,
  getCurrentStatus,
  getAvailableActions,
  getSocialNetworkIcon,
  getSocialNetworkLabel,
  onApprove,
  onMoveToCuration,
  setSelectedInfluencer,
  setIsRejectModalOpen,
}: {
  influencer: ExtendedInfluencer;
  onClick: (influencer: ExtendedInfluencer) => void;
  getCurrentStatus: (inf: ExtendedInfluencer) => string;
  getAvailableActions: (
    status: string
  ) => Array<{ label: string; action: string; targetStatus?: string }>;
  getSocialNetworkIcon: (
    network?: string
  ) => keyof typeof import("lucide-react").icons;
  getSocialNetworkLabel: (network?: string) => string;
  onApprove: (influencer: ExtendedInfluencer, targetStatus: string) => void;
  onMoveToCuration: (influencer: ExtendedInfluencer) => void;
  setSelectedInfluencer: (inf: ExtendedInfluencer | null) => void;
  setIsRejectModalOpen: (open: boolean) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: influencer.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const currentStatus = getCurrentStatus(influencer);
  const availableActions = getAvailableActions(currentStatus);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-white rounded-lg p-2 border border-neutral-200 cursor-move hover:shadow-md transition-all"
    >
      <div
        {...attributes}
        {...listeners}
        onClick={() => onClick(influencer)}
        className="cursor-pointer hover:opacity-80 transition-opacity"
      >
        <div className="flex items-center gap-1.5 mb-1.5">
          <Avatar src={influencer.avatar} alt={influencer.name} size="sm" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-neutral-950 truncate">
              {influencer.name}
            </p>
            <p className="text-[10px] text-neutral-600 truncate">
              @{influencer.username}
            </p>
          </div>
        </div>
        {influencer.socialNetwork && (
          <div className="flex items-center gap-1 mb-1.5">
            <Icon
              name={getSocialNetworkIcon(influencer.socialNetwork)}
              color="#404040"
              size={10}
            />
            <span className="text-[10px] text-neutral-600">
              {getSocialNetworkLabel(influencer.socialNetwork)}
            </span>
          </div>
        )}
        {influencer.statusHistory && influencer.statusHistory.length > 0 && (
          <div className="mt-1.5 pt-1.5 border-t border-neutral-200">
            <div className="flex flex-col gap-0.5">
              {influencer.statusHistory.slice(-1).map((history) => (
                <div key={history.id} className="text-[10px] text-neutral-500">
                  <span className="font-medium">
                    {new Date(history.timestamp).toLocaleDateString("pt-BR", {
                      day: "2-digit",
                      month: "2-digit",
                    })}
                  </span>{" "}
                  <span>
                    {new Date(history.timestamp).toLocaleTimeString("pt-BR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      {availableActions.length > 0 && (
        <div className="mt-1.5 pt-1.5 border-t border-neutral-200 flex flex-col gap-1">
          {availableActions.map((action) => (
            <Button
              key={action.action}
              variant="outline"
              className="text-[10px] h-6 px-2"
              onClick={(e) => {
                e.stopPropagation();
                if (action.action === "approve" && action.targetStatus) {
                  onApprove(influencer, action.targetStatus);
                } else if (action.action === "reject") {
                  setSelectedInfluencer(influencer);
                  setIsRejectModalOpen(true);
                } else if (action.action === "curation") {
                  onMoveToCuration(influencer);
                } else if (action.action === "invite" && action.targetStatus) {
                  // Convidar influenciador - usar onApprove com status invited
                  onApprove(influencer, action.targetStatus);
                } else if (action.action === "applications" && action.targetStatus) {
                  // Reativar - mover para applications
                  onApprove(influencer, action.targetStatus);
                }
              }}
              style={{ fontSize: "10px", height: "24px", padding: "0 8px" }}
            >
              {action.label}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}

// Componente de Coluna do Kanban
function KanbanColumn({
  column,
  influencers,
  influencerIds,
  onInfluencerClick,
  getCurrentStatus,
  getAvailableActions,
  getSocialNetworkIcon,
  getSocialNetworkLabel,
  onApprove,
  onMoveToCuration,
  setSelectedInfluencer,
  setIsRejectModalOpen,
}: {
  column: (typeof kanbanColumns)[0];
  influencers: ExtendedInfluencer[];
  influencerIds: string[];
  onInfluencerClick: (inf: ExtendedInfluencer) => void;
  getCurrentStatus: (inf: ExtendedInfluencer) => string;
  getAvailableActions: (
    status: string
  ) => Array<{ label: string; action: string; targetStatus?: string }>;
  getSocialNetworkIcon: (
    network?: string
  ) => keyof typeof import("lucide-react").icons;
  getSocialNetworkLabel: (network?: string) => string;
  onApprove: (influencer: ExtendedInfluencer, targetStatus: string) => void;
  onMoveToCuration: (influencer: ExtendedInfluencer) => void;
  setSelectedInfluencer: (inf: ExtendedInfluencer | null) => void;
  setIsRejectModalOpen: (open: boolean) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
  });

  return (
    <div
      ref={setNodeRef}
      className={`${column.color} rounded-xl p-2.5 min-w-[200px] max-w-[200px] min-h-[300px] shrink-0 transition-colors ${isOver ? "ring-2 ring-primary-500 ring-offset-2" : ""
        }`}
    >
      <div className="flex items-center justify-between mb-2">
        <h4
          className={`text-xs font-semibold ${column.highlight ? "text-danger-600" : "text-neutral-950"}`}
        >
          {column.label}
        </h4>
        <Badge
          text={influencers.length.toString()}
          backgroundColor="bg-neutral-200"
          textColor="text-neutral-700"
        />
      </div>
      <SortableContext
        items={influencerIds}
        strategy={verticalListSortingStrategy}
      >
        <div className="flex flex-col gap-1.5">
          {influencers.map((influencer) => (
            <SortableInfluencerCard
              key={influencer.id}
              influencer={influencer}
              onClick={onInfluencerClick}
              getCurrentStatus={getCurrentStatus}
              getAvailableActions={getAvailableActions}
              getSocialNetworkIcon={getSocialNetworkIcon}
              getSocialNetworkLabel={getSocialNetworkLabel}
              onApprove={onApprove}
              onMoveToCuration={onMoveToCuration}
              setSelectedInfluencer={setSelectedInfluencer}
              setIsRejectModalOpen={setIsRejectModalOpen}
            />
          ))}
          {influencers.length === 0 && (
            <div className="text-xs text-neutral-400 text-center py-2">
              No influencers
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  );
}

// Componente de Card para DragOverlay
function DragOverlayCard({
  influencer,
  getSocialNetworkIcon,
  getSocialNetworkLabel,
}: {
  influencer: ExtendedInfluencer;
  getSocialNetworkIcon: (
    network?: string
  ) => keyof typeof import("lucide-react").icons;
  getSocialNetworkLabel: (network?: string) => string;
}) {
  return (
    <div className="bg-white rounded-xl p-3 border-2 border-primary-500 shadow-lg rotate-2">
      <div className="flex items-center gap-2 mb-2">
        <Avatar src={influencer.avatar} alt={influencer.name} size="sm" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-neutral-950 truncate">
            {influencer.name}
          </p>
          <p className="text-xs text-neutral-600 truncate">
            @{influencer.username}
          </p>
        </div>
      </div>
      {influencer.socialNetwork && (
        <div className="flex items-center gap-1">
          <Icon
            name={getSocialNetworkIcon(influencer.socialNetwork)}
            color="#404040"
            size={12}
          />
          <span className="text-xs text-neutral-600">
            {getSocialNetworkLabel(influencer.socialNetwork)}
          </span>
        </div>
      )}
    </div>
  );
}

export function ManagementTab({
  influencers,
  campaignPhases = [],
  campaignUsers = [],
  openChatInfluencerId,
}: ManagementTabProps) {
  const { campaignId } = useParams({
    from: "/(private)/(app)/campaigns/$campaignId",
  });
  const { data: niches = [] } = useNiches();
  const [influencersState, setInfluencersState] = useState<
    ExtendedInfluencer[]
  >([]);
  const [selectedInfluencer, setSelectedInfluencer] =
    useState<ExtendedInfluencer | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isChatModalOpen, setIsChatModalOpen] = useState(false);
  
  // Abrir chat automaticamente quando openChatInfluencerId for fornecido (vindo de notificação)
  useEffect(() => {
    if (openChatInfluencerId && influencersState.length > 0 && campaignUsers.length > 0) {
      const influencerIdStr = String(openChatInfluencerId);
      const influencerIdNum = parseInt(influencerIdStr, 10);
      
      // Buscar o influenciador de forma mais robusta
      // Primeiro, tentar encontrar pelo campaignUserId (campaignUsers.id)
      // Depois, tentar encontrar pelo userId (campaignUsers.user_id)
      let influencerToOpen: ExtendedInfluencer | undefined;
      
      if (!isNaN(influencerIdNum)) {
        // 1. Tentar encontrar por user_id primeiro (caso mais comum)
        const campaignUser = campaignUsers.find((u) => {
          if (!u.user_id) return false;
          const userId = typeof u.user_id === "string"
            ? parseInt(u.user_id, 10)
            : u.user_id;
          return userId === influencerIdNum;
        });
        
        if (campaignUser) {
          influencerToOpen = influencersState.find(
            (inf) => String(inf.id) === String(campaignUser.id)
          );
        }
        
        // 2. Se não encontrou, tentar pelo próprio id (influencer.id já é o campaignUserId)
        if (!influencerToOpen) {
          influencerToOpen = influencersState.find(
            (inf) => {
              const infId = typeof inf.id === "string" ? parseInt(inf.id, 10) : Number(inf.id);
              return infId === influencerIdNum || String(inf.id) === influencerIdStr;
            }
          );
        }
      } else {
        // Busca por string
        influencerToOpen = influencersState.find(
          (inf) => String(inf.id) === influencerIdStr
        );
      }
      
      if (influencerToOpen && !isChatModalOpen) {
        setSelectedInfluencer(influencerToOpen);
        setIsChatModalOpen(true);
      }
    }
  }, [openChatInfluencerId, influencersState, campaignUsers, isChatModalOpen]);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectFeedback, setRejectFeedback] = useState("");
  const [selectedPhaseFilter, setSelectedPhaseFilter] = useState<string>("all");
  const [activeId, setActiveId] = useState<string | null>(null);

  // Hooks para mutations
  const { mutate: updateStatus, isPending: isUpdatingStatus } =
    useUpdateInfluencerStatus(campaignId);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor)
  );

  // Função para mapear status da API para colunas do Kanban
  // Mapeia os valores do backend para os IDs das colunas do Kanban
  const mapUserStatusToKanbanColumn = (status: string): string => {
    const statusMap: { [key: string]: string } = {
      // Valores do banco de dados mapeados para IDs das colunas do Kanban
      applications: "applications",
      curation: "curation",
      invited: "invited",
      contract_pending: "contract_pending",
      approved: "approved",
      pending_approval: "script_pending", // Aguardando Aprovação Roteiro
      awaiting_content: "content_pending", // Aguardando Conteúdo
      awaiting_content_approval: "pending_approval", // Aguardando Aprovação Conteúdo
      in_correction: "in_correction",
      content_approved: "content_approved", // Conteúdo Aprovado / Aguardando Publicação
      awaiting_publication: "content_approved", // Aguardando Publicação (mesmo que content_approved)
      awaiting_payment: "payment_pending", // Aguardando Pagamento
      published: "published", // Publicado / Concluído
      completed: "published", // Concluído (mesmo que published)
      rejected: "rejected",
      // Compatibilidade com valores antigos (caso ainda venham)
      contractpending: "contract_pending",
      script_pending: "script_pending",
      content_pending: "content_pending",
      awaitingcontent: "content_pending",
      awaitingcontentapproval: "pending_approval",
      awaitingpublication: "content_approved",
      awaitingpayment: "payment_pending",
      incorrection: "in_correction",
    };
    return statusMap[status.toLowerCase()] || "applications";
  };

  // Verificar se um ID pertence a um usuário da campanha
  const isCampaignUser = (id: string): boolean => {
    return campaignUsers.some((user) => user.id === id);
  };

  // Initialize influencers state and merge with all campaign users
  useEffect(() => {
    // Converter TODOS os usuários da campanha para o formato ExtendedInfluencer
    const allCampaignUsers: ExtendedInfluencer[] = campaignUsers.map((user) => {
      const kanbanStatus = mapUserStatusToKanbanColumn(user.status);
      return {
        id: user.id,
        name: user.name,
        username: user.username || "",
        avatar: user.avatar || "",
        followers: user.followers || 0,
        engagement: user.engagement || 0,
        niche: user.niche || "",
        status: user.status as Influencer["status"],
        socialNetwork: undefined,
        statusHistory: [
          {
            id: `user-${user.id}`,
            status: kanbanStatus,
            timestamp: new Date().toISOString(),
            notes: `Usuário com status: ${user.status}`,
          },
        ],
      };
    });

    // Obter IDs dos usuários da campanha para evitar duplicatas
    const campaignUserIds = new Set(allCampaignUsers.map((u) => u.id));

    // Filtrar influenciadores que não são usuários da campanha
    const existingInfluencers = influencers.filter(
      (inf) => !campaignUserIds.has(inf.id)
    );

    // Combinar influenciadores existentes com usuários da campanha
    const allInfluencers = [...existingInfluencers, ...allCampaignUsers];

    if (allInfluencers.length > 0) {
      const extended: ExtendedInfluencer[] = allInfluencers.map(
        (inf, index) => {
          const currentMappedStatus = mapUserStatusToKanbanColumn(
            inf.status || ""
          );

          // Se já tem statusHistory e é um usuário da campanha, atualizar o statusHistory com o status atual
          const extendedInf = inf as ExtendedInfluencer;
          if (
            extendedInf.statusHistory &&
            extendedInf.statusHistory.length > 0 &&
            campaignUserIds.has(inf.id)
          ) {
            // Verificar se o status atual é diferente do último status no histórico
            const lastStatus =
              extendedInf.statusHistory[extendedInf.statusHistory.length - 1]
                ?.status;
            if (lastStatus !== currentMappedStatus) {
              // Adicionar novo status ao histórico
              return {
                ...extendedInf,
                statusHistory: [
                  ...extendedInf.statusHistory,
                  {
                    id: `update-${Date.now()}`,
                    status: currentMappedStatus,
                    timestamp: new Date().toISOString(),
                    notes: `Status atualizado para: ${currentMappedStatus}`,
                  },
                ],
              };
            }
            return extendedInf;
          }

          // Caso contrário, é um influenciador normal - usar o status atual do objeto
          return {
            ...inf,
            socialNetwork: [
              "instagram",
              "tiktok",
              "youtube",
              "instagram",
              "tiktok",
            ][index % 5],
            statusHistory: [
              {
                id: "1",
                status: "applications",
                timestamp: new Date(
                  Date.now() - 7 * 24 * 60 * 60 * 1000
                ).toISOString(),
                notes: "Influencer enrolled in campaign",
              },
              {
                id: "2",
                status: currentMappedStatus,
                timestamp: new Date().toISOString(),
                notes: "Status updated",
              },
            ],
          };
        }
      );
      setInfluencersState(extended);
    } else if (allInfluencers.length === 0) {
      // Se não há influenciadores, limpar o estado
      setInfluencersState([]);
    }
  }, [influencers, campaignUsers]);

  const extendedInfluencers =
    influencersState.length > 0
      ? influencersState
      : influencers.map((inf, index) => {
        const currentMappedStatus = mapUserStatusToKanbanColumn(
          inf.status || ""
        );
        return {
          ...inf,
          socialNetwork: [
            "instagram",
            "tiktok",
            "youtube",
            "instagram",
            "tiktok",
          ][index % 5],
          statusHistory: [
            {
              id: "1",
              status: "applications",
              timestamp: new Date(
                Date.now() - 7 * 24 * 60 * 60 * 1000
              ).toISOString(),
              notes: "Influencer enrolled in campaign",
            },
            {
              id: "2",
              status: currentMappedStatus,
              timestamp: new Date().toISOString(),
              notes: "Status updated",
            },
          ],
        };
      });

  const getCurrentStatus = (inf: ExtendedInfluencer): string => {
    // Priorizar o status direto do objeto (mais confiável e atualizado)
    if (inf.status) {
      const mappedStatus = mapUserStatusToKanbanColumn(inf.status);
      if (
        mappedStatus !== "applications" ||
        !inf.statusHistory ||
        inf.statusHistory.length === 0
      ) {
        return mappedStatus;
      }
    }

    // Se não houver status ou for "applications", verificar o statusHistory
    if (inf.statusHistory && inf.statusHistory.length > 0) {
      // Get the most recent status from history
      const sortedHistory = [...inf.statusHistory].sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
      return sortedHistory[0].status;
    }

    // Fallback final
    return "applications";
  };

  const getInfluencersByStatus = (status: string) => {
    let filtered = extendedInfluencers.filter((inf) => {
      const currentStatus = getCurrentStatus(inf);
      return currentStatus === status;
    });

    // Filter by phase if selected
    if (selectedPhaseFilter !== "all") {
      filtered = filtered.filter((inf) => inf.phase === selectedPhaseFilter);
    }

    return filtered;
  };

  const updateInfluencerStatus = (
    influencerId: string,
    newStatus: string,
    notes?: string
  ) => {
    setInfluencersState((prev) =>
      prev.map((inf) => {
        if (inf.id === influencerId) {
          const newHistoryEntry: StatusHistory = {
            id: Date.now().toString(),
            status: newStatus,
            timestamp: new Date().toISOString(),
            notes,
          };
          return {
            ...inf,
            statusHistory: [...(inf.statusHistory || []), newHistoryEntry],
          };
        }
        return inf;
      })
    );
  };

  const handleApprove = (
    influencer: ExtendedInfluencer,
    targetStatus: string
  ) => {
    updateStatus(
      {
        influencer_id: idToString(influencer.id),
        status: targetStatus,
        feedback: "Aprovado pelo usuário",
      },
      {
        onSuccess: () => {
          updateInfluencerStatus(
            idToString(influencer.id),
            targetStatus,
            "Aprovado pelo usuário"
          );
          toast.success("Influenciador aprovado com sucesso!");
          setIsModalOpen(false);
          setSelectedInfluencer(null);
        },
        onError: (error: any) => {
          toast.error(error?.message || "Erro ao aprovar influenciador");
        },
      }
    );
  };

  const handleReject = (influencer: ExtendedInfluencer, feedback: string) => {
    if (!feedback.trim()) {
      toast.error("Feedback é obrigatório ao recusar influenciador");
      return;
    }

    updateStatus(
      {
        influencer_id: idToString(influencer.id),
        status: "rejected",
        feedback,
      },
      {
        onSuccess: () => {
          updateInfluencerStatus(idToString(influencer.id), "rejected", feedback);
          toast.success("Influenciador recusado");
          setIsRejectModalOpen(false);
          setRejectFeedback("");
          setIsModalOpen(false);
          setSelectedInfluencer(null);
        },
        onError: (error: any) => {
          toast.error(error?.message || "Erro ao recusar influenciador");
        },
      }
    );
  };

  const handleMoveToCuration = (influencer: ExtendedInfluencer) => {
    updateStatus(
      {
        influencer_id: idToString(influencer.id),
        status: "curation",
        feedback: "Movido para curadoria",
      },
      {
        onSuccess: () => {
          updateInfluencerStatus(
            idToString(influencer.id),
            "curation",
            "Movido para curadoria"
          );
          toast.success("Influenciador movido para curadoria");
          setIsModalOpen(false);
          setSelectedInfluencer(null);
        },
        onError: (error: any) => {
          toast.error(
            error?.message || "Erro ao mover influenciador para curadoria"
          );
        },
      }
    );
  };

  const getAvailableActions = (status: string) => {
    // Ações disponíveis conforme documentação de status
    // Nota: Aprovar/Recusar foram removidos - essas ações devem ser feitas nas guias específicas
    switch (status) {
      case "applications":
        // Pode mover para curadoria
        return [
          { label: "Mover para Curadoria", action: "curation", targetStatus: "curation" },
        ];
      case "curation":
        // Sem ações - aprovação/recusa deve ser feita na guia de Curadoria
        return [];
      case "invited":
        // Sem ações - aprovação/recusa deve ser feita nas guias específicas
        return [];
      case "contract_pending":
        // Sem ações - contrato deve ser gerenciado na aba de Contratos
        return [];
      case "approved":
        // Sem ações - aprovação/recusa deve ser feita nas guias específicas
        return [];
      case "script_pending":
        // Sem ações - aprovação de roteiro deve ser feita na aba "Aprovações de Roteiro"
        return [];
      case "content_pending":
        // Aguardando conteúdo do influenciador
        // Não há ações disponíveis - aguarda envio automático
        return [];
      case "pending_approval":
        // Conteúdo aguardando aprovação
        // Nota: Aprovação/rejeição de conteúdo deve ser feita na aba "Aprovação de Conteúdo"
        // O status muda automaticamente quando o conteúdo é aprovado/rejeitado
        return [];
      case "in_correction":
        // Aguardando novo upload do influenciador após correção
        // Não há ações disponíveis - aguarda reenvio automático
        return [];
      case "content_approved":
        // Conteúdo aprovado, aguardando publicação e identificação pelo bot
        // Não há ações disponíveis - processo automático
        return [];
      case "payment_pending":
        // Aguardando pagamento - processo automático
        // Não há ações disponíveis
        return [];
      case "published":
        // Conteúdo publicado - fase concluída
        // Não há ações disponíveis
        return [];
      case "rejected":
        // Rejeitado - pode ser reativado movendo para applications ou curation
        return [
          { label: "Reativar (Applications)", action: "applications", targetStatus: "applications" },
          { label: "Mover para Curadoria", action: "curation", targetStatus: "curation" },
        ];
      default:
        return [];
    }
  };

  const getStatusLabel = (status: string) => {
    const column = kanbanColumns.find((col) => col.id === status);
    return column?.label || status;
  };

  const getSocialNetworkIcon = (network?: string) => {
    const icons: { [key: string]: keyof typeof import("lucide-react").icons } =
    {
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

  const phaseOptions = [
    { value: "all", label: "Todas as fases" },
    ...campaignPhases.map((phase, index) => ({
      value: phase.id,
      label: `Fase ${index + 1}`,
    })),
  ];

  const handleInfluencerClick = (influencer: ExtendedInfluencer) => {
    setSelectedInfluencer(influencer);
    setIsModalOpen(true);
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    // Se está arrastando sobre uma coluna
    if (kanbanColumns.some((col) => col.id === overId)) {
      return;
    }

    // Se está arrastando sobre outro card
    const activeInfluencer = extendedInfluencers.find(
      (inf) => inf.id === activeId
    );
    const overInfluencer = extendedInfluencers.find((inf) => inf.id === overId);

    if (!activeInfluencer || !overInfluencer) return;

    const activeStatus = getCurrentStatus(activeInfluencer);
    const overStatus = getCurrentStatus(overInfluencer);

    if (activeStatus !== overStatus) {
      // Não permite reordenar entre colunas diferentes via drag over
      return;
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    // Encontra o influenciador sendo arrastado
    const draggedInfluencer = extendedInfluencers.find(
      (inf) => inf.id === activeId
    );
    if (!draggedInfluencer) return;

    // Verifica se foi solto sobre uma coluna
    const targetColumn = kanbanColumns.find((col) => col.id === overId);
    if (targetColumn) {
      const currentStatus = getCurrentStatus(draggedInfluencer);
      const targetStatus = targetColumn.id;

      // Verifica se é um usuário da campanha
      const isUser = isCampaignUser(idToString(draggedInfluencer.id));

      if (isUser) {
        // Para usuários da campanha, validar transição
        const canMove = validateUserStatusTransition(
          currentStatus,
          targetStatus
        );

        if (!canMove) {
          toast.error(
            `Não é possível mover de "${getStatusLabel(currentStatus)}" para "${getStatusLabel(targetStatus)}"`
          );
          return;
        }

        // Atualizar status do influenciador via API usando a rota correta
        const notes = getTransitionNote(currentStatus, targetStatus);
        updateStatus(
          {
            influencer_id: idToString(draggedInfluencer.id),
            status: targetStatus,
            feedback: notes,
          },
          {
            onSuccess: () => {
              updateInfluencerStatus(idToString(draggedInfluencer.id), targetStatus, notes);
              toast.success("Status do usuário atualizado com sucesso!");
            },
            onError: (error: any) => {
              toast.error(
                error?.message || "Erro ao atualizar status do usuário"
              );
            },
          }
        );
        return;
      }

      // Para influenciadores normais, usar validação e atualização existente
      const canMove = validateStatusTransition(currentStatus, targetStatus);

      if (!canMove) {
        toast.error(
          `Não é possível mover de "${getStatusLabel(currentStatus)}" para "${getStatusLabel(targetStatus)}"`
        );
        return;
      }
      const apiStatus =
        targetStatus === "curation"
          ? "curation"
          : targetStatus === "approved" || targetStatus === "approved_progress"
            ? "approved"
            : targetStatus === "rejected"
              ? "rejected"
              : targetStatus === "applications" || targetStatus === "inscriptions"
                ? "applications"
                : targetStatus === "invited"
                  ? "invited"
                  : targetStatus === "contract_pending"
                    ? "contract_pending"
                    : targetStatus === "script_pending"
                      ? "script_pending"
                      : targetStatus === "content_pending"
                        ? "content_pending"
                        : targetStatus === "pending_approval"
                          ? "pending_approval"
                          : targetStatus === "in_correction"
                            ? "in_correction"
                            : targetStatus === "content_approved"
                              ? "content_approved"
                              : targetStatus === "payment_pending"
                                ? "payment_pending"
                                : targetStatus === "published"
                                  ? "published"
                                  : targetStatus;

      // Atualiza o status do influenciador via API
      const notes = getTransitionNote(currentStatus, targetStatus);
      updateStatus(
        {
          influencer_id: idToString(draggedInfluencer.id),
          status: apiStatus,
          feedback: notes,
        },
        {
          onSuccess: () => {
            updateInfluencerStatus(idToString(draggedInfluencer.id), targetStatus, notes);
            toast.success("Status atualizado com sucesso!");
          },
          onError: (error: any) => {
            toast.error(error?.message || "Erro ao atualizar status");
          },
        }
      );
      return;
    }

    // Se foi solto sobre outro card, verifica se pode reordenar
    const overInfluencer = extendedInfluencers.find((inf) => inf.id === overId);
    if (overInfluencer) {
      const activeStatus = getCurrentStatus(draggedInfluencer);
      const overStatus = getCurrentStatus(overInfluencer);

      if (activeStatus === overStatus) {
        // Permite reordenar dentro da mesma coluna (opcional)
        // Por enquanto, não fazemos nada, mas podemos implementar reordenação se necessário
      }
    }
  };

  const validateStatusTransition = (
    fromStatus: string,
    toStatus: string
  ): boolean => {
    // Regras de transição válidas conforme documentação de status
    // Baseado em: API_ENDPOINTS_BACKOFFICE_CHAT.md e Untitled.md
    const validTransitions: { [key: string]: string[] } = {
      // applications → curation, invited, rejected
      applications: ["curation", "invited", "rejected"],
      // curation → invited, approved, rejected
      curation: ["invited", "approved", "rejected"],
      // invited → contract_pending, rejected
      invited: ["contract_pending", "rejected"],
      // contract_pending → approved, rejected
      contract_pending: ["approved", "rejected"],
      // approved → script_pending, rejected
      approved: ["script_pending", "rejected"],
      // script_pending → content_pending, rejected
      script_pending: ["content_pending", "rejected"],
      // content_pending → pending_approval, rejected
      content_pending: ["pending_approval", "rejected"],
      // pending_approval → content_approved, in_correction
      pending_approval: ["content_approved", "in_correction"],
      // in_correction → pending_approval
      in_correction: ["pending_approval"],
      // content_approved → payment_pending, published
      content_approved: ["payment_pending", "published"],
      // payment_pending → published
      payment_pending: ["published"],
      // published → nenhum (status final)
      published: [],
      // rejected → nenhum (status final)
      rejected: [],
      // Compatibilidade com valores antigos
      inscriptions: ["curation", "invited", "rejected"],
      approved_progress: ["pending_approval", "rejected"],
      awaiting_approval: ["content_approved", "in_correction"],
    };

    const allowedStatuses = validTransitions[fromStatus] || [];
    return allowedStatuses.includes(toStatus);
  };

  // Para usuários da campanha, permitir transições conforme documentação
  // O backoffice pode mover manualmente entre: applications, curation, invited, contract_pending, approved, script_pending, content_pending, rejected
  // Os status pending_approval, in_correction, content_approved, payment_pending, published são automáticos
  const validateUserStatusTransition = (
    fromStatus: string,
    toStatus: string
  ): boolean => {
    // Status automáticos não podem ser movidos manualmente
    const automaticStatuses = [
      "pending_approval",
      "in_correction",
      "content_approved",
      "payment_pending",
      "published",
    ];

    // Se o status de destino é automático, não permitir movimento manual
    if (automaticStatuses.includes(toStatus)) {
      return false;
    }

    // Transições válidas para movimento manual pelo backoffice
    const userValidTransitions: { [key: string]: string[] } = {
      // applications → curation, invited, rejected
      applications: ["curation", "invited", "rejected"],
      // curation → invited, approved, rejected
      curation: ["invited", "approved", "rejected"],
      // invited → contract_pending, rejected
      invited: ["contract_pending", "rejected"],
      // contract_pending → approved, rejected
      contract_pending: ["approved", "rejected"],
      // approved → script_pending, curation, rejected
      approved: ["script_pending", "curation", "rejected"],
      // script_pending → content_pending, rejected
      script_pending: ["content_pending", "rejected"],
      // content_pending → rejected
      content_pending: ["rejected"],
      // rejected → applications, curation (pode ser reativado)
      rejected: ["applications", "curation"],
      // Compatibilidade com valores antigos
      inscriptions: ["curation", "invited", "rejected"],
      approved_progress: ["curation", "rejected"],
    };

    const allowedStatuses = userValidTransitions[fromStatus] || [];
    return allowedStatuses.includes(toStatus);
  };

  const getTransitionNote = (fromStatus: string, toStatus: string): string => {
    // Notas de transição conforme documentação de status
    const notes: { [key: string]: string } = {
      // Transições de applications
      "applications->curation": "Movido para curadoria",
      "applications->invited": "Convidado para participar",
      "applications->rejected": "Recusado",
      // Transições de curation
      "curation->invited": "Convidado após curadoria",
      "curation->approved": "Aprovado após curadoria",
      "curation->rejected": "Recusado após curadoria",
      // Transições de invited
      "invited->contract_pending": "Contrato pendente",
      "invited->rejected": "Recusou o convite",
      // Transições de contract_pending
      "contract_pending->approved": "Contrato aprovado",
      "contract_pending->rejected": "Contrato recusado",
      // Transições de approved
      "approved->script_pending": "Aguardando aprovação de roteiro",
      "approved->rejected": "Removido da campanha",
      "approved->curation": "Movido para curadoria",
      // Transições de script_pending
      "script_pending->content_pending": "Roteiro aprovado, aguardando conteúdo",
      "script_pending->rejected": "Roteiro recusado",
      // Transições de content_pending
      "content_pending->pending_approval": "Conteúdo enviado para aprovação",
      "content_pending->rejected": "Recusado",
      // Transições de pending_approval
      "pending_approval->content_approved": "Conteúdo aprovado",
      "pending_approval->in_correction": "Conteúdo recusado, aguardando correção",
      // Transições de in_correction
      "in_correction->pending_approval": "Novo conteúdo enviado após correção",
      // Transições de content_approved
      "content_approved->payment_pending": "Aguardando pagamento",
      "content_approved->published": "Publicação identificada pelo bot",
      // Transições de payment_pending
      "payment_pending->published": "Pagamento processado, conteúdo publicado",
      // Transições de rejected (reativação)
      "rejected->applications": "Reativado - movido para inscrições",
      "rejected->curation": "Reativado - movido para curadoria",
      // Compatibilidade com valores antigos
      "inscriptions->approved": "Aprovado",
      "inscriptions->approved_progress": "Aprovado",
      "inscriptions->rejected": "Recusado",
      "inscriptions->curation": "Movido para curadoria",
      "curation->approved_progress": "Aprovado após curadoria",
      "invited->approved_progress": "Aceitou o convite",
      "approved_progress->pending_approval": "Conteúdo enviado para aprovação",
      "approved_progress->awaiting_approval": "Conteúdo enviado para aprovação",
      "awaiting_approval->content_approved": "Conteúdo aprovado",
      "awaiting_approval->in_correction": "Conteúdo recusado, aguardando correção",
      "in_correction->awaiting_approval": "Novo conteúdo enviado",
    };

    return (
      notes[`${fromStatus}->${toStatus}`] ||
      `Movido de ${getStatusLabel(fromStatus)} para ${getStatusLabel(toStatus)}`
    );
  };

  return (
    <>
      <div className="flex flex-col gap-6">
        {/* Controles */}
        <div className="bg-white rounded-3xl p-6 border border-neutral-200">
          <div className="flex items-center justify-between mb-4">
            <div className="w-48">
              <Select
                placeholder="Filtrar por fase"
                options={phaseOptions}
                value={selectedPhaseFilter}
                onChange={setSelectedPhaseFilter}
              />
            </div>
            {/* Removido botão "Lista" - apenas Kanban é usado agora */}
          </div>
        </div>

        {/* Kanban Board */}
        <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
          >
            <div className="bg-white rounded-3xl p-6 border border-neutral-200 overflow-x-auto">
              <div className="flex gap-4 min-w-max">
                {kanbanColumns.map((column) => {
                  const columnInfluencers = getInfluencersByStatus(column.id);
                  const influencerIds = columnInfluencers.map((inf) => idToString(inf.id));
                  return (
                    <KanbanColumn
                      key={column.id}
                      column={column}
                      influencers={columnInfluencers}
                      influencerIds={influencerIds}
                      onInfluencerClick={handleInfluencerClick}
                      getCurrentStatus={getCurrentStatus}
                      getAvailableActions={getAvailableActions}
                      getSocialNetworkIcon={getSocialNetworkIcon}
                      getSocialNetworkLabel={getSocialNetworkLabel}
                      onApprove={handleApprove}
                      onMoveToCuration={handleMoveToCuration}
                      setSelectedInfluencer={setSelectedInfluencer}
                      setIsRejectModalOpen={setIsRejectModalOpen}
                    />
                  );
                })}
              </div>
            </div>
            <DragOverlay>
              {activeId ? (
                <DragOverlayCard
                  influencer={
                    extendedInfluencers.find((inf) => inf.id === activeId)!
                  }
                  getSocialNetworkIcon={getSocialNetworkIcon}
                  getSocialNetworkLabel={getSocialNetworkLabel}
                />
              ) : null}
            </DragOverlay>
          </DndContext>
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
                <p className="text-neutral-600">
                  @{selectedInfluencer.username}
                </p>
                {selectedInfluencer.socialNetwork && (
                  <div className="flex items-center gap-2 mt-1">
                    <Icon
                      name={getSocialNetworkIcon(
                        selectedInfluencer.socialNetwork
                      )}
                      color="#404040"
                      size={16}
                    />
                    <span className="text-sm text-neutral-600">
                      {getSocialNetworkLabel(selectedInfluencer.socialNetwork)}
                    </span>
                  </div>
                )}
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
                  {(() => {
                    const nicheId = selectedInfluencer.niche;
                    if (!nicheId) return "-";
                    const niche = niches.find((n) => n.id.toString() === nicheId.toString());
                    return niche?.name || nicheId;
                  })()}
                </p>
              </div>
              <div>
                <p className="text-sm text-neutral-600 mb-1">Status</p>
                <Badge
                  text={getStatusLabel(getCurrentStatus(selectedInfluencer))}
                  backgroundColor="bg-primary-50"
                  textColor="text-primary-900"
                />
              </div>
            </div>

            {/* Log Histórico Completo */}
            {selectedInfluencer.statusHistory &&
              selectedInfluencer.statusHistory.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-neutral-950 mb-3">
                    Log Histórico Completo
                  </p>
                  <div className="bg-neutral-50 rounded-2xl p-4 max-h-64 overflow-y-auto">
                    <div className="flex flex-col gap-3">
                      {selectedInfluencer.statusHistory
                        .sort(
                          (a, b) =>
                            new Date(b.timestamp).getTime() -
                            new Date(a.timestamp).getTime()
                        )
                        .map((history) => (
                          <div
                            key={history.id}
                            className="border-l-2 border-primary-600 pl-3"
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm font-semibold text-neutral-950">
                                {getStatusLabel(history.status)}
                              </span>
                              <span className="text-xs text-neutral-600">
                                {new Date(history.timestamp).toLocaleDateString(
                                  "pt-BR",
                                  {
                                    day: "2-digit",
                                    month: "2-digit",
                                    year: "numeric",
                                  }
                                )}
                                {" às "}
                                {new Date(history.timestamp).toLocaleTimeString(
                                  "pt-BR",
                                  {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  }
                                )}
                              </span>
                            </div>
                            {history.notes && (
                              <p className="text-xs text-neutral-600">
                                {history.notes}
                              </p>
                            )}
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              )}

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

      {/* Modal de Rejeição */}
      {selectedInfluencer && isRejectModalOpen && (
        <Modal
          title="Recusar influenciador"
          onClose={() => {
            setIsRejectModalOpen(false);
            setRejectFeedback("");
            setSelectedInfluencer(null);
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
                O feedback é obrigatório ao recusar um influenciador. Ele será
                enviado ao influenciador para que possa entender o motivo da
                recusa.
              </p>
            </div>

            <Textarea
              label="Feedback de recusa"
              placeholder="Explique o motivo da recusa..."
              value={rejectFeedback}
              onChange={(e) => setRejectFeedback(e.target.value)}
              error={
                !rejectFeedback.trim() ? "Este campo é obrigatório" : undefined
              }
            />

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setIsRejectModalOpen(false);
                  setRejectFeedback("");
                  setSelectedInfluencer(null);
                }}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                onClick={() => {
                  if (rejectFeedback.trim()) {
                    handleReject(selectedInfluencer, rejectFeedback);
                  }
                }}
                disabled={!rejectFeedback.trim() || isUpdatingStatus}
                className="flex-1"
              >
                {isUpdatingStatus ? "Processando..." : "Confirmar recusa"}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}

// Componente de Chat
function ChatModal({
  influencer,
  onClose,
}: {
  influencer: ExtendedInfluencer;
  onClose: () => void;
}) {
  const { campaignId } = useParams({
    from: "/(private)/(app)/campaigns/$campaignId",
  });

  // Obter usuário atual para identificar mensagens do backoffice
  const { user: currentUser } = useCurrentUser();
  const currentUserId = currentUser?.id ? String(currentUser.id) : null;

  // Obter lista de usuários da campanha para encontrar campaignUserId
  const { data: campaignUsers = [], isLoading: isLoadingUsers } = useCampaignUsers(campaignId);

  // Encontrar o campaignUserId a partir do influencerId
  // O influencer.id pode ser o user_id ou o próprio campaign_user id
  const influencerIdStr = String(influencer.id);
  const influencerIdNum = isNaN(parseInt(influencerIdStr, 10)) ? null : parseInt(influencerIdStr, 10);

  // Tentar encontrar o usuário de diferentes formas
  let campaignUser: typeof campaignUsers[0] | undefined;

  if (influencerIdNum !== null) {
    // 1. PRIMEIRO: Tentar encontrar por user_id (influencerId é o user_id do usuário)
    // Este é o caso mais comum: influencer.id = user_id (74), precisamos encontrar campaignUserId (21)
    campaignUser = campaignUsers.find((u) => {
      if (!u.user_id) return false;
      const userId = typeof u.user_id === "string"
        ? parseInt(u.user_id, 10)
        : u.user_id;
      return userId === influencerIdNum;
    });

    // Log detalhado da busca
    if (!campaignUser) {
      console.warn("⚠️ Não encontrado por user_id. Tentando outras formas...", {
        influencerIdNum,
        availableUsers: campaignUsers.map(u => ({
          id: u.id,
          user_id: u.user_id,
          name: u.name,
        })),
      });
    }

    // 2. Se não encontrou por user_id, tentar pelo próprio id (influencer.id já é o campaignUserId)
    // Isso pode acontecer se o influencer.id já for o campaignUserId
    if (!campaignUser) {
      campaignUser = campaignUsers.find((u) => {
        const campaignUserId = typeof u.id === "string"
          ? parseInt(String(u.id), 10)
          : Number(u.id);
        return campaignUserId === influencerIdNum;
      });
    }
  }

  // 3. Tentar correspondência por string também
  if (!campaignUser) {
    campaignUser = campaignUsers.find((u) => {
      return String(u.id) === influencerIdStr ||
        (u.user_id && String(u.user_id) === influencerIdStr);
    });
  }

  // Log final do resultado
  if (campaignUser) {
    console.log("✅ CampaignUser encontrado:", {
      id: campaignUser.id,
      user_id: campaignUser.user_id,
      name: campaignUser.name,
      influencerIdProcurado: influencerIdNum,
      matchType: campaignUser.user_id === influencerIdNum
        ? "por user_id"
        : campaignUser.id === influencerIdNum
          ? "por id"
          : "por string",
    });
  } else {
    console.error("❌ CampaignUser NÃO encontrado para influencerId:", influencerIdNum);
  }

  // IMPORTANTE: campaignUserId é o id do CampaignUser, não o user_id
  // A API agora retorna: id="21" (campaignUserId) e user_id="74" (userId/influencerId)
  // Devemos usar o campo 'id' como campaignUserId para o WebSocket
  const campaignUserId = campaignUser
    ? (typeof campaignUser.id === "string"
      ? parseInt(String(campaignUser.id), 10)
      : Number(campaignUser.id))
    : null;

  // Validação crítica: garantir que não estamos usando user_id por engano
  if (campaignUser) {
    const extractedCampaignUserId = campaignUserId;
    const extractedUserId = campaignUser.user_id
      ? (typeof campaignUser.user_id === "string"
        ? parseInt(String(campaignUser.user_id), 10)
        : Number(campaignUser.user_id))
      : null;

    if (extractedCampaignUserId === extractedUserId) {
      console.error("❌ ERRO CRÍTICO: campaignUserId está igual ao user_id!");
      console.error("Isso significa que estamos usando o campo errado.");
      console.error("campaignUser completo:", campaignUser);
      console.error("campaignUser.id (deve ser campaignUserId):", campaignUser.id, typeof campaignUser.id);
      console.error("campaignUser.user_id (é o influencerId/userId):", campaignUser.user_id, typeof campaignUser.user_id);
    } else {
      console.log("✅ Validação OK - Usando campo correto:", {
        campaignUserId: extractedCampaignUserId,
        userId: extractedUserId,
        note: `campaignUserId=${extractedCampaignUserId} será usado no WebSocket (correto)`,
      });
    }
  }

  // Debug: log para verificar
  useEffect(() => {
    if (!isLoadingUsers && campaignUsers.length > 0) {
      console.log("🔍 Debug Chat - Dados completos:", {
        influencerId: influencer.id,
        influencerIdStr,
        influencerIdNum,
        campaignUsersCount: campaignUsers.length,
        campaignUsers: campaignUsers.map(u => ({
          id: u.id,
          idType: typeof u.id,
          user_id: u.user_id,
          user_idType: typeof u.user_id,
          name: u.name,
          // Verificar se id e user_id são iguais (problema!)
          idsAreEqual: u.id === u.user_id || String(u.id) === String(u.user_id),
        })),
        foundCampaignUser: campaignUser ? {
          id: campaignUser.id,
          user_id: campaignUser.user_id,
          name: campaignUser.name,
          // CRÍTICO: Verificar se estamos usando o campo correto
          warning: campaignUser.id === campaignUser.user_id
            ? "⚠️ PROBLEMA: id e user_id são iguais! A API pode estar retornando dados incorretos."
            : "OK: id e user_id são diferentes",
        } : null,
        campaignUserId,
        willConnect: !!campaignUserId,
      });
    }
  }, [campaignUsers, influencer.id, influencerIdStr, influencerIdNum, campaignUser, campaignUserId, isLoadingUsers]);

  // Hook de chat com WebSocket
  const {
    messages,
    isConnected,
    isLoading: isLoadingMessages,
    error: chatError,
    sendMessage,
    messagesEndRef,
  } = useChat({
    campaignId,
    influencerId: influencerIdNum || 0,
    campaignUserId: campaignUserId || 0,
    enabled: !!campaignUserId && influencerIdNum !== null,
  });

  // Log final para confirmar valores corretos
  useEffect(() => {
    if (campaignUserId && campaignUser) {
      console.log("🎯 Valores finais para WebSocket:", {
        campaignId,
        influencerId: influencerIdNum,
        campaignUserId, // Deve ser 21 (id da tabela campaign_users)
        userId: campaignUser.user_id
          ? (typeof campaignUser.user_id === "string"
            ? parseInt(String(campaignUser.user_id), 10)
            : Number(campaignUser.user_id))
          : null, // Deve ser 74 (user_id)
        note: "campaignUserId será usado no join_room do WebSocket",
      });
    }
  }, [campaignId, influencerIdNum, campaignUserId, campaignUser]);

  const [newMessage, setNewMessage] = useState("");
  const [attachments, setAttachments] = useState<
    Array<{ id: string; name: string; file: File }>
  >([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const newAttachments = Array.from(files).map((file) => ({
        id: Date.now().toString() + Math.random(),
        name: file.name,
        file,
      }));
      setAttachments([...attachments, ...newAttachments]);
    }
  };

  const handleRemoveAttachment = (id: string) => {
    setAttachments(attachments.filter((att) => att.id !== id));
  };

  const handleSendMessage = () => {
    if (!newMessage.trim() && attachments.length === 0) return;
    if (!isConnected) {
      toast.error("Não conectado ao servidor");
      return;
    }

    // TODO: Upload de arquivos precisa ser implementado
    // Por enquanto, apenas URLs são suportadas
    const attachmentUrls = attachments.map((att) =>
      URL.createObjectURL(att.file)
    );

    sendMessage(newMessage.trim(), attachmentUrls);

    setNewMessage("");
    setAttachments([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Determinar se mensagem é do influenciador ou do backoffice
  // Influenciador: sender_id === influencerId (user_id) → ESQUERDA
  // Backoffice: sender_id === currentUserId → DIREITA
  const isFromInfluencer = (senderId: string) => {
    const senderIdStr = String(senderId);
    const influencerIdStr = String(influencerIdNum);

    // Se o sender_id for igual ao influencerId, é do influenciador (esquerda)
    if (senderIdStr === influencerIdStr) {
      return true;
    }

    // Se o sender_id for igual ao currentUserId, é do backoffice (direita)
    if (currentUserId && senderIdStr === currentUserId) {
      return false;
    }

    // Por padrão, se não for o usuário atual, assume que é do influenciador
    return senderIdStr !== currentUserId;
  };

  return (
    <Modal title={`Chat com ${influencer.name}`} onClose={onClose}>
      <div className="flex flex-col h-[600px]">

        {/* Erro */}
        {chatError && (
          <div className="mb-2 px-3 py-1.5 rounded-lg bg-warning-50 text-warning-700 text-xs">
            ⚠️ {chatError}
          </div>
        )}

        {isLoadingUsers ? (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-neutral-600">Carregando informações do chat...</p>
          </div>
        ) : !campaignUserId ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <p className="text-neutral-600 mb-2">Não foi possível encontrar o usuário na campanha.</p>
              <p className="text-xs text-neutral-500">
                Influencer ID: {influencer.id}
              </p>
            </div>
          </div>
        ) : isLoadingMessages ? (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-neutral-600">Carregando mensagens...</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto flex flex-col gap-4 mb-4">
            {messages.length === 0 ? (
              <div className="flex-1 flex items-center justify-center">
                <p className="text-neutral-600">Nenhuma mensagem ainda. Inicie a conversa!</p>
              </div>
            ) : (
              messages.map((msg) => {
                const fromInfluencer = isFromInfluencer(msg.sender_id);
                return (
                  <div
                    key={msg.id}
                    className={`flex gap-3 items-end ${fromInfluencer ? "justify-start" : "justify-end"
                      }`}
                  >
                    {/* Avatar do influenciador (ESQUERDA) */}
                    {fromInfluencer && (
                      <Avatar
                        src={msg.sender_avatar || influencer.avatar || ""}
                        alt={msg.sender_name || influencer.name}
                        size="sm"
                        className="shrink-0"
                      />
                    )}

                    {/* Mensagem */}
                    <div
                      className={`max-w-[70%] rounded-2xl p-3 ${fromInfluencer
                        ? "bg-neutral-100 text-neutral-950 rounded-bl-sm"
                        : "bg-primary-600 text-neutral-50 rounded-br-sm"
                        }`}
                    >

                      {/* Texto da mensagem */}
                      {msg.message && (
                        <p className={`text-sm mb-2 ${fromInfluencer ? "text-neutral-950" : "text-neutral-50"}`}>
                          {msg.message}
                        </p>
                      )}

                      {/* Anexos */}
                      {msg.attachments && msg.attachments.length > 0 && (
                        <div className="flex flex-col gap-2 mb-2">
                          {msg.attachments.map((attUrl: string, idx: number) => (
                            <div
                              key={idx}
                              className={`flex items-center gap-2 p-2 rounded-lg ${fromInfluencer
                                ? "bg-neutral-200"
                                : "bg-primary-500"
                                }`}
                            >
                              <Icon
                                name="Paperclip"
                                color={fromInfluencer ? "#404040" : "#FAFAFA"}
                                size={16}
                              />
                              <a
                                href={attUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`text-xs underline truncate flex-1 ${fromInfluencer ? "text-neutral-700" : "text-neutral-50"
                                  }`}
                              >
                                Anexo {idx + 1}
                              </a>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Timestamp */}
                      <p
                        className={`text-xs mt-1 ${fromInfluencer
                          ? "text-neutral-500"
                          : "text-neutral-200 opacity-80"
                          }`}
                      >
                        {new Date(msg.created_at).toLocaleTimeString("pt-BR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>

                    {/* Avatar do backoffice (DIREITA) */}
                    {!fromInfluencer && (
                      <Avatar
                        src={msg.sender_avatar || ""}
                        alt={msg.sender_name || "Você"}
                        size="sm"
                        className="shrink-0"
                      />
                    )}
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>
        )}

        {/* Anexos selecionados */}
        {attachments.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-2">
            {attachments.map((att) => (
              <div
                key={att.id}
                className="flex items-center gap-2 bg-neutral-100 rounded-lg px-2 py-1 text-xs"
              >
                <Icon name="File" color="#404040" size={14} />
                <span className="max-w-[150px] truncate">{att.name}</span>
                <button
                  onClick={() => handleRemoveAttachment(att.id)}
                  className="text-danger-600 hover:text-danger-700"
                >
                  <Icon name="X" color="#dc2626" size={14} />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-2">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFileSelect}
            className="hidden"
            id="file-input"
          />
          <label htmlFor="file-input">
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
            >
              <Icon name="Paperclip" color="#404040" size={16} />
            </Button>
          </label>
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
            placeholder={isConnected ? "Digite sua mensagem..." : "Conectando..."}
            disabled={!isConnected || !campaignUserId}
            className="flex-1 h-11 rounded-3xl px-4 bg-neutral-100 outline-none focus:bg-neutral-200/70 disabled:opacity-50"
          />
          <Button
            onClick={handleSendMessage}
            className="w-min"
            disabled={
              !isConnected ||
              !campaignUserId ||
              (!newMessage.trim() && attachments.length === 0)
            }
          >
            <Icon name="Send" color="#FAFAFA" size={16} />
          </Button>
        </div>
      </div>
    </Modal>
  );
}
