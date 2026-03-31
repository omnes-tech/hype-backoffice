import { getApiUrl } from "@/lib/utils/api";

/**
 * Resumo público da campanha (convite compartilhável).
 * Esperado no servidor: `GET /public/campaigns/:publicId/invite` sem auth.
 * Resposta: `{ "data": { ... } }` (mesmo padrão das demais rotas).
 */
export interface PublicCampaignInviteData {
  title: string;
  description: string;
  objective?: string;
  status?: string;
  banner?: string | null;
  max_influencers?: number;
  segment_min_followers?: number;
  primary_niche?: { name?: string };
  payment_method?: string;
  payment_method_details?: {
    amount?: number;
    currency?: string;
    description?: string;
  };
  benefits?: string[];
  rules_does?: string[];
  rules_does_not?: string[];
  image_rights_period?: number;
}

function asStringArray(v: unknown): string[] | undefined {
  if (Array.isArray(v)) {
    const out = v.map((x) => String(x).trim()).filter(Boolean);
    return out.length ? out : undefined;
  }
  if (typeof v === "string" && v.trim()) {
    const lines = v
      .split(/\n/)
      .map((s) => s.trim())
      .filter(Boolean);
    return lines.length ? lines : undefined;
  }
  return undefined;
}

function normalizePublicInvite(raw: Record<string, unknown>): PublicCampaignInviteData {
  const primary = raw.primary_niche as Record<string, unknown> | undefined;
  const paymentDetails = raw.payment_method_details as Record<string, unknown> | undefined;

  return {
    title: String(raw.title ?? raw.name ?? "Campanha"),
    description: String(raw.description ?? ""),
    objective:
      raw.objective != null && String(raw.objective).trim()
        ? String(raw.objective)
        : undefined,
    status: raw.status != null ? String(raw.status) : undefined,
    banner:
      raw.banner != null
        ? String(raw.banner)
        : raw.banner_url != null
          ? String(raw.banner_url)
          : null,
    max_influencers:
      raw.max_influencers != null ? Number(raw.max_influencers) : undefined,
    segment_min_followers:
      raw.segment_min_followers != null
        ? Number(raw.segment_min_followers)
        : undefined,
    primary_niche:
      primary && typeof primary === "object"
        ? { name: primary.name != null ? String(primary.name) : undefined }
        : undefined,
    payment_method:
      raw.payment_method != null ? String(raw.payment_method) : undefined,
    payment_method_details: paymentDetails
      ? {
          amount:
            paymentDetails.amount != null
              ? Number(paymentDetails.amount)
              : undefined,
          currency:
            paymentDetails.currency != null
              ? String(paymentDetails.currency)
              : undefined,
          description:
            paymentDetails.description != null
              ? String(paymentDetails.description)
              : undefined,
        }
      : undefined,
    benefits: asStringArray(raw.benefits),
    rules_does: asStringArray(raw.rules_does),
    rules_does_not: asStringArray(raw.rules_does_not),
    image_rights_period:
      raw.image_rights_period != null
        ? Number(raw.image_rights_period)
        : undefined,
  };
}

export async function getPublicCampaignInvite(
  campaignPublicId: string
): Promise<PublicCampaignInviteData> {
  const request = await fetch(
    getApiUrl(`/public/campaigns/${campaignPublicId}/invite`),
    {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    }
  );

  if (!request.ok) {
    if (request.status === 404) {
      const err = new Error("Campanha não encontrada ou indisponível.") as Error & {
        status?: number;
      };
      err.status = 404;
      throw err;
    }
    let message = "Não foi possível carregar o convite.";
    try {
      const j = await request.json();
      message = String(j?.message ?? j?.error ?? message);
    } catch {
      /* ignore */
    }
    const err = new Error(message) as Error & { status?: number };
    err.status = request.status;
    throw err;
  }

  const response = await request.json();
  const raw = (response?.data ?? response) as Record<string, unknown>;
  if (!raw || typeof raw !== "object") {
    throw new Error("Resposta inválida do servidor.");
  }
  return normalizePublicInvite(raw);
}
