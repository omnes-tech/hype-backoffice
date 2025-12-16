import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/text-area";
import type { CampaignFormData } from "@/shared/types";

interface CreateCampaignStepOneProps {
  formData: CampaignFormData;
  updateFormData: (field: keyof CampaignFormData, value: string) => void;
  onNext: () => void;
}

export function CreateCampaignStepOne({ 
  formData, 
  updateFormData, 
  onNext 
}: CreateCampaignStepOneProps) {
  return (
    <form className="flex flex-col gap-10">
      <div className="flex items-center flex-col gap-1">
        <Avatar
          size="4xl"
          src="https://github.com/shadcn.png"
          alt="Stepy Tecnologia LTDA"
        />

        <p className="text-neutral-950 font-medium text-lg">
          Stepy Tecnologia LTDA
        </p>
      </div>

      <div className="flex flex-col gap-4">
        <Input
          label="Título da campanha"
          placeholder="Escolha um nome claro e descritivo para sua campanha"
          value={formData.title}
          onChange={(e) => updateFormData("title", e.target.value)}
        />

        <Textarea
          label="Sobre a campanha"
          placeholder="Descreva resumidamente sobre o que é essa campanha, seus principais objetivos e o que você espera alcançar com ela."
          value={formData.description}
          onChange={(e) => updateFormData("description", e.target.value)}
        />

        <Select
          label="Subnichos da Campanha"
          placeholder="Selecione os subnichos que representam o foco da campanha"
          value={formData.subniches}
          onChange={(value) => updateFormData("subniches", value)}
          options={[
            { label: "Agro", value: "agriculture" },
            { label: "Arquitetura/Construção", value: "architecture" },
            { label: "Arte", value: "art" },
            { label: "Atleta", value: "athlete" },
            { label: "Ator/Atriz", value: "actor" },
            { label: "Audiovisual", value: "audiovisual" },
            { label: "Automobilismo", value: "automobilism" },
            { label: "Bebidas", value: "beverages" },
            { label: "Beleza", value: "beauty" },
            { label: "Brinquedos", value: "toys" },
            { label: "Cabelo", value: "hair" },
          ]}
        />
      </div>

      <div className="w-fit self-end">
        <Button onClick={onNext}>
          <div className="flex items-center justify-center gap-2">
            <p className="text-neutral-50 font-semibold">Avançar</p>

            <Icon name="ArrowRight" size={16} color="#FAFAFA" />
          </div>
        </Button>
      </div>
    </form>
  );
}
