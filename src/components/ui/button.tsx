import type { ComponentProps } from "react";

import { clsx } from "clsx";

interface ButtonProps extends ComponentProps<"button"> {
  variant?: "default" | "outline" | "ghost";
}

const variantStyles = {
  default: "bg-primary-600 hover:bg-primary-600/80",
  outline:
    "bg-transparent border border-neutral-200 hover:border-neutral-200/80",
  ghost: "bg-transparent",
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
        "w-full h-11 rounded-3xl flex items-center justify-center gap-2 px-6 transition-colors duration-150 cursor-pointer outline-none",
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
