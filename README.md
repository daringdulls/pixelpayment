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


After **Add user** or **Reset password**, a *Login details* card shows the username, the temporary password and a login link (`/?u=<username>`, which fills in the username on the sign-in page). Each one has its own Copy button. **Copy all details** copies a ready-to-send message, and the **WhatsApp** and **Email** buttons open it in those apps. The password is generated for you and shown only once. Staff change their own password from the key icon next to their name in the sidebar.

**Roles.** *Head office administrator*: everything. *Front office cashier*: Dashboard, Guests & folios, Invoices and Payments; can register guests, post invoices, approve charges, collect payment and check guests out, but can't manage staff logins, settings, outlets, rate cards or make corrections. *Outlet staff*: one outlet's bills only.

How the cashier role works: the ledger service only knows `admin` and `outlet`, so a cashier is an `admin` there and is also listed in `public.pixel_staff_roles` (created by the `pixel_bill_admin` SQL script). The Vercel relay (`api/handler.js` with `api/_roles.js`) refuses head-office-only routes for anyone on that list. If the list can't be read, it refuses those routes rather than letting them through. Limitation: someone calling the ledger service directly, bypassing this app, would get full admin rights; closing that needs a cashier check inside the ledger service itself.

To rename a username login, click the pencil next to it in **Settings → Staff & logins**. The sign-in account and the role/outlet assignment move together; the password, role and past invoices stay the same, and you get the new login details to send. Email logins can't be renamed. This needs the same one-time `pixel_bill_admin` SQL script (it includes `pixel_member_rename`).

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

## Corrections by head office (invoices, payments, folios)

Only administrators see these controls. Outlet staff never do, and the server checks the role on every request.

| What | Where | Rules |
|---|---|---|
| Edit an invoice | Invoice row or invoice page → pencil | Number stays unique per outlet; the amount can't go below what has been collected |
| Delete an invoice | Invoice row or invoice page → bin | Only when nothing has been paid. Void the payment first if needed |
| Edit a payment | Payments page → pencil, or click a payment line on the folio | Change date, method and reference |
| Void a payment | Same form → status **Void** | Needs a reason; the invoices it covered become unpaid again |
| Reopen a folio | Checked-out folio → **Reopen folio** | Guest shows as in house again |
| Delete a folio | Folio → bin, type DELETE | Removes the stay with all its invoices and payments |

Every change is written to the activity log.

API routes (all in `api/_bills.js`): `bill-update`, `bill-delete`, `payment-update`, `payment-void`, `stay-reopen`, `stay-delete`. They call database functions with the server-side secret key. Create the functions once by running `supabase/migrations/20261115120000_pixel_bill_admin.sql` in the Supabase SQL Editor. It first checks the ledger tables and stops with a clear message, changing nothing, if a column it needs is missing. Until it has run, the buttons show a "needs a one-time database setup" message.

## API used by the frontend
`GET /api/config`, `GET /api/data`, `GET /api/rates`, `GET /api/branding`, `POST /api/{branding-save|rates-save|staff-create|staff-reset|stays|outlets|bills|members|payments|settle|settings|approve|approve-stay|checkout|link-bill}`
