import { useState, useMemo } from "react";

import { createFileRoute, Outlet, useLocation } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { ProgressBar } from "@/components/ui/progress-bar";
import { CreateCampaignStepOne } from "@/components/forms/create-campaign-step-one";
import { CreateCampaignStepTwo } from "@/components/forms/create-campaign-step-two";
import { CreateCampaignStepThree } from "@/components/forms/create-campaign-step-three";
import { CreateCampaignStepFour } from "@/components/forms/create-campaign-step-four";
import { CreateCampaignStepFive } from "@/components/forms/create-campaign-step-five";
import { CreateCampaignStepSix } from "@/components/forms/create-campaign-step-six";
import { CreateCampaignStepSeven } from "@/components/forms/create-campaign-step-seven";
import { CampaignCard } from "@/components/campaign-card";
import { InputSearch } from "@/components/ui/input-search";
import { Icon } from "@/components/ui/icon";
import { Dropdown } from "@/components/ui/dropdown";
import { toast } from "sonner";
import type { CampaignFormData } from "@/shared/types";
import { useCampaigns, useCreateCampaign } from "@/hooks/use-campaigns";
import type { CreateCampaignData } from "@/shared/services/campaign";
import { createCampaignPhase, type CreatePhaseData } from "@/shared/services/phase";
import { unformatNumber } from "@/shared/utils/masks";
import { getSubnicheLabel } from "@/shared/data/subniches";

export const Route = createFileRoute("/(private)/(app)/campaigns")({
  component: RouteComponent,
});

function RouteComponent() {
  const location = useLocation();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all_campaigns");

  const { data: campaignsData = [], isLoading, error } = useCampaigns();
  const createCampaignMutation = useCreateCampaign();

  const campaigns = useMemo(() => {
    return campaignsData.map((campaign: any) => {
      // Calcular progresso baseado no status (pode ser melhorado com métricas reais)
      let progressPercentage = 0;
      let phase = "Não iniciada";
      
      if (campaign.status === "active") {
        progressPercentage = 50;
        phase = "Em andamento";
      } else if (campaign.status === "finished") {
        progressPercentage = 100;
        phase = "Finalizada";
      } else if (campaign.status === "draft") {
        progressPercentage = 10;
        phase = "Rascunho";
      }

      return {
        id: campaign.id || "",
        title: campaign.title,
        phase,
        progressPercentage,
        banner: campaign.banner || "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.1.0",
        influencersCount: campaign.max_influencers || 0,
      };
    });
  }, [campaignsData]);

  // Filtrar campanhas
  const filteredCampaigns = useMemo(() => {
    let filtered = campaigns;

    // Filtrar por termo de busca
    if (searchTerm.trim()) {
      filtered = filtered.filter((campaign: any) =>
        campaign.title.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filtrar por status
    if (filterStatus === "active_campaigns") {
      filtered = filtered.filter((campaign: any) => campaign.progressPercentage > 0 && campaign.progressPercentage < 100);
    } else if (filterStatus === "finished_campaigns") {
      filtered = filtered.filter((campaign: any) => campaign.progressPercentage === 100);
    }

    return filtered;
  }, [campaigns, searchTerm, filterStatus]);

  if (location.pathname !== "/campaigns") {
    return <Outlet />;
  }
  const [formData, setFormData] = useState<CampaignFormData>({
    title: "",
    description: "",
    subniches: "",
    influencersCount: "",
    minFollowers: "",
    state: "",
    city: "",
    gender: "",
    paymentType: "",
    paymentFixedAmount: "",
    paymentSwapItem: "",
    paymentSwapMarketValue: "",
    paymentCpaActions: "",
    paymentCpaValue: "",
    paymentCpmValue: "",
    benefits: "",
    generalObjective: "",
    whatToDo: "",
    whatNotToDo: "",
    banner: "",
    imageRightsPeriod: "",
    brandFiles: "",
    phasesCount: "1",
    phases: [
      {
        id: "1",
        objective: "",
        postDate: "",
        postTime: "",
        formats: [],
        files: "",
      },
    ],
  });

  const totalSteps = 7;
  const progressPercentage = currentStep ? (currentStep / totalSteps) * 100 : 0;

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setCurrentStep(1);
    setFormData({
      title: "",
      description: "",
      subniches: "",
      influencersCount: "",
      minFollowers: "",
      state: "",
      city: "",
      gender: "",
      paymentType: "",
      paymentFixedAmount: "",
      paymentSwapItem: "",
      paymentSwapMarketValue: "",
      paymentCpaActions: "",
      paymentCpaValue: "",
      paymentCpmValue: "",
      benefits: "",
      generalObjective: "",
      whatToDo: "",
      whatNotToDo: "",
      banner: "",
      imageRightsPeriod: "",
      brandFiles: "",
      phasesCount: "1",
      phases: [
        {
          id: "1",
          objective: "",
          postDate: "",
          postTime: "",
          formats: [],
          files: "",
        },
      ],
    });
  };

  const updateFormData = (field: keyof CampaignFormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Mapeamento de subniches para IDs (pode precisar ser ajustado com dados reais da API)
  // Por enquanto, usa hash simples baseado no valor do subniche
  const getSubnicheId = (subnicheValue: string): number => {
    // Gera um ID baseado no hash do valor (pode ser substituído por mapeamento real da API)
    let hash = 0;
    for (let i = 0; i < subnicheValue.length; i++) {
      const char = subnicheValue.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash) || 1;
  };

  // Transformar dados do formulário para o formato da API
  const transformFormDataToApiData = (formData: CampaignFormData): CreateCampaignData => {
    // Processar múltiplos subnichos separados por vírgula
    const subnicheValues = formData.subniches 
      ? formData.subniches.split(",").filter(Boolean)
      : ["beauty"]; // fallback
    
    const secondary_niches = subnicheValues.map((value) => ({
      id: getSubnicheId(value.trim()),
      name: getSubnicheLabel(value.trim()) || value.trim(),
    }));

    // Construir payment_method_details baseado no tipo de pagamento
    const buildPaymentDetails = () => {
      const baseDetails: {
        amount?: number;
        currency?: string;
        description?: string;
      } = {
        description: formData.benefits || "",
      };

      switch (formData.paymentType) {
        case "fixed":
          if (formData.paymentFixedAmount) {
            baseDetails.amount = parseInt(unformatNumber(formData.paymentFixedAmount)) || 0;
            baseDetails.currency = "BRL";
          }
          break;
        case "swap":
          baseDetails.description = `${formData.paymentSwapItem || ""}${
            formData.paymentSwapMarketValue
              ? ` - Valor de mercado: R$ ${formData.paymentSwapMarketValue}`
              : ""
          }`;
          if (formData.paymentSwapMarketValue) {
            baseDetails.amount = parseInt(unformatNumber(formData.paymentSwapMarketValue)) || 0;
            baseDetails.currency = "BRL";
          }
          break;
        case "cpa":
          baseDetails.description = `Ações que geram CPA: ${formData.paymentCpaActions || ""}${
            formData.paymentCpaValue ? ` - Valor: R$ ${formData.paymentCpaValue}` : ""
          }`;
          if (formData.paymentCpaValue) {
            baseDetails.amount = parseInt(unformatNumber(formData.paymentCpaValue)) || 0;
            baseDetails.currency = "BRL";
          }
          break;
        case "cpm":
          if (formData.paymentCpmValue) {
            baseDetails.amount = parseInt(unformatNumber(formData.paymentCpmValue)) || 0;
            baseDetails.currency = "BRL";
          }
          break;
        case "price":
          // Preço definido pelo influenciador - sem detalhes específicos
          break;
      }

      return baseDetails;
    };

    return {
      title: formData.title,
      description: formData.description,
      objective: formData.generalObjective || "awareness",
      secondary_niches,
      max_influencers: parseInt(unformatNumber(formData.influencersCount)) || 0,
      payment_method: formData.paymentType || "fixed",
      payment_method_details: buildPaymentDetails(),
      benefits: formData.benefits || "",
      rules_does: formData.whatToDo || "",
      rules_does_not: formData.whatNotToDo || "",
      segment_min_followers: formData.minFollowers ? parseInt(unformatNumber(formData.minFollowers)) : undefined,
      segment_state: formData.state || undefined,
      segment_city: formData.city || undefined,
      segment_genders: formData.gender && formData.gender !== "all" ? [formData.gender] : undefined,
      image_rights_period: formData.imageRightsPeriod ? parseInt(unformatNumber(formData.imageRightsPeriod)) : 0,
      banner: formData.banner || undefined,
    };
  };

  // Transformar fases do formulário para o formato da API
  const transformPhasesToApiData = (phases: CampaignFormData["phases"]): CreatePhaseData[] => {
    return phases
      .filter((phase) => phase.objective && phase.postDate && phase.postTime)
      .map((phase) => {
        // Agrupar formatos por rede social
        const formatsByNetwork: { [key: string]: { type: string; options: Array<{ type: string; quantity: number }> } } = {};

        phase.formats.forEach((format) => {
          const network = format.socialNetwork || "instagram";
          if (!formatsByNetwork[network]) {
            formatsByNetwork[network] = {
              type: network,
              options: [],
            };
          }
          formatsByNetwork[network].options.push({
            type: format.contentType || "post",
            quantity: parseInt(format.quantity) || 1,
          });
        });

        return {
          objective: phase.objective,
          post_date: phase.postDate,
          post_time: phase.postTime,
          formats: Object.values(formatsByNetwork),
          files: phase.files ? [phase.files] : undefined,
        };
      });
  };

  // Handler para submissão do formulário
  const handleSubmitCampaign = async () => {
    try {
      // Validar dados obrigatórios
      if (!formData.title || !formData.description) {
        toast.error("Por favor, preencha todos os campos obrigatórios");
        return;
      }

      // Transformar dados do formulário
      const campaignData = transformFormDataToApiData(formData);

      // Criar campanha
      const createdCampaign = await createCampaignMutation.mutateAsync(campaignData);

      // Criar fases se houver
      if (formData.phases && formData.phases.length > 0) {
        const phasesData = transformPhasesToApiData(formData.phases);

        for (const phaseData of phasesData) {
          await createCampaignPhase(createdCampaign.id, phaseData);
        }
      }

      toast.success("Campanha criada com sucesso!");
      setIsModalOpen(false);
      setCurrentStep(1);
      setFormData({
        title: "",
        description: "",
        subniches: "",
        influencersCount: "",
        minFollowers: "",
        state: "",
        city: "",
        gender: "",
        paymentType: "",
        paymentFixedAmount: "",
        paymentSwapItem: "",
        paymentSwapMarketValue: "",
        paymentCpaActions: "",
        paymentCpaValue: "",
        paymentCpmValue: "",
        benefits: "",
        generalObjective: "",
        whatToDo: "",
        whatNotToDo: "",
        banner: "",
        imageRightsPeriod: "",
        brandFiles: "",
        phasesCount: "1",
        phases: [
          {
            id: "1",
            objective: "",
            postDate: "",
            postTime: "",
            formats: [],
            files: "",
          },
        ],
      });
    } catch (error: any) {
      console.error("Erro ao criar campanha:", error);
      toast.error(
        error?.message || "Erro ao criar campanha. Tente novamente."
      );
    }
  };

  if (isLoading) {
    return (
      <div className="w-full min-h-[calc(100vh-10rem)] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          <p className="text-neutral-600">Carregando campanhas...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full min-h-[calc(100vh-10rem)] flex items-center justify-center">
        <div className="w-full max-w-xl flex flex-col items-center gap-6">
          <div className="flex flex-col items-center gap-2">
            <p className="text-2xl font-medium text-neutral-950">
              Erro ao carregar campanhas
            </p>
            <span className="text-neutral-600 text-center">
              {error instanceof Error ? error.message : "Ocorreu um erro ao buscar as campanhas. Tente novamente."}
            </span>
          </div>
          <Button onClick={() => window.location.reload()}>
            Tentar novamente
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      {filteredCampaigns.length > 0 ? (
        <div className="flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <div className="w-full max-w-xs">
              <InputSearch
                placeholder="Pesquisar campanha"
                icon={<Icon name="Search" color="#0a0a0a" size={16} />}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-4">
              <div className="w-auto">
                <Dropdown
                  options={[
                    { label: "Todas as campanhas", value: "all_campaigns" },
                    { label: "Campanhas ativas", value: "active_campaigns" },
                    {
                      label: "Campanhas finalizadas",
                      value: "finished_campaigns",
                    },
                  ]}
                  value={filterStatus}
                  onChange={setFilterStatus}
                />
              </div>

              <Button onClick={() => setIsModalOpen(true)}>
                <div className="flex items-center gap-2">
                  <Icon name="Plus" color="#FAFAFA" size={16} />

                  <p className="text-neutral-50 font-semibold">
                    Criar campanha
                  </p>
                </div>
              </Button>
            </div>
          </div>

          <div className="grid xl:grid-cols-3 2xl:grid-cols-4 gap-5">
            {filteredCampaigns.map((campaign: any) => (
              <CampaignCard
                key={campaign.id}
                id={campaign.id}
                title={campaign.title}
                phase={campaign.phase}
                progressPercentage={campaign.progressPercentage}
                banner={campaign.banner}
                influencersCount={campaign.influencersCount}
              />
            ))}
          </div>
        </div>
      ) : (
        <div className="w-full min-h-[calc(100vh-10rem)] flex items-center justify-center">
          <div className="w-full max-w-xl flex flex-col items-center gap-6">
            <div className="flex flex-col items-center gap-2">
              <p className="text-2xl font-medium text-neutral-950">
                Nenhuma campanha por aqui... ainda!
              </p>

              <span className="text-neutral-600 text-center">
                Dê o primeiro passo: crie sua primeira campanha e comece a
                impulsionar sua marca no Hype.
              </span>
            </div>

            <div className="w-fit">
              <Button onClick={() => setIsModalOpen(true)}>
                <p className="text-neutral-50 font-semibold">
                  Criar minha primeira campanha
                </p>
              </Button>
            </div>
          </div>
        </div>
      )}

      {isModalOpen && (
        <Modal title="Criar campanha" onClose={handleCloseModal}>
          <div className="flex flex-col gap-1 mb-10">
            <ProgressBar
              progressPercentage={progressPercentage}
              color="bg-tertiary-600"
            />

            <div className="flex items-center justify-between">
              <span className="text-xs text-neutral-700">
                {currentStep === 1 && "Informações básicas"}
                {currentStep === 2 && "Perfil dos Influenciadores"}
                {currentStep === 3 && "Briefing e Objetivos"}
                {currentStep === 4 && "Detalhes da campanha"}
                {currentStep === 5 && "Arquivos e configurações"}
                {currentStep === 6 && "Fases da campanha"}
                {currentStep === 7 && "Revisão e criação da campanha"}
              </span>

              <span className="text-xs text-neutral-700">
                Etapa {currentStep} de {totalSteps}
              </span>
            </div>
          </div>

          {currentStep === 1 && (
            <CreateCampaignStepOne
              formData={formData}
              updateFormData={updateFormData}
              onNext={() => {
                setCurrentStep(currentStep + 1);
              }}
            />
          )}

          {currentStep === 2 && (
            <CreateCampaignStepTwo
              formData={formData}
              updateFormData={updateFormData}
              onBack={() => {
                setCurrentStep(currentStep - 1);
              }}
              onNext={() => {
                setCurrentStep(currentStep + 1);
              }}
            />
          )}

          {currentStep === 3 && (
            <CreateCampaignStepThree
              formData={formData}
              updateFormData={updateFormData}
              onBack={() => {
                setCurrentStep(currentStep - 1);
              }}
              onNext={() => {
                setCurrentStep(currentStep + 1);
              }}
            />
          )}

          {currentStep === 4 && (
            <CreateCampaignStepFour
              formData={formData}
              updateFormData={updateFormData}
              onBack={() => {
                setCurrentStep(currentStep - 1);
              }}
              onNext={() => {
                setCurrentStep(currentStep + 1);
              }}
            />
          )}

          {currentStep === 5 && (
            <CreateCampaignStepFive
              formData={formData}
              updateFormData={updateFormData}
              onBack={() => {
                setCurrentStep(currentStep - 1);
              }}
              onNext={() => {
                setCurrentStep(currentStep + 1);
              }}
            />
          )}

          {currentStep === 6 && (
            <CreateCampaignStepSix
              formData={formData}
              updateFormData={updateFormData}
              onBack={() => {
                setCurrentStep(currentStep - 1);
              }}
              onNext={() => {
                setCurrentStep(currentStep + 1);
              }}
            />
          )}

          {currentStep === 7 && (
            <CreateCampaignStepSeven
              formData={formData}
              onBack={() => {
                setCurrentStep(currentStep - 1);
              }}
              onEdit={(step) => {
                setCurrentStep(step);
              }}
              onSubmitCampaign={handleSubmitCampaign}
              isLoading={createCampaignMutation.isPending}
            />
          )}
        </Modal>
      )}
    </>
  );
}
