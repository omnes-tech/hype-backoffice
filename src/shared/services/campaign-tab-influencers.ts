import { getApiUrl, getAuthToken, getWorkspaceId } from "@/lib/utils/api";
import type { Influencer } from "@/shared/types";
import {
  transformDashboardInfluencer,
  type DashboardInfluencer,
} from "@/shared/services/dashboard";

/** @see docs/API_INSCRICOES_CURADORIA.md §3 */
export type InscriptionsSegment = "applications" | "pre_selection";

/** @see docs/API_INSCRICOES_CURADORIA.md §4 */
export type CurationColumn = "pending" | "approved" | "rejected";

function mapRowToInfluencer(row: unknown): Influencer {
  return transformDashboardInfluencer(row as DashboardInfluencer);
}

async function fetchTabInfluencers<T>(url: string): Promise<T> {
  const workspaceId = getWorkspaceId();
  if (!workspaceId) {
    throw new Error("Workspace ID é obrigatório");
  }

  const request = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
      "Client-Type": "backoffice",
      Authorization: `Bearer ${getAuthToken()}`,
      "Workspace-Id": workspaceId,
    },
  });

  if (!request.ok) {
    let body: { message?: string } = {};
    try {
      body = await request.json();
    } catch {
      body = { message: request.statusText };
    }
    const err = new Error(
      body?.message || "Falha ao carregar influenciadores"
    ) as Error & { status?: number };
    err.status = request.status;
    throw err;
  }

  return request.json();
}

/**
 * GET .../users/inscriptions?segment=applications|pre_selection
 */
export async function getCampaignInscriptions(
  campaignId: string,
  segment: InscriptionsSegment
): Promise<Influencer[]> {
  const url = getApiUrl(
    `/campaigns/${campaignId}/users/inscriptions?segment=${encodeURIComponent(segment)}`
  );
  const response = await fetchTabInfluencers<{ data?: unknown[] }>(url);
  const list = response.data;
  if (!Array.isArray(list)) return [];
  return list.map(mapRowToInfluencer);
}

/**
 * GET .../users/curation?column=pending|approved|rejected
 */
export async function getCampaignCuration(
  campaignId: string,
  column: CurationColumn
): Promise<Influencer[]> {
  const url = getApiUrl(
    `/campaigns/${campaignId}/users/curation?column=${encodeURIComponent(column)}`
  );
  const response = await fetchTabInfluencers<{ data?: unknown[] }>(url);
  const list = response.data;
  if (!Array.isArray(list)) return [];
  return list.map(mapRowToInfluencer);
}
