import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/text-area";
import type { CampaignFormData } from "@/shared/types";
import { handleCurrencyInput } from "@/shared/utils/masks";

interface CreateCampaignStepThreeProps {
  formData: CampaignFormData;
  updateFormData: (field: keyof CampaignFormData, value: string | string[]) => void;
  onBack: () => void;
  onNext: () => void;
}

export function CreateCampaignStepThree({
  formData,
  updateFormData,
  onBack,
  onNext,
}: CreateCampaignStepThreeProps) {
  // Converter strings para arrays se necessário (compatibilidade com dados antigos)
  const [benefitsItems, setBenefitsItems] = useState<string[]>(() => {
    if (Array.isArray(formData.benefits)) {
      return formData.benefits;
    }
    if (formData.benefits) {
      // Se for string, dividir por linhas que começam com ponto ou traço
      return formData.benefits
        .split(/\n/)
        .map(line => line.trim())
        .filter(line => line && (line.startsWith('.') || line.startsWith('-') || line.startsWith('•')))
        .map(line => line.replace(/^[.\-•]\s*/, '').trim())
        .filter(line => line);
    }
    return [""];
  });

  // Atualizar formData quando os itens mudarem (sem dependência de formData para evitar loops)
  useEffect(() => {
    const filtered = benefitsItems.filter(item => item.trim() !== "");
    updateFormData("benefits", filtered.length > 0 ? filtered : [""]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [benefitsItems]);

  const addBenefitsItem = () => {
    setBenefitsItems([...benefitsItems, ""]);
  };

  const removeBenefitsItem = (index: number) => {
    if (benefitsItems.length > 1) {
      setBenefitsItems(benefitsItems.filter((_, i) => i !== index));
    }
  };

  const updateBenefitsItem = (index: number, value: string) => {
    const updated = [...benefitsItems];
    updated[index] = value;
    setBenefitsItems(updated);
  };
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

        {/* Benefícios - Lista de itens */}
        <div className="flex flex-col gap-3 w-full">
          <label className="text-neutral-950 font-medium">
            Benefícios Inclusos na Campanha
          </label>
          <div className="flex flex-col gap-2 w-full">
            {benefitsItems.map((item, index) => (
              <div key={index} className="flex items-center gap-2 w-full">
                <div className="flex-1">
                  <Input
                    placeholder="Ex: Cupom de desconto de R$250,00 para gastar em nossa loja online"
                    value={item}
                    onChange={(e) => updateBenefitsItem(index, e.target.value)}
                  />
                </div>
                {benefitsItems.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeBenefitsItem(index)}
                    className="p-2 text-danger-600 hover:bg-danger-50 rounded-lg transition-colors shrink-0"
                  >
                    <Icon name="X" color="#DC2626" size={20} />
                  </button>
                )}
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              onClick={addBenefitsItem}
              className="w-fit"
            >
              <div className="flex items-center gap-2">
                <Icon name="Plus" color="#404040" size={16} />
                <p className="text-neutral-700 font-semibold">
                  Adicionar benefício
                </p>
              </div>
            </Button>
          </div>
        </div>
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
