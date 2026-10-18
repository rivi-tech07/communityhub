create extension if not exists pg_trgm;

create table if not exists public.communities (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 120),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  description text,
  community_type text not null check (community_type in ('language', 'culture', 'location', 'interest', 'profession')),
  visibility text not null default 'public' check (visibility in ('public', 'private')),
  country text,
  city text,
  language_code text,
  cover_photo_path text,
  created_by uuid not null references auth.users(id) on delete restrict,
  is_sample boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.community_memberships (
  community_id uuid not null references public.communities(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'admin', 'member')),
  status text not null default 'pending' check (status in ('pending', 'active', 'blocked')),
  joined_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (community_id, user_id)
);

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  community_id uuid not null references public.communities(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 5000),
  is_announcement boolean not null default false,
  is_sample boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  removed_at timestamptz,
  removed_by uuid references auth.users(id) on delete set null,
  removed_reason text
);

create table if not exists public.post_media (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  uploader_id uuid not null references auth.users(id) on delete cascade,
  storage_path text not null unique,
  mime_type text not null check (mime_type in ('image/jpeg', 'image/png', 'image/webp', 'image/gif')),
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  parent_id uuid references public.comments(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  removed_at timestamptz,
  removed_by uuid references auth.users(id) on delete set null,
  removed_reason text
);

create table if not exists public.hashtags (
  id uuid primary key default gen_random_uuid(),
  tag text not null unique check (tag ~ '^[a-z0-9_]{1,80}$'),
  created_at timestamptz not null default timezone('utc', now())
);
create table if not exists public.post_hashtags (
  post_id uuid not null references public.posts(id) on delete cascade,
  hashtag_id uuid not null references public.hashtags(id) on delete cascade,
  primary key (post_id, hashtag_id)
);

create table if not exists public.post_likes (
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (post_id, user_id)
);
create table if not exists public.saved_posts (
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (post_id, user_id)
);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users(id) on delete cascade,
  post_id uuid references public.posts(id) on delete cascade,
  comment_id uuid references public.comments(id) on delete cascade,
  reported_user_id uuid references auth.users(id) on delete cascade,
  reason text not null check (reason in ('spam', 'harassment', 'hate', 'violence', 'sexual', 'scam', 'other')),
  details text,
  status text not null default 'open' check (status in ('open', 'reviewing', 'resolved', 'dismissed')),
  created_at timestamptz not null default timezone('utc', now()),
  resolved_at timestamptz,
  resolved_by uuid references auth.users(id) on delete set null,
  check (post_id is not null or comment_id is not null or reported_user_id is not null)
);
create table if not exists public.blocks (
  blocker_id uuid not null references auth.users(id) on delete cascade,
  blocked_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);
create table if not exists public.moderation_audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references auth.users(id) on delete cascade,
  action text not null,
  post_id uuid references public.posts(id) on delete set null,
  comment_id uuid references public.comments(id) on delete set null,
  report_id uuid references public.reports(id) on delete set null,
  target_user_id uuid references auth.users(id) on delete set null,
  reason text,
  created_at timestamptz not null default timezone('utc', now())
);

create or replace function public.sync_post_hashtags()
returns trigger language plpgsql security definer set search_path = public
as $function$
declare match_data text[];
begin
  if tg_op = 'UPDATE' then delete from public.post_hashtags where post_id = new.id; end if;
  for match_data in select regexp_matches(lower(new.body), '#([a-z0-9_]{1,80})', 'g') loop
    insert into public.hashtags (tag) values (match_data[1]) on conflict (tag) do nothing;
    insert into public.post_hashtags (post_id, hashtag_id) select new.id, id from public.hashtags where tag = match_data[1] on conflict do nothing;
  end loop;
  return new;
end;
$function$;
drop trigger if exists posts_sync_hashtags on public.posts;
create trigger posts_sync_hashtags after insert or update of body on public.posts for each row execute procedure public.sync_post_hashtags();
create or replace function public.prevent_unauthorized_content_fields()
returns trigger language plpgsql security definer set search_path = public
as $function$
begin
  if new.community_id is distinct from old.community_id or new.author_id is distinct from old.author_id then
    raise exception 'Post ownership and community cannot change';
  end if;
  if not (public.has_role('moderator') or public.has_role('administrator') or public.is_community_admin(new.community_id)) then
    if new.is_announcement is distinct from old.is_announcement or new.removed_at is distinct from old.removed_at or new.removed_by is distinct from old.removed_by or new.removed_reason is distinct from old.removed_reason then
      raise exception 'Only moderators can change moderation fields';
    end if;
  end if;
  return new;
end;
$function$;
drop trigger if exists posts_prevent_unauthorized_fields on public.posts;
create trigger posts_prevent_unauthorized_fields before update on public.posts for each row execute procedure public.prevent_unauthorized_content_fields();
create or replace function public.prevent_unauthorized_comment_fields()
returns trigger language plpgsql security definer set search_path = public
as $function$
begin
  if new.post_id is distinct from old.post_id or new.author_id is distinct from old.author_id or new.parent_id is distinct from old.parent_id then
    raise exception 'Comment ownership and parent cannot change';
  end if;
  if not public.can_moderate_post(new.post_id) then
    if new.removed_at is distinct from old.removed_at or new.removed_by is distinct from old.removed_by or new.removed_reason is distinct from old.removed_reason then
      raise exception 'Only moderators can change moderation fields';
    end if;
  end if;
  return new;
end;
$function$;
drop trigger if exists comments_prevent_unauthorized_fields on public.comments;
create trigger comments_prevent_unauthorized_fields before update on public.comments for each row execute procedure public.prevent_unauthorized_comment_fields();

create or replace function public.is_community_member(target_community uuid)
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.community_memberships where community_id = target_community and user_id = auth.uid() and status = 'active'); $$;
create or replace function public.is_community_admin(target_community uuid)
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.community_memberships where community_id = target_community and user_id = auth.uid() and status = 'active' and role in ('owner', 'admin')) or public.has_role('administrator'); $$;
create or replace function public.can_view_community(target_community uuid)
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.communities where id = target_community and visibility = 'public') or public.is_community_member(target_community) or public.is_community_admin(target_community); $$;
create or replace function public.can_view_post(target_post uuid)
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.posts p where p.id = target_post and public.can_view_community(p.community_id) and not exists (select 1 from public.blocks b where b.blocker_id = auth.uid() and b.blocked_id = p.author_id)); $$;
create or replace function public.can_moderate_post(target_post uuid)
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.posts p where p.id = target_post and (public.is_community_admin(p.community_id) or public.has_role('moderator'))); $$;
create or replace function public.add_community_owner()
returns trigger language plpgsql security definer set search_path = public
as $$ begin insert into public.community_memberships (community_id, user_id, role, status) values (new.id, new.created_by, 'owner', 'active') on conflict (community_id, user_id) do update set role = 'owner', status = 'active'; return new; end; $$;
create trigger community_owner_membership after insert on public.communities for each row execute procedure public.add_community_owner();

alter table public.communities enable row level security;
alter table public.community_memberships enable row level security;
alter table public.posts enable row level security;
alter table public.post_media enable row level security;
alter table public.comments enable row level security;
alter table public.hashtags enable row level security;
alter table public.post_hashtags enable row level security;
alter table public.post_likes enable row level security;
alter table public.saved_posts enable row level security;
alter table public.reports enable row level security;
alter table public.blocks enable row level security;
alter table public.moderation_audit_log enable row level security;

create policy "Authenticated users can discover community profiles" on public.communities for select to authenticated using (true);
create policy "Users can create communities" on public.communities for insert to authenticated with check (created_by = auth.uid());
create policy "Community admins can update communities" on public.communities for update to authenticated using (public.is_community_admin(id)) with check (public.is_community_admin(id));
create policy "Members can read their membership" on public.community_memberships for select to authenticated using (user_id = auth.uid() or public.is_community_admin(community_id));
create policy "Users can request or join communities" on public.community_memberships for insert to authenticated with check (user_id = auth.uid() and role = 'member' and ((status = 'active' and exists (select 1 from public.communities where id = community_id and visibility = 'public')) or (status = 'pending' and exists (select 1 from public.communities where id = community_id and visibility = 'private'))));
create policy "Community admins manage memberships" on public.community_memberships for update to authenticated using (public.is_community_admin(community_id)) with check (public.is_community_admin(community_id));
create policy "Members can view accessible posts" on public.posts for select to authenticated using (public.can_view_community(community_id) and (removed_at is null or public.can_moderate_post(id) or author_id = auth.uid()));
create policy "Active members can post" on public.posts for insert to authenticated with check (author_id = auth.uid() and public.is_community_member(community_id) and (not is_announcement or public.is_community_admin(community_id)));
create policy "Authors and moderators can update posts" on public.posts for update to authenticated using (author_id = auth.uid() or public.can_moderate_post(id)) with check (author_id = auth.uid() or public.can_moderate_post(id));
create policy "Members can view post media" on public.post_media for select to authenticated using (public.can_view_post(post_id));
create policy "Authors can attach post media" on public.post_media for insert to authenticated with check (uploader_id = auth.uid() and exists (select 1 from public.posts where id = post_id and author_id = auth.uid()));
create policy "Members can view comments" on public.comments for select to authenticated using (public.can_view_post(post_id) and (removed_at is null or public.can_moderate_post(post_id) or author_id = auth.uid()));
create policy "Active members can comment" on public.comments for insert to authenticated with check (author_id = auth.uid() and public.can_view_post(post_id) and public.is_community_member((select community_id from public.posts where id = post_id)));
create policy "Comment authors and moderators can update" on public.comments for update to authenticated using (author_id = auth.uid() or public.can_moderate_post(post_id)) with check (author_id = auth.uid() or public.can_moderate_post(post_id));
create policy "Authenticated users can read hashtags" on public.hashtags for select to authenticated using (true);
create policy "Authenticated users can add hashtags" on public.hashtags for insert to authenticated with check (true);
create policy "Users can manage post hashtags" on public.post_hashtags for select to authenticated using (public.can_view_post(post_id));
create policy "Post authors can attach hashtags" on public.post_hashtags for insert to authenticated with check (exists (select 1 from public.posts where id = post_id and author_id = auth.uid()));
create policy "Users can manage own likes" on public.post_likes for select to authenticated using (user_id = auth.uid() or public.can_view_post(post_id));
create policy "Users can like accessible posts" on public.post_likes for insert to authenticated with check (user_id = auth.uid() and public.can_view_post(post_id));
create policy "Users can remove own likes" on public.post_likes for delete to authenticated using (user_id = auth.uid());
create policy "Users can read and manage own saves" on public.saved_posts for select to authenticated using (user_id = auth.uid());
create policy "Users can save accessible posts" on public.saved_posts for insert to authenticated with check (user_id = auth.uid() and public.can_view_post(post_id));
create policy "Users can remove own saves" on public.saved_posts for delete to authenticated using (user_id = auth.uid());
create policy "Users can submit reports" on public.reports for insert to authenticated with check (reporter_id = auth.uid());
create policy "Reporters and moderators can read reports" on public.reports for select to authenticated using (reporter_id = auth.uid() or public.has_role('moderator') or public.has_role('administrator'));
create policy "Community admins can read reports for their posts" on public.reports for select to authenticated using ((post_id is not null and exists (select 1 from public.posts where id = post_id and public.is_community_admin(community_id))) or (comment_id is not null and exists (select 1 from public.comments c join public.posts p on p.id = c.post_id where c.id = comment_id and public.is_community_admin(p.community_id))));
create policy "Moderators can update reports" on public.reports for update to authenticated using (public.has_role('moderator') or public.has_role('administrator')) with check (public.has_role('moderator') or public.has_role('administrator'));
create policy "Community admins can resolve reports for their posts" on public.reports for update to authenticated using ((post_id is not null and exists (select 1 from public.posts where id = post_id and public.is_community_admin(community_id))) or (comment_id is not null and exists (select 1 from public.comments c join public.posts p on p.id = c.post_id where c.id = comment_id and public.is_community_admin(p.community_id)))) with check ((post_id is not null and exists (select 1 from public.posts where id = post_id and public.is_community_admin(community_id))) or (comment_id is not null and exists (select 1 from public.comments c join public.posts p on p.id = c.post_id where c.id = comment_id and public.is_community_admin(p.community_id))));
create policy "Users can manage their blocks" on public.blocks for select to authenticated using (blocker_id = auth.uid());
create policy "Users can block others" on public.blocks for insert to authenticated with check (blocker_id = auth.uid());
create policy "Users can unblock others" on public.blocks for delete to authenticated using (blocker_id = auth.uid());
create policy "Moderators can read audit logs" on public.moderation_audit_log for select to authenticated using (public.has_role('moderator') or public.has_role('administrator'));
create policy "Authorized moderators can write audit logs" on public.moderation_audit_log for insert to authenticated with check (actor_id = auth.uid() and (public.has_role('moderator') or public.has_role('administrator') or (post_id is not null and public.can_moderate_post(post_id)) or (comment_id is not null and exists (select 1 from public.comments where id = comment_id and public.can_moderate_post(post_id)))));

insert into storage.buckets (id, name, public) values ('community-media', 'community-media', false) on conflict (id) do update set public = false;
create policy "Members can read private community media" on storage.objects for select to authenticated using (bucket_id = 'community-media' and public.can_view_community((split_part(name, '/', 1))::uuid));
create policy "Post authors can upload media" on storage.objects for insert to authenticated with check (bucket_id = 'community-media' and exists (select 1 from public.posts where id = (split_part(name, '/', 2))::uuid and author_id = auth.uid()));
create policy "Uploaders can remove media" on storage.objects for delete to authenticated using (bucket_id = 'community-media' and owner_id = auth.uid());

create index if not exists communities_type_visibility_idx on public.communities (community_type, visibility, created_at desc);
create index if not exists communities_name_trgm_idx on public.communities using gin (name gin_trgm_ops);
create index if not exists communities_description_trgm_idx on public.communities using gin (description gin_trgm_ops);
create index if not exists memberships_user_status_idx on public.community_memberships (user_id, status, updated_at desc);
create index if not exists memberships_community_status_idx on public.community_memberships (community_id, status, updated_at desc);
create index if not exists posts_community_created_idx on public.posts (community_id, created_at desc);
create index if not exists posts_author_created_idx on public.posts (author_id, created_at desc);
create index if not exists posts_body_trgm_idx on public.posts using gin (body gin_trgm_ops);
create index if not exists comments_post_created_idx on public.comments (post_id, created_at asc);
create index if not exists post_hashtags_hashtag_idx on public.post_hashtags (hashtag_id, post_id);
create index if not exists reports_status_created_idx on public.reports (status, created_at asc);
create index if not exists audit_actor_created_idx on public.moderation_audit_log (actor_id, created_at desc);
