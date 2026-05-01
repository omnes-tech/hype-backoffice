import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getShipment,
  updateShipment,
  type ShipmentPayload,
} from "@/shared/services/campaign-shipment";

export function useShipment(campaignId: string, influencerId: string) {
  return useQuery({
    queryKey: ["campaigns", campaignId, "shipment", influencerId],
    queryFn: () => getShipment(campaignId, influencerId),
    enabled: !!campaignId && !!influencerId,
    staleTime: 30_000,
  });
}

export function useUpdateShipment(campaignId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      influencerId,
      payload,
    }: {
      influencerId: string;
      payload: ShipmentPayload;
    }) => updateShipment(campaignId, influencerId, payload),
    onSuccess: (_data, { influencerId }) => {
      // Recarrega o registro de envio do influenciador específico
      queryClient.invalidateQueries({
        queryKey: ["campaigns", campaignId, "shipment", influencerId],
      });
      // Atualiza dados de gerenciamento para refletir o status novo
      queryClient.invalidateQueries({
        queryKey: ["campaigns", campaignId, "management"],
      });
    },
  });
}
