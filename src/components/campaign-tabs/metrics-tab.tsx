import { useState } from "react";
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

interface MetricsTabProps {
  contents: CampaignContent[];
  metrics: { [contentId: string]: ContentMetrics };
  campaignPhases?: CampaignPhase[];
}

export function MetricsTab({
  contents,
  metrics,
  campaignPhases = [],
}: MetricsTabProps) {
  const [selectedContent, setSelectedContent] = useState<CampaignContent | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPhaseFilter, setSelectedPhaseFilter] = useState<string>("all");

  // Mock de publicações identificadas
  const identifiedPosts: IdentifiedPost[] = [
    {
      id: "id1",
      influencerId: "3",
      influencerName: "Ana Costa",
      influencerAvatar: "https://i.pravatar.cc/150?img=3",
      socialNetwork: "instagram",
      contentType: "reels",
      postUrl: "https://instagram.com/p/identified1",
      previewUrl: "https://images.unsplash.com/photo-1611162617474-b723cf961d3e?w=400",
      phaseId: "1",
      phaseHashtag: "#CampanhaBrandFase1",
      publishedAt: "2025-01-15T18:00:00Z",
      metrics: {
        contentId: "id1",
        views: 52000,
        likes: 3800,
        comments: 165,
        shares: 95,
        engagement: 7.8,
        reach: 45000,
      },
    },
    {
      id: "id2",
      influencerId: "4",
      influencerName: "Pedro Lima",
      influencerAvatar: "https://i.pravatar.cc/150?img=4",
      socialNetwork: "instagram",
      contentType: "post",
      postUrl: "https://instagram.com/p/identified2",
      previewUrl: "https://images.unsplash.com/photo-1611162616305-c69b3c7b8d74?w=400",
      phaseId: "2",
      phaseHashtag: "#CampanhaBrandFase2",
      publishedAt: "2025-01-22T20:00:00Z",
      metrics: {
        contentId: "id2",
        views: 38000,
        likes: 2900,
        comments: 120,
        shares: 65,
        engagement: 8.1,
        reach: 35000,
      },
    },
  ];

  const phaseOptions = [
    { value: "all", label: "Todas as fases" },
    ...campaignPhases.map((phase, index) => ({
      value: phase.id,
      label: `Fase ${index + 1}`,
    })),
  ];

  const filteredIdentifiedPosts =
    selectedPhaseFilter === "all"
      ? identifiedPosts
      : identifiedPosts.filter((post) => post.phaseId === selectedPhaseFilter);

  const publishedContents = contents.filter((content) => content.status === "published");

  const getContentMetrics = (contentId: string): ContentMetrics | null => {
    return metrics[contentId] || null;
  };

  const getInfluencerContents = (influencerId: string) => {
    return publishedContents.filter((content) => content.influencerId === influencerId);
  };

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
        }
        return acc;
      },
      { views: 0, likes: 0, comments: 0, shares: 0, reach: 0 }
    );
  };

  const uniqueInfluencers = Array.from(
    new Map(
      publishedContents.map((content) => [content.influencerId, content])
    ).values()
  );

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
    return icons[network] || "Share2";
  };

  return (
    <>
      <div className="flex flex-col gap-6">
        {/* Publicações identificadas */}
        <div className="bg-white rounded-3xl p-6 border border-neutral-200">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <h3 className="text-lg font-semibold text-neutral-950">
                  Publicações identificadas
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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

        {/* Métricas agrupadas por influenciador */}
        <div className="bg-white rounded-3xl p-6 border border-neutral-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-neutral-950">
              Métricas por influenciador
            </h3>
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
          <div className="flex flex-col gap-4">
            {uniqueInfluencers.map((influencerContent) => {
              const influencerMetrics = getInfluencerTotalMetrics(
                influencerContent.influencerId
              );
              const influencerContents = getInfluencerContents(
                influencerContent.influencerId
              );

              return (
                <div
                  key={influencerContent.influencerId}
                  className="bg-neutral-50 rounded-2xl p-4 border border-neutral-200"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <Avatar
                      src={influencerContent.influencerAvatar}
                      alt={influencerContent.influencerName}
                      size="lg"
                    />
                    <div className="flex-1">
                      <p className="text-base font-semibold text-neutral-950">
                        {influencerContent.influencerName}
                      </p>
                      <p className="text-sm text-neutral-600">
                        {influencerContents.length} conteúdo(s) publicado(s)
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div>
                      <p className="text-xs text-neutral-600 mb-1">Visualizações</p>
                      <p className="text-lg font-semibold text-neutral-950">
                        {influencerMetrics.views.toLocaleString("pt-BR")}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-neutral-600 mb-1">Curtidas</p>
                      <p className="text-lg font-semibold text-neutral-950">
                        {influencerMetrics.likes.toLocaleString("pt-BR")}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-neutral-600 mb-1">Comentários</p>
                      <p className="text-lg font-semibold text-neutral-950">
                        {influencerMetrics.comments.toLocaleString("pt-BR")}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-neutral-600 mb-1">Compartilhamentos</p>
                      <p className="text-lg font-semibold text-neutral-950">
                        {influencerMetrics.shares.toLocaleString("pt-BR")}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-neutral-600 mb-1">Alcance</p>
                      <p className="text-lg font-semibold text-neutral-950">
                        {influencerMetrics.reach.toLocaleString("pt-BR")}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Lista de conteúdos publicados */}
        <div className="bg-white rounded-3xl p-6 border border-neutral-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-neutral-950">
              Conteúdos publicados
            </h3>
            <Badge
              text={`${publishedContents.length} conteúdos`}
              backgroundColor="bg-success-50"
              textColor="text-success-900"
            />
          </div>

          {publishedContents.length === 0 ? (
            <div className="text-center py-12">
              <Icon name="TrendingUp" color="#A3A3A3" size={48} />
              <p className="text-neutral-600 mt-4">
                Nenhum conteúdo publicado ainda
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {publishedContents.map((content) => {
                const contentMetrics = getContentMetrics(content.id);

                return (
                  <div
                    key={content.id}
                    className="bg-neutral-50 rounded-2xl p-4 border border-neutral-200 cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => handleContentClick(content)}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <Avatar
                        src={content.influencerAvatar}
                        alt={content.influencerName}
                        size="md"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-neutral-950 truncate">
                          {content.influencerName}
                        </p>
                        <p className="text-xs text-neutral-600">
                          {content.publishedAt
                            ? new Date(content.publishedAt).toLocaleDateString("pt-BR")
                            : "-"}
                        </p>
                      </div>
                    </div>

                    <div className="mb-3 rounded-xl overflow-hidden bg-neutral-200 aspect-video">
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

                    <div className="flex items-center gap-2 mb-3">
                      <Icon
                        name={getSocialNetworkIcon(content.socialNetwork)}
                        color="#404040"
                        size={16}
                      />
                      <span className="text-sm text-neutral-600">
                        {content.socialNetwork} • {content.contentType}
                      </span>
                    </div>

                    {contentMetrics && (
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <p className="text-neutral-600">Visualizações</p>
                          <p className="font-semibold text-neutral-950">
                            {contentMetrics.views.toLocaleString("pt-BR")}
                          </p>
                        </div>
                        <div>
                          <p className="text-neutral-600">Curtidas</p>
                          <p className="font-semibold text-neutral-950">
                            {contentMetrics.likes.toLocaleString("pt-BR")}
                          </p>
                        </div>
                        <div>
                          <p className="text-neutral-600">Comentários</p>
                          <p className="font-semibold text-neutral-950">
                            {contentMetrics.comments.toLocaleString("pt-BR")}
                          </p>
                        </div>
                        <div>
                          <p className="text-neutral-600">Engajamento</p>
                          <p className="font-semibold text-neutral-950">
                            {contentMetrics.engagement.toFixed(1)}%
                          </p>
                        </div>
                      </div>
                    )}

                    <Button
                      variant="ghost"
                      className="w-full mt-3 text-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (content.postUrl) {
                          window.open(content.postUrl, "_blank");
                        }
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <Icon name="ExternalLink" color="#404040" size={14} />
                        <span>Ver na rede social</span>
                      </div>
                    </Button>
                  </div>
                );
              })}
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

