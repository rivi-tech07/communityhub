-- Query-plan guardrails for the cursor-paginated public/read APIs.
-- Keep enable_seqscan off so a missing intended index fails this check even on
-- a small disposable database where PostgreSQL might otherwise prefer a scan.
set enable_seqscan = off;

create or replace function pg_temp.assert_query_uses_index(
  check_name text,
  expected_index text,
  statement text
) returns void
language plpgsql
as $$
declare
  plan json;
begin
  execute 'explain (format json) ' || statement into plan;
  if plan::text like '%Seq Scan%' then
    raise exception '% uses a sequential scan: %', check_name, plan::text;
  end if;
  if plan::text not like '%' || expected_index || '%' then
    raise exception '% does not use expected index %: %', check_name, expected_index, plan::text;
  end if;
end;
$$;

select pg_temp.assert_query_uses_index(
  'feed',
  'posts_feed_created_idx',
  $$select p.id, p.created_at
    from public.posts p
    join public.communities c on c.id = p.community_id
   where c.visibility = 'public' and p.removed_at is null
   order by p.created_at desc
   limit 51$$
);

select pg_temp.assert_query_uses_index(
  'community search',
  'communities_name_trgm_idx',
  $$select c.id, c.name
    from public.communities c
   where c.visibility = 'public' and c.name ilike '%market%'
   order by c.created_at desc
   limit 51$$
);

select pg_temp.assert_query_uses_index(
  'directory search',
  'businesses_name_trgm_idx',
  $$select b.id, b.name
    from public.businesses b
   where b.verification_status = 'verified'
     and b.is_published = true
     and (b.name ilike '%market%' or b.description ilike '%market%')
   order by b.created_at desc
   limit 51$$
);

select pg_temp.assert_query_uses_index(
  'comment listing',
  'comments_post_created_idx',
  $$select c.id, c.created_at
    from public.comments c
   where c.post_id = '00000000-0000-0000-0000-000000000000'::uuid
   order by c.created_at asc
   limit 51$$
);

drop function pg_temp.assert_query_uses_index(text, text, text);
