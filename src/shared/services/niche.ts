import { getApiUrl, getAuthToken } from "@/lib/utils/api";
import type { Niche } from "../types";

/** Garante array plano a partir de `data` (array direto ou `{ niches | items }`). */
function normalizeNichesPayload(data: unknown): Niche[] {
  if (data == null) return [];
  if (Array.isArray(data)) return data as Niche[];
  if (typeof data === "object") {
    const o = data as Record<string, unknown>;
    if (Array.isArray(o.niches)) return o.niches as Niche[];
    if (Array.isArray(o.items)) return o.items as Niche[];
    if (Array.isArray(o.data)) return o.data as Niche[];
  }
  return [];
}

/**
 * Busca todos os nichos disponíveis
 */
export async function getNiches(): Promise<Niche[]> {
  const request = await fetch(getApiUrl("/niches"), {
    method: "GET",
    headers: {
      Accept: "application/json",
      "Client-Type": "backoffice",
      Authorization: `Bearer ${getAuthToken()}`,
    },
  });

  if (!request.ok) {
    let errorData;
    try {
      errorData = await request.json();
    } catch {
      errorData = { message: "Failed to get niches" };
    }

    const error = new Error(errorData?.message || "Failed to get niches") as any;
    error.status = request.status;
    throw error;
  }

  const response = await request.json();

  return normalizeNichesPayload(response.data);
}

