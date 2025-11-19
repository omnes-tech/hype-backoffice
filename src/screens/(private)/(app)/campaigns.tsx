import { useState } from "react";

import { createFileRoute } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { ProgressBar } from "@/components/ui/progress-bar";
import { CreateCampaignStepOne } from "@/components/forms/create-campaign-step-one";
import { CreateCampaignStepTwo } from "@/components/forms/create-campaign-step-two";
import { CreateCampaignStepThree } from "@/components/forms/create-campaign-step-three";
import { CreateCampaignStepFour } from "@/components/forms/create-campaign-step-four";
import { toast } from "sonner";

export const Route = createFileRoute("/(private)/(app)/campaigns")({
  component: RouteComponent,
});

function RouteComponent() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);

  const totalSteps = 4;
  const progressPercentage = currentStep ? (currentStep / totalSteps) * 100 : 0;

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setCurrentStep(1);
  };

  return (
    <div className="w-full h-full flex items-center justify-center">
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
              </span>

              <span className="text-xs text-neutral-700">
                Etapa {currentStep} de {totalSteps}
              </span>
            </div>
          </div>

          {currentStep === 1 && (
            <CreateCampaignStepOne
              onNext={() => {
                setCurrentStep(currentStep + 1);
              }}
            />
          )}

          {currentStep === 2 && (
            <CreateCampaignStepTwo
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
              onBack={() => {
                setCurrentStep(currentStep - 1);
              }}
              onSubmitCampaign={() => {
                toast.success("Campanha enviada com sucesso!");
                setIsModalOpen(false);
                setCurrentStep(1);
              }}
            />
          )}
        </Modal>
      )}
    </div>
  );
}
