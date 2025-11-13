import { createFileRoute } from "@tanstack/react-router";
import { Outlet } from "@tanstack/react-router";

import authLayoutImage from "@/assets/images/auth-layout-image.png";

export const Route = createFileRoute("/(public)")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="w-full h-screen bg-neutral-050 flex">
      <div className="w-1/2">
        <img
          src={authLayoutImage}
          alt="HypeApp"
          className="w-full h-full object-cover"
        />
      </div>

      <div className="flex-1 flex items-center justify-center">
        <Outlet />
      </div>
    </div>
  );
}
