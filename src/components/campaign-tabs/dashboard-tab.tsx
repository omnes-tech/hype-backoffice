import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Icon } from "@/components/ui/icon";
import type { CampaignFormData } from "@/shared/types";

interface DashboardTabProps {
  campaign: CampaignFormData;
  metrics: {
    reach: number;
    engagement: number;
    publishedContent: number;
    activeInfluencers: number;
  };
  progressPercentage: number;
}

const socialNetworkLabels: { [key: string]: string } = {
  instagram: "Instagram",
  tiktok: "TikTok",
  youtube: "YouTube",
  twitter: "Twitter",
};

const contentTypeLabels: { [key: string]: string } = {
  post: "Post",
  stories: "Stories",
  reels: "Reels",
  video: "Vídeo",
  short: "Short",
};

export function DashboardTab({ campaign, metrics, progressPercentage }: DashboardTabProps) {
  const [expandedPhases, setExpandedPhases] = useState<Set<string>>(new Set());

  const togglePhase = (phaseId: string) => {
    const newExpanded = new Set(expandedPhases);
    if (newExpanded.has(phaseId)) {
      newExpanded.delete(phaseId);
    } else {
      newExpanded.add(phaseId);
    }
    setExpandedPhases(newExpanded);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Status da campanha */}
      <div className="bg-white rounded-3xl p-6 border border-neutral-200">
        <h3 className="text-lg font-semibold text-neutral-950 mb-4">
          Status da campanha
        </h3>
        <div className="flex flex-col gap-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-neutral-600">Progresso da campanha</span>
              <span className="text-sm text-neutral-600">{progressPercentage}%</span>
            </div>
            <ProgressBar
              progressPercentage={progressPercentage}
              color="bg-tertiary-500"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 bg-neutral-50 rounded-2xl">
              <p className="text-sm text-neutral-600 mb-1">Influenciadores ativos</p>
              <p className="text-2xl font-semibold text-neutral-950">
                {metrics.activeInfluencers}
              </p>
            </div>
            <div className="p-4 bg-neutral-50 rounded-2xl">
              <p className="text-sm text-neutral-600 mb-1">Conteúdos publicados</p>
              <p className="text-2xl font-semibold text-neutral-950">
                {metrics.publishedContent}
              </p>
            </div>
            <div className="p-4 bg-neutral-50 rounded-2xl">
              <p className="text-sm text-neutral-600 mb-1">Alcance total</p>
              <p className="text-2xl font-semibold text-neutral-950">
                {metrics.reach.toLocaleString("pt-BR")}
              </p>
            </div>
            <div className="p-4 bg-neutral-50 rounded-2xl">
              <p className="text-sm text-neutral-600 mb-1">Engajamento</p>
              <p className="text-2xl font-semibold text-neutral-950">
                {metrics.engagement}%
              </p>
            </div>
            <div className="p-4 bg-neutral-50 rounded-2xl">
              <p className="text-sm text-neutral-600 mb-1">Taxa de conversão</p>
              <p className="text-2xl font-semibold text-neutral-950">3.2%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Fases da campanha */}
      <div className="bg-white rounded-3xl p-6 border border-neutral-200">
        <h3 className="text-lg font-semibold text-neutral-950 mb-4">
          Fases da campanha
        </h3>
        <div className="flex flex-col gap-3">
          {campaign.phases?.map((phase, index) => {
            const isExpanded = expandedPhases.has(phase.id);
            return (
              <div
                key={phase.id}
                className="border border-neutral-200 rounded-2xl overflow-hidden"
              >
                <button
                  onClick={() => togglePhase(phase.id)}
                  className="w-full p-4 bg-neutral-50 hover:bg-neutral-100 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Badge
                        text={`Fase ${index + 1}`}
                        backgroundColor="bg-tertiary-600"
                        textColor="text-neutral-50"
                      />
                      <span className="text-sm text-neutral-950">
                        {phase.postDate
                          ? new Date(phase.postDate).toLocaleDateString("pt-BR")
                          : "-"}
                        {phase.postTime && ` • ${phase.postTime}`}
                      </span>
                    </div>
                    <Icon
                      name={isExpanded ? "ChevronUp" : "ChevronDown"}
                      size={20}
                      color="#404040"
                    />
                  </div>
                </button>
                {isExpanded && (
                  <div className="p-4 bg-white border-t border-neutral-200">
                    <div className="flex flex-col gap-4">
                      <div>
                        <p className="text-sm text-neutral-600 mb-2">Objetivo</p>
                        <Badge
                          text={
                            phase.objective === "engagement"
                              ? "Engajamento"
                              : phase.objective === "conversion"
                              ? "Conversão"
                              : phase.objective
                          }
                          backgroundColor="bg-primary-50"
                          textColor="text-primary-900"
                        />
                      </div>
                      <div>
                        <p className="text-sm text-neutral-600 mb-2">
                          Data e horário da postagem
                        </p>
                        <p className="text-base text-neutral-950">
                          {phase.postDate
                            ? new Date(phase.postDate).toLocaleDateString("pt-BR", {
                                day: "2-digit",
                                month: "long",
                                year: "numeric",
                              })
                            : "-"}
                          {phase.postTime && ` às ${phase.postTime}`}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-neutral-600 mb-2">
                          Formatos de conteúdo
                        </p>
                        <div className="flex flex-col gap-2">
                          {phase.formats && phase.formats.length > 0 ? (
                            phase.formats.map((format) => (
                              <div
                                key={format.id}
                                className="p-3 bg-neutral-50 rounded-xl border border-neutral-200"
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex flex-col gap-1">
                                    <p className="text-sm font-medium text-neutral-950">
                                      {socialNetworkLabels[format.socialNetwork] ||
                                        format.socialNetwork}
                                    </p>
                                    <p className="text-xs text-neutral-600">
                                      {contentTypeLabels[format.contentType] ||
                                        format.contentType}
                                    </p>
                                  </div>
                                  <Badge
                                    text={`${format.quantity}x`}
                                    backgroundColor="bg-tertiary-50"
                                    textColor="text-tertiary-900"
                                  />
                                </div>
                              </div>
                            ))
                          ) : (
                            <p className="text-sm text-neutral-600">
                              Nenhum formato definido
                            </p>
                          )}
                        </div>
                      </div>
                      {phase.files && (
                        <div>
                          <p className="text-sm text-neutral-600 mb-1">Arquivos</p>
                          <p className="text-base text-neutral-950">{phase.files}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Resumo da campanha */}
      <div className="bg-white rounded-3xl p-6 border border-neutral-200">
        <h3 className="text-lg font-semibold text-neutral-950 mb-4">
          Resumo da campanha
        </h3>
        <div className="flex flex-col gap-4">
          <div>
            <p className="text-sm text-neutral-600 mb-1">Descrição</p>
            <p className="text-base text-neutral-950">{campaign.description}</p>
          </div>
          <div>
            <p className="text-sm text-neutral-600 mb-1">Objetivo geral</p>
            <p className="text-base text-neutral-950">{campaign.generalObjective}</p>
          </div>
          <div>
            <p className="text-sm text-success-600 font-medium mb-1">O que fazer</p>
            <div className="text-base text-neutral-950 whitespace-pre-line">
              {campaign.whatToDo}
            </div>
          </div>
          <div>
            <p className="text-sm text-error-600 font-medium mb-1">O que não fazer</p>
            <div className="text-base text-neutral-950 whitespace-pre-line">
              {campaign.whatNotToDo}
            </div>
          </div>
          <div>
            <p className="text-sm text-neutral-600 mb-1">Benefícios</p>
            <div className="text-base text-neutral-950 whitespace-pre-line">
              {campaign.benefits}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

