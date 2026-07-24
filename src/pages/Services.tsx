/**
 * Services — platform health + game deployments (best-practice probes).
 *
 * Rules:
 *  - Distinct origins only (no fake duplicate "account" row)
 *  - Real GET health paths (never no-cors as sole truth)
 *  - Game deployments separate from backend services
 *  - Document wiring: browser → same-origin /api where possible
 */
import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ExternalLink,
  Gamepad2,
  RefreshCw,
  Server,
  XCircle,
} from "lucide-react";
import TopBar from "../components/TopBar";
import { checkAllDeployments, checkAllHealth, type HealthResult } from "../lib/api";
import {
  DEPLOY_TIER_LABEL,
  GAME_DEPLOYMENTS,
  SERVICE_LAYER_LABEL,
  SERVICES,
  type GameDeployment,
  type ServiceLayer,
} from "../lib/config";

const LAYER_ORDER: ServiceLayer[] = [
  "identity",
  "game-api",
  "realtime",
  "assets",
  "tools",
  "edge",
];

export default function Services() {
  const health = useQuery({
    queryKey: ["health", "services-page"],
    queryFn: checkAllHealth,
    refetchInterval: 30_000,
  });
  const deploys = useQuery({
    queryKey: ["game-deploys"],
    queryFn: checkAllDeployments,
    refetchInterval: 45_000,
  });
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  useEffect(() => {
    if (health.dataUpdatedAt) setLastChecked(new Date(health.dataUpdatedAt));
  }, [health.dataUpdatedAt]);

  const onlineSvc = health.data?.filter((s) => s.ok).length ?? 0;
  const totalSvc = SERVICES.length;
  const onlineGames = deploys.data?.filter((d) => d.online).length ?? 0;
  const totalGames = GAME_DEPLOYMENTS.length;

  const byLayer = useMemo(() => {
    const map = new Map<ServiceLayer, { def: (typeof SERVICES)[0]; result?: HealthResult }[]>();
    for (const layer of LAYER_ORDER) map.set(layer, []);
    for (const svc of SERVICES) {
      const result = health.data?.find((h) => h.key === svc.key);
      map.get(svc.layer)?.push({ def: svc, result });
    }
    return map;
  }, [health.data]);

  const byTier = useMemo(() => {
    const tiers = ["flagship", "combat", "portal", "studio", "satellite"] as const;
    return tiers.map((tier) => ({
      tier,
      label: DEPLOY_TIER_LABEL[tier],
      items: GAME_DEPLOYMENTS.filter((d) => d.tier === tier).map((d) => ({
        def: d,
        result: deploys.data?.find((x) => x.id === d.id),
      })),
    }));
  }, [deploys.data]);

  const refresh = () => {
    void health.refetch();
    void deploys.refetch();
  };

  return (
    <div>
      <TopBar title="Services & deployments" />

      <p className="text-sm text-muted-foreground mb-4 max-w-3xl">
        Platform backends and player-facing game deploys. Probes use real{" "}
        <code className="text-primary text-xs">GET</code> health paths — not opaque{" "}
        <code className="text-primary text-xs">no-cors</code> HEAD (which always looked “online”).
      </p>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <SummaryCard
          icon={<Server size={18} className="text-primary" />}
          value={`${onlineSvc}/${totalSvc}`}
          label="Backends up"
          ok={onlineSvc === totalSvc}
        />
        <SummaryCard
          icon={<Gamepad2 size={18} className="text-primary" />}
          value={`${onlineGames}/${totalGames}`}
          label="Game deploys up"
          ok={onlineGames === totalGames}
        />
        <SummaryCard
          icon={<Activity size={18} className="text-primary" />}
          value={health.isFetching || deploys.isFetching ? "…" : "live"}
          label="Probe state"
          ok
        />
        <div className="fantasy-panel p-3 flex flex-col justify-center gap-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock size={12} />
            {lastChecked ? lastChecked.toLocaleTimeString() : "Checking…"}
          </div>
          <button
            type="button"
            onClick={refresh}
            className="gilded-button flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs"
          >
            <RefreshCw size={12} className={health.isFetching ? "animate-spin" : ""} />
            Refresh all
          </button>
        </div>
      </div>

      {/* Best practices */}
      <section className="fantasy-panel p-4 mb-8 border-primary/20">
        <h2 className="text-sm font-bold text-primary mb-2 flex items-center gap-2">
          <AlertTriangle size={14} /> Fleet best practices
        </h2>
        <ul className="text-xs text-muted-foreground space-y-1.5 list-disc pl-4">
          <li>
            <strong className="text-foreground">Identity</strong> only on{" "}
            <code className="text-primary">id.grudge-studio.com</code> — not legacy api tunnels.
          </li>
          <li>
            <strong className="text-foreground">Player state</strong> on Railway{" "}
            <code className="text-primary">grudge-api-production-0d46</code> (
            <code className="text-primary">/api/health</code>). Account bag + characters share that origin.
          </li>
          <li>
            <strong className="text-foreground">Browser apps</strong> use same-origin{" "}
            <code className="text-primary">/api/*</code> rewrites — never bake Railway hostnames into SPA.
          </li>
          <li>
            <strong className="text-foreground">Assets</strong>: definitions → ObjectStore; binaries →{" "}
            <code className="text-primary">assets.grudge-studio.com</code> R2.
          </li>
          <li>
            <strong className="text-foreground">Portal scores</strong> (Rec0deD) → The-ENGINE Railway, not grudge-api.
          </li>
          <li>
            Prefer <Link href="/railway" className="text-primary hover:underline">Railway fleet</Link> for
            misdeployed / phantom service cleanup.
          </li>
        </ul>
      </section>

      {/* Backend services by layer */}
      <section className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">Backend services</h2>
          <span className="text-xs text-muted-foreground">Grouped by layer · 30s refresh</span>
        </div>

        {LAYER_ORDER.map((layer) => {
          const rows = byLayer.get(layer) || [];
          if (!rows.length) return null;
          return (
            <div key={layer} className="mb-6">
              <h3 className="text-xs uppercase tracking-widest text-gold-dark font-bold mb-2">
                {SERVICE_LAYER_LABEL[layer]}
              </h3>
              <div className="space-y-2">
                {rows.map(({ def, result }) => (
                  <ServiceRow key={def.key} def={def} result={result} loading={health.isLoading} />
                ))}
              </div>
            </div>
          );
        })}
      </section>

      {/* Game deployments */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">Game & product deployments</h2>
          <span className="text-xs text-muted-foreground">Player URLs · backend deps · 45s refresh</span>
        </div>

        {byTier.map(({ tier, label, items }) => (
          <div key={tier} className="mb-6">
            <h3 className="text-xs uppercase tracking-widest text-gold-dark font-bold mb-2">{label}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {items.map(({ def, result }) => (
                <DeployCard
                  key={def.id}
                  def={def}
                  online={result?.online}
                  ms={result?.ms}
                  status={result?.status}
                  error={result?.error}
                  opaque={result?.opaque}
                  loading={deploys.isLoading}
                />
              ))}
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}

function SummaryCard({
  icon,
  value,
  label,
  ok,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
  ok: boolean;
}) {
  return (
    <div className="fantasy-panel p-3">
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <span className={`text-xl font-bold ${ok ? "text-success" : "text-warning"}`}>{value}</span>
      </div>
      <p className="text-[0.65rem] uppercase tracking-wider text-muted-foreground">{label}</p>
    </div>
  );
}

function ServiceRow({
  def,
  result,
  loading,
}: {
  def: (typeof SERVICES)[0];
  result?: HealthResult;
  loading: boolean;
}) {
  const ok = result?.ok ?? false;
  const ms = result?.ms ?? 0;
  const probe = result?.probeUrl || `${def.url.replace(/\/$/, "")}${def.healthPath}`;

  return (
    <div className="fantasy-panel p-4">
      <div className="flex items-start gap-3">
        <StatusDot ok={loading ? undefined : ok} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold truncate">{def.name}</h3>
            <span
              className={`text-[10px] font-bold uppercase shrink-0 ${
                loading ? "text-muted-foreground" : ok ? "text-success" : "text-danger"
              }`}
            >
              {loading ? "…" : ok ? "Online" : "Down"}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">{def.description}</p>
          {def.notes && (
            <p className="text-[11px] text-primary/80 mt-1 leading-snug">{def.notes}</p>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-3 pt-2 border-t border-border/40 text-xs">
            <div>
              <p className="text-[0.6rem] uppercase text-muted-foreground">Latency</p>
              <p className="font-semibold">{loading ? "—" : `${ms}ms`}</p>
            </div>
            <div className="sm:col-span-2 min-w-0">
              <p className="text-[0.6rem] uppercase text-muted-foreground">Probe</p>
              <a
                href={probe}
                target="_blank"
                rel="noreferrer"
                className="font-mono text-[11px] text-primary hover:underline truncate block"
              >
                {probe}
              </a>
            </div>
          </div>
          {result?.status != null && (
            <p className="text-[10px] text-muted-foreground mt-1">
              HTTP {result.status}
              {result.version ? ` · ${result.version}` : ""}
            </p>
          )}
          {result?.error && !ok && (
            <div className="mt-2 p-2 rounded bg-destructive/10 border border-destructive/30 text-[11px] text-danger">
              {result.error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DeployCard({
  def,
  online,
  ms,
  status,
  error,
  opaque,
  loading,
}: {
  def: GameDeployment;
  online?: boolean;
  ms?: number;
  status?: number;
  error?: string;
  opaque?: boolean;
  loading: boolean;
}) {
  const backends = def.backends
    .map((k) => SERVICES.find((s) => s.key === k)?.name || k)
    .join(" · ");

  return (
    <div className="fantasy-panel p-4 flex flex-col gap-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-lg shrink-0">{def.icon}</span>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold truncate">{def.name}</h3>
            <p className="text-[11px] text-muted-foreground line-clamp-2">{def.description}</p>
          </div>
        </div>
        <StatusDot ok={loading ? undefined : online} />
      </div>

      <div className="flex flex-wrap gap-2 text-[10px]">
        <span
          className={`font-bold uppercase ${
            loading ? "text-muted-foreground" : online ? "text-success" : "text-danger"
          }`}
        >
          {loading ? "Checking…" : online ? (opaque ? "Reachable*" : "Live") : "Offline"}
        </span>
        {ms != null && !loading && <span className="text-muted-foreground">{ms}ms</span>}
        {status != null && status > 0 && (
          <span className="text-muted-foreground">HTTP {status}</span>
        )}
      </div>

      <p className="text-[10px] text-muted-foreground">
        <span className="text-foreground/70">Backends:</span> {backends}
      </p>

      {error && !online && (
        <p className="text-[10px] text-danger truncate" title={error}>
          {error}
        </p>
      )}
      {opaque && online && (
        <p className="text-[10px] text-warning">* Opaque CORS — host answered, body not readable</p>
      )}

      <div className="flex flex-wrap gap-3 mt-auto pt-1">
        <a
          href={def.liveUrl}
          target="_blank"
          rel="noreferrer"
          className="text-[0.65rem] text-primary hover:text-gold-light flex items-center gap-1"
        >
          <ExternalLink size={10} /> Open
        </a>
        {def.dashPath && (
          <Link href={def.dashPath} className="text-[0.65rem] text-muted-foreground hover:text-foreground">
            Dash page
          </Link>
        )}
        {def.repo && (
          <a
            href={`https://github.com/${def.repo}`}
            target="_blank"
            rel="noreferrer"
            className="text-[0.65rem] text-muted-foreground hover:text-foreground"
          >
            GitHub
          </a>
        )}
      </div>
    </div>
  );
}

function StatusDot({ ok }: { ok?: boolean }) {
  if (ok === undefined) {
    return <span className="w-3 h-3 rounded-full bg-muted shrink-0 mt-1" />;
  }
  return ok ? (
    <CheckCircle2 size={16} className="text-success shrink-0 mt-0.5" />
  ) : (
    <XCircle size={16} className="text-danger shrink-0 mt-0.5" />
  );
}
