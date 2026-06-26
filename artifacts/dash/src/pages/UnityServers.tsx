import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import TopBar from "../components/TopBar";
import { StatCard } from "../components/Cards";
import { deployApi, lobbyApi } from "../lib/api";
import { RefreshCw } from "lucide-react";

export default function UnityServers() {
  const qc = useQueryClient();
  const containers = useQuery({ queryKey: ["containers"], queryFn: deployApi.containers });
  const lobbies = useQuery<any[]>({ queryKey: ["lobbies"], queryFn: () => lobbyApi.list() });

  const unityContainers = containers.data?.filter((c: any) => c.name?.includes("unity") || c.image?.includes("unity")) ?? [];
  const unityLobbies = lobbies.data?.filter((l: any) => l.type === "unity") ?? [];
  const running = unityContainers.filter((c: any) => c.status === "running").length;

  const restartMut = useMutation({
    mutationFn: (id: string) => deployApi.restart(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["containers"] }),
  });

  return (
    <div>
      <TopBar title="Unity Servers" />

      <p className="text-sm text-muted-foreground mb-6">Dedicated Unity game server instances — monitor, restart, and manage lobbies.</p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard icon="🎮" value={unityContainers.length} label="Instances" />
        <StatCard icon="✅" value={running} label="Running" />
        <StatCard icon="🚪" value={unityLobbies.length} label="Unity Lobbies" />
        <StatCard icon="👥" value={unityLobbies.reduce((s: number, l: any) => s + (l.current_players ?? 0), 0)} label="Connected Players" />
      </div>

      <section className="mb-6">
        <h2 className="text-lg mb-3">Server Instances</h2>
        {unityContainers.length > 0 ? (
          <div className="space-y-2">
            {unityContainers.map((c: any) => (
              <div key={c.id} className="fantasy-panel p-4 flex items-center justify-between">
                <div>
                  <span className="text-sm font-medium">{c.name ?? c.id}</span>
                  <span className={`ml-3 text-xs px-2 py-0.5 rounded ${c.status === "running" ? "bg-green-900/50 text-green-400" : "bg-red-900/50 text-red-400"}`}>{c.status}</span>
                  {c.image && <span className="ml-2 text-xs text-muted-foreground">{c.image}</span>}
                </div>
                <button onClick={() => restartMut.mutate(c.id)} disabled={restartMut.isPending} className="gilded-button flex items-center gap-1 px-3 py-1.5 text-xs">
                  <RefreshCw size={12} /> Restart
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="inset-panel p-4 text-sm text-muted-foreground">
            {containers.isError ? "Deploy API not connected — configure Docker management endpoints." : "No Unity server containers detected."}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-lg mb-3">Unity Lobbies</h2>
        {unityLobbies.length > 0 ? (
          <div className="space-y-2">
            {unityLobbies.map((l: any) => (
              <div key={l.id} className="fantasy-panel p-3 flex items-center justify-between">
                <div>
                  <span className="text-sm">{l.name}</span>
                  <span className="ml-2 text-xs text-muted-foreground">{l.current_players}/{l.max_players} players</span>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded ${l.status === "active" ? "bg-green-900/50 text-green-400" : "bg-yellow-900/50 text-yellow-400"}`}>{l.status}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="inset-panel p-4 text-sm text-muted-foreground">No Unity lobbies — create one from the Lobby Manager with type "unity".</div>
        )}
      </section>
    </div>
  );
}
