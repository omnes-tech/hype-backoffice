/**
 * Camada de API dos Grupos da Comunidade — escopo **global (super-admin)**.
 *
 * Particularidades (espelha `admin-dashboard.ts`):
 * - **NÃO** envia header `Workspace-Id` — as rotas operam em escopo global.
 * - Backend protege com `PlatformAdminGuard` (`users.platform_role = 'admin'`).
 * - Base `/admin/community/groups` (resolve para
 *   `/api/backoffice/admin/community/groups` via `VITE_SERVER_URL`).
 * - Listagens preservam `meta` (cursor) — diferente do `apiGet` genérico, que o
 *   descartaria. Usar com `useInfiniteQuery`.
 *
 * Contrato: backend-community-groups-spec.md (§4).
 */
import { getApiUrl, getAuthToken } from "@/lib/utils/api";
import type {
  CommunityGroup,
  CommunityGroupDetail,
  CommunityGroupModerator,
  CommunityGroupPage,
  CreateGroupPayload,
  GroupPost,
  GroupPostPage,
  GroupStatusFilter,
  UpdateGroupPayload,
} from "@/shared/types";

const BASE = "/admin/community/groups";

// ---------------------------------------------------------------------------
// Validação de capa (client-side) — limite 5MB, jpeg/png/webp.
// Mesma whitelist do upload de thumbnail das Lives (§2.1 da spec).
// ---------------------------------------------------------------------------

export const GROUP_COVER_LIMITS = {
  maxBytes: 5 * 1024 * 1024,
  acceptedMimes: ["image/jpeg", "image/jpg", "image/png", "image/webp"] as const,
} as const;

/** Retorna mensagem de erro (PT-BR) ou `null` se o arquivo for válido. */
export function validateGroupCoverFile(file: File): string | null {
  if (file.size > GROUP_COVER_LIMITS.maxBytes) {
    return `A imagem "${file.name}" excede o limite de 5 MB.`;
  }
  if (
    !(GROUP_COVER_LIMITS.acceptedMimes as readonly string[]).includes(file.type)
  ) {
    return `Formato inválido (${file.type || "desconhecido"}). Use JPEG, PNG ou WebP.`;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Helpers internos — auth global (sem Workspace-Id) + parsing de erro.
// ---------------------------------------------------------------------------

function authHeaders(extra?: Record<string, string>): Record<string, string> {
  return {
    Accept: "application/json",
    "Client-Type": "backoffice",
    Authorization: `Bearer ${getAuthToken() ?? ""}`,
    // NÃO incluir "Workspace-Id" — escopo global (PlatformAdminGuard).
    ...extra,
  };
}

async function failWith(res: Response, fallback: string): Promise<never> {
  let message = fallback;
  try {
    const body = await res.json();
    if (typeof body?.message === "string") message = body.message;
  } catch {
    /* corpo não-JSON — mantém fallback */
  }
  throw Object.assign(new Error(message), { status: res.status });
}

/** Escrita com corpo JSON (POST/PATCH/DELETE). Lida com 204 (sem corpo). */
async function writeJson<T>(
  method: "POST" | "PATCH" | "DELETE",
  path: string,
  body?: unknown,
): Promise<T> {
  const res = await fetch(getApiUrl(path), {
    method,
    headers: authHeaders(
      body !== undefined ? { "Content-Type": "application/json" } : undefined,
    ),
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) return failWith(res, `Falha na requisição (${res.status})`);
  if (res.status === 204) return undefined as T;
  const json = await res.json();
  return (json?.data !== undefined ? json.data : json) as T;
}

// ---------------------------------------------------------------------------
// Listagem (cursor) — preserva `meta`.
// ---------------------------------------------------------------------------

export interface ListGroupsParams {
  search?: string;
  /** Default do backend é `active`; só enviamos quando difere. */
  status?: GroupStatusFilter;
  cursor?: string | null;
  limit?: number;
}

export async function listGroups(
  params: ListGroupsParams = {},
): Promise<CommunityGroupPage> {
  const qs = new URLSearchParams();
  if (params.search) qs.set("search", params.search);
  if (params.status && params.status !== "active") qs.set("status", params.status);
  if (params.limit) qs.set("limit", String(params.limit));
  if (params.cursor) qs.set("cursor", params.cursor);
  const suffix = qs.toString() ? `?${qs.toString()}` : "";

  const res = await fetch(getApiUrl(`${BASE}${suffix}`), {
    headers: authHeaders(),
  });
  if (!res.ok) return failWith(res, `Falha ao listar grupos (${res.status})`);

  const json = await res.json();
  return {
    items: (json.data ?? []) as CommunityGroup[],
    meta: json.meta ?? { next_cursor: null, has_more: false },
  };
}

// ---------------------------------------------------------------------------
// Detalhe / CRUD
// ---------------------------------------------------------------------------

export async function getGroup(id: string): Promise<CommunityGroupDetail> {
  const res = await fetch(getApiUrl(`${BASE}/${id}`), {
    headers: authHeaders(),
  });
  if (!res.ok) return failWith(res, `Falha ao carregar grupo (${res.status})`);
  const json = await res.json();
  return (json.data ?? json) as CommunityGroupDetail;
}

export function createGroup(
  payload: CreateGroupPayload,
): Promise<CommunityGroupDetail> {
  return writeJson<CommunityGroupDetail>("POST", BASE, payload);
}

export function updateGroup(
  id: string,
  payload: UpdateGroupPayload,
): Promise<CommunityGroupDetail> {
  return writeJson<CommunityGroupDetail>("PATCH", `${BASE}/${id}`, payload);
}

/** Soft-delete (`deleted_at`). 204 No Content. */
export function deleteGroup(id: string): Promise<void> {
  return writeJson<void>("DELETE", `${BASE}/${id}`);
}

// ---------------------------------------------------------------------------
// Upload de imagem (multipart, campo `image`) — mesma rota (§4.8) serve capa de
// grupo e imagem de post. Fluxo: subir → usar a `url` retornada em `cover_url`
// (grupo) ou `image_url` (post). Upload deferido até o submit.
// ---------------------------------------------------------------------------

export async function uploadCommunityImage(file: File): Promise<{ url: string }> {
  const formData = new FormData();
  formData.append("image", file);

  const res = await fetch(getApiUrl(`${BASE}/uploads`), {
    method: "POST",
    // Sem Content-Type — o browser injeta o boundary do multipart.
    headers: authHeaders(),
    body: formData,
  });
  if (!res.ok) return failWith(res, "Falha ao enviar a imagem");

  const json = await res.json();
  return (json.data ?? json) as { url: string };
}

/** Alias semântico para o upload da capa do grupo. */
export const uploadGroupCover = uploadCommunityImage;

// ---------------------------------------------------------------------------
// Moderadores (§4.6)
// ---------------------------------------------------------------------------

/** Promove um usuário a moderador do grupo. */
export function addGroupModerator(
  id: string,
  userId: string,
): Promise<CommunityGroupModerator> {
  return writeJson<CommunityGroupModerator>(
    "POST",
    `${BASE}/${id}/moderators`,
    { user_id: userId },
  );
}

/** Rebaixa o moderador para `member` (não remove do grupo). 204. */
export function removeGroupModerator(
  id: string,
  userId: string,
): Promise<void> {
  return writeJson<void>("DELETE", `${BASE}/${id}/moderators/${userId}`);
}

// ---------------------------------------------------------------------------
// Moderação de conteúdo (§4.7)
// ---------------------------------------------------------------------------

export interface ListGroupPostsParams {
  cursor?: string | null;
  limit?: number;
}

export async function listGroupPosts(
  id: string,
  params: ListGroupPostsParams = {},
): Promise<GroupPostPage> {
  const qs = new URLSearchParams();
  if (params.limit) qs.set("limit", String(params.limit));
  if (params.cursor) qs.set("cursor", params.cursor);
  const suffix = qs.toString() ? `?${qs.toString()}` : "";

  const res = await fetch(getApiUrl(`${BASE}/${id}/posts${suffix}`), {
    headers: authHeaders(),
  });
  if (!res.ok) return failWith(res, `Falha ao listar conteúdos (${res.status})`);

  const json = await res.json();
  return {
    items: (json.data ?? []) as GroupPostPage["items"],
    meta: json.meta ?? { next_cursor: null, has_more: false },
  };
}

/** Soft-delete de um post do grupo (moderação). 204. */
export function deleteGroupPost(id: string, postId: string): Promise<void> {
  return writeJson<void>("DELETE", `${BASE}/${id}/posts/${postId}`);
}

/** Payload de publicação no grupo pelo backoffice (§4.7). */
export interface CreateGroupPostPayload {
  content: string;
  image_url?: string | null;
}

/**
 * Publica um conteúdo no grupo em nome do admin logado.
 *
 * `client_request_id` torna o POST idempotente no backend (índice único
 * group_id + author_id + client_request_id): duplo clique ou retry devolve o
 * mesmo post em vez de duplicar.
 */
export function createGroupPost(
  id: string,
  payload: CreateGroupPostPayload,
): Promise<GroupPost> {
  return writeJson<GroupPost>("POST", `${BASE}/${id}/posts`, {
    content: payload.content,
    ...(payload.image_url ? { image_url: payload.image_url } : {}),
    client_request_id: newClientRequestId(),
  });
}

function newClientRequestId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (token) => {
    const random = Math.floor(Math.random() * 16);
    const value = token === "x" ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}
