-- Guards should see all published society notices at the desk (no flat/tower filter).

create or replace function public.fetch_visible_notices(p_society_id uuid)
returns setof public.notices
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_tower uuid;
  v_role text;
begin
  if v_uid is null then
    return;
  end if;

  select pr.role, f.tower_id
    into v_role, v_tower
  from public.profiles pr
  left join public.flats f on f.id = pr.flat_id
  where pr.id = v_uid
    and pr.society_id = p_society_id;

  if v_role is null then
    return;
  end if;

  -- Admins / committee with notices.manage see everything for the society.
  if v_role = 'admin' or public.has_permission('notices.manage') then
    return query
      select n.*
      from public.notices n
      where n.society_id = p_society_id
      order by n.created_at desc;
    return;
  end if;

  -- Security desk: all published notices (tower targeting is for residents).
  if v_role = 'guard' then
    return query
      select n.*
      from public.notices n
      where n.society_id = p_society_id
        and (n.publish_at is null or n.publish_at <= now())
        and (n.expires_at is null or n.expires_at > now())
      order by n.created_at desc;
    return;
  end if;

  return query
    select n.*
    from public.notices n
    where n.society_id = p_society_id
      and (n.publish_at is null or n.publish_at <= now())
      and (n.expires_at is null or n.expires_at > now())
      and (
        n.target_audience is null
        or n.target_audience = 'all'
        or n.target_tower_id is null
        or (n.target_audience = 'tower' and n.target_tower_id = v_tower)
      )
    order by n.created_at desc;
end;
$$;
