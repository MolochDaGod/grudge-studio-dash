import { useQuery } from "@tanstack/react-query";
import TopBar from "../../components/TopBar";
import { StatCard } from "../../components/Cards";
import { checkDeployment } from "../../lib/api";
import { Globe, GitBranch } from "lucide-react";

const LIVE_URL = "https://grudge-angeler.vercel.app";
const REPO = "MolochDaGod/grudge-angeler";

export default function Angeler() {
  const deploy = useQuery({ queryKey: ["deploy-angeler"], queryFn: () => checkDeployment(LIVE_URL) });

  return (
    <div>
      <TopBar title="Grudge Angeler" />

      <div className="flex items-center gap-3 mb-6">
        <span className="text-3xl">🎣</span>
        <div>
          <p className="text-sm text-muted-foreground">Pixel art fishing adventure game</p>
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
        <StatCard icon={<div className={`w-4 h-4 rounded-full mx-auto ${deploy.data?.online ? "bg-success" : "bg-danger"}`} />} value={deploy.data?.online ? "Online" : "Offline"} label="Deployment" />
        <StatCard icon="🐟" value="TypeScript" label="Language" />
        <StatCard icon="⚡" value={deploy.data?.ms ? `${deploy.data.ms}ms` : "—"} label="Response" />
      </div>

      <section>
        <h2 className="text-lg mb-3">Connected Resources</h2>
        <div className="inset-panel p-4 space-y-2 text-sm">
          <p><span className="text-primary">Repo:</span> {REPO}</p>
          <p><span className="text-primary">Deploy:</span> Vercel (grudge-angeler.vercel.app)</p>
          <p><span className="text-primary">Engine:</span> Custom TypeScript + Canvas</p>
          <p><span className="text-primary">Backend:</span> Connects to shared Grudge Studio accounts</p>
          <p><span className="text-primary">DB Tables:</span> Shared accounts, game-specific fish/inventory data</p>
        </div>
      </section>
    </div>
  );
}
