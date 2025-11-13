import { getApiUrl, getAuthToken } from "@/lib/utils/api";
import type { User } from "../types";

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
    const error = await request.json();

    throw error || "Failed to get current user";
  }

  const response = await request.json();

  return response.data;
}

export async function updatePhone(phone: string): Promise<void> {
  const request = await fetch(getApiUrl("/me/phone"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "Client-Type": "backoffice",
      Authorization: `Bearer ${getAuthToken()}`,
    },
    body: JSON.stringify({ phone }),
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
