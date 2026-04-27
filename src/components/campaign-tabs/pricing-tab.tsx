import { useState } from "react";

import { useParams } from "@tanstack/react-router";
import { clsx } from "clsx";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import {
  useAutoReserve,
  useCampaignPricing,
  useInfluencerQuote,
  useSetStepNetworkPrice,
} from "@/hooks/use-pricing";
import type {
  InfluencerQuote,
  StepBreakdown,
} from "@/shared/services/pricing";

const formatHype = (value: string | undefined): string => {
  if (!value) return "—";
  const num = Number(value);
  if (!Number.isFinite(num)) return value;
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(num);
};

export function PricingTab() {
  const { campaignId } = useParams({
    from: "/(private)/(app)/campaigns/$campaignId",
  });
  const pricingQ = useCampaignPricing(campaignId);

  const isFixed =
    pricingQ.data?.paymentMethod === "fixed" ||
    pricingQ.data?.paymentMethod === "fixed_value";

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-neutral-950 tracking-tight">
            Pricing por entregável
          </h2>
          <p className="text-sm text-neutral-500 mt-1">
            Configure o valor (em HYPE) de cada combinação fase × rede social.
            Total máximo aparece como "Até R$X" no app do influencer.
          </p>
        </div>

        <div className="flex flex-col items-end shrink-0">
          <span className="text-xs uppercase tracking-wider text-neutral-500 font-medium">
            Total máximo
          </span>
          <span className="text-3xl font-bold text-primary-600 tabular-nums">
            {formatHype(pricingQ.data?.totalMaxFormatted)}{" "}
            <span className="text-base font-medium text-neutral-700">HYPE</span>
          </span>
        </div>
      </header>

      {pricingQ.data && !isFixed && (
        <div className="rounded-xl border border-warning-400/40 bg-warning-400/5 px-4 py-3 flex items-start gap-3">
          <Icon name="TriangleAlert" size={18} color="#b45309" />
          <div>
            <p className="text-sm font-medium text-amber-800">
              Esta campanha usa <code>{pricingQ.data.paymentMethod}</code>
            </p>
            <p className="text-xs text-amber-700 mt-0.5">
              O pricing por entregável é projetado para a modalidade
              <code className="ml-1">fixed</code>. Trocar a modalidade da
              campanha em "Editar" para usar este pricing.
            </p>
          </div>
        </div>
      )}

      {pricingQ.isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <div
              key={i}
              className="h-32 rounded-2xl bg-neutral-100 animate-pulse"
            />
          ))}
        </div>
      ) : pricingQ.error ? (
        <p className="text-sm text-danger-500">
          Erro: {pricingQ.error.message}
        </p>
      ) : pricingQ.data && pricingQ.data.steps.length === 0 ? (
        <p className="text-sm text-neutral-500 text-center py-8">
          Esta campanha ainda não tem fases. Adicione fases em "Editar" antes de
          configurar o pricing.
        </p>
      ) : pricingQ.data ? (
        <div className="flex flex-col gap-4">
          {pricingQ.data.steps.map((step) => (
            <StepCard key={step.stepId} step={step} />
          ))}
        </div>
      ) : null}

      <QuoteCalculator />
    </div>
  );
}

// ---------------------------------------------------------------------------
// StepCard — uma fase com sua tabela de networks editável
// ---------------------------------------------------------------------------

function StepCard({ step }: { step: StepBreakdown }) {
  return (
    <section className="border border-neutral-200 rounded-2xl bg-white overflow-hidden">
      <header className="px-5 py-4 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/50">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-primary-600/10 flex items-center justify-center text-sm font-bold text-primary-700 tabular-nums">
            {step.order}
          </div>
          <div>
            <p className="font-medium text-neutral-950 capitalize">
              {step.objective}
            </p>
            {step.publishDate && (
              <p className="text-xs text-neutral-500">
                Publicação: {new Date(step.publishDate).toLocaleDateString("pt-BR")}
              </p>
            )}
          </div>
        </div>
      </header>

      {step.networks.length === 0 ? (
        <p className="text-xs text-neutral-500 text-center py-6 px-5">
          Esta fase ainda não tem redes sociais associadas.
        </p>
      ) : (
        <table className="w-full text-sm">
          <thead className="text-xs uppercase tracking-wider text-neutral-500 border-b border-neutral-100">
            <tr>
              <th className="text-left px-5 py-2 font-medium">Rede</th>
              <th className="text-left px-5 py-2 font-medium">Tipo</th>
              <th className="text-right px-5 py-2 font-medium">Preço (HYPE)</th>
              <th className="text-right px-5 py-2 font-medium w-32">Ações</th>
            </tr>
          </thead>
          <tbody>
            {step.networks.map((n) => (
              <PriceEditorRow
                key={n.stepNetworkId}
                stepNetworkId={n.stepNetworkId}
                networkType={n.networkType}
                networkName={n.networkName}
                currentPriceFormatted={n.priceFormatted}
              />
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// PriceEditorRow — inline editor por step×network
// ---------------------------------------------------------------------------

function PriceEditorRow({
  stepNetworkId,
  networkType,
  networkName,
  currentPriceFormatted,
}: {
  stepNetworkId: number;
  networkType: string;
  networkName: string;
  currentPriceFormatted: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(currentPriceFormatted);

  const setPrice = useSetStepNetworkPrice();

  const handleSave = async () => {
    if (!/^\d+(\.\d+)?$/.test(draft.trim())) {
      toast.error("Use número decimal não-negativo (ex.: '100' ou '1.5').");
      return;
    }
    try {
      await setPrice.mutateAsync({ stepNetworkId, priceHuman: draft.trim() });
      toast.success(`Preço atualizado para ${draft} HYPE.`);
      setEditing(false);
    } catch (e: any) {
      toast.error(`Erro: ${e?.message ?? "falha"}`);
    }
  };

  const handleCancel = () => {
    setDraft(currentPriceFormatted);
    setEditing(false);
  };

  return (
    <tr className="border-b border-neutral-100 last:border-b-0 hover:bg-neutral-50/50">
      <td className="px-5 py-2.5 font-medium text-neutral-950">{networkName}</td>
      <td className="px-5 py-2.5 text-neutral-700 text-xs uppercase tracking-wider">
        {networkType}
      </td>
      <td className="px-5 py-2.5 text-right">
        {editing ? (
          <input
            type="text"
            inputMode="decimal"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSave();
              if (e.key === "Escape") handleCancel();
            }}
            className="w-28 h-9 px-3 rounded-lg border border-primary-500/30 bg-white tabular-nums text-right outline-none focus:ring-2 focus:ring-primary-500/30"
            autoFocus
          />
        ) : (
          <span
            className={clsx(
              "font-semibold tabular-nums",
              currentPriceFormatted === "0"
                ? "text-neutral-400"
                : "text-neutral-950",
            )}
          >
            {formatHype(currentPriceFormatted)}
          </span>
        )}
      </td>
      <td className="px-5 py-2.5 text-right">
        {editing ? (
          <div className="flex gap-1 justify-end">
            <button
              onClick={handleSave}
              disabled={setPrice.isPending}
              className="px-3 py-1 rounded-md text-xs font-medium bg-primary-600 hover:bg-primary-700 text-white cursor-pointer disabled:opacity-60"
            >
              {setPrice.isPending ? "…" : "Salvar"}
            </button>
            <button
              onClick={handleCancel}
              className="px-3 py-1 rounded-md text-xs font-medium bg-neutral-100 hover:bg-neutral-200 text-neutral-700 cursor-pointer"
            >
              Cancelar
            </button>
          </div>
        ) : (
          <button
            onClick={() => setEditing(true)}
            className="px-3 py-1 rounded-md text-xs font-medium bg-neutral-100 hover:bg-neutral-200 text-neutral-700 cursor-pointer"
          >
            Editar
          </button>
        )}
      </td>
    </tr>
  );
}

// ---------------------------------------------------------------------------
// QuoteCalculator — preview do quote para um campaign_user
// ---------------------------------------------------------------------------

function QuoteCalculator() {
  const [cuId, setCuId] = useState("");
  const [activeId, setActiveId] = useState<number | null>(null);

  const quoteQ = useInfluencerQuote(activeId);
  const autoReserve = useAutoReserve();

  const handleResolve = () => {
    const id = Number(cuId.trim());
    if (!Number.isInteger(id) || id <= 0) {
      toast.error("Informe um campaign_user_id inteiro positivo.");
      return;
    }
    setActiveId(id);
  };

  const handleAutoReserve = async () => {
    if (!activeId) return;
    try {
      const hold = await autoReserve.mutateAsync(activeId);
      toast.success(`Hold #${hold.id} criado: ${hold.amountFormatted} HYPE.`);
    } catch (e: any) {
      toast.error(`Erro: ${e?.message ?? "falha"}`);
    }
  };

  return (
    <section className="border border-neutral-200 rounded-2xl bg-white p-6">
      <header className="flex items-center gap-3 mb-4">
        <div className="h-9 w-9 rounded-full bg-secondary-500/15 flex items-center justify-center">
          <Icon name="Calculator" size={16} color="#84cc16" />
        </div>
        <div>
          <h3 className="font-medium text-neutral-950">Calculadora de quote</h3>
          <p className="text-xs text-neutral-500">
            Estima o que UM influencer receberia baseado nos perfis selecionados
            (`campaign_users.profile_ids`).
          </p>
        </div>
      </header>

      <div className="flex gap-2 items-end mb-4">
        <div className="flex-1 max-w-xs">
          <Input
            label="Campaign User ID"
            type="number"
            placeholder="Ex.: 149"
            value={cuId}
            onChange={(e) => setCuId(e.target.value)}
          />
        </div>
        <Button
          variant="outline"
          onClick={handleResolve}
          disabled={!cuId.trim()}
          className="!h-11 !px-4"
        >
          Calcular
        </Button>
      </div>

      {activeId && quoteQ.data && (
        <QuoteDisplay
          quote={quoteQ.data}
          onAutoReserve={handleAutoReserve}
          autoReservePending={autoReserve.isPending}
        />
      )}
      {activeId && quoteQ.isLoading && (
        <div className="h-24 rounded-xl bg-neutral-100 animate-pulse" />
      )}
      {activeId && quoteQ.error && (
        <p className="text-xs text-danger-500">
          Erro: {quoteQ.error.message}
        </p>
      )}
    </section>
  );
}

function QuoteDisplay({
  quote,
  onAutoReserve,
  autoReservePending,
}: {
  quote: InfluencerQuote;
  onAutoReserve: () => void;
  autoReservePending: boolean;
}) {
  const isApproved = quote.status === "approved";
  const isFixed = quote.paymentMethod === "fixed" || quote.paymentMethod === "fixed_value";

  return (
    <div className="rounded-xl border border-neutral-200 bg-neutral-50/50 p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <p className="text-xs text-neutral-500 uppercase tracking-wider">
            user #{quote.userId} · cu #{quote.campaignUserId}
          </p>
          <p className="text-sm text-neutral-700 mt-0.5">
            Status: <span className="font-medium">{quote.status}</span> · Modalidade:{" "}
            <span className="font-medium">{quote.paymentMethod}</span>
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-neutral-500 uppercase">Receberia</p>
          <p className="text-2xl font-bold text-primary-600 tabular-nums">
            {formatHype(quote.totalIncludedFormatted)}{" "}
            <span className="text-sm font-medium text-neutral-700">
              {quote.currency}
            </span>
          </p>
          <p className="text-xs text-neutral-500">
            de até {formatHype(quote.totalAllFormatted)} {quote.currency} possíveis
          </p>
        </div>
      </div>

      <div className="border-t border-neutral-200 pt-4">
        <p className="text-xs uppercase tracking-wider text-neutral-500 mb-2 font-medium">
          Breakdown
        </p>
        <div className="flex flex-col gap-1">
          {quote.breakdown.map((row) => (
            <div
              key={row.stepNetworkId}
              className={clsx(
                "flex items-center justify-between py-1.5 px-2 rounded-md text-sm",
                row.included
                  ? "bg-success-500/5"
                  : "bg-transparent text-neutral-400",
              )}
            >
              <div className="flex items-center gap-2">
                <Icon
                  name={row.included ? "CircleCheck" : "Circle"}
                  size={14}
                  color={row.included ? "#22c55e" : "#a1a1aa"}
                />
                <span className="text-xs uppercase tracking-wider">
                  {row.networkType}
                </span>
                <span className="text-neutral-500">·</span>
                <span>{row.networkName}</span>
              </div>
              <span
                className={clsx(
                  "font-semibold tabular-nums",
                  row.included ? "text-neutral-950" : "text-neutral-400",
                )}
              >
                {formatHype(row.priceFormatted)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {isApproved && isFixed && quote.totalIncludedWei !== "0" && (
        <div className="border-t border-neutral-200 pt-4">
          <Button
            onClick={onAutoReserve}
            disabled={autoReservePending}
            className="w-full"
          >
            {autoReservePending
              ? "Criando hold…"
              : `Criar hold de ${formatHype(quote.totalIncludedFormatted)} ${quote.currency} (auto-reserve)`}
          </Button>
          <p className="text-[10px] text-neutral-500 mt-2 text-center">
            O hold ficará em <code>reserved</code>. Idempotente: re-tentativa retorna 409.
          </p>
        </div>
      )}
      {!isApproved && (
        <p className="text-xs text-neutral-500 text-center bg-neutral-100 rounded-lg py-2">
          Auto-reserve só está disponível para influencers em status{" "}
          <code>approved</code>.
        </p>
      )}
    </div>
  );
}
