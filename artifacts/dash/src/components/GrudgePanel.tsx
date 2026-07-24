/**
 * Grudge Panel — right-side account + studio rail on dash.grudge-studio.com
 *
 * Merges:
 *  - Portal GrudgePanel UX (edge tab, profile, games, activity)
 *  - Dash admin navigation (Accounts, Assets, Railway, …)
 *  - Shared fleet session (Grudge ID JWT)
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  ChevronRight,
  ClipboardCopy,
  Coins,
  Database,
  ExternalLink,
  Gamepad2,
  LayoutDashboard,
  Loader2,
  LogOut,
  Package,
  Server,
  Settings,
  Shield,
  Swords,
  Train,
  Trophy,
  User,
  Users,
  X,
  Zap,
} from "lucide-react";
import { useAuth } from "../lib/auth-context";
import { FLAGSHIP_GAMES } from "../lib/config";
import { checkAllHealth } from "../lib/api";

// ── Context ─────────────────────────────────────────────────────

type TabId = "profile" | "studio" | "games" | "activity" | "settings";

interface GrudgePanelCtx {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
  activeTab: TabId;
  setActiveTab: (t: TabId) => void;
}

const Ctx = createContext<GrudgePanelCtx | null>(null);

export function useGrudgePanel() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useGrudgePanel requires GrudgePanelProvider");
  return c;
}

const TABS: { id: TabId; label: string; icon: typeof User }[] = [
  { id: "profile", label: "Profile", icon: User },
  { id: "studio", label: "Studio", icon: LayoutDashboard },
  { id: "games", label: "Games", icon: Gamepad2 },
  { id: "activity", label: "Systems", icon: Activity },
  { id: "settings", label: "Settings", icon: Settings },
];

/** Studio shortcuts — same destinations as left Sidebar, for the right rail */
const STUDIO_LINKS: { href: string; label: string; icon: typeof Users; external?: boolean }[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/accounts", label: "Accounts", icon: Users },
  { href: "/assets", label: "Assets & SSOT", icon: Package },
  { href: "/database", label: "Tables", icon: Database },
  { href: "/railway", label: "Railway Fleet", icon: Train },
  { href: "/services", label: "Services", icon: Server },
  { href: "/economy", label: "Economy", icon: Coins },
  { href: "/docs", label: "Docs", icon: ExternalLink },
];

const PORTAL = "https://grudge-studio.com";
const OPEN = "https://open.grudge-studio.com";

// ── Provider ────────────────────────────────────────────────────

export function GrudgePanelProvider({ children }: { children: ReactNode }) {
  const [isOpen, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>("profile");
  const open = useCallback(() => setOpen(true), []);
  const close = useCallback(() => setOpen(false), []);
  const toggle = useCallback(() => setOpen((o) => !o), []);
  const value = useMemo(
    () => ({ isOpen, open, close, toggle, activeTab, setActiveTab }),
    [isOpen, open, close, toggle, activeTab],
  );

  // Deep-link: ?panel=studio|games|…
  useEffect(() => {
    try {
      const q = new URLSearchParams(window.location.search);
      const p = q.get("panel") as TabId | null;
      if (p && TABS.some((t) => t.id === p)) {
        setActiveTab(p);
        setOpen(true);
      }
    } catch {
      /* ignore */
    }
  }, []);

  return (
    <Ctx.Provider value={value}>
      {children}
      <GrudgePanelSheet />
      <GrudgePanelEdgeTab />
    </Ctx.Provider>
  );
}

// ── Edge tab ────────────────────────────────────────────────────

function GrudgePanelEdgeTab() {
  const { toggle, isOpen } = useGrudgePanel();
  const { user } = useAuth();
  return (
    <button
      type="button"
      onClick={toggle}
      className="fixed right-0 top-1/2 -translate-y-1/2 z-[70] flex flex-col items-center gap-1 py-3 px-1.5 rounded-l-lg border border-r-0 transition-all hover:px-2.5"
      style={{
        background: isOpen
          ? "linear-gradient(135deg, hsl(43,60%,20%), hsl(43,50%,15%))"
          : "linear-gradient(135deg, hsl(225,28%,12%), hsl(225,30%,8%))",
        borderColor: isOpen ? "rgba(200,153,26,0.5)" : "rgba(200,153,26,0.25)",
        boxShadow: isOpen ? "0 0 12px rgba(200,153,26,0.2)" : "none",
      }}
      title="Grudge Panel"
      aria-label="Open Grudge Panel"
    >
      <Shield size={16} className="text-primary" />
      <span className="text-[8px] uppercase tracking-wider text-primary font-bold writing-mode-vertical">
        {user?.username?.slice(0, 8) || "Panel"}
      </span>
    </button>
  );
}

// ── Sheet ───────────────────────────────────────────────────────

function GrudgePanelSheet() {
  const { isOpen, close, activeTab, setActiveTab } = useGrudgePanel();
  const { user } = useAuth();

  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-[80] bg-black/50 backdrop-blur-[1px]"
        onClick={close}
        aria-hidden
      />
      <aside
        className="fixed top-0 right-0 bottom-0 z-[90] w-[min(100vw,400px)] flex flex-col border-l shadow-2xl"
        style={{
          background: "linear-gradient(180deg, hsl(225,32%,9%), hsl(225,30%,6%))",
          borderColor: "rgba(200,153,26,0.3)",
        }}
        role="dialog"
        aria-label="Grudge Panel"
      >
        <div
          className="flex items-center justify-between px-4 py-3 border-b shrink-0"
          style={{ borderColor: "rgba(200,153,26,0.2)" }}
        >
          <div className="flex items-center gap-2">
            <Shield size={16} className="text-primary" />
            <span className="text-sm font-bold tracking-wider text-primary">GRUDGE PANEL</span>
          </div>
          <div className="flex items-center gap-2">
            {user && (
              <span className="text-[10px] text-primary uppercase tracking-wide">{user.role}</span>
            )}
            <button type="button" onClick={close} className="p-1 rounded hover:bg-accent" aria-label="Close">
              <X size={16} className="text-muted-foreground" />
            </button>
          </div>
        </div>

        <div
          className="flex shrink-0 border-b"
          style={{ borderColor: "rgba(200,153,26,0.15)" }}
        >
          {TABS.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className="flex-1 flex flex-col items-center gap-0.5 py-2 transition-colors relative"
                style={{ color: active ? "hsl(43 85% 55%)" : "hsl(45 15% 50%)" }}
              >
                <tab.icon size={14} />
                <span className="text-[9px] uppercase tracking-wider font-semibold">{tab.label}</span>
                {active && (
                  <div
                    className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full"
                    style={{ background: "linear-gradient(90deg, transparent, #c8991a, transparent)" }}
                  />
                )}
              </button>
            );
          })}
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {activeTab === "profile" && <ProfileTab />}
          {activeTab === "studio" && <StudioTab />}
          {activeTab === "games" && <GamesTab />}
          {activeTab === "activity" && <SystemsTab />}
          {activeTab === "settings" && <SettingsTab />}
        </div>
      </aside>
    </>
  );
}

// ── Tabs ────────────────────────────────────────────────────────

function CopyBtn({ text }: { text: string }) {
  const [ok, setOk] = useState(false);
  return (
    <button
      type="button"
      className="text-muted-foreground hover:text-primary"
      title="Copy"
      onClick={() => {
        void navigator.clipboard.writeText(text);
        setOk(true);
        setTimeout(() => setOk(false), 1200);
      }}
    >
      <ClipboardCopy size={12} className={ok ? "text-success" : ""} />
    </button>
  );
}

function ProfileTab() {
  const { user } = useAuth();
  const { close } = useGrudgePanel();
  if (!user) return null;

  return (
    <div className="space-y-4">
      <div className="fantasy-panel p-4 space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-accent border border-border flex items-center justify-center">
            <Shield size={22} className="text-primary" />
          </div>
          <div className="min-w-0">
            <div className="font-bold text-primary truncate">{user.username}</div>
            <div className="text-xs text-muted-foreground capitalize">{user.role} · dash operator</div>
          </div>
        </div>
        <div className="flex items-center gap-2 p-2 rounded bg-background/60 border border-border text-xs font-mono">
          <span className="truncate flex-1 text-primary">{user.grudgeId || "—"}</span>
          {user.grudgeId && <CopyBtn text={user.grudgeId} />}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <a
          href={`${PORTAL}/account`}
          target="_blank"
          rel="noreferrer"
          className="fantasy-panel p-3 text-xs hover:border-primary no-underline text-foreground"
        >
          Portal account <ExternalLink size={10} className="inline ml-1 opacity-60" />
        </a>
        <Link href="/accounts" onClick={close} className="fantasy-panel p-3 text-xs hover:border-primary no-underline text-foreground">
          Admin accounts <ChevronRight size={10} className="inline ml-1 opacity-60" />
        </Link>
      </div>

      <p className="text-[11px] text-muted-foreground leading-relaxed">
        Same Grudge ID session as the portal right panel. Dash is the admin shell; portal holds Rec0deD scores &amp; GBUX.
      </p>
    </div>
  );
}

function StudioTab() {
  const { close } = useGrudgePanel();
  const [location] = useLocation();

  return (
    <div className="space-y-4">
      <p className="text-[11px] text-muted-foreground">
        Dashboard navigation — same destinations as the left sidebar, in the right rail.
      </p>
      <ul className="space-y-1">
        {STUDIO_LINKS.map((item) => {
          const active = location === item.href || (item.href !== "/" && location.startsWith(item.href));
          const Icon = item.icon;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                onClick={close}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded text-sm no-underline transition-colors ${
                  active
                    ? "bg-primary/15 text-primary border border-primary/30"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/50 border border-transparent"
                }`}
              >
                <Icon size={15} />
                <span className="flex-1">{item.label}</span>
                <ChevronRight size={12} className="opacity-40" />
              </Link>
            </li>
          );
        })}
      </ul>

      <div className="border-t border-border pt-3">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Portal</p>
        <a
          href={PORTAL}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-2 text-xs text-primary hover:underline no-underline"
        >
          grudge-studio.com <ExternalLink size={11} />
        </a>
      </div>
    </div>
  );
}

function GamesTab() {
  const { close } = useGrudgePanel();
  return (
    <div className="space-y-4">
      <div>
        <p className="text-[10px] uppercase tracking-wider text-primary mb-2">Flagship (dash)</p>
        <ul className="space-y-1">
          {FLAGSHIP_GAMES.map((g) => (
            <li key={g.id} className="flex items-center gap-2">
              <Link
                href={g.dashPath}
                onClick={close}
                className="flex-1 fantasy-panel px-3 py-2 text-xs no-underline text-foreground hover:border-primary"
              >
                {g.icon} {g.label}
              </Link>
              <a
                href={g.playUrl ?? g.liveUrl}
                target="_blank"
                rel="noreferrer"
                className="p-2 text-muted-foreground hover:text-primary"
                title="Open live"
              >
                <ExternalLink size={14} />
              </a>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <p className="text-[10px] uppercase tracking-wider text-primary mb-2">Rec0deD / Open</p>
        <div className="grid grid-cols-1 gap-1.5">
          <a
            href={`${PORTAL}/pvp`}
            target="_blank"
            rel="noreferrer"
            className="fantasy-panel px-3 py-2 text-xs no-underline text-foreground hover:border-primary flex items-center gap-2"
          >
            <Swords size={14} className="text-primary" /> Competitive Top 10 PvP
          </a>
          <a
            href={`${PORTAL}/leaderboards?tab=competitive`}
            target="_blank"
            rel="noreferrer"
            className="fantasy-panel px-3 py-2 text-xs no-underline text-foreground hover:border-primary flex items-center gap-2"
          >
            <Trophy size={14} className="text-primary" /> Leaderboards
          </a>
          <a
            href={`${OPEN}/annihilate-demo`}
            target="_blank"
            rel="noreferrer"
            className="fantasy-panel px-3 py-2 text-xs no-underline text-foreground hover:border-primary flex items-center gap-2"
          >
            <Zap size={14} className="text-primary" /> Open · Annihilate / Danger
          </a>
        </div>
      </div>
    </div>
  );
}

function SystemsTab() {
  const health = useQuery({
    queryKey: ["health", "panel"],
    queryFn: checkAllHealth,
    refetchInterval: 45_000,
  });
  const { close } = useGrudgePanel();
  const online = health.data?.filter((s) => s.ok).length ?? 0;
  const total = health.data?.length ?? 0;

  return (
    <div className="space-y-4">
      <div className="fantasy-panel p-3 flex items-center justify-between">
        <div>
          <div className="text-[10px] uppercase text-muted-foreground">Fleet health</div>
          <div className="text-lg font-bold text-primary">
            {health.isLoading ? "…" : `${online}/${total}`}
          </div>
        </div>
        <Link href="/services" onClick={close} className="text-xs text-primary hover:underline no-underline">
          Services →
        </Link>
      </div>

      {health.isLoading ? (
        <Loader2 className="animate-spin text-primary mx-auto" size={20} />
      ) : (
        <ul className="space-y-1 max-h-72 overflow-y-auto">
          {(health.data ?? []).map((s) => (
            <li
              key={s.key}
              className="flex items-center justify-between px-2 py-1.5 rounded border border-border/50 text-xs"
            >
              <span className="truncate text-muted-foreground">{s.name}</span>
              <span className={s.ok ? "text-success" : "text-danger"}>
                {s.ok ? `${s.ms}ms` : "down"}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function SettingsTab() {
  const { user, logout } = useAuth();
  const { close } = useGrudgePanel();
  return (
    <div className="space-y-4">
      <div className="space-y-1 text-xs">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Username</span>
          <span>@{user?.username}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Role</span>
          <span className="text-primary capitalize">{user?.role}</span>
        </div>
        <div className="flex justify-between gap-2">
          <span className="text-muted-foreground shrink-0">Grudge ID</span>
          <span className="font-mono text-[10px] text-primary truncate">{user?.grudgeId}</span>
        </div>
      </div>

      <Link
        href="/settings"
        onClick={close}
        className="block fantasy-panel px-3 py-2 text-xs no-underline text-foreground hover:border-primary"
      >
        Full settings page →
      </Link>

      <button
        type="button"
        className="w-full flex items-center justify-center gap-2 py-2 rounded border border-danger/40 text-danger text-xs hover:bg-danger/10"
        onClick={() => {
          logout();
          close();
        }}
      >
        <LogOut size={14} /> Sign out
      </button>
    </div>
  );
}
