import { useEffect, useState, useCallback, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { getApiUrl, getAuthToken, getWorkspaceId } from "@/lib/utils/api";
import { getInfluencerMessages } from "@/shared/services/chat";
import type { ChatMessage } from "@/shared/types";

interface UseChatOptions {
  campaignId: string;
  influencerId: number | string; // user_id do influenciador
  campaignUserId: number; // ID do registro campaign_users
  enabled?: boolean;
}

export function useChat({
  campaignId,
  influencerId,
  campaignUserId,
  enabled = true,
}: UseChatOptions) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Carregar histórico inicial
  const loadHistory = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await getInfluencerMessages(
        campaignId,
        String(influencerId)
      );

      // Reverter para ordem cronológica (API retorna DESC)
      const reversed = response.reverse();
      setMessages(reversed);
      setError(null);
    } catch (err: any) {
      console.error("Erro ao carregar histórico:", err);
      setError("Erro ao carregar histórico de mensagens");
    } finally {
      setIsLoading(false);
    }
  }, [campaignId, influencerId]);

  // Conectar WebSocket
  useEffect(() => {
    if (!enabled || !campaignId || !campaignUserId) {
      console.log("🚫 Chat desabilitado:", { enabled, campaignId, campaignUserId });
      return;
    }

    // Validar formato do campaignId (deve ser UUID)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(campaignId)) {
      console.error("❌ campaignId não está no formato UUID válido:", campaignId);
      setError("ID da campanha inválido");
      return;
    }

    const token = getAuthToken();
    if (!token) {
      setError("Token de autenticação não encontrado");
      console.error("❌ Token de autenticação não encontrado");
      return;
    }
    
    const workspaceId = getWorkspaceId();
    if (!workspaceId) {
      setError("Workspace ID não encontrado");
      console.error("❌ Workspace ID não encontrado");
      return;
    }
    
    console.log("🔑 Autenticação:", { 
      hasToken: !!token, 
      workspaceId,
      campaignId,
      campaignUserId 
    });

    // Construir URL WebSocket
    // getApiUrl retorna algo como: http://localhost:3000/api/backoffice
    // Precisamos: ws://localhost:3000/chat ou wss://localhost:3000/chat
    const apiBaseUrl = getApiUrl("");
    console.log("🔗 API Base URL:", apiBaseUrl);
    
    // Extrair a base URL (sem /api/backoffice)
    let baseUrl = apiBaseUrl;
    
    // Remover /api/backoffice do final se existir
    if (baseUrl.endsWith("/api/backoffice") || baseUrl.endsWith("/api/backoffice/")) {
      baseUrl = baseUrl.replace(/\/api\/backoffice\/?$/, "");
    }
    
    // Determinar protocolo (ws ou wss)
    const isHttps = baseUrl.startsWith("https");
    const protocol = isHttps ? "wss" : "ws";
    
    // Remover protocolo http/https para adicionar ws/wss
    const host = baseUrl.replace(/^https?:\/\//, "");
    
    // Construir URL final
    const socketUrl = `${protocol}://${host}/chat`;
    
    console.log("🔌 Conectando ao WebSocket:", {
      apiBaseUrl,
      baseUrl,
      protocol,
      host,
      socketUrl,
      campaignId,
      campaignUserId,
      influencerId,
    });

    const newSocket = io(socketUrl, {
      auth: { 
        token,
        workspaceId, // Enviar workspaceId na autenticação
      },
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
      timeout: 20000,
      extraHeaders: {
        "Workspace-Id": workspaceId, // Também enviar como header
      },
    });

    // Eventos de conexão
    newSocket.on("connect", () => {
      console.log("✅ Conectado ao chat");
      setIsConnected(true);
      setError(null);

      // Entrar na sala
      const joinRoomData = {
        campaignId,
        campaignUserId,
      };
      console.log("🚪 Tentando entrar na sala:", {
        ...joinRoomData,
        note: `campaignUserId=${campaignUserId} deve ser o id da tabela campaign_users, não o user_id`,
      });
      newSocket.emit("join_room", joinRoomData);
    });

    newSocket.on("disconnect", (reason: string) => {
      console.log("❌ Desconectado:", reason);
      setIsConnected(false);

      if (reason === "io server disconnect") {
        // Servidor desconectou, reconectar manualmente
        newSocket.connect();
      }
    });

    newSocket.on("connect_error", (err: Error) => {
      console.error("❌ Erro de conexão:", err);
      setError("Erro ao conectar ao chat. Tentando reconectar...");
      setIsConnected(false);
    });

    newSocket.on("reconnect", (attemptNumber: number) => {
      console.log(`✅ Reconectado após ${attemptNumber} tentativas`);
      setIsConnected(true);
      setError(null);
    });

    newSocket.on("reconnect_attempt", (attemptNumber: number) => {
      console.log(`🔄 Tentativa de reconexão ${attemptNumber}...`);
    });

    newSocket.on("reconnect_failed", () => {
      console.error("❌ Falha ao reconectar");
      setError("Falha ao reconectar. Verifique sua conexão.");
    });

    // Confirmar entrada na sala
    newSocket.on("joined_room", (data: any) => {
      console.log("✅ Entrou na sala:", data);
      setError(null);
    });

    // Receber novas mensagens
    newSocket.on("new_message", (message: ChatMessage) => {
      console.log("📨 Nova mensagem:", message);
      setMessages((prev) => {
        // Evitar duplicatas
        if (prev.some((m) => m.id === message.id)) {
          return prev;
        }
        return [...prev, message];
      });

      // Marcar como lida automaticamente se não foi enviada por mim
      // (assumindo que o sender_id do backoffice é diferente do influencerId)
      if (message.sender_id !== String(influencerId)) {
        newSocket.emit("mark_as_read", { messageId: message.id });
      }
    });

    // Confirmação de envio
    newSocket.on("message_sent", (data: { id: string }) => {
      console.log("✅ Mensagem enviada:", data.id);
    });

    // Erros
    newSocket.on("error", (err: { message: string }) => {
      console.error("❌ Erro do servidor:", err.message);
      console.error("❌ Detalhes do erro:", {
        error: err,
        campaignId,
        campaignUserId,
        influencerId,
        workspaceId,
        socketId: newSocket.id,
      });
      
      // Mensagens de erro mais amigáveis
      let errorMessage = err.message;
      if (err.message.includes("não encontrada") || err.message.includes("não encontrado")) {
        errorMessage = "Campanha não encontrada. Verifique se você tem acesso a esta campanha.";
      } else if (err.message.includes("não autenticado") || err.message.includes("autenticação")) {
        errorMessage = "Erro de autenticação. Por favor, faça login novamente.";
      } else if (err.message.includes("Acesso negado") || err.message.includes("permissão")) {
        errorMessage = "Você não tem permissão para acessar este chat.";
      }
      
      setError(errorMessage);
    });

    setSocket(newSocket);

    // Carregar histórico
    loadHistory();

    // Cleanup
    return () => {
      if (newSocket.connected) {
        newSocket.emit("leave_room", { campaignId, campaignUserId });
      }
      newSocket.disconnect();
    };
  }, [enabled, campaignId, campaignUserId, influencerId, loadHistory]);

  // Enviar mensagem
  const sendMessage = useCallback(
    (text: string, attachments: string[] = []) => {
      if (!socket || !isConnected) {
        setError("Não conectado ao servidor");
        return;
      }

      if (!text.trim() && attachments.length === 0) {
        return;
      }

      socket.emit("send_message", {
        campaignId,
        campaignUserId,
        message: text.trim(),
        attachments,
      });
    },
    [socket, isConnected, campaignId, campaignUserId]
  );

  // Marcar como lida
  const markAsRead = useCallback(
    (messageId: string) => {
      if (socket && isConnected) {
        socket.emit("mark_as_read", { messageId });
      }
    },
    [socket, isConnected]
  );

  // Scroll para última mensagem
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return {
    messages,
    isConnected,
    isLoading,
    error,
    sendMessage,
    markAsRead,
    reloadHistory: loadHistory,
    messagesEndRef,
  };
}
