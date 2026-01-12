import { useState, useRef, useEffect, type ComponentProps } from "react";

import { clsx } from "clsx";

import { Icon } from "@/components/ui/icon";

interface SelectProps extends Omit<ComponentProps<"div">, "onChange"> {
  label?: string;
  placeholder?: string;
  options: Array<{ value: string; label: string }>;
  value?: string;
  onChange?: (value: string) => void;
  error?: string;
  disabled?: boolean;
  openUp?: boolean;
}

export function Select({
  label,
  placeholder = "Selecione uma opção",
  options,
  value,
  onChange,
  error,
  disabled = false,
  openUp = false,
  ...props
}: SelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((option) => option.value === value);

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

  const handleSelect = (optionValue: string) => {
    onChange?.(optionValue);
    setIsOpen(false);
  };

  return (
    <div className="w-full flex flex-col gap-1 relative" ref={dropdownRef} {...props}>
      {label && (
        <label htmlFor={props.id} className="text-neutral-950 font-medium">
          {label}
        </label>
      )}

      <div className="w-full relative">
        <button
          type="button"
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
          className={clsx(
            "w-full h-11 bg-neutral-100 flex items-center justify-between px-4 outline-none focus-within:bg-neutral-200/70 rounded-3xl",
            disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
          )}
        >
          <span
            className={clsx(
              "whitespace-nowrap",
              selectedOption ? "text-neutral-950" : "text-neutral-400"
            )}
          >
            {selectedOption ? selectedOption.label : placeholder}
          </span>

          <Icon
            name="ChevronDown"
            color="#0a0a0a"
            size={16}
            className={clsx(
              "transition-transform duration-150",
              isOpen && "rotate-180"
            )}
          />
        </button>

        {isOpen && (
          <div
            className={clsx(
              "absolute z-50 w-full rounded-3xl bg-neutral-100 border border-neutral-200 shadow-lg overflow-hidden max-h-60 overflow-y-auto",
              openUp ? "bottom-full mb-1" : "top-full mt-1"
            )}
          >
            {options.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => handleSelect(option.value)}
                className={clsx(
                  "w-full text-left text-neutral-950 py-2 px-4 hover:bg-neutral-200/70 transition-colors duration-150",
                  value === option.value && "bg-neutral-200/70"
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {error && <p className="text-sm text-danger-600">{error}</p>}
    </div>
  );
}
