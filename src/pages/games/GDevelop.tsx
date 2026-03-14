import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import TopBar from "../../components/TopBar";
import { StatCard, DataTable } from "../../components/Cards";
import AppEmbed from "../../components/AppEmbed";
import { checkDeployment } from "../../lib/api";
import { GRUDGE_APPS, type GrudgeApp, type AppCategory } from "../../lib/config";
import { Play, ExternalLink, Zap, GitBranch } from "lucide-react";

type Tab = "launcher" | "editors" | "catalog" | "registry";
const TABS: { key: Tab; label: string }[] = [
  { key: "launcher", label: "Game Launcher" },
  { key: "editors", label: "Editors" },
  { key: "catalog", label: "Apps & Tools" },
  { key: "registry", label: "Registry" },
];

const CATEGORY_LABELS: Record<AppCategory, string> = {
  game: "Games", editor: "Editors", tool: "Tools", infra: "Infrastructure", web3: "Web3 / Chain",
};

function useAppHealth() {
  return useQuery({
    queryKey: ["app-health"],
    queryFn: () => Promise.all(GRUDGE_APPS.map((a) => checkDeployment(a.liveUrl))),
    refetchInterval: 60_000,
  });
}

export default function GDevelop() {
  const [tab, setTab] = useState<Tab>("launcher");
  const [embedded, setEmbedded] = useState<GrudgeApp | null>(null);
  const health = useAppHealth();

  const isOnline = (url: string) => health.data?.find((h) => h.url === url)?.online ?? null;

  const games = GRUDGE_APPS.filter((a) => a.category === "game");
  const editors = GRUDGE_APPS.filter((a) => a.category === "editor");
  const onlineCount = health.data?.filter((h) => h.online).length ?? 0;

  const openApp = (app: GrudgeApp) => {
    if (app.embeddable && app.liveUrl) setEmbedded(app);
    else if (app.liveUrl) window.open(app.liveUrl, "_blank");
  };

  if (embedded) return <AppEmbed app={embedded} onClose={() => setEmbedded(null)} />;

  return (
    <div>
      <TopBar title="App Manager" />
      <p className="text-sm text-muted-foreground mb-4">Grudge Services Manager — launch games, embed editors, and manage all Grudge apps from one place.</p>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        <StatCard icon="\ud83d\udcf1" value={GRUDGE_APPS.length} label="Total Apps" />
        <StatCard icon="\ud83c\udfae" value={games.length} label="Games" />
        <StatCard icon="\ud83d\udee0\ufe0f" value={editors.length} label="Editors" />
        <StatCard icon="\u2705" value={onlineCount} label="Online" />
        <StatCard icon="\ud83d\udd17" value={GRUDGE_APPS.filter((a) => a.embeddable).length} label="Embeddable" />
      </div>

      <div className="flex gap-1 mb-6 border-b border-border">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm transition-colors border-b-2 ${
              tab === t.key ? "text-primary border-primary" : "text-muted-foreground border-transparent hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "launcher" && <LauncherTab games={games} isOnline={isOnline} openApp={openApp} />}
      {tab === "editors" && <EditorsTab editors={editors} isOnline={isOnline} openApp={openApp} />}
      {tab === "catalog" && <CatalogTab isOnline={isOnline} openApp={openApp} />}
      {tab === "registry" && <RegistryTab isOnline={isOnline} />}
    </div>
  );
}

/* ─── Launcher Tab ─────────────────────────────────────────────── */
function LauncherTab({ games, isOnline, openApp }: { games: GrudgeApp[]; isOnline: (url: string) => boolean | null; openApp: (a: GrudgeApp) => void }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {games.map((g) => {
        const online = isOnline(g.liveUrl);
        return (
          <div key={g.id} className="fantasy-panel p-5 flex flex-col">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-3xl">{g.icon}</span>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold">{g.name}</h3>
                  {online !== null && <span className={`w-2 h-2 rounded-full ${online ? "bg-green-400" : "bg-red-400"}`} />}
                </div>
                <p className="text-xs text-muted-foreground">{g.description}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-1 mb-3">
              {g.backend.filter((b) => b !== "none").map((b) => (
                <span key={b} className="text-[0.55rem] px-1.5 py-0.5 rounded bg-accent/20 text-accent uppercase tracking-wider">{b}</span>
              ))}
            </div>
            <div className="mt-auto flex gap-2">
              {g.liveUrl ? (
                <>
                  <button onClick={() => openApp(g)} className="gilded-button flex items-center gap-1 px-3 py-1.5 text-xs flex-1 justify-center">
                    {g.embeddable ? <><Play size={12} /> Play</> : <><ExternalLink size={12} /> Launch</>}
                  </button>
                  {g.embeddable && (
                    <a href={g.liveUrl} target="_blank" rel="noopener noreferrer" className="gilded-button flex items-center gap-1 px-2 py-1.5 text-xs">
                      <ExternalLink size={12} />
                    </a>
                  )}
                </>
              ) : (
                <span className="text-xs text-muted-foreground italic">No deployment</span>
              )}
            </div>
            {g.repo && (
              <a href={`https://github.com/${g.repo}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[0.6rem] text-muted-foreground hover:text-foreground mt-2">
                <GitBranch size={10} /> {g.repo}
              </a>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ─── Editors Tab ──────────────────────────────────────────────── */
function EditorsTab({ editors, isOnline, openApp }: { editors: GrudgeApp[]; isOnline: (url: string) => boolean | null; openApp: (a: GrudgeApp) => void }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground mb-4">Click "Open Editor" to embed the tool directly inside the dashboard, or open in a new tab.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {editors.map((e) => {
          const online = isOnline(e.liveUrl);
          return (
            <div key={e.id} className="fantasy-panel p-5">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-3xl">{e.icon}</span>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold">{e.name}</h3>
                    {online !== null && <span className={`w-2 h-2 rounded-full ${online ? "bg-green-400" : "bg-red-400"}`} />}
                  </div>
                  <p className="text-xs text-muted-foreground">{e.description}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-1 mb-3">
                {e.backend.filter((b) => b !== "none").map((b) => (
                  <span key={b} className="text-[0.55rem] px-1.5 py-0.5 rounded bg-accent/20 text-accent uppercase tracking-wider">{b}</span>
                ))}
              </div>
              <div className="flex gap-2">
                <button onClick={() => openApp(e)} className="gilded-button flex items-center gap-1 px-3 py-1.5 text-xs flex-1 justify-center">
                  <Zap size={12} /> Open Editor
                </button>
                <a href={e.liveUrl} target="_blank" rel="noopener noreferrer" className="gilded-button flex items-center gap-1 px-2 py-1.5 text-xs">
                  <ExternalLink size={12} />
                </a>
              </div>
              {e.repo && (
                <a href={`https://github.com/${e.repo}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[0.6rem] text-muted-foreground hover:text-foreground mt-2">
                  <GitBranch size={10} /> {e.repo}
                </a>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Catalog Tab ──────────────────────────────────────────────── */
function CatalogTab({ isOnline, openApp }: { isOnline: (url: string) => boolean | null; openApp: (a: GrudgeApp) => void }) {
  const categories = Object.keys(CATEGORY_LABELS) as AppCategory[];
  return (
    <div className="space-y-6">
      {categories.map((cat) => {
        const apps = GRUDGE_APPS.filter((a) => a.category === cat);
        if (apps.length === 0) return null;
        return (
          <section key={cat}>
            <h2 className="text-lg mb-3">{CATEGORY_LABELS[cat]} <span className="text-xs text-muted-foreground ml-1">({apps.length})</span></h2>
            <div className="space-y-2">
              {apps.map((a) => {
                const online = isOnline(a.liveUrl);
                return (
                  <div key={a.id} className="fantasy-panel p-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-lg">{a.icon}</span>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{a.name}</span>
                          {online !== null && <span className={`w-2 h-2 rounded-full ${online ? "bg-green-400" : "bg-red-400"}`} />}
                          {a.embeddable && <span className="text-[0.5rem] px-1 py-0.5 rounded bg-primary/20 text-primary uppercase">embed</span>}
                        </div>
                        <p className="text-xs text-muted-foreground">{a.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {a.liveUrl && <button onClick={() => openApp(a)} className="gilded-button px-2 py-1 text-xs">Open</button>}
                      {a.repo && (
                        <a href={`https://github.com/${a.repo}`} target="_blank" rel="noopener noreferrer" className="gilded-button px-2 py-1 text-xs">
                          <GitBranch size={10} />
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}

/* ─── Registry Tab ─────────────────────────────────────────────── */
function RegistryTab({ isOnline }: { isOnline: (url: string) => boolean | null }) {
  const rows = GRUDGE_APPS.map((a) => {
    const online = isOnline(a.liveUrl);
    return {
      icon: a.icon,
      name: a.name,
      category: a.category,
      url: a.liveUrl || "—",
      repo: a.repo,
      backend: a.backend.filter((b) => b !== "none").join(", ") || "—",
      embed: a.embeddable ? "✓" : "✗",
      status: a.liveUrl ? (online === null ? "..." : online ? "online" : "offline") : "n/a",
    };
  });

  return (
    <DataTable
      columns={[
        { key: "icon", label: "" },
        { key: "name", label: "App" },
        { key: "category", label: "Category" },
        { key: "status", label: "Status" },
        { key: "embed", label: "Embed" },
        { key: "backend", label: "Backend" },
        { key: "repo", label: "Repo" },
      ]}
      rows={rows}
      emptyMsg="No apps in registry"
    />
  );
}
