import { useMemo } from "react";
import { clsx } from "clsx";

import { InputDate } from "@/components/ui/input-date";
import {
  addDays,
  formatDateForInput,
} from "@/shared/utils/date-validations";
import type { AdminPeriod } from "@/shared/types";

export type AdminPeriodPreset =
  | "7d"
  | "30d"
  | "90d"
  | "6m"
  | "1y"
  | "custom";

interface PresetDef {
  id: AdminPeriodPreset;
  label: string;
  /** Dias para trás a partir de hoje. `undefined` em "custom". */
  daysBack?: number;
}

const PRESETS: PresetDef[] = [
  { id: "7d", label: "7 dias", daysBack: 7 },
  { id: "30d", label: "30 dias", daysBack: 30 },
  { id: "90d", label: "90 dias", daysBack: 90 },
  { id: "6m", label: "6 meses", daysBack: 180 },
  { id: "1y", label: "1 ano", daysBack: 365 },
  { id: "custom", label: "Personalizado" },
];

export function computePeriodFromPreset(
  preset: AdminPeriodPreset,
): AdminPeriod | null {
  const def = PRESETS.find((p) => p.id === preset);
  if (!def || def.daysBack == null) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return {
    from: formatDateForInput(addDays(today, -def.daysBack)),
    to: formatDateForInput(today),
  };
}

interface AdminPeriodFilterProps {
  period: AdminPeriod;
  preset: AdminPeriodPreset;
  onChange: (period: AdminPeriod, preset: AdminPeriodPreset) => void;
}

export function AdminPeriodFilter({
  period,
  preset,
  onChange,
}: AdminPeriodFilterProps) {
  const isCustom = preset === "custom";

  const handlePresetClick = (next: AdminPeriodPreset) => {
    if (next === "custom") {
      onChange(period, "custom");
      return;
    }
    const computed = computePeriodFromPreset(next);
    if (computed) onChange(computed, next);
  };

  const handleFromChange = (from: string) => {
    if (!from) return;
    const safeTo = from > period.to ? from : period.to;
    onChange({ from, to: safeTo }, "custom");
  };

  const handleToChange = (to: string) => {
    if (!to) return;
    const safeFrom = to < period.from ? to : period.from;
    onChange({ from: safeFrom, to }, "custom");
  };

  const presetButtons = useMemo(() => PRESETS, []);

  return (
    <div className="sticky top-0 z-20 bg-neutral-100/95 backdrop-blur-sm border-b border-neutral-200">
      <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-4">
        <div className="flex flex-wrap items-center gap-2">
          {presetButtons.map((p) => {
            const isActive = preset === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => handlePresetClick(p.id)}
                className={clsx(
                  "h-9 rounded-full border px-4 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary-600 border-primary-600 text-white"
                    : "bg-white border-neutral-200 text-neutral-700 hover:border-primary-300 hover:text-primary-700",
                )}
              >
                {p.label}
              </button>
            );
          })}
        </div>

        {isCustom && (
          <div className="flex items-end gap-3">
            <div className="w-44">
              <InputDate
                label="De"
                value={period.from}
                onChange={handleFromChange}
              />
            </div>
            <div className="w-44">
              <InputDate
                label="Até"
                value={period.to}
                onChange={handleToChange}
                min={period.from}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
