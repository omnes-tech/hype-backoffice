import { createFileRoute } from "@tanstack/react-router";
import { Outlet } from "@tanstack/react-router";

import authLayoutImage from "@/assets/images/auth-layout-image.png";
import hypeappLogo from "@/assets/images/hypeapp-logo.png";

export const Route = createFileRoute("/(public)")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="w-full h-screen bg-neutral-050 flex">
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

      <div className="flex-1 flex items-center justify-center">
        <Outlet />
      </div>
    </div>
  );
}
