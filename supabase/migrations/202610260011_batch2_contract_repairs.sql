-- Additive compatibility layer for the Batch 2 contracts.

alter table public.stock_reservations
  add column if not exists updated_at timestamptz not null default timezone('utc', now());
alter table public.stock_reservations enable row level security;
revoke all on public.stock_reservations from public, anon, authenticated;

create index if not exists stock_reservations_product_status_idx
  on public.stock_reservations (product_id, status);

create or replace function public.reserve_stock_item(
  p_order_id uuid,
  p_product_id uuid,
  p_quantity integer,
  p_ttl interval default interval '15 minutes'
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  product_row public.products%rowtype;
  reservation_id uuid;
begin
  if p_quantity <= 0 then
    raise exception 'quantity must be positive' using errcode = '22023';
  end if;
  if p_ttl <= interval '0 seconds' then
    raise exception 'ttl must be positive' using errcode = '22023';
  end if;

  select * into product_row
  from public.products
  where id = p_product_id
  for update;
  if product_row.id is null then
    raise exception 'product_not_found' using errcode = 'P0002';
  end if;
  if not product_row.availability or product_row.stock_quantity < p_quantity then
    raise exception 'insufficient_stock' using errcode = 'P0001';
  end if;

  update public.products
     set stock_quantity = stock_quantity - p_quantity,
         availability = stock_quantity - p_quantity > 0,
         updated_at = timezone('utc', now())
   where id = p_product_id;

  insert into public.stock_reservations (order_id, product_id, quantity, expires_at)
  values (p_order_id, p_product_id, p_quantity, timezone('utc', now()) + p_ttl)
  returning id into reservation_id;
  return reservation_id;
end;
$$;

drop function if exists public.release_stock_reservation(uuid, text);
drop function if exists public.release_stock_reservation(uuid);

create function public.release_stock_reservation(p_reservation_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  reservation_row public.stock_reservations%rowtype;
begin
  select * into reservation_row
  from public.stock_reservations
  where id = p_reservation_id
  for update;
  if reservation_row.id is null or reservation_row.status <> 'held' then
    return false;
  end if;
  update public.products
     set stock_quantity = stock_quantity + reservation_row.quantity,
         availability = true,
         updated_at = timezone('utc', now())
   where id = reservation_row.product_id;
  if not found then raise exception 'reserved product no longer exists'; end if;
  update public.stock_reservations
     set status = 'released', updated_at = timezone('utc', now())
   where id = p_reservation_id and status = 'held';
  return found;
end;
$$;

drop function if exists public.expire_stock_reservations();
drop function if exists public.expire_stock_reservations(integer);

create function public.expire_stock_reservations(p_limit integer default 500)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  reservation_row public.stock_reservations%rowtype;
  expired_count integer := 0;
begin
  if p_limit < 1 then
    raise exception 'limit must be positive' using errcode = '22023';
  end if;

  for reservation_row in
    select *
    from public.stock_reservations
    where status = 'held' and expires_at <= timezone('utc', now())
    order by expires_at, id
    limit least(p_limit, 500)
    for update skip locked
  loop
    update public.products
       set stock_quantity = stock_quantity + reservation_row.quantity,
           availability = true,
           updated_at = timezone('utc', now())
     where id = reservation_row.product_id;
    if not found then
      raise exception 'Reserved product % no longer exists', reservation_row.product_id;
    end if;
    update public.stock_reservations
       set status = 'expired', updated_at = timezone('utc', now())
     where id = reservation_row.id and status = 'held';
    if found then expired_count := expired_count + 1; end if;
  end loop;
  return expired_count;
end;
$$;

create or replace function public.commit_stock_reservation(p_reservation_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.stock_reservations
     set status = 'committed', updated_at = timezone('utc', now())
   where id = p_reservation_id and status = 'held' and expires_at > timezone('utc', now());
  return found;
end;
$$;

create or replace view public.stock_reconciliation as
select
  p.id as product_id,
  p.stock_quantity,
  coalesce(sum(sr.quantity) filter (where sr.status = 'held'), 0)::integer as held_quantity,
  coalesce(sum(sr.quantity) filter (where sr.status = 'committed'), 0)::integer as committed_quantity,
  count(*) filter (where sr.status = 'held' and sr.expires_at <= timezone('utc', now()))::integer as expired_hold_count,
  (p.stock_quantity < 0) as negative_stock,
  (count(*) filter (where sr.status = 'held' and sr.expires_at <= timezone('utc', now())) > 0) as has_expired_holds
from public.products p
left join public.stock_reservations sr on sr.product_id = p.id
group by p.id, p.stock_quantity;

revoke all on public.stock_reconciliation from public, anon, authenticated;
grant select on public.stock_reconciliation to service_role;

alter table public.deletion_requests
  add column if not exists started_at timestamptz,
  add column if not exists lease_expires_at timestamptz,
  add column if not exists updated_at timestamptz not null default timezone('utc', now());
alter table public.deletion_requests enable row level security;
revoke all on public.deletion_requests from public, anon, authenticated;

create table if not exists public.deletion_request_events (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.deletion_requests(id) on delete cascade,
  step text not null check (step in ('requested', 'revoke_sessions', 'anonymize_profile', 'purge_storage', 'delete_auth_user', 'completed')),
  outcome text not null check (outcome in ('ok', 'skipped', 'error')),
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists deletion_request_events_request_idx
  on public.deletion_request_events (request_id, created_at);
alter table public.deletion_request_events enable row level security;
revoke all on public.deletion_request_events from public, anon, authenticated;

create or replace function public.anonymize_user_profile(p_user_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.profiles
     set display_name = 'Deleted user',
         biography = 'This account has been deleted.',
         profile_photo_url = null,
         mobile_number = null,
         date_of_birth = null,
         city = null,
         country = null,
         updated_at = timezone('utc', now())
   where id = p_user_id;
$$;

alter table public.outbox_messages
  add column if not exists updated_at timestamptz not null default timezone('utc', now());
alter table public.outbox_messages enable row level security;
revoke all on public.outbox_messages from public, anon, authenticated;

alter table public.retention_runs enable row level security;
revoke all on public.retention_runs from public, anon, authenticated;

do $$
declare
  policy_row record;
begin
  for policy_row in
    select tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in (
        'stock_reservations',
        'deletion_requests',
        'deletion_request_events',
        'outbox_messages',
        'retention_runs'
      )
  loop
    execute format(
      'drop policy if exists %I on public.%I',
      policy_row.policyname,
      policy_row.tablename
    );
  end loop;
end;
$$;

drop function if exists public.claim_deletion_request();
drop function if exists public.claim_deletion_request(interval);

create function public.claim_deletion_request(
  p_lease interval default interval '5 minutes'
)
returns table (id uuid, user_id uuid, status text, attempts integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  request_row public.deletion_requests%rowtype;
begin
  if p_lease <= interval '0 seconds' then
    raise exception 'lease must be positive' using errcode = '22023';
  end if;

  select * into request_row
  from public.deletion_requests
  where status in ('queued', 'failed')
     or (status = 'processing' and lease_expires_at <= timezone('utc', now()))
  order by requested_at
  for update skip locked
  limit 1;

  if request_row.id is null then
    return;
  end if;

  update public.deletion_requests
     set status = 'processing',
         attempts = request_row.attempts + 1,
         last_error = null,
         started_at = coalesce(started_at, timezone('utc', now())),
         lease_expires_at = timezone('utc', now()) + p_lease,
         updated_at = timezone('utc', now())
   where deletion_requests.id = request_row.id
   returning deletion_requests.id, deletion_requests.user_id,
             deletion_requests.status, deletion_requests.attempts
        into id, user_id, status, attempts;
  return next;
end;
$$;

revoke all on function public.claim_deletion_request(interval) from public, anon, authenticated;
grant execute on function public.claim_deletion_request(interval) to service_role;

create or replace function public.enqueue_outbox_message(
  p_channel text,
  p_template text,
  p_recipient text,
  p_payload jsonb default '{}'::jsonb,
  p_dedupe_key text default null
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare message_id uuid;
begin
  insert into public.outbox_messages (channel, template, recipient, payload, dedupe_key)
  values (p_channel, p_template, p_recipient, coalesce(p_payload, '{}'::jsonb), p_dedupe_key)
  on conflict (dedupe_key) do nothing
  returning id into message_id;
  if message_id is null and p_dedupe_key is not null then
    select id into message_id from public.outbox_messages where dedupe_key = p_dedupe_key;
  end if;
  return message_id;
end;
$$;

create or replace function public.claim_outbox_messages(
  p_limit integer default 20,
  p_lease interval default interval '2 minutes'
) returns setof public.outbox_messages
language sql
security definer
set search_path = public
as $$
  with candidates as (
    select id
    from public.outbox_messages
    where status in ('pending', 'failed') and next_attempt_at <= timezone('utc', now())
    order by next_attempt_at, created_at
    limit greatest(1, least(p_limit, 100))
    for update skip locked
  )
  update public.outbox_messages m
     set status = 'pending', attempts = m.attempts + 1,
         next_attempt_at = timezone('utc', now()) + p_lease,
         last_error = null, updated_at = timezone('utc', now())
    from candidates c
   where m.id = c.id
  returning m.*;
$$;

revoke all on function public.reserve_stock_item(uuid, uuid, integer, interval) from public, anon, authenticated;
revoke all on function public.release_stock_reservation(uuid) from public, anon, authenticated;
revoke all on function public.expire_stock_reservations(integer) from public, anon, authenticated;
revoke all on function public.commit_stock_reservation(uuid) from public, anon, authenticated;
revoke all on function public.anonymize_user_profile(uuid) from public, anon, authenticated;
revoke all on function public.enqueue_outbox_message(text, text, text, jsonb, text) from public, anon, authenticated;
revoke all on function public.claim_outbox_messages(integer, interval) from public, anon, authenticated;
grant execute on function public.reserve_stock_item(uuid, uuid, integer, interval) to service_role;
grant execute on function public.release_stock_reservation(uuid) to service_role;
grant execute on function public.expire_stock_reservations(integer) to service_role;
grant execute on function public.commit_stock_reservation(uuid) to service_role;
grant execute on function public.anonymize_user_profile(uuid) to service_role;
grant execute on function public.enqueue_outbox_message(text, text, text, jsonb, text) to service_role;
grant execute on function public.claim_outbox_messages(integer, interval) to service_role;

create or replace function public.sync_stock_reservation_payment_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  reservation_row record;
begin
  if new.purpose = 'physical_order' and old.status is distinct from new.status then
    if new.status = 'succeeded' then
      perform public.commit_stock_reservations(new.reference_id);
    elsif new.status in ('failed', 'refunded') then
      for reservation_row in
        select id from public.stock_reservations
        where order_id = new.reference_id and status = 'held'
        order by product_id, id
      loop
        perform public.release_stock_reservation(reservation_row.id);
      end loop;
    end if;
  end if;
  return new;
end;
$$;

create or replace function public.release_cancelled_order_stock()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  reservation_row record;
begin
  if old.status is distinct from new.status and new.status = 'cancelled' then
    for reservation_row in
      select id from public.stock_reservations
      where order_id = new.id and status = 'held'
      order by product_id, id
    loop
      perform public.release_stock_reservation(reservation_row.id);
    end loop;
  end if;
  return new;
end;
$$;

revoke all on function public.sync_stock_reservation_payment_status() from public, anon, authenticated;
revoke all on function public.release_cancelled_order_stock() from public, anon, authenticated;
grant execute on function public.sync_stock_reservation_payment_status() to service_role;
grant execute on function public.release_cancelled_order_stock() to service_role;

drop function if exists public.release_stock_reservations(uuid, text);
drop function if exists public.claim_outbox_message();
