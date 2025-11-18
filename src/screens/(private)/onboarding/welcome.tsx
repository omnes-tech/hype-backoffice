import { useEffect } from "react";

import { createFileRoute, useNavigate } from "@tanstack/react-router";

import { useAuth } from "@/contexts/auth-context";

export const Route = createFileRoute("/(private)/onboarding/welcome")({
  component: RouteComponent,
});

function RouteComponent() {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    setTimeout(() => {
      navigate({ to: "/" });
    }, 3000);
  }, []);

  return (
    <div className="max-w-md w-full flex flex-col gap-6">
      <div className="flex flex-col items-center gap-2">
        <h1 className="text-2xl font-medium text-neutral-950 whitespace-nowrap">
          Bem-vindo(a) ao Hype, {user?.name}! 🎉
        </h1>

        <p className="text-lg text-neutral-600 text-center">
          Prepare-se para criar, divulgar e conquistar resultados incríveis.
        </p>
      </div>
    </div>
  );
}
