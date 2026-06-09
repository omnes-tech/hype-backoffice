import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";

import { Icon } from "@/components/ui/icon";
import { GroupForm, type GroupFormSubmit } from "@/components/groups/group-form";
import { useCreateGroup, useUploadGroupCover } from "@/hooks/use-groups";

export const Route = createFileRoute(
  "/(private)/(admin)/admin/groups/new" as "/(private)/(admin)/admin/groups/new",
)({
  component: NewGroup,
});

function NewGroup() {
  const navigate = useNavigate();
  const createMutation = useCreateGroup();
  const uploadCover = useUploadGroupCover();

  const handleSubmit = async (values: GroupFormSubmit, coverFile: File | null) => {
    try {
      // Upload deferido: sobe a capa (se houver) ANTES de criar o grupo.
      let coverUrl: string | null = null;
      if (coverFile) {
        try {
          const uploaded = await uploadCover.mutateAsync(coverFile);
          coverUrl = uploaded.url;
        } catch {
          toast.warning("Não foi possível enviar a capa; criando sem ela.");
        }
      }

      const group = await createMutation.mutateAsync({
        name: values.name,
        description: values.description,
        cover_url: coverUrl,
        is_official: values.is_official,
        rules: values.rules,
        required_level: values.required_level,
        required_hype_points: values.required_hype_points,
      });

      toast.success("Grupo criado com sucesso.");
      navigate({ to: "/admin/groups/$groupId", params: { groupId: group.id } });
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Não foi possível criar o grupo.",
      );
    }
  };

  const isSubmitting = createMutation.isPending || uploadCover.isPending;

  return (
    <div className="flex flex-col gap-6 px-6 py-6 pb-12">
      <div className="flex flex-col gap-2">
        <Link
          to="/admin/groups"
          className="flex w-fit items-center gap-1 text-sm text-neutral-500 transition-colors hover:text-neutral-800"
        >
          <Icon name="ChevronLeft" size={16} color="#737373" />
          Voltar para Grupos
        </Link>
        <h1 className="text-2xl font-semibold text-neutral-950">Novo grupo</h1>
        <p className="text-sm text-neutral-600">
          Defina nome, capa, descrição e os requisitos de entrada.
        </p>
      </div>

      <GroupForm
        submitLabel="Criar grupo"
        submittingLabel="Criando..."
        isSubmitting={isSubmitting}
        onSubmit={handleSubmit}
        onCancel={() => navigate({ to: "/admin/groups" })}
      />
    </div>
  );
}
