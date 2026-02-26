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

    <Toaster
      position="top-right"
      expand={false}
      duration={4000}
      closeButton
      toastOptions={{
        className: "shadow-sm border border-neutral-200 rounded-xl",
      }}
    />
  </QueryClientProvider>
);

export const Route = createRootRoute({
  component: RootLayout,
  notFoundComponent: NotFoundPage,
});
