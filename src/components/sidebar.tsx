import { useRef, useState, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { icons } from "lucide-react";

import { useAuth } from "@/contexts/auth-context";
import { logout } from "@/shared/services/auth";
import { removeAuthToken } from "@/lib/utils/api";

import { SidebarItem } from "@/components/sidebar-item";
import { Avatar } from "@/components/ui/avatar";
import { Icon } from "@/components/ui/icon";

import hypeappLogo from "@/assets/images/hypeapp-logo.png";

const menus = [
  {
    label: "Dashboard",
    icon: "LayoutDashboard",
    href: "/",
  },
  {
    label: "Campanhas",
    icon: "Megaphone",
    href: "/campaigns",
  },
];

const SIDEBAR_NARROW_WIDTH = 140;

export function Sidebar() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const [isNarrow, setIsNarrow] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width ?? 0;
      setIsNarrow(width < SIDEBAR_NARROW_WIDTH);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const { mutate: logoutMutation } = useMutation({
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

  return (
    <div
      ref={containerRef}
      className="w-full h-screen bg-neutral-950 py-8 px-4 flex flex-col gap-8 min-w-0 overflow-hidden"
    >
      <div className="flex items-center justify-center shrink-0">
        <img
          src={hypeappLogo}
          alt="HypeApp Logo"
          className={isNarrow ? "h-8 w-8 object-contain" : "h-10 w-auto max-w-full"}
        />
      </div>

      <nav className="flex-1 min-h-0">
        <ul className="flex flex-col gap-2">
          {menus.map((menu) => (
            <SidebarItem
              key={menu.label}
              href={menu.href}
              icon={menu.icon as keyof typeof icons}
              label={menu.label}
              compact={isNarrow}
            />
          ))}
        </ul>
      </nav>

      <div
        className="flex items-center gap-2 shrink-0 min-w-0"
        title={isNarrow ? [user?.name, user?.email].filter(Boolean).join("\n") : undefined}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div className="shrink-0">
            <Avatar src="https://github.com/shadcn.png" alt={user?.name ?? "Avatar"} size="sm" />
          </div>
          {!isNarrow && (
            <div className="flex flex-col min-w-0 flex-1 overflow-hidden">
              <p
                className="text-neutral-50 font-medium truncate text-sm"
                title={user?.name ?? undefined}
              >
                {user?.name ?? "—"}
              </p>
              <p
                className="text-xs text-neutral-300 truncate"
                title={user?.email ?? undefined}
              >
                {user?.email ?? "—"}
              </p>
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={() => logoutMutation()}
          className="shrink-0 p-1 rounded hover:bg-neutral-800 transition-colors"
          title="Sair"
          aria-label="Sair"
        >
          <Icon name="LogOut" size={16} color="#FAFAFA" />
        </button>
      </div>
    </div>
  );
}
