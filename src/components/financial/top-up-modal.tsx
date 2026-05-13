import { useCallback, useEffect, useRef, useState } from "react";

import { clsx } from "clsx";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Modal } from "@/components/ui/modal";
import {
  BALANCE_QUERY_KEYS,
  useTopUpWorkspace,
} from "@/hooks/use-balance";
import { usePaymentSocket } from "@/hooks/use-payment-socket";
import {
  getWorkspaceBalance,
  simulatePayment,
} from "@/shared/services/balance";
import type {
  TopUpResult,
  WorkspaceBalance,
} from "@/shared/services/balance";
import { getWorkspaceId } from "@/lib/utils/api";

/**
 * Modal de depósito (top-up) — substitui o fluxo antes presente no WalletDrawer.
 *
 * Três estados internos:
 *  1. `form`     → input de valor + atalhos
 *  2. `qrcode`   → exibe QR PIX e aguarda confirmação (socket + polling de 3s)
 *  3. `confirmed`→ feedback de sucesso
 *
 * Por que dois caminhos de confirmação (socket + polling)?
 *  - Socket é instantâneo, mas pode falhar (rede, proxy).
 *  - Polling de saldo garante convergência mesmo se o socket cair.
 *  - `confirmedRef` evita double-trigger entre os dois.
 */
interface TopUpModalProps {
  open: boolean;
  onClose: () => void;
}

type Step = "form" | "qrcode" | "confirmed";

const QUICK_AMOUNTS_CENTS = [5000, 10000, 20000, 50000];
const MIN_CENTS = 100;
const MAX_CENTS = 99_999_999;
const PAYMENT_POLL_INTERVAL_MS = 3000;

const centsToCurrency = (cents: number): string =>
  (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  });

export function TopUpModal({ open, onClose }: TopUpModalProps) {
  const [step, setStep] = useState<Step>("form");
  const [result, setResult] = useState<TopUpResult | null>(null);
  const [preBalance, setPreBalance] = useState(0);

  if (!open) return null;

  const handleClose = () => {
    onClose();
    // pequeno delay para evitar flash de re-render durante a animação de fechar
    setTimeout(() => {
      setStep("form");
      setResult(null);
      setPreBalance(0);
    }, 200);
  };

  const handleTopUpCreated = (r: TopUpResult, snapshotBalance: number) => {
    setResult(r);
    setPreBalance(snapshotBalance);
    setStep("qrcode");
  };

  const handleConfirmed = () => setStep("confirmed");

  const handleNewDeposit = () => {
    setResult(null);
    setPreBalance(0);
    setStep("form");
  };

  const title =
    step === "form"
      ? "Depositar saldo"
      : step === "qrcode"
      ? "QR Code PIX"
      : "Pagamento confirmado";

  return (
    <Modal title={title} onClose={handleClose} panelClassName="max-w-md">
      {step === "form" && (
        <FormStep onSubmitSuccess={handleTopUpCreated} onCancel={handleClose} />
      )}
      {step === "qrcode" && result && (
        <QrCodeStep
          result={result}
          preBalance={preBalance}
          onConfirmed={handleConfirmed}
          onNewDeposit={handleNewDeposit}
          onClose={handleClose}
        />
      )}
      {step === "confirmed" && result && (
        <ConfirmedStep
          result={result}
          onNewDeposit={handleNewDeposit}
          onClose={handleClose}
        />
      )}
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// FormStep — entrada do valor
// ---------------------------------------------------------------------------

function FormStep({
  onSubmitSuccess,
  onCancel,
}: {
  onSubmitSuccess: (result: TopUpResult, preBalance: number) => void;
  onCancel: () => void;
}) {
  const [amountCents, setAmountCents] = useState(0);
  const mutation = useTopUpWorkspace();
  const queryClient = useQueryClient();
  const isValid = amountCents >= MIN_CENTS;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, "");
    setAmountCents(
      digits === "" ? 0 : Math.min(parseInt(digits, 10), MAX_CENTS),
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;

    const workspaceId = getWorkspaceId();
    if (!workspaceId) {
      toast.error("Workspace não selecionado.");
      return;
    }

    try {
      // Captura saldo atual antes de gerar a cobrança — usado pelo polling
      // para detectar quando o pagamento foi creditado.
      const cached = queryClient.getQueryData<WorkspaceBalance>(
        BALANCE_QUERY_KEYS.workspace(workspaceId),
      );
      const preBalance = cached?.available_cents ?? 0;

      const result = await mutation.mutateAsync(amountCents);

      // Sandbox: confirma imediatamente. Em prod retorna 403 e é ignorado.
      simulatePayment(workspaceId).catch(() => {});

      onSubmitSuccess(result, preBalance);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Erro ao gerar cobrança PIX",
      );
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <label
            htmlFor="top-up-amount"
            className="text-neutral-950 font-medium"
          >
            Valor do depósito
          </label>
          <div className="w-full h-11 rounded-2xl bg-neutral-100 flex items-center px-4 focus-within:ring-2 focus-within:ring-primary-500/20 focus-within:border-primary-500/30 border border-transparent transition-all duration-150">
            <input
              id="top-up-amount"
              inputMode="numeric"
              value={centsToCurrency(amountCents)}
              onChange={handleChange}
              className="w-full h-full rounded-2xl outline-none text-neutral-950 bg-transparent tabular-nums"
              autoComplete="off"
              autoFocus
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
                "rounded-xl border py-2 text-sm font-medium transition-colors cursor-pointer",
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

      <div className="flex flex-col gap-2">
        <Button
          type="submit"
          disabled={!isValid || mutation.isPending}
          className="w-full"
        >
          {mutation.isPending ? "Gerando..." : "Gerar QR Code PIX"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          className="w-full"
        >
          Cancelar
        </Button>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// QrCodeStep — exibe QR e aguarda confirmação (socket + polling)
// ---------------------------------------------------------------------------

function QrCodeStep({
  result,
  preBalance,
  onConfirmed,
  onNewDeposit,
  onClose,
}: {
  result: TopUpResult;
  preBalance: number;
  onConfirmed: () => void;
  onNewDeposit: () => void;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const confirmedRef = useRef(false);
  const queryClient = useQueryClient();
  const workspaceId = getWorkspaceId() ?? "";

  const handleConfirmed = useCallback(
    (amount: string) => {
      if (confirmedRef.current) return;
      confirmedRef.current = true;
      toast.success(`PIX de ${amount} confirmado!`);
      queryClient.invalidateQueries({
        queryKey: BALANCE_QUERY_KEYS.workspace(workspaceId),
      });
      onConfirmed();
    },
    [queryClient, workspaceId, onConfirmed],
  );

  // Caminho 1: socket em tempo real
  usePaymentSocket({
    chargeId: result.charge_id,
    onConfirmed: (event) => handleConfirmed(event.amount),
  });

  // Caminho 2: polling do saldo (fallback)
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
        if (balance.available_cents > preBalance) {
          handleConfirmed(result.amount);
        }
      } catch {
        // ignora — tenta no próximo tick
      }
    }, PAYMENT_POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [workspaceId, preBalance, result.amount, handleConfirmed, queryClient]);

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

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4 flex flex-col items-center gap-4">
        <img
          src={`data:image/png;base64,${result.pix_qr_code}`}
          alt="QR Code PIX"
          className="w-48 h-48 rounded-xl"
        />
        <div className="text-center">
          <p className="text-lg font-bold text-neutral-950 tabular-nums">
            {result.amount}
          </p>
          <p className="text-xs text-neutral-500 mt-0.5">
            Válido até {expiresAt}
          </p>
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
            className="shrink-0 text-xs font-medium text-primary-600 hover:text-primary-700 transition-colors cursor-pointer"
          >
            {copied ? "Copiado!" : "Copiar"}
          </button>
        </div>
      </div>

      <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 flex items-start gap-2">
        <Icon
          name="Clock"
          size={14}
          color="#92400e"
          className="mt-0.5 shrink-0"
        />
        <p className="text-xs text-amber-700 leading-relaxed">
          Aguardando confirmação do pagamento. O saldo é atualizado
          automaticamente.
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

// ---------------------------------------------------------------------------
// ConfirmedStep — sucesso
// ---------------------------------------------------------------------------

function ConfirmedStep({
  result,
  onNewDeposit,
  onClose,
}: {
  result: TopUpResult;
  onNewDeposit: () => void;
  onClose: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-6 py-4">
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="w-16 h-16 rounded-full bg-success-100 flex items-center justify-center">
          <Icon name="CircleCheck" size={32} color="#16a34a" />
        </div>
        <div>
          <p className="text-lg font-bold text-neutral-950">
            Pagamento confirmado!
          </p>
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
