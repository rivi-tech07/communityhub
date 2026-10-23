insert into storage.buckets (id, name, public)
values ('profile-media', 'profile-media', true)
on conflict (id) do update set public = true;

drop policy if exists "Anyone can read profile media" on storage.objects;
create policy "Anyone can read profile media"
on storage.objects for select
using (bucket_id = 'profile-media');

drop policy if exists "Users can upload their profile media" on storage.objects;
create policy "Users can upload their profile media"
on storage.objects for insert to authenticated
with check (bucket_id = 'profile-media' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Users can update their profile media" on storage.objects;
create policy "Users can update their profile media"
on storage.objects for update to authenticated
using (bucket_id = 'profile-media' and (storage.foldername(name))[1] = auth.uid()::text)
with check (bucket_id = 'profile-media' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Users can delete their profile media" on storage.objects;
create policy "Users can delete their profile media"
on storage.objects for delete to authenticated
using (bucket_id = 'profile-media' and (storage.foldername(name))[1] = auth.uid()::text);
