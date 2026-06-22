import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Modal } from "@/components/ui/modal";
import { InputSearch } from "@/components/ui/input-search";
import { useCampaigns } from "@/hooks/use-campaigns";
import {
  useInviteInfluencer,
  useAddToPreSelection,
} from "@/hooks/use-campaign-influencers";
import { getUploadUrl } from "@/lib/utils/api";
import { getCampaignStatusDisplayLabel } from "@/shared/utils/campaign-status";

interface CampaignPickerModalProps {
  mode: "invite" | "preselection";
  /** `users.id` (string) do influenciador. */
  influencerId: string;
  influencerName: string;
  /** `social_networks.id` (string) dos perfis do influenciador. */
  profileIds: string[];
  onClose: () => void;
}

/**
 * Escolhe uma campanha do workspace e convida / pré-seleciona o influenciador
 * via os endpoints existentes. Usado no perfil do influenciador, onde não há
 * campanha no contexto da rota.
 *
 * Nota de segurança: o gating de saldo (BRL) NÃO é replicado aqui — o backend
 * valida na hora do convite/aprovação (defesa em camadas). Erros do servidor
 * (ex.: saldo insuficiente) são exibidos via toast.
 */
export function CampaignPickerModal({
  mode,
  influencerId,
  influencerName,
  profileIds,
  onClose,
}: CampaignPickerModalProps) {
  const { data: campaigns = [], isLoading } = useCampaigns();
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  // Os hooks recebem o campaignId selecionado; ao trocar a seleção, o
  // re-render rebinda a mutation ao novo id. A mutation só dispara no confirmar.
  const inviteMut = useInviteInfluencer(selectedId ?? "");
  const preselectMut = useAddToPreSelection(selectedId ?? "");
  const isPending = inviteMut.isPending || preselectMut.isPending;

  const isInvite = mode === "invite";

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return campaigns;
    return campaigns.filter((c) => c.title.toLowerCase().includes(q));
  }, [campaigns, search]);

  async function handleConfirm() {
    if (!selectedId) return;
    const mut = isInvite ? inviteMut : preselectMut;
    const data = {
      influencer_id: influencerId,
      ...(profileIds.length ? { profile_ids: profileIds } : {}),
      ...(isInvite && message.trim() ? { message: message.trim() } : {}),
    };
    try {
      await mut.mutateAsync(data);
      toast.success(
        isInvite
          ? `Convite enviado para ${influencerName}.`
          : `${influencerName} adicionado à pré-seleção.`,
      );
      onClose();
    } catch (err) {
      const msg =
        (err as { message?: string })?.message ||
        "Não foi possível concluir a ação. Tente novamente.";
      toast.error(msg);
    }
  }

  return (
    <Modal
      onClose={onClose}
      title={isInvite ? "Enviar convite" : "Convidar para pré-seleção"}
      panelClassName="max-w-lg"
    >
      <div className="flex flex-col gap-4">
        <p className="text-sm text-neutral-500">
          Escolha a campanha para {isInvite ? "convidar" : "pré-selecionar"}{" "}
          <strong className="text-neutral-800">{influencerName}</strong>.
        </p>

        <InputSearch
          placeholder="Buscar campanha..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          icon={<Icon name="Search" size={18} color="#a3a3a3" />}
        />

        <div className="flex max-h-[320px] flex-col gap-2 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center gap-2 py-6 text-sm text-neutral-400">
              <Icon name="Loader" size={16} color="#a3a3a3" className="animate-spin" />
              Carregando campanhas...
            </div>
          ) : filtered.length === 0 ? (
            <p className="py-6 text-center text-sm text-neutral-400">
              {campaigns.length === 0
                ? "Nenhuma campanha disponível neste workspace."
                : "Nenhuma campanha encontrada."}
            </p>
          ) : (
            filtered.map((c) => {
              const active = c.id === selectedId;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelectedId(c.id)}
                  className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-colors ${
                    active
                      ? "border-primary-400 bg-primary-50"
                      : "border-neutral-200 hover:border-primary-300 hover:bg-neutral-50"
                  }`}
                >
                  {c.banner ? (
                    <img
                      src={getUploadUrl(c.banner) ?? undefined}
                      alt=""
                      className="size-10 shrink-0 rounded-lg bg-neutral-200 object-cover"
                    />
                  ) : (
                    <div className="size-10 shrink-0 rounded-lg bg-neutral-200" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-neutral-900">{c.title}</p>
                    <p className="text-xs text-neutral-400">
                      {getCampaignStatusDisplayLabel(c.status)}
                    </p>
                  </div>
                  {active && <Icon name="Check" size={18} color="#9E2CFA" />}
                </button>
              );
            })
          )}
        </div>

        {isInvite && (
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-neutral-700">
              Mensagem (opcional)
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              placeholder="Mensagem para o influenciador..."
              className="w-full resize-none rounded-2xl border border-neutral-200 px-4 py-3 text-sm outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
            />
          </div>
        )}

        <div className="flex justify-end gap-2">
          <Button variant="outline" className="rounded-full" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            className="rounded-full bg-primary-600 hover:bg-primary-700"
            onClick={handleConfirm}
            disabled={!selectedId || isPending}
          >
            {isPending
              ? "Enviando..."
              : isInvite
                ? "Enviar convite"
                : "Adicionar à pré-seleção"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
