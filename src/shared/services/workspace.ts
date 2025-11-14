import { getApiUrl, getAuthToken } from "@/lib/utils/api";
import type { Workspace } from "../types";

export async function getWorkspaces(): Promise<Workspace[]> {
  const request = await fetch(getApiUrl("/v1/backoffice/workspaces"), {
    method: "GET",
    headers: {
      Accept: "application/json",
      "Client-Type": "backoffice",
      Authorization: `Bearer ${getAuthToken()}`,
    },
  });

  if (!request.ok) {
    const error = await request.json();

    throw error || "Failed to get workspaces";
  }

  const response = await request.json();

  return response.data;
}

export async function createWorkspace(data: FormData): Promise<Workspace> {
  const request = await fetch(getApiUrl("/v1/backoffice/workspaces"), {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Client-Type": "backoffice",
      Authorization: `Bearer ${getAuthToken()}`,
    },
    body: data,
  });

  if (!request.ok) {
    const error = await request.json();

    throw error || "Failed to create workspace";
  }

  const response = await request.json();

  return response.data;
}
