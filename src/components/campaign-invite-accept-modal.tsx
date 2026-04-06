import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { postPublicCampaignInvitePreRegister } from "@/shared/services/public-campaign-invite";

const HYPEAPP_PLAY_STORE_URL =
  "https://play.google.com/store/apps/details?id=br.com.hypeapp.v2";

const HYPEAPP_ANDROID_OPEN_INTENT = `intent://#Intent;package=br.com.hypeapp.v2;action=android.intent.action.MAIN;category=android.intent.category.LAUNCHER;S.browser_fallback_url=${encodeURIComponent(HYPEAPP_PLAY_STORE_URL)};end`;

function hrefOpenHypeappApp(): string {
  if (typeof navigator === "undefined") return HYPEAPP_PLAY_STORE_URL;
  return /Android/i.test(navigator.userAgent) ? HYPEAPP_ANDROID_OPEN_INTENT : HYPEAPP_PLAY_STORE_URL;
}

const preRegisterSchema = z.object({
  name: z.string().min(2, "Informe seu nome"),
  email: z.string().min(1, "E-mail é obrigatório").email("E-mail inválido"),
  phone: z
    .string()
    .min(1, "Celular é obrigatório")
    .refine((v) => v.replace(/\D/g, "").length >= 10, "Informe o celular com DDD"),
});

type PreRegisterForm = z.infer<typeof preRegisterSchema>;

interface CampaignInviteAcceptModalProps {
  isOpen: boolean;
  onClose: () => void;
  campaignPublicId: string;
  campaignTitle: string;
}

export function CampaignInviteAcceptModal({
  isOpen,
  onClose,
  campaignPublicId,
  campaignTitle,
}: CampaignInviteAcceptModalProps) {
  const [preRegisterSuccess, setPreRegisterSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PreRegisterForm>({
    resolver: zodResolver(preRegisterSchema),
    defaultValues: { name: "", email: "", phone: "" },
  });

  useEffect(() => {
    if (isOpen) {
      reset();
      setPreRegisterSuccess(false);
    }
  }, [isOpen, reset]);

  const preRegisterMutation = useMutation({
    mutationFn: (data: PreRegisterForm) =>
      postPublicCampaignInvitePreRegister(campaignPublicId, {
        name: data.name,
        email: data.email,
        phone: data.phone,
      }),
    onSuccess: () => {
      setPreRegisterSuccess(true);
      toast.success("Pré-cadastro concluído! Você já está na curadoria da pré-seleção.");
    },
    onError: (err: Error) => {
      toast.error(err.message || "Erro ao enviar pré-cadastro.");
    },
  });

  if (!isOpen) return null;

  return (
    <Modal
      title={
        preRegisterSuccess
          ? "Continue no app"
          : "Pré-cadastro no convite"
      }
      onClose={onClose}
      panelClassName="max-w-lg"
    >
      {preRegisterSuccess ? (
        <div className="flex flex-col gap-5">
          <p className="text-sm text-neutral-600 leading-relaxed">
            Seus dados foram registrados e você foi vinculado à campanha{" "}
            <span className="font-medium text-neutral-950">{campaignTitle}</span> na fase de{" "}
            <strong>curadoria da pré-seleção</strong>. Baixe ou abra o app Hypeapp para acompanhar
            e concluir as próximas etapas.
          </p>
          <a
            href={hrefOpenHypeappApp()}
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center min-h-11 px-6 rounded-2xl font-medium text-sm bg-primary-600 hover:bg-primary-700 text-white transition-colors w-full text-center"
          >
            Abrir no app Hypeapp
          </a>
          <Button type="button" variant="outline" className="w-full" onClick={onClose}>
            Fechar
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          <p className="text-sm text-neutral-600 leading-relaxed">
            Preencha os dados abaixo para aceitar o convite e entrar na campanha já na{" "}
            <strong>curadoria da pré-seleção</strong>.
          </p>
          <form
            className="flex flex-col gap-4"
            onSubmit={handleSubmit((data) => preRegisterMutation.mutate(data))}
          >
            <Input
              label="Nome completo"
              autoComplete="name"
              error={errors.name?.message}
              {...register("name")}
            />
            <Input
              label="E-mail"
              type="email"
              autoComplete="email"
              error={errors.email?.message}
              {...register("email")}
            />
            <Input
              label="Celular (com DDD)"
              type="tel"
              autoComplete="tel"
              placeholder="(11) 99999-9999"
              error={errors.phone?.message}
              {...register("phone")}
            />
            <Button
              type="submit"
              className="w-full min-w-full mt-1"
              disabled={preRegisterMutation.isPending}
            >
              {preRegisterMutation.isPending ? "Enviando…" : "Confirmar e aceitar convite"}
            </Button>
          </form>
          <div className="border-t border-neutral-100 pt-4 flex flex-col gap-3">
            <p className="text-xs text-neutral-500">
              Já tem conta no Hypeapp como influenciador?
            </p>
            <p className="text-xs text-neutral-500 text-center">
              Prefere instalar antes?{" "}
              <a
                href={hrefOpenHypeappApp()}
                rel="noopener noreferrer"
                className="text-primary-700 font-medium hover:underline"
              >
                Baixar o app Hypeapp
              </a>
            </p>
          </div>
        </div>
      )}
    </Modal>
  );
}
