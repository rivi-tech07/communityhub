create policy "Anyone can browse public communities"
on public.communities for select to anon
using (visibility = 'public');

create policy "Anyone can browse public posts"
on public.posts for select to anon
using (
  removed_at is null
  and exists (
    select 1 from public.communities c
    where c.id = community_id and c.visibility = 'public'
  )
);

create policy "Anyone can browse public comments"
on public.comments for select to anon
using (
  removed_at is null
  and exists (
    select 1
    from public.posts p
    join public.communities c on c.id = p.community_id
    where p.id = post_id and p.removed_at is null and c.visibility = 'public'
  )
);

create policy "Authors and moderators can delete posts"
on public.posts for delete to authenticated
using (author_id = auth.uid() or public.can_moderate_post(id));

create policy "Comment authors and moderators can delete comments"
on public.comments for delete to authenticated
using (author_id = auth.uid() or public.can_moderate_post(post_id));
