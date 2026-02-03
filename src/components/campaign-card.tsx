import { useNavigate } from "@tanstack/react-router";

import { Badge } from "@/components/ui/badge";
import { ProgressBar } from "@/components/ui/progress-bar";
import { getUploadUrl } from "@/lib/utils/api";

interface CampaignCardProps {
  id: string | number;
  title: string;
  phase: string;
  progressPercentage: number;
  banner?: string;
  influencersCount: number;
}

export function CampaignCard({
  id,
  title,
  phase,
  progressPercentage,
  banner,
  influencersCount,
}: CampaignCardProps) {
  const navigate = useNavigate();

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    navigate({
      to: "/campaigns/$campaignId",
      params: { campaignId: id.toString() },
    });
  };

  return (
    <div
      className="w-full h-auto rounded-3xl border border-neutral-200 overflow-hidden cursor-pointer hover:shadow-lg transition-shadow duration-200"
      onClick={handleClick}
    >
      <div className="w-full h-48 relative bg-neutral-200">
        {banner ? (
          <img 
            src={getUploadUrl(banner)} 
            alt={title} 
            className="w-full h-full object-cover" 
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-neutral-200">
            <span className="text-neutral-400 text-sm">Sem banner</span>
          </div>
        )}

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
