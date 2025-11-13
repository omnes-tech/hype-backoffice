import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { signIn } from "@/shared/services/auth";
import { saveAuthToken } from "@/lib/utils/api";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { InputPassword } from "@/components/ui/input-password";
import { toast } from "sonner";

export const Route = createFileRoute("/(public)/sign-in")({
  component: RouteComponent,
});

const signInSchema = z.object({
  email: z
    .string()
    .nonempty("E-mail é obrigatório")
    .regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "E-mail inválido"),
  password: z
    .string()
    .nonempty("Senha é obrigatória")
    .min(6, "Senha deve ter no mínimo 6 caracteres"),
});

type SignInSchemaData = z.infer<typeof signInSchema>;

function RouteComponent() {
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignInSchemaData>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const { mutate: signInMutation, isPending: isSigningIn } = useMutation({
    mutationFn: signIn,
    onSuccess: async ({ token }) => {
      saveAuthToken(token);
      navigate({ to: "/" });
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao entrar na conta");
    },
  });

  return (
    <form
      className="max-w-md w-full flex flex-col gap-6"
      onSubmit={handleSubmit((data) => signInMutation(data))}
    >
      <div className="flex flex-col items-center gap-2">
        <h1 className="text-2xl font-medium text-neutral-950">
          Entrar na sua conta
        </h1>

        <p className="text-neutral-600">
          Digite seu email abaixo para entrar na sua conta
        </p>
      </div>

      <div className="flex flex-col gap-4 mt-10">
        <Input
          label="E-mail"
          error={errors.email?.message}
          placeholder="Digite seu e-mail"
          {...register("email")}
        />

        <InputPassword
          label="Senha"
          placeholder="Digite sua senha"
          error={errors.password?.message}
          {...register("password")}
        />
      </div>

      <div className="flex flex-col gap-4">
        <Button type="submit" disabled={isSigningIn}>
          <p className="text-neutral-50 font-semibold">
            {isSigningIn ? "Entrando..." : "Entrar"}
          </p>
        </Button>

        <Button type="button" variant="outline">
          <Link
            to="/forgot-password"
            className="text-neutral-700 font-semibold"
          >
            Recuperar senha
          </Link>
        </Button>

        <Link to="/sign-up" className="text-center">
          <span className="text-neutral-700 font-semibold">
            Não tem uma conta?{" "}
            <span className="text-primary-600 font-medium">Cadastre-se</span>
          </span>
        </Link>
      </div>
    </form>
  );
}
