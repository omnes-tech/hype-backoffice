import { Avatar } from "@/components/ui/avatar";
import { Select } from "@/components/ui/select";
import type { ComponentProps } from "react";

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

      <div className="flex items-center gap-4">
        <div className="w-fit">
          <Select
            options={[
              {
                label: "Stepy",
                value: "stepy",
              },
              {
                label: "HypeApp",
                value: "hypeapp",
              },
            ]}
          />
        </div>

        <Avatar src="https://github.com/shadcn.png" alt="Avatar" />
      </div>
    </header>
  );
}
