import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createRootRoute, Outlet } from "@tanstack/react-router";

import { Toaster } from "../components/ui/sonner";

const queryClient = new QueryClient();

const RootLayout = () => (
  <QueryClientProvider client={queryClient}>
    <Outlet />
    <Toaster position="top-right" expand={true} richColors duration={3000} />
  </QueryClientProvider>
);

export const Route = createRootRoute({ component: RootLayout });
