import { useState } from "react";

import { createFileRoute } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { BalanceOverview } from "@/components/financial/balance-overview";
import { CampaignConsumptionSection } from "@/components/financial/campaign-consumption-section";
import { CpmSpendSection } from "@/components/financial/cpm-spend-section";
import { MovementsSection } from "@/components/financial/movements-section";
import { TopUpModal } from "@/components/financial/top-up-modal";
import {
  useWorkspaceContext,
  useWorkspacePermissions,
} from "@/contexts/workspace-context";

/**
 * Página /financial — conciliação financeira do workspace.
 *
 * Centraliza tudo que estava espalhado no WalletDrawer (saldo + depósito) e
 * abre espaço para seções futuras (histórico, consumo por campanha, CPM).
 *
 * Gating:
 *  - Precisa de workspace selecionado (mesma exigência da API de balance).
 *  - Permissão `financial_read` controla acesso ao item da sidebar.
 *  - Botão de depósito respeita `financial_balance_add`.
 */
export const Route = createFileRoute("/(private)/(app)/financial")({
  component: FinancialPage,
});

function FinancialPage() {
  const { selectedWorkspace, isInitialized } = useWorkspaceContext();
  const permissions = useWorkspacePermissions();
  const [topUpOpen, setTopUpOpen] = useState(false);

  if (!isInitialized) {
    return (
      <div className="w-full min-h-[60vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600" />
      </div>
    );
  }

  if (!selectedWorkspace) {
    return (
      <div className="flex flex-col gap-6 p-6 max-w-7xl mx-auto w-full">
        <PageHeader canDeposit={false} onDeposit={() => {}} />
        <EmptyCard
          icon="Building2"
          title="Selecione um workspace"
          description="O saldo é por workspace. Escolha um workspace no menu superior para visualizar a conciliação financeira."
        />
      </div>
    );
  }

  const canDeposit = permissions.financial_balance_add;

  return (
    <div className="flex flex-col gap-6 p-6 max-w-7xl mx-auto w-full">
      <PageHeader
        canDeposit={canDeposit}
        onDeposit={() => setTopUpOpen(true)}
      />

      <BalanceOverview />

      <FinancialSection
        title="Histórico de movimentações"
        description="Depósitos, reservas, estornos e saques realizados no saldo deste workspace."
      >
        <MovementsSection />
      </FinancialSection>

      <FinancialSection
        title="Consumo por campanha"
        description="Quanto de saldo cada campanha em execução está consumindo do workspace."
      >
        <CampaignConsumptionSection />
      </FinancialSection>

      <FinancialSection
        title="Gasto atualizado — campanhas CPM"
        description="Gasto acumulado por visualizações contabilizadas (janela de 7 dias após cada publicação)."
      >
        <CpmSpendSection />
      </FinancialSection>

      {topUpOpen && (
        <TopUpModal open={topUpOpen} onClose={() => setTopUpOpen(false)} />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// PageHeader
// ---------------------------------------------------------------------------

interface PageHeaderProps {
  canDeposit: boolean;
  onDeposit: () => void;
}

function PageHeader({ canDeposit, onDeposit }: PageHeaderProps) {
  return (
    <header className="flex items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold text-neutral-950 tracking-tight">
          Financeiro
        </h1>
        <p className="text-sm text-neutral-500 mt-1">
          Conciliação de saldo do workspace: depósitos, reservas, consumo por
          campanha e histórico de movimentações.
        </p>
      </div>
      <Button
        onClick={onDeposit}
        disabled={!canDeposit}
        title={
          canDeposit
            ? "Adicionar saldo via PIX"
            : "Você não tem permissão para adicionar saldo"
        }
      >
        <Icon
          name="Plus"
          size={16}
          color={canDeposit ? "#FFFFFF" : "#A3A3A3"}
        />
        Adicionar saldo
      </Button>
    </header>
  );
}

// ---------------------------------------------------------------------------
// FinancialSection — wrapper visual padronizado
// ---------------------------------------------------------------------------

interface FinancialSectionProps {
  title: string;
  description: string;
  children: React.ReactNode;
}

function FinancialSection({
  title,
  description,
  children,
}: FinancialSectionProps) {
  return (
    <section className="flex flex-col gap-3">
      <div>
        <h2 className="text-base font-semibold text-neutral-950 tracking-tight">
          {title}
        </h2>
        <p className="text-xs text-neutral-500 mt-0.5">{description}</p>
      </div>
      {children}
    </section>
  );
}

// ---------------------------------------------------------------------------
// EmptyCard — estado de "selecione workspace"
// ---------------------------------------------------------------------------

interface EmptyCardProps {
  icon: Parameters<typeof Icon>[0]["name"];
  title: string;
  description: string;
}

function EmptyCard({ icon, title, description }: EmptyCardProps) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-12 flex flex-col items-center gap-3 text-center">
      <div className="w-14 h-14 rounded-full bg-neutral-100 flex items-center justify-center">
        <Icon name={icon} size={24} color="#525252" />
      </div>
      <div>
        <p className="text-base font-semibold text-neutral-950">{title}</p>
        <p className="text-sm text-neutral-500 mt-1">{description}</p>
      </div>
    </div>
  );
}
