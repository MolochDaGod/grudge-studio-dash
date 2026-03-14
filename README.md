# Grudge Studio Dashboard

**Admin dashboard for the Grudge Studio backend ecosystem.**

## Live
- **Production**: [dash.grudge-studio.com](https://dash.grudge-studio.com)
- **Vercel**: [grudge-studio-dash.vercel.app](https://grudge-studio-dash.vercel.app)

## Stack
- React 19, Vite, Tailwind v4
- Wouter (routing), TanStack Query (data fetching)
- Recharts (charts), Lucide React (icons)
- WCS Fantasy Theme (Cinzel Decorative / Spectral SC fonts, gold/obsidian)

## Features
18 pages across 6 sections:

### Studio
- **Overview** — Ecosystem health, app registry, quick stats
- **Accounts** — User management, Grudge ID lookup

### Games
- **Unity Game** — Unity server management
- **Grudge Wars** — PvP arena config
- **Angeler** — Fishing game admin
- **App Manager** — Launch/embed all 16 Grudge apps
- **Builder & Tools** — Game builder tools

### Lobbies & Arena
- **Lobby Manager** — Multi-game lobby system
- **Arena** — PvP arena hosting
- **TCG** — Nemesis card game management
- **Unity Servers** — Unity server instances

### Server & Deploy
- **Services** — Docker container health monitoring
- **Deploy** — Container deployment management

### Database
- **Tables** — Browse all 16 DB tables
- **Schema Editor** — Visual schema editing
- **SQL Query** — Direct SQL runner

### Infrastructure
- **Object Storage** — MinIO bucket browser
- **Logs** — Container log viewer

## API
All API calls route through `api.grudge-studio.com`.

## Development
```bash
npm install
npm run dev
```

## Part of [Grudge Studio](https://grudge-studio.com)
