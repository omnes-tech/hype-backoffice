import { useMemo, useRef, useState } from "react";
import { clsx } from "clsx";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { InputDate } from "@/components/ui/input-date";
import { Textarea } from "@/components/ui/text-area";
import { validateLiveThumbnailFile } from "@/shared/services/lives";

const TITLE_MAX = 150;
const DESC_MAX = 2000;
const HOST_MAX = 80;

export interface LiveFormSubmit {
  title: string;
  description: string | null;
  host_display_name: string | null;
  /** ISO 8601. "Transmitir agora" envia o instante atual. */
  scheduled_at: string;
}

interface LiveFormProps {
  initial?: {
    title?: string;
    description?: string | null;
    host_display_name?: string | null;
    scheduled_at?: string | null;
  };
  /** URL já resolvida da thumbnail atual (modo edição). */
  initialThumbnailUrl?: string | null;
  submitLabel: string;
  submittingLabel: string;
  isSubmitting: boolean;
  onSubmit: (values: LiveFormSubmit, thumbnailFile: File | null) => void;
  onCancel?: () => void;
}

function splitIso(iso?: string | null): { date: string; time: string } {
  if (!iso) return { date: "", time: "18:00" };
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { date: "", time: "18:00" };
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
  };
}

export function LiveForm({
  initial,
  initialThumbnailUrl,
  submitLabel,
  submittingLabel,
  isSubmitting,
  onSubmit,
  onCancel,
}: LiveFormProps) {
  const initialSplit = splitIso(initial?.scheduled_at);
  // Considera "agendada" se a data estiver a mais de 2min no futuro.
  const initialScheduled =
    !!initial?.scheduled_at &&
    new Date(initial.scheduled_at).getTime() > Date.now() + 2 * 60 * 1000;

  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [host, setHost] = useState(initial?.host_display_name ?? "");
  const [mode, setMode] = useState<"now" | "schedule">(
    initialScheduled ? "schedule" : "now",
  );
  const [scheduledDate, setScheduledDate] = useState(initialSplit.date);
  const [scheduledTime, setScheduledTime] = useState(initialSplit.time);

  // Upload deferido: guardamos o File; o screen envia em /uploads antes de salvar.
  const [thumbFile, setThumbFile] = useState<File | null>(null);
  const [thumbPreview, setThumbPreview] = useState<string | null>(
    initialThumbnailUrl ?? null,
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  const todayIso = useMemo(() => {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }, []);

  const errors = useMemo(() => {
    const e: Record<string, string> = {};
    if (!title.trim()) e.title = "Título obrigatório";
    else if (title.length > TITLE_MAX) e.title = `Máx ${TITLE_MAX} caracteres`;
    if (description.length > DESC_MAX) e.description = `Máx ${DESC_MAX} caracteres`;
    if (host.length > HOST_MAX) e.host = `Máx ${HOST_MAX} caracteres`;
    if (mode === "schedule" && !scheduledDate) {
      e.schedule = "Informe a data do agendamento";
    }
    return e;
  }, [title, description, host, mode, scheduledDate]);

  const hasErrors = Object.keys(errors).length > 0;

  const handlePickThumb = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const err = validateLiveThumbnailFile(file);
    if (err) {
      toast.error(err);
      return;
    }
    setThumbFile(file);
    setThumbPreview(URL.createObjectURL(file));
  };

  const buildScheduledAt = (): string => {
    if (mode === "now") return new Date().toISOString();
    return new Date(
      `${scheduledDate}T${scheduledTime || "00:00"}:00`,
    ).toISOString();
  };

  const handleSubmit = () => {
    if (hasErrors) {
      toast.error("Corrija os campos destacados antes de continuar.");
      return;
    }
    const scheduledAt = buildScheduledAt();
    if (
      mode === "schedule" &&
      new Date(scheduledAt).getTime() < Date.now()
    ) {
      toast.error("A data/hora do agendamento deve estar no futuro.");
      return;
    }
    onSubmit(
      {
        title: title.trim(),
        description: description.trim() || null,
        host_display_name: host.trim() || null,
        scheduled_at: scheduledAt,
      },
      thumbFile,
    );
  };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
      {/* Campos */}
      <div className="flex flex-col gap-6 rounded-2xl border border-neutral-200 bg-white p-6">
        <section className="flex flex-col gap-4">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
            Informações
          </h3>
          <Input
            label="Título"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex.: Bate-papo com criadores"
            error={errors.title}
            maxLength={TITLE_MAX + 1}
          />
          <div className="-mt-2 flex justify-end text-[11px] text-neutral-500">
            {title.length}/{TITLE_MAX}
          </div>
          <Textarea
            label="Descrição (opcional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Conte aos usuários do que se trata a transmissão."
            error={errors.description}
            maxLength={DESC_MAX + 1}
            rows={4}
          />
          <Input
            label="Nome de exibição (opcional)"
            value={host}
            onChange={(e) => setHost(e.target.value)}
            placeholder="Como aparece no app (padrão: nome do workspace)"
            error={errors.host}
            maxLength={HOST_MAX + 1}
          />
        </section>

        <section className="flex flex-col gap-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
            Quando transmitir
          </h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {(
              [
                {
                  id: "now",
                  icon: "Radio" as const,
                  label: "Transmitir agora",
                  hint: "Cria a live pronta para você iniciar já.",
                },
                {
                  id: "schedule",
                  icon: "Clock" as const,
                  label: "Agendar",
                  hint: "Define data e horário futuros.",
                },
              ] as const
            ).map((opt) => {
              const active = mode === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setMode(opt.id)}
                  className={clsx(
                    "flex flex-col items-start gap-1 rounded-2xl border p-4 text-left transition-colors",
                    active
                      ? "border-primary-500 bg-primary-50"
                      : "border-neutral-200 bg-white hover:border-primary-200",
                  )}
                >
                  <Icon
                    name={opt.icon}
                    size={18}
                    color={active ? "#9e2cfa" : "#525252"}
                  />
                  <span className="text-sm font-semibold text-neutral-900">
                    {opt.label}
                  </span>
                  <span className="text-xs text-neutral-500">{opt.hint}</span>
                </button>
              );
            })}
          </div>
          {mode === "schedule" && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <InputDate
                label="Data"
                value={scheduledDate}
                onChange={setScheduledDate}
                min={todayIso}
                error={errors.schedule}
              />
              <div className="flex flex-col gap-1">
                <label className="font-medium text-neutral-950">Horário</label>
                <input
                  type="time"
                  value={scheduledTime}
                  onChange={(e) => setScheduledTime(e.target.value)}
                  className="h-11 w-full rounded-2xl bg-neutral-100 px-4 outline-none transition-colors focus:bg-neutral-200/70"
                />
              </div>
            </div>
          )}
        </section>

        <div className="flex flex-col gap-3 border-t border-neutral-100 pt-4 sm:flex-row sm:items-center sm:justify-end">
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isSubmitting}
              className="rounded-full"
            >
              Cancelar
            </Button>
          )}
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={hasErrors || isSubmitting}
            className="rounded-full"
          >
            <Icon name="Check" size={16} color="#ffffff" />
            <span className="font-semibold text-white">
              {isSubmitting ? submittingLabel : submitLabel}
            </span>
          </Button>
        </div>
      </div>

      {/* Thumbnail */}
      <aside className="flex flex-col gap-3 rounded-2xl border border-neutral-200 bg-white p-6">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
          Thumbnail
        </h3>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="group relative flex aspect-video w-full items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-neutral-200 bg-neutral-50 transition-colors hover:border-primary-300"
        >
          {thumbPreview ? (
            <>
              <img
                src={thumbPreview}
                alt="Pré-visualização da thumbnail"
                className="h-full w-full object-cover"
              />
              <span className="absolute inset-0 flex items-center justify-center bg-black/0 text-sm font-medium text-white opacity-0 transition-opacity group-hover:bg-black/40 group-hover:opacity-100">
                Trocar imagem
              </span>
            </>
          ) : (
            <div className="flex flex-col items-center gap-2 text-neutral-400">
              <Icon name="ImagePlus" size={28} color="#a3a3a3" />
              <span className="text-xs">Enviar thumbnail (16:9)</span>
            </div>
          )}
        </button>
        <p className="text-[11px] text-neutral-500">
          JPEG, PNG ou WebP · até 5 MB. A imagem é enviada ao salvar.
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handlePickThumb}
          className="hidden"
        />
      </aside>
    </div>
  );
}
