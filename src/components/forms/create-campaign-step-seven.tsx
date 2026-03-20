import { useMemo } from "react";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import type { CampaignFormData } from "@/shared/types";
import { useNiches } from "@/hooks/use-niches";

interface CreateCampaignStepSevenProps {
  formData: CampaignFormData;
  updateFormData?: (field: keyof CampaignFormData, value: unknown) => void;
  onBack: () => void;
  onEdit: (step: number) => void;
  onSubmitCampaign: () => void;
  onSaveDraft?: () => void;
  isLoading?: boolean;
}

const getPaymentTypeLabel = (value: string) => {
  const types: Record<string, string> = {
    fixed: "Valor fixo",
    price: "Preço definido pelo influenciador",
    swap: "Permuta",
    cpa: "CPA (Custo Por Ação)",
    cpm: "CPM (Custo Por Mil)",
  };
  return types[value] || value;
};

const getObjectiveLabel = (value: string) => {
  const objectives: Record<string, string> = {
    awareness: "Awareness",
    engagement: "Engajamento",
    conversion: "Conversão",
    reach: "Alcance",
    education: "Educação",
  };
  return objectives[value] || value;
};

const getSocialNetworkLabel = (value: string) => {
  const networks: Record<string, string> = {
    instagram: "Instagram",
    tiktok: "TikTok",
    youtube: "Youtube",
    ugc: "UGC",
  };
  return networks[value] || value;
};

const getContentTypeLabel = (value: string) => {
  const types: Record<string, string> = {
    post: "Post",
    reels: "Reels",
    stories: "Stories",
    video: "Vídeos",
    video_dedicated: "Vídeo dedicado até 10 minutos",
    insertion: "Inserção até 60 segundos",
    preroll_endroll: "Pré-roll ou End-roll até 15 segundos",
    live: "LIVE",
    shorts: "Shorts",
    image: "Imagem",
    video_1min: "Vídeo até 1 minuto",
    video_10min: "Vídeo até 10 minutos",
    video_1hour: "Vídeo até 1 hora",
  };
  return types[value] || value;
};

const formatDate = (dateString: string) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  return date.toLocaleDateString("pt-BR");
};

function ReviewCard({
  title,
  onEdit,
  children,
}: {
  title: string;
  onEdit: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-[12px] bg-neutral-050 p-6">
      <div className="rounded-[24px] border border-neutral-200 bg-white px-5 py-6">
        <div className="mb-6 flex items-center justify-between gap-4">
          <h3 className="text-lg font-medium leading-7 text-neutral-700">
            {title}
          </h3>
          <Button
            type="button"
            variant="outline"
            onClick={() => onEdit()}
            className="h-8 shrink-0 rounded-[24px] border-neutral-200 px-4 py-1.5 w-max"
          >
            <span className="text-sm font-semibold text-neutral-700">
              Editar
            </span>
          </Button>
        </div>
        <div className="flex flex-col gap-5 text-base leading-5 text-neutral-700">
          {children}
        </div>
      </div>
    </div>
  );
}

function LabelValue({
  label,
  value,
  className,
}: {
  label: string;
  value: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className ?? "flex flex-col gap-1"}>
      <p className="font-medium text-neutral-950">{label}</p>
      <p className="font-normal text-neutral-700">{value ?? "-"}</p>
    </div>
  );
}

export function CreateCampaignStepSeven({
  formData,
  updateFormData,
  onBack,
  onEdit,
  onSubmitCampaign,
  onSaveDraft,
  isLoading = false,
}: CreateCampaignStepSevenProps) {
  const { data: niches = [] } = useNiches();

  const subnicheNames = useMemo(() => {
    if (!formData.subniches) return "";
    const ids = formData.subniches.split(",").filter(Boolean);
    const names = ids.map((id) => {
      const n = niches.find((x) => x.id.toString() === id.trim());
      return n?.name ?? id;
    });
    return names.join(", ");
  }, [formData.subniches, niches]);

  const visibility =
    formData.campaignVisibility === "private" ? "private" : "public";

  return (
    <div className="flex flex-col gap-11 pb-8">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <h2 className="text-[28px] font-medium leading-8 text-neutral-950">
          Revisão da campanha
        </h2>
        <p className="text-lg leading-8 text-neutral-700">
          Confira as informações antes de criar. Você pode voltar e ajustar
          qualquer seção.
        </p>
      </div>

      <div className="flex gap-8">
        {/* Main content */}
        <div className="min-w-0 flex-1 flex flex-col gap-7">
          {/* Pública ou privada + cards */}
          <div className="flex flex-col gap-7">
            {/* Esta campanha será pública ou privada? */}
            <div className="rounded-[12px] bg-neutral-050 p-6">
              <p className="mb-4 text-xl font-medium text-neutral-950">
                Esta campanha será pública ou privada?
              </p>
              <div className="flex flex-col gap-4">
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="radio"
                    name="campaignVisibility"
                    checked={visibility === "public"}
                    onChange={() =>
                      updateFormData?.("campaignVisibility", "public")
                    }
                    className="h-6 w-6 border-neutral-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-base font-medium text-neutral-950">
                    Pública: a campanha fica visível para influenciadores que se
                    inscrevem na plataforma
                  </span>
                </label>
                <label className="flex cursor-pointer items-start gap-2">
                  <input
                    type="radio"
                    name="campaignVisibility"
                    checked={visibility === "private"}
                    onChange={() =>
                      updateFormData?.("campaignVisibility", "private")
                    }
                    className="mt-0.5 h-6 w-6 shrink-0 border-neutral-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-base font-medium text-neutral-950">
                    Privada: a campanha não aparece publicamente; apenas
                    influenciadores selecionados/convidados terão acesso
                  </span>
                </label>
              </div>
            </div>

            {/* Informações básicas */}
            <ReviewCard title="Informações básicas" onEdit={() => onEdit(1)}>
              <LabelValue label="Título da campanha" value={formData.title} />
              <LabelValue label="Sobre a campanha" value={formData.description} />
              <LabelValue label="Subnichos da campanha" value={subnicheNames} />
            </ReviewCard>

            {/* Remuneração e benefícios */}
            <ReviewCard title="Remuneração e benefícios" onEdit={() => onEdit(3)}>
              <LabelValue
                label="Tipo de remuneração"
                value={
                  formData.paymentType
                    ? getPaymentTypeLabel(formData.paymentType)
                    : null
                }
              />
              {formData.paymentType === "fixed" && formData.paymentFixedAmount && (
                <LabelValue
                  label="Valor a ser pago"
                  value={`R$ ${formData.paymentFixedAmount}`}
                />
              )}
              {formData.paymentType === "swap" && (
                <>
                  {formData.paymentSwapItem && (
                    <LabelValue
                      label="Item oferecido"
                      value={formData.paymentSwapItem}
                    />
                  )}
                  {formData.paymentSwapMarketValue && (
                    <LabelValue
                      label="Valor de mercado"
                      value={`R$ ${formData.paymentSwapMarketValue}`}
                    />
                  )}
                </>
              )}
              {formData.paymentType === "cpa" && (
                <>
                  {formData.paymentCpaActions && (
                    <LabelValue
                      label="Ações que geram CPA"
                      value={formData.paymentCpaActions}
                    />
                  )}
                  {formData.paymentCpaValue && (
                    <LabelValue
                      label="Valor do CPA"
                      value={`R$ ${formData.paymentCpaValue}`}
                    />
                  )}
                </>
              )}
              {formData.paymentType === "cpm" && formData.paymentCpmValue && (
                <LabelValue
                  label="Valor do CPM"
                  value={`R$ ${formData.paymentCpmValue}`}
                />
              )}
              <div className="flex flex-col gap-2">
                <p className="font-medium text-neutral-950">
                  Benefícios inclusos na campanha
                </p>
                <div className="text-neutral-700">
                  {Array.isArray(formData.benefits) ? (
                    formData.benefits.filter((b) => b.trim()).length > 0 ? (
                      <ul className="list-disc space-y-1 pl-6">
                        {formData.benefits
                          .filter((b) => b.trim())
                          .map((item, i) => (
                            <li key={i}>{item}</li>
                          ))}
                      </ul>
                    ) : (
                      "-"
                    )
                  ) : formData.benefits ? (
                    String(formData.benefits)
                  ) : (
                    "-"
                  )}
                </div>
              </div>
            </ReviewCard>

            {/* Objetivo e orientações */}
            <ReviewCard title="Objetivo e orientações" onEdit={() => onEdit(1)}>
              <LabelValue
                label="Objetivo geral da campanha"
                value={formData.generalObjective}
              />
              <div className="flex flex-col gap-2">
                <p className="font-medium text-neutral-950">O que fazer</p>
                <div className="text-neutral-700">
                  {Array.isArray(formData.whatToDo) ? (
                    formData.whatToDo.filter((b) => b.trim()).length > 0 ? (
                      <ul className="list-disc space-y-1 pl-6">
                        {formData.whatToDo
                          .filter((b) => b.trim())
                          .map((item, i) => (
                            <li key={i}>{item}</li>
                          ))}
                      </ul>
                    ) : (
                      "-"
                    )
                  ) : formData.whatToDo ? (
                    String(formData.whatToDo)
                  ) : (
                    "-"
                  )}
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <p className="font-medium text-neutral-950">O que NÃO fazer</p>
                <div className="text-neutral-700">
                  {Array.isArray(formData.whatNotToDo) ? (
                    formData.whatNotToDo.filter((b) => b.trim()).length > 0 ? (
                      <ul className="list-disc space-y-1 pl-6">
                        {formData.whatNotToDo
                          .filter((b) => b.trim())
                          .map((item, i) => (
                            <li key={i}>{item}</li>
                          ))}
                      </ul>
                    ) : (
                      "-"
                    )
                  ) : formData.whatNotToDo ? (
                    String(formData.whatNotToDo)
                  ) : (
                    "-"
                  )}
                </div>
              </div>
            </ReviewCard>

            {/* Arquivos e configurações */}
            <ReviewCard title="Arquivos e configurações" onEdit={() => onEdit(4)}>
              {formData.banner ? (
                <div className="flex flex-col gap-2">
                  <p className="font-medium text-neutral-950">
                    Banner da campanha
                  </p>
                  <div className="h-28 w-full overflow-hidden rounded-xl border border-neutral-200">
                    <img
                      src={formData.banner}
                      alt="Banner da campanha"
                      className="h-full w-full object-cover"
                    />
                  </div>
                </div>
              ) : null}
              <LabelValue
                label="Período de direitos de imagem (em meses)"
                value={
                  formData.imageRightsPeriod
                    ? `${formData.imageRightsPeriod} ${formData.imageRightsPeriod === "1" ? "mês" : "meses"
                    }`
                    : null
                }
              />
              {formData.brandFiles ? (
                <div className="flex flex-col gap-2">
                  <p className="font-medium text-neutral-950">
                    Arquivos da marca
                  </p>
                  <div className="flex items-center gap-2 rounded-lg bg-neutral-100 px-4 py-3">
                    <Icon name="FileText" size={16} color="#404040" />
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-neutral-700">
                        {formData.brandFiles}
                      </span>
                    </div>
                  </div>
                </div>
              ) : null}
            </ReviewCard>

            {/* Fases da campanha */}
            {formData.phases && formData.phases.length > 0 && (
              <ReviewCard title="Fases da campanha" onEdit={() => onEdit(5)}>
                <div className="flex flex-col gap-5">
                  {formData.phases.map((phase, index) => (
                    <div
                      key={phase.id}
                      className="rounded-2xl border border-primary-200 bg-white p-4"
                    >
                      <span className="mb-4 inline-block rounded-[24px] bg-primary-100 px-3 py-1 text-base font-medium text-primary-900">
                        Fase {index + 1}
                      </span>
                      <div className="flex flex-col gap-5">
                        <LabelValue
                          label="Objetivo da fase"
                          value={
                            phase.objective
                              ? getObjectiveLabel(phase.objective)
                              : null
                          }
                        />
                        <LabelValue
                          label="Data prevista de postagem"
                          value={phase.postDate ? formatDate(phase.postDate) : null}
                        />
                        {(phase.postTime ?? "").trim() && (
                          <LabelValue
                            label="Horário da postagem"
                            value={`${phase.postTime} horas`}
                          />
                        )}
                        {phase.formats && phase.formats.length > 0 && (
                          <div className="flex flex-col gap-3">
                            <p className="font-medium text-neutral-950">
                              Formatos e redes sociais
                            </p>
                            <div className="flex flex-col gap-3">
                              {phase.formats.map((format) => (
                                <div
                                  key={format.id}
                                  className="rounded-lg bg-neutral-100 px-4 py-3"
                                >
                                  <div className="flex flex-wrap gap-x-2 gap-y-1 text-base text-neutral-700">
                                    <span className="font-medium">
                                      Rede social:{" "}
                                    </span>
                                    <span>
                                      {format.socialNetwork
                                        ? getSocialNetworkLabel(
                                          format.socialNetwork
                                        )
                                        : "-"}
                                    </span>
                                  </div>
                                  <div className="flex flex-wrap gap-x-2 gap-y-1 text-base text-neutral-700">
                                    <span className="font-medium">
                                      Tipo de conteúdo:{" "}
                                    </span>
                                    <span>
                                      {format.contentType
                                        ? getContentTypeLabel(
                                          format.contentType
                                        )
                                        : "-"}
                                    </span>
                                  </div>
                                  <div className="flex flex-wrap gap-x-2 gap-y-1 text-base text-neutral-700">
                                    <span className="font-medium">
                                      Quantidade:{" "}
                                    </span>
                                    <span>{format.quantity || "-"}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {phase.files ? (
                          <div className="flex items-center gap-2 rounded-lg bg-neutral-100 px-4 py-3">
                            <Icon name="FileText" size={16} color="#404040" />
                            <span className="text-sm font-medium text-neutral-700">
                              {phase.files}
                            </span>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              </ReviewCard>
            )}
          </div>
        </div>

        {/* Sidebar - Análise e sugestões da IA */}
        <aside className="w-[296px] shrink-0">
          <div className="rounded-[24px] border border-primary-200 bg-primary-50 px-5 py-6">
            <div className="mb-6 flex items-center gap-2">
              <Icon name="Sparkles" size={20} color="#5D1390" />
              <h3 className="text-lg font-medium text-primary-900">
                Análise e sugestões da IA
              </h3>
            </div>
            <div className="flex flex-col gap-5">
              <p className="flex gap-2 text-base leading-5 text-primary-900">
                <span className="mt-0.5 shrink-0 text-primary-900">•</span>
                <span>
                  Para potencializar os resultados da campanha, recomendamos
                  aumentar o número de influenciadores para pelo menos 3, de
                  acordo com o seu objetivo.
                </span>
              </p>
              <p className="flex gap-2 text-base leading-5 text-primary-900">
                <span className="mt-0.5 shrink-0 text-primary-900">•</span>
                <span>
                  O cronograma da Fase 2 está muito próximo da Fase 1.
                  Recomendamos aumentar o intervalo entre elas para permitir a
                  análise dos dados e a otimização da campanha.
                </span>
              </p>
            </div>
          </div>
        </aside>
      </div>

      {/* Footer */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-neutral-200 bg-neutral-050 p-6">
        <Button
          type="button"
          onClick={onBack}
          variant="default"
          disabled={isLoading}
          className="h-11 rounded-[24px] px-4 w-min"
        >
          <div className="flex items-center gap-2">
            {isLoading && (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-neutral-50/30 border-t-neutral-50" />
            )}
            {!isLoading && (
              <Icon name="ArrowLeft" size={16} color="#FAFAFA" />
            )}
            <span className="font-semibold text-neutral-50">
              Voltar
            </span>

          </div>
        </Button>
        <div className="flex flex-wrap items-center justify-end gap-2">
        {onSaveDraft && (
          <Button
            type="button"
            variant="outline"
            onClick={onSaveDraft}
            disabled={isLoading}
            className="h-11 rounded-[24px] px-4 border-neutral-300 w-max"
          >
            <span className="font-semibold text-neutral-800">Salvar rascunho</span>
          </Button>
        )}
        <Button
          type="button"
          onClick={onSubmitCampaign}
          disabled={isLoading}
          className="h-11 rounded-[24px] bg-primary-600 px-4 w-max"
        >
          <div className="flex items-center gap-2">
            {isLoading && (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-neutral-50/30 border-t-neutral-50" />
            )}
            <span className="font-semibold text-neutral-50">
              {isLoading ? "Criando campanha..." : "Continuar"}
            </span>
            {!isLoading && (
              <Icon name="ArrowRight" size={16} color="#FAFAFA" />
            )}
          </div>
        </Button>
        </div>
      </div>
    </div >
  );
}
