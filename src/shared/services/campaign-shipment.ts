import { apiGet, apiPut } from "@/lib/http-client";

export type ShippingType = "physical" | "digital";
export type ShippingMethod = "mail" | "carrier" | "email" | "whatsapp" | "other";

export interface ShipmentRecord {
  id: number;
  shipping_type: ShippingType;
  shipping_method: ShippingMethod;
  tracking_code?: string | null;
  notes?: string | null;
  product_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ShipmentPayload {
  shipping_type: ShippingType;
  shipping_method: ShippingMethod;
  tracking_code?: string;
  notes?: string;
  product_id?: string;
}

export async function getShipment(
  campaignId: string,
  influencerId: string
): Promise<ShipmentRecord | null> {
  return apiGet<ShipmentRecord | null>(
    `/campaigns/${campaignId}/users/${influencerId}/shipment`
  );
}

export async function updateShipment(
  campaignId: string,
  influencerId: string,
  payload: ShipmentPayload
): Promise<ShipmentRecord> {
  const { data } = await apiPut<{ data: ShipmentRecord }>(
    `/campaigns/${campaignId}/users/${influencerId}/shipment`,
    payload
  );
  return data;
}
