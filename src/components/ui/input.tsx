import type { ComponentProps, HTMLInputTypeAttribute } from "react";

interface InputProps extends ComponentProps<"input"> {
  label?: string;
  icon?: React.ReactNode;
  type?: HTMLInputTypeAttribute;
  error?: string;
}

export function Input({
  label,
  icon,
  error,
  type = "text",
  ...props
}: InputProps) {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={props.id} className="text-neutral-950 font-medium">
          {label}
        </label>
      )}

      <div className="w-full h-11 rounded-3xl bg-neutral-100 flex items-center justify-between focus-within:bg-neutral-200/70 transition-colors duration-150">
        <input
          type={type}
          className="w-full h-full rounded-3xl outline-none placeholder:text-neutral-400 text-neutral-950 px-4"
          {...props}
        />

        {icon}
      </div>

      {error && <p className="text-sm text-danger-600">{error}</p>}
    </div>
  );
}
