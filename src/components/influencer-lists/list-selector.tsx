import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import {
  useInfluencerLists,
  useInfluencerList,
  useBulkAddInfluencers,
} from "@/hooks/use-influencer-lists";
import {
  getCampaignImportPreview,
  type ImportPreviewProfile,
} from "@/shared/services/influencer-lists";
import {
  inviteInfluencer,
  addToPreSelection,
} from "@/shared/services/influencer";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Icon } from "@/components/ui/icon";
import { Badge } from "@/components/ui/badge";
import { getUploadUrl } from "@/lib/utils/api";
import {
  parsePriceBRLToCents,
  fmtBRL,
} from "@/components/campaign-tabs/shared/prices-utils";

type AddMode = "invite" | "preselection";

interface ListSelectorProps {
  campaignId: string;
  /** Método de pagamento da campanha; define se pede valor por criador. */
  paymentMethod?: string;
  trigger?: React.ReactNode;
  onClose?: () => void;
  /** Abre o modal ao montar (fluxo sem trigger, ex. aba de seleção) */
  defaultOpen?: boolean;
}

/** Executa `worker` sobre `items` com concorrência limitada, preservando ordem. */
export async function runPool<T, R>(
  items: T[],
  worker: (item: T, index: number) => Promise<R>,
  concurrency: number
): Promise<PromiseSettledResult<R>[]> {
  const results: PromiseSettledResult<R>[] = new Array(items.length);
  let cursor = 0;
  const run = async () => {
    while (cursor < items.length) {
      const current = cursor++;
      try {
        results[current] = {
          status: "fulfilled",
          value: await worker(items[current], current),
        };
      } catch (reason) {
        results[current] = { status: "rejected", reason };
      }
    }
  };
  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, run)
  );
  return results;
}

/**
 * Importa uma lista salva de influenciadores para a campanha.
 *
 * Fluxo em 2 etapas: (1) escolher a lista → (2) escolher entre CONVITE ou
 * PRÉ-SELEÇÃO e, quando a campanha usa "valor individual por criador",
 * informar o valor proposto de cada membro.
 *
 * Roteamento por método de pagamento (prioriza correção + reserva atômica):
 * - `individual_price` (qualquer modo) e pré-seleção (qualquer método): trata
 *   cada membro pelos endpoints individuais (negociação/valor por criador +
 *   notificação real ao influenciador; pré-seleção nunca reserva saldo).
 * - Convite direto em campanha paga (fixed/influencer_price/etc.): usa o
 *   endpoint em massa (`bulk/add`), que valida o saldo agregado e reserva de
 *   forma tudo-ou-nada.
 */
export function ListSelector({
  campaignId,
  paymentMethod,
  trigger,
  onClose,
  defaultOpen = false,
}: ListSelectorProps) {
  const isIndividualPrice = paymentMethod === "individual_price";

  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [selectedListId, setSelectedListId] = useState<string | null>(null);
  const [mode, setMode] = useState<AddMode>("invite");
  const [message, setMessage] = useState("");
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(
    null
  );

  const { data: lists, isLoading } = useInfluencerLists();
  const { data: listDetail, isLoading: isLoadingDetail } =
    useInfluencerList(selectedListId);
  const { mutateAsync: bulkAdd } = useBulkAddInfluencers(campaignId);

  const members = listDetail?.influencers ?? [];
  const isSubmitting = progress !== null;

  // ── individual_price: preview POR PERFIL (influenciador × rede da campanha) ──
  const profileKey = (p: { user_id: number; social_network_id: number }) =>
    `${p.user_id}-${p.social_network_id}`;

  const [profiles, setProfiles] = useState<ImportPreviewProfile[]>([]);
  const [discardedCount, setDiscardedCount] = useState(0);
  const [removedKeys, setRemovedKeys] = useState<Set<string>>(new Set());
  const [profilePrices, setProfilePrices] = useState<Record<string, string>>({});
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  // Carrega o preview ao entrar no passo de configuração (só individual_price).
  useEffect(() => {
    if (!isIndividualPrice || !selectedListId) {
      setProfiles([]);
      setDiscardedCount(0);
      setRemovedKeys(new Set());
      setProfilePrices({});
      return;
    }
    let cancelled = false;
    setPreviewLoading(true);
    setPreviewError(null);
    getCampaignImportPreview(campaignId, { list_id: selectedListId })
      .then((res) => {
        if (cancelled) return;
        setProfiles(res.profiles);
        setDiscardedCount(res.summary.discarded);
      })
      .catch((err) => {
        if (cancelled) return;
        setPreviewError(
          (err as { message?: string })?.message || "Erro ao carregar perfis"
        );
      })
      .finally(() => {
        if (!cancelled) setPreviewLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isIndividualPrice, selectedListId, campaignId]);

  const keptProfiles = useMemo(
    () => profiles.filter((p) => !removedKeys.has(profileKey(p))),
    [profiles, removedKeys]
  );

  // Validação: individual → cada PERFIL mantido precisa de valor > 0.
  const allPricesValid = useMemo(() => {
    if (!isIndividualPrice) return true;
    if (keptProfiles.length === 0) return false;
    return keptProfiles.every(
      (p) => parsePriceBRLToCents(profilePrices[profileKey(p)]) > 0
    );
  }, [isIndividualPrice, keptProfiles, profilePrices]);

  const removeProfile = (key: string) =>
    setRemovedKeys((prev) => new Set(prev).add(key));

  const resetAll = () => {
    setSelectedListId(null);
    setMode("invite");
    setMessage("");
    setProfiles([]);
    setDiscardedCount(0);
    setRemovedKeys(new Set());
    setProfilePrices({});
    setPreviewError(null);
    setProgress(null);
  };

  const handleClose = () => {
    if (isSubmitting) return;
    setIsOpen(false);
    resetAll();
    onClose?.();
  };

  const handleConfirm = async () => {
    if (!selectedListId) return;

    // Caminho em massa: convite direto em campanha NÃO individual. Reserva
    // atômica do saldo agregado no backend.
    if (mode === "invite" && !isIndividualPrice) {
      try {
        setProgress({ done: 0, total: 1 });
        await bulkAdd({ list_id: selectedListId });
        handleClose();
      } catch (err) {
        setProgress(null);
        toast.error(
          (err as { message?: string })?.message ||
            "Erro ao adicionar influenciadores"
        );
      }
      return;
    }

    const trimmedMessage = message.trim();
    const action = mode === "invite" ? inviteInfluencer : addToPreSelection;
    const verb = mode === "invite" ? "convidado(s)" : "adicionado(s) à pré-seleção";

    // ── individual_price: 1 convite por criador, com network_prices (por rede) ──
    if (isIndividualPrice) {
      if (keptProfiles.length === 0) {
        toast.error("Nenhum perfil compatível com a campanha para convidar.");
        return;
      }
      if (!allPricesValid) {
        toast.error("Informe o valor de cada perfil (rede).");
        return;
      }

      // Agrupa os perfis mantidos por influenciador.
      const byUser = new Map<
        number,
        { network_id: number; proposed_price_cents: number }[]
      >();
      for (const p of keptProfiles) {
        const arr = byUser.get(p.user_id) ?? [];
        arr.push({
          network_id: p.social_network_id,
          proposed_price_cents: parsePriceBRLToCents(
            profilePrices[profileKey(p)]
          ),
        });
        byUser.set(p.user_id, arr);
      }
      const entries = [...byUser.entries()];
      setProgress({ done: 0, total: entries.length });

      const results = await runPool(
        entries,
        async ([userId, items]) => {
          await action(campaignId, {
            influencer_id: String(userId),
            ...(trimmedMessage ? { message: trimmedMessage } : {}),
            network_prices: items,
          });
          setProgress((prev) => (prev ? { ...prev, done: prev.done + 1 } : prev));
        },
        4
      );

      const succeeded = results.filter((r) => r.status === "fulfilled").length;
      const failed = results.length - succeeded;
      if (succeeded > 0) toast.success(`${succeeded} criador(es) ${verb}.`);
      if (failed > 0)
        toast.error(`${failed} não puderam ser processados (já na campanha ou erro).`);
      if (succeeded > 0) handleClose();
      else setProgress(null);
      return;
    }

    // ── Não-individual: pré-seleção por membro (fluxo existente) ──
    if (members.length === 0) {
      toast.error("A lista selecionada não possui influenciadores.");
      return;
    }
    setProgress({ done: 0, total: members.length });
    const results = await runPool(
      members,
      async (member) => {
        await action(campaignId, {
          influencer_id: String(member.id),
          ...(trimmedMessage ? { message: trimmedMessage } : {}),
        });
        setProgress((prev) => (prev ? { ...prev, done: prev.done + 1 } : prev));
      },
      4
    );

    const succeeded = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.length - succeeded;
    if (succeeded > 0) {
      toast.success(`${succeeded} influenciador(es) ${verb}.`);
    }
    if (failed > 0) {
      toast.error(
        `${failed} não puderam ser processados (já na campanha ou erro).`
      );
    }

    if (succeeded > 0) {
      handleClose();
    } else {
      setProgress(null);
    }
  };

  const renderListStep = () => (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-neutral-600">
        Escolha uma lista para adicionar os influenciadores à campanha.
      </p>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
        </div>
      ) : (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {lists && lists.length > 0 ? (
            lists.map((list) => (
              <button
                key={list.id}
                type="button"
                className="w-full flex items-center justify-between p-4 border border-neutral-200 rounded-xl hover:bg-neutral-50 transition-colors text-left"
                onClick={() => setSelectedListId(list.id)}
              >
                <div className="flex-1">
                  <p className="font-medium text-neutral-950">{list.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge
                      text={`${list.influencer_count} influenciador(es)`}
                      backgroundColor="bg-neutral-100"
                      textColor="text-neutral-700"
                    />
                    <span className="text-xs text-neutral-500">
                      {new Date(list.created_at).toLocaleDateString("pt-BR")}
                    </span>
                  </div>
                </div>
                <Icon name="ChevronRight" color="#A3A3A3" size={20} />
              </button>
            ))
          ) : (
            <div className="text-center py-8">
              <Icon name="List" color="#A3A3A3" size={48} />
              <p className="text-neutral-600 mt-4">Nenhuma lista encontrada</p>
            </div>
          )}
        </div>
      )}

      <div className="flex gap-3 pt-4 border-t border-neutral-200">
        <Button variant="outline" onClick={handleClose} className="flex-1">
          Cancelar
        </Button>
      </div>
    </div>
  );

  const renderConfigureStep = () => (
    <div className="flex flex-col gap-4">
      {/* Modo: convite vs pré-seleção */}
      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium text-neutral-800">
          Como adicionar
        </span>
        <div className="grid grid-cols-2 gap-2">
          {(
            [
              {
                value: "invite" as const,
                title: "Convidar",
                desc: "Envia convite direto ao criador.",
              },
              {
                value: "preselection" as const,
                title: "Pré-seleção",
                desc: "Move para pré-seleção (sem reserva).",
              },
            ]
          ).map((opt) => {
            const active = mode === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                disabled={isSubmitting}
                onClick={() => setMode(opt.value)}
                className={`flex flex-col gap-1 rounded-xl border p-3 text-left transition-colors ${
                  active
                    ? "border-primary-400 bg-primary-50"
                    : "border-neutral-200 hover:border-primary-300 hover:bg-neutral-50"
                }`}
              >
                <span className="flex items-center justify-between font-medium text-neutral-900">
                  {opt.title}
                  {active && <Icon name="Check" size={16} color="#9E2CFA" />}
                </span>
                <span className="text-xs text-neutral-500">{opt.desc}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Mensagem opcional */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-neutral-700">
          Mensagem (opcional)
        </label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={2}
          disabled={isSubmitting}
          placeholder="Mensagem para os influenciadores..."
          className="w-full resize-none rounded-xl border border-neutral-200 px-4 py-3 text-sm outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
        />
      </div>

      {/* individual_price → um card por PERFIL (rede) com valor + remover.
          Demais métodos → lista simples de membros. */}
      {isIndividualPrice ? (
        previewLoading || isLoadingDetail ? (
          <div className="flex items-center justify-center py-6">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-500" />
          </div>
        ) : previewError ? (
          <p className="text-sm text-red-600">{previewError}</p>
        ) : (
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-neutral-800">
                {keptProfiles.length} perfil(is) convidável(is)
              </span>
              <span className="text-xs text-primary-700">
                Valor individual por criador
              </span>
            </div>

            <p className="text-xs text-neutral-500">
              Cada perfil é uma rede da campanha. Informe o valor de cada um — o
              criador poderá aceitar ou contrapropor por rede; o saldo só é
              reservado quando o valor fecha.
            </p>

            {discardedCount > 0 && (
              <p className="text-xs text-amber-600">
                {discardedCount} perfil(is) descartado(s) por não terem rede
                compatível com a campanha.
              </p>
            )}

            {keptProfiles.length === 0 ? (
              <div className="rounded-xl border border-neutral-200 p-4 text-center text-sm text-neutral-500">
                Nenhum perfil da lista é compatível com as redes da campanha.
              </div>
            ) : (
              <div className="flex flex-col gap-2 max-h-72 overflow-y-auto">
                {keptProfiles.map((p) => {
                  const key = profileKey(p);
                  const cents = parsePriceBRLToCents(profilePrices[key]);
                  return (
                    <div
                      key={key}
                      className="flex items-center gap-3 rounded-xl border border-neutral-200 p-3"
                    >
                      {p.photo ? (
                        <img
                          src={getUploadUrl(p.photo) ?? undefined}
                          alt=""
                          className="size-9 shrink-0 rounded-full bg-neutral-200 object-cover"
                        />
                      ) : (
                        <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-neutral-200 text-xs font-medium text-neutral-600">
                          {p.name?.charAt(0).toUpperCase() ?? "?"}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-neutral-900">
                          {p.name}
                        </p>
                        <div className="mt-0.5 flex items-center gap-1.5">
                          <Badge
                            text={p.network_type}
                            backgroundColor="bg-primary-50"
                            textColor="text-primary-700"
                          />
                          {p.username && (
                            <span className="truncate text-xs text-neutral-500">
                              @{p.username}
                            </span>
                          )}
                          {cents > 0 && (
                            <span className="text-xs text-neutral-500">
                              · {fmtBRL(cents)}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm text-neutral-500">R$</span>
                        <input
                          inputMode="decimal"
                          value={profilePrices[key] ?? ""}
                          onChange={(e) =>
                            setProfilePrices((prev) => ({
                              ...prev,
                              [key]: e.target.value,
                            }))
                          }
                          disabled={isSubmitting}
                          placeholder="0,00"
                          className="w-24 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
                        />
                        <button
                          type="button"
                          onClick={() => removeProfile(key)}
                          disabled={isSubmitting}
                          aria-label="Remover perfil"
                          className="flex size-7 shrink-0 items-center justify-center rounded-lg text-neutral-400 hover:bg-neutral-100 hover:text-red-500"
                        >
                          <Icon name="X" size={16} color="currentColor" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )
      ) : isLoadingDetail ? (
        <div className="flex items-center justify-center py-6">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-500" />
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium text-neutral-800">
            {members.length} influenciador(es)
          </span>
          <div className="flex flex-col gap-2 max-h-72 overflow-y-auto">
            {members.map((member) => (
              <div
                key={member.id}
                className="flex items-center gap-3 rounded-xl border border-neutral-200 p-3"
              >
                {member.photo ? (
                  <img
                    src={getUploadUrl(member.photo) ?? undefined}
                    alt=""
                    className="size-9 shrink-0 rounded-full bg-neutral-200 object-cover"
                  />
                ) : (
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-neutral-200 text-xs font-medium text-neutral-600">
                    {member.name?.charAt(0).toUpperCase() ?? "?"}
                  </div>
                )}
                <p className="truncate text-sm font-medium text-neutral-900">
                  {member.name}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {progress && progress.total > 1 && (
        <p className="text-center text-sm text-neutral-500">
          Processando {progress.done}/{progress.total}...
        </p>
      )}

      <div className="flex gap-3 pt-4 border-t border-neutral-200">
        <Button
          variant="outline"
          onClick={() => setSelectedListId(null)}
          disabled={isSubmitting}
          className="flex-1"
        >
          Voltar
        </Button>
        <Button
          onClick={handleConfirm}
          disabled={
            isSubmitting ||
            isLoadingDetail ||
            (isIndividualPrice
              ? previewLoading || keptProfiles.length === 0 || !allPricesValid
              : members.length === 0)
          }
          className="flex-1"
        >
          {isSubmitting
            ? "Processando..."
            : mode === "invite"
              ? "Convidar todos"
              : "Adicionar à pré-seleção"}
        </Button>
      </div>
    </div>
  );

  return (
    <>
      {trigger && (
        <div onClick={() => setIsOpen(true)} className="cursor-pointer">
          {trigger}
        </div>
      )}

      {isOpen && (
        <Modal
          title={
            selectedListId
              ? "Adicionar lista à campanha"
              : "Selecionar lista de influenciadores"
          }
          onClose={handleClose}
          panelClassName="max-w-lg"
        >
          {selectedListId ? renderConfigureStep() : renderListStep()}
        </Modal>
      )}
    </>
  );
}
