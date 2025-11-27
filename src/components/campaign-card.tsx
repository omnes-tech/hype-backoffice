import { Badge } from "@/components/ui/badge";
import { ProgressBar } from "@/components/ui/progress-bar";

interface CampaignCardProps {
  title: string;
  phase: string;
  progressPercentage: number;
  banner: string;
  influencersCount: number;
}

export function CampaignCard({
  title,
  phase,
  progressPercentage,
  banner,
  influencersCount,
}: CampaignCardProps) {
  return (
    <div className="w-full h-auto rounded-3xl border border-neutral-200 overflow-hidden">
      <div className="w-full h-48 relative">
        <img src={banner} alt={title} className="w-full h-full object-cover" />

        <div className="absolute top-3 right-4">
          <Badge
            text={`${influencersCount} influenciadores`}
            backgroundColor="bg-primary-50"
            textColor="text-primary-900"
          />
        </div>
      </div>

      <div className="flex flex-col gap-2 p-4">
        <h1 className="text-xl font-medium text-neutral-700">{title}</h1>

        <div className="flex flex-col gap-0.5">
          <div className="flex items-center justify-between">
            <span className="text-sm text-neutral-600">{phase}</span>
            <span className="text-sm text-neutral-600">
              {progressPercentage}%
            </span>
          </div>

          <ProgressBar
            progressPercentage={progressPercentage}
            color="bg-tertiary-500"
          />
        </div>
      </div>
    </div>
  );
}
