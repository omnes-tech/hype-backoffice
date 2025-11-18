import type { ComponentProps } from "react";

import { clsx } from "clsx";

interface AvatarProps extends ComponentProps<"img"> {
  src: string;
  alt: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
}

const sizeStyles = {
  xs: "w-6 h-6",
  sm: "w-8 h-8",
  md: "w-10 h-10",
  lg: "w-12 h-12",
  xl: "w-14 h-14",
};

export function Avatar({ src, alt, size = "md", ...props }: AvatarProps) {
  return (
    <div
      className={clsx(
        "rounded-full bg-neutral-100 overflow-hidden border-2 border-primary-600",
        sizeStyles[size]
      )}
    >
      <img
        src={src}
        alt={alt}
        {...props}
        className="w-full h-full object-cover"
      />
    </div>
  );
}
