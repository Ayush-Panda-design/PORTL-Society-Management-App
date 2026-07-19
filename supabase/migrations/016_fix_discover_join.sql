-- Ensure society discovery join works the same as invite-code join.
-- Re-applies search / flats / request_join RPCs + grants (safe to run if 015 already applied).

alter table public.societies
  add column if not exists is_discoverable boolean not null default true,
  add column if not exists latitude double precision,
  add column if not exists longitude double precision,
  add column if not exists city text,
  add column if not exists area text;

update public.societies
set is_discoverable = true
where is_discoverable is distinct from true;

-- ---------------------------------------------------------------------------
-- search_societies
-- ---------------------------------------------------------------------------

create or replace function public.search_societies(
  p_query text default '',
  p_limit integer default 20
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_q text := lower(trim(coalesce(p_query, '')));
  v_limit integer := least(greatest(coalesce(p_limit, 20), 1), 50);
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  return coalesce((
    select jsonb_agg(to_jsonb(r))
    from (
      select
        s.id,
        s.name,
        s.address,
        s.city,
        s.area,
        s.latitude,
        s.longitude,
        (
          select count(*)::integer
          from public.profiles p
          where p.society_id = s.id and p.status = 'active'
        ) as member_count,
        exists (
          select 1
          from public.towers t
          join public.flats f on f.tower_id = t.id
          where t.society_id = s.id
        ) as has_flats
      from public.societies s
      where coalesce(s.is_discoverable, true) = true
        and (
          v_q = ''
          or lower(s.name) like '%' || v_q || '%'
          or lower(coalesce(s.address, '')) like '%' || v_q || '%'
          or lower(coalesce(s.city, '')) like '%' || v_q || '%'
          or lower(coalesce(s.area, '')) like '%' || v_q || '%'
        )
      order by
        case when v_q <> '' and lower(s.name) like v_q || '%' then 0 else 1 end,
        s.name
      limit v_limit
    ) r
  ), '[]'::jsonb);
end;
$$;

-- ---------------------------------------------------------------------------
-- get_society_flats
-- ---------------------------------------------------------------------------

create or replace function public.get_society_flats(p_society_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if not exists (
    select 1 from public.societies s
    where s.id = p_society_id and coalesce(s.is_discoverable, true) = true
  ) then
    raise exception 'Society not found or not open for discovery';
  end if;

  return coalesce((
    select jsonb_agg(
      jsonb_build_object(
        'id', f.id,
        'number', f.number,
        'tower_id', t.id,
        'tower_name', t.name
      )
      order by t.name, f.number
    )
    from public.flats f
    join public.towers t on t.id = f.tower_id
    where t.society_id = p_society_id
  ), '[]'::jsonb);
end;
$$;

-- ---------------------------------------------------------------------------
-- request_join_society — same profile pending write as join_society
-- ---------------------------------------------------------------------------

create or replace function public.request_join_society(
  p_society_id uuid,
  p_role text default 'resident',
  p_flat_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_society public.societies%rowtype;
  v_profile public.profiles%rowtype;
  v_flat_ok boolean;
  v_role text := lower(trim(coalesce(p_role, 'resident')));
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  if v_role not in ('resident', 'guard') then
    raise exception 'Role must be resident or guard';
  end if;

  select * into v_profile from public.profiles where id = v_uid;
  if not found then
    raise exception 'Profile not found';
  end if;

  -- Active members cannot hop societies. Rejected users may re-request.
  if v_profile.society_id is not null and v_profile.status = 'active' then
    raise exception 'You already belong to a society';
  end if;

  if v_profile.society_id is not null and v_profile.status = 'pending' then
    raise exception 'Your join request is already pending approval';
  end if;

  select * into v_society
  from public.societies
  where id = p_society_id and coalesce(is_discoverable, true) = true;

  if not found then
    raise exception 'Society not found or not open for discovery';
  end if;

  if v_role = 'resident' then
    if p_flat_id is null then
      raise exception 'Select a flat to join as a resident';
    end if;

    select exists (
      select 1
      from public.flats f
      join public.towers t on t.id = f.tower_id
      where f.id = p_flat_id and t.society_id = v_society.id
    ) into v_flat_ok;

    if not v_flat_ok then
      raise exception 'Flat does not belong to this society';
    end if;
  elsif p_flat_id is not null then
    raise exception 'Guards cannot select a flat';
  end if;

  perform set_config('portl.bypass_profile_guard', 'on', true);

  update public.profiles
  set
    role = v_role,
    society_id = v_society.id,
    status = 'pending',
    flat_id = case when v_role = 'resident' then p_flat_id else null end
  where id = v_uid;

  if not found then
    perform set_config('portl.bypass_profile_guard', 'off', true);
    raise exception 'Could not update profile for join request';
  end if;

  perform set_config('portl.bypass_profile_guard', 'off', true);

  return jsonb_build_object(
    'society_id', v_society.id,
    'society_name', v_society.name,
    'role', v_role,
    'status', 'pending',
    'flat_id', case when v_role = 'resident' then p_flat_id else null end
  );
end;
$$;

grant execute on function public.search_societies(text, integer) to authenticated;
grant execute on function public.get_society_flats(uuid) to authenticated;
grant execute on function public.request_join_society(uuid, text, uuid) to authenticated;

notify pgrst, 'reload schema';
