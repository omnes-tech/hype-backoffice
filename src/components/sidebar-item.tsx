import { Link, useLocation } from "@tanstack/react-router";
import { clsx } from "clsx";
import { icons } from "lucide-react";

import { Icon } from "@/components/ui/icon";

interface SidebarItemProps {
  href: string;
  icon: keyof typeof icons;
  label: string;
  /** Quando true, mostra só o ícone (sidebar encurtada) */
  compact?: boolean;
}

export function SidebarItem({ href, icon, label, compact = false }: SidebarItemProps) {
  const location = useLocation();
  const isActive =
    location.pathname === href || location.pathname.startsWith(`${href}/`);

  const content = (
    <>
      <Icon name={icon} size={18} color={isActive ? "#0a0a0a" : "#a3a3a3"} className="shrink-0" />
      {!compact && (
        <span
          className={clsx(
            "font-medium truncate min-w-0 text-sm",
            isActive ? "text-neutral-950" : "text-neutral-300"
          )}
        >
          {label}
        </span>
      )}
    </>
  );

  return (
    <div
      className={clsx(
        "flex items-center gap-2 px-3 py-2.5 rounded-2xl min-w-0 transition-colors duration-150",
        isActive ? "bg-secondary-500/90 text-neutral-950" : "text-neutral-400 hover:bg-neutral-800/50 hover:text-neutral-200"
      )}
      title={compact ? label : undefined}
    >
      <Link
        to={href}
        className="flex items-center gap-2 min-w-0 flex-1 overflow-hidden"
      >
        {content}
      </Link>
    </div>
  );
}
