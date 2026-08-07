import { getApiUrl, getAuthToken, getWorkspaceId } from "@/lib/utils/api";

/** Tipos de notificação conhecidos; a API pode enviar outros (fallback por metadata / heurística). */
export type NotificationType =
  | "content_approved"
  | "content_adjustment_requested"
  | "content_submitted"
  | "new_content_submission"
  | "new_message"
  | "influencer_approved"
  | string;

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  boldText: string | null;
  created_at: string;
  read_at: string | null;
  metadata: {
    campaign_id?: string;
    content_id?: string;
    campaign_title?: string;
    feedback?: string;
    influencer_id?: number;
    campaign_user_id?: number;
    /** Aba da campanha a abrir (ex.: `curation`, `applications`, `management`). */
    target_tab?: string;
  };
}

/**
 * Lista todas as notificações do usuário autenticado (backoffice)
 */
export async function getNotifications(): Promise<Notification[]> {
  const token = getAuthToken();
  const workspaceId = getWorkspaceId();
  
  if (!token) {
    throw new Error("Token de autenticação não encontrado");
  }
  
  if (!workspaceId) {
    throw new Error("Workspace ID é obrigatório");
  }

  const request = await fetch(getApiUrl("/notifications"), {
    method: "GET",
    headers: {
      Accept: "application/json",
      "Client-Type": "backoffice",
      Authorization: `Bearer ${token}`,
      "Workspace-Id": workspaceId,
    },
  });

  if (!request.ok) {
    let errorData;
    try {
      errorData = await request.json();
    } catch {
      errorData = { message: "Failed to get notifications" };
    }
    throw errorData || "Failed to get notifications";
    }

  const response = await request.json();
  return response.data || [];
}

/**
 * Marca uma notificação como lida
 */
export async function markNotificationAsRead(notificationId: string): Promise<void> {
  const token = getAuthToken();
  const workspaceId = getWorkspaceId();
  
  if (!token) {
    throw new Error("Token de autenticação não encontrado");
  }
  
  if (!workspaceId) {
    throw new Error("Workspace ID é obrigatório");
  }

  const request = await fetch(
    getApiUrl(`/notifications/${notificationId}/read`),
    {
      method: "PUT",
      headers: {
        Accept: "application/json",
        "Client-Type": "backoffice",
        Authorization: `Bearer ${token}`,
        "Workspace-Id": workspaceId,
      },
    }
  );

  if (!request.ok) {
    let errorData;
    try {
      errorData = await request.json();
    } catch {
      errorData = { message: "Failed to mark notification as read" };
    }
    throw errorData || "Failed to mark notification as read";
    }
}

/**
 * Marca como lidas as notificações de chat (new_message) de uma conversa —
 * chamado ao abrir o chat, para o sino refletir que as mensagens foram vistas
 * (#11/#21). `influencerId` restringe a uma conversa específica da campanha.
 */
export async function markChatNotificationsAsRead(
  campaignId: string,
  influencerId?: string | number,
): Promise<{ updated_count: number }> {
  const token = getAuthToken();
  const workspaceId = getWorkspaceId();

  if (!token) throw new Error("Token de autenticação não encontrado");
  if (!workspaceId) throw new Error("Workspace ID é obrigatório");

  const params = new URLSearchParams({ campaign_id: campaignId });
  if (influencerId != null && String(influencerId).trim() !== "") {
    params.set("influencer_id", String(influencerId));
  }

  const request = await fetch(
    getApiUrl(`/notifications/chat/read?${params.toString()}`),
    {
      method: "PUT",
      headers: {
        Accept: "application/json",
        "Client-Type": "backoffice",
        Authorization: `Bearer ${token}`,
        "Workspace-Id": workspaceId,
      },
    }
  );

  if (!request.ok) {
    throw new Error("Falha ao marcar notificações de chat como lidas");
  }

  const response = await request.json();
  return response.data;
}

/**
 * Marca todas as notificações como lidas
 */
export async function markAllNotificationsAsRead(): Promise<{ message: string; updated_count: number }> {
  const token = getAuthToken();
  const workspaceId = getWorkspaceId();
  
  if (!token) {
    throw new Error("Token de autenticação não encontrado");
  }
  
  if (!workspaceId) {
    throw new Error("Workspace ID é obrigatório");
  }

  const request = await fetch(
    getApiUrl("/notifications/read-all"),
    {
      method: "PUT",
      headers: {
        Accept: "application/json",
        "Client-Type": "backoffice",
        Authorization: `Bearer ${token}`,
        "Workspace-Id": workspaceId,
      },
    }
  );

  if (!request.ok) {
    let errorData;
    try {
      errorData = await request.json();
    } catch {
      errorData = { message: "Failed to mark all notifications as read" };
    }
    throw errorData || "Failed to mark all notifications as read";
    }

  const response = await request.json();
  return response.data;
}
