/**
 * Deploy — modern public health board.
 * The old Docker /admin/containers VPS API is retired. This page probes
 * Railway + Vercel + CDN the same way production clients do.
 */
import { useQuery } from "@tanstack/react-query";
import TopBar from "../components/TopBar";
import { StatCard } from "../components/Cards";
import { checkAllDeployments, checkAllHealth } from "../lib/api";
import {
  RAILWAY_FLEET,
  RAILWAY_STATUS_LABEL,
  probeRailwayFleet,
} from "../lib/railwayFleet";
import { RefreshCw, ExternalLink } from "lucide-react";

export default function Deploy() {
  const health = useQuery({
    queryKey: ["health", "deploy-page"],
    queryFn: checkAllHealth,
    refetchInterval: 30_000,
  });
  const deploys = useQuery({
    queryKey: ["game-deploys", "deploy-page"],
    queryFn: checkAllDeployments,
    refetchInterval: 45_000,
  });
  const railway = useQuery({
    queryKey: ["railway-fleet-probes", "deploy-page"],
    queryFn: probeRailwayFleet,
    refetchInterval: 60_000,
  });

  const backendsUp = health.data?.filter((s) => s.ok).length ?? 0;
  const backends = health.data?.length ?? 0;
  const gamesUp = deploys.data?.filter((d) => d.online).length ?? 0;
  const games = deploys.data?.length ?? 0;
  const railOk = railway.data?.filter((p) => p.ok).length ?? 0;
  const railN = railway.data?.length ?? 0;
  const alarms = RAILWAY_FLEET.filter((e) =>
    ["failing", "misdeployed", "phantom"].includes(e.status),
  );
  const fetching = health.isFetching || deploys.isFetching || railway.isFetching;

  const refresh = () => {
    void health.refetch();
    void deploys.refetch();
    void railway.refetch();
  };

  return (
    <div>
      <TopBar title="Deploy & health" />

      <p className="text-sm text-muted-foreground mb-6 max-w-3xl">
        Live public probes for the modern stack: Railway Postgres + Colyseus, PvP lobby,
        ObjectStore, R2, Grudge ID. The old VPS Docker container API is retired — it is
        not how production ships.
      </p>

      <div className="flex justify-end mb-3">
        <button
          type="button"
          onClick={refresh}
          className="gilded-button flex items-center gap-1 px-3 py-1 text-xs"
          disabled={fetching}
        >
          <RefreshCw size={12} className={fetching ? "animate-spin" : ""} /> Refresh
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard icon="🖥️" value={`${backendsUp}/${backends}`} label="Backends up" />
        <StatCard icon="🎮" value={`${gamesUp}/${games}`} label="Game shells up" />
        <StatCard icon="🚂" value={`${railOk}/${railN}`} label="Railway probes" />
        <StatCard icon="🚨" value={alarms.length} label="Legacy alarms" />
      </div>

      {alarms.length > 0 && (
        <section className="mb-6 fantasy-panel p-4 border border-danger/40">
          <h2 className="text-lg mb-2 text-danger">Unresolved legacy / phantom Railway</h2>
          <p className="text-xs text-muted-foreground mb-3">
            These still exist on the Railway account and generate failed builds. They are
            not part of the modern SSOT. Delete or unlink — do not route players here.
          </p>
          <div className="space-y-2">
            {alarms.map((e) => (
              <div key={e.id} className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
                <div>
                  <span className="font-medium">{e.project}</span>
                  <span className="text-muted-foreground"> / {e.service}</span>
                  <span className="ml-2 text-[10px] uppercase text-danger">
                    {RAILWAY_STATUS_LABEL[e.status]}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">{e.action}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="mb-6">
        <h2 className="text-lg mb-3">Backend probes</h2>
        <div className="space-y-1">
          {(health.data ?? []).map((s) => (
            <div
              key={s.key}
              className="flex items-center justify-between gap-3 px-3 py-2 rounded border border-border/60"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className={`w-2 h-2 rounded-full ${s.ok ? "bg-green-400" : "bg-red-400"}`} />
                <span className="text-sm font-medium">{s.name}</span>
                <span className="text-[10px] uppercase text-muted-foreground">{s.layer}</span>
              </div>
              <div className="flex items-center gap-3 text-xs font-mono text-muted-foreground shrink-0">
                <span>{s.status ?? "—"}</span>
                <span>{s.ms}ms</span>
                {s.error && <span className="text-danger max-w-[180px] truncate">{s.error}</span>}
                <a href={s.probeUrl} target="_blank" rel="noopener noreferrer" className="text-primary inline-flex items-center gap-1">
                  open <ExternalLink size={10} />
                </a>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-lg mb-3">Player-facing shells</h2>
        <div className="space-y-1">
          {(deploys.data ?? []).map((d) => (
            <div
              key={d.id ?? d.url}
              className="flex items-center justify-between gap-3 px-3 py-2 rounded border border-border/60"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className={`w-2 h-2 rounded-full ${d.online ? "bg-green-400" : "bg-red-400"}`} />
                <span className="text-sm font-medium truncate">{d.name ?? d.url.replace(/^https?:\/\//, "")}</span>
              </div>
              <div className="flex items-center gap-3 text-xs font-mono text-muted-foreground">
                <span>{d.status ?? "—"}</span>
                <span>{d.ms}ms</span>
                <a href={d.url} target="_blank" rel="noopener noreferrer" className="text-primary inline-flex items-center gap-1">
                  open <ExternalLink size={10} />
                </a>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
