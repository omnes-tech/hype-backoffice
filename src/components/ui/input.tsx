import type { ComponentProps } from "react";
import { Typography } from "./typography";

interface InputProps extends ComponentProps<"input"> {
  label?: string;
  icon?: React.ReactNode;
  error?: string;
}

export function Input({ label, icon, error, ...props }: InputProps) {
  return (
    <div className="w-full h-11 rounded-3xl bg-neutral-100 flex items-center justify-between px-4 focus-within:bg-neutral-200 transition-colors duration-150">
      {label && (
        <label htmlFor={props.id} className="text-neutral-950 font-medium">
          {label}
        </label>
      )}

      <input
        className="w-full h-full outline-none placeholder:text-neutral-400"
        {...props}
      />

      {icon}

      {error && (
        <Typography size="sm" color="text-danger-600" weight="regular">
          {error}
        </Typography>
      )}
    </div>
  );
}
