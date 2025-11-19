import type { ComponentProps } from "react";

import { Icon } from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { WorkspaceDropdown } from "./workspace-dropdown";

interface HeaderProps extends ComponentProps<"header"> {
  title: string;
}

export function Header({ title, ...props }: HeaderProps) {
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

          <WorkspaceDropdown
            options={[
              { id: 1, name: "Stepy", photo: "https://github.com/shadcn.png" },
              {
                id: 2,
                name: "Coca-Cola",
                photo: "https://github.com/shadcn.png",
              },
              { id: 3, name: "Pepsi", photo: "https://github.com/shadcn.png" },
            ]}
          />
        </div>

        <div className="flex items-center gap-4">
          <Icon name="Bell" size={20} color="#0A0A0A" />
          <Icon name="MessageSquare" size={20} color="#0A0A0A" />
        </div>
      </div>
    </header>
  );
}
