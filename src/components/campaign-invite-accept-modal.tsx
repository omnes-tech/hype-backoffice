import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import {
  postPublicCampaignInvitePreRegister,
  type PublicCampaignInviteData,
} from "@/shared/services/public-campaign-invite";
import {
  isValidProfileUrlForNetwork,
  SOCIAL_NETWORK_LABELS,
} from "@/shared/utils/social-profile-url";
import { buildInfluencerPreselectionCurationUrl } from "@/shared/utils/influencer-invite-redirect";

const HYPEAPP_PLAY_STORE_URL =
  "https://play.google.com/store/apps/details?id=br.com.hypeapp.v2";

const HYPEAPP_ANDROID_OPEN_INTENT = `intent://#Intent;package=br.com.hypeapp.v2;action=android.intent.action.MAIN;category=android.intent.category.LAUNCHER;S.browser_fallback_url=${encodeURIComponent(HYPEAPP_PLAY_STORE_URL)};end`;

function hrefOpenHypeappApp(): string {
  if (typeof navigator === "undefined") return HYPEAPP_PLAY_STORE_URL;
  return /Android/i.test(navigator.userAgent) ? HYPEAPP_ANDROID_OPEN_INTENT : HYPEAPP_PLAY_STORE_URL;
}

function createAcceptSchema(networks: string[]) {
  const phoneSchema = z
    .string()
    .min(1, "Celular é obrigatório")
    .refine((v) => v.replace(/\D/g, "").length >= 10, "Informe o celular com DDD");

  return z
    .object({
      name: z.string().min(2, "Informe seu nome"),
      email: z.string().min(1, "E-mail é obrigatório").email("E-mail inválido"),
      phone: phoneSchema,
      profile: z.record(z.string(), z.string()),
    })
    .superRefine((data, ctx) => {
      for (const net of networks) {
        const v = String(data.profile[net] ?? "").trim();
        const label = SOCIAL_NETWORK_LABELS[net] ?? net;
        if (!v) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Informe o link do seu perfil no ${label}`,
            path: ["profile", net],
          });
        } else if (!isValidProfileUrlForNetwork(v, net)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `O link não parece ser um perfil válido de ${label}`,
            path: ["profile", net],
          });
        }
      }
    });
}

type AcceptFormValues = z.infer<ReturnType<typeof createAcceptSchema>>;

interface CampaignInviteAcceptModalProps {
  isOpen: boolean;
  onClose: () => void;
  campaignPublicId: string;
  campaignTitle: string;
  inviteData: PublicCampaignInviteData;
}

export function CampaignInviteAcceptModal({
  isOpen,
  onClose,
  campaignPublicId,
  campaignTitle,
  inviteData,
}: CampaignInviteAcceptModalProps) {
  const [preRegisterSuccess, setPreRegisterSuccess] = useState(false);

  const allowedNetworks = useMemo(
    () => inviteData.allowed_social_networks ?? [],
    [inviteData.allowed_social_networks],
  );

  const schema = useMemo(() => createAcceptSchema(allowedNetworks), [allowedNetworks]);

  const defaultProfile = useMemo(
    () => Object.fromEntries(allowedNetworks.map((n) => [n, ""])),
    [allowedNetworks],
  );

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AcceptFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      profile: defaultProfile,
    },
  });

  useEffect(() => {
    if (isOpen) {
      reset({
        name: "",
        email: "",
        phone: "",
        profile: { ...defaultProfile },
      });
      setPreRegisterSuccess(false);
    }
  }, [isOpen, reset, defaultProfile]);

  const preRegisterMutation = useMutation({
    mutationFn: (data: AcceptFormValues) => {
      const social_profiles =
        allowedNetworks.length > 0
          ? allowedNetworks.map((net) => ({
            network: net,
            profile_url: String(data.profile[net] ?? "").trim(),
          }))
          : undefined;
      return postPublicCampaignInvitePreRegister(campaignPublicId, {
        name: data.name,
        email: data.email,
        phone: data.phone,
        social_profiles,
      });
    },
    onSuccess: () => {
      setPreRegisterSuccess(true);
      toast.success("Pré-cadastro concluído! Você já está na curadoria da pré-seleção.");
    },
    onError: (err: Error) => {
      toast.error(err.message || "Erro ao enviar pré-cadastro.");
    },
  });

  const goPreselectionCuration = () => {
    window.location.assign(buildInfluencerPreselectionCurationUrl(campaignPublicId));
  };

  const profileErrors = errors.profile as Record<string, { message?: string }> | undefined;

  if (!isOpen) return null;

  return (
    <Modal
      title={preRegisterSuccess ? "Continue no app" : "Pré-cadastro no convite"}
      onClose={onClose}
      panelClassName="max-w-lg"
    >
      {!preRegisterSuccess ? (
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
            className="inline-flex items-center justify-center min-h-11 px-6 rounded-2xl font-medium text-sm bg-primary-600 hover:bg-primary-700 text-white transition-colors w-full min-w-full text-center"
          >
            Abrir no app Hypeapp
          </a>
          <Button type="button" variant="outline" className="w-full min-w-full" onClick={onClose}>
            Fechar
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          <p className="text-sm text-neutral-600 leading-relaxed">
            Preencha os dados e os links dos seus perfis nas redes desta campanha.
            Os links são validados por rede.
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

            {allowedNetworks.length > 0 ? (
              <div className="flex flex-col gap-3 pt-1 border-t border-neutral-100">
                <p className="text-sm font-medium text-neutral-950">Links dos perfis</p>
                <p className="text-xs text-neutral-500 -mt-2">
                  Cole a URL completa do seu perfil em cada rede participante da campanha.
                </p>
                {allowedNetworks.map((net) => (
                  <Input
                    key={net}
                    label={`${SOCIAL_NETWORK_LABELS[net] ?? net}`}
                    type="url"
                    inputMode="url"
                    placeholder="https://..."
                    error={profileErrors?.[net]?.message}
                    {...register(`profile.${net}`)}
                  />
                ))}
              </div>
            ) : null}

            <Button
              type="submit"
              className="w-full min-w-full mt-1"
              disabled={preRegisterMutation.isPending}
            >
              {preRegisterMutation.isPending ? "Enviando…" : "Confirmar e aceitar convite"}
            </Button>
          </form>
          <div className="border-t border-neutral-100 pt-4 flex flex-col gap-3">
            <p className="text-xs text-neutral-500 text-center">
              Já tem conta no Hypeapp como influenciador ou prefere instalar antes?{" "}
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
