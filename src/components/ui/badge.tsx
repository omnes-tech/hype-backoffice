import type { ComponentProps } from "react";

import { clsx } from "clsx";

interface BadgeProps extends ComponentProps<"div"> {
  text: string;
  backgroundColor: string;
  textColor: string;
}

export function Badge({
  text,
  backgroundColor,
  textColor,
  ...props
}: BadgeProps) {
  return (
    <div
      className={clsx("w-fit px-2 py-1 rounded-3xl", backgroundColor)}
      {...props}
    >
      <span className={clsx("text-sm font-medium", textColor)}>{text}</span>
    </div>
  );
}
