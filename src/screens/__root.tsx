import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createRootRoute, Outlet } from "@tanstack/react-router";

import { AuthProvider } from "@/contexts/auth-context";

import { Toaster } from "@/components/ui/sonner";
import { AuthLoader } from "@/components/auth-loader";
import { NotFoundPage } from "@/components/not-found-page";

const queryClient = new QueryClient();

const RootLayout = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <AuthLoader>
        <Outlet />
      </AuthLoader>
    </AuthProvider>

    <Toaster position="top-right" expand={true} richColors duration={3000} />
  </QueryClientProvider>
);

export const Route = createRootRoute({
  component: RootLayout,
  notFoundComponent: NotFoundPage,
});
