import type { Influencer } from "@/shared/types";
import type { CampaignManagementParticipant } from "@/shared/services/campaign-management";
import { mapUserStatusToKanbanColumn } from "./management-status-map";

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

export interface StatusHistory {
  id: string;
  status: string;
  timestamp: string;
  notes?: string;
}

export interface ExtendedInfluencer extends Omit<Influencer, "id"> {
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

// ---------------------------------------------------------------------------
// Configuração das colunas do Kanban
// ---------------------------------------------------------------------------

export const kanbanColumns = [
  { id: "applications", label: "Inscrições", color: "bg-[#f5f5f5]" },
  { id: "pre_selection", label: "Pré-seleção", color: "bg-[#faf5ff]" },
  { id: "pre_selection_curation", label: "Curadoria pré-seleção", color: "bg-[#f2e2ff]" },
  { id: "curation", label: "Curadoria", color: "bg-[#f0f6ff]" },
  { id: "invited", label: "Convidados", color: "bg-[#fdfce9]" },
  { id: "contract_pending", label: "Contrato Pendente", color: "bg-[#f1fdfa]" },
  { id: "approved", label: "Aprovado / Em Andamento", color: "bg-[#f1fdf4]" },
  { id: "script_pending", label: "Aguardando Aprovação Roteiro", color: "bg-[#eff2ff]" },
  { id: "awaiting_shipment", label: "Aguardando Envio", color: "bg-[#fff7ed]" },
  { id: "awaiting_receipt", label: "Aguardando Recebimento", color: "bg-[#fef3c7]" },
  { id: "content_pending", label: "Aguardando Conteúdo", color: "bg-[#fefbeb]" },
  { id: "pending_approval", label: "Aguardando Aprovação Conteúdo", color: "bg-[#fef7ed]" },
  { id: "in_correction", label: "Em Correção", color: "bg-[#fcf9c3]" },
  { id: "content_approved", label: "Conteúdo Aprovado", color: "bg-[#faf5ff]" },
  { id: "payment_pending", label: "Aguardando Pagamento", color: "bg-[#eefeff]" },
  { id: "published", label: "Publicado", color: "bg-[#f1fdf5]" },
  { id: "rejected", label: "Recusados", color: "bg-[#fdf2f2]", highlight: true },
] as const;

/** Tipo normalizado de coluna — `highlight` é opcional para evitar erros de union. */
export type KanbanColumn = {
  id: string;
  label: string;
  color: string;
  highlight?: boolean;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export const idToString = (id: string | number): string =>
  typeof id === "number" ? String(id) : id;

export function participantToExtended(p: CampaignManagementParticipant): ExtendedInfluencer {
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
