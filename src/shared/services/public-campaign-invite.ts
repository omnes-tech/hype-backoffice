import { getApiUrl } from "@/lib/utils/api";

/** Contrato HTTP completo: `docs/api-public-campaign-invite.md`. */

/**
 * Resumo público da campanha (convite compartilhável).
 * Esperado no servidor: `GET /public/campaigns/:publicId/invite` sem auth.
 * Resposta: `{ "data": { ... } }` (mesmo padrão das demais rotas).
 */
export interface PublicCampaignInviteData {
  title: string;
  description: string;
  objective?: string;
  /** Valor bruto ou `{ value, label }` — use `getCampaignStatusDisplayLabel` na UI */
  status?: unknown;
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

const NESTED_TEXT_KEYS = [
  "label",
  "title",
  "name",
  "value",
  "text",
  "description",
  "pt",
  "pt_BR",
  "pt-BR",
  "en",
  "default",
] as const;

const BANNER_REF_KEYS = [
  "url",
  "path",
  "key",
  "src",
  "banner_url",
  "file_url",
] as const;

/** Evita `String(obj)` → "[object Object]" quando a API envia objeto ou i18n. */
function coerceDisplayText(value: unknown, fallback: string): string {
  if (value == null) return fallback;
  if (typeof value === "string") {
    const t = value.trim();
    return t || fallback;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  if (typeof value === "boolean") return value ? "true" : "false";
  if (Array.isArray(value) && value.length > 0) {
    return coerceDisplayText(value[0], fallback);
  }
  if (typeof value === "object" && value !== null) {
    const o = value as Record<string, unknown>;
    for (const key of NESTED_TEXT_KEYS) {
      const hit = o[key];
      if (typeof hit === "string" && hit.trim()) return hit.trim();
    }
    for (const v of Object.values(o)) {
      if (typeof v === "string" && v.trim()) return v.trim();
    }
  }
  return fallback;
}

function coerceBannerRef(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === "string") {
    const t = value.trim();
    return t || null;
  }
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    const o = value as Record<string, unknown>;
    for (const key of BANNER_REF_KEYS) {
      const hit = o[key];
      if (typeof hit === "string" && hit.trim()) return hit.trim();
    }
  }
  return null;
}

function asStringArray(v: unknown): string[] | undefined {
  if (Array.isArray(v)) {
    const out = v
      .map((x) => coerceDisplayText(x, "").trim())
      .filter(Boolean);
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
    title: coerceDisplayText(raw.title ?? raw.name, "Campanha"),
    description: coerceDisplayText(raw.description, ""),
    objective: (() => {
      const t = coerceDisplayText(raw.objective, "");
      return t || undefined;
    })(),
    status: raw.status ?? undefined,
    banner:
      coerceBannerRef(raw.banner) ??
      coerceBannerRef(raw.banner_url) ??
      null,
    max_influencers:
      raw.max_influencers != null ? Number(raw.max_influencers) : undefined,
    segment_min_followers:
      raw.segment_min_followers != null
        ? Number(raw.segment_min_followers)
        : undefined,
    primary_niche: (() => {
      if (!primary || typeof primary !== "object") return undefined;
      const name = coerceDisplayText(primary.name, "");
      return name ? { name } : undefined;
    })(),
    payment_method: (() => {
      const pm = coerceDisplayText(raw.payment_method, "");
      return pm || undefined;
    })(),
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
          description: (() => {
            const d = coerceDisplayText(paymentDetails.description, "");
            return d || undefined;
          })(),
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

export interface PublicInvitePreRegisterPayload {
  name: string;
  email: string;
  /** Apenas dígitos; opcional conforme contrato da API */
  phone?: string;
}

/**
 * Pré-cadastro pelo link público: vincula o influenciador à campanha na **curadoria da pré-seleção**.
 * Esperado no servidor: `POST /public/campaigns/:publicId/invite/pre-register` (JSON, sem auth).
 * Corpo sugerido: `{ name, email, phone?, target_stage: "pre_selection_curation" }`.
 */
export async function postPublicCampaignInvitePreRegister(
  campaignPublicId: string,
  payload: PublicInvitePreRegisterPayload,
): Promise<void> {
  const phoneDigits = payload.phone?.replace(/\D/g, "") ?? "";
  const body: Record<string, unknown> = {
    name: payload.name.trim(),
    email: payload.email.trim(),
    target_stage: "pre_selection_curation",
  };
  if (phoneDigits.length >= 10) body.phone = phoneDigits;

  const request = await fetch(
    getApiUrl(`/public/campaigns/${campaignPublicId}/invite/pre-register`),
    {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    },
  );

  if (!request.ok) {
    let message = "Não foi possível concluir o pré-cadastro.";
    try {
      const j = (await request.json()) as { message?: string; error?: string };
      message = String(j?.message ?? j?.error ?? message);
    } catch {
      /* ignore */
    }
    const err = new Error(message) as Error & { status?: number };
    err.status = request.status;
    throw err;
  }
}

export interface PublicInviteDeclinePayload {
  name: string;
  email: string;
  phone?: string;
  /** Motivo aberto informado pelo influenciador */
  decline_reason: string;
}

/**
 * Recusa o convite com pré-cadastro (identificação) e motivo da recusa.
 * `POST /public/campaigns/:publicId/invite/decline` — JSON, sem auth.
 */
export async function postPublicCampaignInviteDecline(
  campaignPublicId: string,
  payload: PublicInviteDeclinePayload,
): Promise<void> {
  const phoneDigits = payload.phone?.replace(/\D/g, "") ?? "";
  const body: Record<string, unknown> = {
    name: payload.name.trim(),
    email: payload.email.trim(),
    decline_reason: payload.decline_reason.trim(),
  };
  if (phoneDigits.length >= 10) body.phone = phoneDigits;

  const request = await fetch(
    getApiUrl(`/public/campaigns/${campaignPublicId}/invite/decline`),
    {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    },
  );

  if (!request.ok) {
    let message = "Não foi possível registrar sua resposta.";
    try {
      const j = (await request.json()) as { message?: string; error?: string };
      message = String(j?.message ?? j?.error ?? message);
    } catch {
      /* ignore */
    }
    const err = new Error(message) as Error & { status?: number };
    err.status = request.status;
    throw err;
  }
}
