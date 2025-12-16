import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { CampaignFormData } from "@/shared/types";

interface CreateCampaignStepTwoProps {
  formData: CampaignFormData;
  updateFormData: (field: keyof CampaignFormData, value: string) => void;
  onBack: () => void;
  onNext: () => void;
}

export function CreateCampaignStepTwo({
  formData,
  updateFormData,
  onBack,
  onNext,
}: CreateCampaignStepTwoProps) {
  return (
    <form className="flex flex-col gap-10">
      <div className="flex flex-col gap-4">
        <Input
          label="Quantos influenciadores deseja na campanha?"
          placeholder="1"
          value={formData.influencersCount}
          onChange={(e) => updateFormData("influencersCount", e.target.value)}
        />

        <Input 
          label="Quantidade mínima de seguidores" 
          placeholder="1.000"
          value={formData.minFollowers}
          onChange={(e) => updateFormData("minFollowers", e.target.value)}
        />

        <Input
          label="Estado"
          placeholder="Selecione o/os estado(s) desejado(s)"
          value={formData.state}
          onChange={(e) => updateFormData("state", e.target.value)}
        />

        <Input
          label="Cidade"
          placeholder="Selecione a/as cidade(s) desejada(s)"
          value={formData.city}
          onChange={(e) => updateFormData("city", e.target.value)}
        />

        <Select
          label="Gênero"
          placeholder="Selecione o/os gênero(s)"
          value={formData.gender}
          onChange={(value) => updateFormData("gender", value)}
          options={[
            { label: "Masculino", value: "male" },
            { label: "Feminino", value: "female" },
            { label: "Outros", value: "outros" },
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
