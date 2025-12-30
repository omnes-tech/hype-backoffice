import type { ComponentProps } from "react";

import { Icon } from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { WorkspaceDropdown } from "./workspace-dropdown";
import { useWorkspaces } from "@/hooks/use-workspaces";

interface HeaderProps extends ComponentProps<"header"> {
  title: string;
}

export function Header({ title, ...props }: HeaderProps) {
  const { data: workspaces = [], isLoading } = useWorkspaces();

  return (
    <header
      className="w-full bg-neutral-50 py-3 px-6 flex items-center justify-between"
      {...props}
    >
      <h1 className="text-xl font-medium text-neutral-950">{title}</h1>

      <div className="flex items-center gap-8">
        <div className="flex items-center gap-4">
          <Button variant="outline">
            <div className="flex items-center gap-2">
              <Icon name="Wallet" size={16} color="#0A0A0A" />

              <p className="font-medium text-neutral-950 whitespace-nowrap">
                R$ 13.000,00
              </p>
            </div>
          </Button>

          {isLoading ? (
            <div className="w-32 h-11 rounded-3xl border border-neutral-200 flex items-center justify-center bg-neutral-50">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-neutral-600"></div>
            </div>
          ) : workspaces.length > 0 ? (
            <WorkspaceDropdown options={workspaces} />
          ) : (
            <div className="w-32 h-11 rounded-3xl border border-neutral-200 flex items-center justify-center bg-neutral-50">
              <span className="text-xs text-neutral-600">Sem workspaces</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-4">
          <Icon name="Bell" size={20} color="#0A0A0A" />
          <Icon name="MessageSquare" size={20} color="#0A0A0A" />
        </div>
      </div>
    </header>
  );
}
