import type { ComponentProps } from "react";

interface InputProps extends ComponentProps<"input"> {
  icon?: React.ReactNode;
}

export function InputSearch({ icon, ...props }: InputProps) {
  return (
    <div className="w-full h-11 rounded-3xl bg-neutral-50 border border-neutral-200 flex items-center gap-2 px-4 focus-within:bg-neutral-200/5 transition-colors duration-150">
      {icon}

      <input
        type="text"
        className="w-full h-full rounded-3xl outline-none placeholder:text-neutral-400 text-neutral-950"
        {...props}
      />
    </div>
  );
}
