import { useMemo, useState } from "react";
import { toast } from "sonner";

import {
  useInfluencerLists,
  useInfluencerList,
  useBulkAddInfluencers,
} from "@/hooks/use-influencer-lists";
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
  /** Valores propostos por criador (BRL mascarado), chave = userId. */
  const [priceInputs, setPriceInputs] = useState<Record<number, string>>({});
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(
    null
  );

  const { data: lists, isLoading } = useInfluencerLists();
  const { data: listDetail, isLoading: isLoadingDetail } =
    useInfluencerList(selectedListId);
  const { mutateAsync: bulkAdd } = useBulkAddInfluencers(campaignId);

  const members = listDetail?.influencers ?? [];
  const isSubmitting = progress !== null;

  // Validação: no modo individual, todo membro precisa de valor > 0.
  const allPricesValid = useMemo(() => {
    if (!isIndividualPrice) return true;
    if (members.length === 0) return false;
    return members.every((m) => parsePriceBRLToCents(priceInputs[m.id]) > 0);
  }, [isIndividualPrice, members, priceInputs]);

  const resetAll = () => {
    setSelectedListId(null);
    setMode("invite");
    setMessage("");
    setPriceInputs({});
    setProgress(null);
  };

  const handleClose = () => {
    if (isSubmitting) return;
    setIsOpen(false);
    resetAll();
    onClose?.();
  };

  const handlePriceChange = (userId: number, value: string) => {
    setPriceInputs((prev) => ({ ...prev, [userId]: value }));
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

    // Caminho por membro: pré-seleção (qualquer método) ou valor individual.
    // Reaproveita os endpoints individuais (notificação real + negociação de
    // valor). Sem reserva no convite individual (só no fechamento) e pré-seleção
    // nunca reserva → concorrência é segura.
    if (members.length === 0) {
      toast.error("A lista selecionada não possui influenciadores.");
      return;
    }
    if (isIndividualPrice && !allPricesValid) {
      toast.error("Informe o valor proposto para cada criador.");
      return;
    }

    const trimmedMessage = message.trim();
    setProgress({ done: 0, total: members.length });

    const action = mode === "invite" ? inviteInfluencer : addToPreSelection;
    const results = await runPool(
      members,
      async (member) => {
        await action(campaignId, {
          influencer_id: String(member.id),
          ...(trimmedMessage ? { message: trimmedMessage } : {}),
          ...(isIndividualPrice
            ? { proposed_price_cents: parsePriceBRLToCents(priceInputs[member.id]) }
            : {}),
        });
        setProgress((prev) => (prev ? { ...prev, done: prev.done + 1 } : prev));
      },
      4
    );

    const succeeded = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.length - succeeded;

    const verb = mode === "invite" ? "convidado(s)" : "adicionado(s) à pré-seleção";
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

      {/* Membros: no modo individual, valor por criador */}
      {isLoadingDetail ? (
        <div className="flex items-center justify-center py-6">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-500" />
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-neutral-800">
              {members.length} influenciador(es)
            </span>
            {isIndividualPrice && (
              <span className="text-xs text-primary-700">
                Valor individual por criador
              </span>
            )}
          </div>

          {isIndividualPrice && (
            <p className="text-xs text-neutral-500">
              Informe o valor proposto de cada criador. Ele poderá aceitar ou
              enviar uma contraproposta; o saldo só é reservado quando o valor
              fecha.
            </p>
          )}

          <div className="flex flex-col gap-2 max-h-72 overflow-y-auto">
            {members.map((member) => {
              const cents = parsePriceBRLToCents(priceInputs[member.id]);
              return (
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
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-neutral-900">
                      {member.name}
                    </p>
                    {isIndividualPrice && cents > 0 && (
                      <p className="text-xs text-neutral-500">{fmtBRL(cents)}</p>
                    )}
                  </div>
                  {isIndividualPrice && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm text-neutral-500">R$</span>
                      <input
                        inputMode="decimal"
                        value={priceInputs[member.id] ?? ""}
                        onChange={(e) =>
                          handlePriceChange(member.id, e.target.value)
                        }
                        disabled={isSubmitting}
                        placeholder="0,00"
                        className="w-28 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
                      />
                    </div>
                  )}
                </div>
              );
            })}
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
            members.length === 0 ||
            (isIndividualPrice && !allPricesValid)
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
