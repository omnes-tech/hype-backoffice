import { useState, useMemo } from "react";
import { useNavigate, useParams } from "@tanstack/react-router";
import { useContentMetrics } from "@/hooks/use-campaign-metrics";
import type { TopCityRow, AudienceByAgePayload } from "@/shared/services/metrics";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Filler,
  Tooltip,
  Legend,
  type ChartOptions,
} from "chart.js";
import { Line, Bar } from "react-chartjs-2";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/ui/icon";
import { Select } from "@/components/ui/select";
import { Modal } from "@/components/ui/modal";
import { Avatar } from "@/components/ui/avatar";
import { getUploadUrl } from "@/lib/utils/api";
import type {
  CampaignContent,
  ContentMetrics,
  IdentifiedPost,
  CampaignPhase,
} from "@/shared/types";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Filler,
  Tooltip,
  Legend
);

const TIME_RANGE_OPTIONS = [
  { value: "all", label: "Geral" },
  { value: "today", label: "Hoje" },
  { value: "7d", label: "7D" },
  { value: "15d", label: "15D" },
  { value: "1m", label: "1M" },
  { value: "2m", label: "2M" },
] as const;

const WEEKDAYS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sab", "Dom"];
const FULL_DAY_NAMES = [
  "Segunda-feira",
  "Terça-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
  "Sábado",
  "Domingo",
];

function formatCompact(num: number): string {
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(0)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(0)}K`;
  return num.toLocaleString("pt-BR");
}

interface EngagementDayData {
  engagement: number;
  views: number;
  interactions: number;
}

function sortDemographicsLabels(labels: string[]): string[] {
  const score = (label: string) => {
    const m = /(\d+)/.exec(label.replace(/\s/g, ""));
    return m ? parseInt(m[1], 10) : 9999;
  };
  return [...labels].sort((a, b) => score(a) - score(b));
}

function formatNetworkDisplayName(key: string): string {
  const k = key.toLowerCase();
  if (k === "youtube") return "YouTube";
  if (k === "instagram") return "Instagram";
  if (k === "tiktok") return "TikTok";
  if (k === "facebook") return "Facebook";
  if (k === "twitter" || k === "x") return "X";
  return key.charAt(0).toUpperCase() + key.slice(1);
}

function barColorForNetwork(key: string, index: number): string {
  const map: Record<string, string> = {
    instagram: "#278cff",
    youtube: "#ff633c",
    tiktok: "#000000",
    facebook: "#1877f2",
    twitter: "#1da1f2",
    x: "#0a0a0a",
  };
  return map[key.toLowerCase()] ?? `hsl(${(index * 53 + 20) % 360} 62% 48%)`;
}

function topAgeBracketYears(
  audience: AudienceByAgePayload | null | undefined,
  networkKey: string
): string {
  const raw = audience?.networks?.[networkKey] ?? audience?.networks?.[networkKey.toLowerCase()];
  if (!raw?.has_data || !raw.age_buckets?.length) return "—";
  const best = raw.age_buckets.reduce((a, b) => (b.percent > a.percent ? b : a));
  return `${best.label.replace(/-/g, "–")} anos`;
}

function EngagementLineChart({ data }: { data: EngagementDayData[] }) {
  const chartData = {
    labels: WEEKDAYS,
    datasets: [
      {
        label: "Engajamento",
        data: data.map((d) => d.engagement),
        fill: true,
        borderColor: "#3a8730",
        backgroundColor: "rgba(58, 135, 48, 0.25)",
        tension: 0.3,
        pointBackgroundColor: "#3a8730",
        pointBorderColor: "#fff",
        pointBorderWidth: 1,
        pointRadius: 4,
        pointHoverRadius: 6,
      },
    ],
  };

  const options: ChartOptions<"line"> = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: "index", intersect: false },
    plugins: {
      tooltip: {
        backgroundColor: "#f9f9f9",
        titleColor: "#646464",
        bodyColor: "#202020",
        padding: 10,
        cornerRadius: 4,
        displayColors: false,
        titleFont: { size: 14, weight: "normal" },
        bodyFont: { size: 14 },
        callbacks: {
          title(tooltipItems) {
            const idx = tooltipItems[0]?.dataIndex ?? 0;
            return FULL_DAY_NAMES[idx] ?? "";
          },
          label(tooltipItem) {
            const idx = tooltipItem.dataIndex ?? 0;
            const d = data[idx];
            if (!d) return "";
            return [
              `Taxa de Engajamento: ${d.engagement.toFixed(1)}%`,
              `Total de Interações: ${d.interactions.toLocaleString("pt-BR")}`,
              `Visualizações: ${d.views.toLocaleString("pt-BR")}`,
            ];
          },
        },
      },
      legend: { display: false },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: {
          color: "#646464",
          font: { size: 14, family: "DM Sans, sans-serif" },
        },
      },
      y: {
        beginAtZero: true,
        grid: { color: "#e5e5e5" },
        ticks: {
          color: "#646464",
          font: { size: 12 },
        },
      },
    },
  };

  return <Line data={chartData} options={options} />;
}

function DemographicsBarChart({
  audienceByAge,
}: {
  audienceByAge: AudienceByAgePayload | null | undefined;
}) {
  const chartConfig = useMemo(() => {
    const networks = audienceByAge?.networks ?? {};
    const active = Object.entries(networks).filter(
      ([, v]) => v.has_data && (v.age_buckets?.length ?? 0) > 0
    );
    if (active.length === 0) return null;
    const labelSet = new Set<string>();
    for (const [, net] of active) {
      net.age_buckets.forEach((b) => labelSet.add(b.label));
    }
    const labels = sortDemographicsLabels([...labelSet]);
    const datasets = active.map(([key, net], idx) => ({
      label: formatNetworkDisplayName(key),
      data: labels.map((lbl) => {
        const b = net.age_buckets.find((x) => x.label === lbl);
        return b?.percent ?? 0;
      }),
      backgroundColor: barColorForNetwork(key, idx),
      borderRadius: 12,
      borderSkipped: false as const,
      maxBarThickness: 36,
    }));
    return { labels, datasets };
  }, [audienceByAge]);

  const options: ChartOptions<"bar"> = {
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
        callbacks: {
          title(items) {
            return items[0]?.label ?? "";
          },
          label(ctx) {
            const label = ctx.dataset.label ?? "";
            const v = ctx.parsed.y;
            return `${label}: ${typeof v === "number" ? v.toFixed(1) : v}%`;
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

  if (!chartConfig) {
    return (
      <div className="h-[220px] w-full flex items-center justify-center text-sm text-[#646464] text-center px-4">
        Demografia por idade indisponível para os posts identificados nesta campanha.
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-wrap gap-6 text-sm text-[#202020]">
        {chartConfig.datasets.map((ds) => (
          <div key={ds.label} className="flex items-center gap-2">
            <span
              className="size-4 rounded shrink-0"
              style={{ backgroundColor: ds.backgroundColor as string }}
              aria-hidden
            />
            <span>{ds.label}</span>
          </div>
        ))}
      </div>
      <div className="h-[220px] w-full min-h-0 flex-1 mt-2">
        <Bar
          data={{ labels: chartConfig.labels, datasets: chartConfig.datasets }}
          options={options}
        />
      </div>
    </>
  );
}

interface MetricsTabProps {
  contents: CampaignContent[];
  metrics: { [contentId: string]: ContentMetrics };
  campaignPhases?: CampaignPhase[];
  identifiedPosts?: IdentifiedPost[];
  topCities?: TopCityRow[];
  audienceByAge?: AudienceByAgePayload | null;
  tabAnalyticsLoading?: boolean;
}

const CITY_CARD_STYLES = [
  { cardClass: "bg-[#f0ffed]", circleClass: "bg-emerald-200 text-[#3b3b3b]" },
  { cardClass: "bg-[#f9ffd5]", circleClass: "bg-amber-200 text-[#3b3b3b]" },
  { cardClass: "bg-[#eefcff]", circleClass: "bg-sky-200 text-[#3b3b3b]" },
  { cardClass: "bg-[#f2f2f2]", circleClass: "bg-neutral-300 text-[#3b3b3b]" },
  { cardClass: "bg-[#f2f2f2]", circleClass: "bg-neutral-300 text-neutral-950" },
] as const;

export function MetricsTab({
  contents,
  metrics,
  campaignPhases = [],
  identifiedPosts: propsIdentifiedPosts = [],
  topCities = [],
  audienceByAge = null,
  tabAnalyticsLoading = false,
}: MetricsTabProps) {
  const navigate = useNavigate();
  const { campaignId } = useParams({ from: "/(private)/(app)/campaigns/$campaignId" });
  const [selectedContent, setSelectedContent] = useState<CampaignContent | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPhaseFilter, setSelectedPhaseFilter] = useState<string>("all");
  const [selectedSocialFilter, setSelectedSocialFilter] = useState<string>("all");
  const [selectedTimeRange, setSelectedTimeRange] = useState<string>("all");
  const [hasViewedNewPosts, setHasViewedNewPosts] = useState(false);

  const topInstagramAge = useMemo(
    () => topAgeBracketYears(audienceByAge, "instagram"),
    [audienceByAge]
  );
  const topYoutubeAge = useMemo(
    () => topAgeBracketYears(audienceByAge, "youtube"),
    [audienceByAge]
  );

  const { data: modalContentMetrics } = useContentMetrics(
    campaignId ?? "",
    selectedContent?.id ?? "",
    { enabled: isModalOpen && !!campaignId && !!selectedContent?.id }
  );

  const detailMetricsForModal = useMemo(
    () =>
      modalContentMetrics ??
      (selectedContent ? metrics[selectedContent.id] ?? null : null),
    [modalContentMetrics, selectedContent, metrics]
  );

  const identifiedPosts: IdentifiedPost[] = propsIdentifiedPosts;

  const phaseOptions = [
    { value: "all", label: "Todas as fases" },
    ...campaignPhases.map((phase, index) => ({
      value: phase.id,
      label: `Fase ${index + 1}`,
    })),
  ];

  const socialNetworks = useMemo(() => {
    const set = new Set<string>();
    contents.forEach((c) => c.socialNetwork && set.add(c.socialNetwork));
    return [{ value: "all", label: "Todas as redes" }, ...Array.from(set).map((s) => ({ value: s, label: s }))];
  }, [contents]);

  const filteredIdentifiedPosts =
    selectedPhaseFilter === "all"
      ? identifiedPosts
      : identifiedPosts.filter((post) => post.phaseId === selectedPhaseFilter);

  const publishedContents = contents.filter((content) => content.status === "published");

  const contentsForTotals = useMemo(() => {
    let list = publishedContents;
    if (selectedPhaseFilter !== "all") {
      list = list.filter((c) => c.phase_id === selectedPhaseFilter);
    }
    if (selectedSocialFilter !== "all") {
      list = list.filter((c) => (c.socialNetwork || c.social_network) === selectedSocialFilter);
    }
    if (selectedTimeRange !== "all") {
      const now = new Date();
      const cutoff = new Date(now);
      if (selectedTimeRange === "today") cutoff.setHours(0, 0, 0, 0);
      else if (selectedTimeRange === "7d") cutoff.setDate(cutoff.getDate() - 7);
      else if (selectedTimeRange === "15d") cutoff.setDate(cutoff.getDate() - 15);
      else if (selectedTimeRange === "1m") cutoff.setMonth(cutoff.getMonth() - 1);
      else if (selectedTimeRange === "2m") cutoff.setMonth(cutoff.getMonth() - 2);
      list = list.filter((c) => {
        const d = c.publishedAt || c.published_at;
        return d && new Date(d) >= cutoff;
      });
    }
    return list;
  }, [publishedContents, selectedPhaseFilter, selectedSocialFilter, selectedTimeRange]);

  const getContentMetrics = (contentId: string): ContentMetrics | null => {
    return metrics[contentId] || null;
  };

  const getInfluencerContents = (influencerId: string) => {
    return publishedContents.filter((content) => content.influencerId === influencerId);
  };

  const totalMetrics = useMemo(() => {
    return contentsForTotals.reduce(
      (acc, content) => {
        const m = getContentMetrics(content.id);
        if (m) {
          acc.views += m.views;
          acc.likes += m.likes;
          acc.comments += m.comments;
        }
        return acc;
      },
      { views: 0, likes: 0, comments: 0 }
    );
  }, [contentsForTotals, metrics]);

  const engagementChartData = useMemo(() => {
    const byDay: Array<{ engagement: number; views: number; interactions: number }> = [
      { engagement: 0, views: 0, interactions: 0 },
      { engagement: 0, views: 0, interactions: 0 },
      { engagement: 0, views: 0, interactions: 0 },
      { engagement: 0, views: 0, interactions: 0 },
      { engagement: 0, views: 0, interactions: 0 },
      { engagement: 0, views: 0, interactions: 0 },
      { engagement: 0, views: 0, interactions: 0 },
    ];
    contentsForTotals.forEach((content) => {
      const m = getContentMetrics(content.id);
      const dateStr = content.publishedAt || content.published_at;
      if (m && dateStr) {
        const d = new Date(dateStr);
        const dayIndex = (d.getDay() + 6) % 7;
        byDay[dayIndex].engagement += m.engagement || 0;
        byDay[dayIndex].views += m.views || 0;
        byDay[dayIndex].interactions += (m.likes || 0) + (m.comments || 0);
      }
    });
    return byDay;
  }, [contentsForTotals, metrics]);

  const getInfluencerTotalMetrics = (influencerId: string) => {
    const influencerContents = getInfluencerContents(influencerId);
    return influencerContents.reduce(
      (acc, content) => {
        const contentMetrics = getContentMetrics(content.id);
        if (contentMetrics) {
          acc.views += contentMetrics.views;
          acc.likes += contentMetrics.likes;
          acc.comments += contentMetrics.comments;
          acc.shares += contentMetrics.shares;
          acc.reach += contentMetrics.reach;
          acc.engagementSum += contentMetrics.engagement || 0;
          acc.engagementCount += 1;
        }
        return acc;
      },
      { views: 0, likes: 0, comments: 0, shares: 0, reach: 0, engagementSum: 0, engagementCount: 0 }
    );
  };

  const uniqueInfluencers = Array.from(
    new Map(
      publishedContents.map((content) => [content.influencerId, content])
    ).values()
  );

  const top4Influencers = useMemo(() => {
    return uniqueInfluencers
      .map((c) => ({
        ...c,
        totalViews: getInfluencerTotalMetrics(c.influencerId).views,
      }))
      .sort((a, b) => b.totalViews - a.totalViews)
      .slice(0, 4);
  }, [uniqueInfluencers, metrics, publishedContents]);

  const handleContentClick = (content: CampaignContent) => {
    setSelectedContent(content);
    setIsModalOpen(true);
  };

  const getSocialNetworkIcon = (network: string) => {
    const icons: { [key: string]: keyof typeof import("lucide-react").icons } = {
      instagram: "Instagram",
      youtube: "Youtube",
      tiktok: "Music",
      facebook: "Facebook",
      twitter: "Twitter",
    };
    return icons[network?.toLowerCase()] || "Share2";
  };

  const top4CardBg = ["#f0ffed", "#f9ffd5", "#eefcff", "#f2f2f2"];
  const rankingColors = ["#147401", "#464605", "#00619d", "#0A0A0A"];

  return (
    <>
      <div className="flex flex-col gap-6">
        {/* Métricas totais — Figma 2482:21951 */}
        <div className="bg-white rounded-xl px-4 py-5 flex flex-col gap-6 shadow-sm">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <h3 className="text-2xl font-semibold text-black shrink-0">Métricas totais</h3>
            <div className="flex flex-col gap-2 lg:flex-row lg:flex-wrap lg:items-start lg:gap-2">
              <div className="min-w-0 w-full max-w-[354px] lg:w-[min(354px,100%)]">
                <Select
                  placeholder="Rede Social"
                  options={socialNetworks}
                  value={selectedSocialFilter}
                  onChange={setSelectedSocialFilter}
                />
              </div>
              <div className="min-w-0 w-full max-w-[354px] lg:w-[min(354px,100%)]">
                <Select
                  placeholder="Fase"
                  options={phaseOptions}
                  value={selectedPhaseFilter}
                  onChange={setSelectedPhaseFilter}
                />
              </div>
              <div className="bg-[#f5f5f5] inline-flex flex-wrap items-center gap-0 rounded-[32px] p-1 self-start">
                {TIME_RANGE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setSelectedTimeRange(opt.value)}
                    className={`px-4 py-2.5 rounded-[24px] text-sm font-medium transition-colors min-w-18 ${
                      selectedTimeRange === opt.value
                        ? "bg-primary-600/90 text-white shadow-sm"
                        : "text-[#646464] hover:bg-white/60"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="bg-[#f2f2f2] rounded-lg border-t-4 border-t-[#c8f5ff] px-4 pt-3 pb-5 flex flex-col gap-8">
                <div className="flex items-center gap-2">
                  <div className="bg-[#c8f5ff] rounded-lg size-9 flex items-center justify-center shrink-0">
                    <Icon name="Eye" color="#0A0A0A" size={24} />
                  </div>
                  <span className="text-base font-medium text-black">Visualizações</span>
                </div>
                <p className="text-2xl font-bold text-black tabular-nums">
                  {totalMetrics.views.toLocaleString("pt-BR")}
                </p>
              </div>
              <div className="bg-[#f2f2f2] rounded-lg border-t-4 border-t-[#ceffc8] px-4 pt-3 pb-5 flex flex-col gap-8">
                <div className="flex items-center gap-2">
                  <div className="bg-[#ceffc8] rounded-lg size-9 flex items-center justify-center shrink-0">
                    <Icon name="ThumbsUp" color="#0A0A0A" size={24} />
                  </div>
                  <span className="text-base font-medium text-black">Curtidas</span>
                </div>
                <p className="text-2xl font-bold text-black tabular-nums">
                  {totalMetrics.likes.toLocaleString("pt-BR")}
                </p>
              </div>
              <div className="bg-[#f2f2f2] rounded-lg border-t-4 border-t-[#ffffc8] px-4 pt-3 pb-5 flex flex-col gap-8">
                <div className="flex items-center gap-2">
                  <div className="bg-[#ffffc8] rounded-lg size-9 flex items-center justify-center shrink-0">
                    <Icon name="MessageCircle" color="#0A0A0A" size={24} />
                  </div>
                  <span className="text-base font-medium text-black">Comentários</span>
                </div>
                <p className="text-2xl font-bold text-black tabular-nums">
                  {totalMetrics.comments.toLocaleString("pt-BR")}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div className="bg-[#f2f2f2] rounded-lg px-4 py-5 flex flex-col gap-5 min-h-[320px]">
                <div className="flex items-center gap-2">
                  <div className="bg-[#fac8ff] rounded-lg size-9 flex items-center justify-center shrink-0">
                    <Icon name="ChartLine" color="#0A0A0A" size={24} />
                  </div>
                  <span className="text-base font-medium text-black">Engajamento</span>
                </div>
                <div className="h-[260px] w-full min-h-0 flex-1">
                  <EngagementLineChart data={engagementChartData} />
                </div>
              </div>

              <div className="bg-[#f2f2f2] rounded-lg px-4 py-5 flex flex-col gap-5 min-h-[320px]">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                  <div className="flex flex-col gap-3">
                    <p className="text-[17px] text-[#646464]">Maior público Instagram</p>
                    <p className="text-2xl font-bold text-black">{topInstagramAge}</p>
                  </div>
                  <div className="flex flex-col gap-3 sm:text-right">
                    <p className="text-[17px] text-[#646464]">Maior público YouTube</p>
                    <p className="text-2xl font-bold text-black">{topYoutubeAge}</p>
                  </div>
                </div>
                <div className="flex flex-col gap-2 min-h-[220px]">
                  <DemographicsBarChart audienceByAge={audienceByAge} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Cidades com melhor performance — Figma 2487:18050 */}
        <div className="bg-white rounded-xl px-4 py-5 flex flex-col gap-6 shadow-sm">
          <h3 className="text-2xl font-semibold text-black">Cidades com melhor performance</h3>
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            {tabAnalyticsLoading && topCities.length === 0 ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={`city-skel-${i}`}
                  className="flex flex-1 flex-col gap-5 min-w-[170px] rounded-xl px-3 pt-4 pb-5 bg-neutral-100 animate-pulse"
                >
                  <div className="h-11 w-full rounded-lg bg-neutral-200" />
                  <div className="h-6 w-3/4 mx-auto rounded bg-neutral-200" />
                </div>
              ))
            ) : topCities.length === 0 ? (
              <p className="text-sm text-[#646464] py-2">
                Nenhuma cidade com dados de endereço e engajamento para esta campanha.
              </p>
            ) : (
              topCities.map((city, i) => {
                const style = CITY_CARD_STYLES[i % CITY_CARD_STYLES.length];
                return (
                  <div
                    key={`${city.city_name}-${city.state}-${city.rank}`}
                    className={`flex flex-1 flex-col gap-5 min-w-[170px] rounded-xl px-3 pt-4 pb-5 ${style.cardClass}`}
                  >
                    <div className="flex items-center justify-center gap-2.5">
                      <div
                        className={`relative flex size-11 shrink-0 items-center justify-center rounded-full ${style.circleClass}`}
                      >
                        <span className="text-xl font-medium">{city.rank}</span>
                      </div>
                      <p className="text-lg font-medium text-black text-center leading-tight">
                        {city.city_name}
                        <span className="text-base font-normal text-[#646464]"> / {city.state}</span>
                      </p>
                    </div>
                    <p className="text-lg font-medium text-black text-center">
                      {formatCompact(city.engagement_score)} de engajamento
                    </p>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Top 4 influenciadores — Figma 2663:18565 */}
        <div className="bg-white rounded-xl px-4 py-5 flex flex-col gap-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <h3 className="text-2xl font-semibold text-black">Top 4 influenciadores</h3>
            <button
              type="button"
              className="text-base text-[#7c7c7c] underline decoration-solid hover:text-black"
            >
              Ver mais
            </button>
          </div>
          <div className="flex flex-wrap gap-3">
            {top4Influencers.length === 0 ? (
              <p className="text-sm text-[#646464] py-4">Nenhum influenciador com publicações ainda.</p>
            ) : (
              top4Influencers.map((inf, idx) => {
                const m = getInfluencerTotalMetrics(inf.influencerId);
                const contentsCount = getInfluencerContents(inf.influencerId).length;
                const engagementAvg =
                  m.engagementCount > 0 ? (m.engagementSum / m.engagementCount).toFixed(1) : "0";
                const socialNetworksList = Array.from(
                  new Set(
                    getInfluencerContents(inf.influencerId)
                      .map((c) => c.socialNetwork)
                      .filter(Boolean)
                  )
                );
                const avatarSrc = getUploadUrl(inf.influencerAvatar) ?? inf.influencerAvatar;
                return (
                  <div
                    key={inf.influencerId}
                    className="flex min-w-[260px] flex-1 flex-col gap-5 rounded-xl p-3"
                    style={{ backgroundColor: top4CardBg[idx] ?? "#f2f2f2" }}
                  >
                    <div className="flex w-full items-center gap-2">
                      <img
                        src={avatarSrc}
                        alt={inf.influencerName}
                        className="size-10 shrink-0 rounded-lg object-cover bg-neutral-200"
                      />
                      <p className="truncate text-lg font-medium text-black">{inf.influencerName}</p>
                    </div>
                    <div className="flex flex-wrap content-center items-center justify-between gap-y-6">
                      <div className="flex min-w-[115px] flex-col gap-3">
                        <p className="text-sm text-[#4d4d4d]">Ranking</p>
                        <p className="text-lg font-medium" style={{ color: rankingColors[idx] ?? "#0A0A0A" }}>
                          {idx + 1}º
                        </p>
                      </div>
                      <div className="flex min-w-[115px] flex-col items-end gap-3">
                        <p className="text-sm text-[#4d4d4d]">Post</p>
                        <p className="text-lg font-medium text-black">
                          1/{contentsCount || 1}
                        </p>
                      </div>
                      <div className="flex min-w-[115px] flex-col gap-3">
                        <p className="text-sm text-[#4d4d4d]">Alcance / Visu</p>
                        <p className="text-lg font-medium text-black">{formatCompact(m.views)}</p>
                      </div>
                      <div className="flex flex-col items-end gap-3">
                        <p className="text-sm text-[#4d4d4d]">Engajamento</p>
                        <p className="text-lg font-medium text-black">{engagementAvg}%</p>
                      </div>
                      <div className="flex flex-col gap-3">
                        <p className="text-sm text-[#4d4d4d]">Rede social</p>
                        <div className="flex gap-2.5">
                          {socialNetworksList.slice(0, 3).map((sn) => (
                            <Icon
                              key={sn}
                              name={getSocialNetworkIcon(sn)}
                              color="#4d4d4d"
                              size={20}
                            />
                          ))}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-3">
                        <p className="text-sm text-[#4d4d4d]">Status</p>
                        <span className="rounded-[32px] bg-[#ceffc4] px-4 py-2 text-base font-normal text-black">
                          Concluído
                        </span>
                      </div>
                    </div>
                    <div className="flex w-full items-center justify-between gap-2">
                      <button
                        type="button"
                        className="flex items-center gap-1 text-base font-medium text-[#4d4d4d] underline decoration-solid"
                      >
                        <Icon name="Wallet" color="#4d4d4d" size={24} />
                        Performance
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (!campaignId) return;
                          navigate({
                            to: "/campaigns/$campaignId/influencer/$influencerId",
                            params: { campaignId, influencerId: inf.influencerId },
                          });
                        }}
                        className="flex items-center gap-1 text-base font-medium text-[#4d4d4d] underline decoration-solid hover:text-neutral-950"
                      >
                        <Icon name="Link" color="#4d4d4d" size={24} />
                        Ver perfil
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Conteúdos publicados — Figma 2488:17504 */}
        <div className="bg-white rounded-xl px-4 py-5 flex flex-col gap-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <h3 className="text-2xl font-semibold text-black">Conteúdos publicados</h3>
            <button
              type="button"
              className="text-base text-[#7c7c7c] underline decoration-solid hover:text-black"
            >
              Ver mais
            </button>
          </div>
          {publishedContents.length === 0 ? (
            <div className="text-center py-12">
              <Icon name="TrendingUp" color="#A3A3A3" size={48} />
              <p className="text-[#646464] mt-4">Nenhum conteúdo publicado ainda</p>
            </div>
          ) : (
            <div className="flex flex-wrap gap-3">
              {publishedContents.slice(0, 8).map((content) => {
                const contentMetrics = getContentMetrics(content.id);
                const phaseOrder =
                  content.phase?.order ??
                  ((campaignPhases.findIndex((p) => p.id === content.phase_id) + 1) || "?");
                const avatarSrc =
                  getUploadUrl(content.influencerAvatar) ?? content.influencerAvatar;
                const previewSrc = getUploadUrl(content.previewUrl) ?? content.previewUrl;
                return (
                  <div
                    key={content.id}
                    className="flex min-w-[260px] w-[min(270px,100%)] flex-col gap-5 rounded-xl bg-[#f2f2f2] p-3 transition-shadow hover:shadow-md"
                  >
                    <button
                      type="button"
                      className="flex w-full flex-col gap-5 text-left"
                      onClick={() => handleContentClick(content)}
                    >
                      <div className="flex w-full items-center gap-2">
                        <img
                          src={avatarSrc}
                          alt={content.influencerName}
                          className="size-10 shrink-0 rounded-lg object-cover bg-neutral-200"
                        />
                        <p className="truncate text-lg font-medium text-black">{content.influencerName}</p>
                      </div>
                      <div className="h-[137px] w-full overflow-hidden rounded-lg bg-[#e5e5e5]">
                        {previewSrc ? (
                          <img src={previewSrc} alt="Preview" className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            <Icon name="Image" color="#A3A3A3" size={32} />
                          </div>
                        )}
                      </div>
                      <div className="flex flex-wrap content-center items-center justify-between gap-y-6">
                        <div className="flex min-w-[115px] flex-col gap-3">
                          <p className="text-sm text-[#4d4d4d]">Fase</p>
                          <p className="text-lg font-medium text-black">{phaseOrder}</p>
                        </div>
                        <div className="flex min-w-[115px] flex-col items-end gap-3">
                          <p className="text-sm text-[#4d4d4d]">Data da postagem</p>
                          <p className="text-lg font-medium text-black">
                            {(content.publishedAt ?? content.published_at)
                              ? new Date(
                                  (content.publishedAt ?? content.published_at) as string
                                ).toLocaleDateString("pt-BR")
                              : "-"}
                          </p>
                        </div>
                        <div className="flex flex-col gap-3">
                          <p className="text-sm text-[#4d4d4d]">Curtidas</p>
                          <p className="text-lg font-medium text-black">
                            {contentMetrics ? formatCompact(contentMetrics.likes) : "-"}
                          </p>
                        </div>
                        <div className="flex min-w-[115px] flex-col items-end gap-3">
                          <p className="text-sm text-[#4d4d4d]">Alcance / Visu</p>
                          <p className="text-lg font-medium text-black">
                            {contentMetrics ? formatCompact(contentMetrics.views) : "-"}
                          </p>
                        </div>
                      </div>
                    </button>
                    <div className="flex items-center">
                      <Icon
                        name={getSocialNetworkIcon(content.socialNetwork)}
                        color="#4d4d4d"
                        size={20}
                      />
                    </div>
                    <div className="flex w-full justify-center border-t border-transparent pt-1">
                      <button
                        type="button"
                        className="text-center text-base font-medium text-[#4d4d4d] underline decoration-solid hover:text-neutral-950"
                        onClick={() => {
                          if (content.postUrl) window.open(content.postUrl, "_blank");
                          else handleContentClick(content);
                        }}
                      >
                        Visualizar postagem
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Publicações identificadas */}
        <div className="bg-white rounded-xl border border-neutral-200 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <h3 className="text-lg font-semibold text-neutral-950">
                  {hasViewedNewPosts ? "Publicações identificadas" : "Novas Publicações identificadas"}
                </h3>
                <Badge
                  text={`${filteredIdentifiedPosts.length} publicação(ões)`}
                  backgroundColor="bg-success-50"
                  textColor="text-success-900"
                />
              </div>
              {campaignPhases.length > 0 && (
                <div className="w-48">
                  <Select
                    placeholder="Filtrar por fase"
                    options={phaseOptions}
                    value={selectedPhaseFilter}
                    onChange={setSelectedPhaseFilter}
                  />
                </div>
              )}
            </div>
            <p className="text-sm text-neutral-600 mb-4">
              Publicações identificadas automaticamente através das hashtags das fases da
              campanha
            </p>
            {filteredIdentifiedPosts.length === 0 ? (
              <div className="text-center py-12">
                <Icon name="Search" color="#A3A3A3" size={48} />
                <p className="text-neutral-600 mt-4">
                  Nenhuma publicação identificada para esta fase
                </p>
              </div>
            ) : (
              <div 
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
                onMouseEnter={() => !hasViewedNewPosts && setHasViewedNewPosts(true)}
              >
                {filteredIdentifiedPosts.map((post) => (
                  <div
                    key={post.id}
                    className="bg-neutral-50 rounded-2xl p-4 border border-neutral-200"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <Avatar
                        src={post.influencerAvatar}
                        alt={post.influencerName}
                        size="md"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-neutral-950 truncate">
                          {post.influencerName}
                        </p>
                        <p className="text-xs text-neutral-600">
                          {new Date(post.publishedAt).toLocaleDateString("pt-BR")}
                        </p>
                      </div>
                    </div>
                    <div className="mb-3 rounded-xl overflow-hidden bg-neutral-200 aspect-video">
                      {post.previewUrl ? (
                        <img
                          src={post.previewUrl}
                          alt="Preview"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Icon name="Image" color="#A3A3A3" size={32} />
                        </div>
                      )}
                    </div>
                    <div className="mb-3">
                      <Badge
                        text={post.phaseHashtag}
                        backgroundColor="bg-primary-50"
                        textColor="text-primary-900"
                      />
                    </div>
                    {post.metrics && (
                      <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                        <div>
                          <p className="text-neutral-600">Visualizações</p>
                          <p className="font-semibold text-neutral-950">
                            {post.metrics.views.toLocaleString("pt-BR")}
                          </p>
                        </div>
                        <div>
                          <p className="text-neutral-600">Curtidas</p>
                          <p className="font-semibold text-neutral-950">
                            {post.metrics.likes.toLocaleString("pt-BR")}
                          </p>
                        </div>
                      </div>
                    )}
                    <Button
                      variant="ghost"
                      className="w-full text-sm"
                      onClick={() => window.open(post.postUrl, "_blank")}
                    >
                      <div className="flex items-center gap-2">
                        <Icon name="ExternalLink" color="#404040" size={14} />
                        <span>Ver publicação</span>
                      </div>
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
      </div>

      {/* Modal com métricas detalhadas */}
      {selectedContent && (
        <Modal
          title="Métricas detalhadas"
          onClose={() => {
            setIsModalOpen(false);
            setSelectedContent(null);
          }}
        >
          {isModalOpen && (
            <div className="flex flex-col gap-6">
              <div className="flex items-center gap-4">
                <Avatar
                  src={getUploadUrl(selectedContent.influencerAvatar) ?? selectedContent.influencerAvatar}
                  alt={selectedContent.influencerName}
                  size="lg"
                />
                <div>
                  <h3 className="text-lg font-semibold text-neutral-950">
                    {selectedContent.influencerName}
                  </h3>
                  <p className="text-neutral-600">
                    {selectedContent.socialNetwork} • {selectedContent.contentType}
                  </p>
                </div>
              </div>

              <div className="rounded-xl overflow-hidden bg-neutral-200 aspect-video">
                {selectedContent.previewUrl ? (
                  <img
                    src={getUploadUrl(selectedContent.previewUrl) ?? selectedContent.previewUrl}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Icon name="Image" color="#A3A3A3" size={48} />
                  </div>
                )}
              </div>

              {detailMetricsForModal ? (
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-neutral-50 rounded-2xl p-4">
                    <p className="text-sm text-neutral-600 mb-1">Visualizações</p>
                    <p className="text-2xl font-semibold text-neutral-950">
                      {detailMetricsForModal.views.toLocaleString("pt-BR")}
                    </p>
                  </div>
                  <div className="bg-neutral-50 rounded-2xl p-4">
                    <p className="text-sm text-neutral-600 mb-1">Curtidas</p>
                    <p className="text-2xl font-semibold text-neutral-950">
                      {detailMetricsForModal.likes.toLocaleString("pt-BR")}
                    </p>
                  </div>
                  <div className="bg-neutral-50 rounded-2xl p-4">
                    <p className="text-sm text-neutral-600 mb-1">Comentários</p>
                    <p className="text-2xl font-semibold text-neutral-950">
                      {detailMetricsForModal.comments.toLocaleString("pt-BR")}
                    </p>
                  </div>
                  <div className="bg-neutral-50 rounded-2xl p-4">
                    <p className="text-sm text-neutral-600 mb-1">Compartilhamentos</p>
                    <p className="text-2xl font-semibold text-neutral-950">
                      {detailMetricsForModal.shares.toLocaleString("pt-BR")}
                    </p>
                  </div>
                  <div className="bg-neutral-50 rounded-2xl p-4">
                    <p className="text-sm text-neutral-600 mb-1">Alcance</p>
                    <p className="text-2xl font-semibold text-neutral-950">
                      {detailMetricsForModal.reach.toLocaleString("pt-BR")}
                    </p>
                  </div>
                  <div className="bg-neutral-50 rounded-2xl p-4">
                    <p className="text-sm text-neutral-600 mb-1">Taxa de engajamento</p>
                    <p className="text-2xl font-semibold text-neutral-950">
                      {detailMetricsForModal.engagement.toFixed(1)}%
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-neutral-600">
                    Métricas ainda não disponíveis para este conteúdo
                  </p>
                </div>
              )}

              {selectedContent.postUrl && (
                <Button
                  onClick={() => window.open(selectedContent.postUrl, "_blank")}
                  className="w-full"
                >
                  <div className="flex items-center gap-2">
                    <Icon name="ExternalLink" color="#FAFAFA" size={16} />
                    <span>Abrir na rede social</span>
                  </div>
                </Button>
              )}
            </div>
          )}
        </Modal>
      )}
    </>
  );
}

