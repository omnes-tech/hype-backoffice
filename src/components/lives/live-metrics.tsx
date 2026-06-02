import { icons } from "lucide-react";

import { Icon } from "@/components/ui/icon";

interface MetricProps {
  label: string;
  value: string;
  icon: keyof typeof icons;
  highlight?: boolean;
}

function Metric({ label, value, icon, highlight }: MetricProps) {
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-neutral-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-neutral-500">{label}</span>
        <Icon name={icon} size={16} color={highlight ? "#dc2626" : "#9e2cfa"} />
      </div>
      <span className="text-2xl font-semibold tabular-nums text-neutral-950">
        {value}
      </span>
    </div>
  );
}

function formatDuration(seconds: number | null): string {
  if (seconds == null) return "—";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

interface LiveMetricsProps {
  views: number;
  likes: number;
  /** Mostra duração quando a live já encerrou. */
  durationSeconds?: number | null;
  isLive?: boolean;
}

export function LiveMetrics({
  views,
  likes,
  durationSeconds,
  isLive,
}: LiveMetricsProps) {
  const showDuration = durationSeconds != null;
  return (
    <div
      className={`grid grid-cols-2 gap-3 ${showDuration ? "lg:grid-cols-3" : ""}`}
    >
      <Metric
        label={isLive ? "Assistindo agora" : "Espectadores"}
        value={views.toLocaleString("pt-BR")}
        icon="Eye"
        highlight={isLive}
      />
      <Metric
        label="Curtidas"
        value={likes.toLocaleString("pt-BR")}
        icon="Heart"
      />
      {showDuration && (
        <Metric
          label="Duração"
          value={formatDuration(durationSeconds ?? null)}
          icon="Clock"
        />
      )}
    </div>
  );
}
