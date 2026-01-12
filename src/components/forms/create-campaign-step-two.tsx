import { useState, useMemo, useEffect } from "react";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { MultiSelect } from "@/components/ui/multi-select";
import { Select } from "@/components/ui/select";
import type { CampaignFormData } from "@/shared/types";
import {
  BRAZILIAN_STATES,
  BRAZILIAN_CITIES,
  getCitiesByState,
} from "@/shared/data/brazilian-states-cities";
import { handleNumberInput } from "@/shared/utils/masks";
import { useInfluencersCatalog } from "@/hooks/use-catalog";

interface CreateCampaignStepTwoProps {
  formData: CampaignFormData;
  updateFormData: (field: keyof CampaignFormData, value: string) => void;
  onBack: () => void;
  onNext: () => void;
}

export function CreateCampaignStepTwo({
  formData,
  updateFormData,
  onBack,
  onNext,
}: CreateCampaignStepTwoProps) {
  const [selectedStates, setSelectedStates] = useState<string[]>(
    formData.state ? formData.state.split(",").filter(Boolean) : []
  );

  // Sincronizar estados selecionados quando formData mudar
  useEffect(() => {
    if (formData.state) {
      const states = formData.state.split(",").filter(Boolean);
      setSelectedStates(states);
    } else {
      setSelectedStates([]);
    }
  }, [formData.state]);

  const stateOptions = BRAZILIAN_STATES.map((state) => ({
    value: state.code,
    label: state.name,
  }));

  const cityOptions = useMemo(() => {
    if (selectedStates.length === 0) {
      return BRAZILIAN_CITIES.map((city) => ({
        value: `${city.name}-${city.state}`,
        label: `${city.name} - ${city.state}`,
      }));
    }

    const cities: Array<{ value: string; label: string }> = [];
    selectedStates.forEach((stateCode) => {
      const citiesInState = getCitiesByState(stateCode);
      citiesInState.forEach((city) => {
        cities.push({
          value: `${city.name}-${city.state}`,
          label: `${city.name} - ${city.state}`,
        });
      });
    });
    return cities;
  }, [selectedStates]);

  const selectedCities = useMemo(() => {
    return formData.city ? formData.city.split(",").filter(Boolean) : [];
  }, [formData.city]);

  const handleStateChange = (values: string[]) => {
    setSelectedStates(values);
    updateFormData("state", values.join(","));
    // Limpar cidades quando estados mudarem
    updateFormData("city", "");
  };

  const handleCityChange = (values: string[]) => {
    updateFormData("city", values.join(","));
  };

  // Preparar filtros para buscar influenciadores
  const catalogFilters = useMemo(() => {
    const filters: {
      gender?: string;
      followers_min?: number;
      state?: string;
      city?: string;
    } = {};

    // Mapear gênero
    if (formData.gender && formData.gender !== "all") {
      filters.gender = formData.gender;
    }

    // Mapear seguidores mínimos
    if (formData.minFollowers) {
      const minFollowersNum = parseInt(formData.minFollowers.replace(/\D/g, ""), 10);
      if (!isNaN(minFollowersNum) && minFollowersNum > 0) {
        filters.followers_min = minFollowersNum;
      }
    }

    // Mapear estados (pegar o primeiro estado se houver múltiplos)
    // Nota: Se a API suportar múltiplos estados, pode ser ajustado para enviar array
    if (selectedStates.length > 0) {
      filters.state = selectedStates[0];
    }

    // Mapear cidades (pegar a primeira cidade se houver múltiplas)
    // Nota: Se a API suportar múltiplas cidades, pode ser ajustado para enviar array
    if (selectedCities.length > 0) {
      // Extrair apenas o nome da cidade (formato é "NomeCidade-ESTADO")
      const firstCity = selectedCities[0].split("-")[0];
      filters.city = firstCity;
    }

    return filters;
  }, [formData.gender, formData.minFollowers, selectedStates, selectedCities]);

  // Verificar se há filtros aplicados
  const hasFilters = useMemo(() => {
    return (
      (formData.gender && formData.gender !== "all") ||
      (formData.minFollowers && parseInt(formData.minFollowers.replace(/\D/g, ""), 10) > 0) ||
      selectedStates.length > 0 ||
      selectedCities.length > 0
    );
  }, [formData.gender, formData.minFollowers, selectedStates, selectedCities]);

  // Buscar influenciadores com os filtros (só busca se houver filtros)
  const { data: influencers = [], isLoading: isLoadingInfluencers } = useInfluencersCatalog(
    hasFilters ? catalogFilters : undefined
  );

  // Contagem de influenciadores encontrados
  const influencersCount = influencers.length;

  return (
    <form className="flex flex-col gap-10">
      <div className="flex flex-col gap-4">
        <Input
          label="Quantos influenciadores deseja na campanha?"
          placeholder="1"
          value={formData.influencersCount}
          onChange={(e) =>
            handleNumberInput(e, (value) =>
              updateFormData("influencersCount", value)
            )
          }
        />

        <Input 
          label="Quantidade mínima de seguidores" 
          placeholder="1.000"
          value={formData.minFollowers}
          onChange={(e) =>
            handleNumberInput(e, (value) =>
              updateFormData("minFollowers", value)
            )
          }
        />

        <MultiSelect
          label="Estado"
          placeholder="Selecione o/os estado(s) desejado(s)"
          options={stateOptions}
          value={selectedStates}
          onChange={handleStateChange}
        />

        <MultiSelect
          label="Cidade"
          placeholder={
            selectedStates.length === 0
              ? "Selecione primeiro um ou mais estados"
              : "Selecione a/as cidade(s) desejada(s)"
          }
          options={cityOptions}
          value={selectedCities}
          onChange={handleCityChange}
          disabled={selectedStates.length === 0}
        />

        <Select
          label="Gênero"
          placeholder="Selecione o/os gênero(s)"
          value={formData.gender}
          onChange={(value) => updateFormData("gender", value)}
          options={[
            { label: "Masculino", value: "male" },
            { label: "Feminino", value: "female" },
            { label: "Outros", value: "outros" },
          ]}
        />

        {/* Contador de influenciadores encontrados */}
        {hasFilters && (
          <div className="p-4 bg-primary-50 rounded-2xl border border-primary-200">
            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-1">
                <p className="text-sm font-medium text-primary-900">
                  Influenciadores encontrados
                </p>
                <p className="text-xs text-primary-700">
                  Baseado nos filtros selecionados
                </p>
              </div>
              <div className="flex items-center gap-2">
                {isLoadingInfluencers ? (
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
                ) : (
                  <span className="text-2xl font-bold text-primary-900">
                    {influencersCount}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
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
