export const API = {
  auth: import.meta.env.VITE_AUTH_URL || "https://id.grudge-studio.com",
  api: import.meta.env.VITE_API_URL || "https://api.grudge-studio.com",
  account: import.meta.env.VITE_ACCOUNT_URL || "https://account.grudge-studio.com",
  launcher: import.meta.env.VITE_LAUNCHER_URL || "https://launcher.grudge-studio.com",
  ws: import.meta.env.VITE_WS_URL || "wss://ws.grudge-studio.com",
  minio: import.meta.env.VITE_MINIO_URL || "https://storage.grudge-studio.com",
} as const;

export type ServiceKey = "auth" | "api" | "account" | "launcher" | "ws";

export interface ServiceDef {
  key: ServiceKey;
  name: string;
  url: string;
  description: string;
}

export const SERVICES: ServiceDef[] = [
  { key: "auth", name: "Auth Gateway", url: API.auth, description: "id.grudge-studio.com — Authentication & sessions" },
  { key: "api", name: "Game API", url: API.api, description: "api.grudge-studio.com — Characters, items, crafting, islands" },
  { key: "account", name: "Account API", url: API.account, description: "account.grudge-studio.com — Cross-ecosystem accounts" },
  { key: "launcher", name: "Launcher", url: API.launcher, description: "launcher.grudge-studio.com — Game launcher service" },
  { key: "ws", name: "WebSocket", url: `https://${API.ws.replace("wss://", "")}`, description: "ws.grudge-studio.com — Real-time events" },
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
    description: "Core Gruda game platform & login",
    category: "game",
    liveUrl: "https://www.grudgeplatform.com/login",
    repo: "MolochDaGod/grudge-platform",
    icon: "⚔️",
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
    name: "Grudge Studio Backend",
    description: "VPS backend — Grudge ID, wallet, game API, Nginx, CI/CD",
    category: "infra",
    liveUrl: "",
    repo: "MolochDaGod/grudge-studio-backend",
    icon: "🖥️",
    embeddable: false,
    backend: ["api", "auth", "account", "ws", "minio"],
  },
  {
    id: "grudge-dash",
    name: "Grudge Studio Dashboard",
    description: "Admin dashboard — this app",
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
