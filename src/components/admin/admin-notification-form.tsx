import { useMemo, useState } from "react";
import { clsx } from "clsx";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { InputDate } from "@/components/ui/input-date";
import { Textarea } from "@/components/ui/text-area";
import { Modal } from "@/components/ui/modal";
import { AdminAudienceBuilder } from "@/components/admin/admin-audience-builder";
import { AdminNotificationPreview } from "@/components/admin/admin-notification-preview";
import {
  useCreateAdminNotification,
  useEstimateAdminAudience,
} from "@/hooks/use-admin-notifications";
import type {
  AdminAudienceEstimate,
  AdminAudienceFilter,
  AdminNotificationChannel,
  AdminNotificationCreatePayload,
} from "@/shared/types";

const CHANNEL_OPTIONS: Array<{
  value: AdminNotificationChannel;
  label: string;
  icon: "Smartphone" | "Mail" | "MessageCircle";
  hint: string;
}> = [
  {
    value: "push",
    label: "Push (App mobile)",
    icon: "Smartphone",
    hint: "Notificação no app dos criadores",
  },
  {
    value: "email",
    label: "Email",
    icon: "Mail",
    hint: "Para o email cadastrado",
  },
  {
    value: "whatsapp",
    label: "WhatsApp",
    icon: "MessageCircle",
    hint: "Via Twilio · exige template HSM",
  },
];

const TITLE_MAX = 65;
const BODY_MAX = 240;

function validateUrl(url: string): boolean {
  if (!url) return true;
  // Aceita https/http ou deep-link (esquema custom seguido de :)
  return (
    /^https?:\/\/.+/i.test(url) ||
    /^[a-z][a-z0-9+\-.]*:\/\/.+/i.test(url)
  );
}

interface AdminNotificationFormProps {
  onSuccess?: () => void;
}

export function AdminNotificationForm({
  onSuccess,
}: AdminNotificationFormProps) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [ctaUrl, setCtaUrl] = useState("");
  const [channels, setChannels] = useState<AdminNotificationChannel[]>(["push"]);
  const [audience, setAudience] = useState<AdminAudienceFilter>({
    type: "all",
  });
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("18:00");
  const [estimate, setEstimate] = useState<AdminAudienceEstimate | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const estimateMutation = useEstimateAdminAudience();
  const createMutation = useCreateAdminNotification();

  const toggleChannel = (ch: AdminNotificationChannel) => {
    setChannels((curr) =>
      curr.includes(ch) ? curr.filter((c) => c !== ch) : [...curr, ch],
    );
  };

  const handleEstimate = async () => {
    try {
      const result = await estimateMutation.mutateAsync(audience);
      setEstimate(result);
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : "Não foi possível calcular a audiência.";
      toast.error(msg);
    }
  };

  // Invalida o estimate quando filtros mudam — força recalcular antes de enviar.
  const handleAudienceChange = (next: AdminAudienceFilter) => {
    setAudience(next);
    setEstimate(null);
  };

  const errors = useMemo(() => {
    const e: Record<string, string> = {};
    if (!title.trim()) e.title = "Título obrigatório";
    if (title.length > TITLE_MAX) e.title = `Máx ${TITLE_MAX} caracteres`;
    if (!body.trim()) e.body = "Mensagem obrigatória";
    if (body.length > BODY_MAX) e.body = `Máx ${BODY_MAX} caracteres`;
    if (ctaUrl && !validateUrl(ctaUrl)) {
      e.ctaUrl = "URL inválida — use http(s):// ou esquema com ://";
    }
    if (channels.length === 0) e.channels = "Selecione ao menos um canal";
    if (audience.type === "campaign" && !audience.campaign_id) {
      e.audience = "Selecione uma campanha";
    }
    if (audience.type === "niche" && audience.niche_ids.length === 0) {
      e.audience = "Selecione ao menos um nicho";
    }
    if (
      audience.type === "followers" &&
      audience.max_followers <= audience.min_followers
    ) {
      e.audience = "Máximo deve ser maior que mínimo";
    }
    if (
      audience.type === "location" &&
      (!audience.states || audience.states.length === 0) &&
      (!audience.cities || audience.cities.length === 0)
    ) {
      e.audience = "Selecione estado ou cidade";
    }
    if (scheduleEnabled && !scheduledDate) {
      e.schedule = "Data obrigatória quando agendado";
    }
    return e;
  }, [
    title,
    body,
    ctaUrl,
    channels,
    audience,
    scheduleEnabled,
    scheduledDate,
  ]);

  const hasErrors = Object.keys(errors).length > 0;

  const buildScheduledAt = (): string | null => {
    if (!scheduleEnabled || !scheduledDate) return null;
    // ISO 8601 com offset local (ex.: -03:00) — backend respeita o timezone.
    return new Date(`${scheduledDate}T${scheduledTime || "00:00"}:00`).toISOString();
  };

  const handleOpenConfirm = () => {
    if (hasErrors) {
      toast.error("Corrija os campos obrigatórios antes de continuar.");
      return;
    }
    if (!estimate) {
      toast.error('Clique em "Calcular audiência" antes de enviar.');
      return;
    }
    if (estimate.total_recipients === 0) {
      toast.error("Audiência está vazia. Ajuste os filtros.");
      return;
    }
    setConfirmOpen(true);
  };

  const handleConfirmSend = async () => {
    const payload: AdminNotificationCreatePayload = {
      title: title.trim(),
      body: body.trim(),
      cta_url: ctaUrl.trim() || null,
      channels,
      audience,
      scheduled_at: buildScheduledAt(),
    };
    try {
      await createMutation.mutateAsync(payload);
      toast.success(
        scheduleEnabled
          ? "Notificação agendada com sucesso."
          : "Notificação enviada para a fila.",
      );
      // Reset
      setTitle("");
      setBody("");
      setCtaUrl("");
      setChannels(["push"]);
      setAudience({ type: "all" });
      setScheduleEnabled(false);
      setScheduledDate("");
      setEstimate(null);
      setConfirmOpen(false);
      onSuccess?.();
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : "Não foi possível criar a notificação.";
      toast.error(msg);
    }
  };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
      {/* Form */}
      <div className="flex flex-col gap-6 rounded-2xl border border-neutral-200 bg-white p-6">
        <section className="flex flex-col gap-4">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
            Conteúdo
          </h3>
          <Input
            label="Título"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex.: Nova campanha aberta para você!"
            error={errors.title}
            maxLength={TITLE_MAX + 1}
          />
          <div className="flex justify-end -mt-2 text-[11px] text-neutral-500">
            {title.length}/{TITLE_MAX}
          </div>
          <Textarea
            label="Mensagem"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Escreva a mensagem que será enviada nos canais selecionados."
            error={errors.body}
            maxLength={BODY_MAX + 1}
            rows={3}
          />
          <div className="flex justify-end -mt-2 text-[11px] text-neutral-500">
            {body.length}/{BODY_MAX}
          </div>
          <Input
            label="Link ao clicar (opcional)"
            value={ctaUrl}
            onChange={(e) => setCtaUrl(e.target.value)}
            placeholder="hypeapp://campaigns/abc123 ou https://hypeapp.com/..."
            error={errors.ctaUrl}
          />
        </section>

        <section className="flex flex-col gap-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
            Canais
          </h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {CHANNEL_OPTIONS.map((opt) => {
              const isChecked = channels.includes(opt.value);
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => toggleChannel(opt.value)}
                  className={clsx(
                    "flex flex-col items-start gap-2 rounded-2xl border p-4 text-left transition-colors",
                    isChecked
                      ? "border-primary-500 bg-primary-50"
                      : "border-neutral-200 bg-white hover:border-primary-200",
                  )}
                >
                  <div className="flex w-full items-center justify-between">
                    <Icon
                      name={opt.icon}
                      size={20}
                      color={isChecked ? "#9e2cfa" : "#525252"}
                    />
                    <div
                      className={clsx(
                        "size-5 rounded-md border-2",
                        isChecked
                          ? "border-primary-600 bg-primary-600"
                          : "border-neutral-300",
                      )}
                    >
                      {isChecked && (
                        <Icon name="Check" size={14} color="#ffffff" />
                      )}
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-neutral-900">
                    {opt.label}
                  </span>
                  <span className="text-xs text-neutral-500">{opt.hint}</span>
                </button>
              );
            })}
          </div>
          {errors.channels && (
            <p className="text-xs text-red-600">{errors.channels}</p>
          )}
        </section>

        <section className="flex flex-col gap-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
            Audiência
          </h3>
          <AdminAudienceBuilder
            value={audience}
            onChange={handleAudienceChange}
          />
          {errors.audience && (
            <p className="text-xs text-red-600">{errors.audience}</p>
          )}

          <div className="flex flex-wrap items-center gap-3 rounded-xl bg-neutral-50 p-3">
            <Button
              type="button"
              variant="outline"
              onClick={handleEstimate}
              disabled={estimateMutation.isPending}
              className="h-9 rounded-full px-4"
            >
              <Icon name="Calculator" size={14} color="#404040" />
              <span className="ml-2 text-sm font-semibold">
                {estimateMutation.isPending
                  ? "Calculando..."
                  : "Calcular audiência"}
              </span>
            </Button>
            {estimate ? (
              <div className="flex flex-col gap-1 text-sm">
                <span className="font-semibold text-neutral-900">
                  {estimate.total_recipients.toLocaleString("pt-BR")} criador(es)
                </span>
                {Object.entries(estimate.by_channel).length > 0 && (
                  <span className="text-xs text-neutral-500">
                    {Object.entries(estimate.by_channel)
                      .map(
                        ([ch, count]) =>
                          `${ch}: ${(count ?? 0).toLocaleString("pt-BR")}`,
                      )
                      .join(" · ")}
                  </span>
                )}
              </div>
            ) : (
              <span className="text-xs text-neutral-500">
                Calcule antes de enviar.
              </span>
            )}
          </div>
        </section>

        <section className="flex flex-col gap-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
            Envio
          </h3>
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={scheduleEnabled}
              onChange={(e) => setScheduleEnabled(e.target.checked)}
              className="h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
            />
            <span className="text-sm text-neutral-700">
              Agendar para data específica
            </span>
          </label>
          {scheduleEnabled && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <InputDate
                label="Data"
                value={scheduledDate}
                onChange={setScheduledDate}
                error={errors.schedule}
              />
              <div className="flex flex-col gap-1">
                <label className="font-medium text-neutral-950">Horário</label>
                <input
                  type="time"
                  value={scheduledTime}
                  onChange={(e) => setScheduledTime(e.target.value)}
                  className="w-full h-11 rounded-2xl bg-neutral-100 px-4 outline-none focus:bg-neutral-200/70 transition-colors"
                />
              </div>
            </div>
          )}
        </section>

        <div className="flex flex-col gap-3 border-t border-neutral-100 pt-4 sm:flex-row sm:items-center sm:justify-end">
          <Button
            type="button"
            onClick={handleOpenConfirm}
            disabled={hasErrors || createMutation.isPending}
            className="h-11 rounded-full px-6"
          >
            <Icon name="Send" size={14} color="#ffffff" />
            <span className="ml-2 text-sm font-semibold text-white">
              {scheduleEnabled ? "Agendar envio" : "Enviar agora"}
            </span>
          </Button>
        </div>
      </div>

      {/* Preview */}
      <aside className="rounded-2xl border border-neutral-200 bg-white p-6">
        <AdminNotificationPreview
          title={title}
          body={body}
          ctaUrl={ctaUrl.trim() || undefined}
          channels={channels}
        />
      </aside>

      {confirmOpen && estimate && (
        <Modal
          title={
            scheduleEnabled ? "Confirmar agendamento" : "Confirmar envio"
          }
          onClose={() => setConfirmOpen(false)}
          panelClassName="max-w-lg"
        >
          <div className="flex flex-col gap-4">
            <p className="text-sm text-neutral-700">
              Você está prestes a{" "}
              <strong>
                {scheduleEnabled
                  ? "agendar esta notificação"
                  : "enviar esta notificação imediatamente"}
              </strong>{" "}
              para{" "}
              <strong>
                {estimate.total_recipients.toLocaleString("pt-BR")} criador(es)
              </strong>{" "}
              via {channels.join(", ")}.
            </p>
            {estimate.total_recipients >= 1000 && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                ⚠ Audiência grande. Verifique se filtros e mensagem estão
                corretos — não é possível retroceder após o envio.
              </div>
            )}
            {channels.includes("whatsapp") && (
              <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3 text-xs text-neutral-600">
                💬 WhatsApp será enviado via Twilio usando template HSM
                aprovado. O conteúdo final pode variar levemente conforme o
                template registrado.
              </div>
            )}
            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setConfirmOpen(false)}
                disabled={createMutation.isPending}
                className="h-10 rounded-full px-4"
              >
                <span className="text-sm font-semibold">Voltar</span>
              </Button>
              <Button
                type="button"
                onClick={handleConfirmSend}
                disabled={createMutation.isPending}
                className="h-10 rounded-full px-4"
              >
                <span className="text-sm font-semibold text-white">
                  {createMutation.isPending
                    ? "Enviando..."
                    : scheduleEnabled
                      ? "Confirmar agendamento"
                      : "Confirmar e enviar"}
                </span>
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
