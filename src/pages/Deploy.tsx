import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import TopBar from "../components/TopBar";
import { StatCard, DataTable } from "../components/Cards";
import { deployApi } from "../lib/api";
import { RefreshCw, Hammer, ScrollText } from "lucide-react";
import { useState } from "react";

export default function Deploy() {
  const qc = useQueryClient();
  const containers = useQuery({ queryKey: ["containers"], queryFn: deployApi.containers, refetchInterval: 15_000 });
  const history = useQuery({ queryKey: ["deploy-history"], queryFn: () => deployApi.history() });
  const [logsId, setLogsId] = useState<string | null>(null);
  const logs = useQuery({ queryKey: ["deploy-logs", logsId], queryFn: () => deployApi.logs(logsId!), enabled: !!logsId });

  const restartMut = useMutation({ mutationFn: deployApi.restart, onSuccess: () => qc.invalidateQueries({ queryKey: ["containers"] }) });
  const rebuildMut = useMutation({ mutationFn: deployApi.rebuild, onSuccess: () => qc.invalidateQueries({ queryKey: ["containers"] }) });

  const running = containers.data?.filter((c: any) => c.status === "running").length ?? 0;
  const stopped = (containers.data?.length ?? 0) - running;

  return (
    <div>
      <TopBar title="Server & Deploy" />

      <p className="text-sm text-muted-foreground mb-6">Docker container management — restart, rebuild, and view logs for all Grudge services.</p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard icon="📦" value={containers.data?.length ?? "—"} label="Containers" />
        <StatCard icon="✅" value={running} label="Running" />
        <StatCard icon="⛔" value={stopped} label="Stopped" />
        <StatCard icon="📋" value={history.data?.length ?? "—"} label="Deploys" />
      </div>

      <section className="mb-6">
        <h2 className="text-lg mb-3">Containers</h2>
        {containers.isError && <div className="inset-panel p-4 text-sm text-danger mb-4">Deploy API not connected — add /api/deploy endpoints.</div>}
        {containers.data && (
          <div className="space-y-2">
            {containers.data.map((c: any) => (
              <div key={c.id} className="fantasy-panel p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className={`w-2 h-2 rounded-full ${c.status === "running" ? "bg-green-400" : "bg-red-400"}`} />
                  <div>
                    <span className="text-sm font-medium">{c.name ?? c.id}</span>
                    {c.image && <span className="ml-2 text-xs text-muted-foreground">{c.image}</span>}
                    {c.ports && <span className="ml-2 text-xs text-muted-foreground">:{c.ports}</span>}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setLogsId(c.id)} className="gilded-button flex items-center gap-1 px-2 py-1 text-xs"><ScrollText size={12} /> Logs</button>
                  <button onClick={() => restartMut.mutate(c.id)} disabled={restartMut.isPending} className="gilded-button flex items-center gap-1 px-2 py-1 text-xs"><RefreshCw size={12} /> Restart</button>
                  <button onClick={() => rebuildMut.mutate(c.id)} disabled={rebuildMut.isPending} className="gilded-button flex items-center gap-1 px-2 py-1 text-xs"><Hammer size={12} /> Rebuild</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Logs viewer */}
      {logsId && (
        <section className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-lg">Logs — {logsId}</h2>
            <button onClick={() => setLogsId(null)} className="text-xs text-muted-foreground hover:text-foreground">Close</button>
          </div>
          <pre className="inset-panel p-4 text-xs text-foreground/80 max-h-80 overflow-auto whitespace-pre-wrap font-mono">
            {logs.isLoading ? "Loading..." : logs.data ?? "No logs available."}
          </pre>
        </section>
      )}

      <section>
        <h2 className="text-lg mb-3">Deploy History</h2>
        {history.data ? (
          <DataTable
            columns={[
              { key: "id", label: "Deploy ID" }, { key: "service", label: "Service" }, { key: "action", label: "Action" },
              { key: "status", label: "Status" }, { key: "triggered_by", label: "By" }, { key: "created_at", label: "Time" },
            ]}
            rows={history.data}
            emptyMsg="No deploy history"
          />
        ) : (
          <div className="inset-panel p-4 text-sm text-muted-foreground">No deploy history available.</div>
        )}
      </section>
    </div>
  );
}
