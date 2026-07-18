-- Amenity cover image + richer facility fields.
-- cover_url is optional; clients fall back to stock images when null.

alter table public.amenities
  add column if not exists cover_url text,
  add column if not exists is_featured boolean not null default false,
  add column if not exists location text,
  add column if not exists capacity integer,
  add column if not exists rules text;

create index if not exists amenities_society_featured_idx
  on public.amenities (society_id, is_featured desc, name);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'amenity-covers',
  'amenity-covers',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "amenity_covers_insert" on storage.objects;
create policy "amenity_covers_insert"
on storage.objects for insert to authenticated/*+/////////////////////////////
with check (bucket_id = 'amenity-covers');

drop policy if exists "amenity_covers_select" on storage.objects;
create policy "amenity_covers_select"
on storage.objects for select to public
using (bucket_id = 'amenity-covers');

drop policy if exists "amenity_covers_update" on storage.objects;
create policy "amenity_covers_update"
on storage.objects for update to authenticated
using (bucket_id = 'amenity-covers');

drop policy if exists "amenity_covers_delete" on storage.objects;
create policy "amenity_covers_delete"
on storage.objects for delete to authenticated
using (bucket_id = 'amenity-covers');
