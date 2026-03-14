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

export interface ProjectDef {
  id: string;
  name: string;
  description: string;
  liveUrl: string;
  repo: string;
  icon: string;
  category: "game" | "tool";
}

export const PROJECTS: ProjectDef[] = [
  {
    id: "unity-game",
    name: "Unity Game",
    description: "GrudgeWars Unity WebGL build — 3D combat & world",
    liveUrl: "https://gruda-wars.vercel.app",
    repo: "MolochDaGod/GrudgeWars",
    icon: "🎮",
    category: "game",
  },
  {
    id: "grudge-wars",
    name: "Grudge Wars",
    description: "Main Grudge Warlords crafting suite & gameplay",
    liveUrl: "https://grudgewarlords.com",
    repo: "MolochDaGod/grudge-studio",
    icon: "⚔️",
    category: "game",
  },
  {
    id: "angeler",
    name: "Grudge Angeler",
    description: "Pixel art fishing adventure game",
    liveUrl: "https://grudge-angeler.vercel.app",
    repo: "MolochDaGod/grudge-angeler",
    icon: "🎣",
    category: "game",
  },
  {
    id: "gdevelop",
    name: "GDevelop Games",
    description: "GDevelop-based game projects",
    liveUrl: "",
    repo: "",
    icon: "🕹️",
    category: "game",
  },
  {
    id: "builder",
    name: "Grudge Builder",
    description: "Character, item & world building tool",
    liveUrl: "https://molochdagod.github.io/Grudge-Builder",
    repo: "MolochDaGod/Grudge-Builder",
    icon: "🏗️",
    category: "tool",
  },
  {
    id: "npm",
    name: "GrudgeStudioNPM",
    description: "Shared npm package for Grudge tools",
    liveUrl: "https://molochdagod.github.io/GrudgeStudioNPM",
    repo: "MolochDaGod/GrudgeStudioNPM",
    icon: "📦",
    category: "tool",
  },
];
