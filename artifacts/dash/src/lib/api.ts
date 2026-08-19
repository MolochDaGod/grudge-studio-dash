import { API, SERVICES, GAME_DEPLOYMENTS, type ServiceKey } from "./config";

// ── Auth token accessor ─────────────────────────────────────────
function getToken(): string | null {
  try {
    const raw =
      localStorage.getItem("grudge_dash_session") ||
      sessionStorage.getItem("grudge_dash_session");
    if (raw) {
      const t = JSON.parse(raw)?.token;
      if (t) return t;
    }
  } catch {
    /* fall through */
  }
  try {
    return (
      localStorage.getItem("grudge_auth_token") ||
      localStorage.getItem("grudge_session_token") ||
      localStorage.getItem("grudge.token") ||
      localStorage.getItem("sso_token")
    );
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
  /** Full probe URL */
  probeUrl: string;
  ok: boolean;
  ms: number;
  status?: number;
  version?: string;
  error?: string;
  layer?: string;
}

/** Up = 2xx/3xx, or 401/403 (service alive, auth required). 404/5xx = down or wrong path. */
function statusMeansUp(status: number): boolean {
  if (status >= 200 && status < 400) return true;
  if (status === 401 || status === 403) return true;
  return false;
}

export async function checkHealth(key: ServiceKey): Promise<HealthResult> {
  const svc = SERVICES.find((s) => s.key === key);
  if (!svc) {
    return {
      key,
      name: key,
      url: "",
      probeUrl: "",
      ok: false,
      ms: 0,
      error: "Unknown service key",
    };
  }
  const origin = svc.url.replace(/\/$/, "");
  const path = svc.healthPath.startsWith("/") ? svc.healthPath : `/${svc.healthPath}`;
  const probeUrl = `${origin}${path}`;
  const start = performance.now();
  try {
    const r = await fetch(probeUrl, {
      method: "GET",
      signal: AbortSignal.timeout(10_000),
      cache: "no-store",
    });
    let body: Record<string, unknown> = {};
    const ct = r.headers.get("content-type") || "";
    if (ct.includes("json")) {
      try {
        body = await r.json();
      } catch {
        /* ignore */
      }
    }
    const ok = statusMeansUp(r.status);
    return {
      key,
      name: svc.name,
      url: svc.url,
      probeUrl,
      ok,
      ms: Math.round(performance.now() - start),
      status: r.status,
      version: (body?.version as string) || (body?.service as string) || undefined,
      layer: svc.layer,
      error: ok ? undefined : `HTTP ${r.status}`,
    };
  } catch (e) {
    return {
      key,
      name: svc.name,
      url: svc.url,
      probeUrl,
      ok: false,
      ms: Math.round(performance.now() - start),
      layer: svc.layer,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

export async function checkAllHealth(): Promise<HealthResult[]> {
  return Promise.all(SERVICES.map((s) => checkHealth(s.key)));
}

// ── Deployment status (game / product SPAs) ─────────────────────
export interface DeployStatus {
  url: string;
  probeUrl: string;
  online: boolean;
  ms: number;
  status?: number;
  error?: string;
  /** CORS blocked but network may still work — treat cautiously */
  opaque?: boolean;
}

/**
 * Real GET probe. Do **not** use mode:no-cors as success — that always
 * "succeeds" with an opaque response and lied about offline hosts.
 */
export async function checkDeployment(
  url: string,
  healthPath = "/",
): Promise<DeployStatus> {
  if (!url) return { url: "", probeUrl: "", online: false, ms: 0, error: "No URL" };
  const origin = url.replace(/\/$/, "");
  const path = healthPath.startsWith("http")
    ? healthPath
    : `${origin}${healthPath.startsWith("/") ? healthPath : `/${healthPath}`}`;
  const start = performance.now();
  try {
    const r = await fetch(path, {
      method: "GET",
      signal: AbortSignal.timeout(10_000),
      cache: "no-store",
    });
    const online = statusMeansUp(r.status);
    return {
      url,
      probeUrl: path,
      online,
      ms: Math.round(performance.now() - start),
      status: r.status,
      error: online ? undefined : `HTTP ${r.status}`,
    };
  } catch (e) {
    // Last resort: no-cors only proves TCP/DNS, not HTTP health
    try {
      await fetch(path, {
        method: "GET",
        mode: "no-cors",
        signal: AbortSignal.timeout(8_000),
      });
      return {
        url,
        probeUrl: path,
        online: true,
        ms: Math.round(performance.now() - start),
        opaque: true,
        status: 0,
        error: "Opaque response (CORS) — host reachable, status unknown",
      };
    } catch {
      return {
        url,
        probeUrl: path,
        online: false,
        ms: Math.round(performance.now() - start),
        error: e instanceof Error ? e.message : String(e),
      };
    }
  }
}

export async function checkAllDeployments(): Promise<
  Array<DeployStatus & { id: string; name: string }>
> {
  return Promise.all(
    GAME_DEPLOYMENTS.map(async (d) => {
      const st = await checkDeployment(d.liveUrl, d.healthPath);
      return { ...st, id: d.id, name: d.name };
    }),
  );
}

// ════════════════════════════════════════════════════════════════
// GAME API — Railway grudge-api (GAME_API_BASE) — NOT api.grudge-studio.com
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
  animationLibraries?: {
    id: string;
    label: string;
    rig: string;
    clipMap?: Record<string, string>;
    clips?: { name?: string; source?: string }[];
  }[];
  pipeline?: { cdnBase: string; defaultCharacterHeightM: number };
  libraries?: Record<string, string | undefined>;
}

/** Playable clip count — never treat an empty alias map as "0 animations". */
export function countEngineLibraryClips(lib: {
  clipMap?: Record<string, string>;
  clips?: { name?: string; source?: string }[];
}): number {
  const fromClips = (lib.clips ?? []).filter((c) => Boolean(c?.name || c?.source)).length;
  const fromMapKeys = Object.keys(lib.clipMap ?? {}).length;
  return Math.max(fromClips, fromMapKeys);
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
      clipCount: countEngineLibraryClips(lib),
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

// User management — Railway /api/admin/* (same GAME_API_BASE as characters)
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
// ADMIN API — Railway /api/admin/* (GAME_API_BASE)
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
