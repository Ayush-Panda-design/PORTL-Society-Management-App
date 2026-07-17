-- Paste this ENTIRE script into Supabase → SQL Editor → Run

do $$
declare
  v_guard_id    uuid := '91ecb0c0-e696-4852-be62-a4a99d435874';
  v_resident_id uuid := 'f2cc2ecf-664f-4b8c-8002-0373473d7538';
  v_society_id  uuid;
  v_tower_id    uuid;
  v_flat_id     uuid;
begin
  -- Ensure both auth users exist
  if not exists (select 1 from auth.users where id = v_guard_id) then
    raise exception 'Guard auth user % does not exist. Sign up in the app first.', v_guard_id;
  end if;

  if not exists (select 1 from auth.users where id = v_resident_id) then
    raise exception 'Resident auth user % does not exist. Sign up in the app first.', v_resident_id;
  end if;

  -- Create missing profile rows (users who signed up before the trigger)
  insert into public.profiles (id, role, full_name, society_id, flat_id)
  values (v_guard_id, 'guard', 'Demo Guard', null, null)
  on conflict (id) do nothing;

  insert into public.profiles (id, role, full_name, society_id, flat_id)
  values (v_resident_id, 'resident', 'Demo Resident', null, null)
  on conflict (id) do nothing;

  -- Society / tower / flat
  insert into public.societies (name, address)
  values ('Sunrise Heights', '12 Lake Road, Pune')
  returning id into v_society_id;

  insert into public.towers (society_id, name)
  values (v_society_id, 'Tower A')
  returning id into v_tower_id;

  insert into public.flats (tower_id, number)
  values (v_tower_id, '101')
  returning id into v_flat_id;

  -- Link profiles (active members for demo)
  update public.profiles
  set
    role = 'guard',
    society_id = v_society_id,
    flat_id = null,
    status = 'active',
    full_name = coalesce(nullif(full_name, ''), 'Demo Guard')
  where id = v_guard_id;

  update public.profiles
  set
    role = 'resident',
    society_id = v_society_id,
    flat_id = v_flat_id,
    status = 'active',
    full_name = coalesce(nullif(full_name, ''), 'Demo Resident')
  where id = v_resident_id;

  -- Demo invite codes (regenerate in app if needed)
  insert into public.invite_codes (society_id, role, code)
  values
    (v_society_id, 'resident', 'DEMORES1'),
    (v_society_id, 'guard', 'DEMOGRD1')
  on conflict (society_id, role) do update
    set code = excluded.code, revoked_at = null, created_at = now();

  raise notice 'Seed OK. society=% tower=% flat=% resident_code=DEMORES1 guard_code=DEMOGRD1',
    v_society_id, v_tower_id, v_flat_id;
end $$;
