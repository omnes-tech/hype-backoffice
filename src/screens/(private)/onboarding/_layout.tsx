import {
  createFileRoute,
  Outlet,
  useLocation,
  useNavigate,
} from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";

import { logout } from "@/shared/services/auth";
import { removeAuthToken } from "@/lib/utils/api";
import { useAuth } from "@/contexts/auth-context";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Step } from "@/components/step";

import hypeappLogo from "@/assets/images/hypeapp-logo.png";

export const Route = createFileRoute("/(private)/onboarding")({
  component: RouteComponent,
});

function RouteComponent() {
  const { setUser } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const { mutate: logoutMutation, isPending: isLoggingOut } = useMutation({
    mutationFn: logout,
    onSuccess: () => {
      removeAuthToken();
      setUser(null);
      navigate({ to: "/sign-in", replace: true });
    },
    onError: () => {
      removeAuthToken();
      setUser(null);
      navigate({ to: "/sign-in", replace: true });
    },
  });

  const getCurrentStep = () => {
    const pathname = location.pathname;
    if (pathname === "/onboarding" || pathname === "/onboarding/") return 1;
    if (pathname.includes("/create-workspace")) return 2;
    if (pathname.includes("/welcome")) return 3;
    return 1;
  };

  const currentStep = getCurrentStep();
  const totalSteps = 3;
  const progressPercentage = (currentStep / totalSteps) * 100;

  return (
    <div className="w-full min-h-screen bg-neutral-50 flex flex-col">
      <header className="bg-neutral-950 px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-10">
          <img src={hypeappLogo} alt="HypeApp Logo" className="h-10 w-auto" />

          <h1 className="text-xl font-medium text-neutral-50">
            Configuração da conta
          </h1>
        </div>

        <div className="w-fit">
          <Button
            onClick={() => logoutMutation()}
            variant="outline"
            disabled={isLoggingOut}
          >
            <Icon name="LogOut" size={16} color="#ffffff" />

            <p className="text-neutral-50 font-medium">
              {isLoggingOut ? "Saindo..." : "Sair"}
            </p>
          </Button>
        </div>
      </header>

      <div className="w-full flex-1 flex flex-col items-center justify-center">
        <main className="flex-1 flex items-center justify-center">
          <Outlet />
        </main>

        <footer className="w-full max-w-md pb-8 shrink-0">
          <Step
            progressPercentage={progressPercentage}
            currentStep={currentStep}
            totalSteps={totalSteps}
          />
        </footer>
      </div>
    </div>
  );
}
