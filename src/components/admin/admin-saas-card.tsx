import { clsx } from "clsx";

import { Skeleton } from "@/components/ui/skeleton";

export type AdminSaasSeverity = "critical" | "important" | "info";

interface AdminSaasCardProps {
  emoji: string;
  name: string;
  /** Valor principal já formatado (ex.: "5,2%", "R$ 12.500", "94 dias"). */
  value: string | null | undefined;
  /** Definição curta da métrica. */
  description: string;
  /** Severidade visual da tag. */
  severity?: AdminSaasSeverity;
  isLoading?: boolean;
}

const SEVERITY_STYLES: Record<AdminSaasSeverity, string> = {
  critical: "bg-red-50 text-red-700 border-red-200",
  important: "bg-secondary-50 text-secondary-800 border-secondary-200",
  info: "bg-primary-50 text-primary-700 border-primary-200",
};

const SEVERITY_LABEL: Record<AdminSaasSeverity, string> = {
  critical: "Crítico",
  important: "Importante",
  info: "Info",
};

export function AdminSaasCard({
  emoji,
  name,
  value,
  description,
  severity = "info",
  isLoading,
}: AdminSaasCardProps) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-neutral-200 bg-white p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span aria-hidden className="text-xl">
            {emoji}
          </span>
          <h4 className="text-sm font-semibold text-neutral-900">{name}</h4>
        </div>
        <span
          className={clsx(
            "rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
            SEVERITY_STYLES[severity],
          )}
        >
          {SEVERITY_LABEL[severity]}
        </span>
      </div>

      {isLoading ? (
        <Skeleton className="h-8 w-28" />
      ) : (
        <span className="text-2xl font-semibold text-neutral-950">
          {value ?? "—"}
        </span>
      )}

      <p className="text-xs leading-relaxed text-neutral-600">{description}</p>
    </div>
  );
}
