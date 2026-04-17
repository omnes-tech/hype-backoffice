import { getApiUrl, getAuthToken, getWorkspaceId } from "@/lib/utils/api";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CatalogSocialNetwork {
  id: number;
  type: string;
  name: string;
  username: string;
  members: number;
  photo: string | null;
}

export interface CatalogUser {
  id: number;
  name: string;
  photo: string | null;
  gender: string | null;
}

export interface CatalogNiche {
  id: number;
  name: string;
}

export interface CatalogItem {
  social_network: CatalogSocialNetwork;
  user: CatalogUser;
  niches: CatalogNiche[];
}

export interface CreatorsCatalogFilters {
  q?: string;
  social_network?: string;
  niche?: number | string;
  state?: string;
  city?: string;
  followers_min?: number;
  followers_max?: number;
  page?: number;
  per_page?: number;
}

export interface CreatorsCatalogResponse {
  items: CatalogItem[];
  page: number;
  totalPages: number;
  total: number;
  hasMore: boolean;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function readRecord(raw: unknown): Record<string, unknown> | null {
  if (raw && typeof raw === "object" && !Array.isArray(raw))
    return raw as Record<string, unknown>;
  return null;
}

function normalizeSocialNetwork(raw: unknown): CatalogSocialNetwork | null {
  const o = readRecord(raw);
  if (!o) return null;
  const id = Number(o.id);
  if (!Number.isFinite(id)) return null;
  return {
    id,
    type: String(o.type ?? ""),
    name: String(o.name ?? ""),
    username: String(o.username ?? ""),
    members: Number(o.members ?? 0) || 0,
    photo: o.photo != null && o.photo !== "" ? String(o.photo) : null,
  };
}

function normalizeUser(raw: unknown): CatalogUser | null {
  const o = readRecord(raw);
  if (!o) return null;
  const id = Number(o.id);
  if (!Number.isFinite(id)) return null;
  return {
    id,
    name: String(o.name ?? ""),
    photo: o.photo != null && o.photo !== "" ? String(o.photo) : null,
    gender: o.gender != null ? String(o.gender) : null,
  };
}

function normalizeNiches(raw: unknown): CatalogNiche[] {
  if (!Array.isArray(raw)) return [];
  const result: CatalogNiche[] = [];
  for (const x of raw) {
    const o = readRecord(x);
    if (!o) continue;
    const id = Number(o.id);
    const name = String(o.name ?? "").trim();
    if (Number.isFinite(id) && name) result.push({ id, name });
  }
  return result;
}

function normalizeItem(raw: unknown): CatalogItem | null {
  const o = readRecord(raw);
  if (!o) return null;
  const sn = normalizeSocialNetwork(o.social_network);
  const user = normalizeUser(o.user);
  if (!sn || !user) return null;
  return {
    social_network: sn,
    user,
    niches: normalizeNiches(o.niches),
  };
}

function buildHeaders() {
  const workspaceId = getWorkspaceId();
  if (!workspaceId) throw new Error("Workspace ID é obrigatório");
  return {
    Accept: "application/json",
    "Client-Type": "backoffice",
    Authorization: `Bearer ${getAuthToken()}`,
    "Workspace-Id": workspaceId,
  };
}

// ---------------------------------------------------------------------------
// Catalog
// ---------------------------------------------------------------------------

export async function getCreatorsCatalog(
  filters: CreatorsCatalogFilters = {}
): Promise<CreatorsCatalogResponse> {
  const url = new URL(getApiUrl("/influencers"));

  if (filters.q) url.searchParams.set("q", filters.q);
  if (filters.social_network && filters.social_network !== "all")
    url.searchParams.set("social_network", filters.social_network);
  if (filters.niche) url.searchParams.set("niche", String(filters.niche));
  if (filters.state) url.searchParams.set("state", filters.state);
  if (filters.city) url.searchParams.set("city", filters.city);
  if (filters.followers_min)
    url.searchParams.set("followers_min", String(filters.followers_min));
  if (filters.followers_max)
    url.searchParams.set("followers_max", String(filters.followers_max));

  url.searchParams.set("page", String(filters.page ?? 1));
  url.searchParams.set("per_page", String(filters.per_page ?? 20));

  const request = await fetch(url.toString(), {
    method: "GET",
    headers: buildHeaders(),
  });

  if (!request.ok) {
    let err: unknown;
    try { err = await request.json(); } catch { err = { message: "Failed to get creators catalog" }; }
    throw err || "Failed to get creators catalog";
  }

  const response = await request.json();

  // API returns: { data: [...], meta: { page, per_page, total, total_pages } }
  const rawItems = Array.isArray(response.data) ? response.data : [];
  const items = rawItems.map(normalizeItem).filter((x): x is CatalogItem => x != null);

  const meta = readRecord(response.meta);
  const page = Number(meta?.page ?? 1);
  const totalPages = Number(meta?.total_pages ?? 1);
  const total = Number(meta?.total ?? items.length);

  return { items, page, totalPages, total, hasMore: page < totalPages };
}

// ---------------------------------------------------------------------------
// Influencer Lists (CRUD)
// ---------------------------------------------------------------------------

export async function createInfluencerList(
  name: string
): Promise<{ id: string; name: string; influencer_count: number; created_at: string }> {
  const request = await fetch(getApiUrl("/influencer-lists"), {
    method: "POST",
    headers: { "Content-Type": "application/json", ...buildHeaders() },
    body: JSON.stringify({ name }),
  });

  if (!request.ok) {
    let err: unknown;
    try { err = await request.json(); } catch { err = { message: "Failed to create influencer list" }; }
    throw err || "Failed to create influencer list";
  }

  const response = await request.json();
  return response.data ?? response;
}

export async function updateInfluencerList(listId: string, name: string): Promise<void> {
  const request = await fetch(getApiUrl(`/influencer-lists/${listId}`), {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...buildHeaders() },
    body: JSON.stringify({ name }),
  });

  if (!request.ok) {
    let err: unknown;
    try { err = await request.json(); } catch { err = { message: "Failed to update influencer list" }; }
    throw err || "Failed to update influencer list";
  }
}

export async function deleteInfluencerList(listId: string): Promise<void> {
  const request = await fetch(getApiUrl(`/influencer-lists/${listId}`), {
    method: "DELETE",
    headers: buildHeaders(),
  });

  if (!request.ok) {
    let err: unknown;
    try { err = await request.json(); } catch { err = { message: "Failed to delete influencer list" }; }
    throw err || "Failed to delete influencer list";
  }
}

// user_id = user.id retornado pelo catálogo (NÃO social_network.id)
export async function addToInfluencerList(listId: string, userId: number): Promise<void> {
  const request = await fetch(
    getApiUrl(`/influencer-lists/${listId}/influencers`),
    {
      method: "POST",
      headers: { "Content-Type": "application/json", ...buildHeaders() },
      body: JSON.stringify({ user_id: userId }),
    }
  );

  if (!request.ok) {
    let err: unknown;
    try { err = await request.json(); } catch { err = { message: "Failed to add to influencer list" }; }
    throw err || "Failed to add to influencer list";
  }
}

// userId = user.id
export async function removeFromInfluencerList(listId: string, userId: number): Promise<void> {
  const request = await fetch(
    getApiUrl(`/influencer-lists/${listId}/influencers/${userId}`),
    { method: "DELETE", headers: buildHeaders() }
  );

  if (!request.ok) {
    let err: unknown;
    try { err = await request.json(); } catch { err = { message: "Failed to remove from influencer list" }; }
    throw err || "Failed to remove from influencer list";
  }
}
