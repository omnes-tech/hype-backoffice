import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/text-area";
import type { CampaignFormData } from "@/shared/types";

interface CreateCampaignStepThreeProps {
  formData: CampaignFormData;
  updateFormData: (field: keyof CampaignFormData, value: string) => void;
  onBack: () => void;
  onNext: () => void;
}

export function CreateCampaignStepThree({
  formData,
  updateFormData,
  onBack,
  onNext,
}: CreateCampaignStepThreeProps) {
  return (
    <form className="flex flex-col gap-10">
      <div className="flex flex-col gap-4">
        <Select
          label="Tipo de remuneração"
          placeholder="Escolha como os influenciadores serão pagos"
          value={formData.paymentType}
          onChange={(value) => updateFormData("paymentType", value)}
          options={[
            { label: "Valor fixo", value: "fixed" },
            { label: "Preço do influenciador", value: "price" },
            { label: "Permuta", value: "swap" },
            { label: "CPA (Custo Por Ação)", value: "cpa" },
            { label: "CPM (Custo Por Mil)", value: "cpm" },
          ]}
        />

        <Textarea
          label="Benefícios Inclusos na Campanha"
          placeholder="Liste em tópicos os benefícios oferecidos na campanha.

  . Cupom de desconto de R$250,00 para gastar em nossa loja online.
  . Kit exclusivo com produtos da marca."
          value={formData.benefits}
          onChange={(e) => updateFormData("benefits", e.target.value)}
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
