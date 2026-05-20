import { useMemo } from "react";
import {
  ArcElement,
  Chart as ChartJS,
  Legend,
  Tooltip,
  type ChartOptions,
} from "chart.js";
import { Doughnut } from "react-chartjs-2";

import { Skeleton } from "@/components/ui/skeleton";
import type {
  AdminCreatorSizeBucket,
  AdminSizeDistributionItem,
} from "@/shared/types";

ChartJS.register(ArcElement, Tooltip, Legend);

/**
 * Faixas e cores fixas — ordem do menor pro maior porte.
 * Cor escala de roxo claro → escuro pra indicar valor crescente.
 */
const SIZE_LABEL: Record<AdminCreatorSizeBucket, string> = {
  ugc: "UGC (<1k)",
  nano: "Nano (1k–10k)",
  micro: "Micro (10k–100k)",
  mid: "Mid (100k–500k)",
  macro: "Macro (500k–1M)",
  mega: "Mega (>1M)",
};

const SIZE_COLORS: Record<AdminCreatorSizeBucket, string> = {
  ugc: "#f4e6ff",
  nano: "#daaeff",
  micro: "#ad47ff",
  mid: "#9e2cfa",
  macro: "#7115b4",
  mega: "#3f006c",
};

const SIZE_ORDER: AdminCreatorSizeBucket[] = [
  "ugc",
  "nano",
  "micro",
  "mid",
  "macro",
  "mega",
];

interface AdminSizeChartProps {
  data: AdminSizeDistributionItem[] | undefined;
  isLoading?: boolean;
  isError?: boolean;
}

export function AdminSizeChart({
  data,
  isLoading,
  isError,
}: AdminSizeChartProps) {
  const ordered = useMemo(() => {
    if (!data || data.length === 0) return null;
    const byBucket = new Map(data.map((d) => [d.bucket, d]));
    return SIZE_ORDER.map((bucket) => byBucket.get(bucket)).filter(
      (item): item is AdminSizeDistributionItem => Boolean(item),
    );
  }, [data]);

  const chartData = useMemo(() => {
    if (!ordered) return null;
    return {
      labels: ordered.map((d) => SIZE_LABEL[d.bucket]),
      datasets: [
        {
          data: ordered.map((d) => d.count),
          backgroundColor: ordered.map((d) => SIZE_COLORS[d.bucket]),
          borderColor: "#ffffff",
          borderWidth: 2,
          hoverOffset: 6,
        },
      ],
    };
  }, [ordered]);

  const options: ChartOptions<"doughnut"> = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      cutout: "60%",
      plugins: {
        legend: {
          position: "right",
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
          bodyColor: "#ccfd00",
          padding: 10,
          cornerRadius: 8,
          callbacks: {
            label(ctx) {
              const item = ordered?.[ctx.dataIndex];
              if (!item) return ctx.label ?? "";
              return `${SIZE_LABEL[item.bucket]}: ${item.count} (${item.percentage.toFixed(1)}%)`;
            },
          },
        },
      },
    }),
    [ordered],
  );

  if (isLoading) {
    return <Skeleton className="h-80 w-full rounded-2xl" />;
  }

  if (isError) {
    return (
      <div className="flex h-80 w-full items-center justify-center rounded-2xl border border-neutral-200 bg-white text-sm text-neutral-500">
        Não foi possível carregar a distribuição por tamanho.
      </div>
    );
  }

  if (!chartData) {
    return (
      <div className="flex h-80 w-full items-center justify-center rounded-2xl border border-neutral-200 bg-white text-sm text-neutral-500">
        Sem dados de tamanho no período selecionado.
      </div>
    );
  }

  return (
    <div className="h-80 w-full">
      <Doughnut data={chartData} options={options} />
    </div>
  );
}
