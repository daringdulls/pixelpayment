# Pixel Payment: Cozy Guest Ledger

Guest billing across guest houses, restaurants, dive centres, souvenir shops and other outlets.
Outlet staff post charges against a registered guest stay. The front office sees one consolidated bill per guest and settles it at checkout.

Live: https://cozy-guest-ledger.vercel.app

## Architecture
- **Vercel** (this repo): static frontend plus a same-origin API relay.
  - `public/`: the app (`index.html`, `assets/app.js`, `assets/styles.css`). No framework, no bundler.
  - `api/handler.js`: forwards `/api/*` calls with the signed-in user's token to the Supabase Edge Function `cozy-guest-ledger`.
  - `scripts/build.mjs`: copies `public/` to `dist/` and adds the Supabase browser client from npm.
  - `vercel.json`: rewrites, security headers, region `sin1`.
- **Supabase**: staff sign-in (email/password), PostgreSQL schema `cozy_ledger`, and the `cozy-guest-ledger` Edge Function.
  The Edge Function and migration source are **not in this repo yet**; they are in the original local project (`supabase/` folder).

## Environment variables (Vercel)
| Name | Purpose |
|---|---|
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_PUBLISHABLE_KEY` | Supabase anon/publishable key (served to the browser via `/api/config`) |

## Develop
```bash
npm install
npm run build   # outputs dist/
```

## API used by the frontend
`GET /api/config`, `GET /api/data`, `POST /api/{stays|outlets|bills|members|payments|settle|settings|approve|approve-stay|checkout|link-bill}`
