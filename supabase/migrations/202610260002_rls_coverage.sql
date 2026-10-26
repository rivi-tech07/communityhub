-- Service-role-only diagnostic used by tests and operations. It does not change policies.
create or replace function public.check_public_rls_coverage()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  allowlisted_infrastructure text[] := array['spatial_ref_sys'];
  missing_rls text[];
  checked_count integer;
begin
  select count(*)::integer
    into checked_count
  from pg_tables t
  join pg_class c on c.relname = t.tablename
    and c.relnamespace = t.schemaname::regnamespace
  where t.schemaname = 'public'
    and c.relkind = 'r'
    and t.tablename <> all (allowlisted_infrastructure);

  select coalesce(array_agg(t.tablename order by t.tablename), '{}')
    into missing_rls
  from pg_tables t
  join pg_class c on c.relname = t.tablename
    and c.relnamespace = t.schemaname::regnamespace
  where t.schemaname = 'public'
    and c.relkind = 'r'
    and not c.relrowsecurity
    and t.tablename <> all (allowlisted_infrastructure);

  if cardinality(missing_rls) > 0 then
    raise exception 'Public tables without RLS: %', array_to_string(missing_rls, ', ');
  end if;

  return jsonb_build_object(
    'checked_tables', checked_count,
    'allowlisted_infrastructure', allowlisted_infrastructure,
    'missing_rls', missing_rls
  );
end;
$$;

revoke all on function public.check_public_rls_coverage() from public, anon, authenticated;
grant execute on function public.check_public_rls_coverage() to service_role;
