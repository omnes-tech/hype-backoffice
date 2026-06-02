import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Modal } from "@/components/ui/modal";
import { LiveStatusBadge } from "@/components/lives/live-status-badge";
import { LiveForm, type LiveFormSubmit } from "@/components/lives/live-form";
import { LiveStudio } from "@/components/lives/live-studio";
import { LiveMetrics } from "@/components/lives/live-metrics";
import { LiveChat } from "@/components/lives/live-chat";
import {
  useCancelLive,
  useEndLive,
  useLive,
  useRefreshBroadcasterToken,
  useStartLive,
  useUpdateLive,
} from "@/hooks/use-lives";
import { useLiveSocket } from "@/hooks/use-live-socket";
import { uploadLiveThumbnail } from "@/shared/services/lives";
import { useWorkspacePermissions } from "@/contexts/workspace-context";
import { getUploadUrl } from "@/lib/utils/api";
import type { BroadcasterCredentials, LiveComment } from "@/shared/types";

export const Route = createFileRoute("/(private)/(app)/lives/$liveId")({
  component: RouteComponent,
});

function formatDateTime(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

function RouteComponent() {
  const { liveId } = Route.useParams();
  const permissions = useWorkspacePermissions();
  const canBroadcast = permissions.community_lives_write;

  const { data: live, isLoading, error } = useLive(liveId);

  const startMutation = useStartLive();
  const endMutation = useEndLive();
  const cancelMutation = useCancelLive();
  const updateMutation = useUpdateLive(liveId);
  const refreshTokenMutation = useRefreshBroadcasterToken();

  const [broadcaster, setBroadcaster] = useState<BroadcasterCredentials | null>(
    null,
  );
  const [comments, setComments] = useState<LiveComment[]>([]);
  const [views, setViews] = useState(0);
  const [likes, setLikes] = useState(0);
  const [showEdit, setShowEdit] = useState(false);
  const [confirm, setConfirm] = useState<"end" | "cancel" | null>(null);
  const tokenRequestedRef = useRef(false);

  const isLive = live?.status === "live";

  // Semeia contadores do snapshot do detalhe; o socket sobrepõe em tempo real.
  useEffect(() => {
    if (live) {
      setViews(live.views_count);
      setLikes(live.likes_count);
    }
  }, [live?.views_count, live?.likes_count]);

  // Ao reabrir uma live já no ar (sem credenciais em memória), re-minta o token
  // de publish para reconectar o estúdio.
  useEffect(() => {
    if (!isLive) {
      tokenRequestedRef.current = false;
      return;
    }
    if (!canBroadcast || broadcaster || tokenRequestedRef.current) return;
    tokenRequestedRef.current = true;
    refreshTokenMutation
      .mutateAsync(liveId)
      .then(setBroadcaster)
      .catch((err) => {
        tokenRequestedRef.current = false;
        toast.error(
          err instanceof Error
            ? err.message
            : "Não foi possível obter as credenciais de transmissão.",
        );
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLive, canBroadcast, broadcaster, liveId]);

  // Realtime: chat + contadores enquanto no ar.
  useLiveSocket({
    liveId,
    enabled: isLive,
    onComment: (c) =>
      setComments((prev) =>
        prev.some((x) => x.id === c.id) ? prev : [...prev, c],
      ),
    onLikeBurst: (n) => setLikes(n),
    onViewerCount: (n) => setViews(n),
  });

  const handleStart = async () => {
    try {
      const res = await startMutation.mutateAsync(liveId);
      tokenRequestedRef.current = true;
      setBroadcaster(res.broadcaster);
      toast.success("Você está no ar!");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Falha ao iniciar.";
      toast.error(
        msg.includes("streaming_unavailable") || msg.toLowerCase().includes("stream")
          ? "Streaming indisponível: configure o provedor (LiveKit) no servidor."
          : msg,
      );
    }
  };

  const handleConfirm = async () => {
    try {
      if (confirm === "end") {
        await endMutation.mutateAsync(liveId);
        setBroadcaster(null);
        toast.success("Live encerrada.");
      } else if (confirm === "cancel") {
        await cancelMutation.mutateAsync(liveId);
        toast.success("Agendamento cancelado.");
      }
      setConfirm(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha na operação.");
    }
  };

  const handleEdit = async (values: LiveFormSubmit, thumbnailFile: File | null) => {
    try {
      let thumbnailUrl = live?.thumbnail_url ?? null;
      if (thumbnailFile) {
        try {
          const uploaded = await uploadLiveThumbnail(thumbnailFile);
          thumbnailUrl = uploaded.url;
        } catch {
          toast.warning("Não foi possível enviar a nova thumbnail.");
        }
      }
      await updateMutation.mutateAsync({
        title: values.title,
        description: values.description,
        host_display_name: values.host_display_name,
        thumbnail_url: thumbnailUrl,
        scheduled_at: values.scheduled_at,
      });
      toast.success("Live atualizada.");
      setShowEdit(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao salvar.");
    }
  };

  const handleTokenExpired = () => {
    refreshTokenMutation
      .mutateAsync(liveId)
      .then(setBroadcaster)
      .catch(() => toast.error("Sessão de transmissão expirou. Recarregue a página."));
  };

  // ---------------------------------------------------------------- estados

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-primary-600" />
      </div>
    );
  }

  if (error || !live) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-center">
        <Icon name="TriangleAlert" size={28} color="#dc2626" />
        <p className="text-lg font-semibold text-neutral-950">
          Live não encontrada
        </p>
        <span className="text-sm text-neutral-600">
          {error instanceof Error ? error.message : "Ela pode ter sido removida."}
        </span>
        <Link to="/lives" className="text-sm font-semibold text-primary-600">
          Voltar para Lives
        </Link>
      </div>
    );
  }

  const isUpcoming = live.status === "upcoming";
  const isEnded = live.status === "ended";
  const isCancelled = live.status === "cancelled";
  const thumb = getUploadUrl(live.thumbnail_url ?? undefined);
  const vodUrl = getUploadUrl(live.recording_url ?? undefined);
  const timeLabel = formatDateTime(
    isUpcoming ? live.scheduled_at : isLive ? live.started_at : live.ended_at,
  );

  return (
    <div className="flex flex-col gap-6">
      {/* Cabeçalho */}
      <div className="flex flex-col gap-3">
        <Link
          to="/lives"
          className="flex w-fit items-center gap-1 text-sm text-neutral-500 transition-colors hover:text-neutral-800"
        >
          <Icon name="ChevronLeft" size={16} color="#737373" />
          Voltar para Lives
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold text-neutral-950">
                {live.title}
              </h1>
              <LiveStatusBadge status={live.status} />
            </div>
            {timeLabel && (
              <span className="text-sm text-neutral-500">
                {isUpcoming
                  ? `Agendada para ${timeLabel}`
                  : isLive
                    ? `No ar desde ${timeLabel}`
                    : `Encerrada em ${timeLabel}`}
              </span>
            )}
          </div>

          {canBroadcast && (
            <div className="flex flex-wrap items-center gap-2">
              {isUpcoming && (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowEdit(true)}
                    className="h-10 rounded-full px-4"
                  >
                    <Icon name="Pencil" size={14} color="#404040" />
                    <span className="font-semibold">Editar</span>
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setConfirm("cancel")}
                    className="h-10 rounded-full px-4"
                  >
                    <span className="font-semibold">Cancelar</span>
                  </Button>
                  <Button
                    type="button"
                    onClick={handleStart}
                    disabled={startMutation.isPending}
                    className="h-10 rounded-full px-5"
                  >
                    <Icon name="Radio" size={15} color="#ffffff" />
                    <span className="font-semibold text-white">
                      {startMutation.isPending ? "Iniciando..." : "Ir ao vivo"}
                    </span>
                  </Button>
                </>
              )}
              {isLive && (
                <Button
                  type="button"
                  onClick={() => setConfirm("end")}
                  className="h-10 rounded-full bg-red-600 px-5 hover:bg-red-700"
                >
                  <Icon name="Square" size={14} color="#ffffff" />
                  <span className="font-semibold text-white">Encerrar live</span>
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
        {/* Coluna principal */}
        <div className="flex flex-col gap-6">
          {/* Vídeo / estúdio / VOD */}
          {isLive ? (
            broadcaster ? (
              <LiveStudio
                credentials={broadcaster}
                onTokenExpired={handleTokenExpired}
                onError={(m) => toast.error(m)}
              />
            ) : (
              <div className="flex aspect-video w-full flex-col items-center justify-center gap-2 rounded-2xl border border-neutral-200 bg-neutral-950 text-white">
                <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-white" />
                <span className="text-sm">Preparando estúdio de transmissão...</span>
              </div>
            )
          ) : isEnded && vodUrl && live.recording_status === "ready" ? (
            <video
              key={vodUrl}
              className="aspect-video w-full rounded-2xl border border-neutral-200 bg-black object-contain"
              controls
              playsInline
              poster={thumb}
              src={vodUrl}
            />
          ) : (
            <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-neutral-200 bg-neutral-950">
              {thumb ? (
                <img
                  src={thumb}
                  alt={live.title}
                  className="h-full w-full object-cover opacity-60"
                />
              ) : null}
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/40 text-white">
                <Icon
                  name={
                    isUpcoming
                      ? "Clock"
                      : isCancelled
                        ? "Ban"
                        : live.recording_status === "processing"
                          ? "Loader"
                          : "VideoOff"
                  }
                  size={30}
                  color="#ffffff"
                />
                <span className="text-sm font-medium">
                  {isUpcoming
                    ? "Aguardando início da transmissão"
                    : isCancelled
                      ? "Live cancelada"
                      : live.recording_status === "processing"
                        ? "Processando gravação..."
                        : live.recording_status === "failed"
                          ? "A gravação não pôde ser processada"
                          : "Transmissão encerrada"}
                </span>
              </div>
            </div>
          )}

          {/* Descrição */}
          {live.description && (
            <div className="rounded-2xl border border-neutral-200 bg-white p-6">
              <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-neutral-500">
                Descrição
              </h3>
              <p className="whitespace-pre-line text-sm text-neutral-700">
                {live.description}
              </p>
            </div>
          )}

          {/* Métricas */}
          {!isUpcoming && !isCancelled && (
            <LiveMetrics
              views={views}
              likes={likes}
              durationSeconds={isEnded ? live.duration_seconds : undefined}
              isLive={isLive}
            />
          )}
        </div>

        {/* Coluna lateral: chat */}
        <div className="lg:sticky lg:top-6 lg:h-[calc(100vh-8rem)]">
          {isUpcoming ? (
            <LiveChat comments={[]} idle />
          ) : isLive ? (
            <LiveChat comments={comments} />
          ) : (
            <div className="flex h-full min-h-[300px] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-neutral-200 bg-white p-6 text-center">
              <Icon name="MessageCircle" size={26} color="#a3a3a3" />
              <p className="text-sm text-neutral-500">
                O chat ao vivo fica disponível apenas durante a transmissão.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Modal de edição */}
      {showEdit && (
        <Modal
          title="Editar live"
          onClose={() => setShowEdit(false)}
          panelClassName="max-w-3xl"
        >
          <LiveForm
            initial={{
              title: live.title,
              description: live.description,
              host_display_name: live.host_display_name,
              scheduled_at: live.scheduled_at,
            }}
            initialThumbnailUrl={thumb}
            submitLabel="Salvar alterações"
            submittingLabel="Salvando..."
            isSubmitting={updateMutation.isPending}
            onSubmit={handleEdit}
            onCancel={() => setShowEdit(false)}
          />
        </Modal>
      )}

      {/* Confirmações */}
      {confirm && (
        <Modal
          title={confirm === "end" ? "Encerrar transmissão?" : "Cancelar agendamento?"}
          onClose={() => setConfirm(null)}
          panelClassName="max-w-md"
        >
          <div className="flex flex-col gap-4">
            <p className="text-sm text-neutral-700">
              {confirm === "end"
                ? "A transmissão será finalizada para todos os espectadores e a gravação ficará disponível no histórico quando processada. Esta ação não pode ser desfeita."
                : "A live agendada será cancelada e não ficará visível para os usuários."}
            </p>
            <div className="flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setConfirm(null)}
                className="h-10 rounded-full px-4"
              >
                Voltar
              </Button>
              <Button
                type="button"
                onClick={handleConfirm}
                disabled={endMutation.isPending || cancelMutation.isPending}
                className={
                  confirm === "cancel"
                    ? "h-10 rounded-full px-4"
                    : "h-10 rounded-full bg-red-600 px-4 hover:bg-red-700"
                }
              >
                <span className="font-semibold text-white">
                  {confirm === "end" ? "Encerrar" : "Cancelar agendamento"}
                </span>
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
