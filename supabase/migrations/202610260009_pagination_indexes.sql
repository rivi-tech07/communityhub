create index if not exists posts_feed_created_idx
  on public.posts (created_at desc)
  where removed_at is null;

create index if not exists communities_public_created_idx
  on public.communities (created_at desc)
  where visibility = 'public';
