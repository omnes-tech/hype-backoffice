import { useState } from "react";

import { createFileRoute } from "@tanstack/react-router";
import { clsx } from "clsx";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import {
  useAdvanceToAvailable,
  useAdvanceToAwaitingRelease,
  useCancelHold,
  useHoldsList,
  useReleaseExpired,
  useReserveHold,
  useWithdrawHold,
  type Hold,
  type HoldStatus,
} from "@/hooks/use-holds";
import { useUsersByIds } from "@/hooks/use-user-lookup";
import type { UserSummary } from "@/shared/services/users-lookup";

export const Route = createFileRoute("/(private)/(app)/holds")({
  component: HoldsPage,
});

const STATUS_FILTERS: { value: HoldStatus | "all"; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "reserved", label: "Reservado" },
  { value: "awaiting_release", label: "Aguardando liberação" },
  { value: "available", label: "Disponível" },
  { value: "withdrawn", label: "Sacado" },
  { value: "cancelled", label: "Cancelado" },
];

const STATUS_BADGE: Record<HoldStatus, string> = {
  reserved: "bg-primary-600/10 text-primary-700",
  awaiting_release: "bg-warning-400/15 text-amber-700",
  available: "bg-success-500/10 text-success-500",
  withdrawn: "bg-neutral-200/60 text-neutral-700",
  cancelled: "bg-danger-500/10 text-danger-500",
};

const STATUS_LABEL: Record<HoldStatus, string> = {
  reserved: "Reservado",
  awaiting_release: "Aguardando",
  available: "Disponível",
  withdrawn: "Sacado",
  cancelled: "Cancelado",
};

function formatHype(value: string): string {
  const num = Number(value);
  if (!Number.isFinite(num)) return value;
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(num);
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function HoldsPage() {
  const [statusFilter, setStatusFilter] = useState<HoldStatus | "all">("all");
  const [reserveModalOpen, setReserveModalOpen] = useState(false);

  const filters = statusFilter === "all" ? {} : { status: statusFilter };
  const holdsQ = useHoldsList(filters);
  const releaseExpiredM = useReleaseExpired();
  // Enriquecimento: busca em batch os users referenciados nas rows visíveis.
  const userIds = Array.from(new Set((holdsQ.data ?? []).map((h) => h.userId)));
  const usersMapQ = useUsersByIds(userIds);

  const handleReleaseExpired = async () => {
    try {
      const res = await releaseExpiredM.mutateAsync();
      if (res.updated > 0) {
        toast.success(`${res.updated} hold(s) avançados para 'Disponível'.`);
      } else {
        toast.info("Nenhum hold venceu o cooldown.");
      }
    } catch (e: any) {
      toast.error(`Erro: ${e?.message ?? "falha"}`);
    }
  };

  return (
    <div className="flex flex-col gap-6 p-6 max-w-7xl mx-auto w-full">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-950 tracking-tight">
            Holds (HypePoints)
          </h1>
          <p className="text-sm text-neutral-500 mt-1">
            Livro-razão de reservas de pagamento por participação em campanha.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleReleaseExpired}
            disabled={releaseExpiredM.isPending}
            title="Avança holds que já passaram do cooldown de 30 dias"
          >
            <Icon name="Timer" size={16} color="#0A0A0A" />
            {releaseExpiredM.isPending ? "Processando…" : "Liberar vencidos"}
          </Button>
          <Button onClick={() => setReserveModalOpen(true)}>
            <Icon name="Plus" size={16} color="#FFFFFF" />
            Nova reserva
          </Button>
        </div>
      </header>

      <div className="flex flex-wrap gap-2">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setStatusFilter(f.value)}
            className={clsx(
              "px-3 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer",
              statusFilter === f.value
                ? "bg-neutral-950 text-white"
                : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="border border-neutral-200 rounded-2xl overflow-hidden bg-white">
        {holdsQ.isLoading ? (
          <div className="p-6 space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-12 rounded-xl bg-neutral-100 animate-pulse" />
            ))}
          </div>
        ) : holdsQ.error ? (
          <p className="p-6 text-sm text-danger-500">
            Erro ao carregar holds: {holdsQ.error.message}
          </p>
        ) : !holdsQ.data || holdsQ.data.length === 0 ? (
          <p className="p-12 text-sm text-neutral-500 text-center">
            Nenhum hold {statusFilter !== "all" ? `em status "${STATUS_LABEL[statusFilter as HoldStatus]}"` : ""}.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 text-xs uppercase tracking-wider text-neutral-500 border-b border-neutral-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium">#</th>
                <th className="text-left px-4 py-3 font-medium">User</th>
                <th className="text-left px-4 py-3 font-medium">Campanha</th>
                <th className="text-right px-4 py-3 font-medium">Amount</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
                <th className="text-left px-4 py-3 font-medium">Reservado em</th>
                <th className="text-left px-4 py-3 font-medium">Release em</th>
                <th className="text-right px-4 py-3 font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {holdsQ.data.map((h) => (
                <HoldRow
                  key={h.id}
                  hold={h}
                  userSummary={usersMapQ.data?.get(h.userId) ?? null}
                />
              ))}
            </tbody>
          </table>
        )}
      </div>

      {reserveModalOpen && (
        <ReserveModal onClose={() => setReserveModalOpen(false)} />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// HoldRow — uma linha da tabela
// ---------------------------------------------------------------------------

function HoldRow({
  hold,
  userSummary,
}: {
  hold: Hold;
  userSummary: UserSummary | null;
}) {
  const advAwaitingM = useAdvanceToAwaitingRelease();
  const advAvailableM = useAdvanceToAvailable();
  const cancelM = useCancelHold();
  const withdrawM = useWithdrawHold();

  const action = async (fn: () => Promise<unknown>, okMsg: string) => {
    try {
      await fn();
      toast.success(okMsg);
    } catch (e: any) {
      toast.error(`Erro: ${e?.message ?? "falha"}`);
    }
  };

  return (
    <tr className="border-b border-neutral-100 last:border-b-0 hover:bg-neutral-50/50">
      <td className="px-4 py-3 text-neutral-500 tabular-nums">{hold.id}</td>
      <td className="px-4 py-3">
        {userSummary ? (
          <div className="flex flex-col">
            <span className="font-medium text-neutral-950 leading-tight">
              {userSummary.name}
            </span>
            <span className="text-xs text-neutral-500 leading-tight">
              {userSummary.email}{" "}
              <span className="text-neutral-400">· id {userSummary.id}</span>
            </span>
          </div>
        ) : (
          <span className="font-medium text-neutral-700">
            user #{hold.userId}
          </span>
        )}
      </td>
      <td className="px-4 py-3 text-neutral-700">campanha #{hold.campaignId}</td>
      <td className="px-4 py-3 text-right font-semibold tabular-nums text-neutral-950">
        {formatHype(hold.amountFormatted)} {hold.currency}
      </td>
      <td className="px-4 py-3">
        <span
          className={clsx(
            "px-2 py-0.5 rounded-md text-xs font-medium whitespace-nowrap",
            STATUS_BADGE[hold.status],
          )}
        >
          {STATUS_LABEL[hold.status]}
        </span>
      </td>
      <td className="px-4 py-3 text-xs text-neutral-500 whitespace-nowrap">
        {formatDate(hold.reservedAt)}
      </td>
      <td className="px-4 py-3 text-xs text-neutral-500 whitespace-nowrap">
        {formatDate(hold.releaseDueAt)}
      </td>
      <td className="px-4 py-3 text-right">
        <div className="flex items-center gap-1 justify-end">
          {hold.status === "reserved" && (
            <>
              <Button
                variant="ghost"
                onClick={() =>
                  action(
                    () => advAwaitingM.mutateAsync(hold.id),
                    "Hold avançado para 'Aguardando liberação'.",
                  )
                }
                disabled={advAwaitingM.isPending}
                className="!h-8 !px-3 !text-xs"
                title="Avança para 'Aguardando liberação' (campanha terminou)"
              >
                Liberar
              </Button>
              <Button
                variant="ghost"
                onClick={() =>
                  action(
                    () =>
                      cancelM.mutateAsync({
                        holdId: hold.id,
                        reason: "cancelado pelo admin",
                      }),
                    "Hold cancelado.",
                  )
                }
                disabled={cancelM.isPending}
                className="!h-8 !px-3 !text-xs !text-danger-500"
                title="Cancelar reserva"
              >
                Cancelar
              </Button>
            </>
          )}
          {hold.status === "awaiting_release" && (
            <Button
              variant="ghost"
              onClick={() =>
                action(
                  () =>
                    advAvailableM.mutateAsync({ holdId: hold.id, force: true }),
                  "Hold avançado para 'Disponível' (force).",
                )
              }
              disabled={advAvailableM.isPending}
              className="!h-8 !px-3 !text-xs"
              title="Force advance para 'Disponível' (override do cooldown 30d)"
            >
              Forçar disponível
            </Button>
          )}
          {hold.status === "available" && (
            <Button
              onClick={() =>
                action(
                  () => withdrawM.mutateAsync(hold.id),
                  "Saque on-chain disparado.",
                )
              }
              disabled={withdrawM.isPending}
              className="!h-8 !px-3 !text-xs"
            >
              {withdrawM.isPending ? "Sacando…" : "Sacar"}
            </Button>
          )}
          {(hold.status === "withdrawn" || hold.status === "cancelled") && (
            <span className="text-xs text-neutral-400">—</span>
          )}
        </div>
      </td>
    </tr>
  );
}

// ---------------------------------------------------------------------------
// ReserveModal — formulário de nova reserva
// ---------------------------------------------------------------------------

function ReserveModal({ onClose }: { onClose: () => void }) {
  const [campaignUserId, setCampaignUserId] = useState("");
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  const reserveM = useReserveHold();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cuId = Number(campaignUserId);
    if (!Number.isInteger(cuId) || cuId <= 0) {
      setError("campaign_user_id deve ser inteiro positivo.");
      return;
    }
    if (!/^\d+(\.\d+)?$/.test(amount.trim()) || Number(amount) <= 0) {
      setError("amount inválido (use número > 0, ex.: '500' ou '1.5').");
      return;
    }

    try {
      await reserveM.mutateAsync({
        campaign_user_id: cuId,
        amount: amount.trim(),
        notes: notes.trim() || undefined,
      });
      toast.success("Hold reservado.");
      onClose();
    } catch (e: any) {
      setError(e?.message ?? "Falha ao reservar.");
    }
  };

  return (
    <Modal title="Nova reserva" onClose={onClose} panelClassName="max-w-md">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          label="Campaign User ID"
          type="number"
          placeholder="Ex.: 146"
          value={campaignUserId}
          onChange={(e) => setCampaignUserId(e.target.value)}
          autoFocus
        />
        <Input
          label="Quantidade (HYPE)"
          type="text"
          inputMode="decimal"
          placeholder="500"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
        <Input
          label="Notas (opcional)"
          placeholder="Ex.: Pagamento por 2 reels Instagram"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
        {error && <p className="text-xs text-danger-500">{error}</p>}
        <div className="flex gap-2 mt-2">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="flex-1"
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={reserveM.isPending} className="flex-1">
            {reserveM.isPending ? "Reservando…" : "Reservar"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
