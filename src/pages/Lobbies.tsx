import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import TopBar from "../components/TopBar";
import { StatCard } from "../components/Cards";
import { lobbyApi, type Lobby, type LobbyType } from "../lib/api";
import { Plus, Play, Square, Trash2 } from "lucide-react";
import { useState } from "react";

const LOBBY_TYPES: { value: LobbyType; label: string; icon: string }[] = [
  { value: "pvp_arena", label: "PvP Arena", icon: "⚔️" },
  { value: "tcg", label: "TCG Match", icon: "🃏" },
  { value: "unity_server", label: "Unity Server", icon: "🎮" },
  { value: "custom", label: "Custom", icon: "🔧" },
];

const STATUS_COLORS: Record<string, string> = {
  waiting: "text-warning bg-warning/20",
  active: "text-success bg-success/20",
  paused: "text-muted-foreground bg-muted",
  ended: "text-danger bg-danger/20",
};

export default function Lobbies() {
  const qc = useQueryClient();
  const lobbies = useQuery({ queryKey: ["lobbies"], queryFn: lobbyApi.list, refetchInterval: 10_000 });
  const [showCreate, setShowCreate] = useState(false);
  const [newLobby, setNewLobby] = useState({ name: "", type: "pvp_arena" as LobbyType, maxPlayers: 10 });

  const createMut = useMutation({
    mutationFn: () => lobbyApi.create(newLobby),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["lobbies"] }); setShowCreate(false); setNewLobby({ name: "", type: "pvp_arena", maxPlayers: 10 }); },
  });
  const startMut = useMutation({ mutationFn: lobbyApi.start, onSuccess: () => qc.invalidateQueries({ queryKey: ["lobbies"] }) });
  const stopMut = useMutation({ mutationFn: lobbyApi.stop, onSuccess: () => qc.invalidateQueries({ queryKey: ["lobbies"] }) });
  const deleteMut = useMutation({ mutationFn: lobbyApi.delete, onSuccess: () => qc.invalidateQueries({ queryKey: ["lobbies"] }) });

  const active = lobbies.data?.filter((l) => l.status === "active").length ?? 0;
  const totalPlayers = lobbies.data?.reduce((s, l) => s + l.currentPlayers, 0) ?? 0;

  return (
    <div>
      <TopBar title="Lobby Manager" />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard icon="🏠" value={lobbies.data?.length ?? "—"} label="Total Lobbies" />
        <StatCard icon="🟢" value={active} label="Active" />
        <StatCard icon="👥" value={totalPlayers} label="Players In-Game" />
        <StatCard icon="🎯" value={LOBBY_TYPES.length} label="Lobby Types" />
      </div>

      {/* Create button */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg">All Lobbies</h2>
        <button onClick={() => setShowCreate(!showCreate)} className="gilded-button flex items-center gap-2 px-3 py-1.5 text-xs">
          <Plus size={14} /> Create Lobby
        </button>
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="fantasy-panel p-4 mb-4">
          <h3 className="text-sm font-semibold mb-3">New Lobby</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input
              placeholder="Lobby name..."
              value={newLobby.name}
              onChange={(e) => setNewLobby({ ...newLobby, name: e.target.value })}
              className="bg-input border border-border rounded px-3 py-2 text-sm text-foreground"
            />
            <select
              value={newLobby.type}
              onChange={(e) => setNewLobby({ ...newLobby, type: e.target.value as LobbyType })}
              className="bg-input border border-border rounded px-3 py-2 text-sm text-foreground"
            >
              {LOBBY_TYPES.map((t) => <option key={t.value} value={t.value}>{t.icon} {t.label}</option>)}
            </select>
            <input
              type="number"
              placeholder="Max players"
              value={newLobby.maxPlayers}
              onChange={(e) => setNewLobby({ ...newLobby, maxPlayers: Number(e.target.value) })}
              className="bg-input border border-border rounded px-3 py-2 text-sm text-foreground"
            />
          </div>
          <button
            onClick={() => createMut.mutate()}
            disabled={!newLobby.name || createMut.isPending}
            className="gilded-button mt-3 px-4 py-2 text-xs disabled:opacity-50"
          >
            {createMut.isPending ? "Creating..." : "Create"}
          </button>
        </div>
      )}

      {/* Lobby list */}
      {lobbies.isError && (
        <div className="inset-panel p-4 text-sm text-danger">
          Could not load lobbies — lobby API endpoints need to be added to the Game API.
        </div>
      )}

      <div className="space-y-3">
        {lobbies.data?.map((lobby: Lobby) => {
          const typeInfo = LOBBY_TYPES.find((t) => t.value === lobby.type);
          return (
            <div key={lobby.id} className="fantasy-panel p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-xl">{typeInfo?.icon ?? "🏠"}</span>
                  <div>
                    <h3 className="text-sm font-semibold">{lobby.name}</h3>
                    <p className="text-[0.65rem] text-muted-foreground">{typeInfo?.label} • {lobby.currentPlayers}/{lobby.maxPlayers} players</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[0.6rem] px-2 py-0.5 rounded font-bold uppercase ${STATUS_COLORS[lobby.status] ?? ""}`}>
                    {lobby.status}
                  </span>
                  {lobby.status === "waiting" && (
                    <button onClick={() => startMut.mutate(lobby.id)} className="p-1.5 rounded hover:bg-accent" title="Start">
                      <Play size={14} className="text-success" />
                    </button>
                  )}
                  {lobby.status === "active" && (
                    <button onClick={() => stopMut.mutate(lobby.id)} className="p-1.5 rounded hover:bg-accent" title="Stop">
                      <Square size={14} className="text-warning" />
                    </button>
                  )}
                  <button onClick={() => deleteMut.mutate(lobby.id)} className="p-1.5 rounded hover:bg-accent" title="Delete">
                    <Trash2 size={14} className="text-danger" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
        {lobbies.data?.length === 0 && (
          <div className="inset-panel p-6 text-center text-muted-foreground text-sm">No lobbies created yet.</div>
        )}
      </div>
    </div>
  );
}
