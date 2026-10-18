create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  biography text,
  profile_photo_url text,
  country text,
  city text,
  preferred_language text not null default 'en',
  privacy_settings jsonb not null default jsonb_build_object('profile_visible', true, 'show_city', true, 'allow_messages', true),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.profiles add column if not exists biography text;
alter table public.profiles add column if not exists profile_photo_url text;
alter table public.profiles add column if not exists country text;
alter table public.profiles add column if not exists city text;
alter table public.profiles add column if not exists preferred_language text not null default 'en';
alter table public.profiles add column if not exists privacy_settings jsonb not null default jsonb_build_object('profile_visible', true, 'show_city', true, 'allow_messages', true);
alter table public.profiles add column if not exists updated_at timestamptz not null default timezone('utc', now());

alter table public.profiles enable row level security;
drop policy if exists "Profiles are readable by authenticated users" on public.profiles;
create policy "Profiles are readable by authenticated users" on public.profiles for select to authenticated using (id = auth.uid() or privacy_settings ->> 'profile_visible' = 'true');
drop policy if exists "Users can create their own profile" on public.profiles;
create policy "Users can create their own profile" on public.profiles for insert to authenticated with check (auth.uid() = id);
drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile" on public.profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

create table if not exists public.user_roles (
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user', 'moderator', 'business_owner', 'employer', 'administrator')),
  created_at timestamptz not null default timezone('utc', now()),
  primary key (user_id, role)
);

alter table public.user_roles enable row level security;
create or replace function public.has_role(required_role text)
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.user_roles where user_id = auth.uid() and role = required_role); $$;
revoke all on function public.has_role(text) from public;
grant execute on function public.has_role(text) to authenticated;
create policy "Users can read their own roles" on public.user_roles for select to authenticated using (user_id = auth.uid());

create or replace function public.touch_updated_at()
returns trigger language plpgsql set search_path = public
as $$ begin new.updated_at = timezone('utc', now()); return new; end; $$;
drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at before update on public.profiles for each row execute procedure public.touch_updated_at();

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$ begin insert into public.profiles (id) values (new.id); return new; end; $$;

create or replace trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();

create or replace function public.handle_new_user_role()
returns trigger language plpgsql security definer set search_path = public
as $$ begin insert into public.user_roles (user_id, role) values (new.id, 'user') on conflict do nothing; return new; end; $$;
drop trigger if exists on_auth_user_created_role on auth.users;
create trigger on_auth_user_created_role after insert on auth.users for each row execute procedure public.handle_new_user_role();
