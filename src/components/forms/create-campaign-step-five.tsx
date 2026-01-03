import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import type { CampaignFormData } from "@/shared/types";
import { handleNumberInput } from "@/shared/utils/masks";

interface CreateCampaignStepFiveProps {
  formData: CampaignFormData;
  updateFormData: (field: keyof CampaignFormData, value: string) => void;
  onBack: () => void;
  onNext: () => void;
}

export function CreateCampaignStepFive({
  formData,
  updateFormData,
  onBack,
  onNext,
}: CreateCampaignStepFiveProps) {
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const filesInputRef = useRef<HTMLInputElement>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(
    formData.banner || null
  );

  const handleBannerSelect = (files: FileList | null) => {
    if (files && files.length > 0) {
      const file = files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setBannerPreview(result);
        updateFormData("banner", result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleBrandFilesSelect = (files: FileList | null) => {
    if (files && files.length > 0) {
      // Aqui você pode processar múltiplos arquivos se necessário
      // Por enquanto, vamos apenas armazenar o nome do primeiro arquivo
      updateFormData("brandFiles", files[0].name);
    }
  };

  const handleGenerateBannerWithAI = () => {
    // Implementar lógica de geração de banner com IA
    console.log("Gerar banner com IA");
  };

  return (
    <form className="flex flex-col gap-10">
      <div className="flex flex-col gap-6">
        {/* Banner da campanha */}
        <div className="flex flex-col gap-2">
          <label className="text-neutral-950 font-medium">
            Banner da campanha (1280X512 px)
          </label>
          
          {bannerPreview ? (
            <div className="relative w-full">
              <div
                className="w-full h-64 rounded-3xl border-2 border-dashed border-neutral-200 bg-neutral-50 overflow-hidden"
                style={{ aspectRatio: "1280/512" }}
              >
                <img
                  src={bannerPreview}
                  alt="Banner preview"
                  className="w-full h-full object-cover"
                />
              </div>
              <button
                type="button"
                onClick={() => {
                  setBannerPreview(null);
                  updateFormData("banner", "");
                  if (bannerInputRef.current) {
                    bannerInputRef.current.value = "";
                  }
                }}
                className="absolute top-2 right-2 bg-danger-600 rounded-full p-1.5 cursor-pointer hover:bg-danger-700 transition-colors"
              >
                <Icon name="X" color="#FFFFFF" size={16} />
              </button>
            </div>
          ) : (
            <div
              onClick={() => bannerInputRef.current?.click()}
              className="w-full h-64 rounded-3xl border-2 border-dashed border-neutral-300 bg-neutral-100 flex flex-col items-center justify-center gap-3 cursor-pointer hover:bg-neutral-200/70 transition-colors"
            >
              <input
                ref={bannerInputRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png"
                className="hidden"
                onChange={(e) => handleBannerSelect(e.target.files)}
              />
              
              <Icon name="Upload" color="#A3A3A3" size={32} />
              <p className="text-neutral-600 font-medium">
                Clique para enviar o banner
              </p>
            </div>
          )}

          <Button
            type="button"
            variant="outline"
            onClick={handleGenerateBannerWithAI}
            className="w-fit"
          >
            <div className="flex items-center gap-2">
              <Icon name="Wand" color="#404040" size={16} />
              <p className="text-neutral-700 font-semibold">
                Gerar banner com IA
              </p>
            </div>
          </Button>
        </div>

        {/* Período de direitos de imagem */}
        <Input
          label="Período de direitos de imagem (em meses)"
          placeholder="1"
          value={formData.imageRightsPeriod}
          onChange={(e) =>
            handleNumberInput(e, (value) =>
              updateFormData("imageRightsPeriod", value)
            )
          }
        />

        {/* Arquivos da marca */}
        <div className="flex flex-col gap-2">
          <label className="text-neutral-950 font-medium">
            Arquivos da marca
          </label>
          
          <div
            onClick={() => filesInputRef.current?.click()}
            className="w-full min-h-32 rounded-3xl border-2 border-dashed border-neutral-300 bg-neutral-100 flex flex-col items-center justify-center gap-3 py-8 px-4 cursor-pointer hover:bg-neutral-200/70 transition-colors"
          >
            <input
              ref={filesInputRef}
              type="file"
              multiple
              accept="image/*,.pdf,.doc,.docx"
              className="hidden"
              onChange={(e) => handleBrandFilesSelect(e.target.files)}
            />
            
            <Icon name="Upload" color="#A3A3A3" size={32} />
            <p className="text-neutral-600 font-medium text-center">
              Fazer upload de arquivos
            </p>
            {formData.brandFiles && (
              <p className="text-xs text-neutral-500 mt-1">
                {formData.brandFiles}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="w-fit">
          <Button variant="outline" onClick={onBack} type="button">
            <div className="flex items-center justify-center gap-2">
              <Icon name="ArrowLeft" size={16} color="#404040" />

              <p className="text-neutral-700 font-semibold">Voltar</p>
            </div>
          </Button>
        </div>

        <div className="w-fit">
          <Button onClick={onNext} type="button">
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

