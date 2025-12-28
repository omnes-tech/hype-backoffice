export const getApiUrl = (path: string): string => {
  const baseUrl = "http://localhost:3000/api/backoffice";

  if (!baseUrl) {
    throw new Error("Unable to get base url.");
  }

  return `${baseUrl}${path}`;
};

export const saveAuthToken = (token: string): void => {
  localStorage.setItem("token", token);
};

export const getAuthToken = (): string | null => {
  return localStorage.getItem("token");
};

export const removeAuthToken = (): void => {
  localStorage.removeItem("token");
};

export const getWorkspaceId = (): string | null => {
  return localStorage.getItem("workspaceId");
};

export const saveWorkspaceId = (workspaceId: string): void => {
  localStorage.setItem("workspaceId", workspaceId);
};

export const removeWorkspaceId = (): void => {
  localStorage.removeItem("workspaceId");
};
