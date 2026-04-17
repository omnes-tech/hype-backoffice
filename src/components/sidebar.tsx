import { useRef, useState, useEffect } from "react";
import { icons } from "lucide-react";

import { SidebarItem } from "@/components/sidebar-item";
import { SidebarUserMenu } from "@/components/sidebar-user-menu";
import { useWorkspacePermissions } from "@/contexts/workspace-context";

import hypeappLogo from "@/assets/images/hypeapp-logo.png";

const SIDEBAR_NARROW_WIDTH = 140;

export function Sidebar() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isNarrow, setIsNarrow] = useState(false);
  const permissions = useWorkspacePermissions();

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

  const menus = [
    {
      label: "Dashboard",
      icon: "LayoutDashboard" as keyof typeof icons,
      href: "/",
      visible: true,
    },
    {
      label: "Campanhas",
      icon: "Megaphone" as keyof typeof icons,
      href: "/campaigns",
      visible: permissions.campaigns_read,
    },
    {
      label: "Criadores",
      icon: "Users" as keyof typeof icons,
      href: "/creators",
      visible: permissions.catalog_read,
    },
  ];

  const visibleMenus = menus.filter((m) => m.visible);

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
          {visibleMenus.map((menu) => (
            <SidebarItem
              key={menu.label}
              href={menu.href}
              icon={menu.icon}
              label={menu.label}
              compact={isNarrow}
            />
          ))}
        </ul>
      </nav>

      <SidebarUserMenu compact={isNarrow} />
    </div>
  );
}
