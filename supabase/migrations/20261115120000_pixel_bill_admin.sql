-- Head-office corrections for the guest ledger.
-- Creates six functions that the Vercel API (api/_bills.js) calls with the server-side secret key:
--   pixel_bill_update, pixel_bill_delete         edit / delete an invoice
--   pixel_payment_update, pixel_payment_void     edit / void a payment receipt
--   pixel_stay_reopen, pixel_stay_delete         reopen / delete a guest folio
-- Browsers cannot call them: execute is revoked from anon and authenticated.
-- Safe to run more than once.

-- 1. Check the ledger tables have the columns these functions use. Stops with a clear message if not.
do $$
declare
  need text[] := array[
    'bills.id','bills.number','bills.date','bills.due','bills.amount','bills.notes','bills.stay_id','bills.customer',
    'payments.id','payments.bill_id','payments.date','payments.method','payments.reference',
    'stays.id','stays.status'];
  missing text[];
begin
  select array_agg(n) into missing from unnest(need) n
  where not exists (select 1 from information_schema.columns c
    where c.table_schema = 'cozy_ledger' and c.table_name || '.' || c.column_name = n);
  if missing is not null then
    raise exception 'Pixel Payment setup: cozy_ledger is missing %. Nothing was changed. Send this message to your developer.', array_to_string(missing, ', ');
  end if;
end $$;

-- 2. Activity log helper: writes to cozy_ledger.activity when it has action/entity/actor columns; never blocks a change.
create or replace function public.pixel_log(p_action text, p_entity text, p_actor text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if (select count(*) from information_schema.columns
      where table_schema = 'cozy_ledger' and table_name = 'activity' and column_name in ('action','entity','actor')) = 3 then
    execute 'insert into cozy_ledger.activity (action, entity, actor) values ($1, $2, $3)' using p_action, p_entity, p_actor;
  end if;
exception when others then null;
end $$;

-- 3. Invoices.
create or replace function public.pixel_bill_update(
  p_id text, p_number text, p_date date, p_due date, p_amount_cents bigint, p_notes text,
  p_stay_id text, p_customer text, p_actor text)
returns void language plpgsql security definer set search_path = '' as $$
declare n int;
begin
  update cozy_ledger.bills b set
    number = p_number, date = p_date, due = p_due, amount = p_amount_cents, notes = p_notes,
    stay_id = (select s.id from cozy_ledger.stays s where s.id::text = p_stay_id), customer = p_customer
  where b.id::text = p_id;
  get diagnostics n = row_count;
  if n = 0 then raise exception 'Invoice not found'; end if;
  perform public.pixel_log('Invoice edited', p_number, p_actor);
end $$;

create or replace function public.pixel_bill_delete(p_id text, p_actor text)
returns void language plpgsql security definer set search_path = '' as $$
declare num text;
begin
  if exists (select 1 from cozy_ledger.payments p where p.bill_id::text = p_id) then
    raise exception 'This invoice has payments. Void them first.';
  end if;
  delete from cozy_ledger.bills b where b.id::text = p_id returning b.number into num;
  if num is null then raise exception 'Invoice not found'; end if;
  perform public.pixel_log('Invoice deleted', num, p_actor);
end $$;

-- 4. Payment receipts (one receipt can cover several invoices).
create or replace function public.pixel_payment_update(
  p_ids text[], p_date date, p_method text, p_reference text, p_actor text)
returns void language plpgsql security definer set search_path = '' as $$
declare n int;
begin
  update cozy_ledger.payments p set date = p_date, method = p_method, reference = p_reference
  where p.id::text = any(p_ids);
  get diagnostics n = row_count;
  if n = 0 then raise exception 'Payment not found'; end if;
  perform public.pixel_log('Payment edited', p_reference, p_actor);
end $$;

create or replace function public.pixel_payment_void(p_ids text[], p_label text, p_reason text, p_actor text)
returns void language plpgsql security definer set search_path = '' as $$
declare n int;
begin
  delete from cozy_ledger.payments p where p.id::text = any(p_ids);
  get diagnostics n = row_count;
  if n = 0 then raise exception 'Payment not found'; end if;
  perform public.pixel_log('Payment voided', left(p_label || ' · ' || p_reason, 200), p_actor);
end $$;

-- 5. Guest folios.
create or replace function public.pixel_stay_reopen(p_id text, p_actor text)
returns void language plpgsql security definer set search_path = '' as $$
declare guest text;
begin
  update cozy_ledger.stays s set status = 'active' where s.id::text = p_id;
  if not found then raise exception 'Folio not found'; end if;
  begin
    execute 'select guest_name from cozy_ledger.stays where id::text = $1' into guest using p_id;
  exception when others then guest := p_id;
  end;
  perform public.pixel_log('Folio reopened', coalesce(guest, p_id), p_actor);
end $$;

create or replace function public.pixel_stay_delete(p_id text, p_actor text)
returns void language plpgsql security definer set search_path = '' as $$
declare guest text;
begin
  begin
    execute 'select guest_name from cozy_ledger.stays where id::text = $1' into guest using p_id;
  exception when others then guest := p_id;
  end;
  delete from cozy_ledger.payments p
    where p.bill_id in (select b.id from cozy_ledger.bills b where b.stay_id::text = p_id);
  delete from cozy_ledger.bills b where b.stay_id::text = p_id;
  -- Optional settlements table that points at the stay.
  if exists (select 1 from information_schema.columns
             where table_schema = 'cozy_ledger' and table_name = 'settlements' and column_name = 'stay_id') then
    execute 'delete from cozy_ledger.settlements where stay_id::text = $1' using p_id;
  end if;
  delete from cozy_ledger.stays s where s.id::text = p_id;
  if not found then raise exception 'Folio not found'; end if;
  perform public.pixel_log('Folio deleted', coalesce(guest, p_id), p_actor);
end $$;

-- 6. Only the server-side secret key may call these.
do $$
declare f text;
begin
  foreach f in array array[
    'pixel_log(text,text,text)',
    'pixel_bill_update(text,text,date,date,bigint,text,text,text,text)',
    'pixel_bill_delete(text,text)',
    'pixel_payment_update(text[],date,text,text,text)',
    'pixel_payment_void(text[],text,text,text)',
    'pixel_stay_reopen(text,text)',
    'pixel_stay_delete(text,text)'] loop
    execute format('revoke all on function public.%s from public, anon, authenticated', f);
    execute format('grant execute on function public.%s to service_role', f);
  end loop;
end $$;

notify pgrst, 'reload schema';
