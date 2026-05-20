import { useMemo, useState } from "react";

import { Select } from "@/components/ui/select";
import { MultiSelect } from "@/components/ui/multi-select";
import { Input } from "@/components/ui/input";
import { useNiches } from "@/hooks/use-niches";
import { useAdminCampaignLookup } from "@/hooks/use-admin-notifications";
import { BRAZILIAN_STATES } from "@/shared/data/brazilian-states-cities";
import { handleNumberInput, unformatNumber } from "@/shared/utils/masks";
import type {
  AdminAudienceFilter,
  AdminAudienceFilterType,
} from "@/shared/types";

interface AdminAudienceBuilderProps {
  value: AdminAudienceFilter;
  onChange: (next: AdminAudienceFilter) => void;
}

const TYPE_OPTIONS: Array<{ value: AdminAudienceFilterType; label: string }> = [
  { value: "all", label: "Todos os criadores" },
  { value: "campaign", label: "Criadores de uma campanha" },
  { value: "niche", label: "Por nicho / categoria" },
  { value: "followers", label: "Por faixa de seguidores" },
  { value: "location", label: "Por localização" },
];

const STATE_OPTIONS = BRAZILIAN_STATES.map((s) => ({
  value: s.code,
  label: `${s.name} (${s.code})`,
}));

/**
 * Coerce do valor atual para o tipo selecionado quando o admin troca o radio.
 * Mantém shape válido sem zerar campos relacionados (UX defensiva).
 */
function defaultsForType(type: AdminAudienceFilterType): AdminAudienceFilter {
  switch (type) {
    case "all":
      return { type: "all" };
    case "campaign":
      return { type: "campaign", campaign_id: "" };
    case "niche":
      return { type: "niche", niche_ids: [] };
    case "followers":
      return { type: "followers", min_followers: 0, max_followers: 100000 };
    case "location":
      return { type: "location", states: [], cities: [] };
  }
}

export function AdminAudienceBuilder({
  value,
  onChange,
}: AdminAudienceBuilderProps) {
  const [campaignSearch, setCampaignSearch] = useState("");
  const { data: niches = [] } = useNiches();
  const { data: campaigns = [], isLoading: isLoadingCampaigns } =
    useAdminCampaignLookup(campaignSearch, {
      enabled: value.type === "campaign",
    });

  const handleTypeChange = (next: string) => {
    onChange(defaultsForType(next as AdminAudienceFilterType));
  };

  const nicheOptions = useMemo(
    () =>
      niches.map((n) => ({
        value: String(n.id),
        label: n.name,
      })),
    [niches],
  );

  const campaignOptions = useMemo(
    () =>
      campaigns.map((c) => ({
        value: c.id,
        label: c.workspace_name
          ? `${c.title} · ${c.workspace_name}`
          : c.title,
      })),
    [campaigns],
  );

  return (
    <div className="flex flex-col gap-4">
      <Select
        label="Audiência"
        options={TYPE_OPTIONS}
        value={value.type}
        onChange={handleTypeChange}
        isSearchable={false}
      />

      {value.type === "campaign" && (
        <div className="flex flex-col gap-2">
          <Input
            label="Buscar campanha"
            value={campaignSearch}
            onChange={(e) => setCampaignSearch(e.target.value)}
            placeholder="Digite o título da campanha"
          />
          <Select
            label="Campanha"
            placeholder={
              isLoadingCampaigns
                ? "Carregando..."
                : campaignOptions.length === 0
                  ? "Nenhuma campanha encontrada"
                  : "Selecione uma campanha"
            }
            options={campaignOptions}
            value={value.campaign_id}
            onChange={(id) => onChange({ type: "campaign", campaign_id: id })}
            isSearchable
          />
        </div>
      )}

      {value.type === "niche" && (
        <MultiSelect
          label="Nichos"
          placeholder="Selecione um ou mais nichos"
          options={nicheOptions}
          value={value.niche_ids.map(String)}
          onChange={(ids) =>
            onChange({
              type: "niche",
              niche_ids: ids
                .map((id) => parseInt(id, 10))
                .filter((n) => !Number.isNaN(n)),
            })
          }
        />
      )}

      {value.type === "followers" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="Mínimo de seguidores"
            value={
              value.min_followers
                ? value.min_followers.toLocaleString("pt-BR")
                : ""
            }
            onChange={(e) =>
              handleNumberInput(e, (raw) =>
                onChange({
                  ...value,
                  min_followers: raw
                    ? parseInt(unformatNumber(raw), 10) || 0
                    : 0,
                }),
              )
            }
            placeholder="0"
          />
          <Input
            label="Máximo de seguidores"
            value={
              value.max_followers
                ? value.max_followers.toLocaleString("pt-BR")
                : ""
            }
            onChange={(e) =>
              handleNumberInput(e, (raw) =>
                onChange({
                  ...value,
                  max_followers: raw
                    ? parseInt(unformatNumber(raw), 10) || 0
                    : 0,
                }),
              )
            }
            placeholder="100000"
          />
        </div>
      )}

      {value.type === "location" && (
        <div className="flex flex-col gap-3">
          <MultiSelect
            label="Estados"
            placeholder="Selecione um ou mais estados"
            options={STATE_OPTIONS}
            value={value.states ?? []}
            onChange={(states) =>
              onChange({
                type: "location",
                states,
                cities: value.cities ?? [],
              })
            }
          />
          <Input
            label="Cidades (opcional, separadas por vírgula)"
            value={(value.cities ?? []).join(", ")}
            onChange={(e) => {
              const cities = e.target.value
                .split(",")
                .map((c) => c.trim())
                .filter(Boolean);
              onChange({
                type: "location",
                states: value.states ?? [],
                cities,
              });
            }}
            placeholder="Ex: São Paulo, Rio de Janeiro"
          />
        </div>
      )}
    </div>
  );
}
