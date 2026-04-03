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

// ════════════════════════════════════════════════════════════════
// GAME API — api.grudge-studio.com
// ════════════════════════════════════════════════════════════════

export const gameApi = {
  characters:     () => fetcher<any[]>(`${API.api}/characters`),
  character:      (id: number) => fetcher<any>(`${API.api}/characters/${id}`),
  islands:        () => fetcher<any[]>(`${API.api}/islands`),
  missions:       () => fetcher<any[]>(`${API.api}/missions`),
  crews:          () => fetcher<any[]>(`${API.api}/crews`),
  craftingRecipes:() => fetcher<any[]>(`${API.api}/crafting/recipes`),
};

// PvP — status param now works on backend (default: 'waiting')
export const pvpApi = {
  lobbies:    (status = "waiting", mode?: string) =>
    fetcher<any[]>(`${API.api}/pvp/lobbies?status=${status}${mode ? `&mode=${mode}` : ""}`),
  lobby:      (code: string) => fetcher<any>(`${API.api}/pvp/lobby/${code}`),
  leaderboard:(mode = "duel", limit = 50) =>
    fetcher<any>(`${API.api}/pvp/leaderboard?mode=${mode}&limit=${limit}`),
  ratings:    (grudgeId?: string) =>
    fetcher<any>(`${API.api}/pvp/ratings${grudgeId ? `?grudge_id=${grudgeId}` : ""}`),
  modeConfigs:() => fetcher<{ modes: Record<string, any> }>(`${API.api}/pvp/mode-configs`),
};

export const economyApi = {
  balance: (charId: number) => fetcher<any>(`${API.api}/admin/economy/balance?char_id=${charId}`),
  summary: () => safeFetcher<any>(`${API.api}/admin/economy/summary`),
  overview:() => safeFetcher<any>(`${API.api}/admin/economy/overview`),
};

// ════════════════════════════════════════════════════════════════
// IDENTITY ADMIN — id.grudge-studio.com/admin (correct service owner)
// ════════════════════════════════════════════════════════════════

// User management goes directly to grudge-id (the identity service owner)
// grudge-id /admin/users has search, pagination, role change, ban, and full stats.
export const accountApi = {
  list:     (q?: string, limit = 50, offset = 0) =>
    fetcher<{ users: any[]; total: number }>(`${API.auth}/admin/users?limit=${limit}&offset=${offset}${q ? `&q=${encodeURIComponent(q)}` : ""}`),
  profile:  (grudgeId: string) =>
    // game-api has character info; grudge-id has identity info — combine both
    Promise.all([
      safeFetcher<any>(`${API.auth}/admin/users?q=${grudgeId}&limit=1`),
      safeFetcher<any>(`${API.api}/admin/accounts/${grudgeId}`),
    ]).then(([id, game]) => ({ ...id?.users?.[0], ...game })),
  sessions: () => fetcher<any[]>(`${API.api}/admin/accounts/sessions`),
  auditLog: () => fetcher<any[]>(`${API.api}/admin/accounts/audit-log`),
  // Stats: grudge-id owns identity stats (roles, active users, guests)
  identityStats: () => fetcher<any>(`${API.auth}/admin/stats`),
  // Ban/role: go directly to grudge-id (it owns the users table for identity)
  banUser:  (grudgeId: string, banned: boolean, reason?: string) =>
    fetcher<any>(`${API.auth}/admin/users/${grudgeId}/ban`, {
      method: "PATCH",
      body: JSON.stringify({ banned, reason }),
    }),
  setRole:  (grudgeId: string, role: string) =>
    fetcher<any>(`${API.auth}/admin/users/${grudgeId}/role`, {
      method: "PATCH",
      body: JSON.stringify({ role }),
    }),
};

// ════════════════════════════════════════════════════════════════
// ADMIN API — api.grudge-studio.com/admin/*
// ════════════════════════════════════════════════════════════════

export const adminApi = {
  dbTables:       () => fetcher<any[]>(`${API.api}/admin/db/tables`),
  dbTableData:    (table: string, limit = 50) => fetcher<any[]>(`${API.api}/admin/db/tables/${table}?limit=${limit}`),
  dbSchema:       (table: string) => fetcher<any[]>(`${API.api}/admin/db/schema/${table}`),
  dbQuery:        (sql: string) => fetcher<any>(`${API.api}/admin/db/query`, { method: "POST", body: JSON.stringify({ sql }) }),
  // game stats: characters, matches, lobbies, gold, redis keys
  gameStats:      () => safeFetcher<any>(`${API.api}/admin/stats`),
  containers:
  containerRestart:(id: string) => fetcher<any>(`${API.api}/admin/containers/${id}/restart`, { method: "POST" }),
  containerLogs:  (id: string, lines = 100) => fetcher<any>(`${API.api}/admin/containers/${id}/logs?lines=${lines}`),
  storageBuckets: () => safeFetcher<any>(`${API.api}/admin/storage/buckets`),
  storageObjects: (bucket: string) => safeFetcher<any[]>(`${API.api}/admin/storage/buckets/${bucket}/objects`),
  pvpServers:     () => safeFetcher<{ servers: any[] }>(`${API.api}/admin/pvp/servers`),
  pvpLobbies:     (status?: string) => safeFetcher<Lobby[]>(`${API.api}/admin/pvp/lobbies${status ? `?status=${status}` : ""}`),
  cancelLobby:    (code: string) => fetcher<any>(`${API.api}/admin/pvp/lobbies/${code}/cancel`, { method: "POST" }),
  deployHistory:  (service?: string) => safeFetcher<any[]>(`${API.api}/admin/deploy/history${service ? `?service=${service}` : ""}`),
  logDeployEvent: (data: { event_type?: string; service: string; status?: string; actor?: string; commit_sha?: string; details?: string }) =>
    fetcher<any>(`${API.api}/admin/deploy/event`, { method: "POST", body: JSON.stringify(data) }),
};

// Backward compat — dash pages use these names
export const deployApi = {
  containers:() => adminApi.containers(),
  restart:   (id: string) => adminApi.containerRestart(id),
  logs:      (id: string, lines?: number) => adminApi.containerLogs(id, lines),
  history:   (service?: string) => adminApi.deployHistory(service),
};

export const dbApi = {
  tables:   () => adminApi.dbTables(),
  tableData:(table: string, limit?: number) => adminApi.dbTableData(table, limit),
  schema:   (table: string) => adminApi.dbSchema(table),
  query:    (sql: string) => adminApi.dbQuery(sql),
  migrate:  (_sql: string) => Promise.reject(new Error("Schema migrations disabled in dashboard")),
};

export const storageApi = {
  buckets: () => adminApi.storageBuckets(),
  objects: (bucket: string) => adminApi.storageObjects(bucket),
};

// stats() kept for backward compat — returns game stats only
export const statsApi = {
  game:    () => adminApi.gameStats(),
  identity:() => accountApi.identityStats(),
};

// ── Lobby types (used by Lobbies.tsx, Arena.tsx, admin pages) ───────────
export type LobbyType   = "duel" | "crew_battle" | "arena_ffa" | "nemesis" | "rpg_fighter" | "thc_battle";
export type LobbyStatus = "waiting" | "ready" | "in_progress" | "finished" | "cancelled";

export interface Lobby {
  lobby_code:    string;
  mode:          LobbyType;
  island:        string;
  host_grudge_id:string;
  host_username? :string;
  status:        LobbyStatus;
  max_players:   number;
  player_count:  number;
  created_at:    string;
  started_at?:   string;
  finished_at?:  string;
}
