import { useState, useMemo } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  type ChartOptions,
} from "chart.js";
import { Line } from "react-chartjs-2";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/ui/icon";
import { Select } from "@/components/ui/select";
import { Modal } from "@/components/ui/modal";
import { Avatar } from "@/components/ui/avatar";
import type {
  CampaignContent,
  ContentMetrics,
  IdentifiedPost,
  CampaignPhase,
} from "@/shared/types";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip);

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
    plugins: {
      tooltip: {
        backgroundColor: "#f9f9f9",
        titleColor: "#646464",
        bodyColor: "#202020",
        padding: 10,
        cornerRadius: 4,
        displayColors: false,
        callbacks: {
          title(tooltipItems) {
            const idx = tooltipItems[0]?.dataIndex ?? 0;
            return FULL_DAY_NAMES[idx] ?? "";
          },
          afterBody(tooltipItems) {
            const idx = tooltipItems[0]?.dataIndex ?? 0;
            const d = data[idx];
            if (!d) return [];
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
          font: { size: 14 },
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

interface MetricsTabProps {
  contents: CampaignContent[];
  metrics: { [contentId: string]: ContentMetrics };
  campaignPhases?: CampaignPhase[];
  identifiedPosts?: IdentifiedPost[];
}

export function MetricsTab({
  contents,
  metrics,
  campaignPhases = [],
  identifiedPosts: propsIdentifiedPosts = [],
}: MetricsTabProps) {
  const [selectedContent, setSelectedContent] = useState<CampaignContent | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPhaseFilter, setSelectedPhaseFilter] = useState<string>("all");
  const [selectedSocialFilter, setSelectedSocialFilter] = useState<string>("all");
  const [selectedTimeRange, setSelectedTimeRange] = useState<string>("all");
  const [hasViewedNewPosts, setHasViewedNewPosts] = useState(false);

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
      <div className="flex flex-col gap-8">
        {/* Section header */}
        <div>
          <h2 className="text-2xl font-semibold text-[#0A0A0A]">Métricas e conteúdos</h2>
          <p className="text-sm text-[#7c7c7c] mt-1">
            Acompanhe as métricas gerais da campanha, os principais influenciadores e os conteúdos publicados.
          </p>
        </div>

        {/* Card 1: Métricas totais */}
        <div className="bg-white rounded-[12px] p-5 flex flex-col gap-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h3 className="text-2xl font-semibold text-black">Métricas totais</h3>
            <div className="flex flex-wrap gap-2 items-center">
              <div className="w-[200px] min-w-0">
                <Select
                  placeholder="Rede Social"
                  options={socialNetworks}
                  value={selectedSocialFilter}
                  onChange={setSelectedSocialFilter}
                />
              </div>
              <div className="w-[200px] min-w-0">
                <Select
                  placeholder="Fase"
                  options={phaseOptions}
                  value={selectedPhaseFilter}
                  onChange={setSelectedPhaseFilter}
                />
              </div>
              <div className="bg-[#f5f5f5] flex items-center p-1 rounded-[32px]">
                {TIME_RANGE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setSelectedTimeRange(opt.value)}
                    className={`px-4 py-2.5 rounded-[24px] text-sm font-medium transition-colors ${
                      selectedTimeRange === opt.value
                        ? "bg-primary-600 text-white"
                        : "text-[#646464] hover:bg-white/50"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-4">
            <div className="bg-[#f2f2f2] rounded-lg px-4 pt-3 pb-5 flex flex-col gap-8 min-w-[200px] flex-1 max-w-[362px]">
              <div className="flex items-center gap-2">
                <div className="bg-[#c8f5ff] rounded-lg size-9 flex items-center justify-center">
                  <Icon name="Eye" color="#0A0A0A" size={24} />
                </div>
                <span className="text-base font-medium text-black">Visualizações</span>
              </div>
              <p className="text-2xl font-bold text-black">
                {totalMetrics.views.toLocaleString("pt-BR")}
              </p>
            </div>
            <div className="bg-[#f2f2f2] rounded-lg px-4 pt-3 pb-5 flex flex-col gap-8 min-w-[200px] flex-1 max-w-[362px]">
              <div className="flex items-center gap-2">
                <div className="bg-[#ceffc8] rounded-lg size-9 flex items-center justify-center">
                  <Icon name="ThumbsUp" color="#0A0A0A" size={24} />
                </div>
                <span className="text-base font-medium text-black">Curtidas</span>
              </div>
              <p className="text-2xl font-bold text-black">
                {totalMetrics.likes.toLocaleString("pt-BR")}
              </p>
            </div>
            <div className="bg-[#f2f2f2] rounded-lg px-4 pt-3 pb-5 flex flex-col gap-8 min-w-[200px] flex-1 max-w-[362px]">
              <div className="flex items-center gap-2">
                <div className="bg-[#ffffc8] rounded-lg size-9 flex items-center justify-center">
                  <Icon name="MessageCircle" color="#0A0A0A" size={24} />
                </div>
                <span className="text-base font-medium text-black">Comentários</span>
              </div>
              <p className="text-2xl font-bold text-black">
                {totalMetrics.comments.toLocaleString("pt-BR")}
              </p>
            </div>
            <div className="bg-[#f2f2f2] rounded-lg px-4 py-5 flex flex-col gap-5 flex-1 min-w-[280px]">
              <div className="flex items-center gap-2">
                <div className="bg-[#fac8ff] rounded-lg size-9 flex items-center justify-center">
                  <Icon name="ChartLine" color="#0A0A0A" size={24} />
                </div>
                <span className="text-base font-medium text-black">Engajamento</span>
              </div>
              <div className="h-[220px] w-full">
                <EngagementLineChart data={engagementChartData} />
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Top 4 influenciadores */}
        <div className="bg-white rounded-[12px] p-5 flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <h3 className="text-2xl font-semibold text-black">Top 4 influenciadores</h3>
            <button
              type="button"
              className="text-base text-[#7c7c7c] underline hover:text-black"
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
                  new Set(getInfluencerContents(inf.influencerId).map((c) => c.socialNetwork))
                );
                return (
                  <div
                    key={inf.influencerId}
                    className="flex flex-col gap-5 p-3 rounded-[12px] min-w-[260px] flex-1 max-w-[320px]"
                    style={{ backgroundColor: top4CardBg[idx] ?? "#f2f2f2" }}
                  >
                    <div className="flex items-center gap-2">
                      <img
                        src={inf.influencerAvatar}
                        alt={inf.influencerName}
                        className="size-10 rounded-lg object-cover"
                      />
                      <p className="text-lg font-medium text-black truncate">{inf.influencerName}</p>
                    </div>
                    <div className="flex flex-wrap gap-y-6 justify-between">
                      <div className="flex flex-col gap-3 min-w-[100px]">
                        <p className="text-sm text-[#4d4d4d]">Ranking</p>
                        <p className="text-lg font-medium" style={{ color: rankingColors[idx] ?? "#0A0A0A" }}>
                          {idx + 1}º
                        </p>
                      </div>
                      <div className="flex flex-col gap-3 items-end min-w-[100px]">
                        <p className="text-sm text-[#4d4d4d]">Post</p>
                        <p className="text-lg font-medium text-black">1/{contentsCount || 1}</p>
                      </div>
                      <div className="flex flex-col gap-3 min-w-[100px]">
                        <p className="text-sm text-[#4d4d4d]">Alcance / Visu</p>
                        <p className="text-lg font-medium text-black">{formatCompact(m.views)}</p>
                      </div>
                      <div className="flex flex-col gap-3 items-end">
                        <p className="text-sm text-[#4d4d4d]">Engajamento</p>
                        <p className="text-lg font-medium text-black">{engagementAvg}%</p>
                      </div>
                      <div className="flex flex-col gap-3">
                        <p className="text-sm text-[#4d4d4d]">Rede social</p>
                        <div className="flex gap-2">
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
                      <div className="flex flex-col gap-3 items-end">
                        <p className="text-sm text-[#4d4d4d]">Status</p>
                        <span className="bg-[#ceffc4] px-4 py-2 rounded-[32px] text-base text-black">
                          Concluído
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <button
                        type="button"
                        className="flex items-center gap-1 text-[#4d4d4d] text-base font-medium underline"
                      >
                        <Icon name="TrendingUp" color="#4d4d4d" size={24} />
                        % Performance
                      </button>
                      <button
                        type="button"
                        className="flex items-center gap-1 text-[#4d4d4d] text-base font-medium underline"
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

        {/* Card 3: Conteúdos publicados */}
        <div className="bg-white rounded-[12px] p-5 flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <h3 className="text-2xl font-semibold text-black">Conteúdos publicados</h3>
            <button
              type="button"
              className="text-base text-[#7c7c7c] underline hover:text-black"
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
                return (
                  <div
                    key={content.id}
                    className="bg-[#f2f2f2] rounded-[12px] p-3 flex flex-col gap-5 min-w-[260px] w-[270px] cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => handleContentClick(content)}
                  >
                    <div className="flex items-center gap-2">
                      <img
                        src={content.influencerAvatar}
                        alt={content.influencerName}
                        className="size-10 rounded-lg object-cover"
                      />
                      <p className="text-lg font-medium text-black truncate">{content.influencerName}</p>
                    </div>
                    <div className="h-[137px] rounded-lg overflow-hidden bg-[#e5e5e5]">
                      {content.previewUrl ? (
                        <img
                          src={content.previewUrl}
                          alt="Preview"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Icon name="Image" color="#A3A3A3" size={32} />
                        </div>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-y-5 justify-between">
                      <div className="flex flex-col gap-3 min-w-[100px]">
                        <p className="text-sm text-[#4d4d4d]">Fase</p>
                        <p className="text-lg font-medium text-black">{phaseOrder}</p>
                      </div>
                      <div className="flex flex-col gap-3 items-end min-w-[100px]">
                        <p className="text-sm text-[#4d4d4d]">Data da postagem</p>
                        <p className="text-lg font-medium text-black">
                          {(content.publishedAt ?? content.published_at)
                            ? new Date((content.publishedAt ?? content.published_at) as string).toLocaleDateString("pt-BR")
                            : "-"}
                        </p>
                      </div>
                      <div className="flex flex-col gap-3 min-w-[100px]">
                        <p className="text-sm text-[#4d4d4d]">Curtidas</p>
                        <p className="text-lg font-medium text-black">
                          {contentMetrics ? formatCompact(contentMetrics.likes) : "-"}
                        </p>
                      </div>
                      <div className="flex flex-col gap-3 items-end min-w-[100px]">
                        <p className="text-sm text-[#4d4d4d]">Alcance / Visu</p>
                        <p className="text-lg font-medium text-black">
                          {contentMetrics ? formatCompact(contentMetrics.views) : "-"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Icon
                        name={getSocialNetworkIcon(content.socialNetwork)}
                        color="#4d4d4d"
                        size={20}
                      />
                    </div>
                    <button
                      type="button"
                      className="text-[#4d4d4d] text-base font-medium underline text-left"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (content.postUrl) window.open(content.postUrl, "_blank");
                      }}
                    >
                      Visualizar postagem
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Publicações identificadas */}
        <div className="bg-white rounded-[12px] p-5 border border-[#e5e5e5]">
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
                  src={selectedContent.influencerAvatar}
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
                    src={selectedContent.previewUrl}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Icon name="Image" color="#A3A3A3" size={48} />
                  </div>
                )}
              </div>

              {getContentMetrics(selectedContent.id) ? (
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-neutral-50 rounded-2xl p-4">
                    <p className="text-sm text-neutral-600 mb-1">Visualizações</p>
                    <p className="text-2xl font-semibold text-neutral-950">
                      {getContentMetrics(selectedContent.id)!.views.toLocaleString(
                        "pt-BR"
                      )}
                    </p>
                  </div>
                  <div className="bg-neutral-50 rounded-2xl p-4">
                    <p className="text-sm text-neutral-600 mb-1">Curtidas</p>
                    <p className="text-2xl font-semibold text-neutral-950">
                      {getContentMetrics(selectedContent.id)!.likes.toLocaleString(
                        "pt-BR"
                      )}
                    </p>
                  </div>
                  <div className="bg-neutral-50 rounded-2xl p-4">
                    <p className="text-sm text-neutral-600 mb-1">Comentários</p>
                    <p className="text-2xl font-semibold text-neutral-950">
                      {getContentMetrics(selectedContent.id)!.comments.toLocaleString(
                        "pt-BR"
                      )}
                    </p>
                  </div>
                  <div className="bg-neutral-50 rounded-2xl p-4">
                    <p className="text-sm text-neutral-600 mb-1">Compartilhamentos</p>
                    <p className="text-2xl font-semibold text-neutral-950">
                      {getContentMetrics(selectedContent.id)!.shares.toLocaleString(
                        "pt-BR"
                      )}
                    </p>
                  </div>
                  <div className="bg-neutral-50 rounded-2xl p-4">
                    <p className="text-sm text-neutral-600 mb-1">Alcance</p>
                    <p className="text-2xl font-semibold text-neutral-950">
                      {getContentMetrics(selectedContent.id)!.reach.toLocaleString(
                        "pt-BR"
                      )}
                    </p>
                  </div>
                  <div className="bg-neutral-50 rounded-2xl p-4">
                    <p className="text-sm text-neutral-600 mb-1">Taxa de engajamento</p>
                    <p className="text-2xl font-semibold text-neutral-950">
                      {getContentMetrics(selectedContent.id)!.engagement.toFixed(1)}%
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

