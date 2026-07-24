import { createFileRoute, Outlet, useLocation } from "@tanstack/react-router";

import authLayoutImage from "@/assets/images/auth-layout-image.png";
import hypeappLogo from "@/assets/images/hypeapp-logo.png";

export const Route = createFileRoute("/(public)")({
  component: RouteComponent,
});

function RouteComponent() {
  const { pathname } = useLocation();
  // Páginas públicas full-width (sem o split de auth com imagem lateral):
  // convite de campanha e perfil público do influenciador `/u/:username`.
  const isFullWidthPublic =
    /\/campaigns\/[^/]+\/invite\/?$/.test(pathname) ||
    /\/u\/[^/]+\/?$/.test(pathname);

  if (isFullWidthPublic) {
    return (
      <div className="min-h-screen w-full bg-neutral-100 overflow-y-auto">
        <Outlet />
      </div>
    );
  }

  return (
    <div className="w-full h-screen bg-neutral-50 flex">
      <div className="w-1/2 relative">
        <img
          src={hypeappLogo}
          alt="HypeApp Logo"
          className="absolute top-10 left-8"
        />

        <img
          src={authLayoutImage}
          alt="HypeApp Auth Layout Image"
          className="w-full h-full object-cover"
        />
      </div>

      <div className="flex-1 flex items-center justify-center overflow-y-auto">
        <Outlet />
      </div>
    </div>
  );
}
