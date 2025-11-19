import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/text-area";

interface CreateCampaignStepOneProps {
  onNext: () => void;
}

export function CreateCampaignStepOne({ onNext }: CreateCampaignStepOneProps) {
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
