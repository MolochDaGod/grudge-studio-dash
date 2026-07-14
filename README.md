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

### Studio
- **Overview** — Ecosystem health, app registry, quick stats
- **Settings / Accounts** — Grudge ID session, user management

### Flagship & games
- **Warlords / Carrier / Grudox** — Flagship launchers
- **Unity / Grudge Wars / Angeler / App Manager / Builder** — Additional games & tools

### PvP & lobbies
- Lobby manager, Arena, Battle, game modes, headless Unity servers, TCG

### Data
- **Warlords Assets** (`/asset-browser`) — Full live catalog of D1 `asset_registry` (~6k R2 binaries). Search, filter by category/format/source set, CDN URLs, copy UUID/R2 key. Source: `GET https://api.grudge-studio.com/assets`
- **Assets & SSOT** (`/assets`) — Topology map (Railway · ObjectStore · R2 · D1 registry · Puter)
- **Tables / Schema / Query / Economy** — Railway Postgres admin

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
