import { getApiUrl, getAuthToken, getWorkspaceId } from "@/lib/utils/api";

export interface CampaignUser {
  id: string;
  name: string;
  username: string;
  avatar: string;
  followers: number;
  engagement: number;
  niche?: string;
  status: string;
}

/**
 * Lista usuários inscritos na campanha
 */
export async function getCampaignUsers(
  campaignId: string
): Promise<CampaignUser[]> {
  const workspaceId = getWorkspaceId();
  if (!workspaceId) {
    throw new Error("Workspace ID é obrigatório");
  }

  const request = await fetch(
    getApiUrl(`/campaigns/${campaignId}/users`),
    {
      method: "GET",
      headers: {
        Accept: "application/json",
        "Client-Type": "backoffice",
        Authorization: `Bearer ${getAuthToken()}`,
        "Workspace-Id": workspaceId,
      },
    }
  );

  if (!request.ok) {
    const error = await request.json();
    throw error || "Failed to get campaign users";
  }

  const response = await request.json();
  return response.data;
}

export interface UpdateUserStatusData {
  action: "aprovado" | "curadoria" | "recusado" | "inscricoes";
}

/**
 * Atualiza o status de um usuário na campanha
 */
export async function updateCampaignUserStatus(
  campaignId: string,
  userId: string,
  data: UpdateUserStatusData
): Promise<void> {
  const workspaceId = getWorkspaceId();
  if (!workspaceId) {
    throw new Error("Workspace ID é obrigatório");
  }

  const request = await fetch(
    getApiUrl(`/campaigns/${campaignId}/users/${userId}`),
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "Client-Type": "backoffice",
        Authorization: `Bearer ${getAuthToken()}`,
        "Workspace-Id": workspaceId,
      },
      body: JSON.stringify(data),
    }
  );

  if (!request.ok) {
    const error = await request.json();
    throw error || "Failed to update campaign user status";
  }
}

