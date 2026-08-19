/**
 * Canonical map of game / product databases for the Studio dashboard.
 * Metadata only — no credentials. SSOT rules:
 *   - Player state  → Railway Postgres (grudge-api / Neon)
 *   - Asset index   → D1 grudge-assets-db
 *   - Defs JSON     → ObjectStore API
 *   - Binaries      → R2 assets CDN
 *   - Survival      → survival-api Railway
 */

export type DbEngine =
  | "postgres"
  | "mysql"
  | "d1"
  | "r2"
  | "json-api"
  | "redis"
  | "supabase"
  | "puter"
  | "none";

export type DbRole = "ssot" | "cache" | "index" | "defs" | "binary" | "legacy" | "auth";

export interface GameDatabase {
  id: string;
  game: string;
  label: string;
  engine: DbEngine;
  role: DbRole;
  /** Public API / admin base (not a connection string) */
  endpoint?: string;
  /** Health probe path on endpoint origin */
  healthPath?: string;
  tables?: string[];
  notes?: string;
  dashPath?: string;
}

/** Tables owned by Railway Postgres (Drizzle game SSOT). */
export const RAILWAY_SSOT_TABLES = [
  "users",
  "accounts",
  "characters",
  "account_inventory",
  "account_resources",
  "home_islands",
  "player_ships",
  "character_professions",
  "parties",
  "player_resources",
  "uuid_ledger",
  "gbux_transactions",
  "linked_wallets",
  "world_zones",
  "player_blocks",
  "battle_arena_stats",
  "pvp_lobbies",
  "pvp_ratings",
] as const;

export const GAME_DATABASES: GameDatabase[] = [
  {
    id: "railway-postgres",
    game: "Studio / Warlords",
    label: "Railway Postgres (SSOT)",
    engine: "postgres",
    role: "ssot",
    endpoint: "https://grudge-api-production-0d46.up.railway.app",
    healthPath: "/api/health",
    tables: [...RAILWAY_SSOT_TABLES],
    notes: "Authoritative players, characters, islands, inventory, wallet, PvP.",
    dashPath: "/database",
  },
  {
    id: "warlords-client",
    game: "Warlords",
    label: "Warlords client → Game API",
    engine: "json-api",
    role: "ssot",
    endpoint: "https://grudgewarlords.com",
    healthPath: "/",
    notes: "No direct DB — all state via Railway API rewrites.",
    dashPath: "/games/warlords",
  },
  {
    id: "grudox-survival",
    game: "Grudox",
    label: "Survival / Nexus API",
    engine: "postgres",
    role: "ssot",
    endpoint: "https://survival-api-production.up.railway.app",
    healthPath: "/api/healthz",
    tables: ["accounts", "characters", "masks", "engine_manifest"],
    notes: "Nexus / shipwreck / survival progression (separate Railway service).",
    dashPath: "/games/grudox",
  },
  {
    id: "carrier-armada",
    game: "Carrier",
    label: "Armada (shared Game API)",
    engine: "json-api",
    role: "ssot",
    endpoint: "https://armada.grudge-studio.com",
    healthPath: "/",
    notes: "Uses Game API + Grudge ID; no separate SQL host.",
    dashPath: "/games/carrier",
  },
  {
    id: "engine-portal",
    game: "Portal / Rec0deD",
    label: "The-ENGINE Railway",
    engine: "postgres",
    role: "ssot",
    endpoint: "https://the-engine.up.railway.app",
    healthPath: "/api/health",
    tables: ["scores", "challenges", "leaderboards", "chat"],
    notes: "Portal scores / GBUX / challenges.",
  },
  {
    id: "d1-assets",
    game: "Studio assets",
    label: "D1 asset_registry",
    engine: "d1",
    role: "index",
    endpoint: "https://api.grudge-studio.com",
    healthPath: "/assets?limit=1",
    tables: ["asset_registry"],
    notes: "Index only (~6k rows). Binaries on R2.",
    dashPath: "/asset-browser",
  },
  {
    id: "d1-objectstore",
    game: "ObjectStore",
    label: "D1 objectstore index",
    engine: "d1",
    role: "index",
    endpoint: "https://objectstore.grudge-studio.com",
    healthPath: "/health",
    notes: "Search index for catalog JSON.",
  },
  {
    id: "d1-game-state",
    game: "Edge state",
    label: "D1 grudge-game-state",
    engine: "d1",
    role: "cache",
    notes: "Edge/cache only — never authoritative for characters or islands.",
  },
  {
    id: "d1-ai-hub",
    game: "AI Hub",
    label: "D1 grudge-ai-hub",
    engine: "d1",
    role: "index",
    endpoint: "https://ai.grudge-studio.com",
    healthPath: "/health",
    tables: ["agents", "sessions"],
    notes: "Legion agents metadata.",
  },
  {
    id: "objectstore-defs",
    game: "All games",
    label: "ObjectStore game defs",
    engine: "json-api",
    role: "defs",
    endpoint: "https://objectstore.grudge-studio.com",
    healthPath: "/health",
    tables: ["weapons", "armor", "materials", "recipes", "races", "skills"],
    notes: "Static definitions (not player inventory).",
    dashPath: "/assets",
  },
  {
    id: "r2-binaries",
    game: "All games",
    label: "R2 assets CDN",
    engine: "r2",
    role: "binary",
    endpoint: "https://assets.grudge-studio.com",
    healthPath: "/js/grudge-fleet.js",
    notes: "GLB, sprites, audio — never player state.",
    dashPath: "/storage",
  },
  {
    id: "game-data-hub",
    game: "Studio",
    label: "Game Data Hub (master)",
    engine: "json-api",
    role: "defs",
    endpoint: "https://grudge-game-data-hub.vercel.app",
    healthPath: "/",
    notes: "Generated master item/crafting DB with GRUDGE UUIDs.",
  },
  {
    id: "legacy-mysql",
    game: "Legacy",
    label: "VPS MySQL grudge_game",
    engine: "mysql",
    role: "legacy",
    tables: ["legacy game tables"],
    notes: "Parallel legacy host — audit before writes. Prefer Railway Postgres.",
  },
  {
    id: "supabase-auth",
    game: "Legacy",
    label: "Supabase (retired spine)",
    engine: "supabase",
    role: "legacy",
    endpoint: "https://rdbkhvrpavhptxrmmwrc.supabase.co",
    notes: "Not required. Grudge ID + Railway are identity/game SSOT. configured:false is healthy.",
  },
  {
    id: "pvp-lobby",
    game: "Warlords PvP",
    label: "PvP Railway lobby",
    engine: "json-api",
    role: "ssot",
    endpoint: "https://grudge-pvp-server-production.up.railway.app",
    healthPath: "/health",
    notes: "Socket.io 1v1 lobby. Optional MySQL stats. Not Colyseus.",
    dashPath: "/lobbies",
  },
  {
    id: "puter-kv",
    game: "All clients",
    label: "Puter KV cache",
    engine: "puter",
    role: "cache",
    notes: "Client cache only. Write Railway first.",
  },
  {
    id: "identity-id",
    game: "Identity",
    label: "Grudge ID gateway",
    engine: "json-api",
    role: "auth",
    endpoint: "https://id.grudge-studio.com",
    healthPath: "/login",
    notes: "SSO / JWT — account directory lives on Game API users table.",
    dashPath: "/accounts",
  },
];

export const ENGINE_LABEL: Record<DbEngine, string> = {
  postgres: "Postgres",
  mysql: "MySQL",
  d1: "Cloudflare D1",
  r2: "R2 / CDN",
  "json-api": "JSON API",
  redis: "Redis",
  supabase: "Supabase",
  puter: "Puter KV",
  none: "None",
};

export const ROLE_LABEL: Record<DbRole, string> = {
  ssot: "SSOT",
  cache: "Cache",
  index: "Index",
  defs: "Defs",
  binary: "Binary",
  legacy: "Legacy",
  auth: "Auth",
};

export function databasesByGame(): Map<string, GameDatabase[]> {
  const map = new Map<string, GameDatabase[]>();
  for (const db of GAME_DATABASES) {
    const list = map.get(db.game) ?? [];
    list.push(db);
    map.set(db.game, list);
  }
  return map;
}
