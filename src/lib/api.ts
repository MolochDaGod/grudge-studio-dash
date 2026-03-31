import { API, SERVICES, type ServiceKey } from "./config";

// ── Auth token accessor ─────────────────────────────────────────
function getToken(): string | null {
  try {
    const raw = sessionStorage.getItem("grudge_dash_session");
    if (!raw) return null;
    return JSON.parse(raw)?.token || null;
  } catch {
    return null;
  }
}

function authHeaders(): Record<string, string> {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  const token = getToken();
  if (token) h["Authorization"] = `Bearer ${token}`;
  return h;
}

// ── Generic fetcher with auth ───────────────────────────────────
async function fetcher<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { ...authHeaders(), ...init?.headers },
  });

  if (res.status === 401) {
    sessionStorage.removeItem("grudge_dash_session");
    window.location.reload();
    throw new Error("Session expired");
  }
  if (res.status === 403) throw new Error("Access denied — admin role required");
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
}

async function safeFetcher<T>(url: string, init?: RequestInit): Promise<T | null> {
  try { return await fetcher<T>(url, init); } catch { return null; }
}

// ── Health checks ───────────────────────────────────────────────
export interface HealthResult {
  key: ServiceKey;
  name: string;
  url: string;
  ok: boolean;
  ms: number;
  version?: string;
  error?: string;
}

export async function checkHealth(key: ServiceKey): Promise<HealthResult> {
  const svc = SERVICES.find((s) => s.key === key)!;
  const start = performance.now();
  try {
    const r = await fetch(`${svc.url}/health`, { method: "GET", signal: AbortSignal.timeout(8000) });
    let body: any = {};
    try { body = await r.json(); } catch {}
    return { key, name: svc.name, url: svc.url, ok: r.ok, ms: Math.round(performance.now() - start), version: body?.version };
  } catch (e) {
    return { key, name: svc.name, url: svc.url, ok: false, ms: Math.round(performance.now() - start), error: String(e) };
  }
}

export async function checkAllHealth(): Promise<HealthResult[]> {
  return Promise.all(SERVICES.map((s) => checkHealth(s.key)));
}

// ── Deployment status ───────────────────────────────────────────
export interface DeployStatus { url: string; online: boolean; ms: number; }

export async function checkDeployment(url: string): Promise<DeployStatus> {
  if (!url) return { url, online: false, ms: 0 };
  const start = performance.now();
  try {
    await fetch(url, { method: "HEAD", mode: "no-cors", signal: AbortSignal.timeout(8000) });
    return { url, online: true, ms: Math.round(performance.now() - start) };
  } catch {
    return { url, online: false, ms: Math.round(performance.now() - start) };
  }
}

// ═════════════════════════════════════════════════════════════════
// GAME API — api.grudge-studio.com (no /api/ prefix)
// ═════════════════════════════════════════════════════════════════

export const gameApi = {
  characters: () => fetcher<any[]>(`${API.api}/characters`),
  character: (id: number) => fetcher<any>(`${API.api}/characters/${id}`),
  islands: () => fetcher<any[]>(`${API.api}/islands`),
  missions: () => fetcher<any[]>(`${API.api}/missions`),
  crews: () => fetcher<any[]>(`${API.api}/crews`),
  craftingRecipes: () => fetcher<any[]>(`${API.api}/crafting/recipes`),
};

export const pvpApi = {
  lobbies: (status?: string) => fetcher<any[]>(`${API.api}/pvp/lobbies${status ? `?status=${status}` : ""}`),
  lobby: (code: string) => fetcher<any>(`${API.api}/pvp/lobby/${code}`),
  leaderboard: (mode = "duel", limit = 50) => fetcher<any>(`${API.api}/pvp/leaderboard?mode=${mode}&limit=${limit}`),
  ratings: (grudgeId?: string) => fetcher<any>(`${API.api}/pvp/ratings${grudgeId ? `?grudge_id=${grudgeId}` : ""}`),
  modeConfigs: () => fetcher<{ modes: Record<string, any> }>(`${API.api}/pvp/mode-configs`),
  servers: () => fetcher<{ servers: any[] }>(`${API.api}/pvp/servers`),
};

export const economyApi = {
  balance: (charId: number) => fetcher<any>(`${API.api}/admin/economy/balance?char_id=${charId}`),
  summary: () => safeFetcher<any>(`${API.api}/admin/economy/summary`),
  overview: () => safeFetcher<any>(`${API.api}/admin/economy/overview`),
};

// ── Account API — routed through game-api /admin/account/* proxy ─
export const accountApi = {
  list: () => fetcher<any[]>(`${API.api}/admin/accounts`),
  profile: (grudgeId: string) => fetcher<any>(`${API.api}/admin/accounts/${grudgeId}`),
  sessions: () => fetcher<any[]>(`${API.api}/admin/accounts/sessions`),
  auditLog: () => fetcher<any[]>(`${API.api}/admin/accounts/audit-log`),
  friends: () => safeFetcher<any[]>(`${API.api}/admin/accounts/friends`),
  notifications: () => safeFetcher<any[]>(`${API.api}/admin/accounts/notifications`),
  achievements: () => safeFetcher<any>(`${API.api}/admin/accounts/achievements`),
};

export const authApi = {
  verify: () => fetcher<any>(`${API.api}/admin/auth/verify`),
  user: () => fetcher<any>(`${API.api}/admin/auth/user`),
};

// ═════════════════════════════════════════════════════════════════
// ADMIN API — api.grudge-studio.com/admin/*
// ═════════════════════════════════════════════════════════════════

export const adminApi = {
  dbTables: () => fetcher<any[]>(`${API.api}/admin/db/tables`),
  dbTableData: (table: string, limit = 50) => fetcher<any[]>(`${API.api}/admin/db/tables/${table}?limit=${limit}`),
  dbSchema: (table: string) => fetcher<any[]>(`${API.api}/admin/db/schema/${table}`),
  dbQuery: (sql: string) => fetcher<any>(`${API.api}/admin/db/query`, { method: "POST", body: JSON.stringify({ sql }) }),
  stats: () => safeFetcher<any>(`${API.api}/admin/stats`),
  containers: () => safeFetcher<any[]>(`${API.api}/admin/containers`),
  containerRestart: (id: string) => fetcher<any>(`${API.api}/admin/containers/${id}/restart`, { method: "POST" }),
  containerLogs: (id: string, lines = 100) => fetcher<any>(`${API.api}/admin/containers/${id}/logs?lines=${lines}`),
  storageBuckets: () => safeFetcher<any>(`${API.api}/admin/storage/buckets`),
  pvpServers: () => safeFetcher<{ servers: any[] }>(`${API.api}/admin/pvp/servers`),
};

// ── Lobby types ─────────────────────────────────────────────────
export type LobbyType = "duel" | "crew_battle" | "arena_ffa" | "nemesis" | "rpg_fighter" | "thc_battle";

export interface Lobby {
  lobby_code: string;
  mode: LobbyType;
  island: string;
  host_grudge_id: string;
  host_username?: string;
  status: "waiting" | "ready" | "in_progress" | "finished" | "cancelled";
  max_players: number;
  player_count: number;
  created_at: string;
}

export const lobbyApi = {
  list: () => fetcher<Lobby[]>(`${API.api}/pvp/lobbies?limit=50`),
  get: (code: string) => fetcher<Lobby>(`${API.api}/pvp/lobby/${code}`),
  create: (data: { mode: string; island?: string; char_id: number; max_players?: number }) =>
    fetcher<any>(`${API.api}/pvp/lobby`, { method: "POST", body: JSON.stringify(data) }),
  leave: (code: string) => fetcher<any>(`${API.api}/pvp/lobby/${code}/leave`, { method: "DELETE" }),
  start: (code: string) => fetcher<any>(`${API.api}/pvp/lobby/${code}/start`, { method: "POST" }),
};

export const arenaApi = {
  matches: () => pvpApi.lobbies("in_progress"),
  leaderboard: (mode = "duel") => pvpApi.leaderboard(mode),
  queue: () => safeFetcher<any[]>(`${API.api}/pvp/queue`),
};

// ── Backward compat aliases ─────────────────────────────────────
export const deployApi = {
  containers: () => adminApi.containers(),
  restart: (id: string) => adminApi.containerRestart(id),
  rebuild: (id: string) => adminApi.containerRestart(id),
  logs: (id: string, lines?: number) => adminApi.containerLogs(id, lines),
  history: () => safeFetcher<any[]>(`${API.api}/admin/deploy/history`),
};

export const dbApi = {
  tables: () => adminApi.dbTables(),
  stats: () => adminApi.stats(),
  tableData: (table: string, limit?: number) => adminApi.dbTableData(table, limit),
  schema: (table: string) => adminApi.dbSchema(table),
  query: (sql: string) => adminApi.dbQuery(sql),
  migrate: (_sql: string) => Promise.reject(new Error("Schema migrations disabled in dashboard")),
};

export const storageApi = {
  buckets: () => adminApi.storageBuckets(),
  objects: (bucket: string) => safeFetcher<any[]>(`${API.api}/admin/storage/objects/${bucket}`),
};
