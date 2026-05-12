import { apiGet, apiPost } from "@/lib/http-client";

export type ShipmentKind = "physical" | "digital";
export type ShipmentMethod = "correios" | "carrier" | "email" | "whatsapp" | "in_person";

export interface ShipmentRecord {
  id: number;
  kind: ShipmentKind;
  method: ShipmentMethod;
  product_name: string;
  product_description?: string | null;
  product_market_value_brl?: number | null;
  recipient_address?: string | null;
  delivery_target?: string | null;
  notes?: string | null;
  product_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateShipmentDto {
  kind: ShipmentKind;
  method: ShipmentMethod;
  product_name: string;
  product_description?: string;
  product_market_value_brl?: number;
  recipient_address?: string;
  delivery_target?: string;
  notes?: string;
  product_id?: string;
}

interface CampaignShipmentRaw {
  campaign_user_id: number;
  user_id: number;
  status: "awaiting_shipment" | "awaiting_receipt";
  user: {
    name: string;
    email: string;
    photo: string | null;
  };
  shipment: ShipmentRecord | null;
}

export interface CampaignShipmentEntry {
  campaign_user_id: number;
  user_id: string;
  name: string;
  email: string;
  avatar: string | null;
  status: "awaiting_shipment" | "awaiting_receipt";
  shipment: ShipmentRecord | null;
}

function normalizeEntry(raw: CampaignShipmentRaw): CampaignShipmentEntry {
  return {
    campaign_user_id: raw.campaign_user_id,
    user_id: String(raw.user_id),
    name: raw.user?.name ?? "",
    email: raw.user?.email ?? "",
    avatar: raw.user?.photo ?? null,
    status: raw.status,
    shipment: raw.shipment ?? null,
  };
}

export async function listCampaignShipments(
  campaignId: string
): Promise<CampaignShipmentEntry[]> {
  const result = await apiGet<{ data: CampaignShipmentRaw[] } | CampaignShipmentRaw[]>(
    `/campaigns/${campaignId}/users/shipments`
  );
  const raw = Array.isArray(result) ? result : (result as { data: CampaignShipmentRaw[] }).data ?? [];
  return raw.map(normalizeEntry);
}

export async function createShipment(
  campaignId: string,
  influencerId: string,
  dto: CreateShipmentDto
): Promise<ShipmentRecord> {
  const { data } = await apiPost<{ data: ShipmentRecord }>(
    `/campaigns/${campaignId}/users/${influencerId}/shipment`,
    dto
  );
  return data;
}
