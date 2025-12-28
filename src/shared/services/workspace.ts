import { getApiUrl, getAuthToken } from "@/lib/utils/api";
import type { Workspace } from "../types";

export async function getWorkspaces(): Promise<Workspace[]> {
  const request = await fetch(getApiUrl("/workspaces"), {
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

export async function createWorkspace(data: { name: string }): Promise<Workspace> {
  const request = await fetch(getApiUrl("/workspaces"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "Client-Type": "backoffice",
      Authorization: `Bearer ${getAuthToken()}`,
    },
    body: JSON.stringify(data),
  });

  if (!request.ok) {
    const error = await request.json();

    throw error || "Failed to create workspace";
  }

  const response = await request.json();

  return response.data;
}

export async function updateWorkspace(
  workspaceId: string,
  data: { name: string }
): Promise<Workspace> {
  const request = await fetch(getApiUrl(`/workspaces/${workspaceId}`), {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "Client-Type": "backoffice",
      Authorization: `Bearer ${getAuthToken()}`,
    },
    body: JSON.stringify(data),
  });

  if (!request.ok) {
    const error = await request.json();

    throw error || "Failed to update workspace";
  }

  const response = await request.json();

  return response.data;
}

export async function deleteWorkspace(workspaceId: string): Promise<void> {
  const request = await fetch(getApiUrl(`/workspaces/${workspaceId}`), {
    method: "DELETE",
    headers: {
      Accept: "application/json",
      "Client-Type": "backoffice",
      Authorization: `Bearer ${getAuthToken()}`,
    },
  });

  if (!request.ok) {
    const error = await request.json();

    throw error || "Failed to delete workspace";
  }
}
