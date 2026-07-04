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

const HEALTH_PATHS: Partial<Record<ServiceKey, string>> = {
  api: "/api/health",
  survival: "/api/healthz",
  colyseus: "/health",
  "game-servers": "/health",
  "forge-api": "/api/healthz",
};

export async function checkHealth(key: ServiceKey): Promise<HealthResult> {
  const svc = SERVICES.find((s) => s.key === key)!;
  const healthPath = HEALTH_PATHS[key] ?? "/health";
  const start = performance.now();
  try {
    const r = await fetch(`${svc.url}${healthPath}`, { method: "GET", signal: AbortSignal.timeout(8000) });
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

export interface AdminStats {
  success?: boolean;
  stats?: {
    totalUsers: number;
    totalCharacters: number;
    totalCrews: number;
    activeUsers24h: number;
    goldSupply: number;
    bannedUsers: number;
    roleBreakdown: Record<string, number>;
  };
}

export interface AdminUserRow {
  id: string | number;
  username?: string;
  displayName?: string | null;
  email?: string | null;
  grudgeId?: string | null;
  role?: string | null;
  faction?: string | null;
  isPremium?: boolean;
  isGuest?: boolean;
  isBanned?: boolean;
  walletAddress?: string | null;
  createdAt?: string;
  lastLoginAt?: string | null;
}

export interface AccountProfile {
  grudgeId: string;
  source: "game-api" | "survival";
  id?: string | number;
  username?: string | null;
  displayName?: string | null;
  email?: string | null;
  role?: string | null;
  walletAddress?: string | null;
  lastLoginAt?: string | null;
  characters?: any[];
  wallets?: any[];
  arenaStats?: any;
  survival?: {
    account: any;
    characters: any[] | null;
  };
}

export const gameApi = {
  characters:     () => fetcher<any[]>(`${API.api}/characters`).catch(() => [] as any[]),
  character:      (id: number) => fetcher<any>(`${API.api}/characters/${id}`),
  islands:        () => fetcher<any[]>(`${API.api}/islands`).catch(() => [] as any[]),
  missions:       () => fetcher<any[]>(`${API.api}/missions`).catch(() => [] as any[]),
  crews:          () => fetcher<any[]>(`${API.api}/crews`).catch(() => [] as any[]),
  craftingRecipes:() => fetcher<any[]>(`${API.api}/crafting/recipes`).catch(() => [] as any[]),
  items:          () => fetcher<any[]>(`${API.api}/items`).catch(() => [] as any[]),
  crafting:       () => fetcher<any[]>(`${API.api}/crafting`).catch(() => [] as any[]),
  skills:         () => fetcher<any[]>(`${API.api}/skills`).catch(() => [] as any[]),
};

export interface EngineControllerSummary {
  id: string;
  label: string;
  driver: string;
  worldScale: number;
}

export interface EngineCameraSummary {
  id: string;
  label: string;
  mode: string;
  fov: number;
}

export interface EngineAnimLibrarySummary {
  id: string;
  label: string;
  rig: string;
  clipCount: number;
}

export interface EngineManifestSummary {
  version: number;
  era: string;
  unit: string;
  updatedAt: string;
  controllers: EngineControllerSummary[];
  cameras: EngineCameraSummary[];
  animationLibraries: EngineAnimLibrarySummary[];
  pipeline: { cdnBase: string; defaultCharacterHeightM: number };
  libraries: Record<string, string | undefined>;
}

interface EngineManifestRaw {
  version: number;
  era: string;
  unit: string;
  updatedAt: string;
  controllers?: EngineControllerSummary[];
  cameras?: EngineCameraSummary[];
  animationLibraries?: { id: string; label: string; rig: string; clipMap?: Record<string, string> }[];
  pipeline?: { cdnBase: string; defaultCharacterHeightM: number };
  libraries?: Record<string, string | undefined>;
}

function normalizeEngineManifest(m: EngineManifestRaw): EngineManifestSummary {
  return {
    version: m.version,
    era: m.era,
    unit: m.unit,
    updatedAt: m.updatedAt,
    controllers: m.controllers ?? [],
    cameras: m.cameras ?? [],
    animationLibraries: (m.animationLibraries ?? []).map((lib) => ({
      id: lib.id,
      label: lib.label,
      rig: lib.rig,
      clipCount: Object.keys(lib.clipMap ?? {}).length,
    })),
    pipeline: m.pipeline ?? { cdnBase: "", defaultCharacterHeightM: 1.8 },
    libraries: m.libraries ?? {},
  };
}

/** Survival / Grudox MMO API */
export const survivalApi = {
  account: (grudgeId: string) =>
    safeFetcher<any>(`${API.survival}/api/accounts/${encodeURIComponent(grudgeId)}`),
  characters: (accountId: string) =>
    safeFetcher<any[]>(`${API.survival}/api/characters?accountId=${encodeURIComponent(accountId)}`),
  health: () => safeFetcher<any>(`${API.survival}/api/health`),
  engineManifest: (): Promise<EngineManifestSummary | null> =>
    safeFetcher<EngineManifestRaw>(`${API.survival}/api/engine/manifest`).then((m) =>
      m ? normalizeEngineManifest(m) : null,
    ),
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

// User management — api.grudge-studio.com/api/admin/* (grudge-backend VPS)
export const accountApi = {
  list: (q?: string, page = 1, limit = 50) =>
    fetcher<{ success: boolean; users: AdminUserRow[]; pagination: { total: number; page: number; limit: number } }>(
      `${API.api}/admin/users?page=${page}&limit=${limit}${q ? `&search=${encodeURIComponent(q)}` : ""}`,
    ),
  byId: (userId: string | number) =>
    fetcher<{ success: boolean; user: AdminUserRow; characters: any[]; wallets: any[]; arenaStats: any }>(
      `${API.api}/admin/users/${userId}`,
    ),
  profileByGrudgeId: async (grudgeId: string): Promise<AccountProfile> => {
    const listed = await safeFetcher<{ users: AdminUserRow[] }>(
      `${API.api}/admin/users?search=${encodeURIComponent(grudgeId)}&limit=1`,
    );
    const row = listed?.users?.[0];
    const survivalAcct = await survivalApi.account(grudgeId);
    const survivalChars = survivalAcct?.id
      ? await survivalApi.characters(survivalAcct.id)
      : null;
    const survivalBlock = { account: survivalAcct, characters: survivalChars };

    if (!row?.id) {
      return { grudgeId, source: "survival", survival: survivalBlock };
    }

    const detail = await safeFetcher<{ user: AdminUserRow; characters: any[]; wallets: any[]; arenaStats: any }>(
      `${API.api}/admin/users/${row.id}`,
    );
    const user = detail?.user;
    return {
      grudgeId: user?.grudgeId ?? grudgeId,
      source: "game-api",
      id: user?.id,
      username: user?.username ?? null,
      displayName: user?.displayName ?? null,
      email: user?.email ?? null,
      role: user?.role ?? null,
      walletAddress: user?.walletAddress ?? null,
      lastLoginAt: user?.lastLoginAt ?? null,
      characters: detail?.characters ?? [],
      wallets: detail?.wallets ?? [],
      arenaStats: detail?.arenaStats ?? null,
      survival: survivalBlock,
    };
  },
  sessions: () => safeFetcher<any[]>(`${API.api}/admin/accounts/sessions`).then((r) => r ?? []),
  auditLog: () => safeFetcher<any[]>(`${API.api}/admin/accounts/audit-log`).then((r) => r ?? []),
  identityStats: () => safeFetcher<AdminStats>(`${API.api}/admin/stats`),
  banUser: (userId: string | number, banned: boolean, reason?: string) =>
    fetcher<any>(`${API.api}/admin/users/${userId}/ban`, {
      method: "POST",
      body: JSON.stringify({ banned, reason }),
    }),
  setRole: (userId: string | number, role: string) =>
    fetcher<any>(`${API.api}/admin/users/${userId}/role`, {
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
  gameStats:      () => safeFetcher<AdminStats>(`${API.api}/admin/stats`),
  containers:      () => safeFetcher<any[]>(`${API.api}/admin/containers`),
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
  rebuild:   (id: string) => adminApi.containerRestart(id), // same endpoint until rebuild endpoint is added
  logs:      (id: string, lines?: number) => adminApi.containerLogs(id, lines),
  history:   (service?: string) => adminApi.deployHistory(service),
};

// lobbyApi — simple wrapper used by TCG and UnityServers pages
export const lobbyApi = {
  list: (status?: string) => pvpApi.lobbies(status ?? "all"),
};

export const dbApi = {
  tables:   () => adminApi.dbTables(),
  tableData:(table: string, limit?: number) => adminApi.dbTableData(table, limit),
  schema:   (table: string) => adminApi.dbSchema(table),
  query:    (sql: string) => adminApi.dbQuery(sql),
  migrate:  (_sql: string) => Promise.reject(new Error("Schema migrations disabled in dashboard")),
  stats:    () => safeFetcher<{ totalRows: number; dbSize: string; redisKeys: number }>(`${API.api}/admin/db/stats`),
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
