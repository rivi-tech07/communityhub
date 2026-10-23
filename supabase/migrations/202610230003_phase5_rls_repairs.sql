drop policy if exists "Users can register businesses" on public.businesses;
create policy "Users can register businesses" on public.businesses
for insert to authenticated
with check ((select auth.uid()) = owner_id);

drop policy if exists "Users register once with capacity" on public.event_registrations;
create policy "Users register once with capacity" on public.event_registrations
for insert to authenticated
with check (
  (select auth.uid()) = user_id
  and exists (
    select 1
    from public.events e
    where e.id = event_id
      and e.status = 'published'
      and e.ends_at >= timezone('utc', now())
  )
);
