import { useMemo } from "react";
import { clsx } from "clsx";
import { icons } from "lucide-react";

import { Icon } from "@/components/ui/icon";
import { Skeleton } from "@/components/ui/skeleton";

interface AdminKpiCardProps {
  label: string;
  /** Valor formatado já como string (ex.: "R$ 182.500,00" ou "4.820"). */
  value: string | number | null | undefined;
  /** Hint informativo abaixo do valor. */
  hint?: string;
  /** Ícone Lucide. */
  icon?: keyof typeof icons;
  /** Cor do ícone (token de tema ou hex). */
  iconColor?: string;
  /**
   * Variação percentual vs período anterior (ex.: 12.5 → "+12,5%").
   * Quando omitido, não mostra delta.
   */
  deltaPercent?: number | null;
  isLoading?: boolean;
  /** Para KPIs financeiros sensíveis, possibilita esconder o valor (futuro). */
  redacted?: boolean;
}

function formatDelta(delta: number): { label: string; positive: boolean } {
  const positive = delta >= 0;
  const formatted = new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
    signDisplay: "exceptZero",
  }).format(delta);
  return { label: `${formatted}%`, positive };
}

export function AdminKpiCard({
  label,
  value,
  hint,
  icon,
  iconColor = "#9E2CFA",
  deltaPercent,
  isLoading,
  redacted,
}: AdminKpiCardProps) {
  const delta = useMemo(
    () =>
      typeof deltaPercent === "number" && Number.isFinite(deltaPercent)
        ? formatDelta(deltaPercent)
        : null,
    [deltaPercent],
  );

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-neutral-200 bg-white p-5 transition-shadow hover:shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <span className="text-sm font-medium text-neutral-600">{label}</span>
        {icon && (
          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary-50">
            <Icon name={icon} size={18} color={iconColor} />
          </div>
        )}
      </div>

      <div className="flex flex-col gap-1">
        {isLoading ? (
          <Skeleton className="h-8 w-32" />
        ) : (
          <span className="text-2xl font-semibold text-neutral-950">
            {redacted ? "•••" : (value ?? "—")}
          </span>
        )}

        {delta && !isLoading && (
          <span
            className={clsx(
              "inline-flex items-center gap-1 text-xs font-semibold",
              delta.positive ? "text-emerald-600" : "text-red-600",
            )}
          >
            <Icon
              name={delta.positive ? "TrendingUp" : "TrendingDown"}
              size={12}
              color={delta.positive ? "#059669" : "#dc2626"}
            />
            {delta.label}
            <span className="font-normal text-neutral-500">vs anterior</span>
          </span>
        )}

        {hint && !isLoading && (
          <span className="text-xs text-neutral-500">{hint}</span>
        )}
      </div>
    </div>
  );
}
