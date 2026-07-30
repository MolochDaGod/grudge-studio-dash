import { useLocation, Link } from "wouter";
import {
  LayoutDashboard, Users, Gamepad2, Swords, Fish, Joystick, Wrench,
  Server, HardDrive, Database, ScrollText, Rocket, Train,
  Trophy, Layers, Monitor, TableProperties, Search, Coins,
  Settings2, BookOpen, LogOut, Crosshair, Flame, Settings, Package, Boxes,
  UserCircle2, Link2, Shield,
} from "lucide-react";
import { useAuth } from "../lib/auth-context";
import { useGrudgePanel } from "./GrudgePanel";

/**
 * Nav priority for studio ops:
 * 1. Studio core (overview, accounts, characters)
 * 2. Game databases & data plane
 * 3. Flagship games
 * 4. Live ops (PvP / lobbies)
 * 5. Infrastructure
 */
const NAV = [
  {
    section: "Studio",
    items: [
      { href: "/", label: "Overview", icon: LayoutDashboard },
      { href: "/accounts", label: "Accounts", icon: Users },
      { href: "/characters", label: "Characters", icon: UserCircle2 },
      { href: "/settings", label: "Settings", icon: Settings },
    ],
  },
  {
    section: "Game Databases",
    items: [
      { href: "/database", label: "Databases", icon: Database },
      { href: "/schema", label: "Schema", icon: TableProperties },
      { href: "/query", label: "SQL Query", icon: Search },
      { href: "/economy", label: "Economy", icon: Coins },
      { href: "/asset-browser", label: "Asset Registry", icon: Boxes },
      { href: "/assets", label: "Data SSOT Map", icon: Package },
    ],
  },
  {
    section: "Flagship Games",
    items: [
      { href: "/games/warlords", label: "Warlords", icon: Swords },
      { href: "/games/carrier", label: "Carrier", icon: Gamepad2 },
      { href: "/games/grudox", label: "Grudox", icon: Crosshair },
      { href: "/games/nexus-nemesis", label: "Nexus Nemesis", icon: Layers },
    ],
  },
  {
    section: "More Games",
    items: [
      { href: "/games/unity", label: "Unity Game", icon: Gamepad2 },
      { href: "/games/grudge-wars", label: "Grudge Wars", icon: Swords },
      { href: "/games/angeler", label: "Angeler", icon: Fish },
      { href: "/games/gdevelop", label: "App Manager", icon: Joystick },
      { href: "/games/tools", label: "Builder & Tools", icon: Wrench },
      { href: "https://forge.grudge-studio.com", label: "GameForge", icon: Flame, external: true },
    ],
  },
  {
    section: "Live Ops",
    items: [
      { href: "/lobbies", label: "Lobbies", icon: Layers },
      { href: "/arena", label: "Arena", icon: Trophy },
      { href: "/battle", label: "Battle", icon: Crosshair },
      { href: "/mode-configs", label: "Game Modes", icon: Settings2 },
      { href: "/unity-servers", label: "Headless Servers", icon: Monitor },
      { href: "/tcg", label: "TCG", icon: Layers },
      { href: "/shop/nexus", label: "Nexus Shop", icon: Package },
    ],
  },
  {
    section: "Infrastructure",
    items: [
      { href: "/services", label: "Services", icon: Server },
      { href: "/railway", label: "Railway Fleet", icon: Train },
      { href: "/deploy", label: "Deploy", icon: Rocket },
      { href: "/storage", label: "Object Storage", icon: HardDrive },
      { href: "/logs", label: "Logs", icon: ScrollText },
      { href: "/docs", label: "Docs & Maps", icon: BookOpen },
    ],
  },
];

export default function Sidebar() {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const { open: openPanel, setActiveTab } = useGrudgePanel();

  return (
    <aside className="fantasy-panel fixed left-0 top-12 bottom-0 w-56 flex flex-col z-50 overflow-y-auto">
      <div className="p-4 border-b border-border">
        <a href="https://grudge-studio.com" className="flex items-center gap-2.5" target="_self" rel="noopener noreferrer">
          <img
            src="/grudge-id-logo.png"
            alt=""
            width={36}
            height={36}
            className="w-9 h-9 rounded-full object-cover ring-1 ring-primary/40 shrink-0"
            onError={(e) => {
              (e.target as HTMLImageElement).src = "https://id.grudge-studio.com/grudge-id-logo.png";
            }}
          />
          <div>
            <h2 className="text-base gold-text font-bold tracking-wider leading-tight">Grudge Studio</h2>
            <p className="text-[0.6rem] text-muted-foreground uppercase tracking-widest mt-0.5">
              Admin Dashboard
            </p>
          </div>
        </a>
      </div>

      <nav className="flex-1 py-2" aria-label="Dashboard navigation">
        {NAV.map((group) => (
          <div key={group.section} className="mb-1">
            <p className="px-4 py-2 text-[0.6rem] uppercase tracking-[0.15em] text-gold-dark font-bold">
              {group.section}
            </p>
            {group.items.map((item) => {
              const external = "external" in item && item.external;
              const active =
                !external &&
                (location === item.href || (item.href !== "/" && location.startsWith(item.href)));
              const className = `flex items-center gap-2.5 px-4 py-2 text-sm transition-colors ${
                active
                  ? "text-primary bg-accent border-r-2 border-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
              }`;

              if (external || item.href.startsWith("http")) {
                return (
                  <a
                    key={item.href}
                    href={item.href}
                    target="_blank"
                    rel="noreferrer"
                    className={className}
                  >
                    <item.icon size={16} />
                    {item.label}
                  </a>
                );
              }

              return (
                <Link key={item.href} href={item.href} className={className}>
                  <item.icon size={16} />
                  {item.label}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="p-3 border-t border-border space-y-2">
        <button
          type="button"
          onClick={() => {
            setActiveTab("profile");
            openPanel();
          }}
          className="w-full text-left px-2 py-1.5 rounded text-[0.65rem] text-primary hover:bg-accent border border-primary/20 flex items-center gap-1.5"
        >
          <Shield size={12} /> Grudge Panel
        </button>
        <div className="flex items-center justify-between">
          <span className="text-[0.6rem] text-muted-foreground truncate max-w-[8rem]">
            {user?.username || "Admin"}
          </span>
          <button type="button" onClick={logout} className="p-1 rounded hover:bg-accent" title="Logout">
            <LogOut size={12} className="text-muted-foreground hover:text-danger" />
          </button>
        </div>
        <div className="text-[0.55rem] text-muted-foreground text-center flex items-center justify-center gap-1">
          <Link2 size={10} /> dash.grudge-studio.com
        </div>
      </div>
    </aside>
  );
}
