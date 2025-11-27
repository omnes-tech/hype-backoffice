import type { ComponentProps } from "react";

import { clsx } from "clsx";

interface AvatarProps extends Omit<ComponentProps<"img">, "src"> {
  src?: string;
  alt: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "4xl";
}

const sizeStyles = {
  xs: "w-6 h-6",
  sm: "w-8 h-8",
  md: "w-10 h-10",
  lg: "w-12 h-12",
  xl: "w-14 h-14",
  "2xl": "w-16 h-16",
  "3xl": "w-18 h-18",
  "4xl": "w-20 h-20",
};

export function Avatar({ src, alt, size = "md", ...props }: AvatarProps) {
  return (
    <div
      className={clsx(
        "rounded-full bg-neutral-200 overflow-hidden border-2 border-neutral-200",
        sizeStyles[size]
      )}
    >
      {src ? (
        <img
          src={src}
          alt={alt}
          {...props}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-neutral-200">
          <span className="text-neutral-950 text-xs font-medium">
            {alt.charAt(0).toUpperCase()}
          </span>
        </div>
      )}
    </div>
  );
}
