import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { FLAGSHIP_GAMES, SERVICES } from "../lib/config";
import { checkAllHealth } from "../lib/api";
import { useAuth } from "../lib/auth-context";
import { useGrudgePanel } from "./GrudgePanel";
import { ExternalLink, Activity, Shield } from "lucide-react";

export default function GamesTopBar() {
  const [location] = useLocation();
  const { user } = useAuth();
  const { toggle, isOpen } = useGrudgePanel();
  const health = useQuery({
    queryKey: ["health"],
    queryFn: checkAllHealth,
    refetchInterval: 45_000,
    staleTime: 20_000,
  });

  const online = health.data?.filter((s) => s.ok).length ?? 0;
  const total = health.data?.length ?? SERVICES.length;

  return (
    <header className="fixed top-0 left-0 right-0 z-[60] h-12 border-b border-border bg-[hsl(225_28%_6%/0.95)] backdrop-blur-md">
      <div className="h-full flex items-center justify-between px-4 gap-4">
        {/* Brand */}
        <Link href="/" className="shrink-0 no-underline">
          <span className="text-sm font-bold gold-text tracking-wider">GRUDGE STUDIO</span>
        </Link>

        {/* Flagship games */}
        <nav className="flex items-center gap-1 flex-1 justify-center min-w-0 overflow-x-auto">
          {FLAGSHIP_GAMES.map((game) => {
            const active =
              location === game.dashPath || location.startsWith(`${game.dashPath}/`);
            return (
              <div key={game.id} className="flex items-center shrink-0">
                <Link
                  href={game.dashPath}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold tracking-wide transition-colors no-underline ${
                    active
                      ? "bg-primary/20 text-primary border border-primary/40"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent/60 border border-transparent"
                  }`}
                >
                  <span>{game.icon}</span>
                  <span>{game.label}</span>
                </Link>
                <a
                  href={game.playUrl ?? game.liveUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="p-1 text-muted-foreground hover:text-primary"
                  title={game.playUrl ? `Play ${game.label}` : `Open ${game.label}`}
                >
                  <ExternalLink size={12} />
                </a>
              </div>
            );
          })}
        </nav>

        {/* Systems + session */}
        <div className="flex items-center gap-3 shrink-0 text-xs">
          <Link
            href="/services"
            className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground no-underline"
            title="Backend services health"
          >
            <Activity size={14} className={online === total ? "text-success" : "text-warning"} />
            <span>
              {health.isLoading ? "…" : `${online}/${total}`} systems
            </span>
          </Link>
          <Link href="/accounts" className="text-muted-foreground hover:text-primary no-underline">
            Accounts
          </Link>
          <Link href="/query" className="text-muted-foreground hover:text-primary no-underline">
            Query
          </Link>
          {user && (
            <button
              type="button"
              onClick={toggle}
              className={`flex items-center gap-1.5 px-2 py-1 rounded border text-xs font-semibold transition-colors ${
                isOpen
                  ? "border-primary/50 bg-primary/15 text-primary"
                  : "border-border text-gold-light hover:border-primary/40"
              }`}
              title="Open Grudge Panel"
            >
              <Shield size={14} />
              <span className="hidden sm:inline">{user.username}</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}