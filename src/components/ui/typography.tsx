import clsx from "clsx";
import type { ComponentProps } from "react";

interface TypographyProps extends ComponentProps<"p"> {
  color?: string;
  weight?: "regular" | "medium" | "semibold" | "bold";
  size?:
    | "xs"
    | "sm"
    | "md"
    | "lg"
    | "xl"
    | "2xl"
    | "3xl"
    | "4xl"
    | "5xl"
    | "6xl"
    | "7xl"
    | "8xl"
    | "9xl";
}

const writeStyles = {
  regular: "font-normal",
  medium: "font-medium",
  semibold: "font-semibold",
  bold: "font-bold",
};

const sizeStyles = {
  xs: "text-xs",
  sm: "text-sm",
  md: "text-base",
  lg: "text-lg",
  xl: "text-xl",
  "2xl": "text-2xl",
  "3xl": "text-3xl",
  "4xl": "text-4xl",
  "5xl": "text-5xl",
  "6xl": "text-6xl",
  "7xl": "text-7xl",
  "8xl": "text-8xl",
  "9xl": "text-9xl",
};

export function Typography({
  className,
  children,
  color = "text-white",
  weight = "regular",
  size = "md",
  ...props
}: TypographyProps) {
  return (
    <p
      className={clsx(className, writeStyles[weight], color, sizeStyles[size])}
      {...props}
    >
      {children}
    </p>
  );
}
