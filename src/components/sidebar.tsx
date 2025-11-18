import { useNavigate } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { icons } from "lucide-react";

import { useAuth } from "@/contexts/auth-context";
import { logout } from "@/shared/services/auth";
import { removeAuthToken } from "@/lib/utils/api";
import { truncateText } from "@/lib/utils/format";

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

export function Sidebar() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();

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

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Avatar src="https://github.com/shadcn.png" alt="Avatar" />

          <div className="flex flex-col">
            <p className="text-neutral-50 font-medium">{user?.name}</p>
            <p className="text-xs text-neutral-300" title={user?.email}>
              {user?.email && truncateText(user.email, 25)}
            </p>
          </div>
        </div>

        <Icon
          name="LogOut"
          size={16}
          color="#FAFAFA"
          onClick={() => logoutMutation()}
          className="cursor-pointer"
        />
      </div>
    </div>
  );
}
