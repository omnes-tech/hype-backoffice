import { useEffect, useState } from "react";

import { useQuery } from "@tanstack/react-query";

import { useAuth } from "@/contexts/auth-context";
import { getAuthToken } from "@/lib/utils/api";
import { getCurrentUser } from "@/shared/services/me";

export function useCurrentUser() {
  const { setUser } = useAuth();
  const token = getAuthToken();

  const [isInitializing, setIsInitializing] = useState(true);

  const {
    data: currentUser,
    isLoading,
    error,
    isError,
  } = useQuery({
    queryKey: ["get-current-user", token],
    queryFn: getCurrentUser,
    enabled: !!token,
    retry: false, // Não tentar novamente em caso de erro
    refetchOnWindowFocus: false, // Não refazer fetch ao focar na janela
  });

  useEffect(() => {
    setIsInitializing(false);
  }, []);

  useEffect(() => {
    if (currentUser) {
      setUser(currentUser);
    }
  }, [currentUser, setUser]);

  // Se der erro 401 ou 404, não considerar como loading
  const isActuallyLoading = isInitializing || (!!token && isLoading && !isError);

  return {
    user: currentUser,
    isLoading: isActuallyLoading,
    error,
    isError,
  };
}
