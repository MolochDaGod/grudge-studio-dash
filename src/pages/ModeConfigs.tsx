import { useQuery } from "@tanstack/react-query";
import TopBar from "../components/TopBar";
import { pvpApi } from "../lib/api";
import { Settings2 } from "lucide-react";

export default function ModeConfigs() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["mode-configs"],
    queryFn: pvpApi.modeConfigs,
    staleTime: 60_000,
  });

  const modes = data?.modes ? Object.entries(data.modes) : [];

  return (
    <div>
      <TopBar title="PvP Game Modes" />
      <p className="text-sm text-muted-foreground mb-6">
        Mode registry from <code className="text-primary">game-api/src/mode-configs.js</code> — defines behavior for all PvP game types.
      </p>

      {isLoading && <div className="inset-panel p-6 text-center text-muted-foreground">Loading mode configs…</div>}
      {isError && <div className="inset-panel p-4 text-danger text-sm">Could not load mode configs — game-api may be offline.</div>}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {modes.map(([key, cfg]: [string, any]) => (
          <div key={key} className="fantasy-panel p-5">
            <div className="flex items-center gap-3 mb-4">
              <Settings2 size={18} className="text-primary" />
              <div>
                <h3 className="text-sm font-bold">{cfg.label || key}</h3>
                <p className="text-xs text-muted-foreground">{cfg.description}</p>
              </div>
              <span className={`ml-auto text-[0.6rem] px-2 py-0.5 rounded font-bold uppercase ${
                cfg.serverType === "dedicated"
                  ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                  : "bg-green-500/20 text-green-400 border border-green-500/30"
              }`}>
                {cfg.serverType}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              <div>
                <p className="text-[0.6rem] uppercase text-muted-foreground">Players</p>
                <p className="text-sm font-semibold">{cfg.minPlayers}–{cfg.maxPlayers}</p>
              </div>
              <div>
                <p className="text-[0.6rem] uppercase text-muted-foreground">Teams</p>
                <p className="text-sm font-semibold">{cfg.teams === 0 ? "FFA" : cfg.teams}</p>
              </div>
              <div>
                <p className="text-[0.6rem] uppercase text-muted-foreground">Tick Rate</p>
                <p className="text-sm font-semibold">{cfg.tickRateHz} Hz</p>
              </div>
              <div>
                <p className="text-[0.6rem] uppercase text-muted-foreground">Time Limit</p>
                <p className="text-sm font-semibold">{Math.round(cfg.matchTimeLimitSec / 60)}m</p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              <div>
                <p className="text-[0.6rem] uppercase text-muted-foreground">Timeout</p>
                <p className="text-sm font-semibold">{cfg.timeoutSec}s</p>
              </div>
              <div>
                <p className="text-[0.6rem] uppercase text-muted-foreground">Respawns</p>
                <p className="text-sm font-semibold">{cfg.respawns ? "Yes" : "No"}</p>
              </div>
              <div>
                <p className="text-[0.6rem] uppercase text-muted-foreground">ELO</p>
                <p className="text-sm font-semibold">{cfg.eloEnabled ? `K=${cfg.eloK}` : "Off"}</p>
              </div>
              <div>
                <p className="text-[0.6rem] uppercase text-muted-foreground">Queue Range</p>
                <p className="text-sm font-semibold">±{cfg.queueEloRange}</p>
              </div>
            </div>

            <div>
              <p className="text-[0.6rem] uppercase text-muted-foreground mb-1">Allowed Actions</p>
              <div className="flex flex-wrap gap-1">
                {cfg.allowedActions?.map((action: string) => (
                  <span key={action} className="text-[0.6rem] px-1.5 py-0.5 bg-accent border border-border rounded text-muted-foreground">
                    {action}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {modes.length === 0 && !isLoading && !isError && (
        <div className="inset-panel p-6 text-center text-muted-foreground">No modes registered.</div>
      )}
    </div>
  );
}
