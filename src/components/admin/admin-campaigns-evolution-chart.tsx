import { useMemo } from "react";
import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  Tooltip,
  type ChartOptions,
} from "chart.js";
import { Bar } from "react-chartjs-2";

import { Skeleton } from "@/components/ui/skeleton";
import type { AdminCampaignsStats } from "@/shared/types";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

interface AdminCampaignsEvolutionChartProps {
  data: AdminCampaignsStats["evolution"] | undefined;
  isLoading?: boolean;
  isError?: boolean;
}

export function AdminCampaignsEvolutionChart({
  data,
  isLoading,
  isError,
}: AdminCampaignsEvolutionChartProps) {
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return null;
    return {
      labels: data.map((d) => d.bucket),
      datasets: [
        {
          label: "Criadas",
          data: data.map((d) => d.created),
          backgroundColor: "#9e2cfa",
          borderRadius: 8,
          maxBarThickness: 32,
        },
        {
          label: "Publicadas",
          data: data.map((d) => d.published),
          backgroundColor: "#c252dc",
          borderRadius: 8,
          maxBarThickness: 32,
        },
        {
          label: "Finalizadas",
          data: data.map((d) => d.finished),
          backgroundColor: "#ccfd00",
          borderRadius: 8,
          maxBarThickness: 32,
        },
      ],
    };
  }, [data]);

  const options: ChartOptions<"bar"> = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
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
          ticks: { color: "#525252", font: { size: 12 }, precision: 0 },
        },
      },
    }),
    [],
  );

  if (isLoading) return <Skeleton className="h-72 w-full rounded-2xl" />;

  if (isError) {
    return (
      <div className="flex h-72 w-full items-center justify-center rounded-2xl border border-neutral-200 bg-white text-sm text-neutral-500">
        Não foi possível carregar a evolução de campanhas.
      </div>
    );
  }

  if (!chartData) {
    return (
      <div className="flex h-72 w-full items-center justify-center rounded-2xl border border-neutral-200 bg-white text-sm text-neutral-500">
        Sem evolução de campanhas no período selecionado.
      </div>
    );
  }

  return (
    <div className="h-72 w-full">
      <Bar data={chartData} options={options} />
    </div>
  );
}
