import { useState } from "react";

import { clsx } from "clsx";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import {
  useHypepointBalance,
  useHypepointInfo,
  useHypepointOperations,
  useTransferHypepoint,
} from "@/hooks/use-hypepoint";
import type {
  HypepointOperation,
  TransferHypepointResult,
} from "@/shared/services/hypepoint";
import { lookupUserAuto, type UserSummary } from "@/shared/services/users-lookup";

interface WalletDrawerProps {
  open: boolean;
  onClose: () => void;
}

type View = "main" | "pay" | "success";
type RecipientKind = "user" | "address";

const formatHype = (value: string | number | undefined): string => {
  if (value === undefined || value === null) return "0";
  const num = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(num)) return String(value);
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(num);
};

const truncateAddress = (addr: string | null | undefined): string => {
  if (!addr) return "—";
  if (addr.length < 12) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
};

const formatRelativeTime = (iso: string | null): string => {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return "agora";
  if (diffMin < 60) return `${diffMin}min atrás`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h atrás`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 7) return `${diffD}d atrás`;
  return date.toLocaleDateString("pt-BR");
};

/**
 * Painel lateral da carteira HypePoint do backoffice. Exibe:
 *  - Saldo da admin wallet (pool da plataforma).
 *  - Últimas operações on-chain (mints/transfers).
 *  - CTA para pagar um criador (transferir hypepoints).
 */
export function WalletDrawer({ open, onClose }: WalletDrawerProps) {
  const [view, setView] = useState<View>("main");
  const [lastTransfer, setLastTransfer] = useState<TransferHypepointResult | null>(null);

  const handleClose = () => {
    onClose();
    // Reseta o view para a próxima abertura
    setTimeout(() => {
      setView("main");
      setLastTransfer(null);
    }, 200);
  };

  return (
    <Drawer
      open={open}
      onClose={handleClose}
      title={view === "pay" ? "Pagar criador" : "Carteira HypePoint"}
      panelClassName="sm:max-w-md"
    >
      {view === "main" && (
        <MainView
          onPay={() => setView("pay")}
        />
      )}
      {view === "pay" && (
        <PayForm
          onCancel={() => setView("main")}
          onSuccess={(result) => {
            setLastTransfer(result);
            setView("success");
          }}
        />
      )}
      {view === "success" && lastTransfer && (
        <SuccessView
          result={lastTransfer}
          onPayAnother={() => {
            setLastTransfer(null);
            setView("pay");
          }}
          onBackToMain={() => {
            setLastTransfer(null);
            setView("main");
          }}
        />
      )}
    </Drawer>
  );
}

// ---------------------------------------------------------------------------
// MainView — saldo + operações + CTA pagar
// ---------------------------------------------------------------------------

function MainView({ onPay }: { onPay: () => void }) {
  const balanceQ = useHypepointBalance();
  const infoQ = useHypepointInfo();
  const opsQ = useHypepointOperations(20);

  return (
    <div className="flex flex-col gap-6 p-6">
      <BalanceCard
        loading={balanceQ.isLoading}
        error={balanceQ.error?.message}
        formatted={balanceQ.data?.formatted}
        symbol={balanceQ.data?.symbol ?? "HYPE"}
        totalSupplyFormatted={infoQ.data?.totalSupplyFormatted}
        walletAddress={balanceQ.data?.walletAddress}
      />

      <Button onClick={onPay} className="w-full">
        <Icon name="Send" size={16} color="#FFFFFF" />
        Pagar criador
      </Button>

      <section>
        <header className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-neutral-950">
            Operações recentes
          </h3>
          {opsQ.isFetching && (
            <span className="text-xs text-neutral-500">atualizando…</span>
          )}
        </header>

        {opsQ.isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-14 rounded-xl bg-neutral-100 animate-pulse"
              />
            ))}
          </div>
        ) : opsQ.error ? (
          <p className="text-xs text-danger-500">
            Erro ao carregar operações: {opsQ.error.message}
          </p>
        ) : opsQ.data && opsQ.data.length > 0 ? (
          <ul className="flex flex-col gap-1.5">
            {opsQ.data.map((op) => (
              <OperationRow
                key={op.operationId}
                op={op}
                decimals={infoQ.data?.decimals ?? 18}
              />
            ))}
          </ul>
        ) : (
          <p className="text-xs text-neutral-500 py-4 text-center">
            Nenhuma operação ainda. Quando você fizer o primeiro pagamento, ela
            aparece aqui.
          </p>
        )}
      </section>
    </div>
  );
}

// ---------------------------------------------------------------------------
// BalanceCard — bloco de destaque com o saldo
// ---------------------------------------------------------------------------

function BalanceCard({
  loading,
  error,
  formatted,
  symbol,
  totalSupplyFormatted,
  walletAddress,
}: {
  loading: boolean;
  error?: string;
  formatted?: string;
  symbol: string;
  totalSupplyFormatted?: string;
  walletAddress?: string;
}) {
  return (
    <div className="rounded-2xl bg-gradient-to-br from-primary-600 to-primary-700 text-white p-6 shadow-md">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wider opacity-80">
        <Icon name="Wallet" size={14} color="#FFFFFF" />
        Saldo disponível
      </div>

      {loading ? (
        <div className="h-10 w-32 mt-3 rounded-md bg-white/20 animate-pulse" />
      ) : error ? (
        <p className="mt-3 text-sm opacity-90">Erro: {error}</p>
      ) : (
        <p className="mt-2 text-4xl font-bold tracking-tight">
          {formatHype(formatted)}{" "}
          <span className="text-lg font-medium opacity-80">{symbol}</span>
        </p>
      )}

      {totalSupplyFormatted && (
        <p className="mt-1 text-xs opacity-80">
          Pool total emitido: {formatHype(totalSupplyFormatted)} {symbol}
        </p>
      )}

      {walletAddress && (
        <p className="mt-3 text-[10px] font-mono opacity-70 select-all">
          {truncateAddress(walletAddress)}
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// OperationRow — uma linha do histórico
// ---------------------------------------------------------------------------

function OperationRow({
  op,
  decimals,
}: {
  op: HypepointOperation;
  decimals: number;
}) {
  const isOutgoing = op.opType === "transfer" || op.opType === "pay_points";
  const amountHuman = (() => {
    try {
      const wei = BigInt(op.amount);
      const divisor = BigInt(10) ** BigInt(decimals);
      const intPart = wei / divisor;
      const fracPart = wei % divisor;
      if (fracPart === 0n) return formatHype(intPart.toString());
      // Show up to 2 fractional digits
      const fracStr = fracPart.toString().padStart(decimals, "0");
      const trimmed = fracStr.slice(0, 2).replace(/0+$/, "");
      return `${formatHype(intPart.toString())}${trimmed ? `,${trimmed}` : ""}`;
    } catch {
      return op.amount;
    }
  })();

  const statusClass =
    op.status === "confirmed"
      ? "bg-success-500/10 text-success-500"
      : op.status === "failed"
      ? "bg-danger-500/10 text-danger-500"
      : "bg-warning-400/15 text-amber-700";

  const statusLabel =
    op.status === "confirmed"
      ? "Confirmado"
      : op.status === "failed"
      ? "Falhou"
      : "Pendente";

  return (
    <li className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-neutral-50 transition-colors">
      <div
        className={clsx(
          "h-8 w-8 rounded-full flex items-center justify-center shrink-0",
          isOutgoing ? "bg-primary-600/10" : "bg-success-500/10",
        )}
      >
        <Icon
          name={isOutgoing ? "ArrowUpRight" : "ArrowDownLeft"}
          size={14}
          color={isOutgoing ? "#9e2cfa" : "#22c55e"}
        />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-neutral-950 truncate">
            {isOutgoing ? "Para" : "De"}{" "}
            <span className="font-mono text-xs text-neutral-700">
              {truncateAddress(isOutgoing ? op.toAddress : op.fromAddress)}
            </span>
          </p>
        </div>
        <p className="text-[11px] text-neutral-500">
          {formatRelativeTime(op.createdAt)}
        </p>
      </div>

      <div className="flex flex-col items-end shrink-0">
        <span
          className={clsx(
            "text-sm font-semibold tabular-nums",
            isOutgoing ? "text-neutral-950" : "text-success-500",
          )}
        >
          {isOutgoing ? "−" : "+"}
          {amountHuman}
        </span>
        <span
          className={clsx(
            "text-[10px] px-1.5 py-0.5 rounded-md font-medium",
            statusClass,
          )}
        >
          {statusLabel}
        </span>
      </div>
    </li>
  );
}

// ---------------------------------------------------------------------------
// PayForm — formulário de pagamento
// ---------------------------------------------------------------------------

function PayForm({
  onCancel,
  onSuccess,
}: {
  onCancel: () => void;
  onSuccess: (result: TransferHypepointResult) => void;
}) {
  const [recipientKind, setRecipientKind] = useState<RecipientKind>("user");
  // Para o modo "user" o input aceita email OU id. Resolvemos antes do submit.
  const [userInput, setUserInput] = useState("");
  const [resolvedUser, setResolvedUser] = useState<UserSummary | null>(null);
  const [resolving, setResolving] = useState(false);
  const [address, setAddress] = useState("");
  const [amount, setAmount] = useState("");
  const [campaignUserId, setCampaignUserId] = useState("");
  const [error, setError] = useState<string | null>(null);

  const balanceQ = useHypepointBalance();
  const transferM = useTransferHypepoint();

  const handleResolve = async () => {
    if (!userInput.trim()) {
      setError("Digite um email ou id.");
      return;
    }
    setError(null);
    setResolving(true);
    try {
      const u = await lookupUserAuto(userInput);
      setResolvedUser(u);
    } catch (err: any) {
      setResolvedUser(null);
      setError(err?.message ?? "User não encontrado.");
    } finally {
      setResolving(false);
    }
  };

  const handleClearResolved = () => {
    setResolvedUser(null);
    setUserInput("");
  };

  const validate = (): string | null => {
    if (recipientKind === "user") {
      if (!resolvedUser)
        return "Resolva o user (clique em 'Buscar') antes de prosseguir.";
    } else {
      if (!/^0x[a-fA-F0-9]{40}$/.test(address.trim()))
        return "Endereço EVM inválido (esperado 0x + 40 hex chars).";
    }
    if (!/^\d+(\.\d+)?$/.test(amount.trim()) || Number(amount) <= 0)
      return "Quantidade inválida (use número > 0, ex.: '100' ou '1.5').";
    if (campaignUserId && !/^\d+$/.test(campaignUserId))
      return "campaign_user_id deve ser inteiro (deixe vazio se não aplicável).";
    if (balanceQ.data && Number(amount) > Number(balanceQ.data.formatted))
      return `Saldo insuficiente: admin tem ${balanceQ.data.formatted} ${balanceQ.data.symbol}.`;
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const v = validate();
    if (v) {
      setError(v);
      return;
    }
    setError(null);
    try {
      const result = await transferM.mutateAsync({
        ...(recipientKind === "user"
          ? { to_user_id: resolvedUser!.id }
          : { to_address: address.trim() }),
        amount: amount.trim(),
        ...(campaignUserId
          ? { campaign_user_id: Number(campaignUserId) }
          : {}),
        idempotency_key: `pay-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      });
      toast.success("Transferência enviada — aguardando confirmação on-chain.");
      onSuccess(result);
    } catch (err: any) {
      setError(err?.message ?? "Falha ao transferir.");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-6">
      <div>
        <label className="text-sm font-medium text-neutral-950 mb-1 block">
          Destinatário
        </label>
        <div className="flex gap-1 p-1 rounded-xl bg-neutral-100">
          <button
            type="button"
            onClick={() => {
              setRecipientKind("user");
              setError(null);
            }}
            className={clsx(
              "flex-1 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer",
              recipientKind === "user"
                ? "bg-white text-neutral-950 shadow-sm"
                : "text-neutral-600 hover:text-neutral-950",
            )}
          >
            Email ou ID
          </button>
          <button
            type="button"
            onClick={() => {
              setRecipientKind("address");
              setError(null);
            }}
            className={clsx(
              "flex-1 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer",
              recipientKind === "address"
                ? "bg-white text-neutral-950 shadow-sm"
                : "text-neutral-600 hover:text-neutral-950",
            )}
          >
            Endereço EVM
          </button>
        </div>
      </div>

      {recipientKind === "user" ? (
        resolvedUser ? (
          <div className="rounded-xl border border-success-500/40 bg-success-500/5 px-3 py-2.5 flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-primary-600/10 flex items-center justify-center text-xs font-bold text-primary-700">
              {resolvedUser.name?.[0]?.toUpperCase() ?? "?"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-neutral-950 truncate">
                {resolvedUser.name}{" "}
                <span className="text-xs text-neutral-500 font-normal">
                  · id {resolvedUser.id}
                </span>
              </p>
              <p className="text-xs text-neutral-500 truncate">
                {resolvedUser.email}
              </p>
            </div>
            <button
              type="button"
              onClick={handleClearResolved}
              className="text-xs text-neutral-500 hover:text-neutral-950 cursor-pointer underline"
            >
              trocar
            </button>
          </div>
        ) : (
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <Input
                label="Email ou ID do usuário"
                placeholder="criador@exemplo.com  ou  12"
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                autoFocus
              />
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={handleResolve}
              disabled={resolving || !userInput.trim()}
              className="!h-11 !px-4"
            >
              {resolving ? "…" : "Buscar"}
            </Button>
          </div>
        )
      ) : (
        <Input
          label="Endereço da carteira"
          placeholder="0x..."
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          autoFocus
        />
      )}

      <Input
        label={`Quantidade (HYPE) — disponível: ${balanceQ.data?.formatted ?? "…"}`}
        type="text"
        inputMode="decimal"
        placeholder="100"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
      />

      <Input
        label="ID da participação na campanha (opcional)"
        type="number"
        placeholder="Ex.: 42"
        value={campaignUserId}
        onChange={(e) => setCampaignUserId(e.target.value)}
      />

      {error && (
        <p className="text-xs text-danger-500 px-1">{error}</p>
      )}

      <div className="flex gap-2 mt-2">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          className="flex-1"
        >
          Voltar
        </Button>
        <Button
          type="submit"
          disabled={transferM.isPending}
          className="flex-1"
        >
          {transferM.isPending ? "Enviando…" : "Pagar"}
        </Button>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// SuccessView — confirmação pós-transfer
// ---------------------------------------------------------------------------

function SuccessView({
  result,
  onPayAnother,
  onBackToMain,
}: {
  result: TransferHypepointResult;
  onPayAnother: () => void;
  onBackToMain: () => void;
}) {
  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col items-center text-center pt-4">
        <div className="h-16 w-16 rounded-full bg-success-500/10 flex items-center justify-center mb-4">
          <Icon name="CircleCheck" size={32} color="#22c55e" />
        </div>
        <h3 className="text-lg font-semibold text-neutral-950">
          Pagamento enviado
        </h3>
        <p className="text-xs text-neutral-500 mt-1">
          Aguardando confirmação on-chain (~5s em Base Sepolia).
        </p>
      </div>

      <div className="rounded-2xl bg-neutral-50 border border-neutral-200/80 p-4 flex flex-col gap-2 text-sm">
        <Row label="Quantidade">
          <span className="font-semibold">
            {result.amountFormatted} {result.symbol}
          </span>
        </Row>
        <Row label="Para">
          <span className="font-mono text-xs">
            {truncateAddress(result.toAddress)}
          </span>
        </Row>
        {result.toUserId && (
          <Row label="User ID">
            <span>{result.toUserId}</span>
          </Row>
        )}
        <Row label="Status">
          <span className="text-amber-700 text-xs font-medium px-1.5 py-0.5 rounded-md bg-warning-400/15">
            Pendente
          </span>
        </Row>
      </div>

      {result.explorerUrl && (
        <a
          href={result.explorerUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-primary-600 hover:text-primary-700 underline text-center font-medium"
        >
          Ver transação no explorer ↗
        </a>
      )}

      <div className="flex gap-2 mt-2">
        <Button
          type="button"
          variant="outline"
          onClick={onBackToMain}
          className="flex-1"
        >
          Voltar
        </Button>
        <Button type="button" onClick={onPayAnother} className="flex-1">
          Outro pagamento
        </Button>
      </div>
    </div>
  );
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-neutral-500">{label}</span>
      {children}
    </div>
  );
}
