alter table public.moderation_audit_log
  add column if not exists role text;
