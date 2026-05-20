import { clsx } from "clsx";

import { Icon } from "@/components/ui/icon";
import type { AdminNotificationChannel } from "@/shared/types";

interface AdminNotificationPreviewProps {
  title: string;
  body: string;
  ctaUrl?: string;
  channels: AdminNotificationChannel[];
}

const CHANNEL_LABEL: Record<AdminNotificationChannel, string> = {
  push: "Push (App)",
  email: "Email",
  whatsapp: "WhatsApp",
};

export function AdminNotificationPreview({
  title,
  body,
  ctaUrl,
  channels,
}: AdminNotificationPreviewProps) {
  return (
    <div className="flex flex-col gap-4">
      <h3 className="text-sm font-semibold text-neutral-900">Pré-visualização</h3>

      {channels.includes("push") && (
        <PushCard title={title} body={body} ctaUrl={ctaUrl} />
      )}

      {channels.includes("email") && (
        <EmailCard title={title} body={body} ctaUrl={ctaUrl} />
      )}

      {channels.includes("whatsapp") && <WhatsAppCard body={body} ctaUrl={ctaUrl} />}

      {channels.length === 0 && (
        <div className="rounded-2xl border border-dashed border-neutral-300 bg-white p-6 text-center text-sm text-neutral-500">
          Selecione ao menos um canal para visualizar.
        </div>
      )}

      <p className="text-xs text-neutral-500">
        Canais selecionados:{" "}
        {channels.length > 0
          ? channels.map((c) => CHANNEL_LABEL[c]).join(", ")
          : "—"}
      </p>
    </div>
  );
}

function PushCard({
  title,
  body,
  ctaUrl,
}: {
  title: string;
  body: string;
  ctaUrl?: string;
}) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-gradient-to-br from-neutral-950 to-neutral-900 p-5 text-white shadow-lg">
      <div className="mb-3 flex items-center gap-2 text-xs text-neutral-400">
        <Icon name="Smartphone" size={14} color="#a3a3a3" />
        <span>Notificação push</span>
      </div>
      <div className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary-600 text-lg font-bold">
          H
        </div>
        <div className="flex flex-col gap-1 min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-neutral-300">
              Hype App
            </span>
            <span className="text-[10px] text-neutral-500">agora</span>
          </div>
          <p
            className={clsx(
              "text-sm font-semibold leading-tight line-clamp-2",
              !title && "text-neutral-500 italic",
            )}
          >
            {title || "Título da notificação"}
          </p>
          <p
            className={clsx(
              "text-xs text-neutral-300 leading-relaxed line-clamp-3",
              !body && "text-neutral-500 italic",
            )}
          >
            {body || "Mensagem da notificação aparecerá aqui."}
          </p>
          {ctaUrl && (
            <span className="mt-1 truncate text-[10px] text-secondary-400">
              → {ctaUrl}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function EmailCard({
  title,
  body,
  ctaUrl,
}: {
  title: string;
  body: string;
  ctaUrl?: string;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white">
      <div className="flex items-center gap-2 border-b border-neutral-100 bg-neutral-50 px-4 py-3 text-xs text-neutral-500">
        <Icon name="Mail" size={14} color="#737373" />
        <span>Email</span>
      </div>
      <div className="flex flex-col gap-3 p-5">
        <div className="flex flex-col gap-1">
          <span className="text-[11px] text-neutral-400">Assunto</span>
          <p
            className={clsx(
              "text-sm font-semibold text-neutral-900",
              !title && "text-neutral-400 italic",
            )}
          >
            {title || "Assunto do email"}
          </p>
        </div>
        <p
          className={clsx(
            "whitespace-pre-wrap text-sm leading-relaxed text-neutral-700",
            !body && "text-neutral-400 italic",
          )}
        >
          {body || "Corpo do email aparecerá aqui."}
        </p>
        {ctaUrl && (
          <a
            href={ctaUrl}
            onClick={(e) => e.preventDefault()}
            className="inline-flex w-fit items-center gap-2 rounded-full bg-primary-600 px-4 py-2 text-xs font-semibold text-white"
          >
            Abrir
            <Icon name="ArrowRight" size={12} color="#ffffff" />
          </a>
        )}
      </div>
    </div>
  );
}

function WhatsAppCard({ body, ctaUrl }: { body: string; ctaUrl?: string }) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-[#0b141a] p-4">
      <div className="mb-3 flex items-center gap-2 text-xs text-neutral-400">
        <Icon name="MessageCircle" size={14} color="#a3a3a3" />
        <span>WhatsApp (template Twilio)</span>
      </div>
      <div className="ml-auto w-fit max-w-[80%] rounded-2xl rounded-tr-sm bg-[#005c4b] px-3 py-2 text-sm text-white shadow">
        <p
          className={clsx(
            "whitespace-pre-wrap leading-relaxed",
            !body && "italic text-neutral-400",
          )}
        >
          {body || "Mensagem WhatsApp aqui."}
        </p>
        {ctaUrl && (
          <p className="mt-1 text-xs text-secondary-300">{ctaUrl}</p>
        )}
        <span className="mt-1 block text-right text-[10px] text-neutral-300">
          agora ✓✓
        </span>
      </div>
      <p className="mt-3 text-[10px] text-neutral-500">
        ⚠ WhatsApp exige template HSM aprovado pela Meta. Backend faz o
        mapeamento desta mensagem para o template registrado no Twilio.
      </p>
    </div>
  );
}
