import { useQuery } from "@tanstack/react-query";
import TopBar from "../../components/TopBar";
import { StatCard } from "../../components/Cards";
import { checkDeployment } from "../../lib/api";
import { Globe, GitBranch, Gamepad2 } from "lucide-react";

const LIVE_URL = "https://gruda-wars.vercel.app";
const REPO = "MolochDaGod/GrudgeWars";

export default function UnityGame() {
  const deploy = useQuery({
    queryKey: ["deploy-unity"],
    queryFn: () => checkDeployment(LIVE_URL),
    refetchInterval: 60_000,
  });

  return (
    <div>
      <TopBar title="Unity Game" />

      <div className="flex items-center gap-3 mb-6">
        <span className="text-3xl">🎮</span>
        <div>
          <p className="text-sm text-muted-foreground">GrudgeWars Unity WebGL — 3D combat & world exploration</p>
          <div className="flex gap-4 mt-1">
            <a href={LIVE_URL} target="_blank" rel="noreferrer" className="text-xs text-primary hover:text-gold-light flex items-center gap-1">
              <Globe size={12} /> {LIVE_URL}
            </a>
            <a href={`https://github.com/${REPO}`} target="_blank" rel="noreferrer" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
              <GitBranch size={12} /> {REPO}
            </a>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        <StatCard
          icon={<div className={`w-4 h-4 rounded-full mx-auto ${deploy.data?.online ? "bg-success" : "bg-danger"}`} />}
          value={deploy.data?.online ? "Online" : "Offline"}
          label="Deployment"
        />
        <StatCard icon={<Gamepad2 size={24} className="text-primary" />} value="WebGL" label="Platform" />
        <StatCard icon="⚡" value={deploy.data?.ms ? `${deploy.data.ms}ms` : "—"} label="Response" />
      </div>

      <section>
        <h2 className="text-lg mb-3">Connected Resources</h2>
        <div className="inset-panel p-4 space-y-2 text-sm">
          <p><span className="text-primary">Repo:</span> {REPO}</p>
          <p><span className="text-primary">Deploy:</span> Vercel (gruda-wars.vercel.app)</p>
          <p><span className="text-primary">Engine:</span> Unity WebGL Build</p>
          <p><span className="text-primary">Backend:</span> Railway grudge-api (shared Game API)</p>
          <p><span className="text-primary">DB Tables:</span> characters, items, battle_arena_stats, sessions</p>
        </div>
      </section>
    </div>
  );
}
