import { useState, useEffect } from "react";
import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Select } from "@/components/ui/select";
import { SocialNetworkIcon } from "@/components/social-network-icon";
import { useInfluencerProfile } from "@/hooks/use-influencer-profile";
import { getUploadUrl } from "@/lib/utils/api";
import { AudienceByAgePanel } from "@/components/audience-by-age-panel";

export const Route = createFileRoute("/(private)/(app)/influencer/$influencerId")({
  component: InfluencerProfileScreen,
});

const METRIC_NETWORKS = ["Instagram", "Tiktok", "Youtube"] as const;

const NETWORK_CONFIG: Record<string, { icon: string; bg: string; iconColor: string; label: string }> = {
  instagram: { icon: "Instagram", bg: "bg-gradient-to-br from-pink-100 to-purple-100", iconColor: "#e1306c", label: "Instagram" },
  tiktok: { icon: "Music2", bg: "bg-neutral-800", iconColor: "#ffffff", label: "TikTok" },
  youtube: { icon: "Youtube", bg: "bg-red-100", iconColor: "#ff0000", label: "YouTube" },
};

const NETWORK_AVATAR_BG: Record<string, string> = {
  instagram: "bg-gradient-to-br from-amber-400 via-rose-500 to-purple-600",
  tiktok: "bg-black",
  youtube: "bg-red-600",
};

function networkTypeToMetricsTab(type: string): (typeof METRIC_NETWORKS)[number] | null {
  switch (type.toLowerCase()) {
    case "instagram": return "Instagram";
    case "tiktok": return "Tiktok";
    case "youtube": return "Youtube";
    default: return null;
  }
}

function formatCompact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, "")}k`;
  return n.toLocaleString("pt-BR");
}

function socialNetworkUrl(type: string, username: string): string | null {
  const u = username.replace(/^@/, "");
  switch (type.toLowerCase()) {
    case "instagram": return `https://www.instagram.com/${u}`;
    case "tiktok": return `https://www.tiktok.com/@${u}`;
    case "youtube": return `https://www.youtube.com/@${u}`;
    default: return null;
  }
}

function detectNetworkFromUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (/youtube\.com|youtu\.be/i.test(url)) return "youtube";
  if (/instagram\.com/i.test(url)) return "instagram";
  if (/tiktok\.com/i.test(url)) return "tiktok";
  return null;
}

const NETWORK_BADGE_STYLE: Record<string, string> = {
  youtube: "bg-red-600",
  instagram: "bg-gradient-to-br from-amber-400 via-rose-500 to-purple-600",
  tiktok: "bg-black",
};

function formatCampaignDate(dateStr: string | null | undefined): string {
  if (!dateStr || !dateStr.trim()) return "—";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function hasGenderSplitData(
  genderSplit: { women_percent?: number; men_percent?: number } | undefined
): boolean {
  if (!genderSplit) return false;
  const w = genderSplit.women_percent;
  const m = genderSplit.men_percent;
  if (w == null && m == null) return false;
  const wNum = w != null && Number.isFinite(w) ? w : 0;
  const mNum = m != null && Number.isFinite(m) ? m : 0;
  return wNum > 0 || mNum > 0;
}

function metricCardClassName(inGrid: boolean): string {
  return [
    "bg-neutral-100 rounded-lg pt-3 pb-5 px-4 flex flex-col justify-between h-[141px]",
    inGrid ? "min-w-0 w-full" : "min-w-[200px] flex-1",
  ].join(" ");
}

interface GranularGroup {
  label: string;
  items: Array<{ label: string; value: string | number | undefined | null }>;
}

function GranularMetricSection({ groups }: { groups: GranularGroup[] }) {
  const hasData = groups.some((g) => g.items.some((i) => i.value != null && i.value !== "—"));
  if (!hasData) return null;

  return (
    <div className="flex flex-col gap-4">
      {groups.map((group) => (
        <div key={group.label} className="flex flex-col gap-3">
          <p className="text-sm font-semibold text-neutral-500 uppercase tracking-wide">{group.label}</p>
          <div className="flex flex-wrap gap-3">
            {group.items.map((item) => (
              <div
                key={item.label}
                className="bg-neutral-100 rounded-lg px-4 py-3 flex flex-col gap-1 min-w-[140px] flex-1"
              >
                <p className="text-xs text-neutral-500 leading-snug">{item.label}</p>
                <p className="text-xl font-bold text-neutral-950">
                  {item.value != null ? item.value : "—"}
                </p>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function fmt(n: number | undefined | null): string {
  if (n == null) return "—";
  return formatCompact(n);
}

function fmtAvg(n: number | undefined | null): string {
  if (n == null) return "—";
  if (n >= 1_000) return formatCompact(n);
  return n.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
}

function InfluencerProfileScreen() {
  const navigate = useNavigate();
  const { influencerId } = useParams({
    from: "/(private)/(app)/influencer/$influencerId",
  });
  const [metricsPosts, setMetricsPosts] = useState(10);
  const { data, isLoading, isError, error } = useInfluencerProfile(influencerId ?? "", metricsPosts);
  const [metricsTab, setMetricsTab] = useState<(typeof METRIC_NETWORKS)[number]>("Instagram");

  const availableNetworks = METRIC_NETWORKS.filter(
    (n) => data?.metrics_by_network?.[n.toLowerCase()] != null
  );

  useEffect(() => {
    if (availableNetworks.length > 0 && !availableNetworks.includes(metricsTab)) {
      setMetricsTab(availableNetworks[0]);
    }
  }, [availableNetworks.join(","), metricsTab]);

  const campaign = data?.campaign;
  const influencer = data?.influencer;

  const nicheName = influencer?.niche_name ?? null;
  const subNicheNames = influencer?.sub_niche_names ?? [];

  const ratingLabel =
    influencer?.rating != null && influencer?.rating_max != null
      ? `${influencer.rating} / ${influencer.rating_max}`
      : "—";

  const isExternal = influencer?.is_external === true;
  const preRegisteredProfiles = influencer?.pre_registered_social_profiles ?? [];

  const totalPosts = data?.total_posts_in_hypeapp ?? 0;
  const campaignsParticipated = data?.campaigns_participated_in_hypeapp ?? 0;
  const trustIndex = data?.trust_index;
  const topContents = data?.top_contents ?? [];
  const hypeappCampaigns = data?.hypeapp_campaigns ?? [];

  const networkKey = metricsTab.toLowerCase();
  const metrics = data?.metrics_by_network?.[networkKey];
  const showGenderSplit = hasGenderSplitData(metrics?.gender_split);

  const granularGroups: GranularGroup[] = (() => {
    if (!metrics) return [];
    if (metricsTab === "Instagram") {
      return [
        {
          label: "Posts",
          items: [
            { label: "Curtidas totais", value: fmt(metrics.posts_likes_sum) },
            { label: "Curtidas médias", value: fmtAvg(metrics.posts_likes_avg) },
            { label: "Views totais", value: fmt(metrics.posts_views_sum) },
            { label: "Views médias", value: fmtAvg(metrics.posts_views_avg) },
            { label: "Posts analisados", value: metrics.posts_fetched ?? "—" },
          ],
        },
        {
          label: "Reels",
          items: [
            { label: "Curtidas totais", value: fmt(metrics.reels_likes_sum) },
            { label: "Curtidas médias", value: fmtAvg(metrics.reels_likes_avg) },
            { label: "Views totais", value: fmt(metrics.reels_views_sum) },
            { label: "Views médias", value: fmtAvg(metrics.reels_views_avg) },
            { label: "Alcance total", value: fmt(metrics.reels_reach_sum) },
            { label: "Alcance médio", value: fmtAvg(metrics.reels_reach_avg) },
          ],
        },
      ];
    }
    if (metricsTab === "Tiktok") {
      return [
        {
          label: "Vídeos",
          items: [
            { label: "Curtidas totais", value: fmt(metrics.tiktok_likes_sum) },
            { label: "Curtidas médias", value: fmtAvg(metrics.tiktok_likes_avg) },
            { label: "Views totais", value: fmt(metrics.tiktok_views_sum) },
            { label: "Views médias", value: fmtAvg(metrics.tiktok_views_avg) },
            { label: "Vídeos analisados", value: metrics.tiktok_fetched ?? "—" },
          ],
        },
      ];
    }
    if (metricsTab === "Youtube") {
      return [
        {
          label: "Shorts (≤ 60s)",
          items: [
            { label: "Curtidas totais", value: fmt(metrics.yt_shorts_likes_sum) },
            { label: "Curtidas médias", value: fmtAvg(metrics.yt_shorts_likes_avg) },
            { label: "Views totais", value: fmt(metrics.yt_shorts_views_sum) },
            { label: "Views médias", value: fmtAvg(metrics.yt_shorts_views_avg) },
            { label: "Shorts analisados", value: metrics.yt_shorts_fetched ?? "—" },
          ],
        },
        {
          label: "Vídeos (> 60s)",
          items: [
            { label: "Curtidas totais", value: fmt(metrics.yt_videos_likes_sum) },
            { label: "Curtidas médias", value: fmtAvg(metrics.yt_videos_likes_avg) },
            { label: "Views totais", value: fmt(metrics.yt_videos_views_sum) },
            { label: "Views médias", value: fmtAvg(metrics.yt_videos_views_avg) },
            { label: "Vídeos analisados", value: metrics.yt_videos_fetched ?? "—" },
          ],
        },
      ];
    }
    return [];
  })();

  const networkMetricCards = [
    {
      key: "seguidores",
      label: "Seguidores",
      value: metrics?.followers != null ? formatCompact(metrics.followers) : "—",
      icon: "Heart" as const,
      iconBg: "bg-red-100",
    },
    {
      key: "curtidas",
      label: "Curtidas",
      value: metrics?.likes != null ? formatCompact(metrics.likes) : "—",
      icon: "ThumbsUp" as const,
      iconBg: "bg-green-100",
    },
    {
      key: "alcance",
      label: "Alcance Médio",
      value: metrics?.average_reach != null ? formatCompact(metrics.average_reach) : "—",
      icon: "Eye" as const,
      iconBg: "bg-sky-100",
    },
    {
      key: "engajamento",
      label: "Engajamento",
      value: metrics?.engagement_percent != null ? `${metrics.engagement_percent}%` : "—",
      icon: "TrendingUp" as const,
      iconBg: "bg-fuchsia-100",
    },
  ];

  const hypeappMetricCards = [
    {
      key: "total-posts",
      label: "Publicações totais dentro do Hype app",
      value: String(totalPosts),
      icon: "LayoutGrid" as const,
      iconBg: "bg-amber-100",
    },
    {
      key: "campaigns-participated",
      label: "Campanhas participadas no Hype app",
      value: String(campaignsParticipated),
      icon: "Megaphone" as const,
      iconBg: "bg-violet-100",
    },
  ];

  const locationLabel =
    influencer?.location && typeof influencer.location === "object"
      ? [influencer.location.state, influencer.location.city]
        .filter(Boolean)
        .join(", ") || "—"
      : "—";

  const handleBackToCampaigns = () => {
    navigate({ to: "/campaigns" });
  };

  if (isLoading) {
    return (
      <div className="flex flex-col gap-11 max-w-[1151px] mx-auto pb-8 pt-6 px-6">
        <div className="skeleton h-5 w-64" />
        <div className="skeleton h-10 w-full max-w-md" />
        <div className="skeleton h-40 w-full rounded-xl" />
      </div>
    );
  }

  if (isError || !influencer) {
    const is404 = (error as { status?: number })?.status === 404;
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4">
        <p className="text-neutral-600">
          {is404 ? "Influenciador não encontrado." : "Erro ao carregar perfil."}
        </p>
        <Button variant="outline" onClick={handleBackToCampaigns}>
          Voltar às campanhas
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-11 max-w-[1151px] mx-auto px-6">
      <div className="flex flex-col gap-6 w-full">
        <div className="flex items-center gap-1 text-sm text-neutral-500 flex-wrap">
          <button
            type="button"
            onClick={handleBackToCampaigns}
            className="hover:text-neutral-700"
          >
            Campanhas
          </button>
          <Icon name="ChevronRight" size={16} color="#7c7c7c" />
          {campaign?.id ? (
            <>
              <button
                type="button"
                onClick={() =>
                  navigate({
                    to: "/campaigns/$campaignId",
                    params: { campaignId: campaign.id },
                  })
                }
                className="hover:text-neutral-700"
              >
                {campaign.title ?? "Detalhes da campanha"}
              </button>
              <Icon name="ChevronRight" size={16} color="#7c7c7c" />
            </>
          ) : null}
          <span className="text-neutral-950">Sobre o influenciador</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-2xl font-semibold text-neutral-950">
            Detalhes sobre o influenciador
          </h1>
          <Button
            variant="outline"
            className="h-11 rounded-full font-semibold border-neutral-200 min-w-max"
            onClick={() => { }}
          >
            Salvar influenciador
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-xl px-4 py-5 flex flex-wrap items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="relative shrink-0">
            {influencer.avatar ? (
              <img
                src={getUploadUrl(influencer.avatar) ?? undefined}
                alt={influencer.name ?? "Avatar do influenciador"}
                className="size-[130px] rounded-full object-cover bg-neutral-200"
              />
            ) : (
              <div className="size-[130px] rounded-full bg-neutral-200 flex items-center justify-center">
                <span className="text-neutral-950 text-2xl font-medium">
                  {influencer.name?.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            <div className="absolute -bottom-1 -right-1 size-8 rounded-full bg-primary-600 flex items-center justify-center">
              <Icon name="Check" size={16} color="#fff" />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-xl font-semibold text-neutral-950">{influencer.name}</p>
              {isExternal && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 text-xs font-semibold">
                  <Icon name="UserX" size={12} color="currentColor" />
                  Externo
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-16">
          <div className="flex flex-col items-end gap-1">
            <div className="flex items-center gap-2 text-neutral-500">
              <Icon name="MapPin" size={20} color="#737373" />
              <span className="text-base font-medium">Local</span>
            </div>
            <p className="text-lg font-semibold text-neutral-950">{locationLabel}</p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <div className="flex items-center gap-2 text-neutral-500">
              <img src="/logo-hypeapp.png" alt="Hypeapp" width={24} height={24} />
              <span className="text-base font-medium">Hypeapp</span>
            </div>
            <div className="flex items-center gap-2">
              <Icon name="Star" size={20} color="#525252" />
              <p className="text-lg font-semibold text-neutral-950">{ratingLabel}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-2 border-b border-neutral-200">
          <div className="p-5 border-r border-neutral-200 flex flex-col gap-3">
            <p className="text-sm text-neutral-500">Nicho</p>
            <div className="flex flex-wrap gap-2">
              {nicheName ? (
                <span className="inline-flex items-center px-4 py-2 rounded-full border border-neutral-200 text-base font-medium text-neutral-950">
                  {nicheName}
                </span>
              ) : (
                <span className="text-neutral-400 text-sm">—</span>
              )}
            </div>
          </div>
          <div className="p-5 flex flex-col gap-3">
            <p className="text-sm text-neutral-500">Sub-Nicho</p>
            <div className="flex flex-wrap gap-2">
              {subNicheNames.length > 0 ? (
                subNicheNames.map((name: string) => (
                  <span
                    key={name}
                    className="inline-flex items-center px-4 py-3 rounded-full border border-neutral-200 text-base font-medium text-neutral-950"
                  >
                    {name}
                  </span>
                ))
              ) : (
                <span className="text-neutral-400 text-sm">—</span>
              )}
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-4 px-5 py-4">
          <p className="text-xl font-semibold text-neutral-950">Sobre o influenciador</p>
          <p className="text-base text-neutral-500 whitespace-pre-wrap leading-6">
            {influencer.bio ?? "Nenhuma descrição informada."}
          </p>
        </div>
      </div>

      {(() => {
        const TAB_ORDER = ["instagram", "tiktok", "youtube"] as const;

        const socialTypes = new Set<string>();
        if (!isExternal) {
          (influencer.social_networks ?? []).forEach((sn) => {
            if (sn.type) socialTypes.add(sn.type.toLowerCase());
          });
        } else {
          preRegisteredProfiles.forEach((p) => {
            if (p.network) socialTypes.add(p.network.toLowerCase());
          });
        }
        availableNetworks.forEach((n) => socialTypes.add(n.toLowerCase()));

        const tabs = TAB_ORDER.filter((t) => socialTypes.has(t));
        if (tabs.length === 0) return null;

        const activeTab = tabs.includes(metricsTab.toLowerCase() as typeof TAB_ORDER[number])
          ? (metricsTab.toLowerCase() as typeof TAB_ORDER[number])
          : tabs[0];

        const activeSN = !isExternal
          ? (influencer.social_networks ?? []).find((sn) => sn.type?.toLowerCase() === activeTab)
          : null;
        const activeExtProfile = isExternal
          ? preRegisteredProfiles.find((p) => (p.network ?? "").toLowerCase() === activeTab)
          : null;

        const username = activeSN?.username?.replace(/^@/, "") ?? null;
        const profileUrl = username
          ? socialNetworkUrl(activeTab, username)
          : (activeExtProfile?.profile_url ?? null);

        const activeMetricsKey = networkTypeToMetricsTab(activeTab);
        const tabMetrics = activeMetricsKey
          ? data?.metrics_by_network?.[activeMetricsKey.toLowerCase()]
          : null;

        const followers = tabMetrics?.followers != null ? formatCompact(tabMetrics.followers) : "—";
        const engagement = tabMetrics?.engagement_percent != null
          ? `${tabMetrics.engagement_percent}%`
          : "—";
        const followersLabel = activeTab === "youtube" ? "Inscritos" : "Seguidores";

        const BUTTON_LABEL: Record<string, string> = {
          instagram: "Ver no Instagram",
          tiktok: "Ver no TikTok",
          youtube: "Ver no YouTube",
        };

        return (
          <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
            {/* Tabs */}
            <div className="flex border-b border-neutral-200">
              {tabs.map((tab) => {
                const cfg = NETWORK_CONFIG[tab];
                const isActive = tab === activeTab;
                const tabMTab = networkTypeToMetricsTab(tab);
                return (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => { if (tabMTab) setMetricsTab(tabMTab); }}
                    className={[
                      "flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-600",
                      isActive
                        ? "text-primary-600 border-primary-600"
                        : "text-neutral-500 border-transparent hover:text-neutral-700",
                    ].join(" ")}
                  >
                    {tab === "tiktok" ? (
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                        <path d="M19.6 6.7c-1.3-.3-2.4-1.1-3-2.2-.3-.5-.5-1-.5-1.6V2.5h-3.3v13.3c0 1.6-1.3 2.9-2.9 2.9s-2.9-1.3-2.9-2.9 1.3-2.9 2.9-2.9c.3 0 .6 0 .9.1v-3.4c-.3 0-.6-.1-.9-.1-3.5 0-6.3 2.8-6.3 6.3s2.8 6.3 6.3 6.3 6.3-2.8 6.3-6.3V9.3c1.3.9 2.9 1.4 4.5 1.4V7.4c-.4 0-.7 0-1.1-.1-.4-.1-.7-.2-1-.6z" />
                      </svg>
                    ) : (
                      <Icon name={cfg.icon as Parameters<typeof Icon>[0]["name"]} size={15} color="currentColor" />
                    )}
                    {cfg.label}
                  </button>
                );
              })}
            </div>

            {/* Content */}
            <div className="flex flex-wrap items-start gap-5 p-5">
              {/* Network-branded avatar */}
              <div
                className={`size-[96px] rounded-full shrink-0 overflow-hidden flex items-center justify-center ${NETWORK_AVATAR_BG[activeTab] ?? "bg-neutral-800"}`}
              >
                {activeSN?.photo ? (
                  <img
                    src={activeSN.photo}
                    alt=""
                    className="size-full object-cover"
                  />
                ) : (
                  <span className="text-white text-2xl font-medium">
                    {influencer.name?.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>

              {/* Info */}
              <div className="flex flex-col flex-1 min-w-0">
                <p className="text-base font-semibold text-neutral-950">{influencer.name}</p>
                {username && (
                  <p className="text-sm text-neutral-500 mb-2">@{username}</p>
                )}
                <div className="flex gap-6 mt-1">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-lg font-semibold text-neutral-950 leading-tight">{followers}</span>
                    <span className="text-[11px] font-medium text-neutral-500 uppercase tracking-wide">{followersLabel}</span>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-lg font-semibold text-neutral-950 leading-tight">{engagement}</span>
                    <span className="text-[11px] font-medium text-neutral-500 uppercase tracking-wide">Engajamento</span>
                  </div>
                </div>
                {activeSN?.bio && (
                  <p className="text-sm text-neutral-600 leading-relaxed line-clamp-3 mt-1 max-w-lg whitespace-pre-line">
                    {activeSN.bio}
                  </p>
                )}
              </div>

              {/* Action */}
              {profileUrl && (
                <div className="shrink-0 flex flex-col items-end gap-2 self-start">
                  <a
                    href={profileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-primary-600 text-white text-sm font-semibold hover:bg-primary-700 transition-colors whitespace-nowrap"
                  >
                    {BUTTON_LABEL[activeTab] ?? "Ver perfil"}
                    <Icon name="ArrowUpRight" size={14} color="currentColor" />
                  </a>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {!isExternal && (
        <div className="bg-white rounded-xl p-5 border border-neutral-200 flex flex-col gap-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h2 className="text-2xl font-semibold text-neutral-950">Métricas</h2>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="text-sm text-neutral-500 whitespace-nowrap">Posts analisados</span>
                <Select
                  value={String(metricsPosts)}
                  onChange={(v) => setMetricsPosts(Number(v))}
                  options={[5, 10, 20, 30, 50].map((n) => ({ value: String(n), label: String(n) }))}
                  className="!w-24"
                />
              </div>
            </div>
          </div>
          {showGenderSplit ? (
            <>
              <div className="flex flex-wrap gap-4">
                <div className="bg-neutral-100 rounded-lg p-4 flex flex-col gap-6 min-w-[256px] w-full max-w-[320px]">
                  <div className="flex items-center gap-2">
                    <div className="size-9 rounded-lg bg-neutral-200 flex items-center justify-center">
                      <Icon name="ChartPie" size={20} color="#525252" />
                    </div>
                    <span className="text-base font-medium text-neutral-950">Divisão por gênero</span>
                  </div>
                  <div className="flex justify-center">
                    <div className="size-[143px] rounded-full border-8 border-neutral-300 border-t-neutral-600" style={{ transform: "rotate(-45deg)" }} />
                  </div>
                  <div className="flex flex-wrap gap-6 justify-center">
                    <div className="flex items-center gap-2">
                      <div className="size-6 rounded bg-neutral-600" />
                      <span className="text-base font-medium text-neutral-950">
                        Mulheres (
                        {metrics?.gender_split?.women_percent != null
                          ? `${metrics.gender_split.women_percent}%`
                          : "—"}
                        )
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="size-6 rounded bg-neutral-400" />
                      <span className="text-base font-medium text-neutral-950">
                        Homens (
                        {metrics?.gender_split?.men_percent != null
                          ? `${metrics.gender_split.men_percent}%`
                          : "—"}
                        )
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-4 flex-1 min-w-0">
                  {networkMetricCards.map((item) => (
                    <div key={item.key} className={metricCardClassName(false)}>
                      <div className="flex items-center gap-2 min-w-0">
                        <div className={`size-9 rounded-lg shrink-0 flex items-center justify-center ${item.iconBg}`}>
                          <Icon name={item.icon} size={20} color="#525252" />
                        </div>
                        <span className="text-base font-medium text-neutral-950">{item.label}</span>
                      </div>
                      <p className="text-2xl font-bold text-neutral-950">{item.value}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex flex-wrap gap-4">
                {hypeappMetricCards.map((item) => (
                  <div key={item.key} className={metricCardClassName(false)}>
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={`size-9 rounded-lg shrink-0 flex items-center justify-center ${item.iconBg}`}>
                        <Icon name={item.icon} size={20} color="#525252" />
                      </div>
                      <span className="text-base font-medium text-neutral-950">{item.label}</span>
                    </div>
                    <p className="text-2xl font-bold text-neutral-950">{item.value}</p>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 w-full">
              {[...networkMetricCards, ...hypeappMetricCards].map((item) => (
                <div key={item.key} className={metricCardClassName(true)}>
                  <div className="flex items-center gap-2 min-w-0">
                    <div className={`size-9 rounded-lg shrink-0 flex items-center justify-center ${item.iconBg}`}>
                      <Icon name={item.icon} size={20} color="#525252" />
                    </div>
                    <span className="text-base font-medium text-neutral-950 leading-snug">{item.label}</span>
                  </div>
                  <p className="text-2xl font-bold text-neutral-950">{item.value}</p>
                </div>
              ))}
            </div>
          )}
          {granularGroups.length > 0 && (
            <>
              <div className="border-t border-neutral-200" />
              <GranularMetricSection groups={granularGroups} />
            </>
          )}
        </div>
      )}

      {!isExternal && (() => {
        const audienceNetworks = data?.audience_by_age?.networks ?? (() => {
          const built: Record<string, { has_data: boolean; age_buckets: { label: string; percent: number }[] }> = {};
          for (const net of ["instagram", "tiktok", "youtube"] as const) {
            const split = data?.metrics_by_network?.[net]?.age_split;
            if (split?.length) built[net] = { has_data: true, age_buckets: split };
          }
          return Object.keys(built).length ? built : undefined;
        })();
        return <AudienceByAgePanel networks={audienceNetworks} />;
      })()}

      {!isExternal && (
        <div className="bg-[url('/banner-influencer.png')] bg-cover bg-center rounded-xl px-6 py-8 flex flex-col gap-6">
          <div className="flex items-center gap-2">
            <div className="size-8 flex items-center justify-center text-primary-200">
              <Icon name="ShieldCheck" size={32} color="currentColor" />
            </div>
            <span className="text-2xl font-semibold text-primary-200">Selo de Segurança Hypeapp</span>
          </div>
          <div className="flex flex-col gap-2">
            <p className="text-lg font-medium text-white">Índice de Confiança:</p>
            <p className="text-white">
              {trustIndex != null ? (
                <>
                  <span className="text-4xl font-bold text-primary-200">{trustIndex}%</span>
                  <span className="text-xl font-medium ml-1">de audiência real</span>
                </>
              ) : (
                <span className="text-xl font-medium text-white/80">Em análise</span>
              )}
            </p>
          </div>
          <p className="text-base font-medium text-white/90">
            (Análise de bots e contas inativas baseada em amostragem)
          </p>
        </div>
      )}

      <div className="bg-white rounded-xl p-5 border border-neutral-200 flex flex-col gap-6">
        <h2 className="text-2xl font-semibold text-neutral-950">Top 4 conteúdos</h2>
        {topContents.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {topContents.slice(0, 4).map((content) => {
              const network = detectNetworkFromUrl(content.post_url);
              const isVideo = content.is_video === true;
              const thumbnail = content.image_url
                ? (content.image_url.startsWith("http") ? content.image_url : (getUploadUrl(content.image_url) ?? content.image_url))
                : null;

              return (
                <div
                  key={content.id}
                  className="bg-neutral-100 rounded-xl overflow-hidden flex flex-col min-w-0"
                >
                  {/* Thumbnail / preview */}
                  <a
                    href={content.post_url ?? undefined}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="relative block h-[222px] bg-neutral-300 shrink-0 group"
                    aria-label="Abrir postagem"
                    tabIndex={content.post_url ? 0 : -1}
                    onClick={(e) => !content.post_url && e.preventDefault()}
                  >
                    {thumbnail && (
                      <img
                        src={thumbnail}
                        alt=""
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                    )}

                    {/* Gradiente inferior */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />

                    {/* Badge de rede social — canto superior esquerdo */}
                    {network && (
                      <div className={`absolute top-2.5 left-2.5 size-7 rounded-lg flex items-center justify-center ${NETWORK_BADGE_STYLE[network] ?? "bg-neutral-700"}`}>
                        <SocialNetworkIcon networkType={network} size={16} color="#ffffff" />
                      </div>
                    )}

                    {/* Indicador de vídeo — canto superior direito */}
                    {isVideo && (
                      <div className="absolute top-2.5 right-2.5 size-7 rounded-lg bg-black/60 flex items-center justify-center">
                        <Icon name="Play" size={14} color="#ffffff" />
                      </div>
                    )}

                    {/* Play central ao hover (vídeos) */}
                    {isVideo && (
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="size-14 rounded-full bg-black/60 flex items-center justify-center">
                          <Icon name="Play" size={28} color="#ffffff" />
                        </div>
                      </div>
                    )}

                    {/* Stats — bottom */}
                    <div className="absolute bottom-3 left-3 right-3 flex justify-between text-white">
                      <div>
                        <p className="text-sm font-normal">Visualizações</p>
                        <p className="text-lg font-medium">
                          {content.views != null ? formatCompact(content.views) : "—"}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-normal">Curtidas</p>
                        <p className="text-lg font-medium">
                          {content.likes != null ? formatCompact(content.likes) : "—"}
                        </p>
                      </div>
                    </div>
                  </a>

                  {/* Footer */}
                  <div className="p-4">
                    {content.post_url ? (
                      <a
                        href={content.post_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-base font-medium text-primary-600 underline hover:no-underline"
                      >
                        {isVideo ? "Assistir vídeo" : "Visualizar postagem"}
                      </a>
                    ) : (
                      <span className="text-base font-medium text-neutral-500">
                        {isVideo ? "Assistir vídeo" : "Visualizar postagem"}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-neutral-500 py-6">Nenhum conteúdo no momento.</p>
        )}
      </div>

      <div className="bg-white rounded-xl p-5 border border-neutral-200 flex flex-col gap-6">
        <h2 className="text-2xl font-semibold text-neutral-950">Campanhas no Hypeapp</h2>
        {hypeappCampaigns.length > 0 ? (
          <div className="flex gap-4 overflow-x-auto pb-2">
            {hypeappCampaigns.map((c) => (
              <div
                key={c.id}
                className="bg-neutral-100 rounded-xl p-4 flex flex-col gap-4 min-w-[300px] shrink-0"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    {c.logo_url ? (
                      <img
                        src={c.logo_url.startsWith("http") ? c.logo_url : getUploadUrl(c.logo_url) ?? c.logo_url}
                        alt=""
                        className="size-14 rounded-2xl object-cover shrink-0 bg-neutral-200"
                      />
                    ) : (
                      <div className="size-14 rounded-2xl bg-neutral-300 shrink-0" />
                    )}
                    <div className="min-w-0">
                      <p className="text-lg font-medium text-neutral-950 truncate">
                        {c.campaign_name ?? "—"}
                      </p>
                      <p className="text-sm text-neutral-500 truncate">
                        {c.brand_name ?? "—"}
                      </p>
                    </div>
                  </div>
                  <p className="text-sm text-neutral-500 shrink-0">{formatCampaignDate(c.date)}</p>
                </div>
                {c.rating != null && (
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Icon
                        key={s}
                        name="Star"
                        size={20}
                        color={s <= Math.round(c.rating!) ? "#eab308" : "#d4d4d4"}
                      />
                    ))}
                  </div>
                )}
                {c.description ? (
                  <p className="text-sm text-neutral-600 line-clamp-2">{c.description}</p>
                ) : null}
                {(c.delivery_thumbnails?.length ?? 0) > 0 && (
                  <>
                    <p className="text-sm font-medium text-neutral-700">Entregas</p>
                    <div className="flex gap-2 flex-wrap">
                      {c.delivery_thumbnails!.slice(0, 5).map((thumb, i) => (
                        <img
                          key={i}
                          src={thumb.startsWith("http") ? thumb : getUploadUrl(thumb) ?? thumb}
                          alt=""
                          className="size-12 rounded-lg object-cover bg-neutral-200"
                        />
                      ))}
                    </div>
                  </>
                )}
                <div className="flex items-center gap-2 text-sm text-neutral-600">
                  <Icon name="Eye" size={16} color="#737373" />
                  <span>{c.views != null ? formatCompact(c.views) : "0"}</span>
                  <Icon name="Heart" size={16} color="#737373" />
                  <span>{c.likes != null ? formatCompact(c.likes) : "0"}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-neutral-500 py-6">Nenhuma campanha no momento.</p>
        )}
      </div>

      <div className="bg-white border-t border-neutral-200 px-4 py-4 flex items-center justify-center rounded-full gap-4 z-10">
        <Button variant="outline" className="rounded-full font-semibold min-w-max" onClick={() => { }}>
          Copiar link do perfil
        </Button>
        <Button variant="outline" className="rounded-full font-semibold min-w-max" onClick={() => { }}>
          Convidar para pré-seleção
        </Button>
        <Button className="rounded-full font-semibold bg-primary-600 hover:bg-primary-700 text-white border-0 min-w-max">
          Enviar convite
        </Button>
      </div>
    </div>
  );
}
