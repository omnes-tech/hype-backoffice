import { useState, useRef, useEffect, type ComponentProps } from "react";

import { ChevronDown } from "lucide-react";
import { clsx } from "clsx";

import type { Workspace } from "@/shared/types";
import { useWorkspace } from "@/hooks/use-workspace";

import { Avatar } from "@/components/ui/avatar";

interface WorkspaceDropdownProps
  extends Omit<ComponentProps<"div">, "onChange"> {
  options: Array<Workspace>;
  value?: Workspace;
  onChange?: (value: Workspace) => void;
}

export function WorkspaceDropdown({
  options,
  value,
  onChange,
  ...props
}: WorkspaceDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { selectedWorkspace, selectWorkspace } = useWorkspace(options, value);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleSelect = (workspace: Workspace) => {
    selectWorkspace(workspace);
    onChange?.(workspace);
    setIsOpen(false);
  };

  return (
    <div className="w-full flex flex-col relative" ref={dropdownRef} {...props}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={clsx(
          "w-full h-11 flex items-center justify-between gap-6 px-4",
          isOpen && options.length > 0
            ? "rounded-t-3xl border-t border-r border-l border-neutral-200 shadow-md"
            : "rounded-3xl border border-neutral-200"
        )}
      >
        <div className="flex items-center gap-2">
          <Avatar
            size="xs"
            src={selectedWorkspace?.photo}
            alt={selectedWorkspace?.name || ""}
          />

          <span className="whitespace-nowrap text-neutral-950">
            {selectedWorkspace?.name}
          </span>
        </div>

        <ChevronDown
          className={clsx(
            "size-4 text-neutral-950 transition-transform duration-150",
            isOpen && options.length > 0 && "rotate-180"
          )}
        />
      </button>

      {isOpen && options.length > 0 && (
        <div
          className={clsx(
            "absolute top-full w-full border-b border-r border-l border-neutral-200 overflow-hidden bg-neutral-50 rounded-b-3xl z-10 shadow-md"
          )}
        >
          <div className="w-full border border-dashed border-neutral-200" />

          {options.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => handleSelect(option)}
              className={clsx(
                "w-full px-4 py-2 hover:bg-neutral-100 transition-colors duration-150",
                selectedWorkspace?.id === option.id && "bg-neutral-100"
              )}
            >
              <div className="flex items-center gap-2">
                <Avatar size="xs" src={option.photo} alt={option.name} />

                <span className="whitespace-nowrap text-neutral-950">
                  {option.name}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
