alter table public.businesses add column if not exists legal_name text;
alter table public.businesses add column if not exists trader_type text not null default 'business' check (trader_type in ('business', 'sole_trader', 'partnership', 'charity', 'individual'));
alter table public.businesses add column if not exists company_registration_number text;
alter table public.businesses add column if not exists vat_registered boolean not null default false;
alter table public.businesses add column if not exists vat_number text;
alter table public.businesses add column if not exists uk_terms_version text;
alter table public.businesses add column if not exists uk_terms_accepted_at timestamptz;
alter table public.businesses add column if not exists seller_tax_details_verified_at timestamptz;

create table if not exists public.business_compliance (
  business_id uuid primary key references public.businesses(id) on delete cascade,
  legal_name text not null check (char_length(legal_name) between 2 and 200),
  trader_type text not null check (trader_type in ('business', 'sole_trader', 'partnership', 'charity', 'individual')),
  tax_country text not null default 'GB' check (char_length(tax_country) between 2 and 3),
  tax_identifier_last4 text check (tax_identifier_last4 is null or tax_identifier_last4 ~ '^[A-Za-z0-9]{4}$'),
  seller_due_diligence_status text not null default 'pending' check (seller_due_diligence_status in ('pending', 'verified', 'rejected', 'not_required')),
  privacy_notice_version text not null,
  terms_version text not null,
  accepted_at timestamptz not null default timezone('utc', now()),
  verified_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.business_compliance enable row level security;
create policy "Business owners can read compliance" on public.business_compliance for select to authenticated using (public.can_manage_business(business_id) or public.has_role('administrator'));
create policy "Business owners can create compliance" on public.business_compliance for insert to authenticated with check (public.can_manage_business(business_id));
create policy "Business owners can update compliance" on public.business_compliance for update to authenticated using (public.can_manage_business(business_id) or public.has_role('administrator')) with check (public.can_manage_business(business_id) or public.has_role('administrator'));

create index if not exists businesses_uk_tax_status_idx on public.businesses (country, vat_registered, seller_tax_details_verified_at);
create index if not exists business_compliance_due_diligence_idx on public.business_compliance (seller_due_diligence_status, updated_at desc);
