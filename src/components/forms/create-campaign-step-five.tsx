import { useRef, useState, useEffect } from "react";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
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
  const [showCropModal, setShowCropModal] = useState(false);
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [originalFile, setOriginalFile] = useState<File | null>(null);
  const [imagePosition, setImagePosition] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartY, setDragStartY] = useState(0);
  const [dragStartPosition, setDragStartPosition] = useState(0);
  const cropContainerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  // Atualizar preview quando formData.banner mudar (útil para edição)
  useEffect(() => {
    if (formData.banner && !bannerPreview) {
      setBannerPreview(formData.banner);
    }
  }, [formData.banner, bannerPreview]);

  const handleBannerSelect = (files: FileList | null) => {
    if (files && files.length > 0) {
      const file = files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        const img = new Image();
        img.onload = () => {
          // Se a altura for maior que 512px, abrir modal de ajuste
          if (img.height > 512) {
            setOriginalImage(result);
            setOriginalFile(file);
            setShowCropModal(true);
            setImagePosition(0);
          } else {
            // Se a altura for menor ou igual a 512px, usar diretamente
            setBannerPreview(result);
            updateFormData("banner", result);
            (formData as any).bannerFile = file;
          }
        };
        img.src = result;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCropConfirm = () => {
    if (!originalImage || !imageRef.current || !cropContainerRef.current) return;

    const img = imageRef.current;
    const container = cropContainerRef.current;
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    if (!ctx) return;

    // Dimensões do banner: 1280x512
    const targetWidth = 1280;
    const targetHeight = 512;

    canvas.width = targetWidth;
    canvas.height = targetHeight;

    // Calcular a escala da imagem no container
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;
    const scale = containerWidth / img.naturalWidth;
    const imageDisplayHeight = img.naturalHeight * scale;
    
    // Calcular qual parte da imagem original está visível no container
    // imagePosition é negativo quando a imagem está sendo arrastada para cima
    // Converter a posição visual para coordenadas da imagem original
    const visibleTopInOriginal = Math.max(0, -imagePosition / scale);
    const visibleHeightInOriginal = Math.min(img.naturalHeight - visibleTopInOriginal, containerHeight / scale);

    // Calcular a proporção para manter o aspect ratio correto (1280:512 = 2.5:1)
    const targetAspectRatio = targetWidth / targetHeight; // 2.5

    let sourceX = 0;
    let sourceY = visibleTopInOriginal;
    let sourceWidth = img.naturalWidth;
    let sourceHeight = visibleHeightInOriginal;

    // Se a imagem for mais larga que o necessário para o aspect ratio, centralizar horizontalmente
    const imageAspectRatio = img.naturalWidth / img.naturalHeight;
    if (imageAspectRatio > targetAspectRatio) {
      // A imagem é mais larga, então precisamos cortar as laterais
      sourceWidth = img.naturalHeight * targetAspectRatio;
      sourceX = (img.naturalWidth - sourceWidth) / 2;
    }

    // Garantir que temos altura suficiente
    if (sourceHeight < targetHeight / scale) {
      sourceHeight = Math.min(img.naturalHeight - sourceY, targetHeight / scale);
    }

    // Desenhar a parte visível da imagem no canvas
    ctx.drawImage(
      img,
      sourceX,
      sourceY,
      sourceWidth,
      sourceHeight,
      0,
      0,
      targetWidth,
      targetHeight
    );

    // Converter canvas para blob e depois para File
    canvas.toBlob((blob) => {
      if (!blob) return;

      const croppedFile = new File([blob], originalFile?.name || "banner.jpg", {
        type: blob.type || "image/jpeg",
      });

      const croppedDataUrl = canvas.toDataURL("image/jpeg", 0.9);
      setBannerPreview(croppedDataUrl);
      updateFormData("banner", croppedDataUrl);
      (formData as any).bannerFile = croppedFile;
      setShowCropModal(false);
      setOriginalImage(null);
      setOriginalFile(null);
    }, "image/jpeg", 0.9);
  };

  const handleCropCancel = () => {
    setShowCropModal(false);
    setOriginalImage(null);
    setOriginalFile(null);
    if (bannerInputRef.current) {
      bannerInputRef.current.value = "";
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStartY(e.clientY);
    setDragStartPosition(imagePosition);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !imageRef.current || !cropContainerRef.current) return;

    const deltaY = e.clientY - dragStartY;
    const newPosition = dragStartPosition + deltaY;

    // Calcular limites
    const container = cropContainerRef.current;
    const img = imageRef.current;
    const scale = container.clientWidth / img.naturalWidth;
    const imageDisplayHeight = img.naturalHeight * scale;
    const maxPosition = 0;
    const minPosition = container.clientHeight - imageDisplayHeight;

    setImagePosition(Math.max(minPosition, Math.min(maxPosition, newPosition)));
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      const handleGlobalMouseMove = (e: MouseEvent) => {
        if (!imageRef.current || !cropContainerRef.current) return;
        const deltaY = e.clientY - dragStartY;
        const newPosition = dragStartPosition + deltaY;
        const container = cropContainerRef.current;
        const img = imageRef.current;
        const scale = container.clientWidth / img.naturalWidth;
        const imageDisplayHeight = img.naturalHeight * scale;
        const maxPosition = 0;
        const minPosition = container.clientHeight - imageDisplayHeight;
        setImagePosition(Math.max(minPosition, Math.min(maxPosition, newPosition)));
      };

      const handleGlobalMouseUp = () => {
        setIsDragging(false);
      };

      document.addEventListener("mousemove", handleGlobalMouseMove);
      document.addEventListener("mouseup", handleGlobalMouseUp);

      return () => {
        document.removeEventListener("mousemove", handleGlobalMouseMove);
        document.removeEventListener("mouseup", handleGlobalMouseUp);
      };
    }
  }, [isDragging, dragStartY, dragStartPosition]);

  const handleBrandFilesSelect = (files: FileList | null) => {
    if (files && files.length > 0) {
      // Aqui você pode processar múltiplos arquivos se necessário
      // Por enquanto, vamos apenas armazenar o nome do primeiro arquivo
      updateFormData("brandFiles", files[0].name);
    }
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
                  // Limpar o arquivo também
                  (formData as any).bannerFile = undefined;
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

      {/* Modal de ajuste de banner */}
      {showCropModal && originalImage && (
        <Modal title="Ajustar banner" onClose={handleCropCancel}>
          <div className="flex flex-col gap-6">
            <p className="text-sm text-neutral-600">
              A imagem tem altura maior que 512px. Arraste a imagem para ajustar qual parte ficará visível no banner.
            </p>
            
            <div className="relative w-full bg-neutral-100 rounded-2xl overflow-hidden border-2 border-neutral-200">
              <div
                ref={cropContainerRef}
                className="relative w-full"
                style={{ aspectRatio: "1280/512", height: "512px" }}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
              >
                <img
                  ref={imageRef}
                  src={originalImage}
                  alt="Banner para ajustar"
                  className="absolute w-full h-auto select-none"
                  style={{
                    transform: `translateY(${imagePosition}px)`,
                    cursor: isDragging ? "grabbing" : "grab",
                  }}
                  draggable={false}
                />
              </div>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={handleCropCancel} className="flex-1">
                Cancelar
              </Button>
              <Button onClick={handleCropConfirm} className="flex-1">
                Confirmar
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </form>
  );
}

