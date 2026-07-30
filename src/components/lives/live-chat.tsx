import { useEffect, useRef, useState } from "react";

import { Avatar } from "@/components/ui/avatar";
import { Icon } from "@/components/ui/icon";
import type { LiveComment } from "@/shared/types";

/** Formata ISO → "18:32" (hora local). */
function formatTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

interface LiveChatProps {
  comments: LiveComment[];
  /** Sala ainda não está no ar (não há chat). */
  idle?: boolean;
  connected?: boolean;
  onSend?: (content: string) => boolean;
}

export function LiveChat({ comments, idle, connected = false, onSend }: LiveChatProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const [draft, setDraft] = useState("");

  // Auto-scroll para a mensagem mais recente.
  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [comments.length]);

  return (
    <div className="flex h-full flex-col rounded-2xl border border-neutral-200 bg-white">
      <div className="flex items-center justify-between border-b border-neutral-100 px-4 py-3">
        <h3 className="text-sm font-semibold text-neutral-900">Chat ao vivo</h3>
        <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-600">
          {comments.length.toLocaleString("pt-BR")}
        </span>
      </div>

      <div ref={listRef} className="flex-1 overflow-y-auto">
        {idle ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 px-6 py-10 text-center">
            <Icon name="MessageCircle" size={26} color="#a3a3a3" />
            <p className="text-sm text-neutral-500">
              O chat aparece aqui quando a live começar.
            </p>
          </div>
        ) : comments.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 px-6 py-10 text-center">
            <Icon name="MessageCircle" size={26} color="#a3a3a3" />
            <p className="text-sm text-neutral-500">
              Ainda sem mensagens. Os comentários dos espectadores aparecem aqui
              em tempo real.
            </p>
          </div>
        ) : (
          <ul className="flex flex-col gap-1 p-2">
            {comments.map((c) => (
              <li key={c.id} className="flex items-start gap-2 rounded-xl px-2 py-1.5 hover:bg-neutral-50">
                <Avatar size="sm" src={c.author.avatar_url ?? undefined} alt={c.author.name} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-semibold text-neutral-900">
                      {c.author.name}
                    </span>
                    <span
                      className="shrink-0 text-[11px] text-neutral-400"
                      title={new Date(c.created_at).toLocaleString("pt-BR")}
                    >
                      {formatTime(c.created_at)}
                    </span>
                  </div>
                  <p className="break-words text-sm text-neutral-700">{c.content}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
      {!idle && onSend && (
        <form
          className="flex items-end gap-2 border-t border-neutral-100 p-3"
          onSubmit={(event) => {
            event.preventDefault();
            if (onSend(draft)) setDraft("");
          }}
        >
          <label className="sr-only" htmlFor="live-chat-message">
            Mensagem no chat da live
          </label>
          <textarea
            id="live-chat-message"
            rows={2}
            maxLength={200}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (
                event.key === "Enter" &&
                (event.ctrlKey || event.metaKey)
              ) {
                event.preventDefault();
                if (onSend(draft)) setDraft("");
              }
            }}
            placeholder={
              connected ? "Escreva uma mensagem…" : "Reconectando ao chat…"
            }
            disabled={!connected}
            className="max-h-28 min-h-11 flex-1 resize-y rounded-xl border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
          />
          <button
            type="submit"
            aria-label="Enviar mensagem"
            disabled={!connected || draft.trim().length === 0}
            className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary-700 text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Icon name="Send" size={18} color="#ffffff" />
          </button>
        </form>
      )}
    </div>
  );
}
