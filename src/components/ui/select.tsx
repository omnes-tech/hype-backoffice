import { useState, useRef, useEffect, type ComponentProps } from "react";

import { ChevronDown } from "lucide-react";
import { clsx } from "clsx";

interface SelectProps extends Omit<ComponentProps<"div">, "onChange"> {
  label?: string;
  placeholder?: string;
  options: Array<{ value: string; label: string }>;
  value?: string;
  onChange?: (value: string) => void;
  error?: string;
  disabled?: boolean;
}

export function Select({
  label,
  placeholder = "Selecione uma opção",
  options,
  value,
  onChange,
  error,
  disabled = false,
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
    <div className="w-full flex flex-col gap-1" ref={dropdownRef} {...props}>
      {label && (
        <label htmlFor={props.id} className="text-neutral-950 font-medium">
          {label}
        </label>
      )}

      <div className="w-full flex flex-col">
        <button
          type="button"
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
          className={clsx(
            "w-full h-11 bg-neutral-100 flex items-center justify-between px-4",
            isOpen
              ? "rounded-t-3xl border-b border-dashed border-neutral-200"
              : "rounded-3xl",
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

          <ChevronDown
            className={clsx(
              "size-4 text-neutral-950 transition-transform duration-150",
              isOpen && "rotate-180"
            )}
          />
        </button>

        {isOpen && (
          <div
            className={clsx(
              "w-full rounded-b-3xl bg-neutral-100 overflow-hidden"
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
