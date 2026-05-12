import { useState, useEffect } from "react";
import { toast } from "sonner";

import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Modal } from "@/components/ui/modal";
import { useCampaignShipments, useCreateShipment } from "@/hooks/use-campaign-shipment";
import { useQuery } from "@tanstack/react-query";
import { getCampaignProducts, type CampaignProduct } from "@/shared/services/campaign-products";
import type {
  ShipmentKind,
  ShipmentMethod,
  CreateShipmentDto,
  CampaignShipmentEntry,
} from "@/shared/services/campaign-shipment";

// ---------------------------------------------------------------------------
// Tipos e constantes
// ---------------------------------------------------------------------------

type ShipmentStage = "awaiting_shipment" | "awaiting_receipt";

const STAGE_CONFIG: Record<
  ShipmentStage,
  { label: string; actionLabel: string; color: string; iconName: string }
> = {
  awaiting_shipment: {
    label: "Aguardando envio",
    actionLabel: "Cadastrar envio",
    color: "bg-[#eff2ff] text-[#3730a3]",
    iconName: "Package",
  },
  awaiting_receipt: {
    label: "Aguardando confirmação do influenciador",
    actionLabel: "",
    color: "bg-[#fef3c7] text-[#92400e]",
    iconName: "PackageCheck",
  },
};

const SHIPMENT_STAGES: ShipmentStage[] = ["awaiting_shipment", "awaiting_receipt"];

const KIND_OPTIONS: { value: ShipmentKind; label: string }[] = [
  { value: "physical", label: "Físico (produto)" },
  { value: "digital", label: "Digital (código, acesso, etc.)" },
];

const METHOD_OPTIONS: {
  value: ShipmentMethod;
  label: string;
  onlyPhysical?: boolean;
  requiresTarget?: boolean;
}[] = [
    { value: "correios", label: "Correios", onlyPhysical: true },
    { value: "carrier", label: "Transportadora", onlyPhysical: true },
    { value: "in_person", label: "Pessoalmente", onlyPhysical: true },
    { value: "email", label: "E-mail", requiresTarget: true },
    { value: "whatsapp", label: "WhatsApp", requiresTarget: true },
  ];

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
  entry: CampaignShipmentEntry;
  products: CampaignProduct[];
  isPending: boolean;
  onConfirm: (dto: CreateShipmentDto) => void;
  onClose: () => void;
}

function ShipmentFormModal({
  entry,
  products,
  isPending,
  onConfirm,
  onClose,
}: ShipmentFormModalProps) {
  const [kind, setKind] = useState<ShipmentKind>("physical");
  const [method, setMethod] = useState<ShipmentMethod>("correios");
  const [productName, setProductName] = useState("");
  const [productDescription, setProductDescription] = useState("");
  const [productMarketValue, setProductMarketValue] = useState("");
  const [recipientAddress, setRecipientAddress] = useState("");
  const [deliveryTarget, setDeliveryTarget] = useState("");
  const [notes, setNotes] = useState("");
  const [productId, setProductId] = useState("");

  const availableMethods = METHOD_OPTIONS.filter(
    (m) => !m.onlyPhysical || kind === "physical"
  );

  const selectedMethod = METHOD_OPTIONS.find((m) => m.value === method);
  const requiresAddress = kind === "physical";
  const requiresTarget = !!selectedMethod?.requiresTarget;

  // Redefine método se ficou indisponível ao trocar kind
  useEffect(() => {
    const still = availableMethods.find((m) => m.value === method);
    if (!still) setMethod(availableMethods[0]?.value ?? "email");
  }, [kind]); // eslint-disable-line react-hooks/exhaustive-deps

  // Pré-preenche nome/descrição/valor ao selecionar produto da campanha
  const handleProductSelect = (id: string) => {
    setProductId(id);
    const p = products.find((x) => x.id === id);
    if (p) {
      setProductName(p.name);
      if (p.description) setProductDescription(p.description);
      if (p.market_value_cents != null) {
        setProductMarketValue((p.market_value_cents / 100).toFixed(2).replace(".", ","));
      }
    }
  };

  const handleSubmit = () => {
    if (!productName.trim()) {
      toast.error("O nome do produto é obrigatório.");
      return;
    }
    if (requiresAddress && !recipientAddress.trim()) {
      toast.error("O endereço de entrega é obrigatório para envio físico.");
      return;
    }
    if (requiresTarget && !deliveryTarget.trim()) {
      toast.error("O contato de entrega é obrigatório para este método.");
      return;
    }

    const rawValue = productMarketValue.replace(",", ".");
    const parsedValue = parseFloat(rawValue);

    const dto: CreateShipmentDto = {
      kind,
      method,
      product_name: productName.trim(),
    };
    if (productDescription.trim()) dto.product_description = productDescription.trim();
    if (!isNaN(parsedValue) && parsedValue > 0) dto.product_market_value_brl = parsedValue;
    if (requiresAddress && recipientAddress.trim()) dto.recipient_address = recipientAddress.trim();
    if (requiresTarget && deliveryTarget.trim()) dto.delivery_target = deliveryTarget.trim();
    if (notes.trim()) dto.notes = notes.trim();
    if (productId) dto.product_id = productId;

    onConfirm(dto);
  };

  return (
    <Modal
      title={`Cadastrar envio — ${entry.name}`}
      onClose={onClose}
      panelClassName="max-w-lg"
    >
      <div className="flex flex-col gap-4">

        {/* Tipo de envio */}
        <div className="flex flex-col gap-1.5">
          <label className={labelClass}>Tipo de envio <span className="text-red-500">*</span></label>
          <div className="flex gap-2">
            {KIND_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setKind(opt.value)}
                className={`flex-1 rounded-[24px] border px-4 py-2 text-sm font-medium transition-colors ${kind === opt.value
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
                onClick={() => setMethod(opt.value)}
                className={`rounded-[24px] border px-3 py-1.5 text-sm font-medium transition-colors ${method === opt.value
                    ? "border-primary-500 bg-primary-50 text-primary-700"
                    : "border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50"
                  }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Produto da campanha (atalho para pré-preencher) */}
        {products.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>Produto da campanha (pré-preenche os campos abaixo)</label>
            <select
              value={productId}
              onChange={(e) => handleProductSelect(e.target.value)}
              className={`${inputClass} cursor-pointer`}
            >
              <option value="">Selecionar produto...</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* Nome do produto */}
        <div className="flex flex-col gap-1.5">
          <label className={labelClass}>Nome do produto <span className="text-red-500">*</span></label>
          <input
            type="text"
            placeholder="Ex: Camiseta Hype XG"
            value={productName}
            onChange={(e) => setProductName(e.target.value)}
            className={`${inputClass} text-[#4b4b4b]`}
            disabled
          />
        </div>

        {/* Descrição do produto */}
        <div className="flex flex-col gap-1.5">
          <label className={labelClass}>Descrição</label>
          <textarea
            placeholder="Ex: Camiseta cor branca, tamanho XG"
            value={productDescription}
            onChange={(e) => setProductDescription(e.target.value)}
            rows={2}
            disabled
            className="w-full rounded-[12px] bg-[#F5F5F5] px-4 py-2.5 text-sm text-[#4b4b4b] outline-none resize-y"
          />
        </div>

        {/* Valor de mercado */}
        <div className="flex flex-col gap-1.5">
          <label className={labelClass}>Valor de mercado em R$ <span className="text-red-500">*</span></label>
          <input
            type="text"
            placeholder="Ex: 149,90"
            value={productMarketValue}
            onChange={(e) => setProductMarketValue(e.target.value)}
            className={`${inputClass} text-[#4b4b4b]`}
            disabled
          />
        </div>

        {/* Endereço de entrega — obrigatório para físico */}
        {requiresAddress && (
          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>
              Endereço de entrega <span className="text-red-500">*</span>
            </label>
            <textarea
              placeholder="Rua, número, bairro, cidade, CEP"
              value={recipientAddress}
              onChange={(e) => setRecipientAddress(e.target.value)}
              rows={2}
              className="w-full rounded-[12px] bg-[#F5F5F5] px-4 py-2.5 text-sm text-[#0A0A0A] placeholder:text-[#A3A3A3] outline-none resize-y"
            />
          </div>
        )}

        {/* Contato de entrega — obrigatório para email/whatsapp */}
        {requiresTarget && (
          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>
              {method === "email" ? "E-mail de destino" : "WhatsApp de destino"}{" "}
              <span className="text-red-500">*</span>
            </label>
            <input
              type={method === "email" ? "email" : "text"}
              placeholder={method === "email" ? "email@exemplo.com" : "(11) 99999-9999"}
              value={deliveryTarget}
              onChange={(e) => setDeliveryTarget(e.target.value)}
              className={inputClass}
            />
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
  entry,
  onRegister,
  isPending,
}: {
  entry: CampaignShipmentEntry;
  onRegister: (entry: CampaignShipmentEntry) => void;
  isPending: boolean;
}) {
  const stage = entry.status as ShipmentStage;
  const config = STAGE_CONFIG[stage];

  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-neutral-200 bg-white px-4 py-3">
      <div className="flex items-center gap-3 min-w-0">
        <Avatar src={entry.avatar ?? undefined} alt={entry.name} size="sm" />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-neutral-900">{entry.name}</p>
          <p className="truncate text-xs text-neutral-500">{entry.email}</p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${config.color}`}>
          {config.label}
        </span>
        {config.actionLabel && (
          <Button
            type="button"
            variant="outline"
            disabled={isPending}
            onClick={() => onRegister(entry)}
            className="h-8 rounded-[24px] px-3 text-xs font-semibold"
          >
            <span className="flex items-center gap-1.5">
              <Icon name={config.iconName as "Package"} size={13} color="#404040" />
              {config.actionLabel}
            </span>
          </Button>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------

interface ShipmentTabProps {
  campaignId: string;
}

export function ShipmentTab({ campaignId }: ShipmentTabProps) {
  const [shipmentTarget, setShipmentTarget] = useState<CampaignShipmentEntry | null>(null);

  const { data: entries = [], isLoading } = useCampaignShipments(campaignId);

  const { mutate: createShipment, isPending } = useCreateShipment(campaignId);

  const { data: products = [] } = useQuery({
    queryKey: ["campaigns", campaignId, "products"],
    queryFn: () => getCampaignProducts(campaignId),
    staleTime: 60_000,
  });

  const byStage = (stage: ShipmentStage) =>
    entries.filter((e) => e.status === stage);

  const handleConfirm = (dto: CreateShipmentDto) => {
    if (!shipmentTarget) return;

    createShipment(
      { influencerId: String(shipmentTarget.campaign_user_id), dto },
      {
        onSuccess: () => {
          toast.success("Envio cadastrado com sucesso.");
          setShipmentTarget(null);
        },
        onError: (err) => {
          toast.error(err instanceof Error ? err.message : "Erro ao cadastrar envio.");
        },
      }
    );
  };

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="skeleton h-16 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  const totalInFlow = entries.length;

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-semibold text-neutral-900">Gerenciamento de Envios</h2>
          <p className="text-sm text-neutral-500">
            Acompanhe e registre o envio dos produtos para cada influenciador.
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
                  {list.map((entry) => (
                    <InfluencerShipmentCard
                      key={entry.user_id}
                      entry={entry}
                      onRegister={setShipmentTarget}
                      isPending={isPending}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {shipmentTarget && (
        <ShipmentFormModal
          entry={shipmentTarget}
          products={products}
          isPending={isPending}
          onConfirm={handleConfirm}
          onClose={() => setShipmentTarget(null)}
        />
      )}
    </div>
  );
}
