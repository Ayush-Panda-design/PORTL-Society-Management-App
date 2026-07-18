-- Close onboarding gaps:
-- 1) Invite code expiry + clearer resolve/join errors
-- 2) Society discoverability (search + join without invite)
-- 3) Profile completion helpers stay app-side; storage already allows pre-society avatars

-- ---------------------------------------------------------------------------
-- Invite expiry
-- ---------------------------------------------------------------------------

alter table public.invite_codes
  add column if not exists expires_at timestamptz;

-- Existing invites: 90 days from creation (or now if missing)
update public.invite_codes
set expires_at = coalesce(created_at, now()) + interval '90 days'
where expires_at is null;

alter table public.invite_codes
  alter column expires_at set default (now() + interval '90 days');

-- ---------------------------------------------------------------------------
-- Society discovery fields
-- ---------------------------------------------------------------------------

alter table public.societies
  add column if not exists is_discoverable boolean not null default true,
  add column if not exists latitude double precision,
  add column if not exists longitude double precision,
  add column if not exists city text,
  add column if not exists area text;

create index if not exists societies_discoverable_name_idx
  on public.societies (is_discoverable, name)
  where is_discoverable = true;

create index if not exists societies_city_idx
  on public.societies (city)
  where is_discoverable = true and city is not null;

-- ---------------------------------------------------------------------------
-- Invite helpers: allocate with expiry
-- ---------------------------------------------------------------------------

create or replace function public._insert_unique_invite_code(
  p_society_id uuid,
  p_role text,
  p_created_by uuid
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  candidate text;
  attempts int := 0;
begin
  loop
    attempts := attempts + 1;
    candidate := public.generate_invite_code(8);
    begin
      insert into public.invite_codes (society_id, role, code, created_by, expires_at, revoked_at)
      values (
        p_society_id,
        p_role,
        candidate,
        p_created_by,
        now() + interval '90 days',
        null
      )
      on conflict (society_id, role) do update
        set code = excluded.code,
            created_by = excluded.created_by,
            created_at = now(),
            expires_at = now() + interval '90 days',
            revoked_at = null
      returning code into candidate;
      return candidate;
    exception
      when unique_violation then
        if attempts >= 12 then
          raise exception 'Could not allocate unique invite code';
        end if;
    end;
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- create_society: accept optional city / area / coords
-- ---------------------------------------------------------------------------

create or replace function public.create_society(
  p_name text,
  p_address text,
  p_city text default null,
  p_area text default null,
  p_latitude double precision default null,
  p_longitude double precision default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_society public.societies%rowtype;
  v_resident_code text;
  v_guard_code text;
  v_profile public.profiles%rowtype;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  select * into v_profile from public.profiles where id = v_uid;
  if not found then
    raise exception 'Profile not found';
  end if;

  if v_profile.society_id is not null
     and v_profile.status in ('active', 'pending') then
    raise exception 'You already belong to a society';
  end if;

  if length(trim(p_name)) < 2 then
    raise exception 'Society name is required';
  end if;

  if length(trim(p_address)) < 2 then
    raise exception 'Society address is required';
  end if;

  insert into public.societies (
    name,
    address,
    created_by,
    is_discoverable,
    city,
    area,
    latitude,
    longitude
  )
  values (
    trim(p_name),
    trim(p_address),
    v_uid,
    true,
    nullif(trim(coalesce(p_city, '')), ''),
    nullif(trim(coalesce(p_area, '')), ''),
    p_latitude,
    p_longitude
  )
  returning * into v_society;

  perform set_config('portl.bypass_profile_guard', 'on', true);

  update public.profiles
  set
    role = 'admin',
    society_id = v_society.id,
    status = 'active',
    flat_id = null
  where id = v_uid;

  perform set_config('portl.bypass_profile_guard', 'off', true);

  v_resident_code := public._insert_unique_invite_code(v_society.id, 'resident', v_uid);
  v_guard_code := public._insert_unique_invite_code(v_society.id, 'guard', v_uid);

  return jsonb_build_object(
    'society', jsonb_build_object(
      'id', v_society.id,
      'name', v_society.name,
      'address', v_society.address,
      'created_by', v_society.created_by,
      'created_at', v_society.created_at,
      'city', v_society.city,
      'area', v_society.area,
      'latitude', v_society.latitude,
      'longitude', v_society.longitude,
      'is_discoverable', v_society.is_discoverable
    ),
    'resident_invite_code', v_resident_code,
    'guard_invite_code', v_guard_code
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- resolve_invite_code — distinct expired vs invalid
-- ---------------------------------------------------------------------------

create or replace function public.resolve_invite_code(p_code text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_invite public.invite_codes%rowtype;
  v_society public.societies%rowtype;
  v_flats jsonb;
  v_profile public.profiles%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select * into v_profile from public.profiles where id = auth.uid();

  if v_profile.society_id is not null and v_profile.status = 'active' then
    raise exception 'You already belong to a society';
  end if;

  if v_profile.society_id is not null and v_profile.status = 'pending' then
    raise exception 'Your join request is already pending approval';
  end if;

  select * into v_invite
  from public.invite_codes
  where upper(trim(code)) = upper(trim(p_code));

  if not found then
    raise exception 'Invalid invite code';
  end if;

  if v_invite.revoked_at is not null then
    raise exception 'This invite code is no longer valid. Ask your admin for a new one.';
  end if;

  if v_invite.expires_at is not null and v_invite.expires_at < now() then
    raise exception 'This invite code has expired. Ask your admin to regenerate it.';
  end if;

  select * into v_society from public.societies where id = v_invite.society_id;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', f.id,
      'number', f.number,
      'tower_id', t.id,
      'tower_name', t.name
    )
    order by t.name, f.number
  ), '[]'::jsonb)
  into v_flats
  from public.flats f
  join public.towers t on t.id = f.tower_id
  where t.society_id = v_society.id;

  return jsonb_build_object(
    'society_id', v_society.id,
    'society_name', v_society.name,
    'society_address', v_society.address,
    'role', v_invite.role,
    'expires_at', v_invite.expires_at,
    'flats', v_flats
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- join_society — same expiry / membership messaging
-- ---------------------------------------------------------------------------

create or replace function public.join_society(
  p_code text,
  p_flat_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_invite public.invite_codes%rowtype;
  v_society public.societies%rowtype;
  v_profile public.profiles%rowtype;
  v_flat_ok boolean;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  select * into v_profile from public.profiles where id = v_uid;
  if not found then
    raise exception 'Profile not found';
  end if;

  if v_profile.society_id is not null and v_profile.status = 'active' then
    raise exception 'You already belong to a society';
  end if;

  if v_profile.society_id is not null and v_profile.status = 'pending' then
    raise exception 'Your join request is already pending approval';
  end if;

  select * into v_invite
  from public.invite_codes
  where upper(trim(code)) = upper(trim(p_code));

  if not found then
    raise exception 'Invalid invite code';
  end if;

  if v_invite.revoked_at is not null then
    raise exception 'This invite code is no longer valid. Ask your admin for a new one.';
  end if;

  if v_invite.expires_at is not null and v_invite.expires_at < now() then
    raise exception 'This invite code has expired. Ask your admin to regenerate it.';
  end if;

  select * into v_society from public.societies where id = v_invite.society_id;

  if v_invite.role = 'resident' then
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
    role = v_invite.role,
    society_id = v_society.id,
    status = 'pending',
    flat_id = case when v_invite.role = 'resident' then p_flat_id else null end
  where id = v_uid;

  perform set_config('portl.bypass_profile_guard', 'off', true);

  return jsonb_build_object(
    'society_id', v_society.id,
    'society_name', v_society.name,
    'role', v_invite.role,
    'status', 'pending',
    'flat_id', case when v_invite.role = 'resident' then p_flat_id else null end
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- list_society_invite_codes — include expires_at
-- ---------------------------------------------------------------------------

create or replace function public.list_society_invite_codes()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_society_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if not public.is_admin() then
    raise exception 'Only admins can view invite codes';
  end if;

  v_society_id := public.current_society_id();
  if v_society_id is null then
    raise exception 'Admin is not linked to a society';
  end if;

  return coalesce((
    select jsonb_agg(
      jsonb_build_object(
        'id', ic.id,
        'role', ic.role,
        'code', ic.code,
        'created_at', ic.created_at,
        'expires_at', ic.expires_at,
        'revoked_at', ic.revoked_at
      )
      order by ic.role
    )
    from public.invite_codes ic
    where ic.society_id = v_society_id
      and ic.revoked_at is null
  ), '[]'::jsonb);
end;
$$;

-- ---------------------------------------------------------------------------
-- search_societies — public discovery for authenticated users
-- ---------------------------------------------------------------------------

create or replace function public.search_societies(
  p_query text default '',
  p_limit int default 20
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_q text := lower(trim(coalesce(p_query, '')));
  v_limit int := least(greatest(coalesce(p_limit, 20), 1), 50);
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  return coalesce((
    select jsonb_agg(row_to_json(r)::jsonb)
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
          select count(*)::int
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
      where s.is_discoverable = true
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
-- get_society_flats — for discover join (resident flat picker)
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
    where s.id = p_society_id and s.is_discoverable = true
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
-- request_join_society — join without invite code (still needs admin approval)
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

  if v_profile.society_id is not null and v_profile.status = 'active' then
    raise exception 'You already belong to a society';
  end if;

  if v_profile.society_id is not null and v_profile.status = 'pending' then
    raise exception 'Your join request is already pending approval';
  end if;

  select * into v_society
  from public.societies
  where id = p_society_id and is_discoverable = true;

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

grant execute on function public.create_society(text, text, text, text, double precision, double precision) to authenticated;
grant execute on function public.search_societies(text, int) to authenticated;
grant execute on function public.get_society_flats(uuid) to authenticated;
grant execute on function public.request_join_society(uuid, text, uuid) to authenticated;
