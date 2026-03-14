import { useLocation, Link } from "wouter";
import {
  LayoutDashboard, Users, Gamepad2, Swords, Fish, Joystick, Wrench,
  Server, HardDrive, Database, ScrollText, Rocket,
  Trophy, Layers, Monitor, TableProperties, Code, Search,
} from "lucide-react";

const NAV = [
  {
    section: "Studio",
    items: [
      { href: "/", label: "Overview", icon: LayoutDashboard },
      { href: "/accounts", label: "Accounts", icon: Users },
    ],
  },
  {
    section: "Games",
    items: [
      { href: "/games/unity", label: "Unity Game", icon: Gamepad2 },
      { href: "/games/grudge-wars", label: "Grudge Wars", icon: Swords },
      { href: "/games/angeler", label: "Grudge Angeler", icon: Fish },
      { href: "/games/gdevelop", label: "GDevelop", icon: Joystick },
      { href: "/games/tools", label: "Builder & Tools", icon: Wrench },
    ],
  },
  {
    section: "Lobbies & Arena",
    items: [
      { href: "/lobbies", label: "Lobby Manager", icon: Layers },
      { href: "/arena", label: "Arena", icon: Trophy },
      { href: "/tcg", label: "TCG", icon: Layers },
      { href: "/unity-servers", label: "Unity Servers", icon: Monitor },
    ],
  },
  {
    section: "Server & Deploy",
    items: [
      { href: "/services", label: "Services", icon: Server },
      { href: "/deploy", label: "Deploy", icon: Rocket },
    ],
  },
  {
    section: "Database",
    items: [
      { href: "/database", label: "Tables", icon: Database },
      { href: "/schema", label: "Schema Editor", icon: TableProperties },
      { href: "/query", label: "Query", icon: Search },
    ],
  },
  {
    section: "Infrastructure",
    items: [
      { href: "/storage", label: "Object Storage", icon: HardDrive },
      { href: "/logs", label: "Logs", icon: ScrollText },
    ],
  },
];

export default function Sidebar() {
  const [location] = useLocation();

  return (
    <aside className="fantasy-panel fixed left-0 top-0 bottom-0 w-56 flex flex-col z-50 overflow-y-auto">
      {/* Logo */}
      <div className="p-4 border-b border-border">
        <Link href="/" className="block">
          <h2 className="text-lg gold-text font-bold tracking-wider">Grudge Studio</h2>
          <p className="text-[0.65rem] text-muted-foreground uppercase tracking-widest mt-0.5">Dashboard</p>
        </Link>
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
      <div className="p-3 border-t border-border text-[0.6rem] text-muted-foreground text-center">
        dash.grudge-studio.com
      </div>
    </aside>
  );
}
