import { useLocation, Link } from "wouter";
import {
  LayoutDashboard, Users, Gamepad2, Swords, Fish, Joystick, Wrench,
  Server, HardDrive, Database, ScrollText, Rocket, Train,
  Trophy, Layers, Monitor, TableProperties, Search, Coins,
  Settings2, BookOpen, LogOut, Crosshair, Flame, Settings,
} from "lucide-react";
import { useAuth } from "../lib/auth-context";

const NAV = [
  {
    section: "Overview",
    items: [
      { href: "/", label: "Dashboard", icon: LayoutDashboard },
      { href: "/settings", label: "Settings", icon: Settings },
      { href: "/accounts", label: "Accounts", icon: Users },
    ],
  },
  {
    section: "Flagship Games",
    items: [
      { href: "/games/warlords", label: "Warlords", icon: Swords },
      { href: "/games/carrier", label: "Carrier", icon: Gamepad2 },
      { href: "/games/grudox", label: "Grudox", icon: Crosshair },
    ],
  },
  {
    section: "More Games",
    items: [
      { href: "/games/unity", label: "Unity Game", icon: Gamepad2 },
      { href: "/games/grudge-wars", label: "Grudge Wars (legacy)", icon: Swords },
      { href: "/games/angeler", label: "Grudge Angeler", icon: Fish },
      { href: "/games/gdevelop", label: "App Manager", icon: Joystick },
      { href: "/games/tools", label: "Builder & Tools", icon: Wrench },
      { href: "https://forge.grudge-studio.com", label: "GameForge", icon: Flame },
    ],
  },
  {
    section: "PvP & Lobbies",
    items: [
      { href: "/lobbies", label: "Lobby Manager", icon: Layers },
      { href: "/arena", label: "Arena", icon: Trophy },
      { href: "/battle", label: "Battle", icon: Crosshair },
      { href: "/mode-configs", label: "Game Modes", icon: Settings2 },
      { href: "/unity-servers", label: "Headless Servers", icon: Monitor },
      { href: "/tcg", label: "TCG", icon: Layers },
    ],
  },
  {
    section: "Data",
    items: [
      { href: "/database", label: "Tables", icon: Database },
      { href: "/schema", label: "Schema Editor", icon: TableProperties },
      { href: "/query", label: "Query", icon: Search },
      { href: "/economy", label: "Economy", icon: Coins },
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
    ],
  },
  {
    section: "Reference",
    items: [
      { href: "/docs", label: "Docs & Maps", icon: BookOpen },
    ],
  },
];

export default function Sidebar() {
  const [location] = useLocation();
  const { user, logout } = useAuth();

  return (
    <aside className="fantasy-panel fixed left-0 top-12 bottom-0 w-56 flex flex-col z-50 overflow-y-auto">
      {/* Logo */}
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
            <p className="text-[0.6rem] text-muted-foreground uppercase tracking-widest mt-0.5">Dashboard</p>
          </div>
        </a>
      </div>

      {/* Nav sections */}
      <nav className="flex-1 py-2">
        {NAV.map((group) => (
          <div key={group.section} className="mb-1">
            <p className="px-4 py-2 text-[0.6rem] uppercase tracking-[0.15em] text-gold-dark font-bold">
              {group.section}
            </p>
            {group.items.map((item) => {
              const active = location === item.href || (item.href !== "/" && location.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2.5 px-4 py-2 text-sm transition-colors ${
                    active
                      ? "text-primary bg-accent border-r-2 border-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                  }`}
                >
                  <item.icon size={16} />
                  {item.label}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-border">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[0.6rem] text-muted-foreground">{user?.username || "Admin"}</span>
          <button onClick={logout} className="p-1 rounded hover:bg-accent" title="Logout">
            <LogOut size={12} className="text-muted-foreground hover:text-danger" />
          </button>
        </div>
        <div className="text-[0.55rem] text-muted-foreground text-center">dash.grudge-studio.com</div>
      </div>
    </aside>
  );
}
