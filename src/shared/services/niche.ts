import { getApiUrl, getAuthToken } from "@/lib/utils/api";
import type { Niche } from "../types";

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

  return response.data;
}

