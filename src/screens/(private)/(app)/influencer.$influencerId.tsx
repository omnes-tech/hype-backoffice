import { useState } from "react";
import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { useInfluencerProfile } from "@/hooks/use-influencer-profile";
import { CampaignEvaluationViewModal } from "@/components/campaign-tabs/shared/campaign-evaluation-view-modal";
import { ListMembershipModal } from "@/components/influencer-lists/list-membership-modal";
import { CampaignPickerModal } from "@/components/influencer-lists/campaign-picker-modal";
import { InfluencerProfileView } from "@/components/influencer-profile/influencer-profile-view";

export const Route = createFileRoute("/(private)/(app)/influencer/$influencerId")({
  component: InfluencerProfileScreen,
});

/**
 * Página do influenciador no backoffice (logado). O corpo visual é o componente
 * compartilhado `InfluencerProfileView` (reusado pela página pública
 * `/u/:username`); este wrapper adiciona o que é exclusivo do backoffice:
 * navegação/breadcrumb, "Salvar em lista", barra de ações (convite/pré-seleção)
 * e o modal de avaliação.
 */
function InfluencerProfileScreen() {
  const navigate = useNavigate();
  const { influencerId } = useParams({
    from: "/(private)/(app)/influencer/$influencerId",
  });
  const [metricsPosts, setMetricsPosts] = useState(10);
  const { data, isLoading, isError, error } = useInfluencerProfile(influencerId ?? "", metricsPosts);
  const [evaluationTarget, setEvaluationTarget] = useState<{ id: string; name: string } | null>(null);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [campaignAction, setCampaignAction] = useState<"invite" | "preselection" | null>(null);

  const campaign = data?.campaign;
  const influencer = data?.influencer;

  const handleBackToCampaigns = () => {
    navigate({ to: "/campaigns" });
  };

  // `users.id` canônico (vem do backend) — usado para salvar em lista e convidar.
  const userIdNum = influencer?.id != null ? Number(influencer.id) : NaN;
  const profileIds = (influencer?.social_networks ?? [])
    .map((sn) => String(sn.id))
    .filter((id) => id.trim() !== "");

  const handleCopyProfileLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success("Link do perfil copiado.");
    } catch {
      toast.error("Não foi possível copiar o link.");
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col gap-11 max-w-[1151px] mx-auto pb-8 pt-6 px-6">
        <div className="skeleton h-5 w-64" />
        <div className="skeleton h-10 w-full max-w-md" />
        <div className="skeleton h-40 w-full rounded-xl" />
      </div>
    );
  }

  if (isError || !data || !influencer) {
    const is404 = (error as { status?: number })?.status === 404;
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4">
        <p className="text-neutral-600">
          {is404 ? "Influenciador não encontrado." : "Erro ao carregar perfil."}
        </p>
        <Button variant="outline" onClick={handleBackToCampaigns}>
          Voltar às campanhas
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-11 max-w-[1151px] mx-auto px-6">
      <div className="flex flex-col gap-6 w-full">
        <div className="flex items-center gap-1 text-sm text-neutral-500 flex-wrap">
          <button
            type="button"
            onClick={handleBackToCampaigns}
            className="hover:text-neutral-700"
          >
            Campanhas
          </button>
          <Icon name="ChevronRight" size={16} color="#7c7c7c" />
          {campaign?.id ? (
            <>
              <button
                type="button"
                onClick={() =>
                  navigate({
                    to: "/campaigns/$campaignId",
                    params: { campaignId: campaign.id },
                  })
                }
                className="hover:text-neutral-700"
              >
                {campaign.title ?? "Detalhes da campanha"}
              </button>
              <Icon name="ChevronRight" size={16} color="#7c7c7c" />
            </>
          ) : null}
          <span className="text-neutral-950">Sobre o influenciador</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-2xl font-semibold text-neutral-950">
            Detalhes sobre o influenciador
          </h1>
          <Button
            variant="outline"
            className="h-11 rounded-full font-semibold border-neutral-200 min-w-max"
            onClick={() => setShowSaveModal(true)}
            disabled={Number.isNaN(userIdNum)}
            title="Salvar este influenciador em uma lista"
          >
            Salvar influenciador
          </Button>
        </div>
      </div>

      <InfluencerProfileView
        data={data}
        mode="private"
        metricsPosts={metricsPosts}
        onMetricsPostsChange={setMetricsPosts}
        onEvaluate={(id, name) => setEvaluationTarget({ id, name })}
      />

      <div className="bg-white border-t border-neutral-200 px-4 py-4 flex flex-wrap items-center justify-center rounded-full gap-4 z-10">
        <Button
          variant="outline"
          className="rounded-full font-semibold min-w-max"
          onClick={handleCopyProfileLink}
        >
          Copiar link do perfil
        </Button>
        <Button
          variant="outline"
          className="rounded-full font-semibold min-w-max"
          onClick={() => setCampaignAction("preselection")}
          disabled={Number.isNaN(userIdNum)}
        >
          Convidar para pré-seleção
        </Button>
        <Button
          className="rounded-full font-semibold bg-primary-600 hover:bg-primary-700 text-white border-0 min-w-max disabled:cursor-not-allowed disabled:opacity-60"
          onClick={() => setCampaignAction("invite")}
          disabled={Number.isNaN(userIdNum)}
        >
          Enviar convite
        </Button>
      </div>

      {evaluationTarget && influencerId && (
        <CampaignEvaluationViewModal
          campaignId={evaluationTarget.id}
          influencerId={influencerId}
          campaignName={evaluationTarget.name}
          onClose={() => setEvaluationTarget(null)}
        />
      )}

      {showSaveModal && !Number.isNaN(userIdNum) && (
        <ListMembershipModal
          userId={userIdNum}
          influencerName={influencer.name ?? "Influenciador"}
          onClose={() => setShowSaveModal(false)}
        />
      )}

      {campaignAction && !Number.isNaN(userIdNum) && (
        <CampaignPickerModal
          mode={campaignAction}
          influencerId={String(influencer.id)}
          influencerName={influencer.name ?? "Influenciador"}
          profileIds={profileIds}
          onClose={() => setCampaignAction(null)}
        />
      )}
    </div>
  );
}
