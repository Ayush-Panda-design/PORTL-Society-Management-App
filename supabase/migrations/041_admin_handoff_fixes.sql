-- Fix society-admin ↔ committee / resident handoffs after 040.

-- 1) Secretaries with members.review can approve/reject joins.
create or replace function public.review_join_request(
  p_user_id uuid,
  p_approve boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_target public.profiles%rowtype;
  v_society_id uuid;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  if not (public.is_admin() or public.has_permission('members.review')) then
    raise exception 'Only admins or members with members.review can review join requests';
  end if;

  v_society_id := public.current_society_id();
  if v_society_id is null then
    raise exception 'Reviewer is not linked to a society';
  end if;

  select * into v_target from public.profiles where id = p_user_id;
  if not found then
    raise exception 'Member not found';
  end if;

  if v_target.society_id is distinct from v_society_id then
    raise exception 'Member is not in your society';
  end if;

  if v_target.status is distinct from 'pending' then
    raise exception 'Member is not pending approval';
  end if;

  if v_target.role = 'admin' then
    raise exception 'Cannot review admin membership via this flow';
  end if;

  perform set_config('portl.bypass_profile_guard', 'on', true);

  if p_approve then
    update public.profiles
    set status = 'active'
    where id = p_user_id;
  else
    update public.profiles
    set
      status = 'rejected',
      society_id = null,
      flat_id = null
    where id = p_user_id;
  end if;

  perform set_config('portl.bypass_profile_guard', 'off', true);

  return jsonb_build_object(
    'user_id', p_user_id,
    'status', case when p_approve then 'active' else 'rejected' end
  );
end;
$$;

revoke all on function public.review_join_request(uuid, boolean) from public;
grant execute on function public.review_join_request(uuid, boolean) to authenticated;

-- 2) flats.manage holders can CRUD flats (matches client committee link).
drop policy if exists "Admins can insert flats" on public.flats;
create policy "Admins can insert flats"
  on public.flats for insert
  with check (
    (public.is_admin() or public.has_permission('flats.manage'))
    and exists (
      select 1 from public.towers t
      where t.id = tower_id and t.society_id = public.current_society_id()
    )
  );

drop policy if exists "Admins can update flats" on public.flats;
create policy "Admins can update flats"
  on public.flats for update
  using (
    (public.is_admin() or public.has_permission('flats.manage'))
    and exists (
      select 1 from public.towers t
      where t.id = flats.tower_id and t.society_id = public.current_society_id()
    )
  )
  with check (
    (public.is_admin() or public.has_permission('flats.manage'))
    and exists (
      select 1 from public.towers t
      where t.id = tower_id and t.society_id = public.current_society_id()
    )
  );

drop policy if exists "Admins can delete flats" on public.flats;
create policy "Admins can delete flats"
  on public.flats for delete
  using (
    (public.is_admin() or public.has_permission('flats.manage'))
    and exists (
      select 1 from public.towers t
      where t.id = flats.tower_id and t.society_id = public.current_society_id()
    )
  );

-- 3) Resident IDs for a tower (tower-targeted notice pushes).
create or replace function public.user_ids_for_tower(
  p_society_id uuid,
  p_tower_id uuid
)
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select p.id
  from public.profiles p
  join public.flats f on f.id = p.flat_id
  where p.society_id = p_society_id
    and p.role = 'resident'
    and p.status = 'active'
    and f.tower_id = p_tower_id;
$$;

revoke all on function public.user_ids_for_tower(uuid, uuid) from public;
grant execute on function public.user_ids_for_tower(uuid, uuid) to authenticated;
