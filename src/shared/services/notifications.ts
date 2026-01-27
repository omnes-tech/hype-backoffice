import { getApiUrl, getAuthToken, getWorkspaceId } from "@/lib/utils/api";

export interface Notification {
  id: string;
  type: "content_approved" | "content_adjustment_requested" | "content_submitted" | "new_content_submission" | "new_message";
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
    const error = await request.json();
    throw error || "Failed to get notifications";
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
    const error = await request.json();
    throw error || "Failed to mark notification as read";
  }
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
    const error = await request.json();
    throw error || "Failed to mark all notifications as read";
  }

  const response = await request.json();
  return response.data;
}
