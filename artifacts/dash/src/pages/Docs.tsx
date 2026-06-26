import TopBar from "../components/TopBar";

const VPS_IP = "74.208.155.229";
const VPS2_IP = "74.208.174.62";

const VPS_SERVICES = [
  { name: "grudge-id", port: 3001, domain: "id.grudge-studio.com", desc: "Auth, JWT, OAuth, Puter bridge" },
  { name: "wallet-service", port: 3002, domain: null, desc: "Solana wallets (internal)" },
  { name: "game-api", port: 3003, domain: "api.grudge-studio.com", desc: "Characters, PvP, economy, crafting, admin" },
  { name: "ai-agent", port: 3004, domain: null, desc: "LLM missions, companion, lore (internal)" },
  { name: "account-api", port: 3005, domain: "account.grudge-studio.com", desc: "Profiles, friends, achievements" },
  { name: "launcher-api", port: 3006, domain: "launcher.grudge-studio.com", desc: "Game launcher manifest" },
  { name: "ws-service", port: 3007, domain: "ws.grudge-studio.com", desc: "Socket.IO — /game, /pvp, /crew, /global" },
  { name: "asset-service", port: 3008, domain: "assets-api.grudge-studio.com", desc: "Upload, metadata, conversions" },
  { name: "grudge-bridge", port: 4000, domain: "bridge.grudge-studio.com", desc: "VPS ops — backups, deploy, mesh" },
  { name: "MySQL 8.0", port: 3306, domain: null, desc: "Primary database" },
  { name: "Redis 7", port: 6379, domain: null, desc: "Cache, PvP queues, pub/sub" },
  { name: "Uptime Kuma", port: 3001, domain: "status.grudge-studio.com", desc: "Health monitoring dashboard" },
];

const CF_WORKERS = [
  { name: "grudge-studio-site", domain: "grudge-studio.com", desc: "Main marketing site" },
  { name: "grudge-r2-cdn", domain: "assets.grudge-studio.com", desc: "R2 CDN — game assets" },
  { name: "grudge-health-ping", domain: "workers.dev", desc: "Cron health pings every 5m" },
];

const DNS_RECORDS = [
  { sub: "(root)", target: "CF Worker", proxied: true },
  { sub: "dash", target: "Vercel (76.76.21.21)", proxied: false },
  { sub: "id", target: `VPS1 (${VPS_IP})`, proxied: true },
  { sub: "api", target: `VPS1 (${VPS_IP})`, proxied: true },
  { sub: "account", target: `VPS1 (${VPS_IP})`, proxied: true },
  { sub: "launcher", target: `VPS1 (${VPS_IP})`, proxied: true },
  { sub: "ws", target: `VPS1 (${VPS_IP})`, proxied: true },
  { sub: "assets-api", target: `VPS1 (${VPS_IP})`, proxied: true },
  { sub: "assets", target: "CF Worker (R2)", proxied: true },
  { sub: "bridge", target: `VPS1 (${VPS_IP})`, proxied: true },
  { sub: "status", target: `VPS1 (${VPS_IP})`, proxied: true },
  { sub: "game", target: `VPS2 (${VPS2_IP})`, proxied: false },
];

const DEPLOY_STEPS = [
  { service: "VPS Backend (all services)", cmd: "ssh root@VPS → cd /opt/grudge-studio-backend && docker compose up -d --build" },
  { service: "Headless Game Server", cmd: "docker compose --profile gameserver up -d grudge-headless" },
  { service: "CF Workers", cmd: "cd cloudflare/workers/<name> && npx wrangler deploy" },
  { service: "Dashboard (this app)", cmd: "git push → Vercel auto-deploys from grudge-studio-dash repo" },
  { service: "GDevelop Assistant", cmd: "git push → Vercel auto-deploys from GDevelopAssistant repo" },
  { service: "Grudge Wars", cmd: "git push → Vercel auto-deploys from grudge-wars repo" },
];

const API_NAMESPACES = [
  { prefix: "/characters", auth: "JWT", desc: "CRUD characters for authenticated user" },
  { prefix: "/pvp", auth: "JWT", desc: "Lobbies, matchmaking, leaderboard, mode-configs, server pool" },
  { prefix: "/economy", auth: "JWT", desc: "Gold balance, spend, transfer, award (internal)" },
  { prefix: "/crafting", auth: "JWT", desc: "Recipes, queue, start/complete/cancel crafts" },
  { prefix: "/combat", auth: "Internal", desc: "Combat log, history, leaderboard" },
  { prefix: "/islands", auth: "JWT", desc: "Island state, claims, resources" },
  { prefix: "/missions", auth: "JWT", desc: "AI-generated missions" },
  { prefix: "/crews", auth: "JWT", desc: "Crew creation, join, leave, base claims" },
  { prefix: "/inventory", auth: "JWT", desc: "Player inventory management" },
  { prefix: "/professions", auth: "JWT", desc: "Harvesting profession levels" },
  { prefix: "/admin", auth: "Admin JWT", desc: "DB introspection, stats, containers, storage" },
];

export default function Docs() {
  return (
    <div>
      <TopBar title="Docs & System Maps" />

      <p className="text-sm text-muted-foreground mb-6">
        Internal reference for the Grudge Studio infrastructure. This page is auto-maintained in the dashboard codebase.
      </p>

      {/* Service Map */}
      <section className="mb-8">
        <h2 className="text-lg mb-3">VPS1 Services ({VPS_IP})</h2>
        <div className="inset-panel overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-3 py-2 text-[0.65rem] uppercase text-primary font-bold">Service</th>
                <th className="text-left px-3 py-2 text-[0.65rem] uppercase text-primary font-bold">Port</th>
                <th className="text-left px-3 py-2 text-[0.65rem] uppercase text-primary font-bold">Domain</th>
                <th className="text-left px-3 py-2 text-[0.65rem] uppercase text-primary font-bold">Description</th>
              </tr>
            </thead>
            <tbody>
              {VPS_SERVICES.map((s) => (
                <tr key={s.name} className="border-b border-border/50">
                  <td className="px-3 py-1.5 font-medium">{s.name}</td>
                  <td className="px-3 py-1.5 text-muted-foreground">:{s.port}</td>
                  <td className="px-3 py-1.5">{s.domain ? <code className="text-primary text-xs">{s.domain}</code> : <span className="text-muted-foreground text-xs">internal</span>}</td>
                  <td className="px-3 py-1.5 text-muted-foreground text-xs">{s.desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* CF Workers */}
      <section className="mb-8">
        <h2 className="text-lg mb-3">Cloudflare Workers</h2>
        <div className="inset-panel overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-3 py-2 text-[0.65rem] uppercase text-primary font-bold">Worker</th>
                <th className="text-left px-3 py-2 text-[0.65rem] uppercase text-primary font-bold">Domain</th>
                <th className="text-left px-3 py-2 text-[0.65rem] uppercase text-primary font-bold">Description</th>
              </tr>
            </thead>
            <tbody>
              {CF_WORKERS.map((w) => (
                <tr key={w.name} className="border-b border-border/50">
                  <td className="px-3 py-1.5 font-medium">{w.name}</td>
                  <td className="px-3 py-1.5"><code className="text-primary text-xs">{w.domain}</code></td>
                  <td className="px-3 py-1.5 text-muted-foreground text-xs">{w.desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* API Reference */}
      <section className="mb-8">
        <h2 className="text-lg mb-3">Game API Route Namespaces</h2>
        <p className="text-xs text-muted-foreground mb-3">Base: <code className="text-primary">https://api.grudge-studio.com</code></p>
        <div className="inset-panel overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-3 py-2 text-[0.65rem] uppercase text-primary font-bold">Prefix</th>
                <th className="text-left px-3 py-2 text-[0.65rem] uppercase text-primary font-bold">Auth</th>
                <th className="text-left px-3 py-2 text-[0.65rem] uppercase text-primary font-bold">Description</th>
              </tr>
            </thead>
            <tbody>
              {API_NAMESPACES.map((a) => (
                <tr key={a.prefix} className="border-b border-border/50">
                  <td className="px-3 py-1.5"><code className="text-warning text-xs">{a.prefix}</code></td>
                  <td className="px-3 py-1.5 text-xs">{a.auth}</td>
                  <td className="px-3 py-1.5 text-muted-foreground text-xs">{a.desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* DNS */}
      <section className="mb-8">
        <h2 className="text-lg mb-3">DNS Records (Cloudflare)</h2>
        <div className="inset-panel overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-3 py-2 text-[0.65rem] uppercase text-primary font-bold">Subdomain</th>
                <th className="text-left px-3 py-2 text-[0.65rem] uppercase text-primary font-bold">Target</th>
                <th className="text-left px-3 py-2 text-[0.65rem] uppercase text-primary font-bold">Proxy</th>
              </tr>
            </thead>
            <tbody>
              {DNS_RECORDS.map((r) => (
                <tr key={r.sub} className="border-b border-border/50">
                  <td className="px-3 py-1.5"><code className="text-xs">{r.sub}.grudge-studio.com</code></td>
                  <td className="px-3 py-1.5 text-muted-foreground text-xs">{r.target}</td>
                  <td className="px-3 py-1.5 text-xs">{r.proxied ? "🟠 Proxied" : "⚪ DNS only"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Deploy */}
      <section className="mb-8">
        <h2 className="text-lg mb-3">Deployment Checklist</h2>
        <div className="space-y-2">
          {DEPLOY_STEPS.map((d) => (
            <div key={d.service} className="fantasy-panel p-3">
              <p className="text-sm font-medium mb-1">{d.service}</p>
              <code className="text-xs text-muted-foreground block bg-background/50 p-2 rounded">{d.cmd}</code>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
