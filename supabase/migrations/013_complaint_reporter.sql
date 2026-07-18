-- Track who filed each complaint so admins can tell reporters apart
-- when many people file the same category (e.g. Plumbing).

alter table public.complaints
  add column if not exists created_by uuid references public.profiles (id) on delete set null;

create index if not exists complaints_created_by_idx on public.complaints (created_by);
create index if not exists complaints_category_created_at_idx
  on public.complaints (category, created_at desc);
