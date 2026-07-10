/**
 * /assets — Canonical data-layer hub
 *
 * One-truth map for dash: Railway Postgres (runtime) · ObjectStore (definitions) ·
 * R2 CDN (binaries) · D1 (asset registry only) · Puter crafting/GS app (cache + UI).
 */
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import TopBar from "../components/TopBar";
import { StatCard } from "../components/Cards";
import { API, GAME_API_BASE } from "../lib/config";
import { ASSETS_CDN, OBJECTSTORE, ENGINE_META } from "../lib/assets";
import { checkHealth, type HealthResult } from "../lib/api";

// ── SSOT topology (canonical) ───────────────────────────────────────────

type LayerRole = "ssot" | "definitions" | "binaries" | "registry" | "cache" | "dead";

interface DataLayer {
  id: string;
  name: string;
  engine: keyof typeof ENGINE_META | string;
  role: LayerRole;
  url: string;
  holds: string[];
  never: string[];
  status: "live" | "partial" | "stale" | "dead";
}

const LAYERS: DataLayer[] = [
  {
    id: "railway",
    name: "Railway Postgres (GAME_DATA)",
    engine: "postgres",
    role: "ssot",
    url: GAME_API_BASE,
    holds: [
      "users + accounts (grudge_id)",
      "characters (UUID, grudge_code, professions, equipment, progress)",
      "account_inventory + account_resources (shared bag)",
      "home_islands (seed / state)",
      "player_ships, world_zones, wallet, GBUX",
    ],
    never: ["GLB/FBX blobs", "recipe/item definition catalogs"],
    status: "live",
  },
  {
    id: "objectstore",
    name: "ObjectStore definitions",
    engine: "json-api",
    role: "definitions",
    url: OBJECTSTORE,
    holds: [
      "master-recipes.json",
      "master-items.json / master-materials.json",
      "professions.json",
      "weapons / races / biomes catalogs",
    ],
    never: ["player XP", "inventory quantities", "island seeds"],
    status: "live",
  },
  {
    id: "r2",
    name: "R2 CDN binaries",
    engine: "r2",
    role: "binaries",
    url: ASSETS_CDN,
    holds: ["icons/", "models/", "nature/", "js/grudge-fleet.js", "audio"],
    never: ["JWT sessions", "character rows"],
    status: "live",
  },
  {
    id: "d1-assets",
    name: "D1 asset_registry",
    engine: "d1",
    role: "registry",
    url: "Cloudflare D1 (grudge-assets-db / ObjectStore)",
    holds: ["asset_registry (r2_key → uuid)", "gamedata_versions", "search index"],
    never: ["characters as SSOT", "home_islands", "account bag"],
    status: "partial",
  },
  {
    id: "d1-backend",
    name: "D1 grudge-backend-db (legacy)",
    engine: "d1",
    role: "dead",
    url: "historical Workers game-state",
    holds: ["old character/island experiments"],
    never: ["new writes — prefer Railway"],
    status: "stale",
  },
  {
    id: "puter",
    name: "Puter KV / hosting",
    engine: "puter",
    role: "cache",
    url: "https://grudge-crafting.puter.site",
    holds: [
      "grudge-crafting UI host",
      "optional KV mirror (grudge-crafting-save)",
      "puter.com/app/warlords shell → grudgewarlords.com",
    ],
    never: ["sole character roster", "sole inventory truth"],
    status: "live",
  },
];

const ROLE_STYLE: Record<LayerRole, string> = {
  ssot: "bg-success/20 text-success",
  definitions: "bg-primary/20 text-primary",
  binaries: "bg-violet-500/20 text-violet-300",
  registry: "bg-cyan-500/20 text-cyan-300",
  cache: "bg-muted text-muted-foreground",
  dead: "bg-danger/20 text-danger",
};

// Railway tables that must exist for complete system
const RAILWAY_REQUIRED = [
  { table: "users", purpose: "Auth identity + grudge_id" },
  { table: "accounts", purpose: "Profile, GBUX, home island link" },
  { table: "characters", purpose: "Hero UUID + progress JSONB" },
  { table: "account_inventory", purpose: "Shared bag (crafting)" },
  { table: "account_resources", purpose: "Shared mats / resources" },
  { table: "home_islands", purpose: "1024m island seed SSOT" },
  { table: "player_ships", purpose: "Ocean / sail loadouts" },
  { table: "character_professions", purpose: "Normalized profession rows (optional dual)" },
  { table: "uuid_ledger", purpose: "Cross-game UUID ledger" },
  { table: "gbux_transactions", purpose: "Economy audit" },
];

// ObjectStore packs crafting + dash need
const DEFINITION_PACKS = [
  "master-recipes.json",
  "master-items.json",
  "master-materials.json",
  "professions.json",
  "weapons.json",
  "home-island-contract.json",
  "biome-ecosystems.json",
  "games-library.json",
];

// Gaps to close for "canonical complete"
const GAPS = [
  {
    id: "dual-char-uuid",
    severity: "high",
    title: "Two character identity systems",
    detail:
      "Railway characters.id (UUID) is Warlords/crafting SSOT. RTS-Grudge player_characters (char_nanoid) is a parallel registry. Join only via grudge_id / accountId — never assume one table.",
    action: "GCS + Warlords write Railway only; RTS proxies /api/characters → Railway in prod",
  },
  {
    id: "dual-asset-uuid",
    severity: "high",
    title: "Two asset UUID schemes",
    detail:
      "D1 asset_registry (deterministic sha1 of r2_key) vs grudge-backend assets (HERO-/EQIP-/ITEM-). Dash Assets must show which registry is truth for a path.",
    action: "Prefer ObjectStore + R2 path as public truth; D1 registry is index only",
  },
  {
    id: "inventory-json-vs-table",
    severity: "medium",
    title: "characters.inventory JSONB vs account_inventory",
    detail:
      "Character-scoped inventory JSONB is legacy. Crafting must use account_inventory / account_resources. Migration: empty char inventory for new rows; UI reads account bag only.",
    action: "Crafting already prefers account bag — enforce server-side rejects on char inventory writes for mats",
  },
  {
    id: "profession-dual",
    severity: "medium",
    title: "profession_levels JSONB vs character_professions table",
    detail:
      "Progress SSOT uses characters.profession_levels + skill_loadouts.__progress revision. character_professions table exists for decay analytics — keep in sync or mark read-only.",
    action: "POST /api/characters/:id/progress remains sole write path for XP",
  },
  {
    id: "migration-006",
    severity: "medium",
    title: "grudge_code column rollout",
    detail:
      "migrations/006_character_grudge_code.sql must be applied on Railway. Display codes GRDG-* separate from UUID and account grudge_id.",
    action: "Run migration on Railway; backfill from legacy name rows",
  },
  {
    id: "d1-not-islands",
    severity: "high",
    title: "D1 is not island SSOT",
    detail:
      "home_islands lives only on Railway. D1/R2 hold meshes + catalog — never island seeds.",
    action: "Remove any dash/docs that imply D1 island rows",
  },
  {
    id: "dead-api-tunnel",
    severity: "low",
    title: "api.grudge-studio.com is dead (fixed on dash)",
    detail:
      "Dash admin + Accounts now use GAME_API_BASE (Railway). Do not reintroduce the VPS tunnel.",
    action: "Keep vercel.json rewrites → Railway only",
  },
  {
    id: "puter-cache",
    severity: "low",
    title: "Puter KV is cache only",
    detail:
      "grudge-crafting-save / grudge-account-inventory mirrors must never override Railway after successful load.",
    action: "Already in crafting 5.3.2 — keep on deploy checklist",
  },
  {
    id: "fleet-js-cdn",
    severity: "medium",
    title: "CDN grudge-fleet.js version drift",
    detail:
      "Crafting hosts ./grudge-fleet.js on Puter; CDN assets.grudge-studio.com/js/grudge-fleet.js may lag. Prefer deploy both on craft release.",
    action: "npm run deploy:puter:crafting + R2 upload of fleet.js",
  },
];

const PUTER_APPS = [
  {
    id: "crafting",
    name: "Warlord Crafting Suite",
    url: "https://grudge-crafting.puter.site",
    role: "UI — account bag craft + per-char XP → Railway",
    data: "ObjectStore recipes · Railway characters/inventory · R2 icons",
  },
  {
    id: "warlords-app",
    name: "Puter App: Warlords",
    url: "https://puter.com/app/warlords",
    role: "Desktop shell → index_url grudgewarlords.com",
    data: "Same Vercel client + same-origin /api → Railway",
  },
];

async function probeJson(url: string): Promise<{ ok: boolean; ms: number; bytes?: number }> {
  const t0 = performance.now();
  try {
    const r = await fetch(url, { method: "GET", signal: AbortSignal.timeout(10000) });
    const text = await r.text();
    return { ok: r.ok, ms: Math.round(performance.now() - t0), bytes: text.length };
  } catch {
    return { ok: false, ms: Math.round(performance.now() - t0) };
  }
}

export default function AssetsPage() {
  const health = useQuery({
    queryKey: ["assets-hub-health"],
    queryFn: async () => {
      const keys = ["api", "auth", "assets-api", "assets-cdn"] as const;
      return Promise.all(keys.map((k) => checkHealth(k)));
    },
    refetchInterval: 60_000,
  });

  const defs = useQuery({
    queryKey: ["assets-hub-defs"],
    queryFn: async () => {
      const results = await Promise.all(
        DEFINITION_PACKS.map(async (pack) => {
          const url = `${OBJECTSTORE}/api/v1/${pack}`;
          const p = await probeJson(url);
          return { pack, url, ...p };
        }),
      );
      return results;
    },
    refetchInterval: 120_000,
  });

  const fleet = useQuery({
    queryKey: ["assets-hub-fleet"],
    queryFn: async () => {
      const [cdn, puter] = await Promise.all([
        probeJson(`${ASSETS_CDN}/js/grudge-fleet.js`),
        probeJson("https://grudge-crafting.puter.site/grudge-fleet.js"),
      ]);
      return { cdn, puter };
    },
  });

  const okHealth = health.data?.filter((h) => h.ok).length ?? 0;
  const okDefs = defs.data?.filter((d) => d.ok).length ?? 0;

  return (
    <div>
      <TopBar title="Assets & Data SSOT" />

      <p className="text-sm text-muted-foreground mb-6 max-w-4xl">
        Canonical map for <strong className="text-foreground">what lives where</strong> — then how{" "}
        <a className="text-primary hover:underline" href="https://grudge-crafting.puter.site" target="_blank" rel="noreferrer">
          crafting
        </a>
        , Puter GS apps, and this dash stay connected. Runtime player state is always{" "}
        <span className="text-success font-semibold">Railway Postgres</span>; definitions{" "}
        <span className="text-primary font-semibold">ObjectStore</span>; files{" "}
        <span className="text-violet-300 font-semibold">R2</span>; D1 is registry/index only.
      </p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard icon="◆" value={`${okHealth}/${health.data?.length ?? 4}`} label="Core services up" />
        <StatCard icon="📜" value={`${okDefs}/${DEFINITION_PACKS.length}`} label="Definition packs" />
        <StatCard icon="📦" value={LAYERS.filter((l) => l.status === "live").length} label="Live layers" />
        <StatCard icon="⚠" value={GAPS.filter((g) => g.severity === "high").length} label="High-severity gaps" />
      </div>

      {/* Topology */}
      <section className="mb-10">
        <h2 className="text-lg font-semibold mb-3">Data layers</h2>
        <div className="grid gap-3 md:grid-cols-2">
          {LAYERS.map((layer) => {
            const eng = ENGINE_META[layer.engine] || ENGINE_META.none;
            return (
              <div key={layer.id} className="fantasy-panel p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <h3 className="text-sm font-semibold">{layer.name}</h3>
                    <p className={`text-xs ${eng.color}`}>
                      {eng.icon} {eng.label}
                    </p>
                  </div>
                  <span className={`text-[0.6rem] px-2 py-0.5 rounded uppercase tracking-wide ${ROLE_STYLE[layer.role]}`}>
                    {layer.role}
                  </span>
                </div>
                <p className="text-[0.65rem] text-muted-foreground font-mono break-all mb-2">{layer.url}</p>
                <div className="text-xs space-y-1">
                  <p className="text-success/90">Holds: {layer.holds.join(" · ")}</p>
                  <p className="text-danger/80">Never: {layer.never.join(" · ")}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Live probes */}
      <section className="mb-10">
        <h2 className="text-lg font-semibold mb-3">Live probes</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="inset-panel p-4">
            <h3 className="text-sm font-semibold mb-2">Services</h3>
            <ul className="space-y-1.5 text-xs">
              {(health.data as HealthResult[] | undefined)?.map((h) => (
                <li key={h.key} className="flex justify-between gap-2">
                  <span>
                    <span className={h.ok ? "text-success" : "text-danger"}>{h.ok ? "●" : "○"}</span>{" "}
                    {h.name}
                  </span>
                  <span className="text-muted-foreground font-mono">{h.ok ? `${h.ms}ms` : h.error?.slice(0, 40)}</span>
                </li>
              )) ?? <li className="text-muted-foreground">Checking…</li>}
            </ul>
          </div>
          <div className="inset-panel p-4">
            <h3 className="text-sm font-semibold mb-2">ObjectStore packs (crafting + dash)</h3>
            <ul className="space-y-1 text-xs max-h-48 overflow-y-auto">
              {defs.data?.map((d) => (
                <li key={d.pack} className="flex justify-between gap-2 font-mono">
                  <span className={d.ok ? "text-foreground" : "text-danger"}>{d.pack}</span>
                  <span className="text-muted-foreground">{d.ok ? `${d.ms}ms · ${(d.bytes! / 1024).toFixed(0)}k` : "fail"}</span>
                </li>
              )) ?? <li className="text-muted-foreground">Checking…</li>}
            </ul>
          </div>
        </div>
        <div className="inset-panel p-4 mt-3 text-xs">
          <h3 className="text-sm font-semibold mb-2">grudge-fleet.js</h3>
          <p className="text-muted-foreground mb-1">
            CDN:{" "}
            <span className={fleet.data?.cdn.ok ? "text-success" : "text-danger"}>
              {fleet.data?.cdn.ok ? `ok ${fleet.data.cdn.ms}ms` : "down"}
            </span>
            {" · "}
            Puter crafting:{" "}
            <span className={fleet.data?.puter.ok ? "text-success" : "text-danger"}>
              {fleet.data?.puter.ok ? `ok ${fleet.data.puter.ms}ms` : "down"}
            </span>
          </p>
          <p className="text-muted-foreground">
            Target ≥ 2.5.2 with sso_token-first handoff. Deploy:{" "}
            <code className="text-primary">npm run deploy:puter:crafting</code>
          </p>
        </div>
      </section>

      {/* Railway tables */}
      <section className="mb-10">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Railway tables (required)</h2>
          <Link href="/database" className="text-xs text-primary hover:underline">
            Open Tables →
          </Link>
        </div>
        <div className="inset-panel overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-3 py-2 text-[0.65rem] uppercase text-primary">Table</th>
                <th className="text-left px-3 py-2 text-[0.65rem] uppercase text-primary">Purpose</th>
              </tr>
            </thead>
            <tbody>
              {RAILWAY_REQUIRED.map((t) => (
                <tr key={t.table} className="border-b border-border/40">
                  <td className="px-3 py-1.5 font-mono text-xs">{t.table}</td>
                  <td className="px-3 py-1.5 text-xs text-muted-foreground">{t.purpose}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Schema SSOT: <code>GrudgeBuilder/shared/schema.ts</code> · Migrations:{" "}
          <code>migrations/000–007_*.sql</code>
        </p>
      </section>

      {/* Puter apps */}
      <section className="mb-10">
        <h2 className="text-lg font-semibold mb-3">Puter + GS apps</h2>
        <div className="grid gap-3 md:grid-cols-2">
          {PUTER_APPS.map((app) => (
            <a
              key={app.id}
              href={app.url}
              target="_blank"
              rel="noreferrer"
              className="fantasy-panel p-4 block hover:border-primary/40 transition-colors"
            >
              <h3 className="text-sm font-semibold text-amber-200">{app.name}</h3>
              <p className="text-[0.65rem] font-mono text-muted-foreground break-all mb-2">{app.url}</p>
              <p className="text-xs">{app.role}</p>
              <p className="text-xs text-muted-foreground mt-1">{app.data}</p>
            </a>
          ))}
        </div>
        <div className="mt-3 text-xs text-muted-foreground space-y-1">
          <p>
            <strong className="text-foreground">Auth path:</strong> crafting → id.grudge-studio.com/login?redirect_uri=
            → sso_token + grudge_token → Railway Bearer → /api/characters + /api/account/*
          </p>
          <p>
            <strong className="text-foreground">Craft write:</strong> bag → account inventory · XP → POST
            /api/characters/:id/progress (revisioned)
          </p>
        </div>
      </section>

      {/* Gaps */}
      <section className="mb-10">
        <h2 className="text-lg font-semibold mb-3">What&apos;s missing / drift to close</h2>
        <div className="space-y-3">
          {GAPS.map((g) => (
            <div key={g.id} className="fantasy-panel p-4">
              <div className="flex items-center gap-2 mb-1">
                <span
                  className={`text-[0.6rem] px-2 py-0.5 rounded uppercase ${
                    g.severity === "high"
                      ? "bg-danger/20 text-danger"
                      : g.severity === "medium"
                        ? "bg-warning/20 text-warning"
                        : "bg-muted text-muted-foreground"
                  }`}
                >
                  {g.severity}
                </span>
                <h3 className="text-sm font-semibold">{g.title}</h3>
              </div>
              <p className="text-xs text-muted-foreground mb-1">{g.detail}</p>
              <p className="text-xs text-primary">→ {g.action}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Quick links */}
      <section className="flex flex-wrap gap-2 text-xs">
        <Link href="/storage" className="px-3 py-1.5 rounded border border-border hover:border-primary">
          Object Storage
        </Link>
        <Link href="/database" className="px-3 py-1.5 rounded border border-border hover:border-primary">
          DB Tables
        </Link>
        <Link href="/schema" className="px-3 py-1.5 rounded border border-border hover:border-primary">
          Schema Editor
        </Link>
        <Link href="/railway" className="px-3 py-1.5 rounded border border-border hover:border-primary">
          Railway Fleet
        </Link>
        <Link href="/services" className="px-3 py-1.5 rounded border border-border hover:border-primary">
          Services
        </Link>
        <a
          href="https://docs.grudge-studio.com/crafting"
          target="_blank"
          rel="noreferrer"
          className="px-3 py-1.5 rounded border border-border hover:border-primary"
        >
          Crafting docs
        </a>
      </section>
    </div>
  );
}
