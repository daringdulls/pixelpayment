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
| `SUPABASE_SERVICE_ROLE_KEY` | **Server only.** Lets head office create username logins and reset passwords (`api/_staff.js`). Never exposed to the browser. |
| `STAFF_USERNAME_DOMAIN` | Optional. Username logins are stored as `<username>@<domain>` in Supabase Auth. Default `pixelpayment.local`. |

## Develop
```bash
npm install
npm run build   # outputs dist/
```

## Staff logins
Head office can add users in **Settings → Staff & logins → Add user**:
- **Username & password**: creates a confirmed login right away (requires `SUPABASE_SERVICE_ROLE_KEY`). Staff sign in with the username.
- **Invite by email**: the staff member creates their own account with that email and confirms it.

The key icon on each user resets their password. The server only allows this for administrators and only for members of this workspace.

## API used by the frontend
`GET /api/config`, `GET /api/data`, `POST /api/{staff-create|staff-reset|stays|outlets|bills|members|payments|settle|settings|approve|approve-stay|checkout|link-bill}`
