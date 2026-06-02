/**
 * Conexão socket.io em tempo real de uma live — namespace `/community/live`.
 *
 * Mesmo canal usado pelo app (chat/curtidas/viewers); o backoffice pluga para o
 * criador acompanhar a própria live. Auth via Bearer no handshake, igual ao
 * `use-payment-socket`. Em prod o nginx roteia `/socket.io/*`.
 *
 * Protocolo (ver hypeapp-api/docs/backoffice-community-lives.md §8):
 *  - cliente → `join_live { liveId }`, `leave_live`
 *  - servidor → evento único `frame` com `{ type, data }`:
 *      type `comment`      → novo comentário
 *      type `like_burst`   → `{ likes_count }`
 *      type `viewer_count` → `{ views_count }`
 */
import { useEffect, useRef } from "react";
import { io, type Socket } from "socket.io-client";

import { getAuthToken } from "@/lib/utils/api";
import type { LiveComment } from "@/shared/types";

type LiveFrame =
  | { type: "comment"; data: LiveComment }
  | { type: "like_burst"; data: { likes_count: number } }
  | { type: "viewer_count"; data: { views_count: number } };

interface UseLiveSocketOptions {
  liveId: string | null | undefined;
  enabled?: boolean;
  onComment?: (comment: LiveComment) => void;
  onLikeBurst?: (likesCount: number) => void;
  onViewerCount?: (viewsCount: number) => void;
}

function getSocketBaseUrl(): string {
  const serverUrl = import.meta.env.VITE_SERVER_URL as string;
  return serverUrl.replace(/\/api\/backoffice\/?$/, "");
}

export function useLiveSocket({
  liveId,
  enabled = true,
  onComment,
  onLikeBurst,
  onViewerCount,
}: UseLiveSocketOptions) {
  // Refs evitam reconectar quando só a identidade dos callbacks muda.
  const handlers = useRef({ onComment, onLikeBurst, onViewerCount });
  useEffect(() => {
    handlers.current = { onComment, onLikeBurst, onViewerCount };
  }, [onComment, onLikeBurst, onViewerCount]);

  useEffect(() => {
    if (!enabled || !liveId) return;

    const token = getAuthToken();
    const socket: Socket = io(`${getSocketBaseUrl()}/community/live`, {
      auth: { token: `Bearer ${token}` },
      reconnectionAttempts: 5,
    });

    socket.on("connect", () => {
      socket.emit("join_live", { liveId });
    });

    socket.on("frame", (frame: LiveFrame) => {
      switch (frame.type) {
        case "comment":
          handlers.current.onComment?.(frame.data);
          break;
        case "like_burst":
          handlers.current.onLikeBurst?.(frame.data.likes_count);
          break;
        case "viewer_count":
          handlers.current.onViewerCount?.(frame.data.views_count);
          break;
      }
    });

    return () => {
      socket.emit("leave_live");
      socket.disconnect();
    };
  }, [liveId, enabled]);
}
