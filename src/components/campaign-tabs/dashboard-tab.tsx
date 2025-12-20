import { Badge } from "@/components/ui/badge";
import { ProgressBar } from "@/components/ui/progress-bar";
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

export function DashboardTab({ campaign, metrics, progressPercentage }: DashboardTabProps) {
  return (
    <div className="flex flex-col gap-6">
      {/* Status geral da campanha */}
      <div className="bg-white rounded-3xl p-6 border border-neutral-200">
        <h3 className="text-lg font-semibold text-neutral-950 mb-4">
          Status geral da campanha
        </h3>
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
        </div>
      </div>

      {/* Resumo de métricas */}
      <div className="bg-white rounded-3xl p-6 border border-neutral-200">
        <h3 className="text-lg font-semibold text-neutral-950 mb-4">
          Resumo de métricas
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
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-neutral-600 mb-1">Alcance</p>
              <p className="text-xl font-semibold text-neutral-950">
                {metrics.reach.toLocaleString("pt-BR")}
              </p>
            </div>
            <div>
              <p className="text-sm text-neutral-600 mb-1">Engajamento</p>
              <p className="text-xl font-semibold text-neutral-950">
                {metrics.engagement}%
              </p>
            </div>
            <div>
              <p className="text-sm text-neutral-600 mb-1">Conteúdos publicados</p>
              <p className="text-xl font-semibold text-neutral-950">
                {metrics.publishedContent}
              </p>
            </div>
            <div>
              <p className="text-sm text-neutral-600 mb-1">Taxa de conversão</p>
              <p className="text-xl font-semibold text-neutral-950">3.2%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Resumo das fases */}
      <div className="bg-white rounded-3xl p-6 border border-neutral-200">
        <h3 className="text-lg font-semibold text-neutral-950 mb-4">
          Resumo das fases da campanha
        </h3>
        <div className="flex flex-col gap-3">
          {campaign.phases?.map((phase, index) => (
            <div
              key={phase.id}
              className="p-4 bg-neutral-50 rounded-2xl border border-neutral-200"
            >
              <div className="flex items-center justify-between mb-2">
                <Badge
                  text={`Fase ${index + 1}`}
                  backgroundColor="bg-tertiary-600"
                  textColor="text-neutral-50"
                />
                <span className="text-sm text-neutral-600">
                  {phase.postDate
                    ? new Date(phase.postDate).toLocaleDateString("pt-BR")
                    : "-"}
                </span>
              </div>
              <p className="text-sm text-neutral-950">
                {phase.formats?.length || 0} formatos definidos
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Resumo do briefing */}
      <div className="bg-white rounded-3xl p-6 border border-neutral-200">
        <h3 className="text-lg font-semibold text-neutral-950 mb-4">
          Resumo do briefing
        </h3>
        <div className="flex flex-col gap-4">
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
        </div>
      </div>
    </div>
  );
}

