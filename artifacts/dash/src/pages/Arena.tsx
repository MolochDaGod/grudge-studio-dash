import { useQuery } from "@tanstack/react-query";
import TopBar from "../components/TopBar";
import { StatCard, DataTable } from "../components/Cards";
import { pvpApi } from "../lib/api";

export default function Arena() {
  // Active matches = PvP lobbies currently in progress
  const matches = useQuery({ queryKey: ["arena-matches"], queryFn: () => pvpApi.lobbies("in_progress"), refetchInterval: 10_000 });
  // Leaderboard from PvP ratings
  const leaderboard = useQuery({ queryKey: ["arena-lb"], queryFn: () => pvpApi.leaderboard() });

  const matchData = matches.data ?? [];
  const lbData: any[] = (leaderboard.data as any)?.leaderboard ?? [];
  const activeMatches = matchData.length;
  const queueSize = 0; // queue count not exposed via GET — see /pvp/queue (POST to join)

  return (
    <div>
      <TopBar title="Arena" />
      <p className="text-sm text-muted-foreground mb-6">PvP arena — live matches, ELO leaderboard, and queue.</p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard icon="⚔️" value={activeMatches} label="In Progress" />
        <StatCard icon="⏳" value={queueSize} label="In Queue" />
        <StatCard icon="🏆" value={lbData.length} label="Ranked Players" />
        <StatCard icon="📊" value={lbData[0]?.rating ?? "—"} label="Top ELO" />
      </div>

      <section className="mb-6">
        <h2 className="text-lg mb-3">Active Matches</h2>
        {matches.isError && <div className="inset-panel p-4 text-sm text-danger mb-4">Could not load matches.</div>}
        <DataTable
          columns={[
            { key: "lobby_code", label: "Code" },
            { key: "mode", label: "Mode" },
            { key: "island", label: "Island" },
            { key: "host_username", label: "Host" },
            { key: "player_count", label: "Players" },
            { key: "started_at", label: "Started" },
          ]}
          rows={matchData}
          emptyMsg="No active matches"
        />
      </section>

      <section className="mt-6">
        <h2 className="text-lg mb-3">ELO Leaderboard — Duel</h2>
        <DataTable
          columns={[
            { key: "username", label: "Player" },
            { key: "rating", label: "ELO" },
            { key: "wins", label: "W" },
            { key: "losses", label: "L" },
            { key: "win_rate", label: "Win %" },
            { key: "streak", label: "Streak" },
            { key: "peak_rating", label: "Peak" },
          ]}
          rows={lbData}
          emptyMsg="No ranked players yet"
        />
      </section>
    </div>
  );
}
