create extension if not exists pgcrypto;

create table if not exists public.businesses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 2 and 160),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  category text not null check (char_length(category) between 2 and 80),
  description text,
  logo_path text,
  contact_email text,
  contact_phone text,
  contact_preferences jsonb not null default jsonb_build_object('email', true, 'phone', false),
  address_line1 text,
  address_line2 text,
  city text,
  region text,
  country text,
  postcode text,
  opening_hours jsonb not null default '{}'::jsonb,
  verification_status text not null default 'pending' check (verification_status in ('pending', 'verified', 'rejected')),
  is_published boolean not null default false,
  is_sample boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.business_images (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  uploaded_by uuid not null references auth.users(id) on delete cascade,
  storage_path text not null unique,
  mime_type text not null check (mime_type in ('image/jpeg', 'image/png', 'image/webp')),
  size_bytes integer not null check (size_bytes between 1 and 10485760),
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.product_categories (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  slug text not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  unique (business_id, slug)
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  category_id uuid references public.product_categories(id) on delete set null,
  name text not null check (char_length(name) between 1 and 160),
  slug text not null,
  description text,
  price numeric(12, 2) not null check (price >= 0),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  unit text not null check (char_length(unit) between 1 and 40),
  stock_quantity numeric(12, 3) not null default 0 check (stock_quantity >= 0),
  availability boolean not null default true,
  discount_percentage numeric(5, 2) not null default 0 check (discount_percentage between 0 and 100),
  is_sample boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (business_id, slug)
);

create table if not exists public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  uploaded_by uuid not null references auth.users(id) on delete cascade,
  storage_path text not null unique,
  mime_type text not null check (mime_type in ('image/jpeg', 'image/png', 'image/webp')),
  size_bytes integer not null check (size_bytes between 1 and 10485760),
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.delivery_configs (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null unique references public.businesses(id) on delete cascade,
  delivery_enabled boolean not null default false,
  collection_available boolean not null default false,
  delivery_charge numeric(12, 2) not null default 0 check (delivery_charge >= 0),
  minimum_order_value numeric(12, 2) not null default 0 check (minimum_order_value >= 0),
  currency text not null default 'GBP' check (currency ~ '^[A-Z]{3}$'),
  estimated_min_minutes integer not null default 30 check (estimated_min_minutes between 1 and 10080),
  estimated_max_minutes integer not null default 60 check (estimated_max_minutes >= estimated_min_minutes and estimated_max_minutes <= 10080),
  opening_hours jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.delivery_areas (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 100),
  supported_postcodes text[] not null default '{}',
  delivery_charge numeric(12, 2) not null default 0 check (delivery_charge >= 0),
  minimum_order_value numeric(12, 2) not null default 0 check (minimum_order_value >= 0),
  available_time_slots jsonb not null default '[]'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null references auth.users(id) on delete restrict,
  business_id uuid not null references public.businesses(id) on delete restrict,
  status text not null default 'draft' check (status in ('draft', 'pending_payment', 'paid', 'cancelled')),
  total numeric(12, 2) not null default 0 check (total >= 0),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  delivery_method text check (delivery_method in ('delivery', 'collection')),
  delivery_address jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);
create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  quantity numeric(12, 3) not null check (quantity > 0),
  unit_price numeric(12, 2) not null check (unit_price >= 0),
  created_at timestamptz not null default timezone('utc', now())
);

create or replace function public.is_business_owner(target_business uuid)
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.businesses where id = target_business and owner_id = auth.uid()); $$;
grant execute on function public.has_role(text) to anon;
create or replace function public.grant_business_owner_role()
returns trigger language plpgsql security definer set search_path = public
as $$ begin insert into public.user_roles (user_id, role) values (new.owner_id, 'business_owner') on conflict do nothing; return new; end; $$;
drop trigger if exists businesses_grant_owner_role on public.businesses;
create trigger businesses_grant_owner_role after insert on public.businesses for each row execute procedure public.grant_business_owner_role();
create or replace function public.can_manage_business(target_business uuid)
returns boolean language sql stable security definer set search_path = public
as $$ select public.is_business_owner(target_business) or public.has_role('administrator'); $$;
create or replace function public.can_view_business(target_business uuid)
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.businesses where id = target_business and verification_status = 'verified' and is_published = true) or public.can_manage_business(target_business) or public.has_role('moderator'); $$;
create or replace function public.touch_business_updated_at()
returns trigger language plpgsql set search_path = public
as $$ begin new.updated_at = timezone('utc', now()); return new; end; $$;
drop trigger if exists businesses_touch_updated_at on public.businesses;
create trigger businesses_touch_updated_at before update on public.businesses for each row execute procedure public.touch_business_updated_at();
drop trigger if exists products_touch_updated_at on public.products;
create trigger products_touch_updated_at before update on public.products for each row execute procedure public.touch_business_updated_at();
drop trigger if exists delivery_configs_touch_updated_at on public.delivery_configs;
create trigger delivery_configs_touch_updated_at before update on public.delivery_configs for each row execute procedure public.touch_business_updated_at();
drop trigger if exists delivery_areas_touch_updated_at on public.delivery_areas;
create trigger delivery_areas_touch_updated_at before update on public.delivery_areas for each row execute procedure public.touch_business_updated_at();

create or replace function public.prevent_business_verification_change()
returns trigger language plpgsql security definer set search_path = public
as $$ begin if new.verification_status is distinct from old.verification_status and not (public.has_role('moderator') or public.has_role('administrator')) then raise exception 'Only platform moderators can change verification status'; end if; if new.owner_id is distinct from old.owner_id then raise exception 'Business ownership cannot change'; end if; return new; end; $$;
drop trigger if exists businesses_protect_ownership on public.businesses;
create trigger businesses_protect_ownership before update on public.businesses for each row execute procedure public.prevent_business_verification_change();

alter table public.businesses enable row level security;
alter table public.business_images enable row level security;
alter table public.product_categories enable row level security;
alter table public.products enable row level security;
alter table public.product_images enable row level security;
alter table public.delivery_configs enable row level security;
alter table public.delivery_areas enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

create policy "Verified businesses are public" on public.businesses for select to anon, authenticated using (public.can_view_business(id));
create policy "Users can register businesses" on public.businesses for insert to authenticated with check (owner_id = auth.uid());
create policy "Owners can update businesses" on public.businesses for update to authenticated using (public.can_manage_business(id)) with check (public.can_manage_business(id));
create policy "Owners can read business images" on public.business_images for select to authenticated using (public.can_view_business(business_id));
create policy "Owners can add business images" on public.business_images for insert to authenticated with check (uploaded_by = auth.uid() and public.can_manage_business(business_id));
create policy "Owners can remove business images" on public.business_images for delete to authenticated using (public.can_manage_business(business_id));
create policy "Owners and customers can read categories" on public.product_categories for select to anon, authenticated using (public.can_view_business(business_id));
create policy "Owners manage categories" on public.product_categories for all to authenticated using (public.can_manage_business(business_id)) with check (public.can_manage_business(business_id));
create policy "Available products are public" on public.products for select to anon, authenticated using (public.can_view_business(business_id) and (availability = true or public.can_manage_business(business_id)));
create policy "Owners manage products" on public.products for insert to authenticated with check (public.can_manage_business(business_id));
create policy "Owners update products" on public.products for update to authenticated using (public.can_manage_business(business_id)) with check (public.can_manage_business(business_id));
create policy "Owners delete products" on public.products for delete to authenticated using (public.can_manage_business(business_id));
create policy "Available product images are public" on public.product_images for select to anon, authenticated using (exists (select 1 from public.products p where p.id = product_id and public.can_view_business(p.business_id) and (p.availability = true or public.can_manage_business(p.business_id))));
create policy "Owners add product images" on public.product_images for insert to authenticated with check (uploaded_by = auth.uid() and exists (select 1 from public.products p where p.id = product_id and public.can_manage_business(p.business_id)));
create policy "Owners remove product images" on public.product_images for delete to authenticated using (exists (select 1 from public.products p where p.id = product_id and public.can_manage_business(p.business_id)));
create policy "Delivery config is public when business is public" on public.delivery_configs for select to anon, authenticated using (public.can_view_business(business_id));
create policy "Owners manage delivery config" on public.delivery_configs for all to authenticated using (public.can_manage_business(business_id)) with check (public.can_manage_business(business_id));
create policy "Delivery areas are public when business is public" on public.delivery_areas for select to anon, authenticated using (public.can_view_business(business_id));
create policy "Owners manage delivery areas" on public.delivery_areas for all to authenticated using (public.can_manage_business(business_id)) with check (public.can_manage_business(business_id));
create policy "Buyers and business owners can read orders" on public.orders for select to authenticated using (buyer_id = auth.uid() or public.can_manage_business(business_id) or public.has_role('administrator'));
create policy "Order items follow order access" on public.order_items for select to authenticated using (exists (select 1 from public.orders o where o.id = order_id and (o.buyer_id = auth.uid() or public.can_manage_business(o.business_id) or public.has_role('administrator'))));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values ('business-media', 'business-media', false, 10485760, array['image/jpeg', 'image/png', 'image/webp']) on conflict (id) do update set public = false, file_size_limit = 10485760, allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];
create policy "Public verified business media is readable" on storage.objects for select to anon, authenticated using (bucket_id = 'business-media' and ((split_part(name, '/', 1) = 'business' and public.can_view_business((split_part(name, '/', 2))::uuid)) or (split_part(name, '/', 1) = 'product' and exists (select 1 from public.products p where p.id = (split_part(name, '/', 2))::uuid and public.can_view_business(p.business_id)))));
create policy "Business owners can upload media" on storage.objects for insert to authenticated with check (bucket_id = 'business-media' and ((split_part(name, '/', 1) = 'business' and public.can_manage_business((split_part(name, '/', 2))::uuid)) or (split_part(name, '/', 1) = 'product' and exists (select 1 from public.products p where p.id = (split_part(name, '/', 2))::uuid and public.can_manage_business(p.business_id)))));
create policy "Business owners can delete media" on storage.objects for delete to authenticated using (bucket_id = 'business-media' and owner_id = auth.uid()::text);

create index if not exists businesses_public_category_idx on public.businesses (verification_status, is_published, category, city, created_at desc);
create index if not exists businesses_name_trgm_idx on public.businesses using gin (name gin_trgm_ops);
create index if not exists businesses_description_trgm_idx on public.businesses using gin (description gin_trgm_ops);
create index if not exists business_images_business_idx on public.business_images (business_id, sort_order);
create index if not exists product_categories_business_idx on public.product_categories (business_id, sort_order);
create index if not exists products_business_available_idx on public.products (business_id, availability, category_id, created_at desc);
create index if not exists products_name_trgm_idx on public.products using gin (name gin_trgm_ops);
create index if not exists product_images_product_idx on public.product_images (product_id, sort_order);
create index if not exists delivery_areas_business_idx on public.delivery_areas (business_id, is_active);
create index if not exists orders_buyer_created_idx on public.orders (buyer_id, created_at desc);
create index if not exists orders_business_created_idx on public.orders (business_id, created_at desc);
