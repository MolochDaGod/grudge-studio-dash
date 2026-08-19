import { useQuery } from "@tanstack/react-query";
import TopBar from "../../components/TopBar";
import { StatCard } from "../../components/Cards";
import { checkDeployment } from "../../lib/api";
import { Globe, GitBranch } from "lucide-react";

const TOOLS = [
  { name: "Grudge Builder", icon: "🏗️", url: "https://grudgewarlords.com", repo: "MolochDaGod/Grudge-Builder", desc: "Production Warlords client — craft, island, play" },
  { name: "Craft suite", icon: "⚒️", url: "https://grudgewarlords.com/craft/", repo: "MolochDaGod/Grudge-Builder", desc: "Production crafting — same-origin, not studio demo" },
  { name: "2D Island", icon: "🗺️", url: "https://grudgewarlords.com/island", repo: "MolochDaGod/Grudge-Builder", desc: "Seeded 2D island generator" },
  { name: "Object Store", icon: "🗄️", url: "https://objectstore.grudge-studio.com", repo: "MolochDaGod/ObjectStore", desc: "Canonical game defs JSON API" },
];

export default function Tools() {
  const deploys = useQuery({
    queryKey: ["deploy-tools"],
    queryFn: () => Promise.all(TOOLS.map((t) => checkDeployment(t.url))),
    refetchInterval: 60_000,
  });

  return (
    <div>
      <TopBar title="Builder & Tools" />

      <p className="text-sm text-muted-foreground mb-6">
        Developer tools, npm packages, and utilities for Grudge Studio.
      </p>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        <StatCard icon="🛠️" value={TOOLS.length} label="Tools" />
        <StatCard icon="✅" value={deploys.data?.filter((d) => d.online).length ?? "—"} label="Online" />
        <StatCard icon="📦" value="npm" label="Registry" />
      </div>

      <div className="space-y-4">
        {TOOLS.map((tool, i) => (
          <div key={tool.name} className="fantasy-panel p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-xl">{tool.icon}</span>
                <h3 className="text-sm font-semibold">{tool.name}</h3>
              </div>
              <span className={`w-2.5 h-2.5 rounded-full ${deploys.data?.[i]?.online ? "bg-success" : "bg-danger"}`} />
            </div>
            <p className="text-xs text-muted-foreground mb-2">{tool.desc}</p>
            <div className="flex gap-4">
              <a href={tool.url} target="_blank" rel="noreferrer" className="text-[0.65rem] text-primary hover:text-gold-light flex items-center gap-1">
                <Globe size={10} /> Live
              </a>
              <a href={`https://github.com/${tool.repo}`} target="_blank" rel="noreferrer" className="text-[0.65rem] text-muted-foreground hover:text-foreground flex items-center gap-1">
                <GitBranch size={10} /> {tool.repo}
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
