import { useQuery } from "@tanstack/react-query";
import TopBar from "../../components/TopBar";
import { StatCard, DataTable } from "../../components/Cards";
import { checkDeployment, gameApi, survivalApi } from "../../lib/api";
import type { FlagshipGame } from "../../lib/config";
import { Globe, GitBranch } from "lucide-react";
import { useState } from "react";

type WarlordsTab = "Characters" | "Items" | "Crafting" | "Skills" | "Islands";
const WARLORDS_TABS: WarlordsTab[] = ["Characters", "Items", "Crafting", "Skills", "Islands"];

const WARLORDS_COLS: Record<WarlordsTab, { key: string; label: string }[]> = {
  Characters: [
    { key: "id", label: "ID" }, { key: "name", label: "Name" },
    { key: "race_id", label: "Race" }, { key: "class_id", label: "Class" },
    { key: "level", label: "Level" }, { key: "gold", label: "Gold" },
  ],
  Items: [
    { key: "id", label: "ID" }, { key: "item_name", label: "Name" },
    { key: "item_type", label: "Type" }, { key: "quantity", label: "Qty" },
  ],
  Crafting: [
    { key: "id", label: "ID" }, { key: "recipe_id", label: "Recipe" },
    { key: "profession", label: "Profession" },
  ],
  Skills: [
    { key: "id", label: "ID" }, { key: "skill_name", label: "Skill" },
    { key: "profession", label: "Profession" },
  ],
  Islands: [
    { key: "id", label: "ID" }, { key: "name", label: "Name" },
    { key: "island_type", label: "Type" },
  ],
};

interface GameHubProps {
  game: FlagshipGame;
}

export default function GameHub({ game }: GameHubProps) {
  const [warlordsTab, setWarlordsTab] = useState<WarlordsTab>("Characters");
  const [grudgeId, setGrudgeId] = useState("");

  const deploy = useQuery({
    queryKey: ["deploy", game.id],
    queryFn: () => checkDeployment(game.liveUrl),
    refetchInterval: 60_000,
  });

  const survivalHealth = useQuery({
    queryKey: ["survival-health"],
    queryFn: survivalApi.health,
    enabled: game.id === "grudox",
    refetchInterval: 60_000,
  });

  const engineManifest = useQuery({
    queryKey: ["survival-engine-manifest"],
    queryFn: survivalApi.engineManifest,
    enabled: game.id === "grudox",
    refetchInterval: 300_000,
  });

  const characters = useQuery({
    queryKey: ["gw-characters"],
    queryFn: gameApi.characters,
    enabled: game.id === "warlords" && warlordsTab === "Characters",
  });
  const items = useQuery({
    queryKey: ["gw-items"],
    queryFn: gameApi.items,
    enabled: game.id === "warlords" && warlordsTab === "Items",
  });
  const crafting = useQuery({
    queryKey: ["gw-crafting"],
    queryFn: gameApi.crafting,
    enabled: game.id === "warlords" && warlordsTab === "Crafting",
  });
  const skills = useQuery({
    queryKey: ["gw-skills"],
    queryFn: gameApi.skills,
    enabled: game.id === "warlords" && warlordsTab === "Skills",
  });
  const islands = useQuery({
    queryKey: ["gw-islands"],
    queryFn: gameApi.islands,
    enabled: game.id === "warlords" && warlordsTab === "Islands",
  });

  const survivalAccount = useQuery({
    queryKey: ["survival-account", grudgeId],
    queryFn: () => survivalApi.account(grudgeId.trim()),
    enabled: game.id === "grudox" && grudgeId.trim().length >= 3,
  });
  const survivalChars = useQuery({
    queryKey: ["survival-chars", survivalAccount.data?.id],
    queryFn: () => survivalApi.characters(survivalAccount.data!.id),
    enabled: !!survivalAccount.data?.id,
  });

  const activeWarlordsQuery =
    warlordsTab === "Characters" ? characters
    : warlordsTab === "Items" ? items
    : warlordsTab === "Crafting" ? crafting
    : warlordsTab === "Skills" ? skills
    : islands;

  const apiOnline =
    game.id === "grudox"
      ? !!survivalHealth.data
      : deploy.data?.online;

  return (
    <div>
      <TopBar title={game.label} />

      <div className="flex items-center gap-3 mb-6">
        <span className="text-3xl">{game.icon}</span>
        <div>
          <p className="text-sm text-muted-foreground">{game.description}</p>
          <div className="flex gap-4 mt-1 flex-wrap">
            <a
              href={game.liveUrl}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-primary hover:text-gold-light flex items-center gap-1"
            >
              <Globe size={12} /> {game.liveUrl}
            </a>
            <a
              href={`https://github.com/${game.repo}`}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
            >
              <GitBranch size={12} /> {game.repo}
            </a>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard
          icon={
            <div
              className={`w-4 h-4 rounded-full mx-auto ${
                apiOnline ? "bg-success" : "bg-danger"
              }`}
            />
          }
          value={apiOnline ? "Online" : "Offline"}
          label="Live / API"
        />
        {game.id === "warlords" && (
          <>
            <StatCard icon="👤" value={characters.data?.length ?? "—"} label="Characters" />
            <StatCard icon="🗡️" value={items.data?.length ?? "—"} label="Items" />
            <StatCard icon="🏝️" value={islands.data?.length ?? "—"} label="Islands" />
          </>
        )}
        {game.id === "carrier" && (
          <>
            <StatCard icon="🛸" value="Grim Armada" label="Engine" />
            <StatCard icon="⚓" value="R3F + Rapier" label="Stack" />
            <StatCard icon="🌊" value="Colony" label="Mode" />
          </>
        )}
        {game.id === "grudox" && (
          <>
            <StatCard icon="🧍" value={survivalChars.data?.length ?? "—"} label="Characters" />
            <StatCard icon="⚙️" value={engineManifest.data?.controllers.length ?? "—"} label="Controllers" />
            <StatCard icon="🎬" value={engineManifest.data?.animationLibraries.length ?? "—"} label="Anim Libs" />
            <StatCard icon="🔗" value="Railway" label="API Host" />
          </>
        )}
      </div>

      {game.id === "warlords" && (
        <>
          <div className="flex gap-2 mb-4 flex-wrap">
            {WARLORDS_TABS.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setWarlordsTab(t)}
                className={`px-3 py-1.5 text-xs rounded border ${
                  warlordsTab === t
                    ? "border-primary text-primary bg-primary/10"
                    : "border-border text-muted-foreground"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
          {activeWarlordsQuery.isError && (
            <div className="inset-panel p-4 text-sm text-danger mb-4">
              Could not load {warlordsTab} — ensure Game API admin token is valid.
            </div>
          )}
          <DataTable
            columns={WARLORDS_COLS[warlordsTab]}
            rows={Array.isArray(activeWarlordsQuery.data) ? activeWarlordsQuery.data : []}
            emptyMsg={`No ${warlordsTab.toLowerCase()} returned`}
          />
        </>
      )}

      {game.id === "carrier" && (
        <section className="fantasy-panel p-5">
          <h2 className="text-lg mb-2">Carrier Ops Dashboard</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Grim Armada runs on its own client at armada.grudge-studio.com. Account, wallet, and
            save sync use the shared Grudge ID + Game API — look up players from{" "}
            <a href="/accounts" className="text-primary">Accounts</a> or{" "}
            <a href="/query" className="text-primary">Query</a>.
          </p>
          <a
            href={game.liveUrl}
            target="_blank"
            rel="noreferrer"
            className="gilded-button inline-block px-4 py-2 text-xs"
          >
            Launch Carrier →
          </a>
        </section>
      )}

      {game.id === "grudox" && engineManifest.data && (
        <section className="fantasy-panel p-5 mb-6">
          <h2 className="text-lg mb-2">Nexus Engine Manifest</h2>
          <p className="text-xs text-muted-foreground mb-4">
            v{engineManifest.data.version} · {engineManifest.data.era} · {engineManifest.data.unit} · updated{" "}
            {new Date(engineManifest.data.updatedAt).toLocaleDateString()}
          </p>
          <div className="grid md:grid-cols-3 gap-4 text-sm">
            <div>
              <h3 className="text-xs uppercase text-muted-foreground mb-2">Controllers</h3>
              <ul className="space-y-1">
                {engineManifest.data.controllers.map((c) => (
                  <li key={c.id}>
                    <span className="text-primary">{c.id}</span>
                    <span className="text-muted-foreground"> · {c.driver} · scale {c.worldScale}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-xs uppercase text-muted-foreground mb-2">Cameras</h3>
              <ul className="space-y-1">
                {engineManifest.data.cameras.map((c) => (
                  <li key={c.id}>
                    <span className="text-primary">{c.id}</span>
                    <span className="text-muted-foreground"> · {c.mode} · fov {c.fov}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-xs uppercase text-muted-foreground mb-2">Animation Libraries</h3>
              <ul className="space-y-1">
                {engineManifest.data.animationLibraries.map((lib) => (
                  <li key={lib.id}>
                    <span className="text-primary">{lib.id}</span>
                    <span className="text-muted-foreground"> · {lib.rig} · {lib.clipCount} clips</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-4">
            CDN: {engineManifest.data.pipeline.cdnBase} · default height{" "}
            {engineManifest.data.pipeline.defaultCharacterHeightM}m
          </p>
        </section>
      )}

      {game.id === "grudox" && (
        <section>
          <h2 className="text-lg mb-3">Account lookup (Nexus API)</h2>
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={grudgeId}
              onChange={(e) => setGrudgeId(e.target.value)}
              placeholder="grudgeId e.g. guest_abc123 or puter_uuid"
              className="flex-1 bg-input border border-border rounded px-3 py-2 text-sm"
            />
          </div>
          {survivalAccount.isFetching && (
            <p className="text-sm text-muted-foreground">Looking up account…</p>
          )}
          {survivalAccount.data && (
            <div className="fantasy-panel p-4 mb-4 text-sm space-y-1">
              <p><span className="text-muted-foreground">Account ID:</span> {survivalAccount.data.id}</p>
              <p><span className="text-muted-foreground">Grudge ID:</span> {survivalAccount.data.grudgeId}</p>
              <p><span className="text-muted-foreground">Display:</span> {survivalAccount.data.displayName ?? "—"}</p>
              <p><span className="text-muted-foreground">Guest:</span> {String(survivalAccount.data.isGuest ?? false)}</p>
            </div>
          )}
          {survivalChars.data && survivalChars.data.length > 0 && (
            <DataTable
              columns={[
                { key: "id", label: "ID" },
                { key: "name", label: "Name" },
                { key: "accountId", label: "Account" },
                { key: "lastPlayedAt", label: "Last played" },
              ]}
              rows={survivalChars.data}
              emptyMsg="No characters"
            />
          )}
          {grudgeId.trim().length >= 3 && !survivalAccount.isFetching && !survivalAccount.data && (
            <div className="inset-panel p-4 text-sm text-muted-foreground">
              No Survival account for this grudgeId yet.
            </div>
          )}
        </section>
      )}
    </div>
  );
}