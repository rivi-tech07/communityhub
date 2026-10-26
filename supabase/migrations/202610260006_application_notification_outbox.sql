create table if not exists public.outbox_messages (
  id uuid primary key default gen_random_uuid(),
  channel text not null check (channel in ('email', 'sms')),
  template text not null,
  recipient text not null,
  payload jsonb not null,
  status text not null default 'pending' check (status in ('pending', 'sent', 'failed', 'dead')),
  attempts integer not null default 0 check (attempts >= 0),
  next_attempt_at timestamptz not null default timezone('utc', now()),
  last_error text,
  created_at timestamptz not null default timezone('utc', now()),
  sent_at timestamptz,
  dedupe_key text unique
);

alter table public.outbox_messages enable row level security;
revoke all on public.outbox_messages from anon, authenticated;
create index if not exists outbox_messages_due_idx on public.outbox_messages (status, next_attempt_at);

create or replace function public.approve_community_membership(p_community_id uuid, p_user_id uuid)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare membership_row public.community_memberships%rowtype; recipient_value text; channel_value text; message_id uuid;
begin
  if not public.is_community_admin(p_community_id) then raise exception 'Only community administrators can approve memberships'; end if;
  update public.community_memberships set status = 'active', updated_at = timezone('utc', now())
    where community_id = p_community_id and user_id = p_user_id and status = 'pending' returning * into membership_row;
  if membership_row.community_id is null then raise exception 'Pending membership was not found'; end if;
  select case when u.email is not null then u.email else u.phone end, case when u.email is not null then 'email' else 'sms' end
    into recipient_value, channel_value from auth.users u where u.id = p_user_id;
  if recipient_value is null then raise exception 'Approved member has no notification contact'; end if;
  insert into public.outbox_messages (channel, template, recipient, payload, dedupe_key)
    values (channel_value, 'community_membership_approved', recipient_value,
      jsonb_build_object('community_id', p_community_id, 'user_id', p_user_id),
      'community-membership-approved:' || p_community_id::text || ':' || p_user_id::text)
    on conflict (dedupe_key) do update set id = public.outbox_messages.id returning id into message_id;
  return jsonb_build_object('community_id', membership_row.community_id, 'user_id', membership_row.user_id,
    'role', membership_row.role, 'status', membership_row.status, 'joined_at', membership_row.joined_at,
    'updated_at', membership_row.updated_at, 'outbox_message_id', message_id);
end; $$;
revoke all on function public.approve_community_membership(uuid, uuid) from public, anon;
grant execute on function public.approve_community_membership(uuid, uuid) to authenticated;

create or replace function public.claim_outbox_message()
returns setof public.outbox_messages language plpgsql security definer set search_path = public
as $$
declare message_row public.outbox_messages%rowtype;
begin
  select * into message_row from public.outbox_messages where status in ('pending', 'failed')
    and next_attempt_at <= timezone('utc', now()) order by created_at for update skip locked limit 1;
  if message_row.id is null then return; end if;
  update public.outbox_messages set status = 'pending', attempts = message_row.attempts + 1, last_error = null
    where id = message_row.id returning * into message_row;
  return next message_row;
end; $$;
revoke all on function public.claim_outbox_message() from public, anon, authenticated;
grant execute on function public.claim_outbox_message() to service_role;
