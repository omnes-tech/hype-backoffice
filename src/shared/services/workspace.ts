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

export interface CreateWorkspaceData {
  name: string;
  niche_id?: number;
  description?: string;
}

export async function createWorkspace(data: CreateWorkspaceData): Promise<Workspace> {
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
    let errorData;
    try {
      errorData = await request.json();
    } catch {
      errorData = { message: "Failed to create workspace" };
    }

    const error = new Error(errorData?.message || "Failed to create workspace") as any;
    error.status = request.status;
    throw error;
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

/**
 * Faz upload da foto do workspace
 */
export async function uploadWorkspacePhoto(
  workspaceId: string,
  photo: File
): Promise<void> {
  const formData = new FormData();
  formData.append("photo", photo);

  const request = await fetch(getApiUrl(`/workspaces/${workspaceId}/photo`), {
    method: "POST",
    headers: {
      "Client-Type": "backoffice",
      Authorization: `Bearer ${getAuthToken()}`,
      "Workspace-Id": workspaceId,
    },
    body: formData,
  });

  if (!request.ok) {
    let errorData;
    try {
      errorData = await request.json();
    } catch {
      errorData = { message: "Failed to upload workspace photo" };
    }

    const error = new Error(
      errorData?.message || "Failed to upload workspace photo"
    ) as any;
    error.status = request.status;
    throw error;
  }
}