import { Link } from "@tanstack/react-router";

import { Icon } from "@/components/ui/icon";
import { LiveStatusBadge } from "@/components/lives/live-status-badge";
import { getUploadUrl } from "@/lib/utils/api";
import type { Live } from "@/shared/types";

/** Formata ISO → "22 mai 2026, 18:30" (pt-BR). */
function formatDateTime(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

function compact(n: number): string {
  return new Intl.NumberFormat("pt-BR", { notation: "compact" }).format(n);
}

interface LiveCardProps {
  live: Live;
}

export function LiveCard({ live }: LiveCardProps) {
  const thumb = getUploadUrl(live.thumbnail_url ?? undefined);
  const timeLabel =
    live.status === "upcoming"
      ? formatDateTime(live.scheduled_at)
      : live.status === "live"
        ? formatDateTime(live.started_at)
        : formatDateTime(live.ended_at);

  const hasVod =
    live.status === "ended" && live.recording_status === "ready";

  return (
    <Link
      to="/lives/$liveId"
      params={{ liveId: live.id }}
      className="group flex flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/50"
    >
      {/* Thumbnail */}
      <div className="relative aspect-video w-full overflow-hidden bg-neutral-100">
        {thumb ? (
          <img
            src={thumb}
            alt={live.title}
            className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.03]"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Icon name="Video" size={32} color="#a3a3a3" />
          </div>
        )}
        <div className="absolute left-3 top-3">
          <LiveStatusBadge status={live.status} />
        </div>
        {live.status === "live" && (
          <div className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-black/60 px-2 py-1 text-xs font-medium text-white">
            <Icon name="Eye" size={12} color="#ffffff" />
            {compact(live.views_count)}
          </div>
        )}
        {hasVod && (
          <div className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-black/60 px-2 py-1 text-xs font-medium text-white">
            <Icon name="Play" size={12} color="#ffffff" />
            Gravação
          </div>
        )}
      </div>

      {/* Conteúdo */}
      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="line-clamp-1 font-semibold text-neutral-950">
          {live.title}
        </h3>
        {live.host_display_name && (
          <p className="line-clamp-1 text-xs text-neutral-500">
            {live.host_display_name}
          </p>
        )}

        <div className="mt-auto flex flex-col gap-2 pt-2">
          {timeLabel && (
            <div className="flex items-center gap-1.5 text-xs text-neutral-500">
              <Icon name="Calendar" size={13} color="#737373" />
              <span>{timeLabel}</span>
            </div>
          )}
          {live.status !== "upcoming" && (
            <div className="flex items-center gap-4 text-xs text-neutral-500">
              <span className="flex items-center gap-1">
                <Icon name="Eye" size={13} color="#737373" />
                {compact(live.views_count)}
              </span>
              <span className="flex items-center gap-1">
                <Icon name="Heart" size={13} color="#737373" />
                {compact(live.likes_count)}
              </span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
