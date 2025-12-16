import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Textarea } from "@/components/ui/text-area";
import type { CampaignFormData } from "@/shared/types";

interface CreateCampaignStepFourProps {
  formData: CampaignFormData;
  updateFormData: (field: keyof CampaignFormData, value: string) => void;
  onBack: () => void;
  onNext: () => void;
}

export function CreateCampaignStepFour({
  formData,
  updateFormData,
  onBack,
  onNext,
}: CreateCampaignStepFourProps) {
  return (
    <form className="flex flex-col gap-10">
      <div className="flex flex-col gap-4">
        <Textarea
          label="Objetivo geral da campanha"
          placeholder="Descreva detalhadamente o que você espera alcançar com essa campanha."
          value={formData.generalObjective}
          onChange={(e) => updateFormData("generalObjective", e.target.value)}
        />

        <Textarea
          label="O que fazer"
          labelColor="text-success-600"
          placeholder="Oriente o influenciador sobre o que deve ser feito.

  . Mencionar a marca no início do vídeo.
  . Usar hashtag oficial #CampanhaBrand.
  . Mostrar o produto sendo utilizado."
          value={formData.whatToDo}
          onChange={(e) => updateFormData("whatToDo", e.target.value)}
        />

        <Textarea
          label="O que NÃO fazer"
          labelColor="text-danger-600"
          placeholder="Oriente o influenciador sobre o que NÃO deve ser feito.

  . Cupom de desconto de R$250,00 para gastar em nossa loja online.
  . Kit exclusivo com produtos da marca."
          value={formData.whatNotToDo}
          onChange={(e) => updateFormData("whatNotToDo", e.target.value)}
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
              <p className="text-neutral-50 font-semibold">Próximo</p>

              <Icon name="ArrowRight" size={16} color="#FAFAFA" />
            </div>
          </Button>
        </div>
      </div>
    </form>
  );
}
