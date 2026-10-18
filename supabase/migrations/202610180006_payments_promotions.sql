create table if not exists public.payment_accounts (
  id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
  country text not null check (country in ('GB','IN')), provider text not null check (provider in ('stripe','razorpay')),
  mode text not null default 'test' check (mode in ('test','live')), approval_status text not null default 'pending' check (approval_status in ('pending','approved','rejected')),
  is_enabled boolean not null default false, created_at timestamptz not null default timezone('utc',now()), updated_at timestamptz not null default timezone('utc',now()), unique(owner_id,country,provider)
);
alter table public.service_requests add column if not exists quoted_price_minor bigint check (quoted_price_minor is null or quoted_price_minor > 0);
alter table public.service_requests add column if not exists quoted_currency text check (quoted_currency is null or quoted_currency in ('GBP','INR'));
create table if not exists public.payment_transactions (
  id uuid primary key default gen_random_uuid(), payer_id uuid references auth.users(id) on delete set null,
  provider text not null check (provider in ('stripe','razorpay')), provider_payment_id text, provider_order_id text,
  purpose text not null check (purpose in ('physical_order','service_request','promotion')), reference_id uuid not null,
  amount_minor bigint not null check (amount_minor > 0), currency text not null check (currency ~ '^[A-Z]{3}$'),
  status text not null default 'created' check (status in ('created','pending','succeeded','failed','cancelled','refunded','partially_refunded')),
  idempotency_key text not null unique, failure_code text, failure_message text, refund_amount_minor bigint not null default 0 check (refund_amount_minor >= 0), metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc',now()), updated_at timestamptz not null default timezone('utc',now()), unique(provider,provider_payment_id), unique(provider,provider_order_id)
);
create table if not exists public.payment_webhook_events (
  id uuid primary key default gen_random_uuid(), provider text not null check (provider in ('stripe','razorpay')), provider_event_id text not null, event_type text not null, transaction_id uuid references public.payment_transactions(id) on delete set null, payload_hash text not null, received_at timestamptz not null default timezone('utc',now()), unique(provider,provider_event_id)
);
create table if not exists public.promotion_packages (
  id uuid primary key default gen_random_uuid(), name text not null, promotion_type text not null check (promotion_type in ('featured_business','promoted_product','sponsored_post','featured_job')),
  description text not null, price_minor bigint not null check (price_minor > 0), currency text not null check (currency in ('GBP','INR')), duration_days integer not null check (duration_days between 1 and 365), is_active boolean not null default true, created_at timestamptz not null default timezone('utc',now())
);
create table if not exists public.promotions (
  id uuid primary key default gen_random_uuid(), purchaser_id uuid not null references auth.users(id) on delete cascade, package_id uuid not null references public.promotion_packages(id) on delete restrict,
  target_type text not null check (target_type in ('featured_business','promoted_product','sponsored_post','featured_job')), target_id uuid not null,
  price_minor bigint not null check (price_minor > 0), currency text not null check (currency in ('GBP','INR')), starts_at timestamptz not null, expires_at timestamptz not null,
  approval_status text not null default 'pending' check (approval_status in ('pending','approved','rejected')), entitlement_status text not null default 'pending_payment' check (entitlement_status in ('draft','pending_payment','active','expired','cancelled','rejected')),
  transaction_id uuid references public.payment_transactions(id) on delete set null, created_at timestamptz not null default timezone('utc',now()), updated_at timestamptz not null default timezone('utc',now()), check (expires_at > starts_at)
);

create or replace function public.can_manage_payment_account(target uuid) returns boolean language sql stable security definer set search_path=public as $$ select exists(select 1 from public.payment_accounts where id=target and owner_id=auth.uid()) or public.has_role('administrator'); $$;
create or replace function public.can_manage_promotion_target(target_type text, target_id uuid) returns boolean language sql stable security definer set search_path=public as $$ select case when target_type='featured_business' then exists(select 1 from public.businesses where id=target_id and public.can_manage_business(id)) when target_type='promoted_product' then exists(select 1 from public.products p where p.id=target_id and public.can_manage_business(p.business_id)) when target_type='sponsored_post' then exists(select 1 from public.posts p where p.id=target_id and (p.author_id=auth.uid() or public.can_moderate_post(p.id))) when target_type='featured_job' then exists(select 1 from public.job_listings j where j.id=target_id and public.can_manage_employer(j.employer_id)) else false end; $$;
create or replace function public.prevent_service_quote_tampering() returns trigger language plpgsql security definer set search_path=public as $$ begin if (new.quoted_price_minor is distinct from old.quoted_price_minor or new.quoted_currency is distinct from old.quoted_currency) and not exists(select 1 from public.services s where s.id=new.service_id and public.can_manage_service(s.id)) then raise exception 'Only the service provider can set a quote'; end if; return new; end; $$;
create or replace function public.prevent_service_status_tampering() returns trigger language plpgsql security definer set search_path=public as $$ begin if new.status is distinct from old.status and new.status not in ('cancelled') and not exists(select 1 from public.services s where s.id=new.service_id and public.can_manage_service(s.id)) then raise exception 'Only the service provider can update request status'; end if; return new; end; $$;
drop trigger if exists service_quote_guard on public.service_requests;
create trigger service_quote_guard before update on public.service_requests for each row execute procedure public.prevent_service_quote_tampering();
drop trigger if exists service_status_guard on public.service_requests;
create trigger service_status_guard before update on public.service_requests for each row execute procedure public.prevent_service_status_tampering();
create or replace function public.expire_promotions() returns trigger language plpgsql security definer set search_path=public as $$ begin update public.promotions set entitlement_status='expired' where entitlement_status='active' and expires_at <= timezone('utc',now()); return null; end; $$;
create or replace function public.touch_payment_updated_at() returns trigger language plpgsql set search_path=public as $$ begin new.updated_at=timezone('utc',now()); return new; end; $$;
drop trigger if exists payment_accounts_touch on public.payment_accounts; create trigger payment_accounts_touch before update on public.payment_accounts for each row execute procedure public.touch_payment_updated_at();
drop trigger if exists payment_transactions_touch on public.payment_transactions; create trigger payment_transactions_touch before update on public.payment_transactions for each row execute procedure public.touch_payment_updated_at();
drop trigger if exists promotions_touch on public.promotions; create trigger promotions_touch before update on public.promotions for each row execute procedure public.touch_payment_updated_at();

alter table public.payment_accounts enable row level security; alter table public.payment_transactions enable row level security; alter table public.promotion_packages enable row level security; alter table public.promotions enable row level security;
alter table public.payment_webhook_events enable row level security;
create policy "Owners read payment accounts" on public.payment_accounts for select to authenticated using (owner_id=auth.uid() or public.has_role('administrator'));
create policy "Owners request payment accounts" on public.payment_accounts for insert to authenticated with check (owner_id=auth.uid() and approval_status='pending' and mode='test');
create policy "Administrators manage payment accounts" on public.payment_accounts for update to authenticated using (public.has_role('administrator')) with check (public.has_role('administrator'));
create policy "Payers read transactions" on public.payment_transactions for select to authenticated using (payer_id=auth.uid() or public.has_role('administrator'));
create policy "Administrators read payment webhook audits" on public.payment_webhook_events for select to authenticated using (public.has_role('administrator'));
create policy "Active packages are public" on public.promotion_packages for select to anon,authenticated using (is_active=true);
create policy "Purchasers read promotions" on public.promotions for select to authenticated using (purchaser_id=auth.uid() or public.has_role('administrator'));
create policy "Owners request promotions" on public.promotions for insert to authenticated with check (purchaser_id=auth.uid() and public.can_manage_promotion_target(target_type,target_id) and entitlement_status='pending_payment' and approval_status='pending');
create policy "Administrators manage promotions" on public.promotions for update to authenticated using (public.has_role('administrator')) with check (public.has_role('administrator'));
drop policy if exists "Users can create orders" on public.orders;
create policy "Buyers can create checkout orders" on public.orders for insert to authenticated with check (buyer_id=auth.uid() and status='pending_payment');
create policy "Buyers can add checkout items" on public.order_items for insert to authenticated with check (exists(select 1 from public.orders o where o.id=order_id and o.buyer_id=auth.uid() and o.status='pending_payment'));
create policy "Buyers can cancel checkout orders" on public.orders for update to authenticated using (buyer_id=auth.uid() and status in ('draft','pending_payment')) with check (buyer_id=auth.uid() and status='cancelled');

insert into public.promotion_packages (name,promotion_type,description,price_minor,currency,duration_days) values
  ('Featured business - 7 days','featured_business','Highlight a verified business on the directory.',700,'GBP',7),
  ('Promoted product - 7 days','promoted_product','Feature an available product in discovery.',500,'GBP',7),
  ('Sponsored post - 7 days','sponsored_post','Promote an eligible community post after moderation approval.',500,'GBP',7),
  ('Featured job - 14 days','featured_job','Highlight a published job listing.',1000,'GBP',14)
on conflict do nothing;
create index if not exists payment_transactions_payer_idx on public.payment_transactions(payer_id,created_at desc); create index if not exists payment_transactions_reference_idx on public.payment_transactions(purpose,reference_id); create index if not exists promotions_active_idx on public.promotions(entitlement_status,starts_at,expires_at); create index if not exists promotions_target_idx on public.promotions(target_type,target_id);
