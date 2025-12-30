import { getApiUrl, getAuthToken } from "@/lib/utils/api";
import type { User } from "../types";

interface UpdatePhoneData {
  phone: string;
}

interface VerifyPhoneData {
  phone: string;
  code: string;
}

export async function getCurrentUser(): Promise<User> {
  const request = await fetch(getApiUrl("/me"), {
    method: "GET",
    headers: {
      Accept: "application/json",
      "Client-Type": "backoffice",
      Authorization: `Bearer ${getAuthToken()}`,
    },
  });

  if (!request.ok) {
    // Se for erro 429 (Too Many Requests), não tentar novamente
    if (request.status === 429) {
      const error = new Error("Muitas requisições. Aguarde um momento.") as any;
      error.status = 429;
      error.response = { status: 429 };
      throw error;
    }

    let errorData;
    try {
      errorData = await request.json();
    } catch {
      errorData = { message: "Failed to get current user" };
    }

    // Criar erro com status code para tratamento adequado
    const error = new Error(errorData?.message || "Failed to get current user") as any;
    error.status = request.status;
    error.response = { status: request.status };
    throw error;
  }

  const response = await request.json();

  return response.data;
}

export async function updatePhone(data: UpdatePhoneData): Promise<void> {
  const request = await fetch(getApiUrl("/me/phone"), {
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

    throw error || "Failed to update phone";
  }
}

export async function verifyPhone(data: VerifyPhoneData): Promise<void> {
  const request = await fetch(getApiUrl("/me/phone/verify"), {
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

    throw error || "Failed to verify phone";
  }
}
