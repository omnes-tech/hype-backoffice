import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { CreateCampaignStepOne } from "@/components/forms/create-campaign-step-one";
import { CreateCampaignStepTwo } from "@/components/forms/create-campaign-step-two";
import { CreateCampaignStepThree } from "@/components/forms/create-campaign-step-three";
import { CreateCampaignStepFour } from "@/components/forms/create-campaign-step-four";
import { CreateCampaignStepFive } from "@/components/forms/create-campaign-step-five";
import { CreateCampaignStepSix } from "@/components/forms/create-campaign-step-six";
import { CreateCampaignStepSeven } from "@/components/forms/create-campaign-step-seven";
import type { CampaignFormData } from "@/shared/types";
import { useCreateCampaign } from "@/hooks/use-campaigns";
import type { CreateCampaignData } from "@/shared/services/campaign";
import { createCampaignPhase, type CreatePhaseData } from "@/shared/services/phase";
import { uploadCampaignBanner } from "@/shared/services/campaign";
import { unformatNumber, currencyToNumber } from "@/shared/utils/masks";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export const Route = createFileRoute("/(private)/(app)/campaigns/new" as "/(private)/(app)/campaigns/new")({
  component: CreateCampaignPage,
});

const STEP_LABELS = [
  "Briefing",
  "Influenciadores",
  "Remuneração",
  "Materiais",
  "Detalhes",
  "Fases",
  "Revisão",
];

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
    { id: "1", objective: "", postDate: "", formats: [], files: "" },
  ],
};

function CreateCampaignPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [currentStep, setCurrentStep] = useState(1);
  const [isCreatingCampaign, setIsCreatingCampaign] = useState(false);
  const [formData, setFormData] = useState<CampaignFormData>(initialFormData);

  const createCampaignMutation = useCreateCampaign();
  const totalSteps = 7;

  const updateFormData = (field: keyof CampaignFormData, value: unknown) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const transformFormDataToApiData = (formData: CampaignFormData): CreateCampaignData => {
    const secondary_niches = formData.subniches
      ? formData.subniches.split(",").filter(Boolean).map((id) => parseInt(id, 10)).filter((id) => !isNaN(id))
      : [];

    const buildPaymentDetails = () => {
      const baseDetails: { amount?: number; currency?: string; description?: string } = {
        description: Array.isArray(formData.benefits)
          ? formData.benefits.filter((item) => item.trim() !== "").join("\n")
          : (formData.benefits as string) || "",
      };
      switch (formData.paymentType) {
        case "fixed":
          if (formData.paymentFixedAmount) {
            baseDetails.amount = currencyToNumber(formData.paymentFixedAmount);
            baseDetails.currency = "BRL";
          }
          break;
        case "swap":
          baseDetails.description = `${formData.paymentSwapItem || ""}${formData.paymentSwapMarketValue ? ` - Valor de mercado: R$ ${formData.paymentSwapMarketValue}` : ""
            }`;
          if (formData.paymentSwapMarketValue) {
            baseDetails.amount = currencyToNumber(formData.paymentSwapMarketValue);
            baseDetails.currency = "BRL";
          }
          break;
        case "cpa":
          baseDetails.description = `Ações que geram CPA: ${formData.paymentCpaActions || ""}${formData.paymentCpaValue ? ` - Valor: R$ ${formData.paymentCpaValue}` : ""
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
        default:
          break;
      }
      return baseDetails;
    };

    return {
      title: formData.title,
      description: formData.description,
      objective: formData.generalObjective || "awareness",
      secondary_niches,
      max_influencers: parseInt(unformatNumber(formData.influencersCount), 10) || 0,
      payment_method: formData.paymentType || "fixed",
      payment_method_details: buildPaymentDetails(),
      benefits: Array.isArray(formData.benefits)
        ? formData.benefits.filter((item) => item.trim() !== "")
        : formData.benefits
          ? [formData.benefits].filter((item) => (item as string).trim() !== "")
          : [],
      rules_does: Array.isArray(formData.whatToDo)
        ? formData.whatToDo.filter((item) => item.trim() !== "")
        : formData.whatToDo
          ? [formData.whatToDo].filter((item) => (item as string).trim() !== "")
          : [],
      rules_does_not: Array.isArray(formData.whatNotToDo)
        ? formData.whatNotToDo.filter((item) => item.trim() !== "")
        : formData.whatNotToDo
          ? [formData.whatNotToDo].filter((item) => (item as string).trim() !== "")
          : [],
      segment_min_followers: formData.minFollowers ? parseInt(unformatNumber(formData.minFollowers), 10) : undefined,
      segment_state: formData.state ? formData.state.split(",").filter(Boolean) : undefined,
      segment_city: formData.city ? formData.city.split(",").filter(Boolean) : undefined,
      segment_genders: formData.gender && formData.gender !== "all" ? [formData.gender] : undefined,
      image_rights_period: formData.imageRightsPeriod ? parseInt(unformatNumber(formData.imageRightsPeriod), 10) : 0,
    };
  };

  const transformPhasesToApiData = (phases: CampaignFormData["phases"]): CreatePhaseData[] => {
    return phases
      .filter((phase) => phase.objective && phase.postDate)
      .map((phase) => {
        const formatsByNetwork: Record<string, { type: string; options: Array<{ type: string; quantity: number }> }> = {};
        phase.formats.forEach((format) => {
          const network = format.socialNetwork || "instagram";
          if (!formatsByNetwork[network]) {
            formatsByNetwork[network] = { type: network, options: [] };
          }
          formatsByNetwork[network].options.push({
            type: format.contentType || "post",
            quantity: parseInt(format.quantity, 10) || 1,
          });
        });
        return {
          objective: phase.objective,
          post_date: phase.postDate,
          formats: Object.values(formatsByNetwork).length > 0 ? Object.values(formatsByNetwork) : [],
          files: phase.files && phase.files.trim() ? [phase.files.trim()] : undefined,
        };
      });
  };

  const handleSubmitCampaign = async () => {
    try {
      setIsCreatingCampaign(true);
      if (!formData.title || !formData.description) {
        toast.error("Por favor, preencha todos os campos obrigatórios");
        setIsCreatingCampaign(false);
        return;
      }
      if (
        formData.mainNiche &&
        (!formData.subniches || formData.subniches.split(",").filter(Boolean).length === 0)
      ) {
        toast.error("Selecione pelo menos um subnicho da campanha.");
        setIsCreatingCampaign(false);
        return;
      }

      const campaignData = transformFormDataToApiData(formData);
      const createdCampaign = await createCampaignMutation.mutateAsync(campaignData);

      if (formData.phases && formData.phases.length > 0) {
        const phasesData = transformPhasesToApiData(formData.phases);
        if (phasesData.length > 0) {
          for (let i = 0; i < phasesData.length; i++) {
            try {
              await createCampaignPhase(createdCampaign.id, phasesData[i]);
            } catch (error: unknown) {
              const err = error as { message?: string };
              toast.error(`Erro ao criar fase ${i + 1}: ${err?.message || "Erro desconhecido"}`);
            }
          }
          queryClient.invalidateQueries({ queryKey: ["campaigns", createdCampaign.id, "dashboard"] });
        }
      }

      const bannerFile = (formData as CampaignFormData & { bannerFile?: File }).bannerFile;
      if (bannerFile instanceof File) {
        try {
          await uploadCampaignBanner(createdCampaign.id, bannerFile);
          queryClient.invalidateQueries({ queryKey: ["campaigns"] });
        } catch {
          toast.error("Campanha criada, mas houve um erro ao fazer upload do banner.");
        }
      }

      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      toast.success("Campanha criada com sucesso!");
      setIsCreatingCampaign(false);
      navigate({ to: "/campaigns/$campaignId", params: { campaignId: createdCampaign.id } });
    } catch (error: unknown) {
      const err = error as { message?: string };
      toast.error(err?.message || "Erro ao criar campanha. Tente novamente.");
      setIsCreatingCampaign(false);
    }
  };

  const handleSaveDraft = () => {
    toast.info("Rascunho salvo localmente. Conclua e envie quando estiver pronto.");
  };

  const handleContinue = () => {
    if (currentStep < totalSteps) {
      setCurrentStep((s) => s + 1);
    }
  };

  return (
    <div className="flex flex-col min-h-[calc(100vh-8rem)]">
      {/* Stepper - Figma style */}
      <div className="flex gap-2 items-center flex-wrap mb-8">
        {STEP_LABELS.map((label, index) => {
          const stepNum = index + 1;
          const isActive = currentStep === stepNum;
          return (
            <div key={label} className="flex gap-2 items-center">
              <div
                className={`flex gap-2 items-center justify-center pb-3 ${isActive ? "border-b-2 border-primary-600" : ""
                  }`}
              >
                <div
                  className={`flex items-center justify-center rounded-full size-7 text-sm font-bold shrink-0 ${isActive ? "bg-primary-600 text-white" : "border border-[#e5e5e5] text-[#7c7c7c]"
                    }`}
                >
                  {stepNum}
                </div>
                <span
                  className={`text-base whitespace-nowrap ${isActive ? "font-medium text-[#0A0A0A]" : "text-[#7c7c7c]"
                    }`}
                >
                  {label}
                </span>
              </div>
              {index < STEP_LABELS.length - 1 && (
                <div className="w-px min-w-px h-4 bg-[#e5e5e5] shrink-0 self-center" aria-hidden />
              )}
            </div>
          );
        })}
      </div>

      {/* Step content - white card */}
      <div className="bg-white rounded-[12px] p-6 flex-1">
        {currentStep === 1 && (
          <CreateCampaignStepOne
            formData={formData}
            updateFormData={updateFormData}
            onNext={handleContinue}
          />
        )}
        {currentStep === 2 && (
          <CreateCampaignStepTwo
            formData={formData}
            updateFormData={updateFormData}
            onBack={() => setCurrentStep(1)}
            onNext={handleContinue}
          />
        )}
        {currentStep === 3 && (
          <CreateCampaignStepThree
            formData={formData}
            updateFormData={updateFormData}
            onBack={() => setCurrentStep(2)}
            onNext={handleContinue}
          />
        )}
        {currentStep === 4 && (
          <CreateCampaignStepFour
            formData={formData}
            updateFormData={updateFormData}
            onBack={() => setCurrentStep(3)}
            onNext={handleContinue}
          />
        )}
        {currentStep === 5 && (
          <CreateCampaignStepFive
            formData={formData}
            updateFormData={updateFormData}
            onBack={() => setCurrentStep(4)}
            onNext={handleContinue}
          />
        )}
        {currentStep === 6 && (
          <CreateCampaignStepSix
            formData={formData}
            updateFormData={updateFormData}
            onBack={() => setCurrentStep(5)}
            onNext={handleContinue}
          />
        )}
        {currentStep === 7 && (
          <CreateCampaignStepSeven
            formData={formData}
            onBack={() => setCurrentStep(6)}
            onEdit={(step) => setCurrentStep(step)}
            onSubmitCampaign={handleSubmitCampaign}
            isLoading={isCreatingCampaign || createCampaignMutation.isPending}
          />
        )}
      </div>

      {/* Sticky footer - Figma style */}
      {currentStep < 7 && (
        <div className="bg-[#FAFAFA] border-t border-[#e5e5e5] p-6 flex justify-end gap-2 rounded-xl mt-10 z-10">
          <Button
            type="button"
            variant="outline"
            onClick={handleSaveDraft}
            className="border-[#e5e5e5] bg-white text-black rounded-[24px] px-4 py-2.5 font-semibold"
          >
            <span className="flex items-center gap-2">
              Salvar rascunho
              <Icon name="ArrowRight" color="#0A0A0A" size={16} />
            </span>
          </Button>
          <Button
            type="button"
            onClick={handleContinue}
            className="bg-primary-600 text-white rounded-[24px] px-4 py-2.5 font-semibold"
          >
            <span className="flex items-center gap-2">
              Continuar
              <Icon name="ArrowRight" color="#FAFAFA" size={16} />
            </span>
          </Button>
        </div>
      )}
    </div>
  );
}
