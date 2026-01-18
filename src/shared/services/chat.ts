import { getApiUrl, getAuthToken, getWorkspaceId } from "@/lib/utils/api";
import type { ChatMessage } from "../types";
import { getCampaignUsers } from "./campaign-users";

export interface SendMessageData {
  message: string;
  attachments?: string[];
}

/**
 * Obtém o campaignUserId a partir do influencerId (user_id)
 */
export async function getCampaignUserId(
  campaignId: string,
  influencerId: number | string
): Promise<number | null> {
  try {
    const users = await getCampaignUsers(campaignId);
    const influencerIdNum = typeof influencerId === "string" ? parseInt(influencerId, 10) : influencerId;
    
    // Encontrar o usuário pelo user_id
    const user = users.find((u) => {
      const userId = typeof u.user_id === "string" ? parseInt(u.user_id, 10) : u.user_id;
      return userId === influencerIdNum;
    });
    
    if (user) {
      // O id do CampaignUser é o campaignUserId
      const campaignUserId = typeof user.id === "string" ? parseInt(user.id, 10) : user.id;
      return campaignUserId;
    }
    
    return null;
  } catch (error) {
    console.error("Erro ao buscar campaignUserId:", error);
    return null;
  }
}

/**
 * Lista todas as mensagens do chat com o influenciador
 */
export async function getInfluencerMessages(
  campaignId: string,
  influencerId: string
): Promise<ChatMessage[]> {
  const workspaceId = getWorkspaceId();
  if (!workspaceId) {
    throw new Error("Workspace ID é obrigatório");
  }

  const request = await fetch(
    getApiUrl(
      `/campaigns/${campaignId}/influencers/${influencerId}/messages`
    ),
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
    throw error || "Failed to get influencer messages";
  }

  const response = await request.json();
  // Normalizar mensagens para o formato esperado
  return response.data.map((msg: any) => ({
    id: msg.id,
    campaign_id: msg.campaign_id,
    influencer_id: msg.influencer_id,
    sender_id: msg.sender_id,
    sender_name: msg.sender_name,
    sender_avatar: msg.sender_avatar || null,
    message: msg.message,
    attachments: msg.attachments || [],
    read_at: msg.read_at || null,
    created_at: msg.created_at,
  }));
}

/**
 * Envia uma mensagem para o influenciador
 */
export async function sendMessage(
  campaignId: string,
  influencerId: string,
  data: SendMessageData
): Promise<ChatMessage> {
  const workspaceId = getWorkspaceId();
  if (!workspaceId) {
    throw new Error("Workspace ID é obrigatório");
  }

  const request = await fetch(
    getApiUrl(
      `/campaigns/${campaignId}/influencers/${influencerId}/messages`
    ),
    {
      method: "POST",
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
    throw error || "Failed to send message";
  }

  const response = await request.json();
  return response.data;
}

