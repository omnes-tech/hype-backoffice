import { icons } from "lucide-react";

import { SidebarItem } from "@/components/sidebar-item";

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

export function Sidebar() {
  return (
    <div className="w-full h-screen bg-neutral-950 py-8 px-6 flex flex-col gap-8">
      <div className="flex items-center justify-center">
        <img src={hypeappLogo} alt="HypeApp Logo" className="h-10 w-auto" />
      </div>

      <nav className="flex-1">
        <ul className="flex flex-col gap-4">
          {menus.map((menu) => (
            <SidebarItem
              key={menu.label}
              href={menu.href}
              icon={menu.icon as keyof typeof icons}
              label={menu.label}
            />
          ))}
        </ul>
      </nav>
    </div>
  );
}
