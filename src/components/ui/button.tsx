import type { ComponentProps } from "react";

import { clsx } from "clsx";

interface ButtonProps extends ComponentProps<"button"> {
  variant?: "default" | "outline" | "ghost";
}

const variantStyles = {
  default: "bg-primary-600",
  outline: "bg-transparent border border-neutral-200",
  ghost: "bg-transparent",
};

export function Button({
  children,
  variant = "default",
  ...props
}: ButtonProps) {
  return (
    <button
      className={clsx("w-full h-11 rounded-3xl", variantStyles[variant])}
      {...props}
    >
      {children}
    </button>
  );
}
