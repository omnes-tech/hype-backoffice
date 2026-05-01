import { apiGet, apiPost, apiPut, apiDelete } from "@/lib/http-client";
import type { CampaignProductDraft } from "@/shared/types";
import { currencyToNumber } from "@/shared/utils/masks";

export interface CampaignProduct {
  id: string;
  name: string;
  description?: string | null;
  market_value_cents?: number | null;
  weight_grams?: number | null;
  dimensions?: { width_cm?: number; height_cm?: number; length_cm?: number } | null;
  images?: string[] | null;
  brand?: string | null;
  sku?: string | null;
  notes?: string | null;
  created_at?: string;
}

interface ProductPayload {
  name: string;
  description?: string;
  market_value_cents?: number;
  weight_grams?: number;
  dimensions?: { width_cm?: number; height_cm?: number; length_cm?: number };
  brand?: string;
  sku?: string;
  notes?: string;
}

function draftToPayload(draft: CampaignProductDraft): ProductPayload {
  const payload: ProductPayload = { name: draft.name.trim() };
  if (draft.description?.trim()) payload.description = draft.description.trim();
  if (draft.market_value) {
    const cents = Math.round(currencyToNumber(draft.market_value) * 100);
    if (cents > 0) payload.market_value_cents = cents;
  }
  if (draft.weight_grams) {
    const g = parseInt(draft.weight_grams, 10);
    if (!isNaN(g) && g > 0) payload.weight_grams = g;
  }
  const w = draft.width_cm ? parseFloat(draft.width_cm) : undefined;
  const h = draft.height_cm ? parseFloat(draft.height_cm) : undefined;
  const l = draft.length_cm ? parseFloat(draft.length_cm) : undefined;
  if (w || h || l) {
    payload.dimensions = {};
    if (w) payload.dimensions.width_cm = w;
    if (h) payload.dimensions.height_cm = h;
    if (l) payload.dimensions.length_cm = l;
  }
  if (draft.brand?.trim()) payload.brand = draft.brand.trim();
  if (draft.sku?.trim()) payload.sku = draft.sku.trim();
  if (draft.notes?.trim()) payload.notes = draft.notes.trim();
  return payload;
}

export async function getCampaignProducts(campaignId: string): Promise<CampaignProduct[]> {
  return apiGet<CampaignProduct[]>(`/campaigns/${campaignId}/products`);
}

export async function createCampaignProduct(
  campaignId: string,
  draft: CampaignProductDraft
): Promise<CampaignProduct> {
  return apiPost<CampaignProduct>(`/campaigns/${campaignId}/products`, draftToPayload(draft));
}

export async function updateCampaignProduct(
  campaignId: string,
  productId: string,
  draft: CampaignProductDraft
): Promise<CampaignProduct> {
  return apiPut<CampaignProduct>(
    `/campaigns/${campaignId}/products/${productId}`,
    draftToPayload(draft)
  );
}

export async function deleteCampaignProduct(
  campaignId: string,
  productId: string
): Promise<void> {
  return apiDelete(`/campaigns/${campaignId}/products/${productId}`);
}

/** Cria todos os produtos de um draft de campanha em paralelo. */
export async function createAllCampaignProducts(
  campaignId: string,
  drafts: CampaignProductDraft[]
): Promise<void> {
  const valid = drafts.filter((d) => d.name.trim());
  if (!valid.length) return;
  await Promise.all(valid.map((d) => createCampaignProduct(campaignId, d)));
}
