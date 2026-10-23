alter table public.job_listings
  add column if not exists workplace_type text not null default 'on_site';

alter table public.job_listings
  drop constraint if exists job_listings_workplace_type_check;

alter table public.job_listings
  add constraint job_listings_workplace_type_check
  check (workplace_type in ('remote', 'hybrid', 'on_site'));

create table if not exists public.saved_jobs (
  user_id uuid not null references auth.users(id) on delete cascade,
  job_id uuid not null references public.job_listings(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (user_id, job_id)
);

alter table public.saved_jobs enable row level security;

create policy "Users read own saved jobs"
on public.saved_jobs for select to authenticated
using (user_id = auth.uid());

create policy "Users save public jobs"
on public.saved_jobs for insert to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1 from public.job_listings j
    where j.id = job_id
      and j.status = 'published'
      and (j.application_deadline is null or j.application_deadline >= timezone('utc', now()))
  )
);

create policy "Users remove saved jobs"
on public.saved_jobs for delete to authenticated
using (user_id = auth.uid());

create index if not exists saved_jobs_user_created_idx
on public.saved_jobs(user_id, created_at desc);
