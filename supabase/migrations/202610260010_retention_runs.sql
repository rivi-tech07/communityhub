create table if not exists public.retention_runs (
  id uuid primary key default gen_random_uuid(),
  job text not null check (job in ('soft_deleted_purge', 'sample_purge', 'audit_log_purge')),
  mode text not null check (mode in ('dry_run', 'apply')),
  status text not null default 'running' check (status in ('running', 'succeeded', 'failed')),
  started_at timestamptz not null default timezone('utc', now()),
  finished_at timestamptz,
  rows_affected integer,
  details jsonb not null default '{}'::jsonb,
  last_error text
);

create index if not exists retention_runs_job_started_idx
  on public.retention_runs (job, started_at desc);

alter table public.retention_runs enable row level security;
revoke all on public.retention_runs from anon, authenticated;
