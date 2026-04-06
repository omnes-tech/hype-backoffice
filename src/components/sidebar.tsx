import { useRef, useState, useEffect } from "react";
import { icons } from "lucide-react";

import { SidebarItem } from "@/components/sidebar-item";
import { SidebarUserMenu } from "@/components/sidebar-user-menu";

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

      <SidebarUserMenu compact={isNarrow} />
    </div>
  );
}
