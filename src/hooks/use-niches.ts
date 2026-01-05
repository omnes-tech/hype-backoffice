import { useQuery } from "@tanstack/react-query";
import { getNiches } from "@/shared/services/niche";

/**
 * Hook para buscar todos os nichos disponíveis
 */
export function useNiches() {
  return useQuery({
    queryKey: ["niches"],
    queryFn: getNiches,
    staleTime: 5 * 60 * 1000, // Cache por 5 minutos
  });
}

