import { createFileRoute, useNavigate } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Badge } from "@/components/ui/badge";
import { ProgressBar } from "@/components/ui/progress-bar";
import type { CampaignFormData } from "@/shared/types";

export const Route = createFileRoute("/(private)/(app)/campaigns/$campaignId")({
  component: RouteComponent,
});

// Mock data - em produção viria de uma API
const mockCampaignData: CampaignFormData = {
  title: "Verão 2024: Moda Praia",
  description:
    "Campanha focada em promover nossa nova coleção de moda praia para o verão 2024. Buscamos influenciadores que compartilhem estilo de vida praiano e fashion.",
  subniches: "beauty",
  influencersCount: "10",
  minFollowers: "5000",
  state: "São Paulo",
  city: "São Paulo",
  gender: "all",
  paymentType: "fixed",
  benefits:
    "• Participação no sorteio de gadgets (fones, teclado mecânico ou monitor portátil);\n• Acesso Premium gratuito a nossa plataforma por 30 dias.",
  generalObjective:
    "Aumentar o alcance da marca e gerar engajamento com o público-alvo através de conteúdo autêntico e relevante.",
  whatToDo:
    "• Mencionar a marca no início do vídeo.\n• Usar hashtag oficial #CampanhaBrand.\n• Mostrar o produto sendo utilizado.",
  whatNotToDo:
    "• Falar sobre marcas concorrentes.\n• Usar linguagem inadequada.\n• Postar em horários de baixo engajamento.",
  banner:
    "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.1.0",
  imageRightsPeriod: "2",
  brandFiles: "Branding.pdf (2.4 MB)",
  phasesCount: "2",
  phases: [
    {
      id: "1",
      objective: "engagement",
      postDate: "2025-01-15",
      postTime: "18:00",
      formats: [
        {
          id: "1",
          socialNetwork: "instagram",
          contentType: "reels",
          quantity: "1",
        },
        {
          id: "2",
          socialNetwork: "instagram",
          contentType: "stories",
          quantity: "3",
        },
      ],
      files: "Fase1_Materiais.zip",
    },
    {
      id: "2",
      objective: "conversion",
      postDate: "2025-01-22",
      postTime: "20:00",
      formats: [
        {
          id: "3",
          socialNetwork: "instagram",
          contentType: "post",
          quantity: "2",
        },
      ],
      files: "",
    },
  ],
};

const getSubnicheLabel = (value: string) => {
  const subniches: { [key: string]: string } = {
    agriculture: "Agro",
    architecture: "Arquitetura/Construção",
    art: "Arte",
    athlete: "Atleta",
    actor: "Ator/Atriz",
    audiovisual: "Audiovisual",
    automobilism: "Automobilismo",
    beverages: "Bebidas",
    beauty: "Beleza",
    toys: "Brinquedos",
    hair: "Cabelo",
  };
  return subniches[value] || value;
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
    fixed: "Valor fixo",
    price: "Preço do influenciador",
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

function RouteComponent() {
  const navigate = useNavigate();
  const campaign = mockCampaignData;
  const progressPercentage = 45;

  return (
    <div className="flex flex-col gap-6">
      {/* Header com botão voltar */}
      <div className="flex items-center justify-between w-full gap-4">
        <Button
          variant="outline"
          onClick={() => navigate({ to: "/campaigns" })}
          style={{ width: "8rem" }}
          className="h-10 px-4"
        >
          <div className="flex items-center gap-2">
            <Icon name="ArrowLeft" size={16} color="#404040" />
            <span className="text-neutral-700 font-medium">Voltar</span>
          </div>
        </Button>
        <h1 className="text-2xl font-semibold text-neutral-950">
          {campaign.title}
        </h1>
      </div>

      {/* Banner */}
      {campaign.banner && (
        <div className="w-full h-64 rounded-3xl overflow-hidden border border-neutral-200">
          <img
            src={campaign.banner}
            alt={campaign.title}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* Progress Section */}
      <div className="bg-white rounded-3xl p-6 border border-neutral-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-neutral-950">
            Progresso da campanha
          </h2>
          <Badge
            text={`${campaign.influencersCount} influenciadores`}
            backgroundColor="bg-primary-50"
            textColor="text-primary-900"
          />
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-neutral-600">Fase 2 de 2</span>
            <span className="text-sm text-neutral-600">
              {progressPercentage}%
            </span>
          </div>
          <ProgressBar
            progressPercentage={progressPercentage}
            color="bg-tertiary-500"
          />
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Main Info */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* Informações básicas */}
          <div className="bg-white rounded-3xl p-6 border border-neutral-200">
            <h3 className="text-lg font-semibold text-neutral-950 mb-4">
              Informações básicas
            </h3>
            <div className="flex flex-col gap-3">
              <div>
                <p className="text-sm text-neutral-600 mb-1">
                  Sobre a campanha
                </p>
                <p className="text-base text-neutral-950">
                  {campaign.description}
                </p>
              </div>
              <div>
                <p className="text-sm text-neutral-600 mb-1">
                  Subnichos da campanha
                </p>
                <p className="text-base text-neutral-950">
                  {campaign.subniches
                    ? getSubnicheLabel(campaign.subniches)
                    : "-"}
                </p>
              </div>
            </div>
          </div>

          {/* Perfil dos influenciadores */}
          <div className="bg-white rounded-3xl p-6 border border-neutral-200">
            <h3 className="text-lg font-semibold text-neutral-950 mb-4">
              Perfil dos influenciadores
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-neutral-600 mb-1">
                  Quantos influenciadores deseja na campanha?
                </p>
                <p className="text-base text-neutral-950 font-medium">
                  {campaign.influencersCount || "-"}
                </p>
              </div>
              <div>
                <p className="text-sm text-neutral-600 mb-1">
                  Quantidade mínima de seguidores
                </p>
                <p className="text-base text-neutral-950 font-medium">
                  {campaign.minFollowers || "-"}
                </p>
              </div>
              <div>
                <p className="text-sm text-neutral-600 mb-1">Estado</p>
                <p className="text-base text-neutral-950">
                  {campaign.state || "-"}
                </p>
              </div>
              <div>
                <p className="text-sm text-neutral-600 mb-1">Cidade</p>
                <p className="text-base text-neutral-950">
                  {campaign.city || "-"}
                </p>
              </div>
              <div>
                <p className="text-sm text-neutral-600 mb-1">Gênero</p>
                <p className="text-base text-neutral-950">
                  {campaign.gender ? getGenderLabel(campaign.gender) : "-"}
                </p>
              </div>
            </div>
          </div>

          {/* Remuneração e benefícios */}
          <div className="bg-white rounded-3xl p-6 border border-neutral-200">
            <h3 className="text-lg font-semibold text-neutral-950 mb-4">
              Remuneração e benefícios
            </h3>
            <div className="flex flex-col gap-3">
              <div>
                <p className="text-sm text-neutral-600 mb-1">
                  Tipo de remuneração
                </p>
                <p className="text-base text-neutral-950 font-medium">
                  {campaign.paymentType
                    ? getPaymentTypeLabel(campaign.paymentType)
                    : "-"}
                </p>
              </div>
              <div>
                <p className="text-sm text-neutral-600 mb-1">
                  Benefícios inclusos na campanha
                </p>
                <div className="text-base text-neutral-950 whitespace-pre-line">
                  {campaign.benefits || "-"}
                </div>
              </div>
            </div>
          </div>

          {/* Objetivo e orientações */}
          <div className="bg-white rounded-3xl p-6 border border-neutral-200">
            <h3 className="text-lg font-semibold text-neutral-950 mb-4">
              Objetivo e orientações
            </h3>
            <div className="flex flex-col gap-4">
              <div>
                <p className="text-sm text-neutral-600 mb-1">
                  Objetivo geral da campanha
                </p>
                <p className="text-base text-neutral-950">
                  {campaign.generalObjective || "-"}
                </p>
              </div>
              <div>
                <p className="text-sm text-success-600 font-medium mb-1">
                  O que fazer
                </p>
                <div className="text-base text-neutral-950 whitespace-pre-line">
                  {campaign.whatToDo || "-"}
                </div>
              </div>
              <div>
                <p className="text-sm text-danger-600 font-medium mb-1">
                  O que NÃO fazer
                </p>
                <div className="text-base text-neutral-950 whitespace-pre-line">
                  {campaign.whatNotToDo || "-"}
                </div>
              </div>
            </div>
          </div>

          {/* Arquivos e configurações */}
          <div className="bg-white rounded-3xl p-6 border border-neutral-200">
            <h3 className="text-lg font-semibold text-neutral-950 mb-4">
              Arquivos e configurações
            </h3>
            <div className="flex flex-col gap-4">
              <div>
                <p className="text-sm text-neutral-600 mb-1">
                  Período de direitos de imagem (em meses)
                </p>
                <p className="text-base text-neutral-950">
                  {campaign.imageRightsPeriod
                    ? `${campaign.imageRightsPeriod} ${
                        campaign.imageRightsPeriod === "1" ? "mês" : "meses"
                      }`
                    : "-"}
                </p>
              </div>
              {campaign.brandFiles && (
                <div>
                  <p className="text-sm text-neutral-600 mb-1">
                    Arquivos da marca
                  </p>
                  <div className="flex items-center gap-2">
                    <Icon name="Download" color="#A3A3A3" size={20} />
                    <span className="text-base text-neutral-950">
                      {campaign.brandFiles}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Fases da campanha */}
          {campaign.phases && campaign.phases.length > 0 && (
            <div className="bg-white rounded-3xl p-6 border border-neutral-200">
              <h3 className="text-lg font-semibold text-neutral-950 mb-4">
                Fases da campanha
              </h3>
              <div className="flex flex-col gap-6">
                {campaign.phases.map((phase, index) => (
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
                        <div>
                          <p className="text-sm text-neutral-600 mb-1">
                            Horário da postagem
                          </p>
                          <p className="text-base text-neutral-950">
                            {phase.postTime ? `${phase.postTime} horas` : "-"}
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

        {/* Right Sidebar */}
        <div className="lg:col-span-1 flex flex-col gap-6">
          {/* Quick Actions */}
          <div className="bg-white rounded-3xl p-6 border border-neutral-200">
            <h3 className="text-lg font-semibold text-neutral-950 mb-4">
              Ações rápidas
            </h3>
            <div className="flex flex-col gap-3">
              <Button className="w-full">
                <div className="flex items-center gap-2">
                  <Icon name="Users" color="#FAFAFA" size={16} />
                  <span className="text-neutral-50 font-medium">
                    Ver influenciadores
                  </span>
                </div>
              </Button>
              <Button variant="outline" className="w-full">
                <div className="flex items-center gap-2">
                  <Icon name="Pencil" color="#404040" size={16} />
                  <span className="text-neutral-700 font-medium">
                    Editar campanha
                  </span>
                </div>
              </Button>
              <Button variant="outline" className="w-full">
                <div className="flex items-center gap-2">
                  <Icon name="Share2" color="#404040" size={16} />
                  <span className="text-neutral-700 font-medium">
                    Compartilhar
                  </span>
                </div>
              </Button>
            </div>
          </div>

          {/* Stats */}
          <div className="bg-white rounded-3xl p-6 border border-neutral-200">
            <h3 className="text-lg font-semibold text-neutral-950 mb-4">
              Estatísticas
            </h3>
            <div className="flex flex-col gap-4">
              <div>
                <p className="text-sm text-neutral-600 mb-1">
                  Influenciadores ativos
                </p>
                <p className="text-2xl font-semibold text-neutral-950">
                  {campaign.influencersCount}
                </p>
              </div>
              <div>
                <p className="text-sm text-neutral-600 mb-1">
                  Posts publicados
                </p>
                <p className="text-2xl font-semibold text-neutral-950">12</p>
              </div>
              <div>
                <p className="text-sm text-neutral-600 mb-1">Alcance total</p>
                <p className="text-2xl font-semibold text-neutral-950">45.2K</p>
              </div>
              <div>
                <p className="text-sm text-neutral-600 mb-1">Engajamento</p>
                <p className="text-2xl font-semibold text-neutral-950">8.5%</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
