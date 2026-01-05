import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Badge } from "@/components/ui/badge";
import type { CampaignFormData } from "@/shared/types";
import { getSubnicheLabel as getSubnicheLabelUtil } from "@/shared/data/subniches";

interface CreateCampaignStepSevenProps {
  formData: CampaignFormData;
  onBack: () => void;
  onEdit: (step: number) => void;
  onSubmitCampaign: () => void;
  isLoading?: boolean;
}

const getSubnicheLabel = (value: string) => {
  // Se for múltiplos valores separados por vírgula, processar cada um
  if (value.includes(",")) {
    return value
      .split(",")
      .map((v) => getSubnicheLabelUtil(v.trim()))
      .filter(Boolean)
      .join(", ");
  }
  return getSubnicheLabelUtil(value) || value;
};

const getGenderLabel = (value: string) => {
  const genders: { [key: string]: string } = {
    male: "Masculino",
    female: "Feminino",
    outros: "Outros",
    all: "Todos",
  };
  return genders[value] || value;
};

const getPaymentTypeLabel = (value: string) => {
  const types: { [key: string]: string } = {
    fixed: "Valor fixo por influenciador",
    price: "Preço definido pelo influenciador",
    swap: "Permuta",
    cpa: "CPA (Custo Por Ação)",
    cpm: "CPM (Custo Por Mil)",
  };
  return types[value] || value;
};

const getObjectiveLabel = (value: string) => {
  const objectives: { [key: string]: string } = {
    awareness: "Awareness",
    engagement: "Engajamento",
    conversion: "Conversão",
    reach: "Alcance",
    education: "Educação",
  };
  return objectives[value] || value;
};

const getSocialNetworkLabel = (value: string) => {
  const networks: { [key: string]: string } = {
    instagram: "Instagram",
    youtube: "Youtube",
    tiktok: "TikTok",
    facebook: "Facebook",
    twitter: "Twitter",
  };
  return networks[value] || value;
};

const getContentTypeLabel = (value: string) => {
  const types: { [key: string]: string } = {
    stories: "Stories",
    post: "Post",
    reels: "Reels",
    igtv: "IGTV",
    live: "Live",
    video: "Vídeo",
    shorts: "Shorts",
    tweet: "Tweet",
    thread: "Thread",
  };
  return types[value] || value;
};

const formatDate = (dateString: string) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  return date.toLocaleDateString("pt-BR");
};

export function CreateCampaignStepSeven({
  formData,
  onBack,
  onEdit,
  onSubmitCampaign,
  isLoading = false,
}: CreateCampaignStepSevenProps) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex gap-6">
        {/* Main Content */}
        <div className="flex-1 flex flex-col gap-6">
          {/* Informações básicas */}
          <div className="bg-white rounded-3xl p-6 border border-neutral-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-neutral-950">
                Informações básicas
              </h3>
              <Button
                variant="outline"
                onClick={() => onEdit(1)}
                style={{ width: "20%" }}
                className="h-8 px-3"
              >
                <span className="text-sm font-medium text-neutral-700">
                  Editar
                </span>
              </Button>
            </div>
            <div className="flex flex-col gap-3">
              <div>
                <p className="text-sm text-neutral-600 mb-1">
                  Título da campanha
                </p>
                <p className="text-base text-neutral-950 font-medium">
                  {formData.title || "-"}
                </p>
              </div>
              <div>
                <p className="text-sm text-neutral-600 mb-1">
                  Sobre a campanha
                </p>
                <p className="text-base text-neutral-950">
                  {formData.description || "-"}
                </p>
              </div>
              <div>
                <p className="text-sm text-neutral-600 mb-1">
                  Subnichos da campanha
                </p>
                <p className="text-base text-neutral-950">
                  {formData.subniches
                    ? getSubnicheLabel(formData.subniches)
                    : "-"}
                </p>
              </div>
            </div>
          </div>

          {/* Perfil dos influenciadores */}
          <div className="bg-white rounded-3xl p-6 border border-neutral-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-neutral-950">
                Perfil dos influenciadores
              </h3>
              <Button
                variant="outline"
                onClick={() => onEdit(2)}
                style={{ width: "20%" }}
                className="h-8 px-3"
              >
                <span className="text-sm font-medium text-neutral-700">
                  Editar
                </span>
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-neutral-600 mb-1">
                  Quantos influenciadores deseja na campanha?
                </p>
                <p className="text-base text-neutral-950 font-medium">
                  {formData.influencersCount || "-"}
                </p>
              </div>
              <div>
                <p className="text-sm text-neutral-600 mb-1">
                  Quantidade mínima de seguidores
                </p>
                <p className="text-base text-neutral-950 font-medium">
                  {formData.minFollowers || "-"}
                </p>
              </div>
              <div>
                <p className="text-sm text-neutral-600 mb-1">Estado</p>
                <p className="text-base text-neutral-950">
                  {formData.state || "-"}
                </p>
              </div>
              <div>
                <p className="text-sm text-neutral-600 mb-1">Cidade</p>
                <p className="text-base text-neutral-950">
                  {formData.city || "-"}
                </p>
              </div>
              <div>
                <p className="text-sm text-neutral-600 mb-1">Gênero</p>
                <p className="text-base text-neutral-950">
                  {formData.gender ? getGenderLabel(formData.gender) : "-"}
                </p>
              </div>
            </div>
          </div>

          {/* Remuneração e benefícios */}
          <div className="bg-white rounded-3xl p-6 border border-neutral-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-neutral-950">
                Remuneração e benefícios
              </h3>
              <Button
                variant="outline"
                onClick={() => onEdit(3)}
                style={{ width: "20%" }}
                className="h-8 px-3"
              >
                <span className="text-sm font-medium text-neutral-700">
                  Editar
                </span>
              </Button>
            </div>
            <div className="flex flex-col gap-3">
              <div>
                <p className="text-sm text-neutral-600 mb-1">
                  Tipo de remuneração
                </p>
                <p className="text-base text-neutral-950 font-medium">
                  {formData.paymentType
                    ? getPaymentTypeLabel(formData.paymentType)
                    : "-"}
                </p>
              </div>
              
              {/* Detalhes específicos de pagamento */}
              {formData.paymentType === "fixed" && formData.paymentFixedAmount && (
                <div>
                  <p className="text-sm text-neutral-600 mb-1">
                    Valor a ser pago
                  </p>
                  <p className="text-base text-neutral-950 font-medium">
                    R$ {formData.paymentFixedAmount}
                  </p>
                </div>
              )}

              {formData.paymentType === "swap" && (
                <>
                  {formData.paymentSwapItem && (
                    <div>
                      <p className="text-sm text-neutral-600 mb-1">
                        Item oferecido
                      </p>
                      <p className="text-base text-neutral-950 font-medium">
                        {formData.paymentSwapItem}
                      </p>
                    </div>
                  )}
                  {formData.paymentSwapMarketValue && (
                    <div>
                      <p className="text-sm text-neutral-600 mb-1">
                        Valor de mercado
                      </p>
                      <p className="text-base text-neutral-950 font-medium">
                        R$ {formData.paymentSwapMarketValue}
                      </p>
                    </div>
                  )}
                </>
              )}

              {formData.paymentType === "cpa" && (
                <>
                  {formData.paymentCpaActions && (
                    <div>
                      <p className="text-sm text-neutral-600 mb-1">
                        Ações que geram CPA
                      </p>
                      <p className="text-base text-neutral-950 font-medium">
                        {formData.paymentCpaActions}
                      </p>
                    </div>
                  )}
                  {formData.paymentCpaValue && (
                    <div>
                      <p className="text-sm text-neutral-600 mb-1">
                        Valor do CPA
                      </p>
                      <p className="text-base text-neutral-950 font-medium">
                        R$ {formData.paymentCpaValue}
                      </p>
                    </div>
                  )}
                </>
              )}

              {formData.paymentType === "cpm" && formData.paymentCpmValue && (
                <div>
                  <p className="text-sm text-neutral-600 mb-1">
                    Valor do CPM
                  </p>
                  <p className="text-base text-neutral-950 font-medium">
                    R$ {formData.paymentCpmValue}
                  </p>
                </div>
              )}

              <div>
                <p className="text-sm text-neutral-600 mb-1">
                  Benefícios inclusos na campanha
                </p>
                <div className="text-base text-neutral-950 whitespace-pre-line">
                  {formData.benefits || "-"}
                </div>
              </div>
            </div>
          </div>

          {/* Objetivo e orientações */}
          <div className="bg-white rounded-3xl p-6 border border-neutral-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-neutral-950">
                Objetivo e orientações
              </h3>
              <Button
                variant="outline"
                onClick={() => onEdit(4)}
                style={{ width: "20%" }}
                className="h-8 px-3"
              >
                <span className="text-sm font-medium text-neutral-700">
                  Editar
                </span>
              </Button>
            </div>
            <div className="flex flex-col gap-4">
              <div>
                <p className="text-sm text-neutral-600 mb-1">
                  Objetivo geral da campanha
                </p>
                <p className="text-base text-neutral-950">
                  {formData.generalObjective || "-"}
                </p>
              </div>
              <div>
                <p className="text-sm text-success-600 font-medium mb-1">
                  O que fazer
                </p>
                <div className="text-base text-neutral-950 whitespace-pre-line">
                  {formData.whatToDo || "-"}
                </div>
              </div>
              <div>
                <p className="text-sm text-danger-600 font-medium mb-1">
                  O que NÃO fazer
                </p>
                <div className="text-base text-neutral-950 whitespace-pre-line">
                  {formData.whatNotToDo || "-"}
                </div>
              </div>
            </div>
          </div>

          {/* Arquivos e configurações */}
          <div className="bg-white rounded-3xl p-6 border border-neutral-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-neutral-950">
                Arquivos e configurações
              </h3>
              <Button
                variant="outline"
                onClick={() => onEdit(5)}
                style={{ width: "20%" }}
                className="h-8 px-3"
              >
                <span className="text-sm font-medium text-neutral-700">
                  Editar
                </span>
              </Button>
            </div>
            <div className="flex flex-col gap-4">
              {formData.banner && (
                <div>
                  <p className="text-sm text-neutral-600 mb-2">
                    Banner da campanha
                  </p>
                  <div className="w-full h-48 rounded-2xl overflow-hidden border border-neutral-200">
                    <img
                      src={formData.banner}
                      alt="Banner da campanha"
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              )}
              <div>
                <p className="text-sm text-neutral-600 mb-1">
                  Período de direitos de imagem (em meses)
                </p>
                <p className="text-base text-neutral-950">
                  {formData.imageRightsPeriod
                    ? `${formData.imageRightsPeriod} ${
                        formData.imageRightsPeriod === "1" ? "mês" : "meses"
                      }`
                    : "-"}
                </p>
              </div>
              {formData.brandFiles && (
                <div>
                  <p className="text-sm text-neutral-600 mb-1">
                    Arquivos da marca
                  </p>
                  <div className="flex items-center gap-2">
                    <Icon name="Download" color="#A3A3A3" size={20} />
                    <span className="text-base text-neutral-950">
                      {formData.brandFiles}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Fases da campanha */}
          {formData.phases && formData.phases.length > 0 && (
            <div className="bg-white rounded-3xl p-6 border border-neutral-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-neutral-950">
                  Fases da campanha
                </h3>
                <Button
                  variant="outline"
                  onClick={() => onEdit(6)}
                  style={{ width: "20%" }}
                  className="h-8 px-3"
                >
                  <span className="text-sm font-medium text-neutral-700">
                    Editar
                  </span>
                </Button>
              </div>
              <div className="flex flex-col gap-6">
                {formData.phases.map((phase, index) => (
                  <div
                    key={phase.id}
                    className="p-4 bg-neutral-50 rounded-2xl border border-neutral-200"
                  >
                    <div className="flex items-center gap-2 mb-4">
                      <Badge
                        text={`Fase ${index + 1}`}
                        backgroundColor="bg-tertiary-600"
                        textColor="text-neutral-50"
                      />
                    </div>
                    <div className="flex flex-col gap-3">
                      <div>
                        <p className="text-sm text-neutral-600 mb-1">
                          Objetivo da fase
                        </p>
                        <p className="text-base text-neutral-950">
                          {phase.objective
                            ? getObjectiveLabel(phase.objective)
                            : "-"}
                        </p>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-neutral-600 mb-1">
                            Data prevista de postagem
                          </p>
                          <p className="text-base text-neutral-950">
                            {phase.postDate ? formatDate(phase.postDate) : "-"}
                          </p>
                        </div>
                      </div>
                      {phase.formats && phase.formats.length > 0 && (
                        <div>
                          <p className="text-sm text-neutral-600 mb-2">
                            Formatos e redes sociais
                          </p>
                          <div className="flex flex-col gap-2">
                            {phase.formats.map((format) => (
                              <div
                                key={format.id}
                                className="flex items-center gap-2 text-sm text-neutral-950"
                              >
                                <span className="font-medium">
                                  {format.socialNetwork
                                    ? getSocialNetworkLabel(
                                        format.socialNetwork
                                      )
                                    : "-"}
                                </span>
                                <span className="text-neutral-400">•</span>
                                <span>
                                  {format.contentType
                                    ? getContentTypeLabel(format.contentType)
                                    : "-"}
                                </span>
                                <span className="text-neutral-400">•</span>
                                <span>
                                  Quantidade: {format.quantity || "-"}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {phase.files && (
                        <div>
                          <p className="text-sm text-neutral-600 mb-1">
                            Arquivos da fase
                          </p>
                          <div className="flex items-center gap-2">
                            <Icon name="Download" color="#A3A3A3" size={20} />
                            <span className="text-base text-neutral-950">
                              {phase.files}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar - Análise e sugestões da IA */}
        <div className="w-80 shrink-0">
          <div className="bg-tertiary-50 rounded-3xl p-6 border border-tertiary-200 sticky top-6">
            <h3 className="text-lg font-semibold text-primary-900 mb-4">
              Análise e sugestões da IA
            </h3>
            <div className="flex flex-col gap-3">
              {parseInt(formData.influencersCount || "0") < 3 && (
                <p className="text-sm text-primary-900">
                  • Para potencializar os resultados da campanha, recomendamos
                  aumentar o número de influenciadores para pelo menos 3, de
                  acordo com o seu objetivo.
                </p>
              )}
              {formData.phases && formData.phases.length > 1 && (
                <p className="text-sm text-primary-900">
                  • O cronograma das fases está muito próximo. Recomendamos
                  aumentar o intervalo entre elas para permitir a análise dos
                  dados e a otimização da campanha.
                </p>
              )}
              {(!formData.phases || formData.phases.length === 0) && (
                <p className="text-sm text-primary-900">
                  • Adicione pelo menos uma fase para organizar melhor sua
                  campanha.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Footer Navigation */}
      <div className="flex items-center justify-between mt-6 w-full">
        <div className="w-fit">
          <Button variant="outline" onClick={onBack} type="button">
            <div className="flex items-center justify-center gap-2">
              <Icon name="ArrowLeft" size={16} color="#404040" />
              <p className="text-neutral-700 font-semibold">Voltar</p>
            </div>
          </Button>
        </div>

        <div className="w-fit">
          <Button onClick={onSubmitCampaign} type="button" disabled={isLoading}>
            <div className="flex items-center justify-center gap-2">
              <p className="text-neutral-50 font-semibold">
                {isLoading ? "Criando campanha..." : "Confirmar e selecionar influenciadores"}
              </p>
              {!isLoading && <Icon name="ArrowRight" size={16} color="#FAFAFA" />}
            </div>
          </Button>
        </div>
      </div>
    </div>
  );
}
