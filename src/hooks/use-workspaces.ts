import { useQuery } from "@tanstack/react-query";
import { getWorkspaces } from "@/shared/services/workspace";

/**
 * Hook para buscar todos os workspaces do usuário
 */
export function useWorkspaces() {
  return useQuery({
    queryKey: ["get-workspaces"],
    queryFn: getWorkspaces,
    staleTime: 5 * 60 * 1000, // Cache por 5 minutos
  });
}

