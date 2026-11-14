-- Pixel Payment: outlet rate cards (price lists for itemised bills).
-- Run once in Supabase → SQL Editor. Safe to re-run.
-- RLS is enabled with no policies, and browser roles have no grants, so the table is
-- only reachable through the Vercel API using the server-side secret key.

create table if not exists public.pixel_rate_cards (
  outlet_id   text primary key,
  currency    text not null default 'USD' check (currency ~ '^[A-Z]{3}$'),
  fx_rate     numeric(14, 6) not null default 1 check (fx_rate > 0),
  items       jsonb not null default '[]'::jsonb check (jsonb_typeof(items) = 'array'),
  updated_at  timestamptz not null default now(),
  updated_by  text
);

alter table public.pixel_rate_cards enable row level security;
revoke all on table public.pixel_rate_cards from anon, authenticated;
