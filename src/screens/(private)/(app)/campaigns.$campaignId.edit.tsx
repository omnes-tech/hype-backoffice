import { useState, useEffect } from "react";
import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { ProgressBar } from "@/components/ui/progress-bar";
import { CreateCampaignStepOne } from "@/components/forms/create-campaign-step-one";
import { CreateCampaignStepTwo } from "@/components/forms/create-campaign-step-two";
import { CreateCampaignStepThree } from "@/components/forms/create-campaign-step-three";
import { CreateCampaignStepFour } from "@/components/forms/create-campaign-step-four";
import { CreateCampaignStepFive } from "@/components/forms/create-campaign-step-five";
import { CreateCampaignStepSix } from "@/components/forms/create-campaign-step-six";
import { CreateCampaignStepSeven } from "@/components/forms/create-campaign-step-seven";

import type { CampaignFormData } from "@/shared/types";
import { useCampaign } from "@/hooks/use-campaigns";
import { useUpdateCampaign } from "@/hooks/use-campaigns";
import { useCampaignDashboard } from "@/hooks/use-campaign-dashboard";
import { createCampaignPhase, updateCampaignPhase, deleteCampaignPhase, type CreatePhaseData } from "@/shared/services/phase";
import { uploadCampaignBanner } from "@/shared/services/campaign";
import { unformatNumber, unformatCurrency } from "@/shared/utils/masks";
import { getSubnicheValueByLabel } from "@/shared/data/subniches";
import { useQueryClient } from "@tanstack/react-query";
import { getUploadUrl } from "@/lib/utils/api";

export const Route = createFileRoute("/(private)/(app)/campaigns/$campaignId/edit")({
  component: RouteComponent,
});

function RouteComponent() {
  const navigate = useNavigate();
  const { campaignId } = useParams({ from: "/(private)/(app)/campaigns/$campaignId/edit" });
  const [currentStep, setCurrentStep] = useState(1);
  const queryClient = useQueryClient();

  // Buscar dados da campanha
  const {
    data: campaign,
    isLoading: isLoadingCampaign,
    error: campaignError,
  } = useCampaign(campaignId);

  // Buscar fases da campanha
  const {
    data: dashboardData,
    isLoading: isLoadingDashboard,
  } = useCampaignDashboard(campaignId);

  const phases = dashboardData?.phases || [];
  const updateCampaignMutation = useUpdateCampaign();

  // Inicializar formData com dados da campanha
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
    phases: [],
  });

  // Carregar dados da campanha no formData quando disponível
  useEffect(() => {
    if (campaign && phases) {
      setFormData({
        title: campaign.title || "",
        description: campaign.description || "",
        subniches: Array.isArray(campaign.secondary_niches)
          ? campaign.secondary_niches
              .map((n: any) => {
                const name = typeof n === 'object' ? n.name : String(n);
                return getSubnicheValueByLabel(name);
              })
              .join(",")
          : campaign.secondary_niches 
            ? getSubnicheValueByLabel(String(campaign.secondary_niches))
            : "",
        influencersCount: campaign.max_influencers?.toString() || "0",
        minFollowers: campaign.segment_min_followers?.toString() || "0",
        state: Array.isArray(campaign.segment_state) 
          ? campaign.segment_state.join(",") 
          : campaign.segment_state || "",
        city: Array.isArray(campaign.segment_city) 
          ? campaign.segment_city.join(",") 
          : campaign.segment_city || "",
        gender: Array.isArray(campaign.segment_genders)
          ? campaign.segment_genders.join(", ")
          : campaign.segment_genders || "all",
        paymentType: campaign.payment_method || "",
        paymentFixedAmount: campaign.payment_method === "fixed" && campaign.payment_method_details?.amount
          ? campaign.payment_method_details.amount.toString()
          : "",
        paymentSwapItem: campaign.payment_method === "swap" && campaign.payment_method_details?.description
          ? campaign.payment_method_details.description.split(" - Valor de mercado:")[0]?.trim() || ""
          : "",
        paymentSwapMarketValue: campaign.payment_method === "swap" && campaign.payment_method_details?.amount
          ? campaign.payment_method_details.amount.toString()
          : "",
        paymentCpaActions: campaign.payment_method === "cpa" && campaign.payment_method_details?.description
          ? campaign.payment_method_details.description
              .replace("Ações que geram CPA:", "")
              .split(" - Valor:")[0]
              ?.trim() || ""
          : "",
        paymentCpaValue: campaign.payment_method === "cpa" && campaign.payment_method_details?.amount
          ? campaign.payment_method_details.amount.toString()
          : "",
        paymentCpmValue: campaign.payment_method === "cpm" && campaign.payment_method_details?.amount
          ? campaign.payment_method_details.amount.toString()
          : "",
        benefits: campaign.benefits || "",
        generalObjective: campaign.objective || "",
      whatToDo: Array.isArray(campaign.rules_does) 
        ? campaign.rules_does 
        : campaign.rules_does 
          ? [campaign.rules_does]
          : [""],
      whatNotToDo: Array.isArray(campaign.rules_does_not)
        ? campaign.rules_does_not
        : campaign.rules_does_not
          ? [campaign.rules_does_not]
          : [""],
        banner: campaign.banner ? getUploadUrl(campaign.banner) || campaign.banner : "",
        imageRightsPeriod: campaign.image_rights_period?.toString() || "0",
        brandFiles: "",
        phasesCount: phases.length.toString(),
        phases: phases.map((phase: any) => ({
          id: phase.id,
          objective: phase.objective,
          postDate: phase.publish_date,
          formats: phase.contents?.flatMap((content: any) =>
            content.options?.map((option: any, idx: number) => ({
              id: `${content.type}-${option.type}-${option.quantity}-${idx}`,
              socialNetwork: content.type,
              contentType: option.type || "post",
              quantity: option.quantity?.toString() || "1",
            })) || []
          ) || [],
          files: "",
        })),
      });
    }
  }, [campaign, phases]);

  const totalSteps = 7;
  const progressPercentage = currentStep ? (currentStep / totalSteps) * 100 : 0;

  const updateFormData = (field: keyof CampaignFormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Transformar dados do formulário para o formato da API
  const transformFormDataToApiData = (formData: CampaignFormData) => {
    const secondary_niches = formData.subniches 
      ? formData.subniches.split(",").filter(Boolean).map(id => parseInt(id, 10)).filter(id => !isNaN(id))
      : [];

    const buildPaymentDetails = () => {
      const baseDetails: { amount?: number; currency?: string; description?: string } = {};

      switch (formData.paymentType) {
        case "fixed":
          if (formData.paymentFixedAmount) {
            baseDetails.amount = parseInt(unformatCurrency(formData.paymentFixedAmount)) || 0;
            baseDetails.currency = "BRL";
            baseDetails.description = "Pagamento fixo por influenciador";
          }
          break;
        case "swap":
          if (formData.paymentSwapItem && formData.paymentSwapMarketValue) {
            baseDetails.description = `${formData.paymentSwapItem} - Valor de mercado: ${formData.paymentSwapMarketValue}`;
            baseDetails.amount = parseInt(unformatCurrency(formData.paymentSwapMarketValue)) || 0;
            baseDetails.currency = "BRL";
          }
          break;
        case "cpa":
          if (formData.paymentCpaActions && formData.paymentCpaValue) {
            baseDetails.description = `Ações que geram CPA: ${formData.paymentCpaActions} - Valor: ${formData.paymentCpaValue}`;
            baseDetails.amount = parseInt(unformatCurrency(formData.paymentCpaValue)) || 0;
            baseDetails.currency = "BRL";
          }
          break;
        case "cpm":
          if (formData.paymentCpmValue) {
            baseDetails.amount = parseInt(unformatCurrency(formData.paymentCpmValue)) || 0;
            baseDetails.currency = "BRL";
          }
          break;
        case "price":
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
    };
  };

  // Transformar fases do formulário para o formato da API
  const transformPhasesToApiData = (phases: CampaignFormData["phases"]): CreatePhaseData[] => {
    console.log("🔍 transformPhasesToApiData - Fases recebidas:", phases);
    
    const filtered = phases.filter((phase) => {
      const isValid = phase.objective && phase.postDate;
      if (!isValid) {
        console.log("❌ Fase filtrada (inválida):", {
          id: phase.id,
          objective: phase.objective,
          postDate: phase.postDate,
          hasObjective: !!phase.objective,
          hasPostDate: !!phase.postDate,
        });
      }
      return isValid;
    });
    
    console.log("✅ Fases válidas após filtro:", filtered.length);
    
    return filtered.map((phase) => {
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
      if (!formData.title || !formData.description) {
        toast.error("Por favor, preencha todos os campos obrigatórios");
        return;
      }

      // Atualizar campanha
      const campaignData = transformFormDataToApiData(formData);
      await updateCampaignMutation.mutateAsync({
        campaignId,
        data: campaignData,
      });

      // Atualizar fases
      console.log("=== INÍCIO ATUALIZAÇÃO DE FASES ===");
      console.log("Fases no formData antes da transformação:", formData.phases);
      console.log("Quantidade de fases no formData:", formData.phases.length);
      // Log detalhado de cada fase
      formData.phases.forEach((phase, index) => {
        console.log(`Fase ${index + 1}:`, {
          id: phase.id,
          objective: phase.objective,
          postDate: phase.postDate,
          formats: phase.formats,
          files: phase.files,
          objectiveType: typeof phase.objective,
          postDateType: typeof phase.postDate,
        });
      });
      
      const phasesData = transformPhasesToApiData(formData.phases);
      console.log("Fases transformadas para API:", phasesData);
      console.log("Quantidade de fases transformadas:", phasesData.length);
      console.log("Fases existentes (do servidor):", phases);
      console.log("Quantidade de fases existentes:", phases.length);
      
      if (phasesData.length === 0 && formData.phases.length > 0) {
        console.warn("Nenhuma fase válida após transformação. Verifique se objective e postDate estão preenchidos.");
        const invalidPhases = formData.phases.filter((p) => !p.objective || !p.postDate);
        console.warn("Fases inválidas:", invalidPhases);
        toast.warning("Algumas fases não foram salvas. Verifique se todos os campos obrigatórios (Objetivo, Data, Hora) estão preenchidos.");
      }

      // Mapear fases existentes por ID (public_id)
      const existingPhasesMap = new Map(
        phases.map((p: any) => {
          const phaseId = p.id || p.public_id;
          return [phaseId, p];
        })
      );
      
      // Mapear fases do formulário por ID (incluindo temporários)
      const formPhasesMap = new Map(
        formData.phases.map((p) => [p.id, p])
      );
      
      console.log("Fases existentes mapeadas (IDs):", Array.from(existingPhasesMap.keys()));
      console.log("Fases do formulário mapeadas (IDs):", Array.from(formPhasesMap.keys()));

      // Deletar fases que foram removidas do formulário
      for (const existingPhaseId of existingPhasesMap.keys()) {
        if (!formPhasesMap.has(existingPhaseId)) {
          try {
            console.log("🗑️ Deletando fase removida:", existingPhaseId);
            await deleteCampaignPhase(campaignId, existingPhaseId);
            console.log("✅ Fase deletada com sucesso:", existingPhaseId);
          } catch (error: any) {
            console.error("❌ Erro ao deletar fase:", error);
            const errorMessage = error?.message || error?.data?.message || error?.error || "Erro desconhecido";
            toast.error(`Erro ao deletar fase: ${errorMessage}`);
          }
        }
      }

      // Criar ou atualizar fases (seguindo a ordem do formulário)
      if (phasesData.length > 0) {
        console.log(`Processando ${phasesData.length} fase(s)...`);
        
        // Processar fases na ordem do formulário para manter a sequência
        for (let i = 0; i < phasesData.length; i++) {
          const phaseData = phasesData[i];
          const originalFormPhase = formData.phases[i]; // Usar índice para correspondência direta
          
          // Verificar se é uma fase existente (tem ID válido que existe no servidor)
          const phaseId = originalFormPhase?.id;
          const isExistingPhase = phaseId && 
                                  existingPhasesMap.has(phaseId) &&
                                  phaseId !== "1" && 
                                  !phaseId.startsWith("temp-") &&
                                  phaseId.length > 10; // IDs UUID são longos

          if (isExistingPhase && phaseId) {
            // Atualizar fase existente
            try {
              console.log(`[${i + 1}/${phasesData.length}] 🔄 Atualizando fase existente:`, phaseId);
              console.log("Dados da fase:", JSON.stringify(phaseData, null, 2));
              await updateCampaignPhase(campaignId, phaseId, phaseData);
              console.log("✅ Fase atualizada com sucesso:", phaseId);
            } catch (error: any) {
              console.error("❌ Erro ao atualizar fase:", error);
              const errorMessage = error?.message || error?.data?.message || error?.error || "Erro desconhecido";
              toast.error(`Erro ao atualizar fase ${i + 1}: ${errorMessage}`);
            }
          } else {
            // Criar nova fase
            try {
              console.log(`[${i + 1}/${phasesData.length}] ➕ Criando nova fase`);
              console.log("ID da fase no form:", phaseId || "sem ID (nova)");
              console.log("Dados da fase:", JSON.stringify(phaseData, null, 2));
              const newPhase = await createCampaignPhase(campaignId, phaseData);
              console.log("✅ Fase criada com sucesso:", newPhase);
            } catch (error: any) {
              console.error("❌ Erro ao criar fase:", error);
              const errorMessage = error?.message || error?.data?.message || error?.error || "Erro desconhecido";
              toast.error(`Erro ao criar fase ${i + 1}: ${errorMessage}`);
            }
          }
        }
      } else {
        console.warn("Nenhuma fase válida para processar (criar/atualizar)");
        if (formData.phases.length === 0) {
          console.log("Nenhuma fase no formulário. Todas as fases existentes serão mantidas.");
        }
      }
      
      console.log("=== FIM ATUALIZAÇÃO DE FASES ===");

      // Fazer upload do banner se houver novo arquivo
      const bannerFile = (formData as any).bannerFile;
      if (bannerFile instanceof File) {
        try {
          await uploadCampaignBanner(campaignId, bannerFile);
        } catch (error: any) {
          console.error("Erro ao fazer upload do banner:", error);
          toast.error("Campanha atualizada, mas houve um erro ao fazer upload do banner.");
        }
      }

      // Invalidar cache
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      queryClient.invalidateQueries({ queryKey: ["campaigns", campaignId] });
      queryClient.invalidateQueries({ queryKey: ["campaigns", campaignId, "dashboard"] });

      toast.success("Campanha atualizada com sucesso!");
      navigate({ to: "/campaigns/$campaignId", params: { campaignId } });
    } catch (error: any) {
      console.error("Erro ao atualizar campanha:", error);
      toast.error(error?.message || "Erro ao atualizar campanha. Tente novamente.");
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <CreateCampaignStepOne
            formData={formData}
            updateFormData={updateFormData}
            onNext={() => setCurrentStep(2)}
          />
        );
      case 2:
        return (
          <CreateCampaignStepTwo
            formData={formData}
            updateFormData={updateFormData}
            onBack={() => setCurrentStep(1)}
            onNext={() => setCurrentStep(3)}
          />
        );
      case 3:
        return (
          <CreateCampaignStepThree
            formData={formData}
            updateFormData={updateFormData}
            onBack={() => setCurrentStep(2)}
            onNext={() => setCurrentStep(4)}
          />
        );
      case 4:
        return (
          <CreateCampaignStepFour
            formData={formData}
            updateFormData={updateFormData}
            onBack={() => setCurrentStep(3)}
            onNext={() => setCurrentStep(5)}
          />
        );
      case 5:
        return (
          <CreateCampaignStepFive
            formData={formData}
            updateFormData={updateFormData}
            onBack={() => setCurrentStep(4)}
            onNext={() => setCurrentStep(6)}
          />
        );
      case 6:
        return (
          <CreateCampaignStepSix
            formData={formData}
            updateFormData={updateFormData}
            onBack={() => setCurrentStep(5)}
            onNext={() => setCurrentStep(7)}
          />
        );
      case 7:
        return (
          <CreateCampaignStepSeven
            formData={formData}
            onBack={() => setCurrentStep(6)}
            onEdit={(step) => setCurrentStep(step)}
            onSubmitCampaign={handleSubmitCampaign}
            isLoading={updateCampaignMutation.isPending}
          />
        );
      default:
        return null;
    }
  };

  if (isLoadingCampaign || isLoadingDashboard) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-neutral-600">Carregando...</p>
      </div>
    );
  }

  if (campaignError || !campaign) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-neutral-600">Erro ao carregar campanha</p>
      </div>
    );
  }

  // Verificar se a campanha está em DRAFT
  const campaignStatus = (campaign.status as any)?.value || campaign.status;
  if (campaignStatus !== "draft") {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4">
        <p className="text-neutral-600">Apenas campanhas em rascunho podem ser editadas</p>
        <Button
          variant="outline"
          onClick={() => navigate({ to: "/campaigns/$campaignId", params: { campaignId } })}
        >
          Voltar para a campanha
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-neutral-50 -m-6">
      {/* Header */}
      <div className="bg-white border-b border-neutral-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              style={{ width: "fit-content" }}
              onClick={() => navigate({ to: "/campaigns/$campaignId", params: { campaignId } })}
            >
              <Icon name="ArrowLeft" size={16} color="#404040" />
            </Button>
            <div>
              <h1 className="text-2xl font-semibold text-neutral-950">Editar campanha</h1>
              <p className="text-sm text-neutral-600">{campaign.title}</p>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-4">
          <ProgressBar progressPercentage={progressPercentage} color="bg-primary-500" />
          <p className="text-xs text-neutral-600 mt-1">
            Passo {currentStep} de {totalSteps}
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-4xl mx-auto">{renderStep()}</div>
      </div>
    </div>
  );
}
