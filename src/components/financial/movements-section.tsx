import { useState } from "react";

import { clsx } from "clsx";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { useMovements } from "@/hooks/use-balance-movements";
import type {
  BalanceMovement,
  MovementType,
} from "@/shared/services/balance-movements";

/**
 * Histórico de movimentações de saldo.
 *
 * Paginação cursor (useInfiniteQuery). Quando o backend ainda não expôs o
 * endpoint, o service devolve `{ items: [], next_cursor: null }` e a UI cai
 * naturalmente no empty state — sem mock, sem erro.
 */

const TYPE_FILTERS: { value: MovementType | "all"; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "top_up_confirmed", label: "Depósitos" },
  { value: "reserve_created", label: "Reservas" },
  { value: "reserve_cancelled", label: "Devoluções" },
  { value: "payout", label: "Pagamentos" },
  { value: "adjustment_credit", label: "Ajustes (+)" },
  { value: "adjustment_debit", label: "Ajustes (−)" },
];

const TYPE_BADGE: Record<MovementType, { bg: string; text: string; label: string }> = {
  top_up_pending: { bg: "bg-amber-100", text: "text-amber-800", label: "PIX pendente" },
  top_up_confirmed: { bg: "bg-success-500/10", text: "text-success-500", label: "Depósito" },
  top_up_expired: { bg: "bg-neutral-200/60", text: "text-neutral-700", label: "PIX expirado" },
  top_up_refunded: { bg: "bg-danger-500/10", text: "text-danger-500", label: "Estorno" },
  reserve_created: { bg: "bg-primary-600/10", text: "text-primary-700", label: "Reserva" },
  reserve_released: { bg: "bg-neutral-100", text: "text-neutral-700", label: "Liberação" },
  reserve_cancelled: { bg: "bg-success-500/10", text: "text-success-500", label: "Devolução" },
  adjustment_credit: { bg: "bg-success-500/10", text: "text-success-500", label: "Ajuste (+)" },
  adjustment_debit: { bg: "bg-danger-500/10", text: "text-danger-500", label: "Ajuste (−)" },
  payout: { bg: "bg-primary-600/10", text: "text-primary-700", label: "Pagamento" },
};

const formatBRL = (cents: number): string =>
  (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  });

const formatDateTime = (iso: string): string => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export function MovementsSection() {
  const [selectedType, setSelectedType] = useState<MovementType | "all">("all");

  const filters =
    selectedType === "all" ? {} : { type: [selectedType] };

  const query = useMovements(filters);
  const items = query.data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        {TYPE_FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => setSelectedType(f.value)}
            className={clsx(
              "px-3 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer",
              selectedType === f.value
                ? "bg-neutral-950 text-white"
                : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="border border-neutral-200 rounded-2xl overflow-hidden bg-white">
        {query.isLoading ? (
          <div className="p-6 space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="h-12 rounded-xl bg-neutral-100 animate-pulse"
              />
            ))}
          </div>
        ) : query.error ? (
          <ErrorState message={query.error.message} />
        ) : items.length === 0 ? (
          <EmptyState />
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 text-xs uppercase tracking-wider text-neutral-500 border-b border-neutral-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Quando</th>
                <th className="text-left px-4 py-3 font-medium">Tipo</th>
                <th className="text-left px-4 py-3 font-medium">Descrição</th>
                <th className="text-right px-4 py-3 font-medium">Valor</th>
              </tr>
            </thead>
            <tbody>
              {items.map((m) => (
                <MovementRow key={m.id} movement={m} />
              ))}
            </tbody>
          </table>
        )}
      </div>

      {query.hasNextPage && (
        <div className="flex justify-center pt-2">
          <Button
            variant="outline"
            onClick={() => query.fetchNextPage()}
            disabled={query.isFetchingNextPage}
          >
            {query.isFetchingNextPage ? "Carregando…" : "Carregar mais"}
          </Button>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// MovementRow
// ---------------------------------------------------------------------------

function MovementRow({ movement }: { movement: BalanceMovement }) {
  const badge = TYPE_BADGE[movement.type];
  const isPositive = movement.amount_cents > 0;
  const isNegative = movement.amount_cents < 0;

  return (
    <tr className="border-b border-neutral-100 last:border-b-0 hover:bg-neutral-50/50">
      <td className="px-4 py-3 text-neutral-700 whitespace-nowrap tabular-nums">
        {formatDateTime(movement.occurred_at)}
      </td>
      <td className="px-4 py-3">
        <span
          className={clsx(
            "px-2 py-0.5 rounded-md text-xs font-medium whitespace-nowrap",
            badge.bg,
            badge.text,
          )}
        >
          {badge.label}
        </span>
      </td>
      <td className="px-4 py-3 text-neutral-700">
        <div className="flex flex-col">
          <span className="leading-tight">{movement.description || "—"}</span>
          {movement.actor.name && movement.actor.type === "user" && (
            <span className="text-xs text-neutral-500 leading-tight">
              por {movement.actor.name}
            </span>
          )}
        </div>
      </td>
      <td
        className={clsx(
          "px-4 py-3 text-right font-semibold tabular-nums whitespace-nowrap",
          isPositive && "text-success-600",
          isNegative && "text-danger-500",
          !isPositive && !isNegative && "text-neutral-500",
        )}
      >
        {isPositive ? "+" : ""}
        {formatBRL(movement.amount_cents)}
      </td>
    </tr>
  );
}

// ---------------------------------------------------------------------------
// Empty / Error states
// ---------------------------------------------------------------------------

function EmptyState() {
  return (
    <div className="p-10 flex flex-col items-center gap-3 text-center">
      <div className="w-12 h-12 rounded-full bg-neutral-100 flex items-center justify-center">
        <Icon name="History" size={20} color="#737373" />
      </div>
      <div>
        <p className="text-sm font-medium text-neutral-950">
          Nenhuma movimentação por enquanto
        </p>
        <p className="text-xs text-neutral-500 mt-1">
          Depósitos, reservas e pagamentos aparecerão aqui quando ocorrerem.
        </p>
      </div>
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="p-6 flex items-start gap-3 bg-danger-500/5">
      <Icon name="CircleAlert" size={18} color="#dc2626" className="mt-0.5" />
      <div>
        <p className="text-sm font-medium text-danger-500">
          Erro ao carregar movimentações
        </p>
        <p className="text-xs text-neutral-600 mt-1">{message}</p>
      </div>
    </div>
  );
}
