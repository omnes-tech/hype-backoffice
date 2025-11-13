import { useCurrentUser } from "@/hooks/use-current-user";
import { LoadingSpinner } from "./ui/loading-spinner";

interface AuthLoaderProps {
  children: React.ReactNode;
}

export const AuthLoader = ({ children }: AuthLoaderProps) => {
  const { isLoading } = useCurrentUser();

  if (isLoading) {
    return <LoadingSpinner message="Carregando..." />;
  }

  return <>{children}</>;
};
