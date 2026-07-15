-- Optional: public bucket for notice cover images
-- Create bucket "notice-covers" in Storage (public), then run:

create policy "notice_covers_insert"
on storage.objects for insert to authenticated
with check (bucket_id = 'notice-covers');

create policy "notice_covers_select"
on storage.objects for select to public
using (bucket_id = 'notice-covers');

create policy "notice_covers_update"
on storage.objects for update to authenticated
using (bucket_id = 'notice-covers');

create policy "notice_covers_delete"
on storage.objects for delete to authenticated
using (bucket_id = 'notice-covers');
