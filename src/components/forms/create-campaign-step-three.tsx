import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/text-area";
import type { CampaignFormData } from "@/shared/types";
import { handleCurrencyInput } from "@/shared/utils/masks";

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
  const renderPaymentFields = () => {
    switch (formData.paymentType) {
      case "fixed":
        return (
          <Input
            label="Valor a ser pago (independente de número de seguidores e métricas)"
            placeholder="Ex: R$ 1.000,00"
            value={formData.paymentFixedAmount ? `R$ ${formData.paymentFixedAmount}` : ""}
            onChange={(e) =>
              handleCurrencyInput(e, (value) =>
                updateFormData("paymentFixedAmount", value)
              )
            }
          />
        );

      case "price":
        // Preço definido pelo influenciador - sem campos adicionais
        return null;

      case "swap":
        return (
          <>
            <Input
              label="Item oferecido"
              placeholder="Ex: Kit de produtos, Cupom de desconto"
              value={formData.paymentSwapItem}
              onChange={(e) => updateFormData("paymentSwapItem", e.target.value)}
            />
            <Input
              label="Valor de mercado"
              placeholder="Ex: R$ 500,00"
              value={formData.paymentSwapMarketValue ? `R$ ${formData.paymentSwapMarketValue}` : ""}
              onChange={(e) =>
                handleCurrencyInput(e, (value) =>
                  updateFormData("paymentSwapMarketValue", value)
                )
              }
            />
          </>
        );

      case "cpa":
        return (
          <>
            <Textarea
              label="Quais ações geram CPA?"
              placeholder="Descreva quais ações dos influenciadores gerarão CPA (ex: clique no link, compra realizada, cadastro)"
              value={formData.paymentCpaActions}
              onChange={(e) => updateFormData("paymentCpaActions", e.target.value)}
            />
            <Input
              label="Valor do CPA"
              placeholder="Ex: R$ 50,00"
              value={formData.paymentCpaValue ? `R$ ${formData.paymentCpaValue}` : ""}
              onChange={(e) =>
                handleCurrencyInput(e, (value) =>
                  updateFormData("paymentCpaValue", value)
                )
              }
            />
          </>
        );

      case "cpm":
        return (
          <Input
            label="Valor do CPM"
            placeholder="Ex: R$ 10,00"
            value={formData.paymentCpmValue ? `R$ ${formData.paymentCpmValue}` : ""}
            onChange={(e) =>
              handleCurrencyInput(e, (value) =>
                updateFormData("paymentCpmValue", value)
              )
            }
          />
        );

      default:
        return null;
    }
  };

  return (
    <form className="flex flex-col gap-10">
      <div className="flex flex-col gap-4">
        <Select
          label="Tipo de remuneração"
          placeholder="Escolha como os influenciadores serão pagos"
          value={formData.paymentType}
          onChange={(value) => updateFormData("paymentType", value)}
          options={[
            { label: "Valor fixo por influenciador", value: "fixed" },
            { label: "Preço definido pelo influenciador", value: "price" },
            { label: "Permuta", value: "swap" },
            { label: "CPA (Custo Por Ação)", value: "cpa" },
            { label: "CPM (Custo Por Mil)", value: "cpm" },
          ]}
        />

        {renderPaymentFields()}

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
