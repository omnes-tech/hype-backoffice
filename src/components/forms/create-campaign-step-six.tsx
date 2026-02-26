import { useRef, useState, useEffect } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { InputDate } from "@/components/ui/input-date";
import { Select } from "@/components/ui/select";
import type { CampaignFormData, CampaignPhase, SocialFormat } from "@/shared/types";
import {
  validatePhase1Date,
  validateSubsequentPhaseDate,
  getPhase1MinDate,
} from "@/shared/utils/date-validations";

interface CreateCampaignStepSixProps {
  formData: CampaignFormData;
  updateFormData: (field: keyof CampaignFormData, value: any) => void;
  onBack: () => void;
  onNext: () => void;
}

export function CreateCampaignStepSix({
  formData,
  updateFormData,
  onBack,
  onNext,
}: CreateCampaignStepSixProps) {
  const [phases, setPhases] = useState<CampaignPhase[]>(
    formData.phases && formData.phases.length > 0
      ? formData.phases
      : [
        {
          id: "1",
          objective: "",
          postDate: "",
          formats: [],
          files: "",
        },
      ]
  );

  const phaseFilesInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});

  useEffect(() => {
    if (formData.phases && formData.phases.length > 0) {
      // Verificar se formData.phases tem fases com dados reais (objective, postDate ou formats)
      const hasPhasesWithData = formData.phases.some(
        (phase) => phase.objective || phase.postDate || (phase.formats && phase.formats.length > 0)
      );
      
      // Verificar se o estado local está vazio ou só tem fases temporárias sem dados
      const localPhasesEmpty = phases.length === 0 || 
        (phases.length === 1 && 
         phases[0].id === "1" && 
         !phases[0].objective && 
         !phases[0].postDate && 
         (!phases[0].formats || phases[0].formats.length === 0));
      
      // Se formData tem fases com dados e o estado local está vazio, atualizar
      if (hasPhasesWithData && localPhasesEmpty) {
        setPhases(formData.phases);
        // Atualizar o phasesCount
        if (formData.phasesCount !== formData.phases.length.toString()) {
          updateFormData("phasesCount", formData.phases.length.toString());
        }
      }
    }
  }, [formData.phases, formData.phasesCount, updateFormData]);

  const handlePhasesCountChange = (count: string) => {
    const countNum = parseInt(count) || 1;
    updateFormData("phasesCount", count);

    // Ajustar o array de fases baseado no número selecionado
    const newPhases: CampaignPhase[] = [];
    for (let i = 1; i <= countNum; i++) {
      const existingPhase = phases.find((p) => p.id === i.toString());
      newPhases.push(
        existingPhase || {
          id: i.toString(),
          objective: "",
          postDate: "",
          formats: [],
          files: "",
        }
      );
    }
    setPhases(newPhases);
    updateFormData("phases", newPhases);
  };

  const updatePhase = (phaseId: string, field: keyof CampaignPhase, value: any) => {
    const updatedPhases = phases.map((phase) =>
      phase.id === phaseId ? { ...phase, [field]: value } : phase
    );
    setPhases(updatedPhases);
    updateFormData("phases", updatedPhases);
  };

  const addFormat = (phaseId: string) => {
    const updatedPhases = phases.map((phase) => {
      if (phase.id === phaseId) {
        const newFormat: SocialFormat = {
          id: Date.now().toString(),
          socialNetwork: "",
          contentType: "",
          quantity: "1",
        };
        return {
          ...phase,
          formats: [...phase.formats, newFormat],
        };
      }
      return phase;
    });
    setPhases(updatedPhases);
    updateFormData("phases", updatedPhases);
  };

  const removeFormat = (phaseId: string, formatId: string) => {
    const updatedPhases = phases.map((phase) => {
      if (phase.id === phaseId) {
        return {
          ...phase,
          formats: phase.formats.filter((f) => f.id !== formatId),
        };
      }
      return phase;
    });
    setPhases(updatedPhases);
    updateFormData("phases", updatedPhases);
  };

  const updateFormat = (
    phaseId: string,
    formatId: string,
    field: keyof SocialFormat,
    value: string
  ) => {
    const updatedPhases = phases.map((phase) => {
      if (phase.id === phaseId) {
        return {
          ...phase,
          formats: phase.formats.map((format) => {
            if (format.id === formatId) {
              const updatedFormat = { ...format, [field]: value };
              // Se mudou rede social ou tipo de conteúdo, resetar quantidade para 1
              if ((field === "socialNetwork" || field === "contentType") && !updatedFormat.quantity) {
                updatedFormat.quantity = "1";
              }
              return updatedFormat;
            }
            return format;
          }),
        };
      }
      return phase;
    });
    setPhases(updatedPhases);
    updateFormData("phases", updatedPhases);
  };

  // Função para obter o label da quantidade baseado no formato
  const getQuantityLabel = (socialNetwork: string, contentType: string): string => {
    // Instagram Stories: minutos
    if (socialNetwork === "instagram" && contentType === "stories") {
      return "minutos";
    }
    // TikTok LIVE: horas
    if (socialNetwork === "tiktok" && contentType === "live") {
      return "horas";
    }
    // YouTube LIVE: horas
    if (socialNetwork === "youtube" && contentType === "live") {
      return "horas";
    }
    // Todos os outros: quantidade normal
    return "quantidade";
  };

  const handlePhaseFilesSelect = (phaseId: string, files: FileList | null) => {
    if (files && files.length > 0) {
      updatePhase(phaseId, "files", files[0].name);
    }
  };

  const socialNetworks = [
    { label: "Instagram", value: "instagram" },
    { label: "TikTok", value: "tiktok" },
    { label: "Youtube", value: "youtube" },
    { label: "UGC", value: "ugc" },
  ];

  const contentTypesByNetwork: { [key: string]: Array<{ label: string; value: string }> } = {
    instagram: [
      { label: "Post", value: "post" },
      { label: "Reels", value: "reels" },
      { label: "Stories", value: "stories" },
    ],
    tiktok: [
      { label: "Vídeos", value: "video" },
      { label: "LIVE", value: "live" },
    ],
    youtube: [
      { label: "Vídeo dedicado até 10 minutos", value: "video_dedicated" },
      { label: "Inserção até 60 segundos", value: "insertion" },
      { label: "Pré-roll ou End-roll até 15 segundos", value: "preroll_endroll" },
      { label: "Shorts", value: "shorts" },
      { label: "LIVE", value: "live" },
    ],
    ugc: [
      { label: "Imagem", value: "image" },
      { label: "Vídeo até 1 minuto", value: "video_1min" },
      { label: "Vídeo até 10 minutos", value: "video_10min" },
      { label: "Vídeo até 1 hora", value: "video_1hour" },
    ],
  };

  const getContentTypes = (socialNetwork: string) => {
    return contentTypesByNetwork[socialNetwork] || [];
  };

  // Calcular data mínima para cada fase
  const getPhaseMinDate = (phaseIndex: number, phaseDate: string): string | undefined => {
    if (phaseIndex === 0) {
      // Fase 1: mínimo 10 dias da data atual (sempre calcula da mesma forma)
      return getPhase1MinDate();
    } else {
      // Fases subsequentes: mínimo 3 dias da fase anterior
      const previousPhase = phases[phaseIndex - 1];
      if (previousPhase?.postDate) {
        const validation = validateSubsequentPhaseDate(phaseDate, previousPhase.postDate);
        return validation.minDate;
      }
    }
    return undefined;
  };

  // Validar data da fase e retornar erro se houver
  const getPhaseDateError = (phaseIndex: number, phaseDate: string): string | undefined => {
    if (!phaseDate) return undefined;

    if (phaseIndex === 0) {
      const validation = validatePhase1Date(phaseDate);
      return validation.error;
    } else {
      const previousPhase = phases[phaseIndex - 1];
      if (previousPhase?.postDate) {
        const validation = validateSubsequentPhaseDate(phaseDate, previousPhase.postDate);
        return validation.error;
      }
    }
    return undefined;
  };

  // Validar todas as fases antes de avançar
  const validateAllPhases = (): boolean => {
    for (let i = 0; i < phases.length; i++) {
      const phase = phases[i];

      // Verificar se o objetivo está preenchido
      if (!phase.objective || phase.objective.trim() === "") {
        toast.error(`A Fase ${i + 1} precisa ter um objetivo selecionado.`);
        return false;
      }

      // Verificar se a data está preenchida
      if (!phase.postDate || phase.postDate.trim() === "") {
        toast.error(`A Fase ${i + 1} precisa ter uma data prevista de postagem.`);
        return false;
      }

      // Verificar se a data é válida
      const dateError = getPhaseDateError(i, phase.postDate);
      if (dateError) {
        toast.error(`Fase ${i + 1}: ${dateError}`);
        return false;
      }

      // Verificar se há pelo menos um formato preenchido
      if (!phase.formats || phase.formats.length === 0) {
        toast.error(`A Fase ${i + 1} precisa ter pelo menos um formato e rede social adicionado.`);
        return false;
      }

      // Verificar se todos os formatos têm rede social e tipo de conteúdo preenchidos
      const incompleteFormats = phase.formats.filter(
        (format) => !format.socialNetwork || !format.contentType
      );

      if (incompleteFormats.length > 0) {
        toast.error(`A Fase ${i + 1} tem formato(s) incompleto(s). Preencha a rede social e o tipo de conteúdo.`);
        return false;
      }

      // Verificar se todas as quantidades são válidas
      const invalidQuantities = phase.formats.filter((format) => {
        const quantity = parseInt(format.quantity || "0", 10);
        return isNaN(quantity) || quantity < 1;
      });

      if (invalidQuantities.length > 0) {
        toast.error(`A Fase ${i + 1} tem formato(s) com quantidade inválida. A quantidade deve ser maior que 0.`);
        return false;
      }
    }

    return true;
  };

  const handleNext = () => {
    if (validateAllPhases()) {
      onNext();
    }
  };

  return (
    <form className="flex flex-col gap-10">
      <div className="flex flex-col gap-8">
        {/* Número de fases */}
        <div className="flex flex-col gap-2">
          <label className="text-neutral-950 font-medium">
            Em quantas fases a campanha será dividida?
          </label>
          <Select
            placeholder="1"
            value={formData.phasesCount || "1"}
            onChange={handlePhasesCountChange}
            options={[
              { label: "1", value: "1" },
              { label: "2", value: "2" },
              { label: "3", value: "3" },
              { label: "4", value: "4" },
              { label: "5", value: "5" },
            ]}
          />
        </div>

        {/* Fases */}
        {phases.map((phase, phaseIndex) => (
          <div key={phase.id} className="flex flex-col gap-6 p-6 border border-neutral-200 rounded-3xl">
            {/* Header da fase */}
            <div className="flex items-center gap-2">
              <div className="px-3 py-1 bg-tertiary-600 rounded-full">
                <span className="text-neutral-50 font-semibold text-sm">
                  Fase {phaseIndex + 1}
                </span>
              </div>
            </div>

            {/* Objetivo da fase */}
            <Select
              label="Objetivo da fase"
              placeholder="Selecionar objetivo"
              value={phase.objective}
              onChange={(value) => updatePhase(phase.id, "objective", value)}
              options={[
                { label: "Awareness", value: "awareness" },
                { label: "Engajamento", value: "engagement" },
                { label: "Conversão", value: "conversion" },
                { label: "Alcance", value: "reach" },
                { label: "Educação", value: "education" },
              ]}
            />

            {/* Data */}
            <div className="flex flex-col gap-1">
              <InputDate
                label="Data prevista de postagem"
                value={phase.postDate ?? ""}
                onChange={(v) => updatePhase(phase.id, "postDate", v)}
                min={getPhaseMinDate(phaseIndex, phase.postDate)}
                error={getPhaseDateError(phaseIndex, phase.postDate)}
              />
              {(() => {
                const minDateStr = getPhaseMinDate(phaseIndex, phase.postDate);
                if (!minDateStr) return null;
                const [y, m, d] = minDateStr.split("-").map(Number);
                const minDateFormatted = new Date(y, m - 1, d).toLocaleDateString("pt-BR");
                const reason =
                  phaseIndex === 0
                    ? "10 dias a partir de hoje"
                    : "3 dias após a fase anterior";
                return (
                  <p className="text-xs text-neutral-500 mt-0.5">
                    A partir de {minDateFormatted} ({reason})
                  </p>
                );
              })()}
            </div>

            {/* Formatos e redes sociais */}
            <div className="flex flex-col gap-4">
              <label className="text-neutral-950 font-medium">
                Formatos e redes sociais
              </label>

              {phase.formats.map((format) => {
                const quantityLabel = getQuantityLabel(format.socialNetwork || "", format.contentType || "");
                return (
                  <div
                    key={format.id}
                    className="flex flex-col sm:flex-row items-end gap-4 p-4 bg-neutral-50 rounded-2xl border border-neutral-200"
                  >
                    <div className="flex-1 min-w-0">
                      <Select
                        placeholder="Rede social"
                        value={format.socialNetwork}
                        onChange={(value) =>
                          updateFormat(phase.id, format.id, "socialNetwork", value)
                        }
                        options={socialNetworks}
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <Select
                        placeholder="Tipo de conteúdo"
                        value={format.contentType}
                        onChange={(value) =>
                          updateFormat(phase.id, format.id, "contentType", value)
                        }
                        options={getContentTypes(format.socialNetwork)}
                        disabled={!format.socialNetwork}
                      />
                    </div>

                    <div className="w-full sm:w-32 flex flex-col gap-1">
                      <label className="text-xs text-neutral-600 font-medium">
                        {quantityLabel === "minutos" ? "Minutos" : 
                         quantityLabel === "horas" ? "Horas" : 
                         "Quantidade"}
                      </label>
                      <Input
                        type="number"
                        value={format.quantity || "1"}
                        onChange={(e) =>
                          updateFormat(phase.id, format.id, "quantity", e.target.value)
                        }
                        min="1"
                        disabled={!format.socialNetwork || !format.contentType}
                      />
                    </div>

                    <div className="flex items-end sm:items-center justify-end sm:justify-center">
                      <button
                        type="button"
                        onClick={() => removeFormat(phase.id, format.id)}
                        className="p-2 text-danger-600 hover:bg-danger-50 rounded-lg transition-colors"
                      >
                        <Icon name="X" color="#DC2626" size={20} />
                      </button>
                    </div>
                  </div>
                );
              })}

              <Button
                type="button"
                variant="outline"
                onClick={() => addFormat(phase.id)}
                className="w-fit"
              >
                <div className="flex items-center gap-2">
                  <Icon name="Plus" color="#404040" size={16} />
                  <p className="text-neutral-700 font-semibold">
                    Adicionar formatos e redes sociais
                  </p>
                </div>
              </Button>
            </div>

            {/* Arquivos da fase */}
            <div className="flex flex-col gap-2">
              <label className="text-neutral-950 font-medium">
                Arquivos da fase (opcional)
              </label>
              <div
                onClick={() => phaseFilesInputRefs.current[phase.id]?.click()}
                className="w-full min-h-32 rounded-3xl border-2 border-dashed border-neutral-300 bg-neutral-100 flex flex-col items-center justify-center gap-3 py-8 px-4 cursor-pointer hover:bg-neutral-200/70 transition-colors"
              >
                <input
                  ref={(el) => {
                    phaseFilesInputRefs.current[phase.id] = el;
                  }}
                  type="file"
                  multiple
                  accept="image/*,.pdf,.doc,.docx"
                  className="hidden"
                  onChange={(e) =>
                    handlePhaseFilesSelect(phase.id, e.target.files)
                  }
                />

                <Icon name="Upload" color="#A3A3A3" size={32} />
                <p className="text-neutral-600 font-medium text-center">
                  Fazer upload de arquivos
                </p>
                {phase.files && (
                  <p className="text-xs text-neutral-500 mt-1">{phase.files}</p>
                )}
              </div>
            </div>
          </div>
        ))}
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
          <Button onClick={handleNext} type="button">
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

