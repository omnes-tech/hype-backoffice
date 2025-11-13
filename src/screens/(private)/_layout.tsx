import { useEffect } from "react";

import {
  createFileRoute,
  Outlet,
  redirect,
  useLocation,
  useNavigate,
} from "@tanstack/react-router";

import { getAuthToken } from "@/lib/utils/api";
import { useCurrentUser } from "@/hooks/use-current-user";

import { LoadingSpinner } from "@/components/ui/loading-spinner";

export const Route = createFileRoute("/(private)")({
  beforeLoad: async () => {
    const token = getAuthToken();

    if (!token) throw redirect({ to: "/sign-in" });
  },
  component: RouteComponent,
});

function RouteComponent() {
  const { user, isLoading } = useCurrentUser();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (user && !user.phone && !location.pathname.startsWith("/onboarding")) {
      navigate({ to: "/onboarding", replace: true });
    }
  }, [user, location.pathname, navigate]);

  if (isLoading || !user) {
    return <LoadingSpinner message="Preparando ambiente..." />;
  }

  return <Outlet />;
}
