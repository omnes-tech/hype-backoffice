/** Rótulos para exibição (alinhado ao fluxo de criação de campanha). */
export const SOCIAL_NETWORK_LABELS: Record<string, string> = {
  instagram: "Instagram",
  tiktok: "TikTok",
  youtube: "YouTube",
  ugc: "UGC",
  facebook: "Facebook",
  linkedin: "LinkedIn",
  twitter: "X / Twitter",
};

const CONTENT_TYPE_LABELS: Record<string, Record<string, string>> = {
  instagram: {
    post: "Post",
    reels: "Reels",
    stories: "Stories",
  },
  tiktok: {
    video: "Vídeos",
    live: "LIVE",
  },
  youtube: {
    video_dedicated: "Vídeo dedicado até 10 minutos",
    insertion: "Inserção até 60 segundos",
    preroll_endroll: "Pré-roll ou End-roll até 15 segundos",
    shorts: "Shorts",
    live: "LIVE",
  },
  ugc: {
    image: "Imagem",
    video_1min: "Vídeo até 1 minuto",
    video_10min: "Vídeo até 10 minutos",
    video_1hour: "Vídeo até 1 hora",
  },
};

export function formatContentTypeLabel(network: string, contentType: string): string {
  const n = network.toLowerCase();
  const t = contentType.toLowerCase();
  return CONTENT_TYPE_LABELS[n]?.[t] ?? contentType;
}

/**
 * Valida se a URL parece ser um perfil/conteúdo da rede indicada.
 * Para `ugc`, aceita qualquer http(s) com host não vazio.
 */
export function isValidProfileUrlForNetwork(url: string, network: string): boolean {
  const t = url.trim();
  if (!t) return false;
  let parsed: URL;
  try {
    parsed = new URL(t.startsWith("http://") || t.startsWith("https://") ? t : `https://${t}`);
  } catch {
    return false;
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return false;
  const host = parsed.hostname.toLowerCase();
  if (!host) return false;
  const n = network.toLowerCase();
  switch (n) {
    case "instagram":
      return (
        host === "instagram.com" ||
        host.endsWith(".instagram.com") ||
        host === "instagr.am" ||
        host.endsWith(".instagr.am")
      );
    case "tiktok":
      return host.includes("tiktok.com");
    case "youtube":
      return host.includes("youtube.com") || host.includes("youtu.be");
    case "facebook":
      return host.includes("facebook.com") || host.includes("fb.com") || host.includes("fb.watch");
    case "twitter":
      return host.includes("twitter.com") || host.includes("x.com");
    case "linkedin":
      return host.includes("linkedin.com");
    case "ugc":
      return true;
    default:
      return true;
  }
}
