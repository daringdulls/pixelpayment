# Pixel Payment: redesigned frontend

A drop-in replacement for the frontend at cozy-guest-ledger.vercel.app.
The backend is unchanged. It makes the same Supabase auth and `/api/*` calls:

| Call | Used for |
|---|---|
| `GET /api/config` | Supabase URL + anon key |
| `GET /api/data` | Workspace snapshot |
| `POST /api/stays`, `outlets`, `bills`, `members`, `payments`, `settle`, `settings`, `approve`, `approve-stay`, `checkout`, `link-bill` | Mutations (same field names as before) |

## Files
- `index.html`: app shell
- `assets/styles.css`: design system (tokens, components, responsive, print)
- `assets/app.js`: readable, unminified app logic (no build step)
- `assets/supabase.js`: vendored `@supabase/supabase-js@2.45.4` UMD build

## Deploy
Copy these files over the current static frontend in the Vercel project
(replace `index.html` and `assets/app.js`, then add `assets/styles.css` and `assets/supabase.js`).
Keep the existing `api/` functions as they are.

## What changed
- New split-screen sign-in with Sign in / Create account tabs and a demo entry point.
- Dark navigation sidebar grouped by role (Front office, Finance, Operations, Administration).
- Consistent "Pixel Payment" branding (the old build mixed in "outlet ledger" in several places).
- KPI cards, an SVG bar chart with a scaled axis, and per-outlet collection-progress bars.
- Status filter chips with counts, and a live outstanding total for the filtered invoices.
- Invoice details open in a side drawer instead of a modal.
- Guest folio laid out like a statement, with charges by outlet, payments, and the balance due. It prints cleanly to PDF.
- Activity log shows relative times with action icons.
- Keyboard support: rows are focusable, Escape closes dialogs, and focus stays inside open dialogs.
- Confirmation step before checkout.
- Fuller demo data: 4 guests, including one checked out, pending, overdue and partially paid invoices, and an activity history.
