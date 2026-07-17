-- Multi-tenant society onboarding: invite codes, membership status, RPCs.
-- Create/join flow mirrors Slack/Notion workspace + WhatsApp invite links.

-- ---------------------------------------------------------------------------
-- Schema
-- ---------------------------------------------------------------------------

alter table public.societies
  add column if not exists created_by uuid references public.profiles (id) on delete set null,
  add column if not exists created_at timestamptz not null default now();

alter table public.profiles
  add column if not exists status text not null default 'active'
    check (status in ('pending', 'active', 'rejected'));

-- Existing rows stay active; new signups without a society are 'active' until they join,
-- then join RPC sets pending. Creators are set active by create_society.

create table if not exists public.invite_codes (
  id uuid primary key default gen_random_uuid(),
  society_id uuid not null references public.societies (id) on delete cascade,
  role text not null check (role in ('resident', 'guard')),
  code text not null,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  revoked_at timestamptz,
  constraint invite_codes_code_unique unique (code),
  constraint invite_codes_society_role_unique unique (society_id, role)
);

create index if not exists invite_codes_society_id_idx on public.invite_codes (society_id);
create index if not exists invite_codes_code_idx on public.invite_codes (code)
  where revoked_at is null;
create index if not exists profiles_status_idx on public.profiles (status);

-- ---------------------------------------------------------------------------
-- Helpers: membership must be active for role-gated access
-- ---------------------------------------------------------------------------

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin' and status = 'active'
  );
$$;

create or replace function public.is_guard()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'guard' and status = 'active'
  );
$$;

create or replace function public.is_resident()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'resident' and status = 'active'
  );
$$;

-- ---------------------------------------------------------------------------
-- Lock down self-service privilege fields on profiles
-- ---------------------------------------------------------------------------

create or replace function public.enforce_profile_update_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- RPCs / triggers run as definer and set this local flag to bypass.
  if current_setting('portl.bypass_profile_guard', true) = 'on' then
    return new;
  end if;

  if auth.uid() is null then
    return new;
  end if;

  -- Admins may manage members in their society (including approve/reject & flat assign).
  if public.is_admin()
     and old.society_id is not distinct from public.current_society_id()
     and new.society_id is not distinct from old.society_id then
    -- Admins cannot change their own role/status via client to escalate others oddly,
    -- but may update other members' status, flat_id, and role (for co-admin promotion).
    if old.id = auth.uid() then
      if new.role is distinct from old.role
         or new.status is distinct from old.status
         or new.society_id is distinct from old.society_id then
        raise exception 'Admins cannot change their own membership fields';
      end if;
    end if;
    return new;
  end if;

  -- Everyone else: only safe self fields.
  if new.id = auth.uid() then
    if new.role is distinct from old.role
       or new.status is distinct from old.status
       or new.society_id is distinct from old.society_id
       or new.flat_id is distinct from old.flat_id then
      raise exception 'Use onboarding RPCs to change society membership';
    end if;
    return new;
  end if;

  raise exception 'Not allowed to update this profile';
end;
$$;

drop trigger if exists profiles_update_guard on public.profiles;
create trigger profiles_update_guard
  before update on public.profiles
  for each row execute function public.enforce_profile_update_guard();

-- Tighten self-update policy: still allow own row, guard enforces columns.
-- (Policy itself stays; trigger is the real lock.)

-- ---------------------------------------------------------------------------
-- Signup trigger: no society/role bootstrap from metadata admin abuse
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  meta_role text;
begin
  meta_role := coalesce(new.raw_user_meta_data->>'role', 'resident');
  if meta_role not in ('resident', 'guard') then
    meta_role := 'resident';
  end if;

  insert into public.profiles (id, role, full_name, phone, society_id, status)
  values (
    new.id,
    meta_role,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'phone',
    null,
    'active'
  );
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Invite code generation
-- ---------------------------------------------------------------------------

create or replace function public.generate_invite_code(p_length int default 8)
returns text
language plpgsql
volatile
set search_path = public
as $$
declare
  alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result text := '';
  i int;
begin
  for i in 1..p_length loop
    result := result || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
  end loop;
  return result;
end;
$$;

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
      insert into public.invite_codes (society_id, role, code, created_by)
      values (p_society_id, p_role, candidate, p_created_by)
      on conflict (society_id, role) do update
        set code = excluded.code,
            created_by = excluded.created_by,
            created_at = now(),
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
-- RPC: create_society
-- ---------------------------------------------------------------------------

create or replace function public.create_society(
  p_name text,
  p_address text
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

  insert into public.societies (name, address, created_by)
  values (trim(p_name), trim(p_address), v_uid)
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
      'created_at', v_society.created_at
    ),
    'resident_invite_code', v_resident_code,
    'guard_invite_code', v_guard_code
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- RPC: resolve_invite_code (preview before join; returns flats for residents)
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
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select * into v_invite
  from public.invite_codes
  where upper(trim(code)) = upper(trim(p_code))
    and revoked_at is null;

  if not found then
    raise exception 'Invalid invite code';
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
    'flats', v_flats
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- RPC: join_society
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
  where upper(trim(code)) = upper(trim(p_code))
    and revoked_at is null;

  if not found then
    raise exception 'Invalid invite code';
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
-- RPC: review_join_request (admin approve / reject)
-- ---------------------------------------------------------------------------

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

  if not public.is_admin() then
    raise exception 'Only admins can review join requests';
  end if;

  v_society_id := public.current_society_id();
  if v_society_id is null then
    raise exception 'Admin is not linked to a society';
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

-- ---------------------------------------------------------------------------
-- RPC: regenerate_invite_code
-- ---------------------------------------------------------------------------

create or replace function public.regenerate_invite_code(p_role text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_society_id uuid;
  v_code text;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  if not public.is_admin() then
    raise exception 'Only admins can regenerate invite codes';
  end if;

  if p_role not in ('resident', 'guard') then
    raise exception 'Role must be resident or guard';
  end if;

  v_society_id := public.current_society_id();
  if v_society_id is null then
    raise exception 'Admin is not linked to a society';
  end if;

  v_code := public._insert_unique_invite_code(v_society_id, p_role, v_uid);

  return jsonb_build_object(
    'role', p_role,
    'code', v_code
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- RPC: list_society_invite_codes
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
  v_result jsonb;
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

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', ic.id,
      'role', ic.role,
      'code', ic.code,
      'created_at', ic.created_at,
      'revoked_at', ic.revoked_at
    )
    order by ic.role
  ), '[]'::jsonb)
  into v_result
  from public.invite_codes ic
  where ic.society_id = v_society_id
    and ic.revoked_at is null;

  return v_result;
end;
$$;

-- ---------------------------------------------------------------------------
-- RLS: invite_codes (admins only; lookups go through RPCs)
-- ---------------------------------------------------------------------------

alter table public.invite_codes enable row level security;

drop policy if exists "Admins can read society invite codes" on public.invite_codes;
create policy "Admins can read society invite codes"
  on public.invite_codes for select
  using (
    society_id = public.current_society_id()
    and public.is_admin()
  );

-- No direct insert/update/delete for clients — RPCs only.

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------

grant execute on function public.create_society(text, text) to authenticated;
grant execute on function public.resolve_invite_code(text) to authenticated;
grant execute on function public.join_society(text, uuid) to authenticated;
grant execute on function public.review_join_request(uuid, boolean) to authenticated;
grant execute on function public.regenerate_invite_code(text) to authenticated;
grant execute on function public.list_society_invite_codes() to authenticated;

-- generate_invite_code / _insert_unique_invite_code stay internal (security definer callers)
revoke all on function public.generate_invite_code(int) from public, anon, authenticated;
revoke all on function public._insert_unique_invite_code(uuid, text, uuid) from public, anon, authenticated;
