-- Pixel Payment: workspace branding for folios and invoices. Run once in Supabase → SQL Editor. Safe to re-run.
create table if not exists public.pixel_branding (
  id          text primary key,
  brand       jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now(),
  updated_by  text
);

alter table public.pixel_branding enable row level security;
revoke all on table public.pixel_branding from anon, authenticated;
