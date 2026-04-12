import { useState, useMemo } from "react";

import { createFileRoute, Outlet, useLocation, Link } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { CampaignCard } from "@/components/campaign-card";
import { InputSearch } from "@/components/ui/input-search";
import { Icon } from "@/components/ui/icon";
import { Dropdown } from "@/components/ui/dropdown";
import { Avatar } from "@/components/ui/avatar";
import { useCampaigns } from "@/hooks/use-campaigns";
import { useWorkspaceContext, useWorkspacePermissions } from "@/contexts/workspace-context";
import { getUploadUrl } from "@/lib/utils/api";
import { getCampaignStatusValue } from "@/shared/utils/campaign-status";

export const Route = createFileRoute("/(private)/(app)/campaigns")({
  component: RouteComponent,
});

function RouteComponent() {
  const location = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all_campaigns");
  const [showWorkspaceModal, setShowWorkspaceModal] = useState(false);

  const {
    workspaces,
    isInitialized,
    selectedWorkspace,
    selectWorkspace,
  } = useWorkspaceContext();

  const permissions = useWorkspacePermissions();
  const hasWorkspace = !!selectedWorkspace;
  const { data: campaignsData = [], isLoading, error } = useCampaigns({
    enabled: hasWorkspace,
  });

  const campaigns = useMemo(() => {
    return campaignsData.map((campaign: any) => {
      // Calcular progresso baseado no status (pode ser melhorado com métricas reais)
      let progressPercentage = 0;
      let phase = "Não iniciada";
      
      const sv = getCampaignStatusValue(campaign.status);
      if (sv === "active" || sv === "published") {
        progressPercentage = 50;
        phase = "Em andamento";
      } else if (sv === "finished" || sv === "completed") {
        progressPercentage = 100;
        phase = "Finalizada";
      } else if (sv === "draft") {
        progressPercentage = 10;
        phase = "Rascunho";
      }

      return {
        id: campaign.id || "",
        title: campaign.title,
        phase,
        progressPercentage,
        banner: campaign.banner || undefined,
        influencersCount: campaign.max_influencers || 0,
      };
    });
  }, [campaignsData]);

  // Filtrar campanhas
  const filteredCampaigns = useMemo(() => {
    let filtered = campaigns;

    // Filtrar por termo de busca
    if (searchTerm.trim()) {
      filtered = filtered.filter((campaign: any) =>
        campaign.title.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filtrar por status
    if (filterStatus === "active_campaigns") {
      filtered = filtered.filter((campaign: any) => campaign.progressPercentage > 0 && campaign.progressPercentage < 100);
    } else if (filterStatus === "finished_campaigns") {
      filtered = filtered.filter((campaign: any) => campaign.progressPercentage === 100);
    }

    return filtered;
  }, [campaigns, searchTerm, filterStatus]);

  if (location.pathname !== "/campaigns") {
    return <Outlet />;
  }

  // Aguardar workspace estar pronto antes de decidir o que mostrar
  if (location.pathname === "/campaigns" && !isInitialized) {
    return (
      <div className="w-full min-h-[calc(100vh-10rem)] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
          <p className="text-neutral-600">Preparando workspace...</p>
        </div>
      </div>
    );
  }

  // Na página de campanhas: sem workspace selecionado → modal ou empty state (só após contexto inicializado)
  if (isInitialized && !hasWorkspace) {
    if (workspaces.length === 0) {
      return (
        <div className="w-full min-h-[calc(100vh-10rem)] flex items-center justify-center">
          <div className="w-full max-w-xl flex flex-col items-center gap-6">
            <div className="flex flex-col items-center gap-2 text-center">
              <div className="w-16 h-16 rounded-2xl bg-primary-100 flex items-center justify-center">
                <Icon name="Building2" color="#9e2cfa" size={32} />
              </div>
              <p className="text-2xl font-medium text-neutral-950">
                Nenhum workspace encontrado
              </p>
              <span className="text-neutral-600">
                Crie um workspace no onboarding para começar a gerenciar suas campanhas.
              </span>
            </div>
            <Link to="/onboarding">
              <Button>
                <p className="text-neutral-50 font-semibold">Ir para onboarding</p>
              </Button>
            </Link>
          </div>
        </div>
      );
    }
    // Tem workspaces mas nenhum selecionado → modal para escolher
    return (
      <>
        <div className="w-full min-h-[calc(100vh-10rem)] flex items-center justify-center">
          <div className="w-full max-w-xl flex flex-col items-center gap-6">
            <div className="flex flex-col items-center gap-2 text-center">
              <div className="w-16 h-16 rounded-2xl bg-primary-100 flex items-center justify-center">
                <Icon name="Building2" color="#9e2cfa" size={32} />
              </div>
              <p className="text-2xl font-medium text-neutral-950">
                Selecione um workspace
              </p>
              <span className="text-neutral-600">
                Escolha o workspace para ver e gerenciar as campanhas.
              </span>
            </div>
            <Button onClick={() => setShowWorkspaceModal(true)}>
              <p className="text-neutral-50 font-semibold">Escolher workspace</p>
            </Button>
          </div>
        </div>

        {showWorkspaceModal && (
          <Modal
            title="Selecione um workspace"
            onClose={() => setShowWorkspaceModal(false)}
          >
            <div className="flex flex-col gap-3">
              <p className="text-sm text-neutral-600 mb-2">
                Selecione o workspace para acessar as campanhas:
              </p>
              {workspaces.map((workspace) => (
                <button
                  key={workspace.id}
                  type="button"
                  onClick={() => {
                    selectWorkspace(workspace);
                    setShowWorkspaceModal(false);
                  }}
                  className="w-full flex items-center gap-4 p-4 rounded-xl border border-neutral-200 hover:border-primary-300 hover:bg-primary-50/50 transition-colors text-left"
                >
                  <Avatar
                    size="md"
                    src={getUploadUrl(workspace.photo)}
                    alt={workspace.name}
                  />
                  <div>
                    <p className="font-semibold text-neutral-950">{workspace.name}</p>
                    <p className="text-xs text-neutral-500">Clique para acessar as campanhas</p>
                  </div>
                  <Icon name="ChevronRight" className="ml-auto" size={20} color="#525252" />
                </button>
              ))}
            </div>
          </Modal>
        )}
      </>
    );
  }

  if (isLoading) {
    return (
      <div className="w-full min-h-[calc(100vh-10rem)] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          <p className="text-neutral-600">Carregando campanhas...</p>
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
              Erro ao carregar campanhas
            </p>
            <span className="text-neutral-600 text-center">
              {error instanceof Error ? error.message : "Ocorreu um erro ao buscar as campanhas. Tente novamente."}
            </span>
          </div>
          <Button onClick={() => window.location.reload()}>
            Tentar novamente
          </Button>
        </div>
      </div>
    );
  }

  const emptyMessageByFilter =
    filterStatus === "active_campaigns"
      ? {
          title: "Nenhuma campanha ativa no momento",
          description:
            "Altere o filtro acima para ver todas ou finalizadas, ou crie uma nova campanha.",
        }
      : filterStatus === "finished_campaigns"
        ? {
            title: "Nenhuma campanha finalizada",
            description:
              "Altere o filtro acima para ver todas ou ativas, ou crie uma nova campanha.",
          }
        : {
            title: "Nenhuma campanha por aqui... ainda!",
            description:
              "Dê o primeiro passo: crie sua primeira campanha e comece a impulsionar sua marca no Hype.",
          };

  return (
    <>
      <div className="flex flex-col gap-6">
        {/* Barra superior sempre visível: pesquisa, filtro e criar campanha */}
        <div className="flex items-center justify-between">
          <div className="w-full max-w-xs">
            <InputSearch
              placeholder="Pesquisar campanha"
              icon={<Icon name="Search" color="#0a0a0a" size={16} />}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-4 z-10">
            <div className="w-auto">
              <Dropdown
                options={[
                  { label: "Todas as campanhas", value: "all_campaigns" },
                  { label: "Campanhas ativas", value: "active_campaigns" },
                  {
                    label: "Campanhas finalizadas",
                    value: "finished_campaigns",
                  },
                ]}
                value={filterStatus}
                onChange={setFilterStatus}
              />
            </div>

            {permissions.campaigns_create && (
              <Link
                to="/campaigns/new"
                params={{}}
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-primary-600 px-6 font-medium text-sm text-white shadow-sm transition-all hover:bg-primary-700 hover:shadow focus-visible:ring-2 focus-visible:ring-primary-500/50 focus-visible:ring-offset-2 outline-none"
              >
                <Icon name="Plus" color="#FAFAFA" size={16} />
                <span className="font-semibold">Criar campanha</span>
              </Link>
            )}
          </div>
        </div>

        {filteredCampaigns.length > 0 ? (
          <div className="grid xl:grid-cols-3 2xl:grid-cols-4 gap-5">
            {filteredCampaigns.map((campaign: any) => (
              <CampaignCard
                key={campaign.id}
                id={campaign.id}
                title={campaign.title}
                phase={campaign.phase}
                progressPercentage={campaign.progressPercentage}
                banner={campaign.banner}
                influencersCount={campaign.influencersCount}
              />
            ))}
          </div>
        ) : (
          <div className="w-full min-h-[calc(100vh-16rem)] flex items-center justify-center py-12">
            <div className="w-full max-w-md flex flex-col items-center gap-6 text-center">
              <div className="w-14 h-14 rounded-2xl bg-neutral-100 flex items-center justify-center mx-auto">
                <Icon name="Megaphone" color="#a3a3a3" size={28} />
              </div>
              <div className="flex flex-col gap-1">
                <p className="text-lg font-semibold text-neutral-950">
                  {emptyMessageByFilter.title}
                </p>
                <span className="text-sm text-neutral-600">
                  {emptyMessageByFilter.description}
                </span>
              </div>
              {permissions.campaigns_create && (
                <Link
                  to="/campaigns/new"
                  params={{}}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-primary-600 px-6 font-medium text-sm text-white shadow-sm transition-all hover:bg-primary-700 hover:shadow focus-visible:ring-2 focus-visible:ring-primary-500/50 focus-visible:ring-offset-2 outline-none"
                >
                  Criar campanha
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
