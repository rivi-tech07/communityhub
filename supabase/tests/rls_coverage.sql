-- RLS coverage check. Run with the Supabase SQL runner or psql against the target database.
-- Keep this allowlist explicit: these are extension-owned infrastructure relations,
-- not application tables. Add a relation only with a security review and a note here.
do $$
declare
  allowlisted_infrastructure text[] := array['spatial_ref_sys'];
  missing_rls text[];
begin
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
end;
$$;
