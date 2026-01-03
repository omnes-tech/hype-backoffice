import { useState } from "react";
import { useInfluencerLists, useBulkAddInfluencers } from "@/hooks/use-influencer-lists";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Icon } from "@/components/ui/icon";
import { Badge } from "@/components/ui/badge";

interface ListSelectorProps {
  campaignId: string;
  trigger?: React.ReactNode;
  onClose?: () => void;
}

export function ListSelector({ campaignId, trigger, onClose }: ListSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { data: lists, isLoading } = useInfluencerLists();
  const { mutate: addInfluencers, isPending } = useBulkAddInfluencers(campaignId);

  const handleSelectList = (listId: string) => {
    addInfluencers(
      { list_id: listId },
      {
        onSuccess: () => {
          setIsOpen(false);
          onClose?.();
        },
      }
    );
  };

  const handleClose = () => {
    setIsOpen(false);
    onClose?.();
  };

  return (
    <>
      {trigger && (
        <div onClick={() => setIsOpen(true)} className="cursor-pointer">
          {trigger}
        </div>
      )}

      {isOpen && (
        <Modal title="Selecionar lista de influenciadores" onClose={handleClose}>
          <div className="flex flex-col gap-4">
            <p className="text-sm text-neutral-600">
              Escolha uma lista para adicionar todos os influenciadores à campanha
            </p>

            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {lists && lists.length > 0 ? (
                  lists.map((list) => (
                    <div
                      key={list.id}
                      className="flex items-center justify-between p-4 border border-neutral-200 rounded-xl hover:bg-neutral-50 transition-colors cursor-pointer"
                      onClick={() => handleSelectList(list.id)}
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
                      <Button
                        variant="default"
                        className="w-auto h-9 px-4 text-sm"
                        disabled={isPending}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectList(list.id);
                        }}
                      >
                        <div className="flex items-center gap-2">
                          <Icon name="Plus" color="#FAFAFA" size={16} />
                          <span>Adicionar</span>
                        </div>
                      </Button>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <Icon name="List" color="#A3A3A3" size={48} />
                    <p className="text-neutral-600 mt-4">
                      Nenhuma lista encontrada
                    </p>
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
        </Modal>
      )}
    </>
  );
}

