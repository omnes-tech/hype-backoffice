import { useState, useEffect, useRef, useMemo } from "react";
import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { CreateCampaignStepOne } from "@/components/forms/create-campaign-step-one";
import { CreateCampaignStepTwo } from "@/components/forms/create-campaign-step-two";
import { CreateCampaignStepThree } from "@/components/forms/create-campaign-step-three";
import { CreateCampaignStepFour } from "@/components/forms/create-campaign-step-four";
import { CreateCampaignStepFive } from "@/components/forms/create-campaign-step-five";
import { CreateCampaignStepSeven } from "@/components/forms/create-campaign-step-seven";

import type { CampaignFormData } from "@/shared/types";
import { useCampaign } from "@/hooks/use-campaigns";
import { useUpdateCampaign } from "@/hooks/use-campaigns";
import { useCampaignDashboard } from "@/hooks/use-campaign-dashboard";
import {
  campaignPhasesListIsPresent,
  mapApiPhasesToCampaignPhases,
} from "@/shared/services/dashboard";
import { uploadCampaignBanner } from "@/shared/services/campaign";
import { formatReais } from "@/shared/utils/masks";
import { suggestMuralEndDateFromFormPhases } from "@/shared/utils/date-validations";
import type { CampaignPhaseUpsertPayload } from "@/shared/services/phase";
import {
  buildCampaignUpdatePayloadFromForm,
  buildPhasesPayloadFromForm,
  buildPutCampaignUpdateBody,
  mergePaymentDetailsWithServer,
} from "@/shared/utils/campaign-edit-request";
import { activateMural } from "@/shared/services/mural";
import { getSubnicheValueByLabel } from "@/shared/data/subniches";
import { getNicheParentId } from "@/shared/utils/niche-tree";
import { useQueryClient } from "@tanstack/react-query";
import { getUploadUrl } from "@/lib/utils/api";
import { useNiches } from "@/hooks/use-niches";
import { getCampaignStatusValue } from "@/shared/utils/campaign-status";

export const Route = createFileRoute("/(private)/(app)/campaigns/$campaignId/edit")({
  component: RouteComponent,
});

/** Mesmo stepper da criação (6 passos). */
const STEP_LABELS = [
  "Briefing",
  "Influenciadores",
  "Remuneração",
  "Materiais",
  "Fases",
  "Revisão",
];

function RouteComponent() {
  const navigate = useNavigate();
  const { campaignId } = useParams({ from: "/(private)/(app)/campaigns/$campaignId/edit" });
  const [currentStep, setCurrentStep] = useState(6);
  const [focusPhaseId, setFocusPhaseId] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const formInitializedRef = useRef(false);
  /** Snapshot campanha (sem substituir fases) + fases — para diff alinhado à API de PUT. */
  const initialCampaignApiPayloadRef = useRef<ReturnType<
    typeof buildCampaignUpdatePayloadFromForm
  > | null>(null);
  const initialPhasesApiPayloadRef = useRef<CampaignPhaseUpsertPayload[] | null>(null);

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

  const phasesFromCampaignDetail = useMemo(() => {
    if (!campaign || !campaignPhasesListIsPresent(campaign.phases)) {
      return null;
    }
    return mapApiPhasesToCampaignPhases(campaign.phases);
  }, [campaign, campaign?.phases]);

  const phases =
    phasesFromCampaignDetail !== null
      ? phasesFromCampaignDetail
      : dashboardData?.phases ?? [];
  const updateCampaignMutation = useUpdateCampaign();
  
  // Buscar nichos para determinar o nicho principal na edição
  const { data: niches = [] } = useNiches();

  // Inicializar formData com dados da campanha
  const [formData, setFormData] = useState<CampaignFormData>({
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
    phases: [],
    benefitsBonus: "",
    campaignVisibility: "public",
  });

  // Carregar dados da campanha no formData apenas uma vez (quando disponível)
  useEffect(() => {
    if (formInitializedRef.current) return;
    if (campaign && phases) {
      formInitializedRef.current = true;
      // Processar subnichos
      const subnicheIds = Array.isArray(campaign.secondary_niches)
        ? campaign.secondary_niches
            .map((n: any) => {
              const name = typeof n === 'object' ? n.name : String(n);
              return getSubnicheValueByLabel(name);
            })
            .filter(Boolean)
        : campaign.secondary_niches 
          ? [getSubnicheValueByLabel(String(campaign.secondary_niches))]
          : [];
      
      let mainNicheId = "";
      if (campaign.primary_niche?.id != null) {
        mainNicheId = String(campaign.primary_niche.id);
      } else if (subnicheIds.length > 0 && niches.length > 0) {
        const rawFirst = subnicheIds[0];
        const firstSubniche = niches.find(
          (n) => String(n.id) === String(rawFirst),
        );
        const parentKey = firstSubniche
          ? getNicheParentId(firstSubniche)
          : null;
        if (parentKey) {
          mainNicheId = parentKey;
        }
      }
      
      const initialForm: CampaignFormData = {
        title: campaign.title || "",
        description: campaign.description || "",
        mainNiche: mainNicheId,
        subniches: subnicheIds.join(","),
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
          ? formatReais(campaign.payment_method_details.amount)
          : "",
        paymentSwapItem: campaign.payment_method === "swap" && campaign.payment_method_details?.description
          ? campaign.payment_method_details.description.split(" - Valor de mercado:")[0]?.trim() || ""
          : "",
        paymentSwapMarketValue: campaign.payment_method === "swap" && campaign.payment_method_details?.amount
          ? formatReais(campaign.payment_method_details.amount)
          : "",
        paymentCpaActions: campaign.payment_method === "cpa" && campaign.payment_method_details?.description
          ? campaign.payment_method_details.description
              .replace("Ações que geram CPA:", "")
              .split(" - Valor:")[0]
              ?.trim() || ""
          : "",
        paymentCpaValue: campaign.payment_method === "cpa" && campaign.payment_method_details?.amount
          ? formatReais(campaign.payment_method_details.amount)
          : "",
        paymentCpmValue: campaign.payment_method === "cpm" && campaign.payment_method_details?.amount
          ? formatReais(campaign.payment_method_details.amount)
          : "",
        benefits: campaign.benefits
          ? (() => {
              // Se já for um array, retornar diretamente
              if (Array.isArray(campaign.benefits)) {
                return campaign.benefits.filter(item => item.trim() !== "").length > 0 
                  ? campaign.benefits.filter(item => item.trim() !== "") 
                  : [""];
              }
              // Se for string, fazer parsing (compatibilidade com dados antigos)
              const lines = campaign.benefits.split(/\n/).map(line => line.trim()).filter(line => line);
              // Se tiver marcadores (., -, •), usar a lógica de parsing
              if (lines.some(line => line.startsWith('.') || line.startsWith('-') || line.startsWith('•'))) {
                return lines
                  .filter(line => line.startsWith('.') || line.startsWith('-') || line.startsWith('•'))
                  .map(line => line.replace(/^[.\-•]\s*/, '').trim())
                  .filter(line => line);
              }
              // Caso contrário, retornar como array simples (cada linha é um item)
              return lines.length > 0 ? lines : [""];
            })()
          : [""],
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
        phases: [...phases]
          .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
          .map((phase) => ({
            ...phase,
            includeImageRights: (campaign.image_rights_period ?? 0) > 0,
            imageRightsPeriod:
              (campaign.image_rights_period ?? 0) > 0
                ? String(campaign.image_rights_period)
                : "",
            files: phase.files ?? "",
          })),
        benefitsBonus: "",
        campaignVisibility: "public",
      };

      const rawInitialPayload = buildCampaignUpdatePayloadFromForm(initialForm);
      initialCampaignApiPayloadRef.current = mergePaymentDetailsWithServer(
        rawInitialPayload,
        campaign
      );
      initialPhasesApiPayloadRef.current = buildPhasesPayloadFromForm(initialForm);
      setFormData(initialForm);
    }
  }, [campaign, phases, niches]);

  const totalSteps = 6;

  const updateFormData = (field: keyof CampaignFormData, value: unknown) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Handler para submissão do formulário
  const handleSubmitCampaign = async () => {
    try {
      if (!campaign) {
        toast.error("Campanha não carregada. Atualize a página e tente de novo.");
        return;
      }
      if (!formData.title || !formData.description) {
        toast.error("Por favor, preencha todos os campos obrigatórios");
        return;
      }

      const incompletePhases = formData.phases.some(
        (p) => !p.objective || !p.postDate
      );
      if (incompletePhases) {
        toast.warning(
          "Algumas fases estão incompletas (objetivo e data obrigatórios). Ajuste antes de salvar."
        );
        return;
      }

      const campaignDataRaw = buildCampaignUpdatePayloadFromForm(formData);
      const nextMerged = mergePaymentDetailsWithServer(campaignDataRaw, campaign);
      const baseline = initialCampaignApiPayloadRef.current;
      const baselinePhases = initialPhasesApiPayloadRef.current ?? [];
      const nextPhases = buildPhasesPayloadFromForm(formData);

      const putBody = baseline
        ? buildPutCampaignUpdateBody({
            baseline,
            nextMerged,
            baselinePhases,
            nextPhases,
          })
        : { ...nextMerged, phases: nextPhases };

      await updateCampaignMutation.mutateAsync({
        campaignId,
        data: putBody,
      });

      // Fazer upload do banner se houver novo arquivo
      const bannerFile = (formData as any).bannerFile;
      if (bannerFile instanceof File) {
        try {
          await uploadCampaignBanner(campaignId, bannerFile);
        } catch {
          toast.error("Campanha atualizada, mas houve um erro ao fazer upload do banner.");
        }
      }

      // Invalidar cache
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      queryClient.invalidateQueries({ queryKey: ["campaigns", campaignId] });
      queryClient.invalidateQueries({ queryKey: ["campaigns", campaignId, "dashboard"] });

      let successDescription: string | undefined;
      const stillDraft = getCampaignStatusValue(campaign?.status) === "draft";
      if (formData.campaignVisibility !== "private" && stillDraft) {
        const muralEnd = suggestMuralEndDateFromFormPhases(formData.phases);
        if (muralEnd) {
          try {
            await activateMural(campaignId, { end_date: muralEnd });
            queryClient.invalidateQueries({
              queryKey: ["campaigns", campaignId, "mural"],
            });
            successDescription =
              "A campanha está no mural (Descobrir) com data limite sugerida a partir da fase 1.";
          } catch {
            toast.error(
              "Campanha salva, mas não foi possível ativar o Descobrir. Ative manualmente na campanha."
            );
          }
        } else {
          successDescription =
            "Ajuste a data da fase 1 ou ative o Descobrir manualmente na campanha.";
        }
      }

      toast.success("Campanha atualizada com sucesso!", {
        ...(successDescription ? { description: successDescription } : {}),
      });
      navigate({ to: "/campaigns/$campaignId", params: { campaignId } });
    } catch (error: any) {
      toast.error(error?.message || "Erro ao atualizar campanha. Tente novamente.");
    }
  };

  const handleContinue = () => {
    if (currentStep < totalSteps) {
      if (currentStep === 5) setFocusPhaseId(null);
      setCurrentStep((s) => s + 1);
    }
  };

  const handleFooterBack = () => {
    if (currentStep <= 1) {
      navigate({ to: "/campaigns/$campaignId", params: { campaignId } });
    } else {
      setCurrentStep((s) => s - 1);
    }
  };

  const handleEditFromReview = (step: number) => {
    if (step === 5) setFocusPhaseId(null);
    setCurrentStep(step);
  };

  const handleEditPhase = (phaseIndex: number) => {
    const p = formData.phases[phaseIndex];
    if (p?.id) {
      setFocusPhaseId(p.id);
      setCurrentStep(5);
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

  return (
    <div className="flex flex-col min-h-[calc(100vh-8rem)] max-w-6xl mx-auto">
      <div className="flex items-center gap-3 mb-4">
        <Button
          type="button"
          variant="outline"
          className="h-10 w-min shrink-0 rounded-[24px] border-[#e5e5e5] px-3"
          onClick={() => navigate({ to: "/campaigns/$campaignId", params: { campaignId } })}
        >
          <Icon name="ArrowLeft" size={16} color="#404040" />
        </Button>
        <div className="min-w-0">
          <h1 className="text-lg font-semibold text-neutral-950 truncate">Editar campanha</h1>
          <p className="text-sm text-neutral-600 truncate">{campaign.title}</p>
        </div>
      </div>

      <div className="flex gap-4 items-center mb-8 w-full">
        {STEP_LABELS.map((label, index) => {
          const stepNum = index + 1;
          const isActive = currentStep === stepNum;
          return (
            <div key={`edit-step-${stepNum}`} className="flex gap-4 items-center shrink-0">
              <button
                type="button"
                className={`flex gap-2 items-center justify-center pb-3 shrink-0 text-left ${
                  isActive ? "border-b-[3px] border-tertiary-500" : ""
                }`}
                onClick={() => {
                  if (stepNum === 5) setFocusPhaseId(null);
                  setCurrentStep(stepNum);
                }}
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
                <span className="text-base whitespace-nowrap text-[#7c7c7c]">{label}</span>
              </button>
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

      <div className="bg-white rounded-[12px] p-6 flex-1">
        {currentStep === 1 && (
          <CreateCampaignStepOne formData={formData} updateFormData={updateFormData} />
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
            focusPhaseId={focusPhaseId}
          />
        )}
        {currentStep === 6 && (
          <CreateCampaignStepSeven
            formData={formData}
            updateFormData={updateFormData}
            onBack={() => setCurrentStep(5)}
            onEdit={handleEditFromReview}
            onSubmitCampaign={handleSubmitCampaign}
            isLoading={updateCampaignMutation.isPending}
            onReviewBack={() =>
              navigate({ to: "/campaigns/$campaignId", params: { campaignId } })
            }
            onEditPhase={handleEditPhase}
            submitButtonLabel="Salvar alterações"
            submitLoadingLabel="Salvando..."
            reviewSubtitle="Escolha uma seção abaixo ou edite uma fase específica. Depois, salve as alterações."
          />
        )}
      </div>

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
