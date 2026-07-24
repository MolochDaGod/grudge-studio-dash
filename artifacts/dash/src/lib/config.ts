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

export type ServiceKey =
  | "auth"
  | "api"
  | "account"
  | "survival"
  | "launcher"
  | "ai"
  | "ws"
  | "colyseus"
  | "game-servers"
  | "assets-api"
  | "assets-cdn"
  | "forge-api";

export interface ServiceDef {
  key: ServiceKey;
  name: string;
  url: string;
  description: string;
}

export const SERVICES: ServiceDef[] = [
  { key: "auth", name: "Grudge ID", url: API.auth, description: "id.grudge-studio.com — Login, JWT, OAuth, brand logo" },
  { key: "api", name: "Game API (Railway)", url: API.api, description: "Postgres SSOT — characters, islands, wallet, inventory, economy" },
  { key: "account", name: "Account (Railway)", url: API.account, description: "Same Railway origin — /api/account/* profiles & bag" },
  { key: "survival", name: "Nexus API", url: API.survival, description: "Grudox / Nexus era — accounts, masks, world saves" },
  { key: "launcher", name: "Launcher", url: API.launcher, description: "launcher.grudge-studio.com — Game launcher" },
  { key: "ai", name: "AI Hub", url: API.ai, description: "ai.grudge-studio.com — Legion agents, Gemini BYOK" },
  { key: "ws", name: "Realtime (Railway WS)", url: API.ws.replace("wss://", "https://"), description: "Colyseus / fleet realtime on grudge-api" },
  { key: "colyseus", name: "Colyseus", url: API.colyseus, description: "Authoritative multiplayer rooms (Railway)" },
  { key: "game-servers", name: "Game Servers Worker", url: API.gameServers, description: "Edge matchmake + lobby routing" },
  { key: "assets-api", name: "ObjectStore", url: API.assetsApi, description: "Catalog JSON, upload, metadata (D1 + R2)" },
  { key: "assets-cdn", name: "Assets CDN", url: API.assetsCdn, description: "assets.grudge-studio.com — icons, models, audio (R2)" },
  { key: "forge-api", name: "GameForge API", url: "https://forge-api.grudge-studio.com", description: "Scene editor backend, AI, R2, navmesh" },
];

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
    liveUrl: "https://molochdagod.github.io/Grudge-Builder",
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
    liveUrl: "https://warlord-crafting-suite.vercel.app",
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
    liveUrl: "https://molochdagod.github.io/ObjectStore",
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
    liveUrl: "https://molochdagod.github.io/GrudgeStudioNPM",
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
