import { useQuery } from "@tanstack/react-query";
import TopBar from "../../components/TopBar";
import { StatCard, DataTable } from "../../components/Cards";
import { checkDeployment, gameApi } from "../../lib/api";
import { Globe, GitBranch } from "lucide-react";
import { useState } from "react";

const LIVE_URL = "https://grudgewarlords.com";
const REPO = "MolochDaGod/grudge-studio";

const TABS = ["Characters", "Items", "Crafting", "Skills", "Islands"] as const;
type Tab = (typeof TABS)[number];

const TAB_COLS: Record<Tab, { key: string; label: string }[]> = {
  Characters: [{ key: "id", label: "ID" }, { key: "name", label: "Name" }, { key: "race_id", label: "Race" }, { key: "class_id", label: "Class" }, { key: "profession", label: "Profession" }, { key: "level", label: "Level" }, { key: "gold", label: "Gold" }],
  Items: [{ key: "id", label: "ID" }, { key: "item_name", label: "Name" }, { key: "item_type", label: "Type" }, { key: "quantity", label: "Qty" }, { key: "character_id", label: "Character" }],
  Crafting: [{ key: "id", label: "ID" }, { key: "recipe_id", label: "Recipe" }, { key: "profession", label: "Profession" }, { key: "tier", label: "Tier" }, { key: "status", label: "Status" }],
  Skills: [{ key: "id", label: "ID" }, { key: "skill_name", label: "Skill" }, { key: "profession", label: "Profession" }, { key: "tier", label: "Tier" }, { key: "node_id", label: "Node" }],
  Islands: [{ key: "id", label: "ID" }, { key: "name", label: "Name" }, { key: "island_type", label: "Type" }, { key: "user_id", label: "Owner" }, { key: "last_visited", label: "Last Visit" }],
};

export default function GrudgeWars() {
  const [tab, setTab] = useState<Tab>("Characters");
  const deploy = useQuery({ queryKey: ["deploy-gw"], queryFn: () => checkDeployment(LIVE_URL) });
  const characters = useQuery({ queryKey: ["gw-characters"], queryFn: gameApi.characters, enabled: tab === "Characters" });
  const items = useQuery({ queryKey: ["gw-items"], queryFn: gameApi.items, enabled: tab === "Items" });
  const crafting = useQuery({ queryKey: ["gw-crafting"], queryFn: gameApi.crafting, enabled: tab === "Crafting" });
  const skills = useQuery({ queryKey: ["gw-skills"], queryFn: gameApi.skills, enabled: tab === "Skills" });
  const islands = useQuery({ queryKey: ["gw-islands"], queryFn: gameApi.islands, enabled: tab === "Islands" });

  const dataMap: Record<Tab, any> = { Characters: characters, Items: items, Crafting: crafting, Skills: skills, Islands: islands };
  const current = dataMap[tab];

  return (
    <div>
      <TopBar title="Grudge Wars" />

      <div className="flex items-center gap-3 mb-6">
        <span className="text-3xl">⚔️</span>
        <div>
          <p className="text-sm text-muted-foreground">Main Grudge Warlords — crafting, combat, islands, professions</p>
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

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard icon={<div className={`w-4 h-4 rounded-full mx-auto ${deploy.data?.online ? "bg-success" : "bg-danger"}`} />} value={deploy.data?.online ? "Online" : "Offline"} label="Deploy" />
        <StatCard icon="👤" value={characters.data?.length ?? "—"} label="Characters" />
        <StatCard icon="🗡️" value={items.data?.length ?? "—"} label="Items" />
        <StatCard icon="🏝️" value={islands.data?.length ?? "—"} label="Islands" />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 border-b border-border">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-xs font-semibold transition-colors ${
              tab === t ? "text-primary border-b-2 border-primary" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {current.isLoading && <p className="text-sm text-muted-foreground">Loading {tab.toLowerCase()}...</p>}
      {current.isError && (
        <div className="inset-panel p-4 text-sm text-danger">
          Failed to load {tab.toLowerCase()} — check Game API connection
        </div>
      )}
      {current.data && <DataTable columns={TAB_COLS[tab]} rows={current.data} emptyMsg={`No ${tab.toLowerCase()} found`} />}
    </div>
  );
}
