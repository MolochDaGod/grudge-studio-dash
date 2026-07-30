# Grudge Studio Dashboard

**Admin dashboard for the Grudge Studio backend ecosystem.**

## Live
- **Production**: [dash.grudge-studio.com](https://dash.grudge-studio.com)
- **Vercel**: [grudge-studio-dash.vercel.app](https://grudge-studio-dash.vercel.app)
- **Warlords asset catalog**: [dash.grudge-studio.com/asset-browser](https://dash.grudge-studio.com/asset-browser)  
  (alias: `/warlords-assets`)

## Stack
- React 19, Vite, Tailwind v4
- Wouter (routing), TanStack Query (data fetching)
- Recharts (charts), Lucide React (icons)
- WCS Fantasy Theme (Cinzel Decorative / Spectral SC fonts, gold/obsidian)

## Features

### Studio (priority)
- **Overview** — Ecosystem health, app registry, quick stats
- **Accounts** — User directory, Grudge ID lookup, ban/role admin, sessions, audit, role map
- **Characters** — Warlords list, cross-game Grudge ID roster (Game API + Survival/Grudox)
- **Settings** — Brand, service health, db-connections manifest

### Game Databases
- **Databases** (`/database`) — Multi-game DB map (SSOT / cache / D1 / R2), Postgres tables, row browser, endpoint health
- **Schema / SQL Query / Economy** — Railway Postgres admin tools
- **Asset Registry** (`/asset-browser`) — D1 `asset_registry` + R2 CDN catalog
- **Data SSOT Map** (`/assets`) — Topology (Railway · ObjectStore · R2 · D1 · Puter)

### Flagship & games
- **Warlords / Carrier / Grudox / Nexus** — Flagship launchers
- **Unity / Grudge Wars / Angeler / App Manager / Builder** — Additional games & tools

### Live ops
- Lobbies, Arena, Battle, game modes, headless Unity servers, TCG

### Infrastructure
- Services, Railway fleet, Deploy, Object Storage (R2), Logs, Docs & maps

## Asset catalog (Warlords)

| Concern | Source |
|---------|--------|
| Registry index | D1 `grudge-assets-db` / `asset_registry` via `https://api.grudge-studio.com/assets?limit=&offset=` |
| Binary files | R2 `grudge-assets` → `https://assets.grudge-studio.com/{r2Key}` |
| Definitions (recipes, items) | ObjectStore `https://objectstore.grudge-studio.com/api/v1/` |
| Player state | Railway Postgres only (`grudge-api-production`) |

Client code: `src/lib/assetRegistry.ts`, UI: `src/pages/AssetBrowser.tsx`.  
Hard rule: load Warlords meshes only from this registry + CDN — never Meshy/AI placeholders.

## API
- **Game / admin**: Railway `grudge-api-production` (`VITE_API_URL` / same-origin `/api/*` rewrites)
- **Auth**: `id.grudge-studio.com`
- **Asset registry list**: `api.grudge-studio.com/assets` (D1 index — not game state)
- **Asset binaries**: `assets.grudge-studio.com`
- **Do not** use `api.grudge-studio.com` for characters, islands, inventory, or admin CRUD

## Development
```bash
npm install
npm run dev
```

Open [http://localhost:5173/asset-browser](http://localhost:5173/asset-browser) for the catalog.

## Deploy
```bash
npm run build:check
npm run sync:deploy   # mirrors src → artifacts/dash
git push origin main  # Vercel auto-deploys dash.grudge-studio.com
```

## Part of [Grudge Studio](https://grudge-studio.com)
