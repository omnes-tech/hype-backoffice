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
  } = useQuery({
    queryKey: ["get-current-user", token],
    queryFn: getCurrentUser,
    enabled: !!token,
  });

  useEffect(() => {
    setIsInitializing(false);
  }, []);

  useEffect(() => {
    if (currentUser) {
      setUser(currentUser);
    }
  }, [currentUser, setUser]);

  const isActuallyLoading = isInitializing || (!!token && isLoading);

  return {
    user: currentUser,
    isLoading: isActuallyLoading,
    error,
  };
}
