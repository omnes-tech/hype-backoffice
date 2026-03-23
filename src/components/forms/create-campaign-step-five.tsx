import { useRef, useState, useEffect } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { InputDate } from "@/components/ui/input-date";
import { Select } from "@/components/ui/select";
import type { CampaignFormData, CampaignPhase, SocialFormat } from "@/shared/types";
import {
  validatePhase1Date,
  validateSubsequentPhaseDate,
  getPhase1MinDate,
} from "@/shared/utils/date-validations";
import { handleNumberInput, unformatNumber } from "@/shared/utils/masks";

interface CreateCampaignStepFiveProps {
  formData: CampaignFormData;
  updateFormData: (field: keyof CampaignFormData, value: unknown) => void;
  onBack: () => void;
  onNext: () => void;
  hideBackButton?: boolean;
}

const OBJECTIVE_OPTIONS = [
  { label: "Awareness", value: "awareness" },
  { label: "Engajamento", value: "engagement" },
  { label: "Conversão", value: "conversion" },
  { label: "Alcance", value: "reach" },
  { label: "Educação", value: "education" },
];

const SOCIAL_NETWORKS = [
  { label: "Instagram", value: "instagram" },
  { label: "TikTok", value: "tiktok" },
  { label: "Youtube", value: "youtube" },
  { label: "UGC", value: "ugc" },
];

const CONTENT_TYPES_BY_NETWORK: Record<string, Array<{ label: string; value: string }>> = {
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

function getContentTypes(socialNetwork: string) {
  return CONTENT_TYPES_BY_NETWORK[socialNetwork] || [];
}

export function CreateCampaignStepFive({
  formData,
  updateFormData,
  onBack,
  onNext,
  hideBackButton = false,
}: CreateCampaignStepFiveProps) {
  const [phases, setPhases] = useState<CampaignPhase[]>(
    formData.phases && formData.phases.length > 0
      ? formData.phases
      : [
          {
            id: "1",
            objective: "",
            postDate: "",
            postTime: "18:00",
            includeImageRights: true,
            imageRightsPeriod: "",
            formats: [],
            files: "",
          },
        ]
  );
  const [expandedPhaseId, setExpandedPhaseId] = useState<string | null>(
    phases[0]?.id ?? null
  );
  const phaseFilesInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    if (formData.phases && formData.phases.length > 0) {
      const hasPhasesWithData = formData.phases.some(
        (p) =>
          p.objective ||
          p.postDate ||
          (p.formats && p.formats.length > 0)
      );
      const localEmpty =
        phases.length === 0 ||
        (phases.length === 1 &&
          phases[0].id === "1" &&
          !phases[0].objective &&
          !phases[0].postDate &&
          (!phases[0].formats || phases[0].formats.length === 0));
      if (hasPhasesWithData && localEmpty) {
        setPhases(formData.phases);
        if (formData.phasesCount !== formData.phases.length.toString()) {
          updateFormData("phasesCount", formData.phases.length.toString());
        }
      }
    }
  }, [formData.phases, formData.phasesCount, updateFormData]);

  const handlePhasesCountChange = (count: string) => {
    const countNum = Math.max(1, parseInt(count, 10) || 1);
    updateFormData("phasesCount", count);

    const newPhases: CampaignPhase[] = [];
    for (let i = 1; i <= countNum; i++) {
      const existing = phases.find((p) => p.id === i.toString());
      newPhases.push(
        existing ?? {
          id: i.toString(),
          objective: "",
          postDate: "",
          postTime: "18:00",
          includeImageRights: true,
          imageRightsPeriod: "",
          formats: [],
          files: "",
        }
      );
    }
    setPhases(newPhases);
    updateFormData("phases", newPhases);
    if (!expandedPhaseId || !newPhases.some((p) => p.id === expandedPhaseId)) {
      setExpandedPhaseId(newPhases[0]?.id ?? null);
    }
  };

  const updatePhase = (phaseId: string, field: keyof CampaignPhase, value: unknown) => {
    const updated = phases.map((p) =>
      p.id === phaseId ? { ...p, [field]: value } : p
    );
    setPhases(updated);
    updateFormData("phases", updated);
  };

  const setPhaseImageRightsChoice = (phaseId: string, include: boolean) => {
    const updated = phases.map((p) =>
      p.id === phaseId
        ? {
            ...p,
            includeImageRights: include,
            ...(include ? {} : { imageRightsPeriod: "" }),
          }
        : p
    );
    setPhases(updated);
    updateFormData("phases", updated);
  };

  const addFormat = (phaseId: string) => {
    const newFormat: SocialFormat = {
      id: Date.now().toString(),
      socialNetwork: "",
      contentType: "",
      quantity: "1",
    };
    const updated = phases.map((p) =>
      p.id === phaseId
        ? { ...p, formats: [...(p.formats || []), newFormat] }
        : p
    );
    setPhases(updated);
    updateFormData("phases", updated);
  };

  const removeFormat = (phaseId: string, formatId: string) => {
    const updated = phases.map((p) =>
      p.id === phaseId
        ? { ...p, formats: (p.formats || []).filter((f) => f.id !== formatId) }
        : p
    );
    setPhases(updated);
    updateFormData("phases", updated);
  };

  const updateFormat = (
    phaseId: string,
    formatId: string,
    field: keyof SocialFormat,
    value: string
  ) => {
    const updated = phases.map((p) => {
      if (p.id !== phaseId) return p;
      const formats = (p.formats || []).map((f) => {
        if (f.id !== formatId) return f;
        const next = { ...f, [field]: value };
        if (
          (field === "socialNetwork" || field === "contentType") &&
          !next.quantity
        ) {
          next.quantity = "1";
        }
        return next;
      });
      return { ...p, formats };
    });
    setPhases(updated);
    updateFormData("phases", updated);
  };

  const removePhase = (phaseId: string) => {
    if (phases.length <= 1) return;
    const filtered = phases.filter((p) => p.id !== phaseId);
    const rekeyed = filtered.map((p, i) => ({ ...p, id: (i + 1).toString() }));
    setPhases(rekeyed);
    updateFormData("phases", rekeyed);
    updateFormData("phasesCount", rekeyed.length.toString());
    if (expandedPhaseId === phaseId) {
      setExpandedPhaseId(rekeyed[0]?.id ?? null);
    }
  };

  const handlePhaseFilesSelect = (phaseId: string, files: FileList | null) => {
    if (files?.length) {
      updatePhase(phaseId, "files", files[0].name);
    }
  };

  const getPhaseMinDate = (phaseIndex: number, phaseDate: string): string | undefined => {
    if (phaseIndex === 0) return getPhase1MinDate();
    const prev = phases[phaseIndex - 1];
    if (prev?.postDate) {
      const v = validateSubsequentPhaseDate(phaseDate, prev.postDate);
      return v.minDate;
    }
    return undefined;
  };

  const getPhaseDateError = (phaseIndex: number, phaseDate: string): string | undefined => {
    if (!phaseDate) return undefined;
    if (phaseIndex === 0) return validatePhase1Date(phaseDate).error;
    const prev = phases[phaseIndex - 1];
    if (prev?.postDate) {
      return validateSubsequentPhaseDate(phaseDate, prev.postDate).error;
    }
    return undefined;
  };

  const validateAllPhases = (): boolean => {
    for (let i = 0; i < phases.length; i++) {
      const p = phases[i];
      if (!p.objective?.trim()) {
        toast.error(`A Fase ${i + 1} precisa ter um objetivo selecionado.`);
        return false;
      }
      if (!p.postDate?.trim()) {
        toast.error(`A Fase ${i + 1} precisa ter uma data prevista de postagem.`);
        return false;
      }
      const dateErr = getPhaseDateError(i, p.postDate);
      if (dateErr) {
        toast.error(`Fase ${i + 1}: ${dateErr}`);
        return false;
      }
      if (!p.formats?.length) {
        toast.error(
          `A Fase ${i + 1} precisa ter pelo menos um formato e rede social adicionado.`
        );
        return false;
      }
      const incomplete = p.formats.filter(
        (f) => !f.socialNetwork || !f.contentType
      );
      if (incomplete.length > 0) {
        toast.error(
          `A Fase ${i + 1} tem formato(s) incompleto(s). Preencha a rede social e o tipo de conteúdo.`
        );
        return false;
      }
      if (p.includeImageRights !== false) {
        const months = parseInt(
          unformatNumber(p.imageRightsPeriod || ""),
          10
        );
        if (
          !p.imageRightsPeriod?.trim() ||
          Number.isNaN(months) ||
          months < 1
        ) {
          toast.error(
            `Fase ${i + 1}: informe o período de direitos de imagem (em meses).`
          );
          return false;
        }
      }
      const badQty = p.formats.filter((f) => {
        const n = parseInt(f.quantity || "0", 10);
        return isNaN(n) || n < 1;
      });
      if (badQty.length > 0) {
        toast.error(
          `A Fase ${i + 1} tem formato(s) com quantidade inválida. A quantidade deve ser maior que 0.`
        );
        return false;
      }
    }
    return true;
  };

  const handleNext = () => {
    if (validateAllPhases()) onNext();
  };

  return (
    <form
      className="flex flex-col gap-10"
      onSubmit={(e) => {
        e.preventDefault();
        handleNext();
      }}
    >
      {/* Header */}
      <div className="flex flex-col gap-4">
        <h2 className="text-[28px] font-medium leading-8 text-neutral-950">
          Fases da campanha
        </h2>
        <p className="text-lg leading-8 text-neutral-700">
          Crie as fases e defina o que será publicado em cada uma.
        </p>
      </div>

      {/* Card container */}
      <div className="flex flex-col gap-7 rounded-[12px] bg-[#FAFAFA] p-6">
        {/* Número de fases */}
        <div className="flex flex-col gap-2">
          <label className="text-base font-medium text-neutral-950">
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

        {/* Phase cards */}
        <div className="flex flex-col gap-4">
          {phases.map((phase, phaseIndex) => {
            const isExpanded = expandedPhaseId === phase.id;
            return (
              <div
                key={phase.id}
                className="overflow-hidden rounded-2xl border border-neutral-200"
              >
                {/* Card header */}
                <div
                  className="flex items-center justify-between border-b border-neutral-200 bg-neutral-100 px-6 py-6"
                  role="button"
                  tabIndex={0}
                  aria-expanded={isExpanded}
                  aria-label={`Fase ${phaseIndex + 1}, ${isExpanded ? "recolher" : "expandir"}`}
                  onClick={() =>
                    setExpandedPhaseId(isExpanded ? null : phase.id)
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setExpandedPhaseId(isExpanded ? null : phase.id);
                    }
                  }}
                >
                  <span className="rounded-[24px] bg-primary-100 px-3 py-1 text-base font-medium text-primary-900">
                    Fase {phaseIndex + 1}
                  </span>
                  <div className="flex items-center gap-3">
                    {phases.length > 1 && (
                      <button
                        type="button"
                        aria-label={`Remover fase ${phaseIndex + 1}`}
                        className="rounded p-1 text-neutral-700 hover:bg-neutral-200 hover:text-danger-600"
                        onClick={(e) => {
                          e.stopPropagation();
                          removePhase(phase.id);
                        }}
                      >
                        <Icon name="Trash2" size={24} color="#404040" />
                      </button>
                    )}
                    <span
                      className="flex shrink-0 transition-transform"
                      style={{
                        transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
                      }}
                    >
                      <Icon name="ChevronDown" size={16} color="#404040" />
                    </span>
                  </div>
                </div>

                {/* Card body (collapsible) */}
                {isExpanded && (
                  <div className="flex flex-col gap-4 p-6">
                    <Select
                      label="Objetivo da fase"
                      placeholder="Selecionar objetivo"
                      value={phase.objective}
                      onChange={(value) => updatePhase(phase.id, "objective", value)}
                      options={OBJECTIVE_OPTIONS}
                    />

                    {/* Direitos de imagem — Figma 2283:8016 / Fase 3 */}
                    <div className="flex flex-col gap-4">
                      <p className="text-base font-medium leading-5 text-[#0A0A0A]">
                        Deseja incluir direitos de uso de imagem para a marca?
                      </p>
                      <div
                        className="flex flex-wrap gap-4"
                        role="radiogroup"
                        aria-label="Direitos de uso de imagem"
                      >
                        {(
                          [
                            { value: true as const, label: "Sim" },
                            { value: false as const, label: "Não" },
                          ] as const
                        ).map(({ value, label }) => {
                          const selected =
                            value === true
                              ? phase.includeImageRights !== false
                              : phase.includeImageRights === false;
                          return (
                            <button
                              key={label}
                              type="button"
                              role="radio"
                              aria-checked={selected}
                              onClick={() =>
                                setPhaseImageRightsChoice(phase.id, value)
                              }
                              className="flex items-center gap-2 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
                            >
                              <span
                                className={`flex size-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                                  selected
                                    ? "border-primary-900"
                                    : "border-[#A3A3A3]"
                                }`}
                              >
                                {selected && value === true && (
                                  <span className="size-3 rounded-full bg-primary-900" />
                                )}
                                {selected && value === false && (
                                  <span className="size-3 rounded-full bg-neutral-700" />
                                )}
                              </span>
                              <span className="text-base font-medium text-black">
                                {label}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                      {phase.includeImageRights !== false && (
                        <div className="flex flex-col gap-1">
                          <label className="text-base font-medium leading-5 text-[#0A0A0A]">
                            Período de direitos de imagem (em meses)
                          </label>
                          <input
                            type="text"
                            inputMode="numeric"
                            placeholder="Ex: 12"
                            value={phase.imageRightsPeriod ?? ""}
                            onChange={(e) =>
                              handleNumberInput(e, (v) =>
                                updatePhase(phase.id, "imageRightsPeriod", v)
                              )
                            }
                            className="h-11 w-full rounded-[24px] bg-[#F5F5F5] px-4 py-3 text-base text-[#0A0A0A] placeholder:text-[#A3A3A3] outline-none"
                          />
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                      <div className="min-w-0 flex-1">
                        <InputDate
                          label="Data prevista de postagem"
                          value={phase.postDate ?? ""}
                          onChange={(v) => updatePhase(phase.id, "postDate", v)}
                          min={getPhaseMinDate(phaseIndex, phase.postDate)}
                          error={getPhaseDateError(phaseIndex, phase.postDate)}
                        />
                      </div>
                      <div className="flex min-w-0 flex-1 flex-col gap-1">
                        <label className="text-base font-medium leading-5 text-[#0A0A0A]">
                          Horário da postagem
                        </label>
                        <input
                          type="time"
                          value={phase.postTime ?? "18:00"}
                          onChange={(e) =>
                            updatePhase(phase.id, "postTime", e.target.value)
                          }
                          className="h-11 w-full rounded-[24px] border-0 bg-[#F5F5F5] px-4 py-3 text-base text-[#0A0A0A] placeholder:text-[#A3A3A3]"
                        />
                      </div>
                    </div>

                    {/* Formatos e redes sociais */}
                    <div className="flex flex-col gap-4">
                      <label className="text-base font-medium text-neutral-950">
                        Formatos e redes sociais
                      </label>
                      {(phase.formats || []).map((format) => (
                        <div
                          key={format.id}
                          className="flex flex-wrap gap-3 rounded-xl border border-neutral-200 bg-white p-4"
                        >
                          <div className="flex flex-1 min-w-[120px] flex-col gap-1">
                            <span className="text-sm font-medium text-neutral-950">
                              Rede social
                            </span>
                            <Select
                              placeholder="Selecione a rede"
                              value={format.socialNetwork}
                              onChange={(v) =>
                                updateFormat(phase.id, format.id, "socialNetwork", v)
                              }
                              options={SOCIAL_NETWORKS}
                            />
                          </div>
                          <div className="flex flex-1 min-w-[120px] flex-col gap-1">
                            <span className="text-sm font-medium text-neutral-950">
                              Tipo de conteúdo
                            </span>
                            <Select
                              placeholder="Selecione o conteúdo"
                              value={format.contentType}
                              onChange={(v) =>
                                updateFormat(phase.id, format.id, "contentType", v)
                              }
                              options={getContentTypes(format.socialNetwork)}
                              disabled={!format.socialNetwork}
                            />
                          </div>
                          <div className="flex w-24 flex-col gap-1">
                            <span className="text-sm font-medium text-neutral-950">
                              Quantidade
                            </span>
                            <input
                              type="number"
                              min={1}
                              placeholder="Ex: 1"
                              value={format.quantity || "1"}
                              onChange={(e) =>
                                updateFormat(
                                  phase.id,
                                  format.id,
                                  "quantity",
                                  e.target.value
                                )
                              }
                              disabled={!format.socialNetwork || !format.contentType}
                              className="h-11 rounded-[24px] border-0 bg-neutral-100 px-4 py-3 text-base text-neutral-950 placeholder:text-neutral-400 disabled:opacity-60"
                            />
                          </div>
                          <div className="flex items-end">
                            <button
                              type="button"
                              onClick={() => removeFormat(phase.id, format.id)}
                              className="rounded p-2 text-danger-600 hover:bg-danger-50"
                              aria-label="Remover formato"
                            >
                              <Icon name="X" size={20} color="#DC2626" />
                            </button>
                          </div>
                        </div>
                      ))}

                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => addFormat(phase.id)}
                        className="h-11 w-full max-w-sm rounded-[24px] w-max"
                      >
                        <div className="flex items-center gap-2">
                          <Icon name="Plus" size={16} color="#404040" />
                          <span className="text-base font-semibold text-neutral-700">
                            Adicionar formatos e redes sociais
                          </span>
                        </div>
                      </Button>
                    </div>

                    {/* Arquivos da fase */}
                    <div className="flex flex-col gap-2">
                      <label className="text-base font-medium text-neutral-950">
                        Arquivos da fase (opcional)
                      </label>
                      <div
                        role="button"
                        tabIndex={0}
                        aria-label="Fazer upload de arquivos da fase"
                        onClick={() =>
                          phaseFilesInputRefs.current[phase.id]?.click()
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            phaseFilesInputRefs.current[phase.id]?.click();
                          }
                        }}
                        className="flex min-h-[120px] cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-primary-600 bg-neutral-100 py-10 px-5 transition-colors hover:bg-neutral-200/70"
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
                        <Icon name="Upload" size={24} color="#5D1390" />
                        <p className="text-center text-base text-primary-900">
                          Fazer upload de arquivos
                        </p>
                        {phase.files && (
                          <p className="text-xs text-neutral-500">{phase.files}</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {!hideBackButton && (
        <div className="flex items-center justify-between">
          <div className="w-fit">
            <Button variant="outline" onClick={onBack} type="button">
              <div className="flex items-center justify-center gap-2">
                <Icon name="ArrowLeft" size={16} color="#404040" />
                <p className="font-semibold text-neutral-700">Voltar</p>
              </div>
            </Button>
          </div>
        </div>
      )}
    </form>
  );
}
