import { useMemo } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  type ChartOptions,
} from "chart.js";
import { Bar } from "react-chartjs-2";
import {
  buildAudienceBarSeries,
  topAgeBracketLabel,
  type AudienceNetworkAgeData,
} from "@/shared/services/metrics";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip);

const DEMO_AGE_LABELS = ["18-29", "30-49", "50-64", "+65"];
const DEMO_INSTAGRAM_PCT = [85, 55, 28, 12];
const DEMO_YOUTUBE_PCT = [92, 60, 32, 15];

const barDemographicsOptions: ChartOptions<"bar"> = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: "#f9f9f9",
      titleColor: "#202020",
      bodyColor: "#202020",
      padding: 10,
      cornerRadius: 4,
      displayColors: true,
      boxPadding: 4,
      boxWidth: 8,
      callbacks: {
        title(items) {
          return items[0]?.label ?? "";
        },
        label(ctx) {
          const label = ctx.dataset.label ?? "";
          const v = ctx.parsed.y;
          return `${label}: ${v}%`;
        },
      },
    },
  },
  scales: {
    x: {
      grid: { display: false },
      ticks: { color: "#202020", font: { size: 16 } },
    },
    y: {
      beginAtZero: true,
      max: 100,
      grid: { color: "#d8d8d8" },
      ticks: {
        color: "#646464",
        callback: (v) => `${v}%`,
      },
    },
  },
};

function DemographicsBarChart({
  labels,
  instagramData,
  youtubeData,
}: {
  labels: string[];
  instagramData: number[];
  youtubeData: number[];
}) {
  const chartData = {
    labels,
    datasets: [
      {
        label: "Instagram",
        data: instagramData,
        backgroundColor: "#278cff",
        borderRadius: 12,
        borderSkipped: false,
        maxBarThickness: 36,
      },
      {
        label: "Youtube",
        data: youtubeData,
        backgroundColor: "#ff633c",
        borderRadius: 12,
        borderSkipped: false,
        maxBarThickness: 36,
      },
    ],
  };

  return <Bar data={chartData} options={barDemographicsOptions} />;
}

function ageBracketForMaxPercent(values: number[]): string {
  const i = values.indexOf(Math.max(...values));
  const raw = DEMO_AGE_LABELS[i] ?? "—";
  if (raw === "—") return raw;
  return raw.replace("-", "–");
}

export function AudienceByAgePanel({
  networks,
}: {
  networks?: Record<string, AudienceNetworkAgeData> | undefined;
}) {
  const audienceBarSeries = useMemo(
    () => buildAudienceBarSeries(networks),
    [networks]
  );

  const chartLabels = audienceBarSeries?.labels.length
    ? audienceBarSeries.labels
    : DEMO_AGE_LABELS;
  const chartInstagram = audienceBarSeries?.labels.length
    ? audienceBarSeries.instagram
    : DEMO_INSTAGRAM_PCT;
  const chartYoutube = audienceBarSeries?.labels.length
    ? audienceBarSeries.youtube
    : DEMO_YOUTUBE_PCT;

  const igBuckets = networks?.instagram?.age_buckets;
  const ytBuckets = networks?.youtube?.age_buckets;

  const topInstagramAge = useMemo(() => {
    if (networks?.instagram?.has_data && igBuckets?.length) {
      return topAgeBracketLabel(igBuckets);
    }
    return ageBracketForMaxPercent(DEMO_INSTAGRAM_PCT);
  }, [networks, igBuckets]);

  const topYoutubeAge = useMemo(() => {
    if (networks?.youtube?.has_data && ytBuckets?.length) {
      return topAgeBracketLabel(ytBuckets);
    }
    return ageBracketForMaxPercent(DEMO_YOUTUBE_PCT);
  }, [networks, ytBuckets]);

  return (
    <div className="bg-white rounded-xl px-4 py-5 border border-neutral-200 flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="flex flex-col gap-3">
          <p className="text-[17px] text-[#646464]">Maior público Instagram</p>
          <p className="text-2xl font-bold text-black">
            {topInstagramAge === "—" ? "—" : `${topInstagramAge} anos`}
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:text-right">
          <p className="text-[17px] text-[#646464]">Maior público YouTube</p>
          <p className="text-2xl font-bold text-black">
            {topYoutubeAge === "—" ? "—" : `${topYoutubeAge} anos`}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-6 text-sm text-[#202020]">
        <div className="flex items-center gap-2">
          <span className="size-4 rounded bg-[#ff633c]" aria-hidden />
          <span>Youtube</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="size-4 rounded bg-[#278cff]" aria-hidden />
          <span>Instagram</span>
        </div>
      </div>
      <div className="h-[320px] w-full min-h-0">
        <DemographicsBarChart
          labels={chartLabels}
          instagramData={chartInstagram}
          youtubeData={chartYoutube}
        />
      </div>
      {!audienceBarSeries && (
        <p className="text-xs text-neutral-500">
          Gráfico ilustrativo: a API ainda não retornou faixas etárias para este perfil.
        </p>
      )}
    </div>
  );
}
