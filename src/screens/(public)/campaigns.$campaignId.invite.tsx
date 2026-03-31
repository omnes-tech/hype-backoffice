import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { clsx } from "clsx";

import { Icon } from "@/components/ui/icon";
import { usePublicCampaignInvite } from "@/hooks/use-public-campaign-invite";
import { getUploadUrl } from "@/lib/utils/api";
import type { PublicCampaignInviteData } from "@/shared/services/public-campaign-invite";
import { formatReais } from "@/shared/utils/masks";
import {
  getCampaignStatusDisplayLabel,
  getCampaignStatusValue,
} from "@/shared/utils/campaign-status";

export const Route = createFileRoute("/(public)/campaigns/$campaignId/invite")({
  component: PublicCampaignInviteScreen,
});

const HYPEAPP_PLAY_STORE_URL =
  "https://play.google.com/store/apps/details?id=br.com.hypeapp.v2";

/** Android: abre o app se instalado; senão `S.browser_fallback_url` leva à Play Store (Chrome). */
const HYPEAPP_ANDROID_OPEN_INTENT = `intent://#Intent;package=br.com.hypeapp.v2;action=android.intent.action.MAIN;category=android.intent.category.LAUNCHER;S.browser_fallback_url=${encodeURIComponent(HYPEAPP_PLAY_STORE_URL)};end`;

function hrefOpenHypeappApp(): string {
  if (typeof navigator === "undefined") return HYPEAPP_PLAY_STORE_URL;
  return /Android/i.test(navigator.userAgent) ? HYPEAPP_ANDROID_OPEN_INTENT : HYPEAPP_PLAY_STORE_URL;
}

const linkPrimaryClass =
  "inline-flex items-center justify-center min-h-11 px-8 rounded-full font-semibold text-sm bg-primary-600 hover:bg-primary-700 text-white border-0 transition-colors w-full sm:w-auto text-center";

const linkOutlineClass =
  "inline-flex items-center justify-center min-h-11 px-8 rounded-full font-semibold text-sm bg-white border border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50 text-neutral-700 transition-colors w-full sm:w-auto text-center";

function paymentHint(data: PublicCampaignInviteData): string | null {
  const pm = data.payment_method;
  const d = data.payment_method_details;
  if (d?.description?.trim()) return d.description.trim();
  if (pm === "fixed" && d?.amount != null && Number.isFinite(d.amount)) {
    return `Pagamento fixo: ${formatReais(d.amount)}`;
  }
  if (pm === "cpm" && d?.amount != null && Number.isFinite(d.amount)) {
    return `CPM: ${formatReais(d.amount)}`;
  }
  if (pm && pm !== "fixed" && pm !== "cpm") {
    const labels: Record<string, string> = {
      swap: "Permuta",
      cpa: "CPA",
    };
    return labels[pm] ?? pm;
  }
  return null;
}

function PublicCampaignInviteScreen() {
  const { campaignId } = useParams({
    from: "/(public)/campaigns/$campaignId/invite",
  });

  const { data, isLoading, isError, error } = usePublicCampaignInvite(campaignId);

  if (isLoading) {
    return (
      <div className="w-full max-w-2xl mx-auto px-4 py-10 flex flex-col gap-6">
        <div className="skeleton h-8 w-48" />
        <div className="skeleton h-52 w-full rounded-xl" />
        <div className="skeleton h-32 w-full rounded-xl" />
        <div className="skeleton h-24 w-full rounded-xl" />
      </div>
    );
  }

  if (isError || !data) {
    const is404 = (error as { status?: number })?.status === 404;
    return (
      <div className="w-full max-w-md mx-auto px-4 py-16 text-center flex flex-col gap-4">
        <Icon name="Info" size={40} color="#737373" className="mx-auto" />
        <p className="text-neutral-700">
          {is404
            ? "Este convite não está disponível ou a campanha não foi encontrada."
            : (error as Error)?.message || "Não foi possível carregar os dados da campanha."}
        </p>
        <Link to="/sign-in" className={clsx(linkOutlineClass, "mx-auto")}>
          Entrar no backoffice
        </Link>
      </div>
    );
  }

  const bannerSrc = data.banner ? getUploadUrl(data.banner) ?? undefined : undefined;
  const statusValue = getCampaignStatusValue(data.status);
  const payLabel = paymentHint(data);

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-8 sm:py-10 pb-16 flex flex-col gap-8">
      <header className="flex items-center justify-between gap-4">
        <p className="text-sm font-semibold text-primary-600 tracking-tight">Hypeapp</p>
        <Link
          to="/sign-in"
          className="inline-flex items-center justify-center min-h-9 px-4 rounded-full text-sm font-medium bg-white border border-neutral-200 hover:bg-neutral-50 text-neutral-700"
        >
          Área da marca
        </Link>
      </header>

      <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden shadow-sm">
        <div className="relative h-[220px] sm:h-[260px] w-full bg-neutral-200">
          {bannerSrc ? (
            <img
              src={bannerSrc}
              alt=""
              className="absolute inset-0 size-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-neutral-400 text-sm">
              Campanha
            </div>
          )}
          <div className="absolute inset-0 bg-linear-to-t from-black/60 to-transparent" />
          <div className="absolute bottom-4 left-4 right-4 sm:bottom-6 sm:left-6 sm:right-6">
            {data.status ? (
              <span
                className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${
                  statusValue === "published"
                    ? "bg-emerald-500/90 text-white"
                    : "bg-white/90 text-neutral-950"
                }`}
              >
                {getCampaignStatusDisplayLabel(data.status)}
              </span>
            ) : null}
            <h1 className="mt-3 text-2xl sm:text-3xl font-semibold text-white drop-shadow-sm leading-tight">
              {data.title}
            </h1>
          </div>
        </div>

        <div className="p-6 sm:p-8 flex flex-col gap-8">
          <section className="flex flex-col gap-3">
            <h2 className="text-lg font-semibold text-neutral-950">Sobre a campanha</h2>
            <p className="text-base text-neutral-600 leading-relaxed whitespace-pre-wrap">
              {data.description.trim() ||
                "Detalhes desta ação serão divulgados pela marca ou pelo aplicativo Hypeapp."}
            </p>
          </section>

          {data.objective?.trim() ? (
            <section className="flex flex-col gap-2">
              <h2 className="text-lg font-semibold text-neutral-950">Objetivo</h2>
              <p className="text-base text-neutral-600 leading-relaxed whitespace-pre-wrap">
                {data.objective}
              </p>
            </section>
          ) : null}

          <section className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {data.max_influencers != null && data.max_influencers > 0 ? (
              <div className="flex items-start gap-3 rounded-xl bg-neutral-50 border border-neutral-100 p-4">
                <div className="size-10 rounded-lg bg-primary-100 flex items-center justify-center shrink-0">
                  <Icon name="Users" size={20} color="#525252" />
                </div>
                <div>
                  <p className="text-xs font-medium text-neutral-500 uppercase tracking-wide">
                    Vagas
                  </p>
                  <p className="text-base font-semibold text-neutral-950">
                    Até {data.max_influencers} influenciadores
                  </p>
                </div>
              </div>
            ) : null}
            {data.segment_min_followers != null && data.segment_min_followers > 0 ? (
              <div className="flex items-start gap-3 rounded-xl bg-neutral-50 border border-neutral-100 p-4">
                <div className="size-10 rounded-lg bg-sky-100 flex items-center justify-center shrink-0">
                  <Icon name="Eye" size={20} color="#525252" />
                </div>
                <div>
                  <p className="text-xs font-medium text-neutral-500 uppercase tracking-wide">
                    Seguidores mínimos
                  </p>
                  <p className="text-base font-semibold text-neutral-950">
                    {data.segment_min_followers.toLocaleString("pt-BR")}+
                  </p>
                </div>
              </div>
            ) : null}
            {data.primary_niche?.name ? (
              <div className="flex items-start gap-3 rounded-xl bg-neutral-50 border border-neutral-100 p-4 sm:col-span-2">
                <div className="size-10 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
                  <Icon name="Tag" size={20} color="#525252" />
                </div>
                <div>
                  <p className="text-xs font-medium text-neutral-500 uppercase tracking-wide">
                    Nicho
                  </p>
                  <p className="text-base font-semibold text-neutral-950">
                    {data.primary_niche.name}
                  </p>
                </div>
              </div>
            ) : null}
            {payLabel ? (
              <div className="flex items-start gap-3 rounded-xl bg-neutral-50 border border-neutral-100 p-4 sm:col-span-2">
                <div className="size-10 rounded-lg bg-green-100 flex items-center justify-center shrink-0">
                  <Icon name="Wallet" size={20} color="#525252" />
                </div>
                <div>
                  <p className="text-xs font-medium text-neutral-500 uppercase tracking-wide">
                    Remuneração
                  </p>
                  <p className="text-base font-semibold text-neutral-950 whitespace-pre-wrap">
                    {payLabel}
                  </p>
                </div>
              </div>
            ) : null}
            {data.image_rights_period != null && data.image_rights_period > 0 ? (
              <div className="flex items-start gap-3 rounded-xl bg-neutral-50 border border-neutral-100 p-4 sm:col-span-2">
                <div className="size-10 rounded-lg bg-violet-100 flex items-center justify-center shrink-0">
                  <Icon name="Image" size={20} color="#525252" />
                </div>
                <div>
                  <p className="text-xs font-medium text-neutral-500 uppercase tracking-wide">
                    Uso de imagem
                  </p>
                  <p className="text-base font-semibold text-neutral-950">
                    Direitos de imagem: {data.image_rights_period} meses
                  </p>
                </div>
              </div>
            ) : null}
          </section>

          {data.benefits?.length ? (
            <section className="flex flex-col gap-3">
              <h2 className="text-lg font-semibold text-neutral-950">Benefícios</h2>
              <ul className="list-disc pl-5 space-y-2 text-neutral-600">
                {data.benefits.map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
            </section>
          ) : null}

          {data.rules_does?.length ? (
            <section className="flex flex-col gap-3">
              <h2 className="text-lg font-semibold text-neutral-950">O que a campanha espera</h2>
              <ul className="list-disc pl-5 space-y-2 text-neutral-600">
                {data.rules_does.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            </section>
          ) : null}

          {data.rules_does_not?.length ? (
            <section className="flex flex-col gap-3">
              <h2 className="text-lg font-semibold text-neutral-950">Evitar</h2>
              <ul className="list-disc pl-5 space-y-2 text-neutral-600">
                {data.rules_does_not.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            </section>
          ) : null}

          <div className="rounded-xl bg-primary-50 border border-primary-100 p-5 flex flex-col gap-3">
            <p className="text-sm font-medium text-primary-900">Para influenciadores</p>
            <p className="text-sm text-primary-800 leading-relaxed">
              Inscrições e acompanhamento desta campanha para criadores ocorrem pelo{" "}
              <strong>aplicativo Hypeapp</strong>, com sua conta de influenciador. Esta página
              mostra apenas um resumo público divulgado pela marca.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2 border-t border-neutral-100">
            <a
              href={hrefOpenHypeappApp()}
              rel="noopener noreferrer"
              className={linkPrimaryClass}
            >
              Abrir no app Hypeapp
            </a>
          </div>
        </div>
    </div>
    </div>
  );
}
