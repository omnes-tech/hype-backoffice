import { useState, type ComponentProps } from "react";

import { Icon } from "./icon";

interface InputPasswordProps extends ComponentProps<"input"> {
  label?: string;
  error?: string;
}

export function InputPassword({ label, error, ...props }: InputPasswordProps) {
  const [visiblePassword, setVisiblePassword] = useState(false);

  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={props.id} className="text-neutral-950 font-medium">
          {label}
        </label>
      )}

      <div className="w-full h-11 rounded-3xl bg-neutral-100 flex items-center justify-between px-4 focus-within:bg-neutral-200/70 transition-colors duration-150">
        <input
          type={visiblePassword ? "text" : "password"}
          className="w-full h-full outline-none placeholder:text-neutral-400 text-neutral-700"
          {...props}
        />

        <Icon
          onClick={() => setVisiblePassword(!visiblePassword)}
          name={visiblePassword ? "EyeOff" : "Eye"}
          color="#0a0a0a"
          size={16}
        />
      </div>

      {error && <p className="text-sm text-danger-600">{error}</p>}
    </div>
  );
}
