/** Railway Postgres SSOT — canonical game API (replaces dead api.grudge-studio.com tunnel). */
export const GAME_API_BASE =
  import.meta.env.VITE_API_URL || "https://grudge-api-production-0d46.up.railway.app";

export const API = {
  auth: import.meta.env.VITE_AUTH_URL || "https://id.grudge-studio.com",
  api: GAME_API_BASE,
  /** Account/profile — same Railway game API (not deprecated api.grudge-studio.com) */
  account: import.meta.env.VITE_ACCOUNT_URL || GAME_API_BASE,
  survival: import.meta.env.VITE_SURVIVAL_API_URL || "https://survival-api-production.up.railway.app",
  launcher: import.meta.env.VITE_LAUNCHER_URL || "https://launcher.grudge-studio.com",
  ai: import.meta.env.VITE_AI_URL || "https://ai.grudge-studio.com",
  ws: import.meta.env.VITE_WS_URL || "wss://grudge-api-production-0d46.up.railway.app",
  colyseus: import.meta.env.VITE_COLYSEUS_URL || "https://grudge-api-production-0d46.up.railway.app",
  gameServers:
    import.meta.env.VITE_GAME_SERVERS_URL || "https://grudge-game-servers.grudge.workers.dev",
  assetsApi: "https://objectstore.grudge-studio.com",
  assetsCdn: "https://assets.grudge-studio.com",
  pvp: "https://grudge-pvp-server-production.up.railway.app",
  wallet: "https://wallet.grudge-studio.com",
  info: "https://info.grudge-studio.com",
} as const;

/** Role hierarchy — mirrors grudge-backend/server/auth.ts ROLE_LEVELS */
export const ROLE_LEVELS: Record<string, number> = {
  guest: 0,
  pleb: 1,
  member: 2,
  admin: 3,
  master: 4,
};

export function roleLevel(role?: string | null): number {
  if (!role) return 0;
  return ROLE_LEVELS[role] ?? 0;
}

/** Flagship games shown in the top launcher bar */
export interface FlagshipGame {
  id: "warlords" | "carrier" | "grudox";
  label: string;
  short: string;
  icon: string;
  /** Public entry / marketing URL */
  liveUrl: string;
  /** Playable client (when different from liveUrl) */
  playUrl?: string;
  dashPath: string;
  repo: string;
  description: string;
  apiBase?: keyof typeof API;
}

export const FLAGSHIP_GAMES: FlagshipGame[] = [
  {
    id: "warlords",
    label: "Warlords",
    short: "Warlords",
    icon: "⚔️",
    liveUrl: "https://grudgewarlords.com",
    dashPath: "/games/warlords",
    repo: "MolochDaGod/Grudge-Builder",
    description: "Souls-like MMO — craft, fight, build empires",
    apiBase: "api",
  },
  {
    id: "carrier",
    label: "Carrier",
    short: "Carrier",
    icon: "🛸",
    liveUrl: "https://armada.grudge-studio.com",
    dashPath: "/games/carrier",
    repo: "MolochDaGod/grim-armada-web",
    description: "Grim Armada — tactical carrier combat & colony ops",
    apiBase: "api",
  },
  {
    id: "grudox",
    label: "Grudox",
    short: "Grudox",
    icon: "◈",
    liveUrl: "https://grudox.grudge-studio.com",
    playUrl: "https://grudox.grudge-studio.com/warlords-shipwreck.html",
    dashPath: "/games/grudox",
    repo: "MolochDaGod/grudox",
    description:
      "Fleet hub + ARPG + Warlords shipwreck grudge6 select for open-world MMO — Grudge ID + Railway 0d46 characters",
    apiBase: "api",
  },
];

/**
 * Backend service inventory for /services health probes.
 * Best practices:
 *  - One row per *distinct* origin (don't duplicate api + account)
 *  - healthPath must return JSON or 2xx/401/403 (not marketing 404 HTML as "ok")
 *  - Prefer same-host /api/health over guessing /healthz
 */
export type ServiceLayer = "identity" | "game-api" | "realtime" | "assets" | "tools" | "edge";

export type ServiceKey =
  | "auth"
  | "api"
  | "survival"
  | "engine"
  | "launcher"
  | "ai"
  | "colyseus"
  | "pvp"
  | "game-servers"
  | "assets-api"
  | "assets-cdn"
  | "forge"
  | "open-api"
  | "wallet"
  | "info";

export interface ServiceDef {
  key: ServiceKey;
  name: string;
  /** Origin only (no path) */
  url: string;
  /** GET path for probe — absolute path on origin */
  healthPath: string;
  description: string;
  layer: ServiceLayer;
  /** Optional note shown on Services page */
  notes?: string;
}

export const SERVICES: ServiceDef[] = [
  {
    key: "auth",
    name: "Grudge ID",
    url: API.auth,
    healthPath: "/api/health",
    layer: "identity",
    description: "SSO gateway — JWT mint, OAuth, brand login",
    notes: "Canonical login host. Never use dead api.grudge-studio.com for auth. Probe /api/health, not /login HTML.",
  },
  {
    key: "api",
    name: "Game API (Railway 0d46)",
    url: API.api,
    healthPath: "/api/health",
    layer: "game-api",
    description: "Postgres SSOT — characters, account bag, island, wallet, economy",
    notes: "/api/account/* and /api/characters share this origin. Use /api/health (not /healthz).",
  },
  {
    key: "survival",
    name: "Nexus / Grudox API",
    url: API.survival,
    healthPath: "/api/healthz",
    layer: "game-api",
    description: "Survival-api — Nexus accounts, masks, engine manifest",
    notes: "Canonical host survival-api-production. Do not use Streamlit misdeploys.",
  },
  {
    key: "engine",
    name: "The-ENGINE (portal API)",
    url: "https://the-engine.up.railway.app",
    healthPath: "/api/health",
    layer: "game-api",
    description: "Rec0deD portal — scores, challenges, GBUX, chat",
    notes: "grudge-studio.com /api/* rewrites here for scores/leaderboards/auth pages.",
  },
  {
    key: "open-api",
    name: "Open same-origin API",
    url: "https://open.grudge-studio.com",
    healthPath: "/api/health",
    layer: "game-api",
    description: "Open/Danger health via Vercel → Railway rewrite",
    notes: "Browser clients must use same-origin /api/* on open.*",
  },
  {
    key: "colyseus",
    name: "Realtime (Colyseus / WS)",
    url: API.colyseus,
    healthPath: "/api/colyseus/health",
    layer: "realtime",
    description: "Authoritative rooms on grudge-api Railway process",
    notes: "Same host as Game API. /api/colyseus/health → matchMakerReady.",
  },
  {
    key: "pvp",
    name: "PvP lobby (Railway)",
    url: API.pvp,
    healthPath: "/health",
    layer: "realtime",
    description: "Socket.io 1v1 lobby — rooms, pick, ready, input relay",
    notes: "Repaired Aug 2026. Not Colyseus. world.grudge-studio.com is dead — do not use.",
  },
  {
    key: "wallet",
    name: "Wallet",
    url: API.wallet,
    healthPath: "/",
    layer: "identity",
    description: "wallet.grudge-studio.com — Grudge ID wallet shell",
  },
  {
    key: "info",
    name: "Info / guide",
    url: API.info,
    healthPath: "/grudge-guide.html",
    layer: "tools",
    description: "info.grudge-studio.com — Warlords guide + public docs",
  },
  {
    key: "game-servers",
    name: "Game Servers Worker",
    url: API.gameServers,
    healthPath: "/health",
    layer: "realtime",
    description: "Edge matchmake + lobby routing worker",
  },
  {
    key: "assets-api",
    name: "ObjectStore",
    url: API.assetsApi,
    healthPath: "/health",
    layer: "assets",
    description: "Catalog JSON, upload, metadata (D1 + R2)",
  },
  {
    key: "assets-cdn",
    name: "Assets CDN (R2)",
    url: API.assetsCdn,
    healthPath: "/js/grudge-fleet.js",
    layer: "assets",
    description: "Binary CDN — icons, GLB, fleet JS",
    notes: "Probe a real object path; root / may 404.",
  },
  {
    key: "ai",
    name: "AI Hub",
    url: API.ai,
    healthPath: "/health",
    layer: "tools",
    description: "ai.grudge-studio.com — Legion agents, BYOK",
  },
  {
    key: "forge",
    name: "GameForge",
    url: "https://forge.grudge-studio.com",
    healthPath: "/",
    layer: "tools",
    description: "Scene editor SPA (forge-api separate when bound)",
  },
  {
    key: "launcher",
    name: "Launcher",
    url: API.launcher,
    healthPath: "/",
    layer: "edge",
    description: "launcher.grudge-studio.com — game launcher shell",
  },
];

export const SERVICE_LAYER_LABEL: Record<ServiceLayer, string> = {
  identity: "Identity",
  "game-api": "Game APIs",
  realtime: "Realtime / rooms",
  assets: "Assets",
  tools: "Tools",
  edge: "Edge / shells",
};

/**
 * Player-facing game + product deployments (SPA / hubs).
 * healthPath should be a cheap GET that proves the app shell or API is live.
 */
export interface GameDeployment {
  id: string;
  name: string;
  icon: string;
  /** Public URL players open */
  liveUrl: string;
  /** Probe path on liveUrl origin */
  healthPath: string;
  /** Backend dependency keys from SERVICES */
  backends: ServiceKey[];
  repo?: string;
  dashPath?: string;
  tier: "flagship" | "combat" | "portal" | "studio" | "satellite";
  description: string;
}

export const GAME_DEPLOYMENTS: GameDeployment[] = [
  {
    id: "warlords",
    name: "Warlords",
    icon: "⚔️",
    liveUrl: "https://grudgewarlords.com",
    healthPath: "/",
    backends: ["auth", "api", "assets-cdn", "assets-api"],
    repo: "MolochDaGod/Grudge-Builder",
    dashPath: "/games/warlords",
    tier: "flagship",
    description: "Main MMO client — Railway characters + account bag",
  },
  {
    id: "client",
    name: "Client (home island)",
    icon: "🏝️",
    liveUrl: "https://client.grudge-studio.com",
    healthPath: "/",
    backends: ["auth", "api", "assets-cdn"],
    repo: "MolochDaGod/Grudge-Builder",
    tier: "flagship",
    description: "Foundry play handoff — zone / lobby / world",
  },
  {
    id: "grudox",
    name: "GRUDOX",
    icon: "◈",
    liveUrl: "https://grudox.grudge-studio.com",
    healthPath: "/",
    backends: ["auth", "api", "survival", "assets-cdn"],
    repo: "MolochDaGod/grudox",
    dashPath: "/games/grudox",
    tier: "flagship",
    description: "Fleet hub + shipwreck / Carrier edge WS",
  },
  {
    id: "open",
    name: "Open / Danger Room",
    icon: "🔥",
    liveUrl: "https://open.grudge-studio.com",
    healthPath: "/api/health",
    backends: ["auth", "api", "open-api", "assets-cdn", "engine"],
    repo: "MolochDaGod/gameopen",
    tier: "combat",
    description: "Combat labs + annihilate-demo grudge6",
  },
  {
    id: "portal",
    name: "Portal (Rec0deD)",
    icon: "🕹️",
    liveUrl: "https://grudge-studio.com",
    healthPath: "/api/health",
    backends: ["auth", "engine", "assets-cdn"],
    repo: "MolochDaGod/The-ENGINE",
    tier: "portal",
    description: "Retro library, PvP hub, leaderboards, Grudge Panel",
  },
  {
    id: "dash",
    name: "Studio Dashboard",
    icon: "📊",
    liveUrl: "https://dash.grudge-studio.com",
    healthPath: "/",
    backends: ["auth", "api"],
    repo: "MolochDaGod/grudge-studio-dash",
    tier: "studio",
    description: "Admin shell — accounts, game DBs, characters, Grudge Panel",
  },
  {
    id: "foundry",
    name: "Character Foundry",
    icon: "👤",
    liveUrl: "https://character.grudge-studio.com",
    healthPath: "/",
    backends: ["auth", "api", "assets-cdn"],
    tier: "studio",
    description: "Create-only heroes → 4-slot → client play",
  },
  {
    id: "forge",
    name: "GameForge",
    icon: "🔥",
    liveUrl: "https://forge.grudge-studio.com",
    healthPath: "/",
    backends: ["auth", "forge", "assets-api", "assets-cdn"],
    dashPath: "/games/tools",
    tier: "studio",
    description: "Three.js scene / map editor",
  },
  {
    id: "carrier",
    name: "Carrier / Armada",
    icon: "🛸",
    liveUrl: "https://armada.grudge-studio.com",
    healthPath: "/",
    backends: ["auth", "api"],
    repo: "MolochDaGod/grim-armada-web",
    dashPath: "/games/carrier",
    tier: "satellite",
    description: "Tactical carrier combat",
  },
  {
    id: "craft",
    name: "Warlords Craft",
    icon: "⚒️",
    liveUrl: "https://grudgewarlords.com/craft/",
    healthPath: "/",
    backends: ["auth", "api", "assets-api", "assets-cdn"],
    repo: "MolochDaGod/Grudge-Builder",
    dashPath: "/games/warlords",
    tier: "flagship",
    description: "Production craft suite — same-origin, not ui.grudge-studio.com",
  },
  {
    id: "island",
    name: "2D Home Island",
    icon: "🗺️",
    liveUrl: "https://grudgewarlords.com/island",
    healthPath: "/",
    backends: ["auth", "api", "assets-cdn"],
    repo: "MolochDaGod/Grudge-Builder",
    dashPath: "/games/warlords",
    tier: "flagship",
    description: "Seeded 2D island generator — /island?characterId=",
  },
  {
    id: "water",
    name: "Water / home island",
    icon: "🌊",
    liveUrl: "https://water.grudge-studio.com",
    healthPath: "/",
    backends: ["auth", "api", "assets-cdn"],
    tier: "satellite",
    description: "Warlords island water client",
  },
];

export const DEPLOY_TIER_LABEL: Record<GameDeployment["tier"], string> = {
  flagship: "Flagship",
  combat: "Combat labs",
  portal: "Portal",
  studio: "Studio tools",
  satellite: "Satellites",
};

export type AppCategory = "game" | "editor" | "tool" | "infra" | "web3";

export interface GrudgeApp {
  id: string;
  name: string;
  description: string;
  category: AppCategory;
  liveUrl: string;
  repo: string;
  icon: string;
  embeddable: boolean;
  backend: ("auth" | "api" | "account" | "ws" | "minio" | "none")[];
}

export const GRUDGE_APPS: GrudgeApp[] = [
  // ── Games ─────────────────────────────────────────────────
  {
    id: "grudge-wars-unity",
    name: "GrudgeWars Unity",
    description: "Unity WebGL build — 3D combat & open world",
    category: "game",
    liveUrl: "https://gruda-wars.vercel.app",
    repo: "MolochDaGod/GrudgeWars",
    icon: "🎮",
    embeddable: true,
    backend: ["api", "ws", "auth"],
  },
  {
    id: "starway-gruda",
    name: "StarWayGRUDA",
    description: "3D space / adventure web client",
    category: "game",
    liveUrl: "https://starwaygruda-webclient-as2n.vercel.app",
    repo: "MolochDaGod/starwaygruda-webclient",
    icon: "🚀",
    embeddable: true,
    backend: ["api", "auth"],
  },
  {
    id: "grudge-platform",
    name: "Grudge Platform",
    description: "Web3 hub — wallets, cNFTs, Grudge ID SSO",
    category: "web3",
    liveUrl: "https://apps.grudge-studio.com",
    repo: "MolochDaGod/grudge-platform",
    icon: "⛓️",
    embeddable: false,
    backend: ["api", "auth", "account"],
  },
  {
    id: "grudge-angeler",
    name: "Grudge Angeler",
    description: "Pixel art fishing adventure game",
    category: "game",
    liveUrl: "https://grudge-angeler.vercel.app",
    repo: "MolochDaGod/grudge-angeler",
    icon: "🎣",
    embeddable: true,
    backend: ["api", "auth"],
  },
  {
    id: "rpg-modular",
    name: "RPG Modular",
    description: "Modular RPG game engine prototype",
    category: "game",
    liveUrl: "",
    repo: "MolochDaGod/rpg-modular",
    icon: "🗡️",
    embeddable: false,
    backend: ["none"],
  },
  // ── Editors ───────────────────────────────────────────────
  {
    id: "grudge-gameforge",
    name: "Grudge GameForge",
    description: "Three.js scene editor — Rapier physics, dual AI assistant, navmesh, Monaco code editor, embeddable player",
    category: "editor",
    liveUrl: "https://forge.grudge-studio.com",
    repo: "MolochDaGod/Grudge-Studio-Forge",
    icon: "🔥",
    embeddable: false,
    backend: ["api", "auth", "minio"],
  },
  {
    id: "gdevelop-assistant",
    name: "GDevelop Assistant",
    description: "Full development editor — models, assets, DB, deploy",
    category: "editor",
    liveUrl: "https://gdevelop-assistant.vercel.app",
    repo: "MolochDaGod/GDevelopAssistant",
    icon: "🛠️",
    embeddable: true,
    backend: ["api", "auth", "minio"],
  },
  {
    id: "grudge-engine-web",
    name: "Grudge Engine Web",
    description: "BabylonJS 3D editor — PBR, particles, combat, AI rig",
    category: "editor",
    liveUrl: "https://grudge-engine-web.vercel.app",
    repo: "MolochDaGod/Grudge-Engine-Web",
    icon: "🌐",
    embeddable: true,
    backend: ["api", "minio"],
  },
  {
    id: "grudge-builder",
    name: "Grudge Builder",
    description: "Character, item & world building tool",
    category: "editor",
    liveUrl: "https://grudgewarlords.com",
    repo: "MolochDaGod/Grudge-Builder",
    icon: "🏗️",
    embeddable: true,
    backend: ["api"],
  },
  {
    id: "warlord-crafting-suite",
    name: "Warlord Crafting Suite",
    description: "Crafting system UI — recipes, materials, progression",
    category: "editor",
    liveUrl: "https://grudgewarlords.com/craft/",
    repo: "MolochDaGod/Warlord-Crafting-Suite",
    icon: "⚒️",
    embeddable: true,
    backend: ["api", "auth"],
  },
  // ── Tools ─────────────────────────────────────────────────
  {
    id: "object-store",
    name: "ObjectStore",
    description: "Public game data API — weapons, materials, armor, icons",
    category: "tool",
    liveUrl: "https://objectstore.grudge-studio.com",
    repo: "MolochDaGod/ObjectStore",
    icon: "📦",
    embeddable: true,
    backend: ["minio"],
  },
  {
    id: "grudge-studio-npm",
    name: "GrudgeStudioNPM",
    description: "Shared npm package & tools for Grudge ecosystem",
    category: "tool",
    liveUrl: "https://www.npmjs.com/package/grudge-studio",
    repo: "MolochDaGod/GrudgeStudioNPM",
    icon: "📚",
    embeddable: true,
    backend: ["none"],
  },
  // ── Infrastructure ────────────────────────────────────────
  {
    id: "grudge-studio-mono",
    name: "Grudge Studio Monorepo",
    description: "Main monorepo — WCS, database, API server",
    category: "infra",
    liveUrl: "https://grudgewarlords.com",
    repo: "MolochDaGod/grudge-studio",
    icon: "🏛️",
    embeddable: false,
    backend: ["api", "auth", "account", "ws", "minio"],
  },
  {
    id: "grudge-backend",
    name: "Grudge Backend (unified API)",
    description: "Auth gateway id.grudge-studio.com · game API Railway grudge-api (dead: api.grudge-studio.com)",
    category: "infra",
    liveUrl: "https://id.grudge-studio.com",
    repo: "MolochDaGod/grudge-backend",
    icon: "🖥️",
    embeddable: false,
    backend: ["api", "auth", "account", "ws", "minio"],
  },
  {
    id: "grudge-dash",
    name: "Grudge Studio Dashboard",
    description:
      "Admin dashboard — left nav + right Grudge Panel (account, studio shortcuts, portal games). Merged with portal panel UX.",
    category: "infra",
    liveUrl: "https://dash.grudge-studio.com",
    repo: "MolochDaGod/grudge-studio-dash",
    icon: "📊",
    embeddable: false,
    backend: ["api", "auth"],
  },
  // ── Web3 / Chain ──────────────────────────────────────────
  {
    id: "grudachain",
    name: "GrudaChain",
    description: "Free AI node system — GRUDA Legion v3.0",
    category: "web3",
    liveUrl: "https://grudachain-rho.vercel.app",
    repo: "MolochDaGod/grudachain",
    icon: "⛓️",
    embeddable: true,
    backend: ["api"],
  },
];

// Backward compat — old PROJECTS maps from GRUDGE_APPS
export type ProjectDef = GrudgeApp;
export const PROJECTS = GRUDGE_APPS;
