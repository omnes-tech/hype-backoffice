import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { forgotPassword } from "@/shared/services/auth";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/(public)/forgot-password")({
  component: RouteComponent,
});

const forgotPasswordSchema = z.object({
  email: z
    .string()
    .nonempty("Email é obrigatório")
    .regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Email inválido"),
});

type ForgotPasswordSchemaData = z.infer<typeof forgotPasswordSchema>;

function RouteComponent() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordSchemaData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  const {
    mutate: forgotPasswordMutation,
    isPending: isSendingForgotPasswordEmail,
  } = useMutation({
    mutationFn: forgotPassword,
    onSuccess: () => {
      toast.success("Email de recuperação enviado com sucesso");
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao enviar email de recuperação");
    },
  });

  return (
    <form
      className="max-w-md w-full flex flex-col gap-6"
      onSubmit={handleSubmit((data) => forgotPasswordMutation(data))}
    >
      <div className="flex flex-col items-center gap-2">
        <h1 className="text-2xl font-medium text-neutral-950">
          Recuperar senha
        </h1>

        <p className="text-neutral-600 text-center">
          Digite seu email abaixo e enviaremos um link para redefinir sua senha
        </p>
      </div>

      <div className="flex flex-col gap-4 mt-10">
        <Input
          label="E-mail"
          error={errors.email?.message}
          placeholder="Digite seu e-mail"
          {...register("email")}
        />
      </div>

      <div className="flex flex-col gap-4">
        <Button type="submit" disabled={isSendingForgotPasswordEmail}>
          <p className="text-neutral-50 font-semibold">
            {isSendingForgotPasswordEmail
              ? "Enviando link..."
              : "Enviar link para recuperar senha"}
          </p>
        </Button>

        <Link to="/sign-in" className="text-center">
          <span className="text-neutral-700 font-semibold">
            Lembrou da sua senha?{" "}
            <span className="text-primary-600 font-medium">Entrar</span>
          </span>
        </Link>
      </div>
    </form>
  );
}
