-- Optional cover images for society notices
alter table public.notices
  add column if not exists cover_url text;
