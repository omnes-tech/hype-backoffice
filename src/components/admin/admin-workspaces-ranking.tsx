import { useState } from "react";
import { clsx } from "clsx";

import { Skeleton } from "@/components/ui/skeleton";
import { formatReais } from "@/shared/utils/masks";
import type { AdminWorkspaceRankingItem } from "@/shared/types";
import type { AdminWorkspaceRankingSort } from "@/shared/services/admin-dashboard";

interface AdminWorkspacesRankingProps {
  data: AdminWorkspaceRankingItem[] | undefined;
  isLoading?: boolean;
  isError?: boolean;
  sortBy: AdminWorkspaceRankingSort;
  onSortChange: (sort: AdminWorkspaceRankingSort) => void;
}

const SORT_LABELS: Record<AdminWorkspaceRankingSort, string> = {
  campaigns: "Campanhas ativas",
  volume: "Volume movimentado",
  influencers: "Influenciadores",
};

export function AdminWorkspacesRanking({
  data,
  isLoading,
  isError,
  sortBy,
  onSortChange,
}: AdminWorkspacesRankingProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-base font-semibold text-neutral-900">
          Top workspaces
        </h3>
        <div className="flex items-center gap-1 rounded-full border border-neutral-200 bg-white p-1">
          {(Object.keys(SORT_LABELS) as AdminWorkspaceRankingSort[]).map(
            (key) => (
              <button
                key={key}
                type="button"
                onClick={() => onSortChange(key)}
                className={clsx(
                  "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                  sortBy === key
                    ? "bg-primary-600 text-white"
                    : "text-neutral-600 hover:text-primary-700",
                )}
              >
                {SORT_LABELS[key]}
              </button>
            ),
          )}
        </div>
      </div>

      {isLoading && (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-xl" />
          ))}
        </div>
      )}

      {isError && !isLoading && (
        <div className="rounded-2xl border border-neutral-200 bg-white p-6 text-center text-sm text-neutral-500">
          Não foi possível carregar o ranking.
        </div>
      )}

      {!isLoading && !isError && (!data || data.length === 0) && (
        <div className="rounded-2xl border border-neutral-200 bg-white p-6 text-center text-sm text-neutral-500">
          Sem workspaces ativos no período.
        </div>
      )}

      {!isLoading && data && data.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50">
              <tr className="text-left text-xs font-medium uppercase tracking-wide text-neutral-500">
                <th className="px-4 py-3 w-12">#</th>
                <th className="px-4 py-3">Workspace</th>
                <th className="px-4 py-3 text-right">Campanhas ativas</th>
                <th className="px-4 py-3 text-right">Volume (R$)</th>
                <th className="px-4 py-3 text-right">Influenciadores</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row, index) => (
                <tr
                  key={row.workspace_id}
                  onMouseEnter={() => setHoveredId(row.workspace_id)}
                  onMouseLeave={() => setHoveredId(null)}
                  className={clsx(
                    "border-t border-neutral-100 transition-colors",
                    hoveredId === row.workspace_id && "bg-primary-50/30",
                  )}
                >
                  <td className="px-4 py-3 font-semibold text-neutral-500">
                    {index + 1}
                  </td>
                  <td className="px-4 py-3 font-medium text-neutral-900">
                    {row.workspace_name}
                  </td>
                  <td className="px-4 py-3 text-right text-neutral-700">
                    {row.active_campaigns}
                  </td>
                  <td className="px-4 py-3 text-right text-neutral-700">
                    {formatReais(row.total_volume)}
                  </td>
                  <td className="px-4 py-3 text-right text-neutral-700">
                    {row.influencers_contracted}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
