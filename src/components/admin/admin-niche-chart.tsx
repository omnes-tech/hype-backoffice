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
import type { AdminNicheDistributionItem } from "@/shared/types";

ChartJS.register(ArcElement, Tooltip, Legend);

/** Paleta — primary/tertiary do tema + complementares neutras. */
const PALETTE = [
  "#9e2cfa",
  "#c252dc",
  "#ad47ff",
  "#daaeff",
  "#ccfd00",
  "#8db500",
  "#5d1390",
  "#f4e6ff",
];

interface AdminNicheChartProps {
  data: AdminNicheDistributionItem[] | undefined;
  isLoading?: boolean;
  isError?: boolean;
}

export function AdminNicheChart({
  data,
  isLoading,
  isError,
}: AdminNicheChartProps) {
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return null;
    return {
      labels: data.map((d) => d.niche_name),
      datasets: [
        {
          data: data.map((d) => d.count),
          backgroundColor: data.map((_, i) => PALETTE[i % PALETTE.length]),
          borderColor: "#ffffff",
          borderWidth: 2,
          hoverOffset: 6,
        },
      ],
    };
  }, [data]);

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
              const item = data?.[ctx.dataIndex];
              if (!item) return ctx.label ?? "";
              return `${item.niche_name}: ${item.count} (${item.percentage.toFixed(1)}%)`;
            },
          },
        },
      },
    }),
    [data],
  );

  if (isLoading) {
    return <Skeleton className="h-80 w-full rounded-2xl" />;
  }

  if (isError) {
    return (
      <div className="flex h-80 w-full items-center justify-center rounded-2xl border border-neutral-200 bg-white text-sm text-neutral-500">
        Não foi possível carregar a distribuição por nichos.
      </div>
    );
  }

  if (!chartData) {
    return (
      <div className="flex h-80 w-full items-center justify-center rounded-2xl border border-neutral-200 bg-white text-sm text-neutral-500">
        Sem dados de nichos no período selecionado.
      </div>
    );
  }

  return (
    <div className="h-80 w-full">
      <Doughnut data={chartData} options={options} />
    </div>
  );
}
