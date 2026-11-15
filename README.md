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
| `SUPABASE_SECRET_KEY` | **Server only.** The `sb_secret_…` key (Supabase → Project Settings → API Keys → Secret keys). Lets head office create username logins and reset passwords (`api/_staff.js`). Never exposed to the browser. Legacy `SUPABASE_SERVICE_ROLE_KEY` is also accepted. |
| `STAFF_USERNAME_DOMAIN` | Optional. Username logins are stored as `<username>@<domain>` in Supabase Auth. Default `pixelpayment.local`. |

## Develop
```bash
npm install
npm run build   # outputs dist/
```

## Staff logins
Head office can add users in **Settings → Staff & logins → Add user**:
- **Username & password**: creates a confirmed login right away (requires `SUPABASE_SECRET_KEY`). Staff sign in with the username.
- **Invite by email**: the staff member creates their own account with that email and confirms it.

The key icon on each user resets their password. The server only allows this for administrators and only for members of this workspace.

## Rate cards & itemised bills
Each outlet can keep a price list (**Rate card** in the menu). When an outlet has one, **New bill** becomes an item picker:
choose items from the dropdown, set quantities, add a discount % or a custom item, and the total is calculated.
- Prices can be in another currency (e.g. Cozy Scuba Club in USD). The card stores the exchange rate to the workspace
  currency; the invoice shows the lines in that currency, the rate used and the charged total.
- Items are saved in the bill description as lines like `2 × Fun Dive 1 @ USD 81.00`, so no change to the existing bills
  table is needed. The invoice and folio read these lines back.
- Outlet staff edit their own outlet's card; head office can edit any outlet's card.
- **Paste from sheet** imports rows copied from Google Sheets (`Item · Price` or `Category · Item · Price`).
  `docs/cozy-scuba-club-rates.tsv` holds the Cozy Scuba Club price list ready to paste.

**One-time setup:** run `supabase/migrations/20261114120000_pixel_rate_cards.sql` in the Supabase SQL editor.
It creates `public.pixel_rate_cards` with RLS on and no public access; only the Vercel API (secret key) reads and writes it.

## Branding
Head office sets the logo, brand colour, registered name, address, contacts, tax number, payment details and terms in
**Settings → Branding**. They are printed on guest folios (statement with running balance, totals, payment details and
signature lines) and on invoices.

**One-time setup:** run `supabase/migrations/20261114180000_pixel_branding.sql` in the Supabase SQL editor.

## Two currencies (USD and MVR)
Head office sets the rate in **Settings → Currencies** (MVR per 1 USD). Then:
- Bills can be entered in USD or MVR (typed in, or built from a rate card with **Bill in**). The bill is posted in the
  workspace currency; the original currency lines and the rate are kept in the description and printed on the invoice.
- Payments (single invoice or a guest's whole folio) can be taken in USD or MVR; the receipt reference records the
  amount paid and the rate. A full payment absorbs rounding so the balance closes exactly.
- Folios and invoices show the balance due in both currencies.
The rate is stored with the branding row (`pixel_branding`); saving it does not change any other branding field.

## Editing and deleting invoices (head office)

Administrators see **Edit** and **Delete** buttons on every invoice row and in the invoice document toolbar. Outlet staff never see them, and the server checks the role on every request.

- **Edit** lets you change the invoice number (it must stay unique per outlet), the guest stay, the invoice and due dates, the amount and the description. The amount can't go below what has already been collected.
- **Delete** is only allowed when nothing has been paid on the invoice. A paid invoice should be edited instead.
- Both changes are recorded in the activity log.

The routes are `POST /api/bill-update` and `POST /api/bill-delete`, handled in `api/_bills.js`. They call the database functions `pixel_bill_update` and `pixel_bill_delete` with the server-side secret key. Until those functions are created with the one-time `pixel_bill_admin` SQL script, the buttons show a "needs a one-time database setup" message.

## API used by the frontend
`GET /api/config`, `GET /api/data`, `GET /api/rates`, `GET /api/branding`, `POST /api/{branding-save|rates-save|staff-create|staff-reset|stays|outlets|bills|members|payments|settle|settings|approve|approve-stay|checkout|link-bill}`
