import { useQuery } from "@tanstack/react-query";
import {
  ExternalLink,
  Database,
  HardDrive,
  Server,
  Shield,
  Image as ImageIcon,
  RefreshCw,
  Link2,
} from "lucide-react";
import TopBar from "../components/TopBar";
import { StatCard } from "../components/Cards";
import { API, SERVICES, FLAGSHIP_GAMES } from "../lib/config";
import {
  ASSETS_CDN,
  OBJECTSTORE,
  BRAND_LOGO,
  BRAND_LOGO_REMOTE,
  CANONICAL_ICONS,
  ENGINE_META,
  type EngineKind,
} from "../lib/assets";
import { checkAllHealth, type HealthResult } from "../lib/api";

interface DbConn {
  engine: string;
  envVar?: string;
  host?: string;
  database?: string;
  url?: string;
  role: string;
  notes?: string;
  d1Name?: string;
  d1Id?: string;
  railwayProjectId?: string;
  railwayService?: string;
  projectId?: string;
}

interface DbSystem {
  id: string;
  label: string;
  liveUrl?: string;
  connections: DbConn[];
}

interface DbManifest {
  version: number;
  generated_at?: string;
  warning?: string;
  systems: DbSystem[];
  d1?: Record<string, { name: string; id: string }>;
  neon?: { host: string; database: string };
  supabase?: { name: string; ref: string; url: string };
  workers?: Record<string, string>;
}

async function loadDbConnections(): Promise<DbManifest> {
  // Prefer published ObjectStore meta if present, else local public bundle
  const urls = [
    `${OBJECTSTORE}/api/v1/_meta/db-connections.json`,
    "/db-connections.json",
  ];
  for (const url of urls) {
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(10000) });
      if (r.ok) return r.json();
    } catch {
      /* try next */
    }
  }
  throw new Error("Could not load db-connections manifest");
}

function EngineBadge({ engine }: { engine: string }) {
  const meta = ENGINE_META[engine as EngineKind] || ENGINE_META.none;
  return (
    <span className={`text-[0.65rem] font-semibold uppercase tracking-wide ${meta.color}`}>
      {meta.icon} {meta.label}
    </span>
  );
}

function ConnRow({ c }: { c: DbConn }) {
  return (
    <div className="border-b border-border/40 last:border-0 py-2.5 px-1">
      <div className="flex flex-wrap items-center gap-2 mb-1">
        <EngineBadge engine={c.engine} />
        <span className="text-sm text-foreground font-medium">{c.role}</span>
      </div>
      <div className="text-[0.7rem] text-muted-foreground space-y-0.5 font-mono">
        {c.envVar && (
          <div>
            env: <span className="text-primary">{c.envVar}</span>
            <span className="text-muted-foreground/70"> (name only — never value)</span>
          </div>
        )}
        {c.host && <div>host: {c.host}</div>}
        {c.database && <div>database: {c.database}</div>}
        {c.d1Name && (
          <div>
            D1: {c.d1Name}
            {c.d1Id ? ` · ${c.d1Id.slice(0, 8)}…` : ""}
          </div>
        )}
        {c.url && (
          <a
            href={c.url.startsWith("http") ? c.url : undefined}
            target="_blank"
            rel="noreferrer"
            className="text-primary hover:underline break-all inline-flex items-center gap-1"
          >
            {c.url} {c.url.startsWith("http") && <ExternalLink size={10} />}
          </a>
        )}
        {c.notes && <div className="text-muted-foreground/90 font-sans">{c.notes}</div>}
      </div>
    </div>
  );
}

export default function Settings() {
  const health = useQuery({
    queryKey: ["settings-health"],
    queryFn: checkAllHealth,
    refetchInterval: 60_000,
  });
  const db = useQuery({
    queryKey: ["db-connections-manifest"],
    queryFn: loadDbConnections,
    staleTime: 5 * 60_000,
  });

  const okCount = health.data?.filter((h: HealthResult) => h.ok).length ?? 0;
  const sysCount = db.data?.systems?.length ?? 0;
  const connCount =
    db.data?.systems?.reduce((n, s) => n + (s.connections?.length || 0), 0) ?? 0;

  return (
    <div>
      <TopBar title="Settings" />

      <p className="text-sm text-muted-foreground mb-6 max-w-3xl">
        Canonical fleet configuration — brand assets, service endpoints, and database
        connection map (metadata only, no secrets). Source: GrudgeBuilder{" "}
        <code className="text-primary text-xs">shared/fleet/dbConnections.ts</code>.
      </p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard
          icon={
            <img
              src={BRAND_LOGO}
              alt=""
              className="w-8 h-8 mx-auto rounded-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).src = BRAND_LOGO_REMOTE;
              }}
            />
          }
          value="Brand"
          label="Helmet mark"
        />
        <StatCard icon="☁" value={okCount || "—"} label="Services up" />
        <StatCard icon={<Database size={22} className="mx-auto text-primary" />} value={sysCount || "—"} label="DB systems" />
        <StatCard icon={<Link2 size={22} className="mx-auto text-primary" />} value={connCount || "—"} label="Connections" />
      </div>

      {/* Brand & icons */}
      <section className="mb-8">
        <h2 className="text-lg mb-3 flex items-center gap-2">
          <ImageIcon size={18} className="text-primary" /> Brand & canonical icons
        </h2>
        <div className="fantasy-panel p-5 grid md:grid-cols-[auto_1fr] gap-6 items-start">
          <div className="flex flex-col items-center gap-2">
            <img
              src={BRAND_LOGO}
              alt="Grudge Studio"
              width={112}
              height={112}
              className="w-28 h-28 rounded-full object-cover shadow-lg ring-1 ring-primary/40"
              onError={(e) => {
                (e.target as HTMLImageElement).src = BRAND_LOGO_REMOTE;
              }}
            />
            <span className="text-[0.65rem] text-muted-foreground">Grudge ID brand mark</span>
          </div>
          <div className="space-y-3 text-sm">
            <p className="text-muted-foreground">
              Use these URLs in fleet UIs — do not hardcode broken github.io or local paths for production icons.
            </p>
            <div className="grid sm:grid-cols-2 gap-3">
              <a
                href={BRAND_LOGO_REMOTE}
                target="_blank"
                rel="noreferrer"
                className="inset-panel p-3 flex items-center gap-3 hover:border-primary transition-colors"
              >
                <img src={BRAND_LOGO_REMOTE} alt="" className="w-10 h-10 rounded-full" />
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-foreground">ID logo</div>
                  <div className="text-[0.65rem] text-muted-foreground truncate">id.grudge-studio.com/grudge-id-logo.png</div>
                </div>
              </a>
              <a
                href={CANONICAL_ICONS.packSword}
                target="_blank"
                rel="noreferrer"
                className="inset-panel p-3 flex items-center gap-3 hover:border-primary transition-colors"
              >
                <img
                  src={CANONICAL_ICONS.packSword}
                  alt=""
                  className="w-10 h-10 object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.opacity = "0.3";
                  }}
                />
                <div className="min-w-0">
                  <div className="text-xs font-semibold">Pack icon</div>
                  <div className="text-[0.65rem] text-muted-foreground truncate">assets…/icons/pack/weapons/</div>
                </div>
              </a>
              <a
                href={CANONICAL_ICONS.bloodfeudBlade}
                target="_blank"
                rel="noreferrer"
                className="inset-panel p-3 flex items-center gap-3 hover:border-primary transition-colors"
              >
                <img
                  src={CANONICAL_ICONS.bloodfeudBlade}
                  alt=""
                  className="w-10 h-10 object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.opacity = "0.3";
                  }}
                />
                <div className="min-w-0">
                  <div className="text-xs font-semibold">Named weapon icon</div>
                  <div className="text-[0.65rem] text-muted-foreground truncate">bloodfeud-blade.png</div>
                </div>
              </a>
              <div className="inset-panel p-3">
                <div className="text-xs font-semibold mb-1">CDN root</div>
                <a href={ASSETS_CDN} className="text-[0.7rem] text-primary break-all hover:underline" target="_blank" rel="noreferrer">
                  {ASSETS_CDN}
                </a>
                <div className="text-[0.65rem] text-muted-foreground mt-1">ObjectStore: {OBJECTSTORE}</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Endpoints */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg flex items-center gap-2">
            <Server size={18} className="text-primary" /> Service endpoints
          </h2>
          <button
            type="button"
            onClick={() => health.refetch()}
            className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1"
          >
            <RefreshCw size={12} className={health.isFetching ? "animate-spin" : ""} /> Refresh
          </button>
        </div>
        <div className="grid md:grid-cols-2 gap-3">
          {SERVICES.map((s) => {
            const h = health.data?.find((x) => x.key === s.key);
            return (
              <div key={s.key} className="fantasy-panel p-3 flex gap-3 items-start">
                <span
                  className={`mt-1 w-2.5 h-2.5 rounded-full shrink-0 ${
                    h?.ok ? "bg-success" : h ? "bg-danger" : "bg-muted"
                  }`}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold">{s.name}</span>
                    {h && (
                      <span className="text-[0.65rem] text-muted-foreground">{h.ms}ms</span>
                    )}
                  </div>
                  <a
                    href={s.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[0.7rem] text-primary truncate block hover:underline"
                  >
                    {s.url}
                  </a>
                  <p className="text-[0.65rem] text-muted-foreground mt-0.5">{s.description}</p>
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-4 fantasy-panel p-3">
          <h3 className="text-xs uppercase tracking-widest text-gold-dark font-bold mb-2">Flagship games</h3>
          <div className="flex flex-wrap gap-2">
            {FLAGSHIP_GAMES.map((g) => (
              <a
                key={g.id}
                href={g.liveUrl}
                target="_blank"
                rel="noreferrer"
                className="inset-panel px-3 py-2 text-xs hover:border-primary flex items-center gap-2"
              >
                <span>{g.icon}</span>
                <span>{g.label}</span>
                <ExternalLink size={10} className="text-muted-foreground" />
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* Database connections */}
      <section className="mb-8">
        <h2 className="text-lg mb-3 flex items-center gap-2">
          <Database size={18} className="text-primary" /> Database connections
        </h2>
        <p className="text-xs text-muted-foreground mb-4 flex items-start gap-2">
          <Shield size={14} className="text-primary shrink-0 mt-0.5" />
          <span>
            {db.data?.warning ||
              "Metadata only — env var names and hosts, never passwords or API keys."}
            {db.data?.generated_at && (
              <> · Manifest {db.data.generated_at.slice(0, 10)} · v{db.data.version}</>
            )}
          </span>
        </p>

        {db.isLoading && (
          <div className="text-sm text-muted-foreground">Loading connection map…</div>
        )}
        {db.isError && (
          <div className="inset-panel p-4 text-sm text-danger">
            Failed to load db-connections.json. Ensure /db-connections.json is deployed with the dash, or publish to
            ObjectStore <code>_meta/db-connections.json</code>.
          </div>
        )}

        {db.data?.neon && (
          <div className="fantasy-panel p-3 mb-4 text-xs flex flex-wrap gap-4">
            <div>
              <span className="text-muted-foreground">Neon SSOT host: </span>
              <span className="font-mono text-primary">{db.data.neon.host}</span>
            </div>
            <div>
              <span className="text-muted-foreground">database: </span>
              <span className="font-mono">{db.data.neon.database}</span>
            </div>
            {db.data.supabase && (
              <div>
                <span className="text-muted-foreground">Supabase: </span>
                <a href={db.data.supabase.url} className="text-primary hover:underline" target="_blank" rel="noreferrer">
                  {db.data.supabase.ref}
                </a>
              </div>
            )}
          </div>
        )}

        <div className="space-y-4">
          {db.data?.systems?.map((sys) => (
            <div key={sys.id} className="fantasy-panel p-4">
              <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
                <h3 className="text-sm font-semibold text-foreground">{sys.label}</h3>
                {sys.liveUrl && (
                  <a
                    href={sys.liveUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[0.65rem] text-primary hover:underline flex items-center gap-1"
                  >
                    {sys.liveUrl} <ExternalLink size={10} />
                  </a>
                )}
              </div>
              <div className="divide-y divide-border/30">
                {sys.connections.map((c, i) => (
                  <ConnRow key={i} c={c} />
                ))}
              </div>
            </div>
          ))}
        </div>

        {db.data?.d1 && (
          <div className="mt-4 fantasy-panel p-4">
            <h3 className="text-xs uppercase tracking-widest text-gold-dark font-bold mb-3 flex items-center gap-2">
              <HardDrive size={14} /> Cloudflare D1 databases
            </h3>
            <div className="grid sm:grid-cols-2 gap-2">
              {Object.entries(db.data.d1).map(([key, d]) => (
                <div key={key} className="inset-panel p-2 text-xs">
                  <div className="font-semibold text-foreground">{d.name}</div>
                  <div className="font-mono text-[0.65rem] text-muted-foreground break-all">{d.id}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      <section className="mb-6">
        <h2 className="text-lg mb-3">Quick links</h2>
        <div className="flex flex-wrap gap-2 text-xs">
          {[
            { href: "https://id.grudge-studio.com/login", label: "Grudge ID" },
            { href: "https://ai.grudge-studio.com/", label: "AI Hub" },
            { href: "https://objectstore.grudge-studio.com", label: "ObjectStore" },
            { href: ASSETS_CDN, label: "Assets CDN" },
            { href: "https://launcher.grudge-studio.com", label: "Launcher" },
            { href: `${API.api}/api/health`, label: "Railway health" },
            { href: "/database", label: "Tables page" },
            { href: "/db-connections.json", label: "db-connections.json" },
          ].map((l) => (
            <a
              key={l.href}
              href={l.href}
              target={l.href.startsWith("/") ? undefined : "_blank"}
              rel="noreferrer"
              className="inset-panel px-3 py-2 hover:border-primary text-primary"
            >
              {l.label}
            </a>
          ))}
        </div>
      </section>
    </div>
  );
}
