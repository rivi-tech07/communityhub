drop policy if exists "Verified businesses are public" on public.businesses;
create policy "Verified businesses are public" on public.businesses
for select to anon, authenticated
using (
  (verification_status = 'verified' and is_published = true)
  or (select auth.uid()) = owner_id
  or public.has_role('moderator')
  or public.has_role('administrator')
);
