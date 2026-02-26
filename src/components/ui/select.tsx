import { useState, useRef, useEffect, useMemo, type ComponentProps } from "react";

import { clsx } from "clsx";

import { Icon } from "@/components/ui/icon";
import { ErrorMessage } from "@/components/ui/error-message";

interface SelectProps extends Omit<ComponentProps<"div">, "onChange"> {
  label?: string;
  placeholder?: string;
  options: Array<{ value: string; label: string }>;
  value?: string;
  onChange?: (value: string) => void;
  error?: string;
  disabled?: boolean;
  openUp?: boolean;
  isSearchable?: boolean;
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
  isSearchable = false,
  ...props
}: SelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const selectedOption = options.find((option) => option.value === value);

  // Filtrar opções baseado no termo de busca
  const filteredOptions = useMemo(() => {
    if (!isSearchable || !searchTerm.trim()) {
      return options;
    }
    const term = searchTerm.toLowerCase();
    return options.filter((option) =>
      option.label.toLowerCase().includes(term)
    );
  }, [options, searchTerm, isSearchable]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setSearchTerm("");
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      // Focar no input de busca quando o dropdown abrir
      if (isSearchable && searchInputRef.current) {
        setTimeout(() => {
          searchInputRef.current?.focus();
        }, 100);
      }
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, isSearchable]);

  const handleSelect = (optionValue: string) => {
    onChange?.(optionValue);
    setIsOpen(false);
    setSearchTerm("");
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
            {selectedOption?.label ?? placeholder}
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
              "absolute z-50 w-full rounded-3xl bg-neutral-100 border border-neutral-200 shadow-lg overflow-hidden max-h-60 flex flex-col",
              openUp ? "bottom-full mb-1" : "top-full mt-1"
            )}
          >
            {isSearchable && (
              <div className="p-2 border-b border-neutral-200">
                <div className="relative">
                  <Icon
                    name="Search"
                    color="#737373"
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2"
                  />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Buscar..."
                    className="w-full h-9 pl-9 pr-3 bg-white rounded-2xl border border-neutral-200 text-sm text-neutral-950 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
              </div>
            )}
            <div className="overflow-y-auto max-h-[calc(240px-60px)]">
              {filteredOptions.length === 0 ? (
                <div className="py-4 px-4 text-center text-sm text-neutral-500">
                  Nenhuma opção encontrada
                </div>
              ) : (
                filteredOptions.map((option) => (
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
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {error && <ErrorMessage message={error} />}
    </div>
  );
}
