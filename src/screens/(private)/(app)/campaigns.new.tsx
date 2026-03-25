import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { CreateCampaignStepOne } from "@/components/forms/create-campaign-step-one";
import { CreateCampaignStepTwo } from "@/components/forms/create-campaign-step-two";
import { CreateCampaignStepThree } from "@/components/forms/create-campaign-step-three";
import { CreateCampaignStepFour } from "@/components/forms/create-campaign-step-four";
import { CreateCampaignStepFive } from "@/components/forms/create-campaign-step-five";
import { CreateCampaignStepSeven } from "@/components/forms/create-campaign-step-seven";
import type { CampaignFormData } from "@/shared/types";
import { useCreateCampaign } from "@/hooks/use-campaigns";
import type { CreateCampaignData } from "@/shared/services/campaign";
import { createCampaignPhase, type CreatePhaseData } from "@/shared/services/phase";
import { uploadCampaignBanner } from "@/shared/services/campaign";
import { unformatNumber, currencyToNumber } from "@/shared/utils/masks";
import { suggestMuralEndDateFromFormPhases } from "@/shared/utils/date-validations";
import { aggregateImageRightsPeriodMonths } from "@/shared/utils/campaign-image-rights";
import { activateMural } from "@/shared/services/mural";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export const Route = createFileRoute("/(private)/(app)/campaigns/new" as "/(private)/(app)/campaigns/new")({
  component: CreateCampaignPage,
});

/** Stepper labels – 6 steps: Briefing, Influenciadores, Remuneração, Materiais, Fases, Revisão */
const STEP_LABELS = [
  "Briefing",
  "Influenciadores",
  "Remuneração",
  "Materiais",
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
  gender: "all",
  paymentType: "",
  paymentFixedAmount: "",
  paymentSwapItem: "",
  paymentSwapMarketValue: "",
  paymentCpaActions: "",
  paymentCpaValue: "",
  paymentCpmValue: "",
  benefitsBonus: "",
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
      postTime: "18:00",
      includeImageRights: true,
      imageRightsPeriod: "",
      formats: [],
      files: "",
    },
  ],
  campaignVisibility: "public",
};

function CreateCampaignPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [currentStep, setCurrentStep] = useState(1);
  const [isCreatingCampaign, setIsCreatingCampaign] = useState(false);
  const [formData, setFormData] = useState<CampaignFormData>(initialFormData);

  const createCampaignMutation = useCreateCampaign();
  const totalSteps = 6;

  const updateFormData = (field: keyof CampaignFormData, value: unknown) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const transformFormDataToApiData = (formData: CampaignFormData): CreateCampaignData => {
    const secondary_niches = formData.subniches
      ? formData.subniches.split(",").filter(Boolean).map((id) => parseInt(id, 10)).filter((id) => !isNaN(id))
      : [];

    const buildPaymentDetails = () => {
      const benefitsList = Array.isArray(formData.benefits)
        ? formData.benefits.filter((item) => item.trim() !== "")
        : formData.benefits ? [String(formData.benefits).trim()].filter(Boolean) : [];
      const parts: string[] = [];
      if (formData.benefitsBonus?.trim()) {
        parts.push(`Bônus: ${formData.benefitsBonus.trim()}`);
      }
      if (benefitsList.length > 0) {
        parts.push(benefitsList.join("\n"));
      }
      const baseDetails: { amount?: number; currency?: string; description?: string } = {
        description: parts.join("\n\n") || "",
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
      if (parts.length > 0) {
        baseDetails.description = [baseDetails.description, parts.join("\n\n")].filter(Boolean).join("\n\n");
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
      image_rights_period: aggregateImageRightsPeriodMonths(formData.phases),
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
        const publishTime = phase.postTime?.trim();
        const contentDl = phase.contentSubmissionDeadline?.trim();
        const correctionDl = phase.correctionSubmissionDeadline?.trim();
        const tag = phase.hashtag?.trim();

        return {
          objective: phase.objective,
          post_date: phase.postDate,
          ...(publishTime ? { publish_time: publishTime } : {}),
          ...(contentDl ? { content_submission_deadline: contentDl } : {}),
          ...(correctionDl ? { correction_submission_deadline: correctionDl } : {}),
          ...(tag ? { hashtag: tag } : {}),
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

      let successDescription: string | undefined;
      if (formData.campaignVisibility !== "private") {
        const muralEnd = suggestMuralEndDateFromFormPhases(formData.phases);
        if (muralEnd) {
          try {
            await activateMural(createdCampaign.id, { end_date: muralEnd });
            queryClient.invalidateQueries({
              queryKey: ["campaigns", createdCampaign.id, "mural"],
            });
            successDescription =
              "A campanha está no mural (Descobrir) com data limite sugerida a partir da fase 1.";
          } catch {
            toast.error(
              "Campanha criada, mas não foi possível ativar o Descobrir. Ative manualmente na campanha."
            );
          }
        } else {
          successDescription =
            "Ajuste a data da fase 1 ou ative o Descobrir manualmente na campanha.";
        }
      }

      toast.success("Campanha criada com sucesso!", {
        ...(successDescription ? { description: successDescription } : {}),
      });
      setIsCreatingCampaign(false);
      navigate({ to: "/campaigns/$campaignId", params: { campaignId: createdCampaign.id } });
    } catch (error: unknown) {
      const err = error as { message?: string };
      toast.error(err?.message || "Erro ao criar campanha. Tente novamente.");
      setIsCreatingCampaign(false);
    }
  };

  const DRAFT_KEY = "hypeapp-campaign-draft-new";

  const handleSaveDraft = () => {
    try {
      const { bannerFile: _bf, ...rest } = formData as CampaignFormData & {
        bannerFile?: File;
      };
      localStorage.setItem(
        DRAFT_KEY,
        JSON.stringify({ savedAt: new Date().toISOString(), step: 6, data: rest })
      );
      toast.success("Rascunho salvo", {
        description:
          "Os dados foram guardados neste navegador. Conclua e envie a campanha quando quiser.",
        duration: 6000,
      });
    } catch {
      toast.error("Não foi possível salvar o rascunho. Tente de novo.");
    }
  };

  const handleContinue = () => {
    if (currentStep < totalSteps) {
      setCurrentStep((s) => s + 1);
    }
  };

  const handleFooterBack = () => {
    if (currentStep <= 1) {
      navigate({ to: "/campaigns" });
    } else {
      setCurrentStep((s) => s - 1);
    }
  };

  return (
    <div className="flex flex-col min-h-[calc(100vh-8rem)] max-w-6xl mx-auto">
      {/* Stepper – design Figma (6 steps, roxo #c252dc, gap 16px/8px) */}
      <div className="flex gap-4 items-center mb-8 w-full">
        {STEP_LABELS.map((label, index) => {
          const stepNum = index + 1;
          const isActive = currentStep === stepNum;
          return (
            <div key={`step-${stepNum}`} className="flex gap-4 items-center shrink-0">
              <div
                className={`flex gap-2 items-center justify-center pb-3 shrink-0 ${
                  isActive ? "border-b-[3px] border-tertiary-500" : ""
                }`}
              >
                <div
                  className={`flex items-center justify-center rounded-full size-7 text-sm font-bold shrink-0 ${
                    isActive
                      ? "bg-tertiary-500 text-white"
                      : "border border-[#e5e5e5] text-[#7c7c7c]"
                  }`}
                >
                  {stepNum}
                </div>
                <span className="text-base whitespace-nowrap text-[#7c7c7c]">
                  {label}
                </span>
              </div>
              {index < STEP_LABELS.length - 1 && (
                <div
                  className="h-px flex-1 min-w-[40px] bg-[#e5e5e5] self-center"
                  aria-hidden
                />
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
          />
        )}
        {currentStep === 2 && (
          <CreateCampaignStepTwo
            formData={formData}
            updateFormData={updateFormData}
            onBack={() => setCurrentStep(1)}
            onNext={handleContinue}
            hideBackButton
          />
        )}
        {currentStep === 3 && (
          <CreateCampaignStepThree
            formData={formData}
            updateFormData={updateFormData}
            onBack={() => setCurrentStep(2)}
            onNext={handleContinue}
            hideBackButton
          />
        )}
        {currentStep === 4 && (
          <CreateCampaignStepFour
            formData={formData}
            updateFormData={updateFormData}
            onBack={() => setCurrentStep(3)}
            onNext={handleContinue}
            hideBackButton
          />
        )}
        {currentStep === 5 && (
          <CreateCampaignStepFive
            formData={formData}
            updateFormData={updateFormData}
            onBack={() => setCurrentStep(4)}
            onNext={handleContinue}
            hideBackButton
          />
        )}
        {currentStep === 6 && (
          <CreateCampaignStepSeven
            formData={formData}
            updateFormData={updateFormData}
            onBack={() => setCurrentStep(5)}
            onEdit={(step) => setCurrentStep(step)}
            onSubmitCampaign={handleSubmitCampaign}
            onSaveDraft={handleSaveDraft}
            isLoading={isCreatingCampaign || createCampaignMutation.isPending}
          />
        )}
      </div>

      {/* Barra fixa: Voltar + Continuar */}
      {currentStep < 6 && (
        <div className="mt-10 flex items-center justify-between gap-4 rounded-xl border-t border-[#e5e5e5] bg-[#FAFAFA] p-6 z-10">
          <Button
            type="button"
            variant="outline"
            onClick={handleFooterBack}
            className="h-11 min-w-0 shrink-0 rounded-[24px] border-[#e5e5e5] px-4 font-semibold text-neutral-700 w-min"
          >
            <span className="flex items-center gap-2">
              <Icon name="ArrowLeft" color="#404040" size={16} />
              Voltar
            </span>
          </Button>
          <Button
            type="button"
            onClick={handleContinue}
            className="h-11 shrink-0 rounded-[24px] bg-primary-600 px-4 font-semibold text-white hover:bg-primary-700 w-min"
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
