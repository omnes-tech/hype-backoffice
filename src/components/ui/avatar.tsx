import type { ComponentProps } from "react";

interface AvatarProps extends ComponentProps<"img"> {
  src: string;
  alt: string;
}

export function Avatar({ src, alt, ...props }: AvatarProps) {
  return (
    <div className="w-11 h-11 rounded-full bg-neutral-100 overflow-hidden border-2 border-primary-600">
      <img
        src={src}
        alt={alt}
        {...props}
        className="w-full h-full object-cover"
      />
    </div>
  );
}
