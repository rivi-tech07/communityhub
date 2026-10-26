create table if not exists public.payment_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null check (provider in ('stripe', 'razorpay')),
  provider_event_id text not null,
  event_type text,
  received_at timestamptz not null default timezone('utc', now()),
  processed_at timestamptz,
  status text not null default 'received' check (status in ('received', 'processed', 'failed', 'ignored')),
  attempts integer not null default 0,
  last_error text,
  payload jsonb not null,
  unique (provider, provider_event_id)
);

alter table public.payment_events enable row level security;
revoke all on public.payment_events from anon, authenticated;

create or replace function public.process_payment_event(
  p_provider text,
  p_provider_event_id text,
  p_event_type text,
  p_provider_payment_id text,
  p_provider_order_id text,
  p_payload jsonb
)
returns table (outcome text, duplicate boolean, transaction_found boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  event_row public.payment_events%rowtype;
  transaction_row public.payment_transactions%rowtype;
  promotion_row record;
  succeeded boolean := p_event_type in ('payment_intent.succeeded', 'payment.captured');
  failed boolean := p_event_type in ('payment_intent.payment_failed', 'payment.failed');
  refunded boolean := p_event_type like '%refunded' or p_event_type = 'refund.processed';
  provider_failure_code text := coalesce(p_payload #>> '{data,object,last_payment_error,code}', p_payload #>> '{payload,payment,entity,error_code}', 'provider_failure');
  provider_failure_message text := coalesce(p_payload #>> '{data,object,last_payment_error,message}', p_payload #>> '{payload,payment,entity,error_description}', 'Payment failed.');
begin
  if p_provider not in ('stripe', 'razorpay') or nullif(trim(p_provider_event_id), '') is null then
    raise exception 'Invalid payment event identity';
  end if;

  insert into public.payment_events(provider, provider_event_id, event_type, payload)
  values (p_provider, p_provider_event_id, nullif(p_event_type, ''), p_payload)
  on conflict (provider, provider_event_id) do nothing;

  select * into event_row
  from public.payment_events
  where provider = p_provider and provider_event_id = p_provider_event_id
  for update;

  if event_row.status = 'processed' then
    return query select 'processed'::text, true, true;
    return;
  end if;

  update public.payment_events
  set status = 'received', attempts = attempts + 1, last_error = null
  where id = event_row.id;

  if nullif(trim(coalesce(p_provider_payment_id, '')), '') is not null then
    select * into transaction_row
    from public.payment_transactions
    where provider = p_provider and provider_payment_id = p_provider_payment_id
    for update;
  else
    select * into transaction_row
    from public.payment_transactions
    where provider = p_provider and provider_order_id = p_provider_order_id
    for update;
  end if;

  if transaction_row.id is null then
    update public.payment_events
    set status = 'ignored', processed_at = timezone('utc', now())
    where id = event_row.id;
    return query select 'ignored'::text, false, false;
    return;
  end if;

  if refunded then
    update public.payment_transactions
    set status = 'refunded', refund_amount_minor = transaction_row.amount_minor
    where id = transaction_row.id;
  elsif succeeded then
    update public.payment_transactions
    set status = 'succeeded',
        provider_payment_id = coalesce(nullif(p_provider_payment_id, ''), transaction_row.provider_payment_id),
        provider_order_id = coalesce(nullif(p_provider_order_id, ''), transaction_row.provider_order_id)
    where id = transaction_row.id and status <> 'succeeded';

    if transaction_row.purpose = 'physical_order' then
      update public.orders set status = 'paid'
      where id = transaction_row.reference_id and status = 'pending_payment';
    elsif transaction_row.purpose = 'promotion' then
      update public.promotions set transaction_id = transaction_row.id
      where id = transaction_row.reference_id;
      select approval_status, starts_at, expires_at into promotion_row
      from public.promotions where id = transaction_row.reference_id;
      if promotion_row.approval_status = 'approved' and promotion_row.expires_at > timezone('utc', now()) then
        update public.promotions set entitlement_status = 'active'
        where id = transaction_row.reference_id;
      end if;
    end if;
  elsif failed then
    update public.payment_transactions
    set status = 'failed', failure_code = provider_failure_code, failure_message = provider_failure_message
    where id = transaction_row.id and status <> 'succeeded';
    if transaction_row.purpose = 'physical_order' then
      update public.orders set status = 'cancelled'
      where id = transaction_row.reference_id and status = 'pending_payment';
    end if;
  end if;

  update public.payment_events
  set status = 'processed', processed_at = timezone('utc', now())
  where id = event_row.id;
  return query select 'processed'::text, false, true;
exception when others then
  update public.payment_events
  set status = 'failed', last_error = left(sqlerrm, 2000)
  where provider = p_provider and provider_event_id = p_provider_event_id;
  raise;
end;
$$;

revoke all on function public.process_payment_event(text, text, text, text, text, jsonb) from public, anon, authenticated;
grant execute on function public.process_payment_event(text, text, text, text, text, jsonb) to service_role;
