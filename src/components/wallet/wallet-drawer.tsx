import { useState, useCallback, useEffect, useRef } from "react";

import { clsx } from "clsx";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import { Icon } from "@/components/ui/icon";
import { useWorkspaceBalance, useTopUpWorkspace, BALANCE_QUERY_KEYS } from "@/hooks/use-balance";
import { usePaymentSocket } from "@/hooks/use-payment-socket";
import { simulatePayment, getWorkspaceBalance } from "@/shared/services/balance";
import { getWorkspaceId } from "@/lib/utils/api";
import type { TopUpResult, WorkspaceBalance } from "@/shared/services/balance";

interface WalletDrawerProps {
  open: boolean;
  onClose: () => void;
}

type View = "main" | "top-up" | "success";

const formatBRL = (cents: number): string =>
  (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  });

// ---------------------------------------------------------------------------
// Root
// ---------------------------------------------------------------------------

export function WalletDrawer({ open, onClose }: WalletDrawerProps) {
  const [view, setView] = useState<View>("main");
  const [topUpResult, setTopUpResult] = useState<TopUpResult | null>(null);
  // Saldo disponível antes do top-up — usado pelo polling para detectar confirmação
  const [preTopUpBalance, setPreTopUpBalance] = useState(0);
  const queryClient = useQueryClient();
  const workspaceId = getWorkspaceId() ?? "";

  const handleClose = () => {
    onClose();
    setTimeout(() => {
      setView("main");
      setTopUpResult(null);
      setPreTopUpBalance(0);
    }, 300);
  };

  const handleTopUpSuccess = (result: TopUpResult) => {
    // Captura o saldo antes do top-up para comparação no polling
    const cached = queryClient.getQueryData<WorkspaceBalance>(
      BALANCE_QUERY_KEYS.workspace(workspaceId),
    );
    setPreTopUpBalance(cached?.available_cents ?? 0);
    setTopUpResult(result);
    setView("success");
  };

  const drawerTitle =
    view === "main" ? "Carteira" : view === "top-up" ? "Depositar créditos" : "QR Code PIX";

  return (
    <Drawer
      open={open}
      onClose={handleClose}
      title={
        view !== "main" ? (
          <button
            type="button"
            onClick={() => setView("main")}
            className="flex items-center gap-2 text-lg font-semibold text-neutral-950 tracking-tight hover:text-neutral-700 transition-colors"
          >
            <Icon name="ChevronLeft" size={20} color="currentColor" />
            {drawerTitle}
          </button>
        ) : (
          drawerTitle
        )
      }
      panelClassName="sm:max-w-md"
    >
      {view === "main" && <MainView onDeposit={() => setView("top-up")} />}
      {view === "top-up" && (
        <TopUpView onSuccess={handleTopUpSuccess} onCancel={() => setView("main")} />
      )}
      {view === "success" && topUpResult && (
        <SuccessView
          result={topUpResult}
          preTopUpBalance={preTopUpBalance}
          onNewDeposit={() => {
            setTopUpResult(null);
            setPreTopUpBalance(0);
            setView("top-up");
          }}
          onClose={handleClose}
        />
      )}
    </Drawer>
  );
}

// ---------------------------------------------------------------------------
// MainView
// ---------------------------------------------------------------------------

function MainView({ onDeposit }: { onDeposit: () => void }) {
  const balanceQ = useWorkspaceBalance();

  return (
    <div className="flex flex-col gap-6 p-6">
      <WorkspaceBalanceCard
        loading={balanceQ.isLoading}
        error={balanceQ.error?.message}
        data={balanceQ.data}
      />

      <Button onClick={onDeposit} className="w-full">
        <Icon name="Plus" size={16} color="currentColor" />
        Depositar créditos
      </Button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// WorkspaceBalanceCard
// ---------------------------------------------------------------------------

function WorkspaceBalanceCard({
  loading,
  error,
  data,
}: {
  loading: boolean;
  error?: string;
  data?: WorkspaceBalance;
}) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-5 flex flex-col gap-3">
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-neutral-500">
        <Icon name="Wallet" size={13} color="#737373" />
        Saldo
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-5 rounded-md bg-neutral-200 animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <p className="text-xs text-danger-500">Erro ao carregar saldo: {error}</p>
      ) : data ? (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-neutral-600">Total carregado</span>
            <span className="text-sm font-semibold text-neutral-950 tabular-nums">
              {formatBRL(data.balance_cents)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-neutral-600">Reservado</span>
            <span className="text-sm font-medium text-amber-700 tabular-nums">
              {formatBRL(data.committed_cents)}
            </span>
          </div>
          <div className="h-px bg-neutral-200" />
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-neutral-950">Disponível</span>
            <span className="text-base font-bold text-success-600 tabular-nums">
              {formatBRL(data.available_cents)}
            </span>
          </div>
        </div>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// TopUpView
// ---------------------------------------------------------------------------

const centsToDisplay = (cents: number): string =>
  (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  });

const QUICK_AMOUNTS_CENTS = [5000, 10000, 20000, 50000];

function TopUpView({
  onSuccess,
  onCancel,
}: {
  onSuccess: (result: TopUpResult) => void;
  onCancel: () => void;
}) {
  const [amountCents, setAmountCents] = useState(0);
  const mutation = useTopUpWorkspace();
  const isValid = amountCents >= 100;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, "");
    setAmountCents(digits === "" ? 0 : Math.min(parseInt(digits, 10), 99_999_999));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;

    try {
      const result = await mutation.mutateAsync(amountCents);

      // Fire-and-forget: sandbox confirma imediatamente; 403 em produção → ignorado
      const workspaceId = getWorkspaceId();
      if (workspaceId) simulatePayment(workspaceId).catch(() => {});

      onSuccess(result);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao gerar cobrança PIX");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <label htmlFor="top-up-amount" className="text-neutral-950 font-medium">
            Valor do depósito
          </label>
          <div className="w-full h-11 rounded-2xl bg-neutral-100 flex items-center px-4 focus-within:ring-2 focus-within:ring-primary-500/20 focus-within:border-primary-500/30 border border-transparent transition-all duration-150">
            <input
              id="top-up-amount"
              inputMode="numeric"
              value={centsToDisplay(amountCents)}
              onChange={handleChange}
              className="w-full h-full rounded-2xl outline-none text-neutral-950 bg-transparent tabular-nums"
              autoComplete="off"
            />
          </div>
        </div>

        {amountCents > 0 && !isValid && (
          <p className="text-xs text-danger-500">Valor mínimo: R$ 1,00</p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-xs font-medium text-neutral-500 uppercase tracking-wider">
          Valores rápidos
        </span>
        <div className="grid grid-cols-4 gap-2">
          {QUICK_AMOUNTS_CENTS.map((cents) => (
            <button
              key={cents}
              type="button"
              onClick={() => setAmountCents(cents)}
              className={clsx(
                "rounded-xl border py-2 text-sm font-medium transition-colors",
                amountCents === cents
                  ? "border-primary-500 bg-primary-50 text-primary-700"
                  : "border-neutral-200 bg-white text-neutral-700 hover:border-neutral-300 hover:bg-neutral-50",
              )}
            >
              R$ {cents / 100}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2 mt-auto">
        <Button type="submit" disabled={!isValid || mutation.isPending} className="w-full">
          {mutation.isPending ? "Gerando..." : "Gerar QR Code PIX"}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} className="w-full">
          Cancelar
        </Button>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// SuccessView
// ---------------------------------------------------------------------------

function SuccessView({
  result,
  preTopUpBalance,
  onNewDeposit,
  onClose,
}: {
  result: TopUpResult;
  preTopUpBalance: number;
  onNewDeposit: () => void;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);
  const confirmedRef = useRef(false); // evita double-trigger entre socket e polling
  const queryClient = useQueryClient();
  const workspaceId = getWorkspaceId() ?? "";

  const handleConfirmed = useCallback(
    (amount: string) => {
      if (confirmedRef.current) return;
      confirmedRef.current = true;
      setPaymentConfirmed(true);
      toast.success(`PIX de ${amount} confirmado!`);
      queryClient.invalidateQueries({ queryKey: BALANCE_QUERY_KEYS.workspace(workspaceId) });
    },
    [queryClient, workspaceId],
  );

  // Caminho 1: socket em tempo real
  usePaymentSocket({
    chargeId: result.charge_id,
    onConfirmed: (event) => handleConfirmed(event.amount),
  });

  // Caminho 2: polling a cada 3s (garante funcionar mesmo se socket falhar)
  useEffect(() => {
    if (!workspaceId) return;

    const interval = setInterval(async () => {
      if (confirmedRef.current) {
        clearInterval(interval);
        return;
      }
      try {
        const balance = await queryClient.fetchQuery({
          queryKey: BALANCE_QUERY_KEYS.workspace(workspaceId),
          queryFn: () => getWorkspaceBalance(workspaceId),
          staleTime: 0,
        });
        if (balance.available_cents > preTopUpBalance) {
          handleConfirmed(result.amount);
        }
      } catch {
        // falha silenciosa — tenta novamente no próximo tick
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [workspaceId, preTopUpBalance, result.amount, handleConfirmed, queryClient]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(result.pix_copy_paste);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const expiresAt = new Date(result.expires_at).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  if (paymentConfirmed) {
    return (
      <div className="flex flex-col items-center justify-center gap-6 p-6 h-full">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="w-16 h-16 rounded-full bg-success-100 flex items-center justify-center">
            <Icon name="CircleCheck" size={32} color="#16a34a" />
          </div>
          <div>
            <p className="text-lg font-bold text-neutral-950">Pagamento confirmado!</p>
            <p className="text-sm text-neutral-500 mt-1">
              {result.amount} adicionado ao saldo do workspace.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-2 w-full">
          <Button variant="outline" onClick={onNewDeposit} className="w-full">
            Novo depósito
          </Button>
          <Button onClick={onClose} className="w-full">
            Fechar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4 flex flex-col items-center gap-4">
        <img
          src={`data:image/png;base64,${result.pix_qr_code}`}
          alt="QR Code PIX"
          className="w-48 h-48 rounded-xl"
        />

        <div className="text-center">
          <p className="text-lg font-bold text-neutral-950 tabular-nums">{result.amount}</p>
          <p className="text-xs text-neutral-500 mt-0.5">Válido até {expiresAt}</p>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-xs font-medium text-neutral-500 uppercase tracking-wider">
          Pix copia e cola
        </span>
        <div className="flex items-center gap-2 rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2.5">
          <p className="flex-1 text-xs text-neutral-600 truncate font-mono">
            {result.pix_copy_paste}
          </p>
          <button
            type="button"
            onClick={handleCopy}
            className="shrink-0 text-xs font-medium text-primary-600 hover:text-primary-700 transition-colors"
          >
            {copied ? "Copiado!" : "Copiar"}
          </button>
        </div>
      </div>

      <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 flex items-start gap-2">
        <Icon name="Clock" size={14} color="#92400e" className="mt-0.5 shrink-0" />
        <p className="text-xs text-amber-700 leading-relaxed">
          Aguardando confirmação do pagamento. O saldo é atualizado automaticamente.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <Button variant="outline" onClick={onNewDeposit} className="w-full">
          Novo depósito
        </Button>
        <Button onClick={onClose} className="w-full">
          Fechar
        </Button>
      </div>
    </div>
  );
}
