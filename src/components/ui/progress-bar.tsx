import { clsx } from "clsx";

interface ProgressBarProps {
  progressPercentage: number;
  color: string;
}

export function ProgressBar({ progressPercentage, color }: ProgressBarProps) {
  return (
    <div className="w-full h-2 bg-neutral-200 rounded-3xl">
      <div
        className={clsx(
          "h-full rounded-3xl transition-all duration-300",
          color
        )}
        style={{ width: `${progressPercentage}%` }}
      />
    </div>
  );
}
