-- Permission-aware recipient lookups + notice visibility for residents.
-- Applied after 039.

create or replace function public.user_ids_with_permission(
  p_society_id uuid,
  p_permission text
)
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select p.id
  from public.profiles p
  where p.society_id = p_society_id
    and p.status = 'active'
    and (
      p.role = 'admin'
      or exists (
        select 1
        from public.society_member_permissions smp
        where smp.user_id = p.id
          and smp.society_id = p_society_id
          and smp.permission = p_permission
      )
    );
$$;

revoke all on function public.user_ids_with_permission(uuid, text) from public;
grant execute on function public.user_ids_with_permission(uuid, text) to authenticated;

comment on function public.user_ids_with_permission(uuid, text) is
  'Active society admins plus members holding the given permission (for push fan-out).';

-- Resident-visible notices: published window + tower targeting vs caller flat.
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

revoke all on function public.fetch_visible_notices(uuid) from public;
grant execute on function public.fetch_visible_notices(uuid) to authenticated;

-- Committee with visitors.manage can read society-wide visitors (update already allowed in 027).
drop policy if exists "Visitor managers can read society visitors" on public.visitors;
create policy "Visitor managers can read society visitors"
  on public.visitors for select
  using (
    society_id = public.current_society_id()
    and public.has_permission('visitors.manage')
  );
