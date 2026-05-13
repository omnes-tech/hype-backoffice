import { Icon } from "@/components/ui/icon";
import { useWorkspaceBalance } from "@/hooks/use-balance";
import type { WorkspaceBalance } from "@/shared/services/balance";

/**
 * Cards de saldo do workspace (Total / Reservado / Disponível).
 *
 * Faz uma única query (cacheada) via `useWorkspaceBalance`. Variante `compact`
 * usada quando o componente é embutido em fluxos secundários (ex.: modal de
 * depósito). Variante padrão (3 cards grandes) é a apresentação da página
 * principal de Financeiro.
 */
interface BalanceOverviewProps {
  variant?: "default" | "compact";
}

const formatBRL = (cents: number): string =>
  (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  });

export function BalanceOverview({ variant = "default" }: BalanceOverviewProps) {
  const balanceQ = useWorkspaceBalance();

  if (balanceQ.isLoading) {
    return variant === "compact" ? <CompactSkeleton /> : <DefaultSkeleton />;
  }

  if (balanceQ.error) {
    return (
      <div className="rounded-2xl border border-danger-500/30 bg-danger-500/5 p-4">
        <p className="text-sm text-danger-500">
          Erro ao carregar saldo: {balanceQ.error.message}
        </p>
      </div>
    );
  }

  if (!balanceQ.data) return null;

  return variant === "compact" ? (
    <CompactView data={balanceQ.data} />
  ) : (
    <DefaultView data={balanceQ.data} />
  );
}

// ---------------------------------------------------------------------------
// DefaultView — 3 cards grandes (página principal)
// ---------------------------------------------------------------------------

function DefaultView({ data }: { data: WorkspaceBalance }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <BalanceCard
        icon="Wallet"
        iconColor="#0A0A0A"
        label="Total carregado"
        value={formatBRL(data.balance_cents)}
        tone="neutral"
        helper="Soma de todos os depósitos confirmados"
      />
      <BalanceCard
        icon="Lock"
        iconColor="#b45309"
        label="Reservado"
        value={formatBRL(data.committed_cents)}
        tone="warning"
        helper="Comprometido com campanhas em execução"
      />
      <BalanceCard
        icon="CircleCheck"
        iconColor="#16a34a"
        label="Disponível"
        value={formatBRL(data.available_cents)}
        tone="success"
        helper="Pode ser usado para novas campanhas"
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// CompactView — uma única linha (ex.: dentro de modal)
// ---------------------------------------------------------------------------

function CompactView({ data }: { data: WorkspaceBalance }) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-neutral-500">Total</span>
        <span className="text-sm font-medium text-neutral-950 tabular-nums">
          {formatBRL(data.balance_cents)}
        </span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-xs text-neutral-500">Reservado</span>
        <span className="text-sm font-medium text-amber-700 tabular-nums">
          {formatBRL(data.committed_cents)}
        </span>
      </div>
      <div className="h-px bg-neutral-200" />
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-neutral-700">Disponível</span>
        <span className="text-base font-bold text-success-600 tabular-nums">
          {formatBRL(data.available_cents)}
        </span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// BalanceCard
// ---------------------------------------------------------------------------

type Tone = "neutral" | "warning" | "success";

interface BalanceCardProps {
  icon: Parameters<typeof Icon>[0]["name"];
  iconColor: string;
  label: string;
  value: string;
  tone: Tone;
  helper: string;
}

const toneClasses: Record<Tone, { card: string; value: string }> = {
  neutral: {
    card: "bg-white border-neutral-200",
    value: "text-neutral-950",
  },
  warning: {
    card: "bg-amber-50/60 border-amber-200/70",
    value: "text-amber-800",
  },
  success: {
    card: "bg-success-500/5 border-success-500/30",
    value: "text-success-600",
  },
};

function BalanceCard({
  icon,
  iconColor,
  label,
  value,
  tone,
  helper,
}: BalanceCardProps) {
  const classes = toneClasses[tone];
  return (
    <div
      className={`rounded-2xl border p-5 flex flex-col gap-3 transition-colors ${classes.card}`}
    >
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-neutral-500">
        <Icon name={icon} size={14} color={iconColor} />
        {label}
      </div>
      <p className={`text-3xl font-bold tabular-nums ${classes.value}`}>
        {value}
      </p>
      <p className="text-xs text-neutral-500 leading-relaxed">{helper}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Skeletons
// ---------------------------------------------------------------------------

function DefaultSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className="rounded-2xl border border-neutral-200 bg-white p-5 flex flex-col gap-3"
        >
          <div className="h-3 w-24 rounded bg-neutral-200 animate-pulse" />
          <div className="h-8 w-32 rounded bg-neutral-200 animate-pulse" />
          <div className="h-3 w-40 rounded bg-neutral-100 animate-pulse" />
        </div>
      ))}
    </div>
  );
}

function CompactSkeleton() {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4 space-y-2">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="h-5 rounded-md bg-neutral-200 animate-pulse" />
      ))}
    </div>
  );
}
