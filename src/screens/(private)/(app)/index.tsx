import { useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useCampaigns } from "@/hooks/use-campaigns";
import { Icon } from "@/components/ui/icon";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/(private)/(app)/")({
  component: RouteComponent,
});

function RouteComponent() {
  const { data: campaignsData = [], isLoading, error } = useCampaigns();

  const stats = useMemo(() => {
    const total = campaignsData.length;
    const active = campaignsData.filter(
      (c: any) => c.status.value === "active"
    ).length;
    const finished = campaignsData.filter(
      (c: any) => c.status.value === "finished"
    ).length;
    const draft = campaignsData.filter((c: any) => c.status.value === "draft").length;

    return { total, active, finished, draft };
  }, [campaignsData]);

  const recentCampaigns = useMemo(() => {
    return campaignsData
      .slice()
      .sort((a: any, b: any) => {
        const dateA = new Date(a.created_at || a.updated_at || 0).getTime();
        const dateB = new Date(b.created_at || b.updated_at || 0).getTime();
        return dateB - dateA;
      })
      .slice(0, 5);
  }, [campaignsData]);

  if (isLoading) {
    return (
      <div className="w-full min-h-[calc(100vh-10rem)] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          <p className="text-neutral-600">Carregando dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full min-h-[calc(100vh-10rem)] flex items-center justify-center">
        <div className="w-full max-w-xl flex flex-col items-center gap-6">
          <div className="flex flex-col items-center gap-2">
            <p className="text-2xl font-medium text-neutral-950">
              Erro ao carregar dashboard
            </p>
            <span className="text-neutral-600 text-center">
              {error instanceof Error
                ? error.message
                : "Ocorreu um erro ao buscar os dados. Tente novamente."}
            </span>
          </div>
          <Button onClick={() => window.location.reload()}>
            Tentar novamente
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-neutral-950">Dashboard</h1>
          <p className="text-neutral-600 mt-1">
            Visão geral das suas campanhas
          </p>
        </div>
        <Link to="/campaigns">
          <Button>
            <div className="flex items-center gap-2">
              <Icon name="Plus" color="#FAFAFA" size={16} />
              <p className="text-neutral-50 font-semibold">Nova campanha</p>
            </div>
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total de Campanhas" value={stats.total} />
        <StatCard title="Campanhas Ativas" value={stats.active} />
        <StatCard title="Campanhas Finalizadas" value={stats.finished} />
        <StatCard title="Rascunhos" value={stats.draft} />
      </div>

      {/* Recent Campaigns */}
      <div className="bg-neutral-50 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-neutral-950">
            Campanhas Recentes
          </h2>
          <Link
            to="/campaigns"
            className="text-primary-600 hover:text-primary-700 font-medium text-sm"
          >
            Ver todas
          </Link>
        </div>

        {recentCampaigns.length > 0 ? (
          <div className="flex flex-col gap-4">
            {recentCampaigns.map((campaign: any) => (
              <Link
                key={campaign.id}
                to="/campaigns/$campaignId"
                params={{ campaignId: campaign.id }}
                className="flex items-center justify-between p-4 bg-white rounded-xl hover:shadow-md transition-shadow"
              >
                <div className="flex items-center gap-4 flex-1">
                  <div className="w-12 h-12 rounded-lg bg-primary-100 flex items-center justify-center">
                    <Icon name="Megaphone" color="#9e2cfa" size={24} />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-neutral-950">
                      {campaign.title}
                    </h3>
                    <p className="text-sm text-neutral-600 mt-1">
                      {campaign.description || "Sem descrição"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <StatusBadge status={campaign.status.value} />
                  <Icon name="ChevronRight" color="#525252" size={20} />
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12">
            <Icon name="Inbox" color="#a3a3a3" size={48} />
            <p className="text-neutral-600 mt-4 text-center">
              Nenhuma campanha encontrada
            </p>
            <Link to="/campaigns" className="mt-4">
              <Button>
                <p className="text-neutral-50 font-semibold">
                  Criar primeira campanha
                </p>
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

interface StatCardProps {
  title: string;
  value: number;
}

function StatCard({ title, value }: StatCardProps) {
  return (
    <div className="bg-neutral-50 rounded-2xl p-6">
      <div>
        <p className="text-3xl font-bold text-neutral-950">{value}</p>
        <p className="text-sm text-neutral-600 mt-1">{title}</p>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const statusConfig = {
    active: { label: "Ativa", color: "bg-secondary-100 text-secondary-700" },
    finished: { label: "Finalizada", color: "bg-success-50 text-success-700" },
    draft: { label: "Rascunho", color: "bg-neutral-200 text-neutral-700" },
  };

  // Garantir que status seja uma string (não um objeto)
  const statusString =
    typeof status === "string" ? status : String(status || "");

  const config = statusConfig[statusString as keyof typeof statusConfig] || {
    label: statusString,
    color: "bg-neutral-200 text-neutral-700",
  };

  // Garantir que label seja sempre uma string
  const labelText =
    typeof config.label === "string"
      ? config.label
      : String(config.label || "");

  return (
    <span
      className={`px-3 py-1 rounded-full text-xs font-medium ${config.color}`}
    >
      {labelText}
    </span>
  );
}
