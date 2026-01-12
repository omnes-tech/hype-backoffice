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
import {
  useInfluencerMessages,
  useSendMessage,
} from "@/hooks/use-campaign-chat";
import { useUpdateCampaignUserStatus } from "@/hooks/use-campaign-users";

interface ManagementTabProps {
  influencers: Influencer[];
  campaignPhases?: CampaignPhase[];
  campaignUsers?: Array<{
    id: string;
    name: string;
    username: string;
    avatar: string;
    followers: number;
    engagement: number;
    niche?: string;
    status: string;
  }>;
}

interface StatusHistory {
  id: string;
  status: string;
  timestamp: string;
  notes?: string;
}

interface ExtendedInfluencer extends Influencer {
  socialNetwork?: string;
  statusHistory?: StatusHistory[];
}

const kanbanColumns = [
  { id: "inscriptions", label: "Inscrições", color: "bg-neutral-50" },
  { id: "curation", label: "Curadoria", color: "bg-blue-50" },
  { id: "invited", label: "Convidados", color: "bg-yellow-50" },
  {
    id: "approved_progress",
    label: "Aprovados/Em Andamento",
    color: "bg-green-50",
  },
  {
    id: "awaiting_approval",
    label: "Aguardando Aprovação",
    color: "bg-orange-50",
  },
  { id: "in_correction", label: "Em Correção", color: "bg-yellow-100" },
  {
    id: "content_approved",
    label: "Conteúdo Aprovado/Aguardando Publicação",
    color: "bg-purple-50",
  },
  { id: "published", label: "Publicado", color: "bg-success-50" },
  {
    id: "rejected",
    label: "Recusados",
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
      className={`${column.color} rounded-xl p-2.5 min-w-[200px] max-w-[200px] min-h-[300px] shrink-0 transition-colors ${
        isOver ? "ring-2 ring-primary-500 ring-offset-2" : ""
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
              Nenhum influenciador
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
}: ManagementTabProps) {
  const { campaignId } = useParams({
    from: "/(private)/(app)/campaigns/$campaignId",
  });
  const [influencersState, setInfluencersState] = useState<
    ExtendedInfluencer[]
  >([]);
  const [selectedInfluencer, setSelectedInfluencer] =
    useState<ExtendedInfluencer | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isChatModalOpen, setIsChatModalOpen] = useState(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectFeedback, setRejectFeedback] = useState("");
  const [selectedPhaseFilter, setSelectedPhaseFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"kanban" | "list">("kanban");
  const [activeId, setActiveId] = useState<string | null>(null);

  // Hooks para mutations
  const { mutate: updateStatus, isPending: isUpdatingStatus } =
    useUpdateInfluencerStatus(campaignId);
  const { mutate: updateUserStatus } = useUpdateCampaignUserStatus(campaignId);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor)
  );

  // Função para mapear status da API para colunas do Kanban
  const mapUserStatusToKanbanColumn = (status: string): string => {
    const statusMap: { [key: string]: string } = {
      inscricoes: "inscriptions",
      aprovado: "approved",
      approved_progress: "approved_progress", // Status em inglês também
      curadoria: "curation",
      curation: "curation", // Status em inglês também
      recusado: "rejected",
      rejected: "rejected", // Status em inglês também
      invited: "invited",
      selected: "inscriptions",
      active: "approved_progress",
      published: "published",
    };
    return statusMap[status] || "inscriptions";
  };

  // Função para mapear coluna do Kanban para action da API
  const mapKanbanColumnToUserAction = (
    columnId: string
  ): "aprovado" | "curadoria" | "recusado" | "inscricoes" | null => {
    const columnMap: {
      [key: string]: "aprovado" | "curadoria" | "recusado" | "inscricoes";
    } = {
      inscriptions: "inscricoes",
      approved_progress: "aprovado",
      curation: "curadoria",
      rejected: "recusado",
    };
    return columnMap[columnId] || null;
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
                status: "inscriptions",
                timestamp: new Date(
                  Date.now() - 7 * 24 * 60 * 60 * 1000
                ).toISOString(),
                notes: "Influenciador se inscreveu na campanha",
              },
              {
                id: "2",
                status: currentMappedStatus,
                timestamp: new Date().toISOString(),
                notes: "Status atualizado",
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
                status: "inscriptions",
                timestamp: new Date(
                  Date.now() - 7 * 24 * 60 * 60 * 1000
                ).toISOString(),
                notes: "Influenciador se inscreveu na campanha",
              },
              {
                id: "2",
                status: currentMappedStatus,
                timestamp: new Date().toISOString(),
                notes: "Status atualizado",
              },
            ],
          };
        });

  const getCurrentStatus = (inf: ExtendedInfluencer): string => {
    // Priorizar o status direto do objeto (mais confiável e atualizado)
    if (inf.status) {
      const mappedStatus = mapUserStatusToKanbanColumn(inf.status);
      if (
        mappedStatus !== "inscriptions" ||
        !inf.statusHistory ||
        inf.statusHistory.length === 0
      ) {
        return mappedStatus;
      }
    }

    // Se não houver status ou for "inscriptions", verificar o statusHistory
    if (inf.statusHistory && inf.statusHistory.length > 0) {
      // Get the most recent status from history
      const sortedHistory = [...inf.statusHistory].sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
      return sortedHistory[0].status;
    }

    // Fallback final
    return "inscriptions";
  };

  const getInfluencersByStatus = (status: string) => {
    let filtered = extendedInfluencers.filter((inf) => {
      const currentStatus = getCurrentStatus(inf);
      return currentStatus === status;
    });

    // Filtrar por fase se selecionado
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
        influencer_id: influencer.id,
        status: targetStatus,
        feedback: "Aprovado pelo usuário",
      },
      {
        onSuccess: () => {
          updateInfluencerStatus(
            influencer.id,
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
        influencer_id: influencer.id,
        status: "rejected",
        feedback,
      },
      {
        onSuccess: () => {
          updateInfluencerStatus(influencer.id, "rejected", feedback);
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
        influencer_id: influencer.id,
        status: "curadoria",
        feedback: "Movido para curadoria",
      },
      {
        onSuccess: () => {
          updateInfluencerStatus(
            influencer.id,
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
    switch (status) {
      case "inscriptions":
        return [
          {
            label: "Aprovar",
            action: "approve",
            targetStatus: "approved_progress",
          },
          { label: "Recusar", action: "reject" },
          { label: "Colocar em Curadoria", action: "curation" },
        ];
      case "curation":
        return [
          {
            label: "Aprovar",
            action: "approve",
            targetStatus: "approved_progress",
          },
          { label: "Recusar", action: "reject" },
        ];
      case "invited":
        // Influenciador já foi convidado, aguardando resposta dele no app
        return [];
      case "approved_progress":
        // Aguardando upload do conteúdo pelo influenciador
        return [];
      case "awaiting_approval":
        return [
          {
            label: "Aprovar Conteúdo",
            action: "approve",
            targetStatus: "content_approved",
          },
          { label: "Recusar Conteúdo", action: "reject" },
        ];
      case "in_correction":
        // Aguardando novo upload do influenciador
        return [];
      case "content_approved":
        // Aguardando publicação e identificação pelo bot
        return [];
      case "published":
        // Fase concluída
        return [];
      case "rejected":
        // Não há ações disponíveis para recusados
        return [];
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

  const filteredAllInfluencers = extendedInfluencers.filter((inf) => {
    if (statusFilter === "all") return true;
    const currentStatus = getCurrentStatus(inf);
    return currentStatus === statusFilter;
  });

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
      const isUser = isCampaignUser(draggedInfluencer.id);

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

        // Mapear coluna para action da API
        const action = mapKanbanColumnToUserAction(targetStatus);

        if (!action) {
          toast.error(
            `Não é possível mover para "${getStatusLabel(targetStatus)}"`
          );
          return;
        }

        // Atualizar status do usuário via API
        updateUserStatus(
          {
            userId: draggedInfluencer.id,
            data: { action },
          },
          {
            onSuccess: () => {
              const notes = getTransitionNote(currentStatus, targetStatus);
              updateInfluencerStatus(draggedInfluencer.id, targetStatus, notes);
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
          ? "curadoria"
          : targetStatus === "approved_progress"
            ? "aprovado"
            : targetStatus === "rejected"
              ? "recusado"
              : targetStatus === "inscriptions"
                ? "inscricoes"
                : targetStatus;

      // Atualiza o status do influenciador via API
      const notes = getTransitionNote(currentStatus, targetStatus);
      updateStatus(
        {
          influencer_id: draggedInfluencer.id,
          status: apiStatus,
          feedback: notes,
        },
        {
          onSuccess: () => {
            updateInfluencerStatus(draggedInfluencer.id, targetStatus, notes);
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
    // Regras de transição válidas
    const validTransitions: { [key: string]: string[] } = {
      inscriptions: ["approved_progress", "rejected", "curation"],
      curation: ["approved_progress", "rejected"],
      invited: ["approved_progress", "rejected"], // Quando influenciador aceita/recusa no app
      approved_progress: ["awaiting_approval"], // Quando faz upload
      awaiting_approval: ["content_approved", "in_correction"], // Aprovar ou recusar conteúdo
      in_correction: ["awaiting_approval"], // Novo upload
      content_approved: ["published"], // Bot identifica publicação
      published: [], // Estado final
      rejected: [], // Estado final
    };

    const allowedStatuses = validTransitions[fromStatus] || [];
    return allowedStatuses.includes(toStatus);
  };

  // Para usuários da campanha, permitir transições mais flexíveis
  const validateUserStatusTransition = (
    fromStatus: string,
    toStatus: string
  ): boolean => {
    // Usuários podem ser movidos entre: inscrições, aprovado, curadoria, recusado
    const userValidTransitions: { [key: string]: string[] } = {
      inscriptions: ["approved_progress", "rejected", "curation"],
      curation: ["approved_progress", "rejected", "inscriptions"],
      approved_progress: ["curation", "rejected", "inscriptions"],
      rejected: ["inscriptions", "curation"], // Permitir reativar recusados
    };

    const allowedStatuses = userValidTransitions[fromStatus] || [];
    return allowedStatuses.includes(toStatus);
  };

  const getTransitionNote = (fromStatus: string, toStatus: string): string => {
    const notes: { [key: string]: string } = {
      "inscriptions->approved_progress": "Aprovado pelo usuário",
      "inscriptions->rejected": "Recusado pelo usuário",
      "inscriptions->curation": "Movido para curadoria",
      "curation->approved_progress": "Aprovado após curadoria",
      "curation->rejected": "Recusado após curadoria",
      "invited->approved_progress": "Aceitou o convite",
      "invited->rejected": "Recusou o convite",
      "approved_progress->awaiting_approval": "Conteúdo enviado para aprovação",
      "awaiting_approval->content_approved": "Conteúdo aprovado",
      "awaiting_approval->in_correction":
        "Conteúdo recusado, aguardando correção",
      "in_correction->awaiting_approval": "Novo conteúdo enviado",
      "content_approved->published": "Publicação identificada pelo bot",
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
            <Button variant="outline">
              <span>Todas as Fases</span>
            </Button>
            <div className="flex items-center gap-2">
              <Button
                variant={viewMode === "kanban" ? "default" : "outline"}
                onClick={() => setViewMode("kanban")}
              >
                <span>Kanban</span>
              </Button>
              <Button
                variant={viewMode === "list" ? "default" : "outline"}
                onClick={() => setViewMode("list")}
              >
                <span>Lista</span>
              </Button>
            </div>
          </div>
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

        {/* Kanban Board */}
        {viewMode === "kanban" && (
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
                  const influencerIds = columnInfluencers.map((inf) => inf.id);
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
        )}

        {/* Cards de influenciadores */}
        <div className="bg-white rounded-3xl p-6 border border-neutral-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-neutral-950">
              Todos os influenciadores
            </h3>
            <div className="w-48">
              <Select
                placeholder="Filtrar por status"
                options={[
                  { value: "all", label: "Todos os status" },
                  ...kanbanColumns.map((col) => ({
                    value: col.id,
                    label: col.label,
                  })),
                ]}
                value={statusFilter}
                onChange={setStatusFilter}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredAllInfluencers.map((influencer) => {
              const mappedStatus = getCurrentStatus(influencer);
              return (
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
                  {influencer.socialNetwork && (
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
                  )}
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
                      text={getStatusLabel(mappedStatus)}
                      backgroundColor="bg-primary-50"
                      textColor="text-primary-900"
                    />
                  </div>
                  {influencer.statusHistory &&
                    influencer.statusHistory.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-neutral-200">
                        <p className="text-xs font-medium text-neutral-600 mb-2">
                          Log histórico:
                        </p>
                        <div className="flex flex-col gap-1 max-h-24 overflow-y-auto">
                          {influencer.statusHistory.map((history) => (
                            <div
                              key={history.id}
                              className="text-xs text-neutral-500"
                            >
                              <span className="font-medium">
                                {new Date(history.timestamp).toLocaleDateString(
                                  "pt-BR",
                                  {
                                    day: "2-digit",
                                    month: "2-digit",
                                  }
                                )}
                              </span>{" "}
                              <span>
                                {new Date(history.timestamp).toLocaleTimeString(
                                  "pt-BR",
                                  {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  }
                                )}
                              </span>
                              {" - "}
                              <span>{getStatusLabel(history.status)}</span>
                              {history.notes && (
                                <span className="block text-neutral-400 mt-0.5">
                                  {history.notes}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                </div>
              );
            })}
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
                  {selectedInfluencer.niche}
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

  // Hooks para chat
  const { data: messagesData = [], isLoading: isLoadingMessages } =
    useInfluencerMessages(campaignId, influencer.id);
  const { mutate: sendMessage, isPending: isSending } = useSendMessage(
    campaignId,
    influencer.id
  );

  const [newMessage, setNewMessage] = useState("");
  const [attachments, setAttachments] = useState<
    Array<{ id: string; name: string; file: File }>
  >([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Transformar mensagens da API para formato do componente
  const messages = messagesData.map((msg: any) => ({
    id: msg.id,
    senderId: msg.sender_id,
    senderName: msg.sender_name,
    senderAvatar: msg.sender_avatar || "",
    message: msg.message,
    timestamp: msg.created_at,
    isFromInfluencer: msg.sender_id === influencer.id,
    attachments: msg.attachments || [],
  }));

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

    // TODO: Upload de arquivos precisa ser implementado
    // Por enquanto, apenas URLs são suportadas
    const attachmentUrls = attachments.map((att) =>
      URL.createObjectURL(att.file)
    );

    sendMessage(
      {
        message: newMessage,
        attachments: attachmentUrls,
      },
      {
        onSuccess: () => {
          setNewMessage("");
          setAttachments([]);
          if (fileInputRef.current) {
            fileInputRef.current.value = "";
          }
        },
        onError: (error: any) => {
          toast.error(error?.message || "Erro ao enviar mensagem");
        },
      }
    );
  };

  return (
    <Modal title={`Chat com ${influencer.name}`} onClose={onClose}>
      <div className="flex flex-col h-[600px]">
        {isLoadingMessages ? (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-neutral-600">Carregando mensagens...</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto flex flex-col gap-4 mb-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 ${
                  msg.isFromInfluencer ? "justify-start" : "justify-end"
                }`}
              >
                {msg.isFromInfluencer && (
                  <Avatar
                    src={msg.senderAvatar}
                    alt={msg.senderName}
                    size="sm"
                  />
                )}
                <div
                  className={`max-w-[70%] rounded-2xl p-3 ${
                    msg.isFromInfluencer
                      ? "bg-neutral-100 text-neutral-950"
                      : "bg-primary-600 text-neutral-50"
                  }`}
                >
                  <p className="text-sm font-medium mb-1">{msg.senderName}</p>
                  {msg.message && <p className="text-sm mb-2">{msg.message}</p>}
                  {msg.attachments && msg.attachments.length > 0 && (
                    <div className="flex flex-col gap-2 mb-2">
                      {msg.attachments.map((att: any) => (
                        <div
                          key={att.id}
                          className={`flex items-center gap-2 p-2 rounded-lg ${
                            msg.isFromInfluencer
                              ? "bg-neutral-200"
                              : "bg-primary-500"
                          }`}
                        >
                          <Icon
                            name="Paperclip"
                            color={msg.isFromInfluencer ? "#404040" : "#FAFAFA"}
                            size={16}
                          />
                          <a
                            href={att.url}
                            download={att.name}
                            className="text-xs underline truncate flex-1"
                          >
                            {att.name}
                          </a>
                        </div>
                      ))}
                    </div>
                  )}
                  <p
                    className={`text-xs ${msg.isFromInfluencer ? "text-neutral-600" : "opacity-70"} mt-1`}
                  >
                    {new Date(msg.timestamp).toLocaleTimeString("pt-BR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
                {!msg.isFromInfluencer && (
                  <Avatar
                    src={msg.senderAvatar}
                    alt={msg.senderName}
                    size="sm"
                  />
                )}
              </div>
            ))}
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
            placeholder="Digite sua mensagem..."
            className="flex-1 h-11 rounded-3xl px-4 bg-neutral-100 outline-none focus:bg-neutral-200/70"
          />
          <Button
            onClick={handleSendMessage}
            disabled={
              isSending || (!newMessage.trim() && attachments.length === 0)
            }
          >
            <Icon name="Send" color="#FAFAFA" size={16} />
          </Button>
        </div>
      </div>
    </Modal>
  );
}
