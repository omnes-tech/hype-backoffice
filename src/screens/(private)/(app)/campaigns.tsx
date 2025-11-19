import { useState } from "react";

import { createFileRoute } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Avatar } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/text-area";
import { Select } from "@/components/ui/select";
import { Icon } from "@/components/ui/icon";

export const Route = createFileRoute("/(private)/(app)/campaigns")({
  component: RouteComponent,
});

function RouteComponent() {
  const [isModalOpen, setIsModalOpen] = useState(false);

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
        <Modal title="Criar campanha" onClose={() => setIsModalOpen(false)}>
          <div className="flex flex-col gap-1">
            <ProgressBar progressPercentage={50} color="bg-tertiary-600" />

            <div className="flex items-center justify-between">
              <span className="text-xs text-neutral-700">
                Informações básicas
              </span>

              <span className="text-xs text-neutral-700">Etapa 1 de 4</span>
            </div>
          </div>

          <div className="flex items-center flex-col gap-1 my-10">
            <Avatar
              size="4xl"
              src="https://github.com/shadcn.png"
              alt="Stepy Tecnologia LTDA"
            />

            <p className="text-neutral-950 font-medium text-lg">
              Stepy Tecnologia LTDA
            </p>
          </div>

          <form className="flex flex-col gap-4">
            <Input
              label="Título da campanha"
              placeholder="Escolha um nome claro e descritivo para sua campanha"
            />

            <Textarea
              label="Sobre a campanha"
              placeholder="Descreva resumidamente sobre o que é essa campanha, seus principais objetivos e o que você espera alcançar com ela."
            />

            <Select
              label="Subnichos da Campanha"
              placeholder="Selecione os subnichos que representam o foco da campanha"
              options={[
                { label: "Vendas", value: "sales" },
                { label: "Branding", value: "branding" },
                { label: "Leads", value: "leads" },
              ]}
            />
          </form>

          <div className="flex items-center justify-between mt-10">
            <div className="w-fit">
              <Button variant="outline">
                <div className="flex items-center justify-center gap-2">
                  <Icon name="ArrowLeft" size={16} color="#404040" />

                  <p className="text-neutral-700 font-semibold">Voltar</p>
                </div>
              </Button>
            </div>

            <div className="w-fit">
              <Button>
                <div className="flex items-center justify-center gap-2">
                  <p className="text-neutral-50 font-semibold">Avançar</p>

                  <Icon name="ArrowRight" size={16} color="#FAFAFA" />
                </div>
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
