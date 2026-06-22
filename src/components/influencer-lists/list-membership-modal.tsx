import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Modal } from "@/components/ui/modal";
import {
  useInfluencerLists,
  useInfluencerMembershipMap,
} from "@/hooks/use-influencer-lists";
import {
  useCreateInfluencerList,
  useAddToInfluencerList,
  useRemoveFromInfluencerList,
} from "@/hooks/use-creators-catalog";

interface ListMembershipModalProps {
  /** `users.id` do influenciador (NÃO `social_networks.id`). */
  userId: number;
  influencerName: string;
  onClose: () => void;
}

/**
 * Gerencia em quais listas um influenciador está (adicionar/remover/criar).
 * Compartilhado entre o catálogo de Criadores e o perfil do influenciador.
 */
export function ListMembershipModal({
  userId,
  influencerName,
  onClose,
}: ListMembershipModalProps) {
  const { data: lists = [], isLoading } = useInfluencerLists();
  const membershipMap = useInfluencerMembershipMap();
  const addMutation = useAddToInfluencerList();
  const removeMutation = useRemoveFromInfluencerList();
  const createMutation = useCreateInfluencerList();
  const [newListName, setNewListName] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);

  const currentLists = membershipMap.get(userId) ?? [];
  const currentListIds = new Set(currentLists.map((l) => l.id));
  const availableLists = lists.filter((l) => !currentListIds.has(l.id));

  const isPending =
    addMutation.isPending || removeMutation.isPending || createMutation.isPending;

  async function handleAdd(listId: string) {
    await addMutation.mutateAsync({ listId, userId });
  }

  async function handleRemove(listId: string) {
    await removeMutation.mutateAsync({ listId, userId });
  }

  async function handleCreate() {
    if (!newListName.trim()) return;
    const list = await createMutation.mutateAsync(newListName.trim());
    await addMutation.mutateAsync({ listId: list.id, userId });
    setNewListName("");
    setShowCreateForm(false);
  }

  return (
    <Modal onClose={onClose} title="Listas" panelClassName="max-w-md">
      <div className="flex flex-col gap-4">
        <p className="text-sm text-neutral-500">
          Gerenciar listas de{" "}
          <strong className="text-neutral-800">{influencerName}</strong>
        </p>

        {isLoading ? (
          <div className="flex items-center gap-2 py-4 text-sm text-neutral-400">
            <Icon name="Loader" size={16} color="#a3a3a3" className="animate-spin" />
            Carregando listas...
          </div>
        ) : (
          <>
            {/* Listas em que já está */}
            {currentLists.length > 0 && (
              <div className="flex flex-col gap-2">
                <p className="text-xs font-medium uppercase tracking-wide text-neutral-400">
                  Nas listas
                </p>
                {currentLists.map((list) => (
                  <div
                    key={list.id}
                    className="flex items-center justify-between rounded-2xl border border-primary-200 bg-primary-50 px-4 py-3"
                  >
                    <p className="font-medium text-neutral-900">{list.name}</p>
                    <button
                      type="button"
                      onClick={() => handleRemove(list.id)}
                      disabled={isPending}
                      className="flex size-7 items-center justify-center rounded-lg text-neutral-400 hover:bg-red-50 hover:text-red-500 transition-colors disabled:opacity-50"
                      title="Remover da lista"
                    >
                      <Icon name="X" size={14} color="currentColor" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Listas disponíveis para adicionar */}
            {availableLists.length > 0 && (
              <div className="flex flex-col gap-2">
                {currentLists.length > 0 && (
                  <p className="text-xs font-medium uppercase tracking-wide text-neutral-400">
                    Adicionar a
                  </p>
                )}
                {availableLists.map((list) => (
                  <button
                    key={list.id}
                    type="button"
                    onClick={() => handleAdd(list.id)}
                    disabled={isPending}
                    className="flex items-center justify-between w-full rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-left hover:border-primary-300 hover:bg-primary-50 transition-colors disabled:opacity-50"
                  >
                    <div>
                      <p className="font-medium text-neutral-900">{list.name}</p>
                      <p className="text-xs text-neutral-400">
                        {list.influencer_count}{" "}
                        {list.influencer_count === 1 ? "criador" : "criadores"}
                      </p>
                    </div>
                    <Icon name="Plus" size={18} color="#9E2CFA" />
                  </button>
                ))}
              </div>
            )}

            {/* Nenhuma lista ainda */}
            {lists.length === 0 && !showCreateForm && (
              <p className="text-sm text-neutral-400">
                Você ainda não tem nenhuma lista. Crie uma para continuar.
              </p>
            )}

            {/* Criar nova lista */}
            {!showCreateForm ? (
              <button
                type="button"
                onClick={() => setShowCreateForm(true)}
                className="flex items-center gap-2 w-full rounded-2xl border border-dashed border-neutral-300 px-4 py-3 text-sm text-neutral-500 hover:border-primary-400 hover:text-primary-600 transition-colors"
              >
                <Icon name="Plus" size={16} color="currentColor" />
                Criar nova lista
              </button>
            ) : (
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-neutral-700">
                    Nome da lista
                  </label>
                  <input
                    autoFocus
                    type="text"
                    placeholder="Ex: Top creators fashion"
                    value={newListName}
                    onChange={(e) => setNewListName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                    className="h-11 w-full rounded-2xl border border-neutral-200 px-4 text-sm outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="rounded-full flex-1"
                    onClick={() => {
                      setShowCreateForm(false);
                      setNewListName("");
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button
                    className="rounded-full flex-1 bg-primary-600 hover:bg-primary-700"
                    onClick={handleCreate}
                    disabled={isPending || !newListName.trim()}
                  >
                    {isPending ? "Criando..." : "Criar e adicionar"}
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </Modal>
  );
}
