drop policy if exists "Public users read enabled feature flags" on public.feature_flags;
drop policy if exists "Administrators manage feature flags" on public.feature_flags;

alter table public.feature_flags enable row level security;
revoke all on public.feature_flags from anon, authenticated;

insert into public.feature_flags (key, enabled, description)
values
  ('checkout', false, 'Enable server-created physical and service checkout.'),
  ('promotions', false, 'Enable paid promotion requests and promotion checkout.'),
  ('service_enquiries', false, 'Enable authenticated service enquiries.')
on conflict (key) do nothing;
