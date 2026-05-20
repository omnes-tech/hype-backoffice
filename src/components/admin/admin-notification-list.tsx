import { useState } from "react";
import { clsx } from "clsx";
import { toast } from "sonner";

import { Icon } from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Modal } from "@/components/ui/modal";
import {
  useAdminNotificationsList,
  useCancelAdminNotification,
} from "@/hooks/use-admin-notifications";
import type {
  AdminAudienceFilter,
  AdminNotificationChannel,
  AdminNotificationListItem,
  AdminNotificationStatus,
} from "@/shared/types";

const STATUS_LABEL: Record<AdminNotificationStatus, string> = {
  draft: "Rascunho",
  scheduled: "Agendada",
  sending: "Enviando",
  sent: "Enviada",
  partially_failed: "Parcial",
  failed: "Falhou",
  cancelled: "Cancelada",
};

const STATUS_COLORS: Record<AdminNotificationStatus, string> = {
  draft: "bg-neutral-100 text-neutral-700 border-neutral-200",
  scheduled: "bg-primary-50 text-primary-700 border-primary-200",
  sending: "bg-blue-50 text-blue-700 border-blue-200",
  sent: "bg-emerald-50 text-emerald-700 border-emerald-200",
  partially_failed: "bg-amber-50 text-amber-700 border-amber-200",
  failed: "bg-red-50 text-red-700 border-red-200",
  cancelled: "bg-neutral-100 text-neutral-500 border-neutral-200",
};

const CHANNEL_ICON: Record<
  AdminNotificationChannel,
  "Smartphone" | "Mail" | "MessageCircle"
> = {
  push: "Smartphone",
  email: "Mail",
  whatsapp: "MessageCircle",
};

function describeAudience(audience: AdminAudienceFilter): string {
  switch (audience.type) {
    case "all":
      return "Todos os criadores";
    case "campaign":
      return `Campanha (${audience.campaign_id.slice(0, 8)}…)`;
    case "niche":
      return `${audience.niche_ids.length} nicho(s)`;
    case "followers":
      return `${audience.min_followers.toLocaleString("pt-BR")}–${audience.max_followers.toLocaleString("pt-BR")} seguidores`;
    case "location": {
      const states = audience.states?.length ?? 0;
      const cities = audience.cities?.length ?? 0;
      const parts: string[] = [];
      if (states) parts.push(`${states} UF`);
      if (cities) parts.push(`${cities} cidade(s)`);
      return parts.join(" · ") || "Localização";
    }
  }
}

function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export function AdminNotificationList() {
  const { data, isLoading, isError, refetch } = useAdminNotificationsList();
  const cancelMutation = useCancelAdminNotification();
  const [cancelTarget, setCancelTarget] =
    useState<AdminNotificationListItem | null>(null);

  const handleConfirmCancel = async () => {
    if (!cancelTarget) return;
    try {
      await cancelMutation.mutateAsync(cancelTarget.id);
      toast.success("Notificação cancelada.");
      setCancelTarget(null);
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : "Não foi possível cancelar. Tente novamente.";
      toast.error(msg);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-neutral-900">
          Histórico de notificações
        </h2>
        <Button
          type="button"
          variant="outline"
          onClick={() => refetch()}
          className="h-9 rounded-full px-4"
        >
          <Icon name="RefreshCw" size={14} color="#404040" />
          <span className="ml-2 text-sm">Atualizar</span>
        </Button>
      </div>

      {isLoading && (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-2xl" />
          ))}
        </div>
      )}

      {isError && !isLoading && (
        <div className="rounded-2xl border border-neutral-200 bg-white p-6 text-center text-sm text-neutral-500">
          Não foi possível carregar o histórico.
        </div>
      )}

      {!isLoading && !isError && (!data || data.length === 0) && (
        <div className="rounded-2xl border border-dashed border-neutral-300 bg-white p-8 text-center text-sm text-neutral-500">
          Nenhuma notificação criada ainda.
        </div>
      )}

      {!isLoading && data && data.length > 0 && (
        <div className="flex flex-col gap-2">
          {data.map((item) => {
            const canCancel = item.status === "scheduled";
            const isScheduledFuture =
              item.status === "scheduled" && item.scheduled_at;
            return (
              <div
                key={item.id}
                className="rounded-2xl border border-neutral-200 bg-white p-4"
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="flex flex-col gap-2 min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-semibold text-neutral-900 truncate">
                        {item.title}
                      </h3>
                      <span
                        className={clsx(
                          "rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                          STATUS_COLORS[item.status],
                        )}
                      >
                        {STATUS_LABEL[item.status]}
                      </span>
                      <div className="flex items-center gap-1">
                        {item.channels.map((c) => (
                          <span
                            key={c}
                            className="flex size-6 items-center justify-center rounded-full bg-primary-50"
                            title={c}
                          >
                            <Icon
                              name={CHANNEL_ICON[c]}
                              size={12}
                              color="#9e2cfa"
                            />
                          </span>
                        ))}
                      </div>
                    </div>
                    <p className="text-xs text-neutral-600 line-clamp-2">
                      {item.body}
                    </p>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-neutral-500">
                      <span>📋 {describeAudience(item.audience)}</span>
                      <span>
                        {isScheduledFuture
                          ? `📅 Agendada para ${formatDateTime(item.scheduled_at)}`
                          : item.sent_at
                            ? `✅ Enviada ${formatDateTime(item.sent_at)}`
                            : `🕒 Criada ${formatDateTime(item.created_at)}`}
                      </span>
                      {item.stats && (
                        <span>
                          📦 {item.stats.delivered.toLocaleString("pt-BR")}/
                          {item.stats.total_recipients.toLocaleString("pt-BR")}{" "}
                          entregues
                          {item.stats.failed > 0 &&
                            ` · ${item.stats.failed.toLocaleString("pt-BR")} falhas`}
                        </span>
                      )}
                    </div>
                  </div>

                  {canCancel && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setCancelTarget(item)}
                      className="h-9 shrink-0 rounded-full border-red-200 px-4 text-red-700 hover:bg-red-50"
                    >
                      <Icon name="X" size={14} color="#b91c1c" />
                      <span className="ml-2 text-sm font-semibold">
                        Cancelar
                      </span>
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {cancelTarget && (
        <Modal
          title="Cancelar notificação agendada"
          onClose={() => setCancelTarget(null)}
          panelClassName="max-w-md"
        >
          <div className="flex flex-col gap-4">
            <p className="text-sm text-neutral-700">
              Você tem certeza que deseja cancelar a notificação{" "}
              <strong>"{cancelTarget.title}"</strong> agendada para{" "}
              {formatDateTime(cancelTarget.scheduled_at)}?
            </p>
            <p className="text-xs text-neutral-500">
              Essa ação não pode ser desfeita. Os criadores não receberão a
              notificação.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCancelTarget(null)}
                disabled={cancelMutation.isPending}
                className="h-10 rounded-full px-4"
              >
                <span className="text-sm font-semibold">Voltar</span>
              </Button>
              <Button
                type="button"
                onClick={handleConfirmCancel}
                disabled={cancelMutation.isPending}
                className="h-10 rounded-full bg-red-600 px-4 hover:bg-red-700"
              >
                <span className="text-sm font-semibold text-white">
                  {cancelMutation.isPending
                    ? "Cancelando..."
                    : "Sim, cancelar"}
                </span>
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
