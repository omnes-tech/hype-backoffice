import { getApiUrl, getAuthToken } from "../../lib/utils/api";

interface SignInRequestData {
  email: string;
  password: string;
}

interface SignUpRequestData {
  name: string;
  email: string;
  password: string;
  password_confirmation: string;
}

interface ForgotPasswordRequestData {
  email: string;
}

interface ResetPasswordRequestData {
  code: string;
  password: string;
}

export async function signIn(
  data: SignInRequestData
): Promise<{ token: string }> {
  const request = await fetch(getApiUrl("/auth/login"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "Client-Type": "backoffice",
    },
    body: JSON.stringify(data),
  });

  if (!request.ok) {
    const error = await request.json();

    throw error || "Failed to login";
  }

  const response = await request.json();

  return response.data;
}

export async function signUp(
  data: SignUpRequestData
): Promise<{ token: string }> {
  const { password_confirmation, ...rest } = data;
  const request = await fetch(getApiUrl("/auth/register"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "Client-Type": "backoffice",
    },
    body: JSON.stringify(rest),
  });

  if (!request.ok) {
    const error = await request.json();

    throw error || "Failed to register";
  }

  const response = await request.json();

  return response.data;
}

export async function forgotPassword(
  data: ForgotPasswordRequestData
): Promise<{ message: string }> {
  const request = await fetch(getApiUrl("/auth/forgot-password"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "Client-Type": "backoffice",
    },
    body: JSON.stringify(data),
  });

  if (!request.ok) {
    const error = await request.json();
    const errorMessage = error?.message || "Failed to forgot password";
    throw new Error(errorMessage);
  }

  const response = await request.json();

  return response.data;
}

export async function resetPassword(
  data: ResetPasswordRequestData
): Promise<{ message: string }> {
  const request = await fetch(getApiUrl("/auth/reset-password"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "Client-Type": "backoffice",
    },
    body: JSON.stringify(data),
  });

  if (!request.ok) {
    const error = await request.json();
    const errorMessage = error?.message || "Failed to reset password";
    throw new Error(errorMessage);
  }

  const response = await request.json();

  return response.data;
}

export async function logout(): Promise<void> {
  const request = await fetch(getApiUrl("/auth/logout"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "Client-Type": "backoffice",
      Authorization: `Bearer ${getAuthToken()}`,
    },
  });

  if (!request.ok) {
    const error = await request.json();

    throw error || "Failed to logout";
  }
}
