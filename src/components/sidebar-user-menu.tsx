import { useState, useRef, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { clsx } from "clsx";
import { ChevronRight } from "lucide-react";

import { useAuth } from "@/contexts/auth-context";
import { useWorkspaceContext } from "@/contexts/workspace-context";
import { logout } from "@/shared/services/auth";
import { removeAuthToken } from "@/lib/utils/api";

import { Avatar } from "@/components/ui/avatar";
import { Icon } from "@/components/ui/icon";

interface SidebarUserMenuProps {
  compact?: boolean;
}

export function SidebarUserMenu({ compact = false }: SidebarUserMenuProps) {
  const { user, setUser } = useAuth();
  const { selectedWorkspace } = useWorkspaceContext();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const { mutate: logoutMutation, isPending: isLoggingOut } = useMutation({
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

  const avatarSrc =
    user?.avatar != null && String(user.avatar).trim()
      ? String(user.avatar)
      : undefined;

  return (
    <div ref={rootRef} className="relative w-full min-w-0 shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Menu da conta"
        className={clsx(
          "flex w-full items-center gap-2 rounded-xl px-1 py-1.5 text-left transition-colors hover:bg-neutral-800/80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-500",
          compact ? "justify-center" : "min-w-0",
        )}
        title={compact ? [user?.name, user?.email].filter(Boolean).join(" · ") : undefined}
      >
        <Avatar src={avatarSrc} alt={user?.name ?? "Perfil"} size="sm" />
        {!compact && (
          <>
            <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
              <p
                className="truncate text-sm font-medium text-neutral-50"
                title={user?.name ?? undefined}
              >
                {user?.name ?? "—"}
              </p>
              <p
                className="truncate text-xs text-neutral-400"
                title={user?.email ?? undefined}
              >
                {user?.email ?? "—"}
              </p>
            </div>
            <ChevronRight
              className={clsx(
                "size-4 shrink-0 text-neutral-400 transition-transform",
                open && "rotate-90",
              )}
              aria-hidden
            />
          </>
        )}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute bottom-full left-0 right-0 z-50 mb-2 overflow-hidden rounded-xl border border-neutral-700 bg-neutral-900 py-1 shadow-lg"
        >
          <button
            type="button"
            role="menuitem"
            className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-neutral-100 hover:bg-neutral-800"
            onClick={() => {
              setOpen(false);
              navigate({ to: "/onboarding/create-workspace" });
            }}
          >
            <Icon name="Building2" size={18} color="#e5e5e5" />
            Criar novo workspace
          </button>
          <button
            type="button"
            role="menuitem"
            disabled={!selectedWorkspace}
            className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-neutral-100 hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-45"
            onClick={() => {
              setOpen(false);
              navigate({ to: "/workspace/settings" });
            }}
          >
            <Icon name="Users" size={18} color="#e5e5e5" />
            Gerenciar workspace
          </button>
          <button
            type="button"
            role="menuitem"
            className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-neutral-100 hover:bg-neutral-800"
            onClick={() => {
              setOpen(false);
              navigate({ to: "/settings" });
            }}
          >
            <Icon name="Settings" size={18} color="#e5e5e5" />
            Configurações
          </button>
          <div className="my-1 border-t border-neutral-700" />
          <button
            type="button"
            role="menuitem"
            disabled={isLoggingOut}
            className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-neutral-100 hover:bg-neutral-800 disabled:opacity-50"
            onClick={() => {
              setOpen(false);
              logoutMutation();
            }}
          >
            <Icon name="LogOut" size={18} color="#e5e5e5" />
            {isLoggingOut ? "Saindo…" : "Sair"}
          </button>
        </div>
      )}
    </div>
  );
}
