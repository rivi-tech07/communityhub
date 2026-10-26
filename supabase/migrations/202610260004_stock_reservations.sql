create table if not exists public.stock_reservations (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  quantity integer not null check (quantity > 0),
  status text not null default 'held' check (status in ('held', 'committed', 'released', 'expired')),
  expires_at timestamptz not null,
  created_at timestamptz not null default timezone('utc', now()),
  unique (order_id, product_id)
);

alter table public.stock_reservations enable row level security;
revoke all on public.stock_reservations from anon, authenticated;
create index if not exists stock_reservations_held_expiry_idx
  on public.stock_reservations (expires_at)
  where status = 'held';

create or replace function public.release_stock_reservations(
  p_order_id uuid,
  p_status text
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  reservation_row public.stock_reservations%rowtype;
  released_count integer := 0;
begin
  if p_status not in ('released', 'expired') then
    raise exception 'Invalid stock reservation release status';
  end if;

  for reservation_row in
    select *
    from public.stock_reservations
    where order_id = p_order_id and status = 'held'
    order by product_id
    for update
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
    set status = p_status
    where id = reservation_row.id and status = 'held';
    released_count := released_count + 1;
  end loop;

  return released_count;
end;
$$;

create or replace function public.expire_stock_reservations()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  reservation_row record;
  expired_count integer := 0;
begin
  for reservation_row in
    select distinct order_id
    from public.stock_reservations
    where status = 'held' and expires_at <= timezone('utc', now())
    order by order_id
  loop
    expired_count := expired_count + public.release_stock_reservations(reservation_row.order_id, 'expired');
  end loop;
  return expired_count;
end;
$$;

create or replace function public.reserve_stock_for_order(
  p_order_id uuid,
  p_ttl_seconds integer default 900
)
returns table (product_id uuid, quantity integer, expires_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  order_row public.orders%rowtype;
  item_row record;
  product_row public.products%rowtype;
  reservation_expiry timestamptz;
  existing_count integer;
begin
  if p_ttl_seconds < 1 or p_ttl_seconds > 86400 then
    raise exception 'Invalid stock reservation TTL';
  end if;

  perform public.expire_stock_reservations();

  select * into order_row
  from public.orders
  where id = p_order_id
  for update;
  if order_row.id is null or order_row.status <> 'pending_payment' then
    raise exception 'Order is not available for stock reservation';
  end if;

  select count(*) into existing_count
  from public.stock_reservations
  where order_id = p_order_id and status in ('held', 'committed');
  if existing_count > 0 then
    return query
      select sr.product_id, sr.quantity, sr.expires_at
      from public.stock_reservations sr
      where sr.order_id = p_order_id and sr.status in ('held', 'committed')
      order by sr.product_id;
    return;
  end if;

  if not exists (select 1 from public.order_items where order_id = p_order_id) then
    raise exception 'Order has no items';
  end if;

  reservation_expiry := timezone('utc', now()) + make_interval(secs => p_ttl_seconds);
  for item_row in
    select product_id, sum(quantity) as requested_quantity
    from public.order_items
    where order_id = p_order_id
    group by product_id
    order by product_id
  loop
    if item_row.requested_quantity <> trunc(item_row.requested_quantity)
      or item_row.requested_quantity <= 0 then
      raise exception 'Physical-goods quantities must be positive whole units';
    end if;

    select * into product_row
    from public.products
    where id = item_row.product_id
    for update;
    if product_row.id is null
      or not product_row.availability
      or product_row.stock_quantity < item_row.requested_quantity then
      raise exception 'Insufficient stock for product %', item_row.product_id;
    end if;

    update public.products
    set stock_quantity = stock_quantity - item_row.requested_quantity,
        availability = stock_quantity - item_row.requested_quantity > 0,
        updated_at = timezone('utc', now())
    where id = item_row.product_id;

    insert into public.stock_reservations(order_id, product_id, quantity, expires_at)
    values (p_order_id, item_row.product_id, item_row.requested_quantity::integer, reservation_expiry);

    product_id := item_row.product_id;
    quantity := item_row.requested_quantity::integer;
    expires_at := reservation_expiry;
    return next;
  end loop;
exception when others then
  raise;
end;
$$;

create or replace function public.commit_stock_reservations(p_order_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  committed_count integer;
begin
  update public.stock_reservations
  set status = 'committed'
  where order_id = p_order_id and status = 'held' and expires_at > timezone('utc', now());
  get diagnostics committed_count = row_count;
  return committed_count;
end;
$$;

revoke all on function public.release_stock_reservations(uuid, text) from public, anon, authenticated;
revoke all on function public.expire_stock_reservations() from public, anon, authenticated;
revoke all on function public.reserve_stock_for_order(uuid, integer) from public, anon, authenticated;
revoke all on function public.commit_stock_reservations(uuid) from public, anon, authenticated;
grant execute on function public.release_stock_reservations(uuid, text) to service_role;
grant execute on function public.expire_stock_reservations() to service_role;
grant execute on function public.reserve_stock_for_order(uuid, integer) to service_role;
grant execute on function public.commit_stock_reservations(uuid) to service_role;

create or replace function public.sync_stock_reservation_payment_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.purpose = 'physical_order' and old.status is distinct from new.status then
    if new.status = 'succeeded' then
      perform public.commit_stock_reservations(new.reference_id);
    elsif new.status in ('failed', 'refunded') then
      perform public.release_stock_reservations(new.reference_id, 'released');
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
begin
  if old.status is distinct from new.status and new.status = 'cancelled' then
    perform public.release_stock_reservations(new.id, 'released');
  end if;
  return new;
end;
$$;

drop trigger if exists payment_transactions_stock_reservations on public.payment_transactions;
create trigger payment_transactions_stock_reservations
after update of status on public.payment_transactions
for each row execute procedure public.sync_stock_reservation_payment_status();

drop trigger if exists orders_release_stock_reservations on public.orders;
create trigger orders_release_stock_reservations
after update of status on public.orders
for each row execute procedure public.release_cancelled_order_stock();
