import { useState, useMemo } from "react";

import { createFileRoute, Outlet, useLocation, Link } from "@tanstack/react-router";

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
import { Avatar } from "@/components/ui/avatar";
import { toast } from "sonner";
import type { CampaignFormData } from "@/shared/types";
import { useCampaigns, useCreateCampaign } from "@/hooks/use-campaigns";
import type { CreateCampaignData } from "@/shared/services/campaign";
import { createCampaignPhase, type CreatePhaseData } from "@/shared/services/phase";
import { uploadCampaignBanner } from "@/shared/services/campaign";
import { unformatNumber, currencyToNumber } from "@/shared/utils/masks";
import { useQueryClient } from "@tanstack/react-query";
import { useWorkspaceContext } from "@/contexts/workspace-context";
import { getUploadUrl } from "@/lib/utils/api";

export const Route = createFileRoute("/(private)/(app)/campaigns")({
  component: RouteComponent,
});

const initialFormData: CampaignFormData = {
  title: "",
  description: "",
  mainNiche: "",
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
      formats: [],
      files: "",
    },
  ],
};

function RouteComponent() {
  const location = useLocation();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all_campaigns");
  const [isCreatingCampaign, setIsCreatingCampaign] = useState(false);
  const [showWorkspaceModal, setShowWorkspaceModal] = useState(false);
  const [formData, setFormData] = useState<CampaignFormData>(initialFormData);

  const {
    workspaces,
    isInitialized,
    selectedWorkspace,
    selectWorkspace,
  } = useWorkspaceContext();

  const hasWorkspace = !!selectedWorkspace;
  const { data: campaignsData = [], isLoading, error } = useCampaigns({
    enabled: hasWorkspace,
  });
  const createCampaignMutation = useCreateCampaign();
  const queryClient = useQueryClient();

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
        banner: campaign.banner || undefined,
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

  // Aguardar workspace estar pronto antes de decidir o que mostrar
  if (location.pathname === "/campaigns" && !isInitialized) {
    return (
      <div className="w-full min-h-[calc(100vh-10rem)] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
          <p className="text-neutral-600">Preparando workspace...</p>
        </div>
      </div>
    );
  }

  // Na página de campanhas: sem workspace selecionado → modal ou empty state (só após contexto inicializado)
  if (isInitialized && !hasWorkspace) {
    if (workspaces.length === 0) {
      return (
        <div className="w-full min-h-[calc(100vh-10rem)] flex items-center justify-center">
          <div className="w-full max-w-xl flex flex-col items-center gap-6">
            <div className="flex flex-col items-center gap-2 text-center">
              <div className="w-16 h-16 rounded-2xl bg-primary-100 flex items-center justify-center">
                <Icon name="Building2" color="#9e2cfa" size={32} />
              </div>
              <p className="text-2xl font-medium text-neutral-950">
                Nenhum workspace encontrado
              </p>
              <span className="text-neutral-600">
                Crie um workspace no onboarding para começar a gerenciar suas campanhas.
              </span>
            </div>
            <Link to="/onboarding">
              <Button>
                <p className="text-neutral-50 font-semibold">Ir para onboarding</p>
              </Button>
            </Link>
          </div>
        </div>
      );
    }
    // Tem workspaces mas nenhum selecionado → modal para escolher
    return (
      <>
        <div className="w-full min-h-[calc(100vh-10rem)] flex items-center justify-center">
          <div className="w-full max-w-xl flex flex-col items-center gap-6">
            <div className="flex flex-col items-center gap-2 text-center">
              <div className="w-16 h-16 rounded-2xl bg-primary-100 flex items-center justify-center">
                <Icon name="Building2" color="#9e2cfa" size={32} />
              </div>
              <p className="text-2xl font-medium text-neutral-950">
                Selecione um workspace
              </p>
              <span className="text-neutral-600">
                Escolha o workspace para ver e gerenciar as campanhas.
              </span>
            </div>
            <Button onClick={() => setShowWorkspaceModal(true)}>
              <p className="text-neutral-50 font-semibold">Escolher workspace</p>
            </Button>
          </div>
        </div>

        {showWorkspaceModal && (
          <Modal
            title="Selecione um workspace"
            onClose={() => setShowWorkspaceModal(false)}
          >
            <div className="flex flex-col gap-3">
              <p className="text-sm text-neutral-600 mb-2">
                Selecione o workspace para acessar as campanhas:
              </p>
              {workspaces.map((workspace) => (
                <button
                  key={workspace.id}
                  type="button"
                  onClick={() => {
                    selectWorkspace(workspace);
                    setShowWorkspaceModal(false);
                  }}
                  className="w-full flex items-center gap-4 p-4 rounded-xl border border-neutral-200 hover:border-primary-300 hover:bg-primary-50/50 transition-colors text-left"
                >
                  <Avatar
                    size="md"
                    src={getUploadUrl(workspace.photo)}
                    alt={workspace.name}
                  />
                  <div>
                    <p className="font-semibold text-neutral-950">{workspace.name}</p>
                    <p className="text-xs text-neutral-500">Clique para acessar as campanhas</p>
                  </div>
                  <Icon name="ChevronRight" className="ml-auto" size={20} color="#525252" />
                </button>
              ))}
            </div>
          </Modal>
        )}
      </>
    );
  }

  const totalSteps = 7;
  const progressPercentage = currentStep ? (currentStep / totalSteps) * 100 : 0;

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setCurrentStep(1);
    setFormData({ ...initialFormData });
  };

  const updateFormData = (field: keyof CampaignFormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Transformar dados do formulário para o formato da API
  const transformFormDataToApiData = (formData: CampaignFormData): CreateCampaignData => {
    // Processar múltiplos subnichos separados por vírgula
    // Os valores são IDs dos nichos vindos da API
    // Enviar apenas os IDs (números) como array
    const secondary_niches = formData.subniches 
      ? formData.subniches.split(",").filter(Boolean).map(id => parseInt(id, 10)).filter(id => !isNaN(id))
      : [];

    // Construir payment_method_details baseado no tipo de pagamento
    const buildPaymentDetails = () => {
      const baseDetails: {
        amount?: number;
        currency?: string;
        description?: string;
      } = {
        description: Array.isArray(formData.benefits)
          ? formData.benefits.filter(item => item.trim() !== "").join("\n")
          : formData.benefits || "",
      };

      switch (formData.paymentType) {
        case "fixed":
          if (formData.paymentFixedAmount) {
            baseDetails.amount = currencyToNumber(formData.paymentFixedAmount);
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
            baseDetails.amount = currencyToNumber(formData.paymentSwapMarketValue);
            baseDetails.currency = "BRL";
          }
          break;
        case "cpa":
          baseDetails.description = `Ações que geram CPA: ${formData.paymentCpaActions || ""}${
            formData.paymentCpaValue ? ` - Valor: R$ ${formData.paymentCpaValue}` : ""
          }`;
          if (formData.paymentCpaValue) {
            baseDetails.amount = currencyToNumber(formData.paymentCpaValue);
            baseDetails.currency = "BRL";
          }
          break;
        case "cpm":
          if (formData.paymentCpmValue) {
            baseDetails.amount = currencyToNumber(formData.paymentCpmValue);
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
      benefits: Array.isArray(formData.benefits)
        ? formData.benefits.filter(item => item.trim() !== "")
        : formData.benefits
          ? [formData.benefits].filter(item => item.trim() !== "")
          : [],
      rules_does: Array.isArray(formData.whatToDo) 
        ? formData.whatToDo.filter(item => item.trim() !== "")
        : formData.whatToDo 
          ? [formData.whatToDo].filter(item => item.trim() !== "")
          : [],
      rules_does_not: Array.isArray(formData.whatNotToDo)
        ? formData.whatNotToDo.filter(item => item.trim() !== "")
        : formData.whatNotToDo
          ? [formData.whatNotToDo].filter(item => item.trim() !== "")
          : [],
      segment_min_followers: formData.minFollowers ? parseInt(unformatNumber(formData.minFollowers)) : undefined,
      segment_state: formData.state ? formData.state.split(",").filter(Boolean) : undefined,
      segment_city: formData.city ? formData.city.split(",").filter(Boolean) : undefined,
      segment_genders: formData.gender && formData.gender !== "all" ? [formData.gender] : undefined,
      image_rights_period: formData.imageRightsPeriod ? parseInt(unformatNumber(formData.imageRightsPeriod)) : 0,
      // banner não é enviado aqui, será feito upload separado
    };
  };

  // Transformar fases do formulário para o formato da API
  const transformPhasesToApiData = (phases: CampaignFormData["phases"]): CreatePhaseData[] => {
    return phases
      .filter((phase) => phase.objective && phase.postDate)
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
          formats: Object.values(formatsByNetwork).length > 0 ? Object.values(formatsByNetwork) : [],
          // files deve ser array de URLs (strings), não enviar se vazio
          files: phase.files && phase.files.trim() ? [phase.files.trim()] : undefined,
        };
      });
  };

  // Handler para submissão do formulário
  const handleSubmitCampaign = async () => {
    try {
      setIsCreatingCampaign(true);
      
      // Validar dados obrigatórios
      if (!formData.title || !formData.description) {
        toast.error("Por favor, preencha todos os campos obrigatórios");
        setIsCreatingCampaign(false);
        return;
      }

      if (formData.mainNiche && (!formData.subniches || formData.subniches.split(",").filter(Boolean).length === 0)) {
        toast.error("Selecione pelo menos um subnicho da campanha.");
        setIsCreatingCampaign(false);
        return;
      }

      // Transformar dados do formulário
      const campaignData = transformFormDataToApiData(formData);

      // Criar campanha
      const createdCampaign = await createCampaignMutation.mutateAsync(campaignData);

      // Criar fases se houver
      console.log("=== INÍCIO CRIAÇÃO DE FASES ===");
      console.log("formData.phases:", formData.phases);
      console.log("formData.phases.length:", formData.phases?.length);
      
      if (formData.phases && formData.phases.length > 0) {
        console.log("Fases no formData:", formData.phases);
        const phasesData = transformPhasesToApiData(formData.phases);
        console.log("Fases transformadas para API:", phasesData);
        console.log("Quantidade de fases transformadas:", phasesData.length);

        if (phasesData.length === 0) {
          console.warn("Nenhuma fase válida para criar. Verifique se objective e postDate estão preenchidos.");
          const invalidPhases = formData.phases.filter((p) => !p.objective || !p.postDate);
          console.warn("Fases inválidas:", invalidPhases);
          toast.warning("Nenhuma fase válida foi encontrada. Verifique se todos os campos obrigatórios estão preenchidos.");
        } else {
          console.log(`Criando ${phasesData.length} fase(s)...`);
          for (let i = 0; i < phasesData.length; i++) {
            const phaseData = phasesData[i];
            try {
              console.log(`[${i + 1}/${phasesData.length}] Chamando createCampaignPhase...`);
              console.log("Campaign ID:", createdCampaign.id);
              console.log("Phase Data:", JSON.stringify(phaseData, null, 2));
              const result = await createCampaignPhase(createdCampaign.id, phaseData);
              console.log("✅ Fase criada com sucesso:", result);
            } catch (error: any) {
              console.error(`❌ Erro ao criar fase ${i + 1}:`, error);
              console.error("Erro completo:", JSON.stringify(error, null, 2));
              const errorMessage = error?.message || error?.data?.message || error?.error || "Erro desconhecido";
              toast.error(`Erro ao criar fase ${i + 1}: ${errorMessage}`);
            }
          }
          
          // Invalidar cache do dashboard para atualizar as fases
          queryClient.invalidateQueries({
            queryKey: ["campaigns", createdCampaign.id, "dashboard"],
          });
          console.log("Cache invalidado para dashboard");
        }
      } else {
        console.warn("Nenhuma fase encontrada no formData");
        console.warn("formData.phases é:", formData.phases);
      }
      console.log("=== FIM CRIAÇÃO DE FASES ===");

      // Fazer upload do banner se houver
      const bannerFile = (formData as any).bannerFile;
      if (bannerFile instanceof File) {
        try {
          await uploadCampaignBanner(createdCampaign.id, bannerFile);
          // Invalidar cache de campanhas para atualizar o banner
          queryClient.invalidateQueries({ queryKey: ["campaigns"] });
        } catch (error: any) {
          console.error("Erro ao fazer upload do banner:", error);
          // Não bloquear o fluxo se o upload do banner falhar
          toast.error("Campanha criada, mas houve um erro ao fazer upload do banner.");
        }
      }

      // Invalidar cache de campanhas para atualizar a lista
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      
      toast.success("Campanha criada com sucesso!");
      setIsCreatingCampaign(false);
      setIsModalOpen(false);
      setCurrentStep(1);
      setFormData({ ...initialFormData });
    } catch (error: any) {
      console.error("Erro ao criar campanha:", error);
      toast.error(
        error?.message || "Erro ao criar campanha. Tente novamente."
      );
      setIsCreatingCampaign(false);
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

  const emptyMessageByFilter =
    filterStatus === "active_campaigns"
      ? {
          title: "Nenhuma campanha ativa no momento",
          description:
            "Altere o filtro acima para ver todas ou finalizadas, ou crie uma nova campanha.",
        }
      : filterStatus === "finished_campaigns"
        ? {
            title: "Nenhuma campanha finalizada",
            description:
              "Altere o filtro acima para ver todas ou ativas, ou crie uma nova campanha.",
          }
        : {
            title: "Nenhuma campanha por aqui... ainda!",
            description:
              "Dê o primeiro passo: crie sua primeira campanha e comece a impulsionar sua marca no Hype.",
          };

  return (
    <>
      <div className="flex flex-col gap-6">
        {/* Barra superior sempre visível: pesquisa, filtro e criar campanha */}
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

        {filteredCampaigns.length > 0 ? (
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
        ) : (
          <div className="w-full min-h-[calc(100vh-16rem)] flex items-center justify-center py-12">
            <div className="w-full max-w-md flex flex-col items-center gap-6 text-center">
              <div className="w-14 h-14 rounded-2xl bg-neutral-100 flex items-center justify-center mx-auto">
                <Icon name="Megaphone" color="#a3a3a3" size={28} />
              </div>
              <div className="flex flex-col gap-1">
                <p className="text-lg font-semibold text-neutral-950">
                  {emptyMessageByFilter.title}
                </p>
                <span className="text-sm text-neutral-600">
                  {emptyMessageByFilter.description}
                </span>
              </div>
              <Button onClick={() => setIsModalOpen(true)}>
                Criar campanha
              </Button>
            </div>
          </div>
        )}
      </div>

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
              isLoading={isCreatingCampaign || createCampaignMutation.isPending}
            />
          )}
        </Modal>
      )}
    </>
  );
}
