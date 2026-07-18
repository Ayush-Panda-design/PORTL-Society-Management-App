-- Backfill reporter on older complaints from the resident linked to that flat.
-- (Complaints filed before created_by existed show as "Unknown resident" otherwise.)

update public.complaints c
set created_by = sub.id
from (
  select distinct on (flat_id)
    id,
    flat_id
  from public.profiles
  where role = 'resident'
    and flat_id is not null
    and coalesce(status, 'active') = 'active'
  order by flat_id, created_at asc
) sub
where c.created_by is null
  and c.flat_id = sub.flat_id;
