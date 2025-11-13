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
  token: string;
  password: string;
  passwordConfirmation: string;
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
  const request = await fetch(getApiUrl("/auth/register"), {
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

    throw error || "Failed to register";
  }

  const response = await request.json();

  return response.data;
}

export async function forgotPassword(
  data: ForgotPasswordRequestData
): Promise<void> {
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

    throw error || "Failed to forgot password";
  }

  const response = await request.json();

  return response.data;
}

export async function resetPassword(
  data: ResetPasswordRequestData
): Promise<void> {
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

    throw error || "Failed to reset password";
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
