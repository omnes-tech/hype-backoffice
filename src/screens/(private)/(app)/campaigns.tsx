import { useState } from "react";

import { createFileRoute } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { ProgressBar } from "@/components/ui/progress-bar";
import { CreateCampaignStepOne } from "@/components/forms/create-campaign-step-one";
import { CreateCampaignStepTwo } from "@/components/forms/create-campaign-step-two";
import { CreateCampaignStepThree } from "@/components/forms/create-campaign-step-three";
import { CreateCampaignStepFour } from "@/components/forms/create-campaign-step-four";
import { CampaignCard } from "@/components/campaign-card";
import { InputSearch } from "@/components/ui/input-search";
import { Icon } from "@/components/ui/icon";
import { Dropdown } from "@/components/ui/dropdown";
import { toast } from "sonner";

export const Route = createFileRoute("/(private)/(app)/campaigns")({
  component: RouteComponent,
});

const campaigns = [
  {
    id: 1,
    title: "Verão 2024: Moda Praia",
    phase: "Fase 1",
    progressPercentage: 25,
    influencersCount: 23,
    banner:
      "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.1.0",
  },
  {
    id: 2,
    title: "Tecnologia e Inovação",
    phase: "Fase 2",
    progressPercentage: 50,
    influencersCount: 100,
    banner:
      "https://images.unsplash.com/photo-1518770660439-4636190af475?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.1.0",
  },
  {
    id: 3,
    title: "Gastronomia Premium",
    phase: "Fase 3",
    progressPercentage: 75,
    influencersCount: 6,
    banner:
      "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.1.0",
  },
  {
    id: 4,
    title: "Fitness e Bem-estar",
    phase: "Fase 2",
    progressPercentage: 45,
    influencersCount: 8,
    banner:
      "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.1.0",
  },
  {
    id: 5,
    title: "Viagens e Turismo",
    phase: "Fase 1",
    progressPercentage: 30,
    influencersCount: 10,
    banner:
      "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.1.0",
  },
  {
    id: 6,
    title: "Beleza e Cosméticos",
    phase: "Fase 4",
    progressPercentage: 90,
    influencersCount: 2,
    banner:
      "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.1.0",
  },
];

function RouteComponent() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);

  const totalSteps = 7;
  const progressPercentage = currentStep ? (currentStep / totalSteps) * 100 : 0;

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setCurrentStep(1);
  };

  return (
    <>
      {campaigns.length > 0 ? (
        <div className="flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <div className="w-full max-w-xs">
              <InputSearch
                placeholder="Pesquisar campanha"
                icon={<Icon name="Search" color="#0a0a0a" size={16} />}
              />
            </div>

            <div className="flex items-center gap-4">
              <div className="min-w-56">
                <Dropdown
                  options={[
                    { label: "Todas as campanhas", value: "all_campaigns" },
                    { label: "Campanhas ativas", value: "active_campaigns" },
                    {
                      label: "Campanhas finalizadas",
                      value: "finished_campaigns",
                    },
                  ]}
                  value="all_campaigns"
                />
              </div>

              <div className="w-fit">
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
          </div>

          <div className="grid xl:grid-cols-3 2xl:grid-cols-4 gap-5">
            {campaigns.map((campaign) => (
              <CampaignCard
                key={campaign.id}
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
    </>
  );
}
