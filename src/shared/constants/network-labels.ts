/** Mapeamento canônico de tipo de rede social para rótulo exibível. */
export const NETWORK_LABELS: Record<string, string> = {
  instagram: "Instagram",
  instagram_facebook: "Instagram / Facebook",
  tiktok: "TikTok",
  youtube: "YouTube",
  ugc: "UGC",
  facebook: "Facebook",
  twitter: "Twitter",
};

export function getNetworkLabel(type: string | undefined | null, fallback?: string): string {
  if (!type) return fallback ?? "";
  return NETWORK_LABELS[type.toLowerCase()] ?? fallback ?? type;
}

/**
 * Constrói a URL de perfil público na rede social a partir do tipo e do handle.
 * Retorna `undefined` se o tipo ou handle forem vazios / não reconhecidos.
 */
export function getSocialNetworkProfileUrl(
  networkType: string | undefined | null,
  username: string | undefined | null,
): string | undefined {
  if (!networkType || !username) return undefined;
  const handle = username.replace(/^@/, "").trim();
  if (!handle) return undefined;
  const type = networkType.toLowerCase();
  if (type.includes("instagram")) return `https://instagram.com/${handle}`;
  if (type.includes("tiktok")) return `https://tiktok.com/@${handle}`;
  if (type.includes("youtube")) return `https://youtube.com/@${handle}`;
  if (type.includes("twitter") || type === "x") return `https://twitter.com/${handle}`;
  if (type.includes("facebook")) return `https://facebook.com/${handle}`;
  return undefined;
}
