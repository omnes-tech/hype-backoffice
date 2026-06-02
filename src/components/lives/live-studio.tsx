import { useEffect, useRef, useState } from "react";
import {
  Room,
  RoomEvent,
  Track,
  type LocalTrackPublication,
} from "livekit-client";

import { Icon } from "@/components/ui/icon";
import type { BroadcasterCredentials } from "@/shared/types";

interface LiveStudioProps {
  credentials: BroadcasterCredentials;
  /** Disparado quando a conexão cai por expiração de token (parent re-minta). */
  onTokenExpired?: () => void;
  onError?: (message: string) => void;
}

/**
 * Estúdio de transmissão do criador (LiveKit/WebRTC). A mídia é publicada
 * direto do navegador para o SFU — não passa pela API. O preview local mostra a
 * câmera do próprio criador (espelhada).
 */
export function LiveStudio({
  credentials,
  onTokenExpired,
  onError,
}: LiveStudioProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const roomRef = useRef<Room | null>(null);

  const [connecting, setConnecting] = useState(true);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [screenOn, setScreenOn] = useState(false);

  // Conexão e publicação. Re-executa se as credenciais mudarem (reconexão).
  useEffect(() => {
    let cancelled = false;
    const room = new Room({ adaptiveStream: true, dynacast: true });
    roomRef.current = room;

    const attachCamera = (pub: LocalTrackPublication) => {
      if (pub.source === Track.Source.Camera && pub.videoTrack && videoRef.current) {
        pub.videoTrack.attach(videoRef.current);
      }
    };

    room.on(RoomEvent.LocalTrackPublished, attachCamera);
    room.on(RoomEvent.Disconnected, (reason) => {
      // 10 = TOKEN_EXPIRED no enum DisconnectReason do LiveKit.
      if (reason === 10) onTokenExpired?.();
    });

    (async () => {
      try {
        setConnecting(true);
        await room.connect(credentials.url, credentials.token);
        if (cancelled) return;
        await room.localParticipant.setCameraEnabled(true);
        await room.localParticipant.setMicrophoneEnabled(true);
        if (cancelled) return;
        // Caso a câmera já estivesse publicada antes do listener registrar.
        const camPub = room.localParticipant.getTrackPublication(
          Track.Source.Camera,
        );
        if (camPub) attachCamera(camPub);
        setConnecting(false);
        setMicOn(true);
        setCamOn(true);
      } catch (err) {
        if (cancelled) return;
        setConnecting(false);
        onError?.(
          err instanceof Error
            ? `Falha ao conectar à transmissão: ${err.message}`
            : "Falha ao conectar à transmissão.",
        );
      }
    })();

    return () => {
      cancelled = true;
      room.off(RoomEvent.LocalTrackPublished, attachCamera);
      room.disconnect();
      roomRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [credentials.url, credentials.token]);

  const toggleMic = async () => {
    const room = roomRef.current;
    if (!room) return;
    const next = !micOn;
    await room.localParticipant.setMicrophoneEnabled(next);
    setMicOn(next);
  };

  const toggleCam = async () => {
    const room = roomRef.current;
    if (!room) return;
    const next = !camOn;
    await room.localParticipant.setCameraEnabled(next);
    setCamOn(next);
  };

  const toggleScreen = async () => {
    const room = roomRef.current;
    if (!room) return;
    const next = !screenOn;
    try {
      await room.localParticipant.setScreenShareEnabled(next);
      setScreenOn(next);
    } catch (err) {
      onError?.(
        err instanceof Error ? err.message : "Falha ao compartilhar a tela.",
      );
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-neutral-200 bg-neutral-950">
        {/* Preview espelhado da própria câmera. */}
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className="h-full w-full -scale-x-100 bg-black object-contain"
        />
        {connecting && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/60 text-white">
            <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-white" />
            <span className="text-sm">Conectando à transmissão...</span>
          </div>
        )}
        {!camOn && !connecting && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/60 text-white">
            <Icon name="VideoOff" size={28} color="#ffffff" />
            <span className="text-sm">Câmera desligada</span>
          </div>
        )}
        <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-red-600 px-2 py-1 text-xs font-semibold text-white">
          <span className="size-2 animate-pulse rounded-full bg-white" />
          AO VIVO
        </div>
      </div>

      {/* Controles do estúdio */}
      <div className="flex items-center justify-center gap-2">
        <StudioButton
          active={micOn}
          onClick={toggleMic}
          icon={micOn ? "Mic" : "MicOff"}
          label={micOn ? "Microfone" : "Mudo"}
        />
        <StudioButton
          active={camOn}
          onClick={toggleCam}
          icon={camOn ? "Video" : "VideoOff"}
          label={camOn ? "Câmera" : "Sem câmera"}
        />
        <StudioButton
          active={screenOn}
          onClick={toggleScreen}
          icon="MonitorUp"
          label={screenOn ? "Parar tela" : "Compartilhar tela"}
        />
      </div>
    </div>
  );
}

function StudioButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: "Mic" | "MicOff" | "Video" | "VideoOff" | "MonitorUp";
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className={`flex h-11 items-center gap-2 rounded-full border px-4 text-sm font-medium transition-colors ${
        active
          ? "border-primary-200 bg-primary-50 text-primary-700"
          : "border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50"
      }`}
    >
      <Icon name={icon} size={16} color={active ? "#9e2cfa" : "#525252"} />
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}
