/**
 * Canonical Grudge Studio asset URLs for the admin dashboard.
 * Prefer assets.grudge-studio.com (R2) and id brand marks — never invent local-only art.
 */

export const ASSETS_CDN = "https://assets.grudge-studio.com";
export const OBJECTSTORE = "https://objectstore.grudge-studio.com";
export const ID_HUB = "https://id.grudge-studio.com";

/** Brand mark (gold helmet medallion) — also hosted on ID hub */
export const BRAND_LOGO =
  typeof window !== "undefined"
    ? "/grudge-id-logo.png"
    : `${ID_HUB}/grudge-id-logo.png`;

export const BRAND_LOGO_REMOTE = `${ID_HUB}/grudge-id-logo.png`;

/** Common CDN icon paths used across fleet tools */
export const CANONICAL_ICONS = {
  packSword: `${ASSETS_CDN}/icons/pack/weapons/Sword_01.png`,
  bloodfeudBlade: `${ASSETS_CDN}/icons/weapons/bloodfeud-blade.png`,
  fleetJs: `${ASSETS_CDN}/js/grudge-fleet.js`,
} as const;

/** Race / character preview models (GLB) when available on CDN or local public */
export const RACE_MODELS = {
  human: "/models/characters/human.glb",
  orc: "/models/characters/orc.glb",
  elf: "/models/characters/elf.glb",
  undead: "/models/characters/undead.glb",
  barbarian: "/models/characters/barbarian.glb",
  dwarf: "/models/characters/dwarf.glb",
} as const;

export type EngineKind =
  | "postgres"
  | "mysql"
  | "neon"
  | "supabase"
  | "d1"
  | "r2"
  | "kv"
  | "puter"
  | "json-api"
  | "none";

export const ENGINE_META: Record<
  EngineKind | string,
  { label: string; color: string; icon: string }
> = {
  neon: { label: "Neon Postgres", color: "text-success", icon: "◆" },
  postgres: { label: "PostgreSQL", color: "text-success", icon: "◆" },
  mysql: { label: "MySQL (legacy)", color: "text-warning", icon: "▣" },
  supabase: { label: "Supabase", color: "text-success", icon: "◇" },
  d1: { label: "Cloudflare D1", color: "text-primary", icon: "☁" },
  r2: { label: "Cloudflare R2", color: "text-primary", icon: "📦" },
  kv: { label: "Cloudflare KV", color: "text-primary", icon: "⚡" },
  puter: { label: "Puter (cache)", color: "text-muted-foreground", icon: "☁" },
  "json-api": { label: "JSON / HTTP API", color: "text-foreground", icon: "↗" },
  none: { label: "No DB", color: "text-muted-foreground", icon: "—" },
};

/** Safe absolute icon URL with CDN fallback */
export function assetUrl(path: string): string {
  if (!path) return BRAND_LOGO;
  if (/^https?:\/\//i.test(path)) return path;
  const p = path.startsWith("/") ? path.slice(1) : path;
  return `${ASSETS_CDN}/${p}`;
}
