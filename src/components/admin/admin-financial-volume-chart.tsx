import { useMemo } from "react";
import {
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
  type ChartOptions,
} from "chart.js";
import { Line } from "react-chartjs-2";

import { Skeleton } from "@/components/ui/skeleton";
import { formatReais } from "@/shared/utils/masks";
import type { AdminFinancialStats } from "@/shared/types";

function formatBRL(value: number): string {
  return `R$ ${formatReais(value)}`;
}

function formatBRLCompact(value: number): string {
  if (Math.abs(value) >= 1_000_000) {
    return `R$ ${(value / 1_000_000).toFixed(1)}M`;
  }
  if (Math.abs(value) >= 1_000) {
    return `R$ ${(value / 1_000).toFixed(1)}k`;
  }
  return `R$ ${value.toFixed(0)}`;
}

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
);

interface AdminFinancialVolumeChartProps {
  data: AdminFinancialStats["volume_series"] | undefined;
  isLoading?: boolean;
  isError?: boolean;
}

export function AdminFinancialVolumeChart({
  data,
  isLoading,
  isError,
}: AdminFinancialVolumeChartProps) {
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return null;
    return {
      labels: data.map((d) => d.bucket),
      datasets: [
        {
          label: "Aportado por clientes",
          data: data.map((d) => d.deposits),
          borderColor: "#9e2cfa",
          backgroundColor: "rgba(158, 44, 250, 0.15)",
          fill: true,
          tension: 0.3,
          pointBackgroundColor: "#9e2cfa",
          pointRadius: 3,
        },
        {
          label: "Pago a criadores",
          data: data.map((d) => d.payments),
          borderColor: "#ccfd00",
          backgroundColor: "rgba(204, 253, 0, 0.15)",
          fill: true,
          tension: 0.3,
          pointBackgroundColor: "#ccfd00",
          pointRadius: 3,
        },
      ],
    };
  }, [data]);

  const options: ChartOptions<"line"> = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: "index", intersect: false },
      plugins: {
        legend: {
          position: "top",
          align: "end",
          labels: {
            color: "#404040",
            font: { size: 12 },
            boxWidth: 12,
            padding: 12,
          },
        },
        tooltip: {
          backgroundColor: "#1D0629",
          titleColor: "#ffffff",
          bodyColor: "#ffffff",
          padding: 10,
          cornerRadius: 8,
          callbacks: {
            label(ctx) {
              const v = ctx.parsed.y as number;
              return `${ctx.dataset.label}: ${formatBRL(v)}`;
            },
          },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: "#525252", font: { size: 12 } },
        },
        y: {
          beginAtZero: true,
          grid: { color: "#e5e5e5" },
          ticks: {
            color: "#525252",
            font: { size: 12 },
            callback: (v) => formatBRLCompact(Number(v)),
          },
        },
      },
    }),
    [],
  );

  if (isLoading) return <Skeleton className="h-72 w-full rounded-2xl" />;

  if (isError) {
    return (
      <div className="flex h-72 w-full items-center justify-center rounded-2xl border border-neutral-200 bg-white text-sm text-neutral-500">
        Não foi possível carregar o volume financeiro.
      </div>
    );
  }

  if (!chartData) {
    return (
      <div className="flex h-72 w-full items-center justify-center rounded-2xl border border-neutral-200 bg-white text-sm text-neutral-500">
        Sem movimentação financeira no período selecionado.
      </div>
    );
  }

  return (
    <div className="h-72 w-full">
      <Line data={chartData} options={options} />
    </div>
  );
}
