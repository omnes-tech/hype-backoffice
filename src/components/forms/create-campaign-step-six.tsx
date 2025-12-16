import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { CampaignFormData, CampaignPhase, SocialFormat } from "@/shared/types";

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
            postTime: "",
            formats: [],
            files: "",
          },
        ]
  );

  const phaseFilesInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});

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
          postTime: "",
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
          quantity: "",
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
          formats: phase.formats.map((format) =>
            format.id === formatId ? { ...format, [field]: value } : format
          ),
        };
      }
      return phase;
    });
    setPhases(updatedPhases);
    updateFormData("phases", updatedPhases);
  };

  const handlePhaseFilesSelect = (phaseId: string, files: FileList | null) => {
    if (files && files.length > 0) {
      updatePhase(phaseId, "files", files[0].name);
    }
  };

  const socialNetworks = [
    { label: "Instagram", value: "instagram" },
    { label: "Youtube", value: "youtube" },
    { label: "TikTok", value: "tiktok" },
    { label: "Facebook", value: "facebook" },
    { label: "Twitter", value: "twitter" },
  ];

  const contentTypesByNetwork: { [key: string]: Array<{ label: string; value: string }> } = {
    instagram: [
      { label: "Stories", value: "stories" },
      { label: "Post", value: "post" },
      { label: "Reels", value: "reels" },
      { label: "IGTV", value: "igtv" },
    ],
    youtube: [
      { label: "Live", value: "live" },
      { label: "Vídeo", value: "video" },
      { label: "Shorts", value: "shorts" },
    ],
    tiktok: [
      { label: "Vídeo", value: "video" },
      { label: "Live", value: "live" },
    ],
    facebook: [
      { label: "Post", value: "post" },
      { label: "Vídeo", value: "video" },
      { label: "Live", value: "live" },
    ],
    twitter: [
      { label: "Tweet", value: "tweet" },
      { label: "Thread", value: "thread" },
    ],
  };

  const getContentTypes = (socialNetwork: string) => {
    return contentTypesByNetwork[socialNetwork] || [];
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

            {/* Data e horário */}
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Data prevista de postagem"
                type="date"
                value={phase.postDate}
                onChange={(e) => updatePhase(phase.id, "postDate", e.target.value)}
              />

              <Input
                label="Horário da postagem"
                type="time"
                value={phase.postTime}
                onChange={(e) => updatePhase(phase.id, "postTime", e.target.value)}
              />
            </div>

            {/* Formatos e redes sociais */}
            <div className="flex flex-col gap-4">
              <label className="text-neutral-950 font-medium">
                Formatos e redes sociais
              </label>

              {phase.formats.map((format) => (
                <div
                  key={format.id}
                  className="grid grid-cols-3 gap-4 p-4 bg-neutral-50 rounded-2xl border border-neutral-200"
                >
                  <Select
                    placeholder="Rede social"
                    value={format.socialNetwork}
                    onChange={(value) =>
                      updateFormat(phase.id, format.id, "socialNetwork", value)
                    }
                    options={socialNetworks}
                  />

                  <Select
                    placeholder="Tipo de conteúdo"
                    value={format.contentType}
                    onChange={(value) =>
                      updateFormat(phase.id, format.id, "contentType", value)
                    }
                    options={getContentTypes(format.socialNetwork)}
                    disabled={!format.socialNetwork}
                  />

                  <div className="flex items-end gap-2">
                    <div className="flex-1">
                      <Input
                        placeholder="Quantidade"
                        type="number"
                        value={format.quantity}
                        onChange={(e) =>
                          updateFormat(phase.id, format.id, "quantity", e.target.value)
                        }
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFormat(phase.id, format.id)}
                      className="p-2 text-danger-600 hover:bg-danger-50 rounded-lg transition-colors"
                    >
                      <Icon name="X" color="#DC2626" size={20} />
                    </button>
                  </div>
                </div>
              ))}

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

