/**
 * Grudge Studio Railway fleet — project/service inventory.
 * Updated from CLI links (~/.railway/config.json), deploy notifications, and live probes.
 * Canonical Nexus API: survival-api-production.up.railway.app (survival repo Dockerfile).
 */

export type RailwayFleetStatus =
  | "canonical"   // production — keep
  | "active"      // running but non-canonical / review routing
  | "failing"     // repeated build failures
  | "misdeployed" // wrong artifact (HTML/Streamlit instead of API)
  | "phantom"     // monorepo auto-service — delete
  | "experimental"// prototype — delete or archive if unused
  | "deprecated"; // superseded — safe to remove

export interface RailwayFleetEntry {
  id: string;
  project: string;
  service: string;
  /** Best-known production hostname (may differ from project slug). */
  hostname?: string;
  healthPath?: string;
  repo?: string;
  game?: string;
  purpose: string;
  status: RailwayFleetStatus;
  action: string;
  notes?: string;
}

export const RAILWAY_FLEET: RailwayFleetEntry[] = [
  {
    id: "nexus-api",
    project: "zealous-love",
    service: "api-server",
    hostname: "survival-api-production.up.railway.app",
    healthPath: "/api/healthz",
    repo: "MolochDaGod/survival",
    game: "Grudox / Grudge Nexus",
    purpose:
      "Canonical Nexus API — accounts, characters, prefabs, engine manifest, masks, assistant, co-op WebSocket. Deploy from survival/ via Dockerfile only.",
    status: "canonical",
    action: "KEEP — redeploy after railway login: cd survival && railway link && railway up",
    notes: "Vercel grudox/grudges proxy /api/* here. Needs redeploy for /api/engine/manifest.",
  },
  {
    id: "nexus-api-alias-wrong",
    project: "zealous-love",
    service: "(unknown — Streamlit)",
    hostname: "zealous-love-production.up.railway.app",
    healthPath: "/api/healthz",
    purpose: "Misdeployed Streamlit app on the zealous-love hostname — not the Nexus API.",
    status: "misdeployed",
    action: "DELETE service or stop deploys from wrong repo root",
    notes: "Returns Streamlit HTML. Do not point DNS or Vercel here.",
  },
  {
    id: "grudge-nexus-api-wrong",
    project: "grudge-studio-api",
    service: "grudge-nexus-api",
    hostname: "grudge-nexus-api-production.up.railway.app",
    healthPath: "/api/healthz",
    purpose: "Serves marketing HTML, not JSON API — phantom duplicate of Nexus frontend.",
    status: "misdeployed",
    action: "DELETE — superseded by survival-api-production",
    notes: "/api/engine/manifest returns HTML, not EngineManifest JSON.",
  },
  {
    id: "pvp-server",
    project: "grudge-pvp-server",
    service: "grudge-pvp-server",
    hostname: "grudge-pvp-server-production.up.railway.app",
    healthPath: "/health",
    purpose: "Dedicated PvP lobby server — waiting/in-progress games, player counts.",
    status: "active",
    action: "KEEP if Warlords/PvP still uses it; else migrate to VPS ws/game-api",
    notes: "Live 200 on /health with lobby stats JSON.",
  },
  {
    id: "warlords-builder",
    project: "grudge-warlords-db",
    service: "Grudge-Builder",
    hostname: "grudge-warlords-db-production.up.railway.app",
    repo: "MolochDaGod/Grudge-Builder",
    game: "Warlords",
    purpose: "Legacy Warlords builder / DB API (Nixpacks). Repeated build failures.",
    status: "failing",
    action: "FIX build from Grudge-Builder repo OR delete — CLI linked to C:\\Users\\david (wrong root)",
    notes: "Notification spam: 'Deployment failed to build'. Unlink home directory from this project.",
  },
  {
    id: "warlords-rpg",
    project: "grudge-warlords-rpg",
    service: "grudge-warlords-rpg",
    repo: "MolochDaGod/grudge-studio-backend (audit)",
    game: "Warlords",
    purpose: "Experimental Warlords RPG Railway backend — separate from VPS game-api.",
    status: "experimental",
    action: "REVIEW — consolidate on api.grudge-studio.com or delete",
  },
  {
    id: "rts-grudge",
    project: "rts-grudge",
    service: "rts-grudge-server",
    hostname: "rts-grudge-production.up.railway.app",
    purpose: "RTS Grudge headless server prototype.",
    status: "deprecated",
    action: "DELETE if unused — 404 on production hostname",
  },
  {
    id: "voxgrudge",
    project: "voxgrudge-grudox-room",
    service: "voxgrudge",
    purpose: "Voxel Grudox room experiment — build failing.",
    status: "failing",
    action: "DELETE or fix from correct repo; Grudox client is on Vercel survival build",
  },
  {
    id: "phantom-arpg",
    project: "merry-vision",
    service: "@workspace/arpg-game",
    repo: "MolochDaGod/survival",
    purpose: "Phantom — Railway monorepo scanner auto-created Vite game service.",
    status: "phantom",
    action: "DELETE immediately — game deploys via Vercel, not Railway",
  },
  {
    id: "phantom-api",
    project: "glistening-benevolence",
    service: "@workspace/api-server",
    repo: "MolochDaGod/survival",
    purpose: "Phantom — duplicate api-server service from old monorepo link.",
    status: "phantom",
    action: "DELETE — use zealous-love / survival-api-production only",
  },
  {
    id: "phantom-game",
    project: "glistening-benevolence",
    service: "@workspace/grudge-studio-game",
    purpose: "Phantom — legacy grudge-studio-game package service.",
    status: "phantom",
    action: "DELETE",
  },
  {
    id: "gruda-legion",
    project: "gruda-legion",
    service: "gruda-legion",
    repo: "MolochDaGod/grudachain",
    purpose: "GrudaChain / GRUDA Legion node (Web3 AI node system).",
    status: "experimental",
    action: "KEEP only if chain nodes still hosted on Railway",
  },
  {
    id: "dudegolf",
    project: "DudeGolf",
    service: "(unlinked)",
    purpose: "Stale Railway project — linked from grudge-studio-backend desktop path.",
    status: "deprecated",
    action: "DELETE or rename — unrelated to Grudge fleet",
  },
];

export interface RailwayProbeResult {
  id: string;
  ok: boolean;
  ms: number;
  contentType?: string;
  snippet?: string;
  error?: string;
}

export async function probeRailwayEntry(entry: RailwayFleetEntry): Promise<RailwayProbeResult> {
  if (!entry.hostname || !entry.healthPath) {
    return { id: entry.id, ok: false, ms: 0, error: "no hostname" };
  }
  const url = `https://${entry.hostname}${entry.healthPath}`;
  const start = performance.now();
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    const ct = res.headers.get("content-type") ?? "";
    const text = await res.text();
    const jsonOk = ct.includes("json") || text.trimStart().startsWith("{");
    const ok = res.ok && jsonOk;
    return {
      id: entry.id,
      ok,
      ms: Math.round(performance.now() - start),
      contentType: ct,
      snippet: text.slice(0, 120),
      error: ok ? undefined : res.ok ? "non-JSON response" : `HTTP ${res.status}`,
    };
  } catch (e) {
    return {
      id: entry.id,
      ok: false,
      ms: Math.round(performance.now() - start),
      error: String(e),
    };
  }
}

export async function probeRailwayFleet(): Promise<RailwayProbeResult[]> {
  const probeable = RAILWAY_FLEET.filter((e) => e.hostname && e.healthPath);
  return Promise.all(probeable.map(probeRailwayEntry));
}

export const RAILWAY_STATUS_LABEL: Record<RailwayFleetStatus, string> = {
  canonical: "Canonical",
  active: "Active",
  failing: "Build failing",
  misdeployed: "Misdeployed",
  phantom: "Phantom — delete",
  experimental: "Experimental",
  deprecated: "Deprecated",
};