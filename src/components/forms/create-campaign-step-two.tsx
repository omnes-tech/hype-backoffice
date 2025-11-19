import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

interface CreateCampaignStepTwoProps {
  onBack: () => void;
  onNext: () => void;
}

export function CreateCampaignStepTwo({
  onBack,
  onNext,
}: CreateCampaignStepTwoProps) {
  return (
    <form className="flex flex-col gap-10">
      <div className="flex flex-col gap-4">
        <Input
          label="Quantos influenciadores deseja na campanha?"
          placeholder="01"
        />

        <Input label="Quantidade mínima de seguidores" placeholder="1.000" />

        <Input label="Estado" placeholder="Ex.: São Paulo" />

        <Input label="Cidade" placeholder="Ex.: São Paulo" />

        <Select
          label="Gênero"
          placeholder="Selecione o gênero"
          options={[
            { label: "Masculino", value: "male" },
            { label: "Feminino", value: "female" },
            { label: "Outros", value: "outros" },
          ]}
        />

        <Select
          label="Gênero"
          placeholder="Selecione o gênero"
          options={[
            { label: "Instagram", value: "instragram" },
            { label: "Tiktok", value: "tiktok" },
            { label: "Youtube", value: "youtube" },
          ]}
        />
      </div>

      <div className="flex items-center justify-between">
        <div className="w-fit">
          <Button variant="outline" onClick={onBack}>
            <div className="flex items-center justify-center gap-2">
              <Icon name="ArrowLeft" size={16} color="#404040" />

              <p className="text-neutral-700 font-semibold">Voltar</p>
            </div>
          </Button>
        </div>

        <div className="w-fit">
          <Button onClick={onNext}>
            <div className="flex items-center justify-center gap-2">
              <p className="text-neutral-50 font-semibold">Avançar</p>

              <Icon name="ArrowRight" size={16} color="#FAFAFA" />
            </div>
          </Button>
        </div>
      </div>
    </form>
  );
}
