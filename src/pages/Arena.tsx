import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import TopBar from "../components/TopBar";
import { StatCard, DataTable } from "../components/Cards";
import { arenaApi } from "../lib/api";
import { useState } from "react";
import { Plus } from "lucide-react";

export default function Arena() {
  const qc = useQueryClient();
  const matches = useQuery({ queryKey: ["arena-matches"], queryFn: arenaApi.matches, refetchInterval: 10_000 });
  const leaderboard = useQuery({ queryKey: ["arena-lb"], queryFn: arenaApi.leaderboard });
  const queue = useQuery({ queryKey: ["arena-queue"], queryFn: arenaApi.queue, refetchInterval: 5_000 });

  const [showCreate, setShowCreate] = useState(false);
  const [roundConfig, setRoundConfig] = useState({ mode: "deathmatch", bestOf: 3, timeLimit: 300, maxPlayers: 8, map: "arena_01", respawns: true });

  const createRound = useMutation({
    mutationFn: () => arenaApi.createRound(roundConfig),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["arena-matches"] }); setShowCreate(false); },
  });
  const kickMut = useMutation({ mutationFn: arenaApi.kick, onSuccess: () => qc.invalidateQueries({ queryKey: ["arena-queue"] }) });

  const activeMatches = matches.data?.filter((m: any) => m.status === "active").length ?? 0;
  const queueSize = queue.data?.length ?? 0;

  return (
    <div>
      <TopBar title="Arena" />

      <p className="text-sm text-muted-foreground mb-6">Gruda Wars PvP arena hosting — manage rounds, leaderboards, and matchmaking.</p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard icon="⚔️" value={activeMatches} label="Active Matches" />
        <StatCard icon="⏳" value={queueSize} label="In Queue" />
        <StatCard icon="🏆" value={matches.data?.length ?? "—"} label="Total Matches" />
        <StatCard icon="👥" value={leaderboard.data?.length ?? "—"} label="Ranked Players" />
      </div>

      {/* Create round */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg">Matches</h2>
        <button onClick={() => setShowCreate(!showCreate)} className="gilded-button flex items-center gap-2 px-3 py-1.5 text-xs">
          <Plus size={14} /> New Round
        </button>
      </div>

      {showCreate && (
        <div className="fantasy-panel p-4 mb-4">
          <h3 className="text-sm font-semibold mb-3">Configure Round</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <select value={roundConfig.mode} onChange={(e) => setRoundConfig({ ...roundConfig, mode: e.target.value })} className="bg-input border border-border rounded px-3 py-2 text-sm text-foreground">
              <option value="deathmatch">Deathmatch</option>
              <option value="team_battle">Team Battle</option>
              <option value="king_of_hill">King of the Hill</option>
              <option value="capture_flag">Capture the Flag</option>
              <option value="last_standing">Last Standing</option>
            </select>
            <input type="number" value={roundConfig.bestOf} onChange={(e) => setRoundConfig({ ...roundConfig, bestOf: Number(e.target.value) })} className="bg-input border border-border rounded px-3 py-2 text-sm text-foreground" placeholder="Best of" />
            <input type="number" value={roundConfig.timeLimit} onChange={(e) => setRoundConfig({ ...roundConfig, timeLimit: Number(e.target.value) })} className="bg-input border border-border rounded px-3 py-2 text-sm text-foreground" placeholder="Time limit (sec)" />
            <input type="number" value={roundConfig.maxPlayers} onChange={(e) => setRoundConfig({ ...roundConfig, maxPlayers: Number(e.target.value) })} className="bg-input border border-border rounded px-3 py-2 text-sm text-foreground" placeholder="Max players" />
            <input value={roundConfig.map} onChange={(e) => setRoundConfig({ ...roundConfig, map: e.target.value })} className="bg-input border border-border rounded px-3 py-2 text-sm text-foreground" placeholder="Map ID" />
            <label className="flex items-center gap-2 text-sm text-foreground">
              <input type="checkbox" checked={roundConfig.respawns} onChange={(e) => setRoundConfig({ ...roundConfig, respawns: e.target.checked })} /> Respawns
            </label>
          </div>
          <button onClick={() => createRound.mutate()} disabled={createRound.isPending} className="gilded-button mt-3 px-4 py-2 text-xs disabled:opacity-50">
            {createRound.isPending ? "Creating..." : "Start Round"}
          </button>
        </div>
      )}

      {matches.isError && <div className="inset-panel p-4 text-sm text-danger mb-4">Arena API not connected — add /api/arena endpoints to Game API.</div>}

      {matches.data && (
        <DataTable
          columns={[
            { key: "id", label: "Match ID" }, { key: "mode", label: "Mode" }, { key: "status", label: "Status" },
            { key: "players", label: "Players" }, { key: "map", label: "Map" }, { key: "created_at", label: "Started" },
          ]}
          rows={matches.data}
          emptyMsg="No arena matches"
        />
      )}

      {/* Queue */}
      <section className="mt-6">
        <h2 className="text-lg mb-3">Matchmaking Queue</h2>
        {queue.data && queue.data.length > 0 ? (
          <div className="space-y-2">
            {queue.data.map((p: any) => (
              <div key={p.id} className="fantasy-panel p-3 flex items-center justify-between">
                <span className="text-sm">{p.username ?? p.id}</span>
                <button onClick={() => kickMut.mutate(p.id)} className="text-xs text-danger hover:text-danger/70">Kick</button>
              </div>
            ))}
          </div>
        ) : (
          <div className="inset-panel p-4 text-sm text-muted-foreground">Queue empty</div>
        )}
      </section>

      {/* Leaderboard */}
      <section className="mt-6">
        <h2 className="text-lg mb-3">Leaderboard</h2>
        {leaderboard.data && (
          <DataTable
            columns={[
              { key: "rank", label: "#" }, { key: "username", label: "Player" }, { key: "total_kills", label: "Kills" },
              { key: "total_deaths", label: "Deaths" }, { key: "total_matches", label: "Matches" }, { key: "highest_killstreak", label: "Best Streak" },
            ]}
            rows={leaderboard.data}
            emptyMsg="No ranked players"
          />
        )}
      </section>
    </div>
  );
}
