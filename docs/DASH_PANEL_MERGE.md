# Dash + right Grudge Panel (merged)

## Layout

```
┌─────────────────────────────────────────────────────────────┐
│ GamesTopBar  [flagship]  [systems]  [username → open panel] │
├──────────┬──────────────────────────────────┬───────────────┤
│ Sidebar  │  main page content               │ Edge tab /    │
│ (left)   │  (ml-56)                         │ Panel (right) │
│ nav      │                                  │ Profile       │
│          │                                  │ Studio nav    │
│          │                                  │ Games / Open  │
│          │                                  │ Systems       │
└──────────┴──────────────────────────────────┴───────────────┘
```

## Wiring

| Surface | Role |
|---------|------|
| **Left Sidebar** | Full admin IA (same as before) |
| **Right Grudge Panel** | Account + condensed studio nav + portal/Open links |
| **Portal Grudge Panel** | Player account + **Studio** tab → dash deep links |
| **Auth** | Grudge ID JWT · fleet keys · `grudge_dash_session` |

Deep-link open panel: `https://dash.grudge-studio.com/?panel=studio`

## Deploy

```bash
cd F:\GitHub\grudge-studio-dash
npm run build
npx vercel deploy --prod --yes
```

Portal (Studio tab): deploy The-ENGINE after `grudge-panel.tsx` change.
