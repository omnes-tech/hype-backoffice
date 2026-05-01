import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Modal } from "@/components/ui/modal";
import { useUpdateInfluencerStatus } from "@/hooks/use-campaign-influencers";
import { useUpdateShipment } from "@/hooks/use-campaign-shipment";
import {
  participantToExtended,
  type ExtendedInfluencer,
} from "./management-kanban-config";
import { mapUserStatusToKanbanColumn } from "./management-status-map";
import { getTransitionNote } from "./management-status-transitions";
import type { CampaignManagementParticipant } from "@/shared/services/campaign-management";
import { getCampaignProducts, type CampaignProduct } from "@/shared/services/campaign-products";
import type { ShippingType, ShippingMethod, ShipmentPayload } from "@/shared/services/campaign-shipment";

// ---------------------------------------------------------------------------
// Tipos e helpers
// ---------------------------------------------------------------------------

interface ShipmentTabProps {
  campaignId: string;
  participants: CampaignManagementParticipant[];
  isLoading: boolean;
}

type ShipmentStage = "script_pending" | "awaiting_shipment" | "awaiting_receipt";

const STAGE_CONFIG: Record<
  ShipmentStage,
  { label: string; actionLabel: string; nextStatus: string; color: string; iconName: string }
> = {
  script_pending: {
    label: "Prontos para envio",
    actionLabel: "Marcar como enviado",
    nextStatus: "awaiting_shipment",
    color: "bg-[#eff2ff] text-[#3730a3]",
    iconName: "Package",
  },
  awaiting_shipment: {
    label: "Produto enviado",
    actionLabel: "Confirmar recebimento",
    nextStatus: "awaiting_receipt",
    color: "bg-[#fff7ed] text-[#9a3412]",
    iconName: "Truck",
  },
  awaiting_receipt: {
    label: "Aguardando confirmação",
    actionLabel: "Produto recebido",
    nextStatus: "content_pending",
    color: "bg-[#fef3c7] text-[#92400e]",
    iconName: "PackageCheck",
  },
};

const SHIPMENT_STAGES: ShipmentStage[] = [
  "script_pending",
  "awaiting_shipment",
  "awaiting_receipt",
];

const SHIPPING_TYPE_OPTIONS: { value: ShippingType; label: string }[] = [
  { value: "physical", label: "Físico (produto)" },
  { value: "digital", label: "Digital (código, acesso, etc.)" },
];

const SHIPPING_METHOD_OPTIONS: { value: ShippingMethod; label: string; onlyPhysical?: boolean }[] = [
  { value: "carrier", label: "Transportadora", onlyPhysical: true },
  { value: "mail", label: "Correios", onlyPhysical: true },
  { value: "email", label: "E-mail" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "other", label: "Outro" },
];

function getCurrentStatus(inf: ExtendedInfluencer): string {
  if (inf.status) {
    const mapped = mapUserStatusToKanbanColumn(inf.status);
    if (mapped !== "applications" || !inf.statusHistory?.length) return mapped;
  }
  if (inf.statusHistory?.length) {
    const sorted = [...inf.statusHistory].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    return sorted[0].status;
  }
  return "applications";
}

const inputClass =
  "h-10 w-full rounded-[24px] bg-[#F5F5F5] px-4 text-sm text-[#0A0A0A] placeholder:text-[#A3A3A3] outline-none";
const labelClass = "text-sm font-medium text-[#0A0A0A]";

// ---------------------------------------------------------------------------
// Sub-componentes
// ---------------------------------------------------------------------------

function ProductsBadge({ products }: { products: CampaignProduct[] }) {
  const [open, setOpen] = useState(false);
  if (!products.length) return null;
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 rounded-[24px] border border-neutral-200 bg-white px-3 py-1.5 text-sm text-neutral-700 hover:bg-neutral-50"
      >
        <Icon name="Package" size={14} color="#525252" />
        <span>{products.length} produto{products.length > 1 ? "s" : ""} da campanha</span>
        <Icon name="ChevronDown" size={12} color="#525252" />
      </button>
      {open && (
        <div className="absolute left-0 top-full z-20 mt-1 w-72 rounded-xl border border-neutral-200 bg-white p-3 shadow-lg">
          <p className="mb-2 text-xs font-semibold uppercase text-neutral-500">Produtos a enviar</p>
          <div className="flex flex-col gap-2">
            {products.map((p) => (
              <div key={p.id} className="flex flex-col gap-0.5">
                <span className="text-sm font-medium text-neutral-900">{p.name}</span>
                {p.description && (
                  <span className="text-xs text-neutral-500 line-clamp-2">{p.description}</span>
                )}
                {p.market_value_cents != null && (
                  <span className="text-xs text-neutral-400">
                    Valor: R$ {(p.market_value_cents / 100).toFixed(2).replace(".", ",")}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface ShipmentFormModalProps {
  influencer: ExtendedInfluencer;
  products: CampaignProduct[];
  isPending: boolean;
  onConfirm: (payload: ShipmentPayload) => void;
  onClose: () => void;
}

function ShipmentFormModal({
  influencer,
  products,
  isPending,
  onConfirm,
  onClose,
}: ShipmentFormModalProps) {
  const [shippingType, setShippingType] = useState<ShippingType>("physical");
  const [shippingMethod, setShippingMethod] = useState<ShippingMethod>("carrier");
  const [trackingCode, setTrackingCode] = useState("");
  const [notes, setNotes] = useState("");
  const [productId, setProductId] = useState<string>(products[0]?.id ?? "");

  const availableMethods = SHIPPING_METHOD_OPTIONS.filter(
    (m) => !m.onlyPhysical || shippingType === "physical"
  );

  // Redefine método se o atual ficou indisponível ao trocar tipo
  useEffect(() => {
    const still = availableMethods.find((m) => m.value === shippingMethod);
    if (!still) setShippingMethod(availableMethods[0]?.value ?? "other");
  }, [shippingType]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = () => {
    const payload: ShipmentPayload = {
      shipping_type: shippingType,
      shipping_method: shippingMethod,
    };
    if (shippingType === "physical" && trackingCode.trim()) {
      payload.tracking_code = trackingCode.trim();
    }
    if (notes.trim()) payload.notes = notes.trim();
    if (productId) payload.product_id = productId;
    onConfirm(payload);
  };

  return (
    <Modal
      title={`Registrar envio — ${influencer.name}`}
      onClose={onClose}
      panelClassName="max-w-lg"
    >
      <div className="flex flex-col gap-4">
        {/* Tipo de envio */}
        <div className="flex flex-col gap-1.5">
          <label className={labelClass}>Tipo de envio <span className="text-red-500">*</span></label>
          <div className="flex gap-2">
            {SHIPPING_TYPE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setShippingType(opt.value)}
                className={`flex-1 rounded-[24px] border px-4 py-2 text-sm font-medium transition-colors ${
                  shippingType === opt.value
                    ? "border-primary-500 bg-primary-50 text-primary-700"
                    : "border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Método de envio */}
        <div className="flex flex-col gap-1.5">
          <label className={labelClass}>Método de envio <span className="text-red-500">*</span></label>
          <div className="flex flex-wrap gap-2">
            {availableMethods.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setShippingMethod(opt.value)}
                className={`rounded-[24px] border px-3 py-1.5 text-sm font-medium transition-colors ${
                  shippingMethod === opt.value
                    ? "border-primary-500 bg-primary-50 text-primary-700"
                    : "border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Código de rastreio (apenas envio físico) */}
        {shippingType === "physical" && (
          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>Código de rastreio (opcional)</label>
            <input
              type="text"
              placeholder="Ex: BR123456789"
              value={trackingCode}
              onChange={(e) => setTrackingCode(e.target.value)}
              className={inputClass}
            />
          </div>
        )}

        {/* Produto enviado (se a campanha tiver produtos cadastrados) */}
        {products.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>Produto enviado (opcional)</label>
            <select
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              className={`${inputClass} cursor-pointer`}
            >
              <option value="">Selecionar produto...</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* Observações */}
        <div className="flex flex-col gap-1.5">
          <label className={labelClass}>Observações (opcional)</label>
          <textarea
            placeholder="Ex: Cuidado: frágil"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="w-full rounded-[12px] bg-[#F5F5F5] px-4 py-2.5 text-sm text-[#0A0A0A] placeholder:text-[#A3A3A3] outline-none resize-y"
          />
        </div>

        <div className="flex gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            disabled={isPending}
            onClick={onClose}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            disabled={isPending}
            onClick={handleSubmit}
            className="flex-1 bg-primary-500 hover:bg-primary-600 text-white border-0"
          >
            {isPending ? "Salvando..." : "Confirmar envio"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function InfluencerShipmentCard({
  influencer,
  stage,
  onMarkSent,
  onAdvance,
  isPending,
}: {
  influencer: ExtendedInfluencer;
  stage: ShipmentStage;
  onMarkSent: (influencer: ExtendedInfluencer) => void;
  onAdvance: (id: string, nextStatus: string) => void;
  isPending: boolean;
}) {
  const config = STAGE_CONFIG[stage];
  const network = influencer.socialNetwork || influencer.social_networks?.[0]?.type;
  const needsShipmentForm = stage === "script_pending";

  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-neutral-200 bg-white px-4 py-3">
      <div className="flex items-center gap-3 min-w-0">
        <Avatar src={influencer.avatar} alt={influencer.name} size="sm" />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-neutral-900">{influencer.name}</p>
          <p className="truncate text-xs text-neutral-500">
            {influencer.username ? `@${influencer.username}` : "—"}
            {network && (
              <span className="ml-1.5 capitalize text-neutral-400">· {network}</span>
            )}
          </p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${config.color}`}>
          {config.label}
        </span>
        <Button
          type="button"
          variant="outline"
          disabled={isPending}
          onClick={() =>
            needsShipmentForm
              ? onMarkSent(influencer)
              : onAdvance(String(influencer.id), config.nextStatus)
          }
          className="h-8 rounded-[24px] px-3 text-xs font-semibold"
        >
          <span className="flex items-center gap-1.5">
            <Icon name={config.iconName as "Package"} size={13} color="#404040" />
            {config.actionLabel}
          </span>
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------

export function ShipmentTab({ campaignId, participants, isLoading }: ShipmentTabProps) {
  const [influencers, setInfluencers] = useState<ExtendedInfluencer[]>([]);
  const [shipmentTarget, setShipmentTarget] = useState<ExtendedInfluencer | null>(null);

  const queryClient = useQueryClient();

  const { mutate: updateStatus, isPending: isUpdatingStatus } =
    useUpdateInfluencerStatus(campaignId);

  const { mutate: updateShipment, isPending: isUpdatingShipment } =
    useUpdateShipment(campaignId);

  const { data: products = [] } = useQuery({
    queryKey: ["campaigns", campaignId, "products"],
    queryFn: () => getCampaignProducts(campaignId),
    staleTime: 60_000,
  });

  useEffect(() => {
    setInfluencers(participants.map(participantToExtended));
  }, [participants]);

  const byStage = (stage: ShipmentStage) =>
    influencers.filter((inf) => getCurrentStatus(inf) === stage);

  const isPending = isUpdatingStatus || isUpdatingShipment;

  // Transições simples (sem formulário de envio)
  const handleAdvance = (influencerId: string, nextStatus: string) => {
    const inf = influencers.find((i) => String(i.id) === influencerId);
    if (!inf) return;
    const note = getTransitionNote(getCurrentStatus(inf), nextStatus);

    updateStatus(
      { influencer_id: influencerId, status: nextStatus, feedback: note },
      {
        onSuccess: () => toast.success("Status atualizado com sucesso."),
        onError: (err) => {
          toast.error(err instanceof Error ? err.message : "Erro ao atualizar status.");
        },
      }
    );
  };

  // Envio com registro de detalhes (script_pending → awaiting_shipment)
  const handleConfirmShipment = (payload: ShipmentPayload) => {
    if (!shipmentTarget) return;
    const influencerId = String(shipmentTarget.id);

    updateShipment(
      { influencerId, payload },
      {
        onSuccess: () => {
          // Após salvar detalhes de envio, avança o status
          const note = getTransitionNote("script_pending", "awaiting_shipment");
          updateStatus(
            { influencer_id: influencerId, status: "awaiting_shipment", feedback: note },
            {
              onSuccess: () => {
                toast.success("Envio registrado com sucesso.");
                queryClient.invalidateQueries({
                  queryKey: ["campaigns", campaignId, "management"],
                });
                setShipmentTarget(null);
              },
              onError: (err) => {
                toast.error(err instanceof Error ? err.message : "Erro ao atualizar status.");
                setShipmentTarget(null);
              },
            }
          );
        },
        onError: (err) => {
          toast.error(err instanceof Error ? err.message : "Erro ao registrar envio.");
        },
      }
    );
  };

  const totalInFlow = SHIPMENT_STAGES.reduce(
    (acc, stage) => acc + byStage(stage).length,
    0
  );

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="skeleton h-16 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-semibold text-neutral-900">Gerenciamento de Envios</h2>
          <p className="text-sm text-neutral-500">
            Acompanhe e avance o envio dos produtos para cada influenciador.
          </p>
        </div>
        <ProductsBadge products={products} />
      </div>

      {totalInFlow === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-neutral-300 py-12 text-center">
          <Icon name="PackageCheck" size={36} color="#a3a3a3" />
          <p className="text-sm font-medium text-neutral-500">
            Nenhum influenciador aguardando envio no momento.
          </p>
          <p className="text-xs text-neutral-400">
            Influenciadores aparecerão aqui após o roteiro ser aprovado.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {SHIPMENT_STAGES.map((stage) => {
            const list = byStage(stage);
            if (!list.length) return null;
            const config = STAGE_CONFIG[stage];
            return (
              <section key={stage} className="flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <Icon name={config.iconName as "Package"} size={16} color="#525252" />
                  <h3 className="text-sm font-semibold text-neutral-700">
                    {config.label}
                    <span className="ml-2 text-neutral-400 font-normal">({list.length})</span>
                  </h3>
                </div>
                <div className="flex flex-col gap-2">
                  {list.map((inf) => (
                    <InfluencerShipmentCard
                      key={String(inf.id)}
                      influencer={inf}
                      stage={stage}
                      onMarkSent={setShipmentTarget}
                      onAdvance={handleAdvance}
                      isPending={isPending}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {/* Modal de detalhes de envio */}
      {shipmentTarget && (
        <ShipmentFormModal
          influencer={shipmentTarget}
          products={products}
          isPending={isPending}
          onConfirm={handleConfirmShipment}
          onClose={() => setShipmentTarget(null)}
        />
      )}
    </div>
  );
}
