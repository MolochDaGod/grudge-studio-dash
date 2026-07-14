/**
 * Live D1 asset_registry browser client.
 * SSOT endpoint: https://api.grudge-studio.com/assets (grudge-assets-db)
 * Binaries: https://assets.grudge-studio.com/{r2Key}
 */

export const ASSET_REGISTRY_API = "https://api.grudge-studio.com";
export const ASSETS_CDN = "https://assets.grudge-studio.com";

export interface RegistryAsset {
  id: string;
  grudgeUuid: string;
  name: string;
  category: string;
  r2Key: string;
  cdnUrl: string;
  fileSize?: number | null;
  sourceSet?: string | null;
  format?: string | null;
  mimeType?: string | null;
  sourceHash?: string | null;
  sourcePath?: string | null;
  boneMap?: string | null;
  scaleProfile?: string | null;
  weaponType?: string | null;
  supportedSkeletons?: string[] | null;
  metadata?: Record<string, unknown> | null;
  updatedAt?: number | null;
  createdAt?: number | null;
}

export interface AssetsPageResponse {
  assets: RegistryAsset[];
  total: number;
  limit: number;
  offset: number;
}

export interface AssetCatalogStats {
  total: number;
  byCategory: Record<string, number>;
  byFormat: Record<string, number>;
  bySourceSet: Record<string, number>;
  totalBytes: number;
}

const PAGE_SIZE = 100;

/** Fetch one page from the live registry API. */
export async function fetchAssetsPage(
  offset = 0,
  limit = PAGE_SIZE,
): Promise<AssetsPageResponse> {
  const url = `${ASSET_REGISTRY_API}/assets?limit=${limit}&offset=${offset}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(20_000) });
  if (!res.ok) throw new Error(`Asset registry ${res.status}: ${res.statusText}`);
  return res.json();
}

/**
 * Load the full catalog in pages. Calls onProgress after each page.
 * ~6k rows fits comfortably in memory for client-side filter/search.
 */
export async function fetchAllAssets(
  onProgress?: (loaded: number, total: number) => void,
): Promise<RegistryAsset[]> {
  const first = await fetchAssetsPage(0, PAGE_SIZE);
  const total = first.total ?? first.assets.length;
  const all: RegistryAsset[] = [...first.assets];
  onProgress?.(all.length, total);

  let offset = first.assets.length;
  while (offset < total) {
    const page = await fetchAssetsPage(offset, PAGE_SIZE);
    if (!page.assets?.length) break;
    all.push(...page.assets);
    offset += page.assets.length;
    onProgress?.(all.length, total);
    // Safety: avoid infinite loop if API misbehaves
    if (page.assets.length < PAGE_SIZE && all.length >= total) break;
    if (all.length > total + PAGE_SIZE) break;
  }
  return all;
}

export function computeStats(assets: RegistryAsset[]): AssetCatalogStats {
  const byCategory: Record<string, number> = {};
  const byFormat: Record<string, number> = {};
  const bySourceSet: Record<string, number> = {};
  let totalBytes = 0;

  for (const a of assets) {
    const cat = (a.category || "unknown").toLowerCase();
    const fmt = (a.format || extFromKey(a.r2Key) || "unknown").toLowerCase();
    const src = a.sourceSet || "unknown";
    byCategory[cat] = (byCategory[cat] ?? 0) + 1;
    byFormat[fmt] = (byFormat[fmt] ?? 0) + 1;
    bySourceSet[src] = (bySourceSet[src] ?? 0) + 1;
    totalBytes += a.fileSize ?? 0;
  }

  return { total: assets.length, byCategory, byFormat, bySourceSet, totalBytes };
}

export function extFromKey(key?: string | null): string {
  if (!key) return "";
  const i = key.lastIndexOf(".");
  return i >= 0 ? key.slice(i + 1).toLowerCase() : "";
}

export function isImageAsset(a: RegistryAsset): boolean {
  const fmt = (a.format || extFromKey(a.r2Key) || "").toLowerCase();
  return ["png", "jpg", "jpeg", "webp", "gif", "svg"].includes(fmt);
}

export function isModelAsset(a: RegistryAsset): boolean {
  const fmt = (a.format || extFromKey(a.r2Key) || "").toLowerCase();
  return ["glb", "gltf", "fbx", "obj"].includes(fmt);
}

export function isAudioAsset(a: RegistryAsset): boolean {
  const fmt = (a.format || extFromKey(a.r2Key) || "").toLowerCase();
  return ["wav", "mp3", "ogg", "m4a"].includes(fmt);
}

export function formatBytes(n?: number | null): string {
  if (n == null || Number.isNaN(n)) return "—";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  return `${(n / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export function categoryIcon(category: string): string {
  switch ((category || "").toLowerCase()) {
    case "character":
      return "⚔";
    case "monster":
    case "creature":
      return "👹";
    case "weapon":
      return "🗡";
    case "animation":
      return "🎞";
    case "environment":
    case "terrain":
    case "nature":
      return "🏔";
    case "building":
      return "🏰";
    case "audio":
    case "sound":
      return "🔊";
    case "texture":
      return "🎨";
    case "item":
    case "prop":
      return "📦";
    case "spell":
      return "✨";
    case "font":
      return "Aa";
    default:
      return "◆";
  }
}

export function cdnUrlFor(a: RegistryAsset): string {
  if (a.cdnUrl) return a.cdnUrl;
  if (a.r2Key) return `${ASSETS_CDN}/${a.r2Key.replace(/^\//, "")}`;
  return ASSETS_CDN;
}

export interface AssetFilters {
  search: string;
  category: string; // "" = all
  format: string;
  sourceSet: string;
}

export function filterAssets(assets: RegistryAsset[], f: AssetFilters): RegistryAsset[] {
  const q = f.search.trim().toLowerCase();
  return assets.filter((a) => {
    if (f.category && (a.category || "").toLowerCase() !== f.category.toLowerCase()) return false;
    if (f.format) {
      const fmt = (a.format || extFromKey(a.r2Key) || "").toLowerCase();
      if (fmt !== f.format.toLowerCase()) return false;
    }
    if (f.sourceSet && (a.sourceSet || "") !== f.sourceSet) return false;
    if (!q) return true;
    const hay = [
      a.name,
      a.r2Key,
      a.id,
      a.grudgeUuid,
      a.category,
      a.sourceSet,
      a.format,
      a.weaponType,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return hay.includes(q);
  });
}

export function sortedKeys(counts: Record<string, number>): string[] {
  return Object.keys(counts).sort((a, b) => (counts[b] ?? 0) - (counts[a] ?? 0) || a.localeCompare(b));
}
