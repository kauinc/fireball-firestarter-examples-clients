# Doof Troop (ReactJS)

FireStarter game client (React) for Fireball RGS — **Doof Troop** LiveKit viewer with
betting / race / settlement HUD overlays driven by Supabase `rounds.status` Realtime.

Path in this monorepo: `ReactJS/DoofTroop`.

## Setup

```bash
# from repo root:
cd ReactJS/DoofTroop
cp .env.example .env   # optional overrides
npm install
npm run dev
```

Dev proxies `/api/livekit-token` to the dt-dashboard viewer token endpoint
(`vite.config.js`). Without a reachable token URL, the UI shows **TAP TO RETRY**.

### Environment

| Variable | Purpose |
| --- | --- |
| `VITE_LIVEKIT_TOKEN_URL` | Viewer token endpoint (default `/api/livekit-token`) |
| `VITE_SUPABASE_URL` | Optional Supabase URL override |
| `VITE_SUPABASE_ANON_KEY` | Optional Supabase anon/publishable key override |
| `VITE_FIREBALL_GAME_MODE` | `fun` (local wallet) / `coins` / `money` — launch URL `?mode=` wins when present |
| `VITE_FIREBALL_CURRENCY` | Default `USD`; use `COINS` for coins mode |
| `VITE_FIREBALL_DEMO` | Dev override for coins/money auth only (not a substitute for fun) |
| `VITE_FIREBALL_TRANSLATION_APP_ID` | Translation CMS app UUID |

Defaults for Supabase are in `src/shared/config/supabase.js`.

### Game modes

| Mode | Stream | Wallet |
| --- | --- | --- |
| **fun** | LiveKit + Supabase | Local only — no CF `PlaceBet` / `PayWin`; start **$5,000** play money |
| **coins** | Live | CF online; integer chips from `coin_bets` |
| **money** | Live | CF online; fiat/crypto via `CurrencyHelper` |

Smoke: `?mode=fun`, `?mode=coins&currency=COINS`, `?mode=money&currency=USD`.

## Layout

```
src/
  app/                 # App shell + error boundary
  assets/              # brand, fonts, ui chrome, doof sprites (WebP roster)
  domain/round/        # round_state, commands, overlay mapping
  features/
    betting/           # PLACE YOUR BETS / NO MORE BETS overlay
    race/              # in-race HUD + Current Bets sheet
    settlement/        # RESULTS_SENT podium / chip settle / history fly-in
    hud/               # shared chrome, dialog focus, stream error boundary
    loading/           # branded LOADING / CONNECTING screens
    stream/            # LiveKit fullscreen viewer (lazy-loaded room)
  styles/              # global tokens (z-index, reduced motion)
```

## Overlays & round status

| Supabase `rounds.status` | Overlay |
| --- | --- |
| `BETTING_OPEN` | Betting |
| race / no-more-bets phases | Race |
| `RESULTS_SENT` | Settlement (latched briefly so short results do not flash away) |
| cancelled statuses | Banner: Round cancelled |

## Scripts

- `npm run dev`
- `npm run build`
- `npm run preview`
- `npm run lint`

## Deploy notes

- Build with `npm run build`; static assets use `base: './'`.
- Production must expose a LiveKit token endpoint (or set `VITE_LIVEKIT_TOKEN_URL`).
- Round feed requires Supabase URL/key and Realtime access to `rounds`.
