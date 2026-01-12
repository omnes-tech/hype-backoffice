import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/text-area";
import type { CampaignFormData } from "@/shared/types";

interface CreateCampaignStepFourProps {
  formData: CampaignFormData;
  updateFormData: (field: keyof CampaignFormData, value: any) => void;
  onBack: () => void;
  onNext: () => void;
}

export function CreateCampaignStepFour({
  formData,
  updateFormData,
  onBack,
  onNext,
}: CreateCampaignStepFourProps) {
  // Converter strings para arrays se necessário (compatibilidade com dados antigos)
  const [whatToDoItems, setWhatToDoItems] = useState<string[]>(() => {
    if (Array.isArray(formData.whatToDo)) {
      return formData.whatToDo;
    }
    if (formData.whatToDo) {
      // Se for string, dividir por linhas que começam com ponto ou traço
      return formData.whatToDo
        .split(/\n/)
        .map(line => line.trim())
        .filter(line => line && (line.startsWith('.') || line.startsWith('-') || line.startsWith('•')))
        .map(line => line.replace(/^[.\-•]\s*/, '').trim())
        .filter(line => line);
    }
    return [""];
  });

  const [whatNotToDoItems, setWhatNotToDoItems] = useState<string[]>(() => {
    if (Array.isArray(formData.whatNotToDo)) {
      return formData.whatNotToDo;
    }
    if (formData.whatNotToDo) {
      // Se for string, dividir por linhas que começam com ponto ou traço
      return formData.whatNotToDo
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
    const filtered = whatToDoItems.filter(item => item.trim() !== "");
    updateFormData("whatToDo", filtered.length > 0 ? filtered : [""]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [whatToDoItems]);

  useEffect(() => {
    const filtered = whatNotToDoItems.filter(item => item.trim() !== "");
    updateFormData("whatNotToDo", filtered.length > 0 ? filtered : [""]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [whatNotToDoItems]);

  const addWhatToDoItem = () => {
    setWhatToDoItems([...whatToDoItems, ""]);
  };

  const removeWhatToDoItem = (index: number) => {
    if (whatToDoItems.length > 1) {
      setWhatToDoItems(whatToDoItems.filter((_, i) => i !== index));
    }
  };

  const updateWhatToDoItem = (index: number, value: string) => {
    const updated = [...whatToDoItems];
    updated[index] = value;
    setWhatToDoItems(updated);
  };

  const addWhatNotToDoItem = () => {
    setWhatNotToDoItems([...whatNotToDoItems, ""]);
  };

  const removeWhatNotToDoItem = (index: number) => {
    if (whatNotToDoItems.length > 1) {
      setWhatNotToDoItems(whatNotToDoItems.filter((_, i) => i !== index));
    }
  };

  const updateWhatNotToDoItem = (index: number, value: string) => {
    const updated = [...whatNotToDoItems];
    updated[index] = value;
    setWhatNotToDoItems(updated);
  };

  return (
    <form className="flex flex-col gap-10">
      <div className="flex flex-col gap-4">
        <Textarea
          label="Objetivo geral da campanha"
          placeholder="Descreva detalhadamente o que você espera alcançar com essa campanha."
          value={formData.generalObjective}
          onChange={(e) => updateFormData("generalObjective", e.target.value)}
        />

        {/* O que fazer e O que NÃO fazer - Lado a lado */}
        <div className="grid grid-cols-2 gap-6">
          {/* O que fazer - Lista de itens */}
          <div className="flex flex-col gap-3">
            <label className="text-success-600 font-medium">
              O que fazer
            </label>
            <div className="flex flex-col gap-2">
              {whatToDoItems.map((item, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Input
                    placeholder="Ex: Mencionar a marca no início do vídeo"
                    value={item}
                    onChange={(e) => updateWhatToDoItem(index, e.target.value)}
                  />
                  {whatToDoItems.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeWhatToDoItem(index)}
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
                onClick={addWhatToDoItem}
                className="w-fit"
              >
                <div className="flex items-center gap-2">
                  <Icon name="Plus" color="#404040" size={16} />
                  <p className="text-neutral-700 font-semibold">
                    Adicionar item
                  </p>
                </div>
              </Button>
            </div>
          </div>

          {/* O que NÃO fazer - Lista de itens */}
          <div className="flex flex-col gap-3">
            <label className="text-danger-600 font-medium">
              O que NÃO fazer
            </label>
            <div className="flex flex-col gap-2">
              {whatNotToDoItems.map((item, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Input
                    placeholder="Ex: Não mencionar concorrentes"
                    value={item}
                    onChange={(e) => updateWhatNotToDoItem(index, e.target.value)}
                  />
                  {whatNotToDoItems.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeWhatNotToDoItem(index)}
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
                onClick={addWhatNotToDoItem}
                className="w-fit"
              >
                <div className="flex items-center gap-2">
                  <Icon name="Plus" color="#404040" size={16} />
                  <p className="text-neutral-700 font-semibold">
                    Adicionar item
                  </p>
                </div>
              </Button>
            </div>
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
              <p className="text-neutral-50 font-semibold">Próximo</p>

              <Icon name="ArrowRight" size={16} color="#FAFAFA" />
            </div>
          </Button>
        </div>
      </div>
    </form>
  );
}
