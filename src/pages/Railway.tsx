import { useQuery } from "@tanstack/react-query";
import TopBar from "../components/TopBar";
import {
  RAILWAY_FLEET,
  RAILWAY_STATUS_LABEL,
  probeRailwayFleet,
  type RailwayFleetStatus,
} from "../lib/railwayFleet";
import { Train } from "lucide-react";

const STATUS_CLASS: Record<RailwayFleetStatus, string> = {
  canonical: "text-success border-success/40 bg-success/10",
  active: "text-primary border-primary/40 bg-primary/10",
  failing: "text-danger border-danger/40 bg-danger/10",
  misdeployed: "text-warning border-warning/40 bg-warning/10",
  phantom: "text-danger border-danger/40 bg-danger/10",
  experimental: "text-muted-foreground border-border",
  deprecated: "text-muted-foreground border-border",
};

export default function Railway() {
  const probes = useQuery({
    queryKey: ["railway-fleet-probes"],
    queryFn: probeRailwayFleet,
    refetchInterval: 120_000,
  });

  const probeMap = new Map(probes.data?.map((p) => [p.id, p]) ?? []);

  const counts = RAILWAY_FLEET.reduce(
    (acc, e) => {
      acc[e.status] = (acc[e.status] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  return (
    <div>
      <TopBar title="Railway Fleet" />

      <p className="text-sm text-muted-foreground mb-4">
        Inventory of Railway projects tied to Grudge Studio. Most build-failure spam comes from{" "}
        <strong className="text-foreground">phantom monorepo services</strong> and{" "}
        <strong className="text-foreground">grudge-warlords-db</strong> linked to the wrong directory.
        Canonical Warlords API is <code className="text-primary text-xs">grudge-api-production-0d46</code>.
        Only <code className="text-primary text-xs">survival-api-production</code> should serve Nexus.
      </p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="fantasy-panel p-4 text-center">
          <p className="text-2xl font-bold text-success">{counts.canonical ?? 0}</p>
          <p className="text-xs text-muted-foreground">Canonical</p>
        </div>
        <div className="fantasy-panel p-4 text-center">
          <p className="text-2xl font-bold text-danger">{(counts.phantom ?? 0) + (counts.failing ?? 0)}</p>
          <p className="text-xs text-muted-foreground">Delete / fix</p>
        </div>
        <div className="fantasy-panel p-4 text-center">
          <p className="text-2xl font-bold text-warning">{counts.misdeployed ?? 0}</p>
          <p className="text-xs text-muted-foreground">Misdeployed</p>
        </div>
        <div className="fantasy-panel p-4 text-center">
          <p className="text-2xl font-bold">{RAILWAY_FLEET.length}</p>
          <p className="text-xs text-muted-foreground">Total tracked</p>
        </div>
      </div>

      <section className="fantasy-panel p-5 mb-6">
        <h2 className="text-lg mb-2 flex items-center gap-2">
          <Train size={18} /> Cleanup checklist
        </h2>
        <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
          <li>
            <span className="text-foreground">Railway dashboard → delete</span> phantom services:{" "}
            <code>@workspace/arpg-game</code>, <code>@workspace/api-server</code>,{" "}
            <code>@workspace/grudge-studio-game</code>
          </li>
          <li>
            <span className="text-foreground">Unlink</span> <code>grudge-warlords-db</code> from{" "}
            <code>C:\Users\david</code> — deploy only from <code>Grudge-Builder</code> repo or delete project
          </li>
          <li>
            <span className="text-foreground">Delete or fix</span> misdeployed{" "}
            <code>grudge-nexus-api</code> and Streamlit on <code>zealous-love-production</code>
          </li>
          <li>
            <span className="text-foreground">Redeploy Nexus API</span>:{" "}
            <code>cd survival && railway login && railway link && railway up</code>
          </li>
        </ol>
      </section>

      <div className="space-y-4">
        {RAILWAY_FLEET.map((entry) => {
          const probe = probeMap.get(entry.id);
          const badge = STATUS_CLASS[entry.status];
          return (
            <article key={entry.id} className="fantasy-panel p-5">
              <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                <div>
                  <h3 className="text-sm font-semibold">
                    {entry.project}
                    <span className="text-muted-foreground font-normal"> · {entry.service}</span>
                  </h3>
                  {entry.game && (
                    <p className="text-xs text-primary mt-0.5">{entry.game}</p>
                  )}
                </div>
                <span className={`text-xs px-2 py-0.5 rounded border ${badge}`}>
                  {RAILWAY_STATUS_LABEL[entry.status]}
                </span>
              </div>

              <p className="text-sm text-muted-foreground mb-3">{entry.purpose}</p>

              <div className="grid md:grid-cols-2 gap-3 text-xs">
                <div>
                  <p className="text-[0.6rem] uppercase text-muted-foreground mb-1">Recommended action</p>
                  <p>{entry.action}</p>
                </div>
                {entry.hostname && (
                  <div>
                    <p className="text-[0.6rem] uppercase text-muted-foreground mb-1">Probe</p>
                    <p className="font-mono text-primary truncate">{entry.hostname}{entry.healthPath}</p>
                    {probe && (
                      <p className={probe.ok ? "text-success" : "text-danger"}>
                        {probe.ok ? `OK ${probe.ms}ms` : probe.error ?? "fail"}
                        {probe.contentType && !probe.ok ? ` · ${probe.contentType}` : ""}
                      </p>
                    )}
                    {probes.isFetching && !probe && (
                      <p className="text-muted-foreground">Probing…</p>
                    )}
                  </div>
                )}
              </div>

              {entry.repo && (
                <p className="text-xs text-muted-foreground mt-2">
                  Repo: <span className="text-foreground">{entry.repo}</span>
                </p>
              )}
              {entry.notes && (
                <p className="text-xs text-warning mt-2 border-t border-border/50 pt-2">{entry.notes}</p>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}