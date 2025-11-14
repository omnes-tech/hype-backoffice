import { useState } from "react";

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { createWorkspace } from "@/shared/services/workspace";
import { saveWorkspaceId } from "@/lib/utils/api";
import type { Workspace } from "@/shared/types";

import { ImageUpload } from "@/components/image-upload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export const Route = createFileRoute("/(private)/onboarding/create-workspace")({
  component: RouteComponent,
});

const createWorkspaceSchema = z.object({
  name: z
    .string()
    .nonempty("Nome da marca é obrigatório")
    .min(3, "Nome da marca deve ter no mínimo 3 caracteres")
    .max(20, "Nome da marca deve ter no máximo 20 caracteres"),
  photo: z
    .instanceof(FileList)
    .optional()
    .refine(
      (files) => !files || files.length === 0 || files[0]?.size <= 10240 * 1024,
      "A foto da sua marca deve ter no máximo 10MB"
    )
    .refine(
      (files) =>
        !files ||
        files.length === 0 ||
        ["image/jpeg", "image/jpg", "image/png"].includes(files[0]?.type || ""),
      "Apenas fotos JPG e PNG são permitidas"
    ),
});

type CreateWorkspaceData = z.infer<typeof createWorkspaceSchema>;

function RouteComponent() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [preview, setPreview] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm<CreateWorkspaceData>({
    resolver: zodResolver(createWorkspaceSchema),
    defaultValues: {
      name: "",
    },
  });

  const { mutate: createWorkspaceMutation, isPending: isCreatingWorkspace } =
    useMutation({
      mutationFn: async (data: CreateWorkspaceData) => {
        const formData = new FormData();
        formData.append("name", data.name);

        if (data.photo && data.photo.length > 0) {
          formData.append("photo", data.photo[0]);
        }

        return createWorkspace(formData);
      },
      onSuccess: (workspace: Workspace) => {
        queryClient.invalidateQueries({ queryKey: ["get-workspaces"] });
        saveWorkspaceId(workspace.id.toString());
        toast.success(`Sua marca ${workspace.name} foi criada com sucesso.`);
        navigate({ to: "/onboarding/welcome" });
      },
      onError: (error) => {
        toast.error(error.message);
      },
    });
  return (
    <form
      className="max-w-md w-full flex flex-col gap-6"
      onSubmit={handleSubmit((data) => createWorkspaceMutation(data))}
    >
      <div className="flex flex-col items-center gap-2">
        <h1 className="text-2xl font-medium text-neutral-950">Criar marca</h1>

        <p className="text-neutral-600 text-center">
          Defina o nome e a foto da sua marca para continuar.
        </p>
      </div>

      <div className="flex flex-col gap-4 mt-10">
        <ImageUpload
          register={register("photo")}
          preview={preview}
          setPreview={setPreview}
          onRemove={() => setValue("photo", new FileList())}
          disabled={isCreatingWorkspace}
          error={errors.photo?.message}
        />

        <Input
          type="text"
          label="Nome da marca"
          placeholder="Digite o nome da sua marca"
          disabled={isCreatingWorkspace}
          error={errors.name?.message}
          {...register("name")}
        />
      </div>

      <Button type="submit" disabled={isCreatingWorkspace}>
        <p className="text-neutral-50 font-semibold">
          {isCreatingWorkspace ? "Criando sua marca..." : "Criar"}
        </p>
      </Button>
    </form>
  );
}
