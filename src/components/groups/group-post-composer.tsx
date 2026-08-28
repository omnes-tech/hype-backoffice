/**
 * Composer de publicação no grupo — permite enviar mensagens/posts para o grupo
 * direto pelo Backoffice, sem abrir o app.
 *
 * Imagem é opcional e usa upload deferido: o arquivo só sobe no submit, e a
 * `url` retornada vai em `image_url` do post (mesmo fluxo da capa do grupo).
 */
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { useCreateGroupPost, useUploadGroupCover } from "@/hooks/use-groups";
import { validateGroupCoverFile } from "@/shared/services/groups";

const MAX_CONTENT = 2000;

export function GroupPostComposer({ groupId }: { groupId: string }) {
  const [content, setContent] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const createPost = useCreateGroupPost(groupId);
  const uploadImage = useUploadGroupCover();
  const isSubmitting = createPost.isPending || uploadImage.isPending;

  // objectURL precisa ser revogado para não vazar memória entre trocas de anexo.
  useEffect(() => {
    if (!image) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(image);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [image]);

  const handleFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const error = validateGroupCoverFile(file);
    if (error) {
      toast.error(error);
      return;
    }
    setImage(file);
  };

  const submit = async () => {
    const trimmed = content.trim();
    if (!trimmed || isSubmitting) return;

    try {
      let imageUrl: string | null = null;
      if (image) {
        const uploaded = await uploadImage.mutateAsync(image);
        imageUrl = uploaded.url;
      }
      await createPost.mutateAsync({ content: trimmed, image_url: imageUrl });
      setContent("");
      setImage(null);
      toast.success("Conteúdo publicado no grupo.");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Não foi possível publicar.",
      );
    }
  };

  return (
    <form
      className="flex flex-col gap-3 rounded-2xl border border-neutral-200 bg-white p-4"
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      <h3 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
        Publicar no grupo
      </h3>

      <textarea
        rows={3}
        maxLength={MAX_CONTENT}
        value={content}
        onChange={(event) => setContent(event.target.value)}
        onKeyDown={(event) => {
          // Enter quebra linha; Ctrl/Cmd + Enter publica.
          if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
            event.preventDefault();
            void submit();
          }
        }}
        placeholder="Escreva o aviso, mensagem ou link que os membros vão ver no grupo"
        className="resize-y rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-neutral-950 outline-none transition-colors placeholder:text-neutral-400 focus:border-primary-500 focus:bg-white focus:ring-2 focus:ring-primary-500/20"
      />

      {preview && (
        <div className="relative w-fit">
          <img
            src={preview}
            alt="Prévia da imagem do conteúdo"
            className="max-h-48 rounded-xl object-cover"
          />
          <button
            type="button"
            onClick={() => setImage(null)}
            disabled={isSubmitting}
            aria-label="Remover imagem"
            className="absolute right-2 top-2 rounded-full bg-white/90 p-1.5 shadow-sm transition-colors hover:bg-white disabled:opacity-50"
          >
            <Icon name="X" size={14} color="#404040" />
          </button>
        </div>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleFile}
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            disabled={isSubmitting}
            onClick={() => fileRef.current?.click()}
            className="h-9 rounded-full px-4"
          >
            <Icon name="ImagePlus" size={16} color="#525252" />
            {image ? "Trocar imagem" : "Adicionar imagem"}
          </Button>
          <span className="text-xs text-neutral-400">
            Ctrl/Cmd + Enter para publicar
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-neutral-400">
            {content.length}/{MAX_CONTENT}
          </span>
          <Button
            type="submit"
            disabled={isSubmitting || content.trim().length === 0}
            className="h-9 rounded-full px-5"
          >
            {uploadImage.isPending
              ? "Enviando imagem..."
              : createPost.isPending
                ? "Publicando..."
                : "Publicar"}
          </Button>
        </div>
      </div>
    </form>
  );
}
