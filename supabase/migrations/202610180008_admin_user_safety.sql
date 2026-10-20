create table if not exists public.user_safety_controls (
  user_id uuid primary key references auth.users(id) on delete cascade,
  status text not null default 'active' check (status in ('active', 'blocked', 'blacklisted')),
  reason text not null check (char_length(reason) between 3 and 500),
  expires_at timestamptz,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (status <> 'blocked' or expires_at is not null)
);

alter table public.user_safety_controls enable row level security;
create policy "Administrators can view user safety controls" on public.user_safety_controls for select to authenticated using (public.has_role('administrator'));
create policy "Administrators can create user safety controls" on public.user_safety_controls for insert to authenticated with check (public.has_role('administrator') and created_by = auth.uid());
create policy "Administrators can update user safety controls" on public.user_safety_controls for update to authenticated using (public.has_role('administrator')) with check (public.has_role('administrator'));

create or replace function public.is_user_restricted(target_user uuid)
returns boolean language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.user_safety_controls
    where user_id = target_user
      and (status = 'blacklisted' or (status = 'blocked' and (expires_at is null or expires_at > timezone('utc', now()))))
  );
$$;
revoke all on function public.is_user_restricted(uuid) from public;
grant execute on function public.is_user_restricted(uuid) to authenticated;

create index if not exists user_safety_controls_status_idx on public.user_safety_controls (status, updated_at desc);
