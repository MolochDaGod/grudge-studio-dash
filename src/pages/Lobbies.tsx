import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import TopBar from "../components/TopBar";
import { StatCard } from "../components/Cards";
import { adminApi, type Lobby, type LobbyStatus } from "../lib/api";
import { API } from "../lib/config";
import { XCircle, RefreshCw } from "lucide-react";

const MODE_META: Record<string, { label: string; icon: string }> = {
  duel:         { label: "Duel",         icon: "⚔️" },
  crew_battle:  { label: "Crew Battle",  icon: "🛡️" },
  arena_ffa:    { label: "Arena FFA",    icon: "🏆" },
  nemesis:      { label: "Nemesis",      icon: "👾" },
  rpg_fighter:  { label: "RPG Fighter",  icon: "🗡️" },
  thc_battle:   { label: "THC Battle",   icon: "🌿" },
};

const STATUS_COLORS: Record<LobbyStatus, string> = {
  waiting:     "text-yellow-400 bg-yellow-400/20",
  ready:       "text-blue-400 bg-blue-400/20",
  in_progress: "text-success bg-success/20",
  finished:    "text-muted-foreground bg-muted",
  cancelled:   "text-danger bg-danger/20",
};

const STATUS_LABELS: Record<LobbyStatus, string> = {
  waiting:     "Waiting",
  ready:       "Ready",
  in_progress: "In Progress",
  finished:    "Finished",
  cancelled:   "Cancelled",
};

export default function Lobbies() {
  const qc = useQueryClient();
  const lobbies = useQuery({
    queryKey: ["admin-lobbies"],
    queryFn: () => adminApi.pvpLobbies(),
    refetchInterval: 10_000,
  });

  const cancelMut = useMutation({
    mutationFn: (code: string) => adminApi.cancelLobby(code),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-lobbies"] }),
  });

  const pvpLive = useQuery({
    queryKey: ["pvp-railway-lobby"],
    queryFn: async () => {
      const r = await fetch(`${API.pvp}/lobby`, { cache: "no-store" });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json() as Promise<{ ok: boolean; games: unknown[]; count: number }>;
    },
    refetchInterval: 15_000,
  });

  const data = lobbies.data ?? [];
  const active    = data.filter((l) => l.status === "in_progress").length;
  const waiting   = data.filter((l) => l.status === "waiting" || l.status === "ready").length;
  const totalPlayers = data.reduce((s, l) => s + Number(l.player_count), 0);

  return (
    <div>
      <TopBar title="Lobby Manager" />

      <div className="mb-4 rounded-lg border border-border px-4 py-3 text-sm flex flex-wrap items-center gap-3">
        <span className={`w-2 h-2 rounded-full ${pvpLive.data?.ok ? "bg-green-400" : "bg-red-400"}`} />
        <span>
          Railway PvP lobby:{" "}
          {pvpLive.isError
            ? "unreachable"
            : pvpLive.data
              ? `${pvpLive.data.count} waiting games`
              : "checking…"}
        </span>
        <a
          href={`${API.pvp}/health`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary text-xs hover:underline"
        >
          {API.pvp}/health
        </a>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard icon="🏠" value={data.length} label="Total Lobbies" />
        <StatCard icon="🟢" value={active} label="In Progress" />
        <StatCard icon="⏳" value={waiting} label="Waiting / Ready" />
        <StatCard icon="👥" value={totalPlayers} label="Total Players" />
      </div>

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg">All Lobbies</h2>
        <button
          onClick={() => qc.invalidateQueries({ queryKey: ["admin-lobbies"] })}
          className="gilded-button flex items-center gap-2 px-3 py-1.5 text-xs"
        >
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {lobbies.isError && (
        <div className="inset-panel p-4 text-sm text-danger mb-4">
          Could not load lobbies — check that game-api is healthy.
        </div>
      )}

      <div className="space-y-3">
        {data.map((lobby: Lobby) => {
          const meta = MODE_META[lobby.mode] ?? { label: lobby.mode, icon: "🏠" };
          const canCancel = lobby.status === "waiting" || lobby.status === "ready" || lobby.status === "in_progress";
          return (
            <div key={lobby.lobby_code} className="fantasy-panel p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-xl">{meta.icon}</span>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold">{meta.label}</h3>
                      <span className="text-[0.6rem] font-mono text-muted-foreground">{lobby.lobby_code}</span>
                    </div>
                    <p className="text-[0.65rem] text-muted-foreground">
                      Host: {lobby.host_username ?? lobby.host_grudge_id.slice(0, 8)}
                      {" • "}
                      {lobby.player_count}/{lobby.max_players} players
                      {" • "}
                      Island: {lobby.island}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-[0.6rem] px-2 py-0.5 rounded font-bold uppercase ${STATUS_COLORS[lobby.status] ?? ""}` }>
                    {STATUS_LABELS[lobby.status] ?? lobby.status}
                  </span>
                  {canCancel && (
                    <button
                      onClick={() => cancelMut.mutate(lobby.lobby_code)}
                      disabled={cancelMut.isPending}
                      className="p-1.5 rounded hover:bg-accent disabled:opacity-40"
                      title="Force cancel lobby"
                    >
                      <XCircle size={14} className="text-danger" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        {!lobbies.isPending && data.length === 0 && (
          <div className="inset-panel p-6 text-center text-muted-foreground text-sm">No active lobbies.</div>
        )}
      </div>
    </div>
  );
}
