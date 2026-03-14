import { API, SERVICES, type ServiceKey } from "./config";

// ── Generic fetcher ─────────────────────────────────────────────
async function fetcher<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
}

// ── Health checks ───────────────────────────────────────────────
export interface HealthResult {
  key: ServiceKey;
  name: string;
  url: string;
  ok: boolean;
  ms: number;
  error?: string;
}

export async function checkHealth(key: ServiceKey): Promise<HealthResult> {
  const svc = SERVICES.find((s) => s.key === key)!;
  const start = performance.now();
  try {
    await fetch(`${svc.url}/health`, { method: "GET", mode: "cors", signal: AbortSignal.timeout(8000) });
    return { key, name: svc.name, url: svc.url, ok: true, ms: Math.round(performance.now() - start) };
  } catch (e) {
    return { key, name: svc.name, url: svc.url, ok: false, ms: Math.round(performance.now() - start), error: String(e) };
  }
}

export async function checkAllHealth(): Promise<HealthResult[]> {
  return Promise.all(SERVICES.map((s) => checkHealth(s.key)));
}

// ── Deployment status (HEAD check) ─────────────────────────────
export interface DeployStatus {
  url: string;
  online: boolean;
  ms: number;
}

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

// ── Game API ────────────────────────────────────────────────────
export const gameApi = {
  characters: () => fetcher<any[]>(`${API.api}/api/characters`),
  items: () => fetcher<any[]>(`${API.api}/api/items`),
  crafting: () => fetcher<any[]>(`${API.api}/api/crafting`),
  islands: () => fetcher<any[]>(`${API.api}/api/islands`),
  skills: () => fetcher<any[]>(`${API.api}/api/skills`),
  gameData: () => fetcher<any>(`${API.api}/api/game-data`),
};

// ── Account API ─────────────────────────────────────────────────
export const accountApi = {
  list: () => fetcher<any[]>(`${API.account}/api/accounts`),
  linked: () => fetcher<any[]>(`${API.account}/api/accounts/linked`),
  auditLog: () => fetcher<any[]>(`${API.account}/api/accounts/audit-log`),
  sessions: () => fetcher<any[]>(`${API.account}/api/accounts/sessions`),
};

// ── Auth API ────────────────────────────────────────────────────
export const authApi = {
  sessions: () => fetcher<any[]>(`${API.auth}/api/auth/sessions`),
  providers: () => fetcher<any[]>(`${API.auth}/api/auth/providers`),
};

// ── MinIO / Storage ─────────────────────────────────────────────
export const storageApi = {
  buckets: () => fetcher<any[]>(`${API.api}/api/storage/buckets`),
  objects: (bucket: string) => fetcher<any[]>(`${API.api}/api/storage/objects/${bucket}`),
};

// ── Database stats (via game API proxy) ─────────────────────────
export const dbApi = {
  tables: () => fetcher<any[]>(`${API.api}/api/db/tables`),
  stats: () => fetcher<any>(`${API.api}/api/db/stats`),
  tableData: (table: string, limit = 50) => fetcher<any[]>(`${API.api}/api/db/tables/${table}?limit=${limit}`),
  schema: (table: string) => fetcher<any[]>(`${API.api}/api/db/schema/${table}`),
  query: (sql: string) => fetcher<any>(`${API.api}/api/db/query`, { method: "POST", body: JSON.stringify({ sql }) }),
  migrate: (sql: string) => fetcher<any>(`${API.api}/api/db/migrate`, { method: "POST", body: JSON.stringify({ sql }) }),
};

// ── Lobby & Arena Management ────────────────────────────────────
export type LobbyType = "pvp_arena" | "tcg" | "unity_server" | "custom";

export interface Lobby {
  id: string;
  name: string;
  type: LobbyType;
  status: "waiting" | "active" | "paused" | "ended";
  maxPlayers: number;
  currentPlayers: number;
  config: Record<string, any>;
  createdAt: string;
}

export const lobbyApi = {
  list: () => fetcher<Lobby[]>(`${API.api}/api/lobbies`),
  get: (id: string) => fetcher<Lobby>(`${API.api}/api/lobbies/${id}`),
  create: (data: Partial<Lobby>) => fetcher<Lobby>(`${API.api}/api/lobbies`, { method: "POST", body: JSON.stringify(data) }),
  update: (id: string, data: Partial<Lobby>) => fetcher<Lobby>(`${API.api}/api/lobbies/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  delete: (id: string) => fetcher<void>(`${API.api}/api/lobbies/${id}`, { method: "DELETE" }),
  start: (id: string) => fetcher<Lobby>(`${API.api}/api/lobbies/${id}/start`, { method: "POST" }),
  stop: (id: string) => fetcher<Lobby>(`${API.api}/api/lobbies/${id}/stop`, { method: "POST" }),
};

export const arenaApi = {
  matches: () => fetcher<any[]>(`${API.api}/api/arena/matches`),
  leaderboard: () => fetcher<any[]>(`${API.api}/api/arena/leaderboard`),
  queue: () => fetcher<any[]>(`${API.api}/api/arena/queue`),
  createRound: (config: any) => fetcher<any>(`${API.api}/api/arena/rounds`, { method: "POST", body: JSON.stringify(config) }),
  kick: (playerId: string) => fetcher<void>(`${API.api}/api/arena/kick/${playerId}`, { method: "POST" }),
};

// ── Deploy / Server Management ──────────────────────────────────
export const deployApi = {
  containers: () => fetcher<any[]>(`${API.api}/api/deploy/containers`),
  restart: (service: string) => fetcher<any>(`${API.api}/api/deploy/restart/${service}`, { method: "POST" }),
  rebuild: (service: string) => fetcher<any>(`${API.api}/api/deploy/rebuild/${service}`, { method: "POST" }),
  logs: (service: string, lines?: number) => fetcher<any>(`${API.api}/api/deploy/logs/${service}?lines=${lines ?? 100}`),
  history: () => fetcher<any[]>(`${API.api}/api/deploy/history`),
};
