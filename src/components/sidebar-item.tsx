import { Link, useLocation } from "@tanstack/react-router";
import { clsx } from "clsx";
import { icons } from "lucide-react";

import { Icon } from "@/components/ui/icon";

export function SidebarItem({
  href,
  icon,
  label,
}: {
  href: string;
  icon: keyof typeof icons;
  label: string;
}) {
  const location = useLocation();
  const isActive =
    location.pathname === href || location.pathname.startsWith(`${href}/`);

  return (
    <div
      className={clsx(
        "flex items-center gap-1 px-4 py-2 rounded-3xl",
        isActive ? "bg-secondary-500" : "bg-transparent"
      )}
    >
      <Icon name={icon} size={16} color={isActive ? "#0a0a0a" : "#d4d4d4"} />

      <Link
        to={href}
        className={clsx(
          " font-medium",
          isActive ? "text-neutral-950" : "text-neutral-300"
        )}
      >
        {label}
      </Link>
    </div>
  );
}
