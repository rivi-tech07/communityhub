create table if not exists public.deletion_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  requested_at timestamptz not null default timezone('utc', now()),
  status text not null default 'queued' check (status in ('queued', 'processing', 'completed', 'failed')),
  attempts integer not null default 0 check (attempts >= 0),
  last_error text,
  completed_at timestamptz
);

alter table public.deletion_requests enable row level security;
revoke all on public.deletion_requests from anon, authenticated;
create unique index if not exists deletion_requests_active_user_idx
  on public.deletion_requests (user_id)
  where status in ('queued', 'processing');
create index if not exists deletion_requests_queue_idx
  on public.deletion_requests (status, requested_at);

create or replace function public.claim_deletion_request()
returns table (id uuid, user_id uuid, status text, attempts integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  request_row public.deletion_requests%rowtype;
begin
  select * into request_row
  from public.deletion_requests
  where status in ('queued', 'failed')
  order by requested_at
  for update skip locked
  limit 1;

  if request_row.id is null then
    return;
  end if;

  update public.deletion_requests
  set status = 'processing', attempts = request_row.attempts + 1, last_error = null
  where deletion_requests.id = request_row.id
  returning deletion_requests.id, deletion_requests.user_id, deletion_requests.status, deletion_requests.attempts
  into id, user_id, status, attempts;
  return next;
end;
$$;

revoke all on function public.claim_deletion_request() from public, anon, authenticated;
grant execute on function public.claim_deletion_request() to service_role;

alter table public.moderation_audit_log alter column actor_id drop not null;
alter table public.moderation_audit_log drop constraint if exists moderation_audit_log_actor_id_fkey;
alter table public.moderation_audit_log
  add constraint moderation_audit_log_actor_id_fkey
  foreign key (actor_id) references auth.users(id) on delete set null;

-- Keep the anonymized tombstone profile after the auth identity is removed.
alter table public.profiles drop constraint if exists profiles_id_fkey;
