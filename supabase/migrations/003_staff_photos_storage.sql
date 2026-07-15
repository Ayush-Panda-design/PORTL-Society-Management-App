-- Optional: public bucket for staff directory photos
-- Create bucket "staff-photos" in Storage (public), then run:

create policy "Authenticated can upload staff photos"
on storage.objects for insert
to authenticated
with check (bucket_id = 'staff-photos');

create policy "Public can read staff photos"
on storage.objects for select
to public
using (bucket_id = 'staff-photos');

create policy "Authenticated can update staff photos"
on storage.objects for update
to authenticated
using (bucket_id = 'staff-photos');

create policy "Authenticated can delete staff photos"
on storage.objects for delete
to authenticated
using (bucket_id = 'staff-photos');
