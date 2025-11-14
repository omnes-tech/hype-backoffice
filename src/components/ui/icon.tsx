import { icons } from "lucide-react";

export function Icon({
  name,
  color,
  size,
  onClick,
  className,
}: {
  name: keyof typeof icons;
  color: string;
  size: number;
  onClick?: () => void;
  className?: string;
}) {
  const LucideIcon = icons[name];

  return (
    <LucideIcon
      color={color}
      size={size}
      onClick={onClick}
      className={className}
    />
  );
}
