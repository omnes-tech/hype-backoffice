import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";

import { useAuth } from "@/contexts/auth-context";
import { updateCurrentUserProfile } from "@/shared/services/me";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/(private)/(app)/settings")({
  component: SettingsScreen,
});

const profileSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Informe seu nome")
    .max(120, "Nome muito longo"),
  email: z
    .string()
    .trim()
    .min(1, "E-mail é obrigatório")
    .email("E-mail inválido"),
});

type ProfileForm = z.infer<typeof profileSchema>;

function SettingsScreen() {
  const { user, setUser } = useAuth();
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user?.name ?? "",
      email: user?.email ?? "",
    },
  });

  useEffect(() => {
    if (user) {
      reset({
        name: user.name ?? "",
        email: user.email ?? "",
      });
    }
  }, [user, reset]);

  const { mutate, isPending } = useMutation({
    mutationFn: updateCurrentUserProfile,
    onSuccess: (updated) => {
      setUser(updated);
      void queryClient.invalidateQueries({ queryKey: ["get-current-user"] });
      reset({
        name: updated.name,
        email: updated.email,
      });
      toast.success("Perfil atualizado.");
    },
    onError: (err: unknown) => {
      const msg =
        err instanceof Error ? err.message : "Não foi possível salvar as alterações.";
      toast.error(msg);
    },
  });

  if (!user) {
    return null;
  }

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold text-neutral-950">Configurações</h1>
        <p className="mt-1 text-sm text-neutral-600">
          Atualize seus dados de perfil. Alterações sensíveis podem exigir validação no
          servidor.
        </p>
      </div>

      <form
        className="flex flex-col gap-5 rounded-xl border border-neutral-200 bg-white p-6 shadow-sm"
        onSubmit={handleSubmit((data) => mutate(data))}
      >
        <Input
          label="Nome"
          placeholder="Seu nome"
          error={errors.name?.message}
          {...register("name")}
        />

        <Input
          label="E-mail"
          type="email"
          placeholder="seu@email.com"
          error={errors.email?.message}
          {...register("email")}
        />

        <div className="rounded-lg bg-neutral-50 px-3 py-2 text-xs text-neutral-600">
          Telefone cadastrado:{" "}
          <span className="font-medium text-neutral-800">
            {user.phone?.trim() ? user.phone : "não informado"}
          </span>
          {user.phone ? null : (
            <span className="block mt-1">
              Complete o cadastro em{" "}
              <span className="font-medium">Onboarding</span> para adicionar telefone.
            </span>
          )}
        </div>

        <Button type="submit" disabled={isPending || !isDirty} className="w-full sm:w-auto">
          {isPending ? "Salvando…" : "Salvar alterações"}
        </Button>
      </form>
    </div>
  );
}
