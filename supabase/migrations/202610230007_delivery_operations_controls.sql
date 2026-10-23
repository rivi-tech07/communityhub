alter table public.user_roles drop constraint if exists user_roles_role_check;
alter table public.user_roles add constraint user_roles_role_check check (role in ('user', 'moderator', 'business_owner', 'employer', 'administrator', 'rider'));

create table if not exists public.delivery_runs (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references auth.users(id) on delete restrict,
  rider_id uuid references auth.users(id) on delete set null,
  status text not null default 'pending' check (status in ('pending', 'assigned', 'collecting', 'out_for_delivery', 'delivered', 'cancelled')),
  delivery_address jsonb not null,
  assigned_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.delivery_run_stops (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.delivery_runs(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete restrict,
  order_id uuid not null references public.orders(id) on delete restrict,
  stop_order integer not null check (stop_order > 0),
  status text not null default 'pending' check (status in ('pending', 'arrived', 'picked_up', 'cancelled')),
  picked_up_at timestamptz,
  unique (run_id, order_id),
  unique (run_id, stop_order)
);

create table if not exists public.delivery_proofs (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.delivery_runs(id) on delete cascade,
  stop_id uuid references public.delivery_run_stops(id) on delete cascade,
  captured_by uuid not null references auth.users(id) on delete restrict,
  proof_type text not null check (proof_type in ('pickup_selfie', 'pickup_items', 'delivery_selfie')),
  storage_path text not null,
  latitude numeric(9,6),
  longitude numeric(9,6),
  captured_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.feature_flags (
  key text primary key check (key ~ '^[a-z][a-z0-9_]*$'),
  enabled boolean not null default false,
  description text not null default '',
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default timezone('utc', now())
);

insert into public.feature_flags (key, enabled, description) values
  ('jobs', true, 'Allow public job browsing and applications.'),
  ('shop', true, 'Allow public shop browsing.'),
  ('delivery', false, 'Allow delivery operations after rider setup.'),
  ('community_posts', true, 'Allow community posting.')
on conflict (key) do nothing;

alter table public.delivery_runs enable row level security;
alter table public.delivery_run_stops enable row level security;
alter table public.delivery_proofs enable row level security;
alter table public.feature_flags enable row level security;

create policy "Customers and assigned riders read delivery runs" on public.delivery_runs
  for select to authenticated using (customer_id = auth.uid() or rider_id = auth.uid() or public.has_role('administrator'));
create policy "Customers create delivery runs" on public.delivery_runs
  for insert to authenticated with check (customer_id = auth.uid() and status = 'pending');
create policy "Customers update their delivery address" on public.delivery_runs
  for update to authenticated using (customer_id = auth.uid() and status in ('pending', 'assigned'))
  with check (customer_id = auth.uid() and status in ('pending', 'assigned'));
create policy "Assigned riders update delivery runs" on public.delivery_runs
  for update to authenticated using (rider_id = auth.uid() or public.has_role('administrator'))
  with check (rider_id = auth.uid() or public.has_role('administrator'));

create policy "Shop owners and riders read delivery stops" on public.delivery_run_stops
  for select to authenticated using (
    exists (select 1 from public.delivery_runs r where r.id = run_id and (r.customer_id = auth.uid() or r.rider_id = auth.uid() or public.has_role('administrator')))
    or public.can_manage_business(business_id)
  );
create policy "Shop owners and riders update delivery stops" on public.delivery_run_stops
  for update to authenticated using (
    exists (select 1 from public.delivery_runs r where r.id = run_id and (r.rider_id = auth.uid() or public.has_role('administrator')))
    or public.can_manage_business(business_id)
  ) with check (true);

create policy "Delivery participants read proofs" on public.delivery_proofs
  for select to authenticated using (
    captured_by = auth.uid() or public.has_role('administrator') or exists (
      select 1 from public.delivery_runs r where r.id = run_id and (r.customer_id = auth.uid() or r.rider_id = auth.uid())
    )
  );
create policy "Assigned riders add proofs" on public.delivery_proofs
  for insert to authenticated with check (
    captured_by = auth.uid() and exists (select 1 from public.delivery_runs r where r.id = run_id and r.rider_id = auth.uid())
  );

create policy "Public users read enabled feature flags" on public.feature_flags
  for select to anon, authenticated using (true);
create policy "Administrators manage feature flags" on public.feature_flags
  for all to authenticated using (public.has_role('administrator')) with check (public.has_role('administrator'));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('delivery-proofs', 'delivery-proofs', false, 10485760, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = false, file_size_limit = 10485760, allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];
create policy "Delivery participants read proof media" on storage.objects for select to authenticated using (
  bucket_id = 'delivery-proofs' and exists (
    select 1 from public.delivery_proofs p join public.delivery_runs r on r.id = p.run_id
    where p.storage_path = name and (p.captured_by = auth.uid() or r.customer_id = auth.uid() or r.rider_id = auth.uid() or public.has_role('administrator'))
  )
);
create policy "Assigned riders upload proof media" on storage.objects for insert to authenticated with check (
  bucket_id = 'delivery-proofs' and exists (
    select 1 from public.delivery_runs r where r.id = (split_part(name, '/', 2))::uuid and r.rider_id = auth.uid()
  )
);
create policy "Proof owners remove proof media" on storage.objects for delete to authenticated using (bucket_id = 'delivery-proofs' and owner_id = auth.uid()::text);

create index if not exists delivery_runs_rider_status_idx on public.delivery_runs (rider_id, status, created_at desc);
create index if not exists delivery_runs_customer_idx on public.delivery_runs (customer_id, created_at desc);
create index if not exists delivery_stops_business_idx on public.delivery_run_stops (business_id, status);
create index if not exists delivery_proofs_run_idx on public.delivery_proofs (run_id, captured_at desc);
