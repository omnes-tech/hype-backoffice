import type { ComponentProps } from "react";

import { clsx } from "clsx";

interface ButtonProps extends ComponentProps<"button"> {
  variant?: "default" | "outline" | "ghost";
}

const variantStyles = {
  default: "bg-primary-600 hover:bg-primary-700 text-white shadow-sm hover:shadow",
  outline:
    "bg-white border border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50 text-neutral-700",
  ghost: "bg-transparent hover:bg-neutral-100 text-neutral-700",
};

export function Button({
  children,
  variant = "default",
  className,
  ...props
}: ButtonProps) {
  return (
    <button
      className={clsx(
        "w-full h-11 rounded-2xl flex items-center justify-center gap-2 px-6 font-medium text-sm transition-all duration-150 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-primary-500/50 focus-visible:ring-offset-2",
        "disabled:opacity-70 disabled:cursor-not-allowed",
        variantStyles[variant],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
