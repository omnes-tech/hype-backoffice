import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";

import { Icon } from "@/components/ui/icon";
import { useWorkspaceBalance } from "@/hooks/use-balance";

/**
 * "Primeiros passos com o Hype App" — checklist de onboarding no topo do
 * Dashboard. Some permanentemente quando o usuário completa os 3 passos pela
 * primeira vez (flag `completedAt` persistida por workspace).
 *
 * Conclusão é MONOTÔNICA: uma vez observado concluído, o passo permanece
 * concluído mesmo que o estado regrida (ex.: saldo volta a 0 após gastar) —
 * é isso que garante o "sumir quando completar pela primeira vez".
 *
 *  1. Criar campanha   → detectado por existir ≥1 campanha (prop).
 *  2. Adicionar saldo  → detectado por saldo > 0 (qualquer bucket).
 *  3. Explorar criadores → ação local: marcado ao clicar no passo.
 */

const STORAGE_VERSION = "v1";

interface OnboardingState {
  campaign: boolean;
  balance: boolean;
  explored: boolean;
  /** ISO da conclusão dos 3 passos — quando presente, o widget some p/ sempre. */
  completedAt?: string;
}

const EMPTY_STATE: OnboardingState = {
  campaign: false,
  balance: false,
  explored: false,
};

function storageKey(workspaceId: string): string {
  return `hypeapp:onboarding:${STORAGE_VERSION}:${workspaceId}`;
}

function loadState(workspaceId: string): OnboardingState {
  try {
    const raw = localStorage.getItem(storageKey(workspaceId));
    if (!raw) return EMPTY_STATE;
    const parsed = JSON.parse(raw) as Partial<OnboardingState> | null;
    if (parsed && typeof parsed === "object") {
      return {
        campaign: !!parsed.campaign,
        balance: !!parsed.balance,
        explored: !!parsed.explored,
        completedAt:
          typeof parsed.completedAt === "string" ? parsed.completedAt : undefined,
      };
    }
  } catch {
    // localStorage indisponível / JSON inválido — começa do zero.
  }
  return EMPTY_STATE;
}

function saveState(workspaceId: string, state: OnboardingState): void {
  try {
    localStorage.setItem(storageKey(workspaceId), JSON.stringify(state));
  } catch {
    // sem efeito colateral se o storage falhar
  }
}

interface GettingStartedChecklistProps {
  workspaceId: string;
  /** Existe ≥1 campanha no workspace. */
  campaignCreated: boolean;
}

export function GettingStartedChecklist({
  workspaceId,
  campaignCreated,
}: GettingStartedChecklistProps) {
  const balanceQ = useWorkspaceBalance();
  const b = balanceQ.data;
  const balanceAdded =
    !!b &&
    ((b.balance_cents ?? 0) > 0 ||
      (b.available_cents ?? 0) > 0 ||
      (b.committed_cents ?? 0) > 0);

  const [state, setState] = useState<OnboardingState>(() =>
    workspaceId ? loadState(workspaceId) : EMPTY_STATE,
  );

  // Recarrega o estado ao trocar de workspace (cada um tem seu onboarding).
  useEffect(() => {
    setState(workspaceId ? loadState(workspaceId) : EMPTY_STATE);
  }, [workspaceId]);

  // Funde sinais ao vivo (campanha/saldo) no estado persistido, de forma
  // monotônica, e carimba `completedAt` quando os 3 ficam prontos.
  useEffect(() => {
    if (!workspaceId) return;
    setState((prev) => {
      if (prev.completedAt) return prev;
      const campaign = prev.campaign || campaignCreated;
      const balance = prev.balance || balanceAdded;
      const explored = prev.explored;
      const allDone = campaign && balance && explored;
      if (
        campaign === prev.campaign &&
        balance === prev.balance &&
        !allDone
      ) {
        return prev; // nada mudou
      }
      const next: OnboardingState = {
        campaign,
        balance,
        explored,
        completedAt: allDone ? new Date().toISOString() : prev.completedAt,
      };
      saveState(workspaceId, next);
      return next;
    });
  }, [workspaceId, campaignCreated, balanceAdded]);

  const handleExplore = () => {
    if (!workspaceId) return;
    setState((prev) => {
      if (prev.explored) return prev;
      const campaign = prev.campaign || campaignCreated;
      const balance = prev.balance || balanceAdded;
      const allDone = campaign && balance; // explored vira true agora
      const next: OnboardingState = {
        campaign,
        balance,
        explored: true,
        completedAt: allDone ? new Date().toISOString() : prev.completedAt,
      };
      saveState(workspaceId, next);
      return next;
    });
  };

  // Sinais exibidos (monotônicos com o estado persistido).
  const done = {
    campaign: state.campaign || campaignCreated,
    balance: state.balance || balanceAdded,
    explored: state.explored,
  };
  const completedCount = Number(done.campaign) + Number(done.balance) + Number(done.explored);
  const allDone = completedCount === 3;

  // Some quando já concluído alguma vez (persistido) ou quando os 3 estão prontos.
  if (!workspaceId || state.completedAt || allDone) {
    return null;
  }

  return (
    <section
      aria-label="Primeiros passos com o Hype App"
      className="rounded-3xl border border-primary-200/70 bg-linear-to-br from-primary-50/80 via-white to-white p-6 shadow-sm"
    >
      <div className="flex items-start justify-between gap-3 mb-5">
        <div>
          <h2 className="text-lg font-semibold text-neutral-950">
            Primeiros passos com o Hype App
          </h2>
          <p className="text-sm text-neutral-600 mt-1">
            Complete 3 ações para começar a trabalhar com criadores
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-white border border-primary-200 px-2.5 py-1 text-xs font-semibold text-primary-700 tabular-nums">
          {completedCount}/3
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Link
          to="/campaigns/new"
          className={stepClass(done.campaign)}
        >
          <StepInner index={1} title="Criar campanha" done={done.campaign} />
        </Link>

        <Link to="/financial" className={stepClass(done.balance)}>
          <StepInner index={2} title="Adicionar saldo" done={done.balance} />
        </Link>

        <Link
          to="/creators"
          onClick={handleExplore}
          className={stepClass(done.explored)}
        >
          <StepInner index={3} title="Explorar criadores" done={done.explored} />
        </Link>
      </div>
    </section>
  );
}

function stepClass(done: boolean): string {
  return [
    "group flex items-center gap-3 rounded-2xl border p-4 transition-all",
    done
      ? "border-success-500/30 bg-success-50/50"
      : "border-neutral-200 bg-white hover:border-primary-300 hover:shadow-sm",
  ].join(" ");
}

function StepInner({
  index,
  title,
  done,
}: {
  index: number;
  title: string;
  done: boolean;
}) {
  return (
    <>
      {done ? (
        <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-success-500/10">
          <Icon name="CircleCheck" size={20} color="#22c55e" />
        </div>
      ) : (
        <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary-600 text-sm font-bold text-white">
          {index}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p
          className={[
            "text-sm font-semibold truncate",
            done ? "text-neutral-500 line-through" : "text-neutral-950",
          ].join(" ")}
        >
          {title}
        </p>
      </div>
      {!done && (
        <Icon
          name="ChevronRight"
          size={18}
          color="#a3a3a3"
          className="shrink-0 group-hover:text-primary-600 transition-colors"
        />
      )}
    </>
  );
}
