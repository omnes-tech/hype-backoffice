import { getApiUrl, getAuthToken, getWorkspaceId } from "@/lib/utils/api";
import type { ChatMessage } from "../types";

export interface SendMessageData {
  message: string;
  attachments?: string[];
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
  return response.data;
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

