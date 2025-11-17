import type { ComponentProps } from "react";

interface SelectProps extends ComponentProps<"select"> {
  options: {
    label: string;
    value: string;
  }[];
  placeholder?: string;
}

export function Select({ options, placeholder, ...props }: SelectProps) {
  return (
    <div className="w-full h-11 rounded-3xl bg-transparent border border-neutral-200 px-4">
      <select
        className="w-full h-full outline-none text-neutral-950"
        {...props}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
