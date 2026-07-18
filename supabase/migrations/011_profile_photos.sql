-- Profile photos: public on profiles (visible to society admins/members).
-- Storage bucket for self-serve avatar uploads.

alter table public.profiles
  add column if not exists avatar_url text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'profile-photos',
  'profile-photos',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "profile_photos_insert" on storage.objects;
create policy "profile_photos_insert"
on storage.objects for insert to authenticated
with check (bucket_id = 'profile-photos');

drop policy if exists "profile_photos_select" on storage.objects;
create policy "profile_photos_select"
on storage.objects for select to public
using (bucket_id = 'profile-photos');

drop policy if exists "profile_photos_update" on storage.objects;
create policy "profile_photos_update"
on storage.objects for update to authenticated
using (bucket_id = 'profile-photos');

drop policy if exists "profile_photos_delete" on storage.objects;
create policy "profile_photos_delete"
on storage.objects for delete to authenticated
using (bucket_id = 'profile-photos');
