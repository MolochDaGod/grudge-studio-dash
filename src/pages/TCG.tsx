import { useQuery } from "@tanstack/react-query";
import TopBar from "../components/TopBar";
import { StatCard, DataTable } from "../components/Cards";
import { lobbyApi } from "../lib/api";

export default function TCG() {
  const lobbies = useQuery<any[]>({ queryKey: ["lobbies"], queryFn: () => lobbyApi.list() });

  const tcgLobbies = lobbies.data?.filter((l: any) => l.type === "tcg") ?? [];
  const active = tcgLobbies.filter((l: any) => l.status === "active").length;

  return (
    <div>
      <TopBar title="TCG" />

      <p className="text-sm text-muted-foreground mb-6">
        Grudge TCG lobbies ·{" "}
        <a href="/games/nexus-nemesis" className="text-accent underline">Nexus Nemesis pack shop</a>
        {" · "}
        <a href="https://nemesis.grudge-studio.com/shop" target="_blank" rel="noreferrer" className="text-accent underline">
          Live shop
        </a>
      </p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard icon="🃏" value={tcgLobbies.length} label="TCG Lobbies" />
        <StatCard icon="🔥" value={active} label="Active" />
        <StatCard icon="👤" value={tcgLobbies.reduce((s: number, l: any) => s + (l.current_players ?? 0), 0)} label="Players In-Game" />
        <StatCard icon="🏅" value="—" label="Tournaments Run" />
      </div>

      <section className="mb-6">
        <h2 className="text-lg mb-3">Active TCG Lobbies</h2>
        {tcgLobbies.length > 0 ? (
          <DataTable
            columns={[
              { key: "id", label: "Lobby" }, { key: "name", label: "Name" }, { key: "status", label: "Status" },
              { key: "current_players", label: "Players" }, { key: "max_players", label: "Max" }, { key: "created_at", label: "Created" },
            ]}
            rows={tcgLobbies}
            emptyMsg="No TCG lobbies"
          />
        ) : (
          <div className="inset-panel p-4 text-sm text-muted-foreground">
            No TCG lobbies — create one from the <a href="/lobbies" className="text-accent underline">Lobby Manager</a>.
          </div>
        )}
      </section>

      <section>
        <h2 className="text-lg mb-3">How It Works</h2>
        <div className="fantasy-panel p-4 text-sm space-y-2 text-muted-foreground">
          <p>1. Create a lobby with type <code className="text-accent">"tcg"</code> in the Lobby Manager.</p>
          <p>2. Players queue into the lobby via the game client.</p>
          <p>3. Matches are tracked here once the TCG backend endpoints are live.</p>
          <p>4. Tournaments can be configured with bracket sizes and prize pools.</p>
        </div>
      </section>
    </div>
  );
}
