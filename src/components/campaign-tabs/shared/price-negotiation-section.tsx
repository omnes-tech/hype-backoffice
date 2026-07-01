import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { useRespondToPriceCounter } from "@/hooks/use-campaign-influencers";
import { fmtBRL, parsePriceBRLToCents } from "./prices-utils";

/** Bloco mínimo de negociação exibido no card. */
interface PriceNegotiation {
  proposed_price_cents: number | null;
  counter_price_cents: number | null;
  agreed_price_cents: number | null;
  price_status: string | null;
  origin: string | null;
}

interface PriceNegotiationSectionProps {
  campaignId: string;
  /** `users.id` do influenciador (rota de resposta usa o userId). */
  userId?: string | number | null;
  status?: string;
  negotiation?: PriceNegotiation | null;
}

/**
 * Painel de negociação de "valor individual por criador" para o backoffice.
 * - price_proposed: aguardando o criador (somente leitura).
 * - price_countered: o criador contrapropôs → ações aceitar/contrapropor/recusar.
 * - accepted/rejected: estado final (somente leitura).
 *
 * Só renderiza quando há negociação (`negotiation.price_status` presente).
 */
export function PriceNegotiationSection({
  campaignId,
  userId,
  status,
  negotiation,
}: PriceNegotiationSectionProps) {
  const respondMut = useRespondToPriceCounter(campaignId);
  const [counterOpen, setCounterOpen] = useState(false);
  const [counterInput, setCounterInput] = useState("");

  if (!negotiation || !negotiation.price_status) return null;

  const userIdStr =
    userId != null && String(userId).trim() !== "" ? String(userId) : null;

  const isCountered = status === "price_countered";
  const isProposed = status === "price_proposed";
  const counterCents = negotiation.counter_price_cents ?? 0;
  const proposedCents = negotiation.proposed_price_cents ?? 0;

  async function respond(
    action: "accept" | "counter" | "reject",
    proposed_price_cents?: number,
  ) {
    if (!userIdStr) {
      toast.error("Não foi possível responder: influenciador sem user_id.");
      return;
    }
    try {
      await respondMut.mutateAsync({
        userId: userIdStr,
        data: { action, ...(proposed_price_cents ? { proposed_price_cents } : {}) },
      });
      toast.success(
        action === "accept"
          ? "Contraproposta aceita. Criador aprovado."
          : action === "counter"
            ? "Nova proposta enviada ao criador."
            : "Negociação recusada.",
      );
      setCounterOpen(false);
      setCounterInput("");
    } catch (err) {
      toast.error(
        (err as { message?: string })?.message ||
          "Não foi possível concluir a ação.",
      );
    }
  }

  function handleSendCounter() {
    const cents = parsePriceBRLToCents(counterInput);
    if (cents <= 0) {
      toast.error("Informe um valor válido para a nova proposta.");
      return;
    }
    void respond("counter", cents);
  }

  const busy = respondMut.isPending;

  return (
    <div className="flex flex-col gap-3 rounded-2xl bg-neutral-100 p-4">
      <div className="flex items-center gap-2">
        <Icon name="Handshake" color="#404040" size={16} />
        <h4 className="text-sm font-semibold text-neutral-800">
          Negociação de valor
        </h4>
      </div>

      {/* Resumo dos valores da rodada atual. */}
      <div className="flex flex-col gap-1 text-sm text-neutral-700">
        {proposedCents > 0 && (
          <div className="flex items-center justify-between">
            <span className="text-neutral-500">Sua proposta</span>
            <span className="font-medium">{fmtBRL(proposedCents)}</span>
          </div>
        )}
        {counterCents > 0 && (
          <div className="flex items-center justify-between">
            <span className="text-neutral-500">Contraproposta do criador</span>
            <span className="font-medium text-primary-700">
              {fmtBRL(counterCents)}
            </span>
          </div>
        )}
        {negotiation.price_status === "accepted" &&
          negotiation.agreed_price_cents != null && (
            <div className="flex items-center justify-between">
              <span className="text-neutral-500">Valor acordado</span>
              <span className="font-semibold text-success-700">
                {fmtBRL(negotiation.agreed_price_cents)}
              </span>
            </div>
          )}
      </div>

      {isProposed && (
        <p className="text-xs text-neutral-500">
          Aguardando a resposta do criador (aceitar ou contrapropor).
        </p>
      )}

      {negotiation.price_status === "rejected" && (
        <p className="text-xs text-neutral-500">Negociação encerrada.</p>
      )}

      {isCountered && !counterOpen && (
        <div className="flex flex-wrap gap-2">
          <Button
            className="bg-success-700"
            disabled={busy}
            onClick={() => void respond("accept")}
          >
            Aceitar {counterCents > 0 ? fmtBRL(counterCents) : ""}
          </Button>
          <Button
            variant="outline"
            disabled={busy}
            onClick={() => setCounterOpen(true)}
          >
            Contrapropor
          </Button>
          <Button
            variant="outline"
            className="text-danger-700"
            disabled={busy}
            onClick={() => void respond("reject")}
          >
            Recusar
          </Button>
        </div>
      )}

      {isCountered && counterOpen && (
        <div className="flex flex-col gap-2">
          <label className="text-xs font-medium text-neutral-700">
            Nova proposta (R$)
          </label>
          <input
            inputMode="decimal"
            value={counterInput}
            onChange={(e) => setCounterInput(e.target.value)}
            placeholder="0,00"
            className="w-full rounded-2xl border border-neutral-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
          />
          <div className="flex gap-2">
            <Button
                className="bg-primary-600 hover:bg-primary-700"
              disabled={busy}
              onClick={handleSendCounter}
            >
              Enviar proposta
            </Button>
            <Button
                variant="outline"
              disabled={busy}
              onClick={() => {
                setCounterOpen(false);
                setCounterInput("");
              }}
            >
              Cancelar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
