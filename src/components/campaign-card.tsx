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
      className="group w-full h-auto rounded-2xl border border-neutral-200 bg-white overflow-hidden cursor-pointer hover:border-neutral-300 hover:shadow-md transition-all duration-200"
      onClick={handleClick}
    >
      <div className="w-full h-44 relative bg-neutral-100 overflow-hidden">
        {banner ? (
          <img 
            src={getUploadUrl(banner)} 
            alt={title} 
            className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300" 
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-neutral-100">
            <span className="text-neutral-400 text-sm">Sem banner</span>
          </div>
        )}

        <div className="absolute top-3 right-3">
          <Badge
            text={`${influencersCount} influenciadores`}
            backgroundColor="bg-white/90 backdrop-blur-sm"
            textColor="text-neutral-700"
          />
        </div>
      </div>

      <div className="flex flex-col gap-3 p-4">
        <h2 className="text-base font-semibold text-neutral-950 line-clamp-2">{title}</h2>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-neutral-600">{phase}</span>
            <span className="font-medium text-neutral-700">{progressPercentage}%</span>
          </div>

          <ProgressBar
            progressPercentage={progressPercentage}
            color="bg-primary-500"
          />
        </div>
      </div>
    </div>
  );
}
