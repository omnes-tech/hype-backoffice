import { useMemo } from "react";

import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { MultiSelect } from "@/components/ui/multi-select";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/text-area";
import type { CampaignFormData } from "@/shared/types";
import { useNiches } from "@/hooks/use-niches";
import { useAuth } from "@/contexts/auth-context";

interface CreateCampaignStepOneProps {
  formData: CampaignFormData;
  updateFormData: (field: keyof CampaignFormData, value: string) => void;
  onNext: () => void;
}

export function CreateCampaignStepOne({
  formData,
  updateFormData,
  onNext,
}: CreateCampaignStepOneProps) {
  const { data: niches = [], isLoading: isLoadingNiches } = useNiches();
  const { user } = useAuth();

  // Filtrar apenas nichos principais (nichos sem parent_id)
  const mainNicheOptions = useMemo(() => {
    return niches
      .filter((niche) => niche.parent_id === null)
      .map((niche) => ({
        value: niche.id.toString(),
        label: niche.name,
      }));
  }, [niches]);

  // Filtrar subnichos baseado no nicho principal selecionado
  const subnicheOptions = useMemo(() => {
    if (!formData.mainNiche) {
      return [];
    }
    const mainNicheId = parseInt(formData.mainNiche, 10);
    return niches
      .filter((niche) => niche.parent_id === mainNicheId)
      .map((niche) => ({
        value: niche.id.toString(),
        label: niche.name,
      }));
  }, [niches, formData.mainNiche]);

  const selectedSubniches = useMemo(() => {
    return formData.subniches
      ? formData.subniches.split(",").filter(Boolean)
      : [];
  }, [formData.subniches]);

  const handleMainNicheChange = (value: string) => {
    updateFormData("mainNiche", value);
    // Limpar subnichos selecionados quando o nicho principal mudar
    updateFormData("subniches", "");
  };

  const handleSubnichesChange = (values: string[]) => {
    updateFormData("subniches", values.join(","));
  };

  return (
    <form className="flex flex-col gap-10">
      <div className="flex items-center flex-col gap-1">
        <Avatar
          size="4xl"
          src="https://github.com/shadcn.png"
          alt={user?.name || "Usuário"}
        />

        <p className="text-neutral-950 font-medium text-lg">
          {user?.name || "Carregando..."}
        </p>
      </div>

      <div className="flex flex-col gap-4">
        <Input
          label="Título da campanha"
          placeholder="Escolha um nome claro e descritivo para sua campanha"
          value={formData.title}
          onChange={(e) => updateFormData("title", e.target.value)}
        />

        <Textarea
          label="Sobre a campanha"
          placeholder="Descreva resumidamente sobre o que é essa campanha, seus principais objetivos e o que você espera alcançar com ela."
          value={formData.description}
          onChange={(e) => updateFormData("description", e.target.value)}
        />

        <Select
          label="Nicho Principal"
          placeholder={
            isLoadingNiches
              ? "Carregando nichos..."
              : "Selecione o nicho principal da campanha"
          }
          options={mainNicheOptions}
          value={formData.mainNiche}
          onChange={handleMainNicheChange}
          disabled={isLoadingNiches}
          openUp={true}
        />

        {formData.mainNiche && (
          <MultiSelect
            label="Subnichos da Campanha"
            placeholder={
              isLoadingNiches
                ? "Carregando subnichos..."
                : subnicheOptions.length === 0
                ? "Nenhum subnicho disponível para este nicho"
                : "Selecione os subnichos que representam o foco da campanha"
            }
            options={subnicheOptions}
            value={selectedSubniches}
            onChange={handleSubnichesChange}
            menuPlacement="top"
            disabled={isLoadingNiches || subnicheOptions.length === 0}
          />
        )}
      </div>

      <div className="w-fit self-end">
        <Button onClick={onNext}>
          <div className="flex items-center justify-center gap-2">
            <p className="text-neutral-50 font-semibold">Avançar</p>

            <Icon name="ArrowRight" size={16} color="#FAFAFA" />
          </div>
        </Button>
      </div>
    </form>
  );
}
