import { useState, useRef, useEffect, useMemo } from "react";
import { useNavigate, useParams } from "@tanstack/react-router";
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
import { Modal } from "@/components/ui/modal";
import { Avatar } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/text-area";
import type { Influencer } from "@/shared/types";
import type { CampaignManagementParticipant } from "@/shared/services/campaign-management";
import { mapUserStatusToKanbanColumn } from "./management-status-map";
import { useUpdateInfluencerStatus } from "@/hooks/use-campaign-influencers";
import { useChat } from "@/hooks/use-chat";
import { useCampaignUsers } from "@/hooks/use-campaign-users";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useNiches } from "@/hooks/use-niches";
import { resolveNicheDisplayName } from "@/shared/utils/niche-display";

interface ManagementTabProps {
  participants: CampaignManagementParticipant[];
  isLoading?: boolean;
  error?: unknown;
  openChatInfluencerId?: string;
  /** Chamado após tentar abrir o chat (sucesso ou usuário não encontrado). */
  onOpenChatConsumed?: () => void;
}

interface StatusHistory {
  id: string;
  status: string;
  timestamp: string;
  notes?: string;
}

interface ExtendedInfluencer extends Omit<Influencer, "id"> {
  id: string | number;
  /** ID do usuário na plataforma (rota /influencer/$influencerId) */
  user_id?: string | number;
  socialNetwork?: string;
  social_networks?: Array<{
    id: number | string;
    type: string;
    name: string;
    username?: string;
    members?: number;
  }>;
  statusHistory?: StatusHistory[];
}

function participantToExtended(
  p: CampaignManagementParticipant,
): ExtendedInfluencer {
  const chronological = [...(p.status_history || [])].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  );
  const statusHistory = chronological.map((h) => ({
    id: String(h.id),
    status: mapUserStatusToKanbanColumn(h.status),
    timestamp: h.timestamp,
    notes: h.notes,
  }));
  const primaryNetwork = p.social_network || p.social_networks?.[0]?.type;
  return {
    id: p.id,
    user_id: p.user_id,
    name: p.name,
    username: p.username || "",
    avatar: p.avatar || "",
    followers: p.followers ?? 0,
    engagement: p.engagement ?? 0,
    niche: p.niche || "",
    nicheName: p.nicheName,
    status: (p.status || "applications") as Influencer["status"],
    social_networks: p.social_networks,
    socialNetwork: primaryNetwork,
    statusHistory,
  };
}

// Helper para converter ID para string
const idToString = (id: string | number): string => {
  return typeof id === "number" ? String(id) : id;
};

// Cores e labels alinhados ao Figma (FORÇA TAREFA - Gerenciamento)
const kanbanColumns = [
  { id: "applications", label: "Inscrições", color: "bg-[#f5f5f5]" },
  { id: "pre_selection", label: "Pré-seleção", color: "bg-[#faf5ff]" },
  {
    id: "pre_selection_curation",
    label: "Curadoria pré-seleção",
    color: "bg-[#f2e2ff]",
  },
  { id: "curation", label: "Curadoria", color: "bg-[#f0f6ff]" },
  { id: "invited", label: "Convidados", color: "bg-[#fdfce9]" },
  {
    id: "contract_pending",
    label: "Contrato Pendente",
    color: "bg-[#f1fdfa]",
  },
  {
    id: "approved",
    label: "Aprovado / Em Andamento",
    color: "bg-[#f1fdf4]",
  },
  {
    id: "script_pending",
    label: "Aguardando Aprovação Roteiro",
    color: "bg-[#eff2ff]",
  },
  {
    id: "content_pending",
    label: "Aguardando Conteúdo",
    color: "bg-[#fefbeb]",
  },
  {
    id: "pending_approval",
    label: "Aguardando Aprovação Conteúdo",
    color: "bg-[#fef7ed]",
  },
  { id: "in_correction", label: "Em Correção", color: "bg-[#fcf9c3]" },
  {
    id: "content_approved",
    label: "Conteúdo Aprovado",
    color: "bg-[#faf5ff]",
  },
  {
    id: "payment_pending",
    label: "Aguardando Pagamento",
    color: "bg-[#eefeff]",
  },
  { id: "published", label: "Publicado", color: "bg-[#f1fdf5]" },
  {
    id: "rejected",
    label: "Recusados",
    color: "bg-[#fdf2f2]",
    highlight: true,
  },
];

// Componente de Card Arrastável
function SortableInfluencerCard({
  influencer,
  onClick,
  getCurrentStatus,
  getAvailableActions,
  getSocialNetworkIcon: _getSocialNetworkIcon,
  getSocialNetworkLabel: _getSocialNetworkLabel,
  onApprove,
  onMoveToCuration,
  setSelectedInfluencer,
  setIsRejectModalOpen,
  hideActionButtons,
}: {
  influencer: ExtendedInfluencer;
  onClick: (influencer: ExtendedInfluencer) => void;
  getCurrentStatus: (inf: ExtendedInfluencer) => string;
  getAvailableActions: (
    status: string,
  ) => Array<{ label: string; action: string; targetStatus?: string }>;
  getSocialNetworkIcon: (
    network?: string,
  ) => keyof typeof import("lucide-react").icons;
  getSocialNetworkLabel: (network?: string) => string;
  onApprove: (influencer: ExtendedInfluencer, targetStatus: string) => void;
  onMoveToCuration: (influencer: ExtendedInfluencer) => void;
  setSelectedInfluencer: (inf: ExtendedInfluencer | null) => void;
  setIsRejectModalOpen: (open: boolean) => void;
  /** Coluna Pré-seleção: sem ações no card */
  hideActionButtons?: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: influencer.id });
  void _getSocialNetworkIcon;
  void _getSocialNetworkLabel;

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const currentStatus = getCurrentStatus(influencer);
  const availableActions = getAvailableActions(currentStatus);

  const lastHistory = influencer.statusHistory?.length
    ? influencer.statusHistory[influencer.statusHistory.length - 1]
    : null;
  const timestampStr = lastHistory
    ? `${new Date(lastHistory.timestamp).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" })} - ${new Date(lastHistory.timestamp).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`
    : "";

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-white rounded-lg border border-[#e5e5e5] p-3 cursor-move hover:shadow-md transition-all min-w-0"
    >
      <div
        {...attributes}
        {...listeners}
        onClick={() => onClick(influencer)}
        className="cursor-pointer hover:opacity-80 transition-opacity"
      >
        <div className="flex gap-2 items-center min-w-0">
          <div className="shrink-0 w-11 h-11 rounded-[12px] overflow-hidden">
            <Avatar src={influencer.avatar} alt={influencer.name} size="lg" />
          </div>
          <div className="flex-1 min-w-0 flex flex-col gap-0.5">
            <p className="text-base font-medium text-neutral-950 truncate">
              {influencer.name}
            </p>
            <p className="text-sm text-[#4d4d4d] truncate">
              @{influencer.username}
            </p>
          </div>
        </div>
        {timestampStr && (
          <div className="border-t border-b border-[#e5e5e5] py-3 flex items-center justify-center mt-3">
            <p className="text-base font-medium text-neutral-950">
              {timestampStr}
            </p>
          </div>
        )}
      </div>
      {!hideActionButtons && availableActions.length > 0 && (
        <div className="mt-3 flex flex-col gap-1">
          {availableActions.map((action) => (
            <button
              key={action.action}
              type="button"
              className="w-full h-11 px-4 rounded-[24px] border border-[#e5e5e5] flex items-center justify-center text-base font-semibold text-[#585858] hover:bg-neutral-50 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                if (action.action === "approve" && action.targetStatus) {
                  onApprove(influencer, action.targetStatus);
                } else if (action.action === "reject") {
                  setSelectedInfluencer(influencer);
                  setIsRejectModalOpen(true);
                } else if (action.action === "curation") {
                  onMoveToCuration(influencer);
                } else if (
                  (action.action === "invite" ||
                    action.action === "applications" ||
                    action.action === "pre_selection" ||
                    action.action === "pre_selection_curation") &&
                  action.targetStatus
                ) {
                  onApprove(influencer, action.targetStatus);
                }
              }}
            >
              {action.label}
            </button>
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
    status: string,
  ) => Array<{ label: string; action: string; targetStatus?: string }>;
  getSocialNetworkIcon: (
    network?: string,
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
      className={`${column.color} rounded-[12px] p-3 min-w-[260px] w-[260px] min-h-[300px] shrink-0 transition-colors flex flex-col gap-5 ${isOver ? "ring-2 ring-primary-500 ring-offset-2" : ""}`}
    >
      <div className="flex items-center justify-between shrink-0">
        <h4
          className={`text-base font-medium ${column.highlight ? "text-[#ff4a4a]" : "text-neutral-950"}`}
        >
          {column.label}
        </h4>
        <div className="flex items-center justify-center w-8 h-8 rounded-[32px] bg-[#e5e5e5] shrink-0">
          <span className="text-sm text-neutral-950">{influencers.length}</span>
        </div>
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
              hideActionButtons={column.id === "pre_selection"}
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
    network?: string,
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
  participants,
  isLoading = false,
  error = null,
  openChatInfluencerId,
  onOpenChatConsumed,
}: ManagementTabProps) {
  const { campaignId } = useParams({
    from: "/(private)/(app)/campaigns/$campaignId",
  });
  const navigate = useNavigate();
  const { data: niches = [] } = useNiches();
  const [influencersState, setInfluencersState] = useState<
    ExtendedInfluencer[]
  >([]);
  const [selectedInfluencer, setSelectedInfluencer] =
    useState<ExtendedInfluencer | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isChatModalOpen, setIsChatModalOpen] = useState(false);
  const openChatHandledKeyRef = useRef<string | null>(null);

  // Abrir chat automaticamente quando openChatInfluencerId for fornecido (vindo de notificação)
  useEffect(() => {
    openChatHandledKeyRef.current = null;
  }, [openChatInfluencerId]);

  useEffect(() => {
    if (!openChatInfluencerId) return;
    if (openChatHandledKeyRef.current === openChatInfluencerId) return;
    if (isLoading) return;

    const finish = () => {
      openChatHandledKeyRef.current = openChatInfluencerId;
      onOpenChatConsumed?.();
    };

    if (influencersState.length === 0) {
      finish();
      return;
    }

    const influencerIdStr = String(openChatInfluencerId);
    const influencerIdNum = parseInt(influencerIdStr, 10);

    let influencerToOpen: ExtendedInfluencer | undefined;

    if (!Number.isNaN(influencerIdNum)) {
      influencerToOpen = influencersState.find((inf) => {
        if (inf.user_id == null || String(inf.user_id).trim() === "")
          return false;
        const uid =
          typeof inf.user_id === "string"
            ? parseInt(inf.user_id, 10)
            : Number(inf.user_id);
        return uid === influencerIdNum;
      });
      if (!influencerToOpen) {
        influencerToOpen = influencersState.find((inf) => {
          const infId =
            typeof inf.id === "string" ? parseInt(inf.id, 10) : Number(inf.id);
          return (
            infId === influencerIdNum || String(inf.id) === influencerIdStr
          );
        });
      }
    } else {
      influencerToOpen = influencersState.find(
        (inf) => String(inf.id) === influencerIdStr,
      );
    }

    if (influencerToOpen) {
      setSelectedInfluencer(influencerToOpen);
      setIsChatModalOpen(true);
    }
    finish();
  }, [openChatInfluencerId, influencersState, isLoading, onOpenChatConsumed]);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectFeedback, setRejectFeedback] = useState("");
  /** Todas selecionadas = Geral (Kanban completo). Subconjunto = só essas colunas. */
  const [selectedPhaseFilterIds, setSelectedPhaseFilterIds] = useState<
    string[]
  >(() => kanbanColumns.map((c) => c.id));
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
    useSensor(KeyboardSensor),
  );

  const isCampaignUser = (_id: string) => true;

  useEffect(() => {
    if (!participants?.length) {
      setInfluencersState([]);
      return;
    }
    setInfluencersState(participants.map(participantToExtended));
  }, [participants]);

  const extendedInfluencers = influencersState;

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
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
      );
      return sortedHistory[0].status;
    }

    // Fallback final
    return "applications";
  };

  const getInfluencersByStatus = (status: string) => {
    return extendedInfluencers.filter((inf) => {
      const currentStatus = getCurrentStatus(inf);
      return currentStatus === status;
    });
  };

  const updateInfluencerStatus = (
    influencerId: string,
    newStatus: string,
    notes?: string,
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
      }),
    );
  };

  const handleApprove = (
    influencer: ExtendedInfluencer,
    targetStatus: string,
  ) => {
    // Se o influenciador tiver apenas uma rede social, usar o network_id dela
    const networkId =
      influencer.social_networks && influencer.social_networks.length === 1
        ? typeof influencer.social_networks[0].id === "string"
          ? Number(influencer.social_networks[0].id)
          : influencer.social_networks[0].id
        : undefined;

    updateStatus(
      {
        influencer_id: idToString(influencer.id),
        status: targetStatus,
        feedback: "Aprovado pelo usuário",
        network_id: networkId,
      },
      {
        onSuccess: () => {
          updateInfluencerStatus(
            idToString(influencer.id),
            targetStatus,
            "Aprovado pelo usuário",
          );
          toast.success("Influenciador aprovado com sucesso!");
          setIsModalOpen(false);
          setSelectedInfluencer(null);
        },
        onError: (error: any) => {
          toast.error(error?.message || "Erro ao aprovar influenciador");
        },
      },
    );
  };

  const handleReject = (influencer: ExtendedInfluencer, feedback: string) => {
    if (!feedback.trim()) {
      toast.error("Feedback é obrigatório ao recusar influenciador");
      return;
    }

    // Se o influenciador tiver apenas uma rede social, usar o network_id dela
    const networkId =
      influencer.social_networks && influencer.social_networks.length === 1
        ? typeof influencer.social_networks[0].id === "string"
          ? Number(influencer.social_networks[0].id)
          : influencer.social_networks[0].id
        : undefined;

    updateStatus(
      {
        influencer_id: idToString(influencer.id),
        status: "rejected",
        feedback,
        network_id: networkId,
      },
      {
        onSuccess: () => {
          updateInfluencerStatus(
            idToString(influencer.id),
            "rejected",
            feedback,
          );
          toast.success("Influenciador recusado");
          setIsRejectModalOpen(false);
          setRejectFeedback("");
          setIsModalOpen(false);
          setSelectedInfluencer(null);
        },
        onError: (error: any) => {
          toast.error(error?.message || "Erro ao recusar influenciador");
        },
      },
    );
  };

  const handleMoveToCuration = (influencer: ExtendedInfluencer) => {
    // Se o influenciador tiver apenas uma rede social, usar o network_id dela
    const networkId =
      influencer.social_networks && influencer.social_networks.length === 1
        ? typeof influencer.social_networks[0].id === "string"
          ? Number(influencer.social_networks[0].id)
          : influencer.social_networks[0].id
        : undefined;

    updateStatus(
      {
        influencer_id: idToString(influencer.id),
        status: "curation",
        feedback: "Movido para curadoria",
        network_id: networkId,
      },
      {
        onSuccess: () => {
          updateInfluencerStatus(
            idToString(influencer.id),
            "curation",
            "Movido para curadoria",
          );
          toast.success("Influenciador movido para curadoria");
          setIsModalOpen(false);
          setSelectedInfluencer(null);
        },
        onError: (error: any) => {
          toast.error(
            error?.message || "Erro ao mover influenciador para curadoria",
          );
        },
      },
    );
  };

  const getAvailableActions = (status: string) => {
    // Ações disponíveis conforme documentação de status
    // Nota: Aprovar/Recusar foram removidos - essas ações devem ser feitas nas guias específicas
    switch (status) {
      case "applications":
        return [];
      case "pre_selection":
        return [
          {
            label: "Mover para Curadoria pré-seleção",
            action: "pre_selection_curation",
            targetStatus: "pre_selection_curation",
          },
        ];
      case "pre_selection_curation":
        return [];
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
          {
            label: "Reativar (Applications)",
            action: "applications",
            targetStatus: "applications",
          },
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
      (inf) => inf.id === activeId,
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
      (inf) => inf.id === activeId,
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
          targetStatus,
        );

        if (!canMove) {
          toast.error(
            `Não é possível mover de "${getStatusLabel(currentStatus)}" para "${getStatusLabel(targetStatus)}"`,
          );
          return;
        }

        // Atualizar status do influenciador via API usando a rota correta
        const notes = getTransitionNote(currentStatus, targetStatus);
        // Se o influenciador tiver apenas uma rede social, usar o network_id dela
        const networkId =
          draggedInfluencer.social_networks &&
          draggedInfluencer.social_networks.length === 1
            ? typeof draggedInfluencer.social_networks[0].id === "string"
              ? Number(draggedInfluencer.social_networks[0].id)
              : draggedInfluencer.social_networks[0].id
            : undefined;

        updateStatus(
          {
            influencer_id: idToString(draggedInfluencer.id),
            status: targetStatus,
            feedback: notes,
            network_id: networkId,
          },
          {
            onSuccess: () => {
              updateInfluencerStatus(
                idToString(draggedInfluencer.id),
                targetStatus,
                notes,
              );
              toast.success("Status do usuário atualizado com sucesso!");
            },
            onError: (error: any) => {
              toast.error(
                error?.message || "Erro ao atualizar status do usuário",
              );
            },
          },
        );
        return;
      }

      // Para influenciadores normais, usar validação e atualização existente
      const canMove = validateStatusTransition(currentStatus, targetStatus);

      if (!canMove) {
        toast.error(
          `Não é possível mover de "${getStatusLabel(currentStatus)}" para "${getStatusLabel(targetStatus)}"`,
        );
        return;
      }
      const apiStatus =
        targetStatus === "curation"
          ? "curation"
          : targetStatus === "pre_selection"
            ? "pre_selection"
            : targetStatus === "pre_selection_curation"
              ? "pre_selection_curation"
              : targetStatus === "approved" ||
                  targetStatus === "approved_progress"
                ? "approved"
                : targetStatus === "rejected"
                  ? "rejected"
                  : targetStatus === "applications" ||
                      targetStatus === "inscriptions"
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
      // Se o influenciador tiver apenas uma rede social, usar o network_id dela
      const networkId =
        draggedInfluencer.social_networks &&
        draggedInfluencer.social_networks.length === 1
          ? typeof draggedInfluencer.social_networks[0].id === "string"
            ? Number(draggedInfluencer.social_networks[0].id)
            : draggedInfluencer.social_networks[0].id
          : undefined;

      updateStatus(
        {
          influencer_id: idToString(draggedInfluencer.id),
          status: apiStatus,
          feedback: notes,
          network_id: networkId,
        },
        {
          onSuccess: () => {
            updateInfluencerStatus(
              idToString(draggedInfluencer.id),
              targetStatus,
              notes,
            );
            toast.success("Status atualizado com sucesso!");
          },
          onError: (error: any) => {
            toast.error(error?.message || "Erro ao atualizar status");
          },
        },
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
    toStatus: string,
  ): boolean => {
    // Regras de transição válidas conforme documentação de status
    // Baseado em: API_ENDPOINTS_BACKOFFICE_CHAT.md e Untitled.md
    const validTransitions: { [key: string]: string[] } = {
      // applications → pre_selection, curation, invited, rejected
      applications: ["pre_selection", "curation", "invited", "rejected"],
      // pre_selection → pre_selection_curation, curation, rejected
      pre_selection: ["pre_selection_curation", "curation", "rejected"],
      // pre_selection_curation → curation, invited, approved, rejected
      pre_selection_curation: ["curation", "invited", "approved", "rejected"],
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
    toStatus: string,
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
      // applications → pre_selection, curation, invited, rejected
      applications: ["pre_selection", "curation", "invited", "rejected"],
      // pre_selection → pre_selection_curation, curation, rejected
      pre_selection: ["pre_selection_curation", "curation", "rejected"],
      // pre_selection_curation → curation, invited, approved, rejected
      pre_selection_curation: ["curation", "invited", "approved", "rejected"],
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
      "applications->pre_selection": "Movido para pré-seleção",
      "applications->invited": "Convidado para participar",
      "applications->rejected": "Recusado",
      // Transições de pre_selection
      "pre_selection->pre_selection_curation":
        "Movido para curadoria da pré-seleção",
      "pre_selection->curation": "Movido para curadoria",
      "pre_selection->rejected": "Recusado",
      // Transições de pre_selection_curation
      "pre_selection_curation->curation": "Movido para curadoria",
      "pre_selection_curation->invited":
        "Convidado após curadoria da pré-seleção",
      "pre_selection_curation->approved":
        "Aprovado após curadoria da pré-seleção",
      "pre_selection_curation->rejected": "Recusado",
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
      "script_pending->content_pending":
        "Roteiro aprovado, aguardando conteúdo",
      "script_pending->rejected": "Roteiro recusado",
      // Transições de content_pending
      "content_pending->pending_approval": "Conteúdo enviado para aprovação",
      "content_pending->rejected": "Recusado",
      // Transições de pending_approval
      "pending_approval->content_approved": "Conteúdo aprovado",
      "pending_approval->in_correction":
        "Conteúdo recusado, aguardando correção",
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
      "awaiting_approval->in_correction":
        "Conteúdo recusado, aguardando correção",
      "in_correction->awaiting_approval": "Novo conteúdo enviado",
    };

    return (
      notes[`${fromStatus}->${toStatus}`] ||
      `Movido de ${getStatusLabel(fromStatus)} para ${getStatusLabel(toStatus)}`
    );
  };

  const allPhaseIds = kanbanColumns.map((c) => c.id);
  const isAllPhasesFilterSelected =
    selectedPhaseFilterIds.length === allPhaseIds.length &&
    allPhaseIds.every((id) => selectedPhaseFilterIds.includes(id));

  const columnsToShow =
    isAllPhasesFilterSelected || selectedPhaseFilterIds.length === 0
      ? kanbanColumns
      : kanbanColumns.filter((col) => selectedPhaseFilterIds.includes(col.id));

  const togglePhaseFilter = (columnId: string) => {
    setSelectedPhaseFilterIds((prev) => {
      const allOn =
        prev.length === allPhaseIds.length &&
        allPhaseIds.every((id) => prev.includes(id));

      if (allOn) {
        return allPhaseIds.filter((id) => id !== columnId);
      }
      if (prev.includes(columnId)) {
        const next = prev.filter((id) => id !== columnId);
        return next.length === 0 ? [...allPhaseIds] : next;
      }
      return [...prev, columnId];
    });
  };

  return (
    <>
      <div className="flex flex-col gap-8">
        {/* Cabeçalho da seção - alinhado ao Figma */}
        <div className="flex flex-col gap-4">
          <h2 className="text-2xl font-semibold text-neutral-950">
            Gerenciamento da campanha
          </h2>
          <p className="text-base text-[#4d4d4d] leading-5">
            Organize participantes, acompanhe o andamento das entregas e ajuste
            configurações essenciais para manter a campanha sob controle
          </p>
        </div>

        {error != null && (
          <div className="rounded-lg border border-danger-200 bg-danger-50 px-4 py-3 text-sm text-danger-900">
            {error instanceof Error
              ? error.message
              : "Não foi possível carregar o gerenciamento da campanha."}
          </div>
        )}

        {/* Card único: pills de filtro + Kanban - alinhado ao Figma */}
        <div className="bg-white rounded-[12px] pt-5 overflow-hidden">
          {isLoading ? (
            <div className="px-5 pb-8 flex gap-3 overflow-x-auto min-h-[320px]">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="shrink-0 w-[260px] min-h-[280px] rounded-[12px] bg-neutral-100 animate-pulse"
                />
              ))}
            </div>
          ) : (
            <>
              {/* Pills de status (Geral + colunas) */}
              <div className="flex flex-wrap gap-2 px-5 mb-6">
                <button
                  type="button"
                  onClick={() => setSelectedPhaseFilterIds([...allPhaseIds])}
                  className={`px-3 py-2 border rounded-[32px] text-base transition-colors cursor-pointer ${
                    isAllPhasesFilterSelected
                      ? "bg-primary-600 text-white border-transparent"
                      : " border-[#e5e5e5] text-neutral-950 hover:bg-neutral-50"
                  }`}
                >
                  Geral
                </button>
                {kanbanColumns.map((col) => {
                  const isActive = selectedPhaseFilterIds.includes(col.id);
                  return (
                    <button
                      key={col.id}
                      type="button"
                      onClick={() => togglePhaseFilter(col.id)}
                      className={`px-3 py-2 border rounded-[32px] text-base transition-colors cursor-pointer ${
                        isActive
                          ? "bg-primary-600 text-white border-transparent"
                          : " border-[#e5e5e5] text-neutral-950 hover:bg-neutral-50"
                      }`}
                    >
                      {col.label}
                    </button>
                  );
                })}
              </div>

              {/* Kanban Board */}
              <DndContext
                sensors={sensors}
                collisionDetection={closestCorners}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDragEnd={handleDragEnd}
              >
                <div className="px-5 pb-5 overflow-x-auto">
                  <div className="flex gap-3 min-w-max">
                    {columnsToShow.map((column) => {
                      const columnInfluencers = getInfluencersByStatus(
                        column.id,
                      );
                      const influencerIds = columnInfluencers.map((inf) =>
                        idToString(inf.id),
                      );
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
                        extendedInfluencers.find(
                          (inf) => idToString(inf.id) === activeId,
                        )!
                      }
                      getSocialNetworkIcon={getSocialNetworkIcon}
                      getSocialNetworkLabel={getSocialNetworkLabel}
                    />
                  ) : null}
                </DragOverlay>
              </DndContext>
            </>
          )}
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
                {/* Mostrar todas as redes sociais */}
                {selectedInfluencer.social_networks &&
                selectedInfluencer.social_networks.length > 0 ? (
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    {selectedInfluencer.social_networks.map((network) => (
                      <Badge
                        key={network.id}
                        text={getSocialNetworkLabel(network.type)}
                        backgroundColor="bg-primary-50"
                        textColor="text-primary-900"
                      />
                    ))}
                  </div>
                ) : selectedInfluencer.socialNetwork ? (
                  <div className="flex items-center gap-2 mt-1">
                    <Icon
                      name={getSocialNetworkIcon(
                        selectedInfluencer.socialNetwork,
                      )}
                      color="#404040"
                      size={16}
                    />
                    <span className="text-sm text-neutral-600">
                      {getSocialNetworkLabel(selectedInfluencer.socialNetwork)}
                    </span>
                  </div>
                ) : null}
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
                  {resolveNicheDisplayName(
                    selectedInfluencer.niche,
                    niches,
                    selectedInfluencer.nicheName,
                  ) ?? "-"}
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

            {/* Redes Sociais */}
            {selectedInfluencer.social_networks &&
              selectedInfluencer.social_networks.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-neutral-950 mb-3">
                    Redes Sociais Utilizadas
                  </p>
                  <div className="bg-neutral-50 rounded-2xl p-4">
                    <div className="flex flex-col gap-3">
                      {selectedInfluencer.social_networks.map((network) => (
                        <div
                          key={network.id}
                          className="flex items-center justify-between p-3 bg-white rounded-xl border border-neutral-200"
                        >
                          <div className="flex items-center gap-3">
                            <Icon
                              name={getSocialNetworkIcon(network.type)}
                              color="#404040"
                              size={20}
                            />
                            <div>
                              <p className="text-sm font-semibold text-neutral-950">
                                {getSocialNetworkLabel(network.type)}
                              </p>
                              {network.username && (
                                <p className="text-xs text-neutral-600">
                                  @{network.username}
                                </p>
                              )}
                              {network.name &&
                                network.name !== network.username && (
                                  <p className="text-xs text-neutral-600">
                                    {network.name}
                                  </p>
                                )}
                            </div>
                          </div>
                          {network.members !== undefined &&
                            network.members > 0 && (
                              <div className="text-right">
                                <p className="text-sm font-semibold text-neutral-950">
                                  {network.members.toLocaleString("pt-BR")}
                                </p>
                                <p className="text-xs text-neutral-600">
                                  seguidores
                                </p>
                              </div>
                            )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

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
                            new Date(a.timestamp).getTime(),
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
                                  },
                                )}
                                {" às "}
                                {new Date(history.timestamp).toLocaleTimeString(
                                  "pt-BR",
                                  {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  },
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
              <Button
                variant="outline"
                className="flex-1"
                type="button"
                onClick={() => {
                  const userId =
                    selectedInfluencer.user_id != null &&
                    String(selectedInfluencer.user_id).trim() !== ""
                      ? String(selectedInfluencer.user_id)
                      : null;
                  if (!userId) {
                    toast.error(
                      "Não foi possível abrir o perfil: usuário sem user_id.",
                    );
                    return;
                  }
                  setIsModalOpen(false);
                  setSelectedInfluencer(null);
                  navigate({
                    to: "/influencer/$influencerId",
                    params: { influencerId: userId },
                  });
                }}
              >
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

  const { user: currentUser } = useCurrentUser();
  const currentUserId = currentUser?.id ? String(currentUser.id) : null;

  /** `GET /management`: `id` = campaign_users.id */
  const campaignUserIdNum = useMemo(() => {
    const n = Number.parseInt(String(influencer.id), 10);
    return Number.isFinite(n) ? n : 0;
  }, [influencer.id]);

  const platformUserFromParticipant = useMemo(() => {
    if (influencer.user_id == null || String(influencer.user_id).trim() === "")
      return null;
    const n = Number.parseInt(String(influencer.user_id), 10);
    return Number.isFinite(n) ? n : null;
  }, [influencer.user_id]);

  const needsUserLookup = platformUserFromParticipant == null;

  const { data: campaignUsers = [], isLoading: isLoadingUsers } =
    useCampaignUsers(campaignId ?? "", {
      enabled: !!campaignId && needsUserLookup && campaignUserIdNum > 0,
    });

  const platformUserId = useMemo(() => {
    if (platformUserFromParticipant != null) return platformUserFromParticipant;
    const row = campaignUsers.find(
      (u) => String(u.id) === String(influencer.id),
    );
    if (row?.user_id == null) return null;
    const n = Number.parseInt(String(row.user_id), 10);
    return Number.isFinite(n) ? n : null;
  }, [platformUserFromParticipant, campaignUsers, influencer.id]);

  const loadingChatIdentity = needsUserLookup && isLoadingUsers;
  const canChat =
    campaignUserIdNum > 0 && platformUserId != null && platformUserId > 0;

  const {
    messages,
    isConnected,
    isLoading: isLoadingMessages,
    error: chatError,
    sendMessage,
    messagesEndRef,
  } = useChat({
    campaignId: campaignId ?? "",
    influencerId: platformUserId ?? 0,
    campaignUserId: campaignUserIdNum,
    enabled: !!campaignId && canChat && !loadingChatIdentity,
  });

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

    // Upload de arquivos: criar URLs temporárias e revogar após envio
    const attachmentUrls = attachments.map((att) =>
      URL.createObjectURL(att.file),
    );

    sendMessage(newMessage.trim(), attachmentUrls);

    // Revogar URLs após envio para evitar memory leak
    attachmentUrls.forEach((url) => URL.revokeObjectURL(url));

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
    if (platformUserId != null && senderIdStr === String(platformUserId)) {
      return true;
    }
    if (currentUserId && senderIdStr === currentUserId) {
      return false;
    }
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

        {loadingChatIdentity ? (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-neutral-600">
              Carregando informações do chat...
            </p>
          </div>
        ) : !canChat ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <p className="text-neutral-600 mb-2">
                Não foi possível identificar o usuário da plataforma para este
                vínculo (user_id ausente).
              </p>
              <p className="text-xs text-neutral-500">
                Campaign user id: {String(influencer.id)}
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
                <p className="text-neutral-600">
                  Nenhuma mensagem ainda. Inicie a conversa!
                </p>
              </div>
            ) : (
              messages.map((msg) => {
                const fromInfluencer = isFromInfluencer(msg.sender_id);
                return (
                  <div
                    key={msg.id}
                    className={`flex gap-3 items-end ${
                      fromInfluencer ? "justify-start" : "justify-end"
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
                      className={`max-w-[70%] rounded-2xl p-3 ${
                        fromInfluencer
                          ? "bg-neutral-100 text-neutral-950 rounded-bl-sm"
                          : "bg-primary-600 text-neutral-50 rounded-br-sm"
                      }`}
                    >
                      {/* Texto da mensagem */}
                      {msg.message && (
                        <p
                          className={`text-sm mb-2 ${fromInfluencer ? "text-neutral-950" : "text-neutral-50"}`}
                        >
                          {msg.message}
                        </p>
                      )}

                      {/* Anexos */}
                      {msg.attachments && msg.attachments.length > 0 && (
                        <div className="flex flex-col gap-2 mb-2">
                          {msg.attachments.map(
                            (attUrl: string, idx: number) => (
                              <div
                                key={idx}
                                className={`flex items-center gap-2 p-2 rounded-lg ${
                                  fromInfluencer
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
                                  className={`text-xs underline truncate flex-1 ${
                                    fromInfluencer
                                      ? "text-neutral-700"
                                      : "text-neutral-50"
                                  }`}
                                >
                                  Anexo {idx + 1}
                                </a>
                              </div>
                            ),
                          )}
                        </div>
                      )}

                      {/* Timestamp */}
                      <p
                        className={`text-xs mt-1 ${
                          fromInfluencer
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
            placeholder={
              isConnected ? "Digite sua mensagem..." : "Conectando..."
            }
            disabled={!isConnected || !canChat}
            className="flex-1 h-11 rounded-3xl px-4 bg-neutral-100 outline-none focus:bg-neutral-200/70 disabled:opacity-50"
          />
          <Button
            onClick={handleSendMessage}
            className="w-min"
            disabled={
              !isConnected ||
              !canChat ||
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
