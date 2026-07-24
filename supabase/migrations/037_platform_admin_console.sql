-- Platform admin console: bootstrap grant, cross-society read access, analytics RPCs.
-- Membership is still managed only via SQL / service role (plus bootstrap emails below).

-- ---------------------------------------------------------------------------
-- Bootstrap allowlist (DB-side only — never exposed to the client)
-- ---------------------------------------------------------------------------

create table if not exists public.platform_admin_bootstrap_emails (
  email text primary key check (email = lower(trim(email)))
);

alter table public.platform_admin_bootstrap_emails enable row level security;
-- No policies: authenticated clients cannot read or write this table.

insert into public.platform_admin_bootstrap_emails (email)
values ('pandaayush25305@gmail.com')
on conflict do nothing;

create or replace function public.try_bootstrap_platform_admin()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text;
begin
  select lower(trim(u.email))
    into v_email
  from auth.users u
  where u.id = new.id;

  if v_email is not null
     and exists (
       select 1
       from public.platform_admin_bootstrap_emails b
       where b.email = v_email
     )
  then
    insert into public.platform_admins (user_id)
    values (new.id)
    on conflict do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_bootstrap_platform_admin on public.profiles;
create trigger profiles_bootstrap_platform_admin
  after insert on public.profiles
  for each row
  execute function public.try_bootstrap_platform_admin();

-- Grant existing matching accounts immediately.
insert into public.platform_admins (user_id)
select u.id
from auth.users u
join public.platform_admin_bootstrap_emails b
  on lower(trim(u.email)) = b.email
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- Cross-society read policies for platform operators
-- ---------------------------------------------------------------------------

drop policy if exists "Platform admins can read all profiles" on public.profiles;
create policy "Platform admins can read all profiles"
  on public.profiles for select
  using (public.is_platform_admin());

drop policy if exists "Platform admins can read all societies" on public.societies;
create policy "Platform admins can read all societies"
  on public.societies for select
  using (public.is_platform_admin());

drop policy if exists "Platform admins can read all payments" on public.payments;
create policy "Platform admins can read all payments"
  on public.payments for select
  using (public.is_platform_admin());

drop policy if exists "Platform admins can read all visitors" on public.visitors;
create policy "Platform admins can read all visitors"
  on public.visitors for select
  using (public.is_platform_admin());

drop policy if exists "Platform admins can read all complaints" on public.complaints;
create policy "Platform admins can read all complaints"
  on public.complaints for select
  using (public.is_platform_admin());

drop policy if exists "Platform admins can read all amenity bookings" on public.amenity_bookings;
create policy "Platform admins can read all amenity bookings"
  on public.amenity_bookings for select
  using (public.is_platform_admin());

drop policy if exists "Platform admins can read all notices" on public.notices;
create policy "Platform admins can read all notices"
  on public.notices for select
  using (public.is_platform_admin());

drop policy if exists "Platform admins can read all polls" on public.polls;
create policy "Platform admins can read all polls"
  on public.polls for select
  using (public.is_platform_admin());

drop policy if exists "Platform admins can read all towers" on public.towers;
create policy "Platform admins can read all towers"
  on public.towers for select
  using (public.is_platform_admin());

drop policy if exists "Platform admins can read all flats" on public.flats;
create policy "Platform admins can read all flats"
  on public.flats for select
  using (public.is_platform_admin());

drop policy if exists "Platform admins can read all invite codes" on public.invite_codes;
create policy "Platform admins can read all invite codes"
  on public.invite_codes for select
  using (public.is_platform_admin());

drop policy if exists "Platform admins can read all audit logs" on public.audit_logs;
create policy "Platform admins can read all audit logs"
  on public.audit_logs for select
  using (public.is_platform_admin());

do $$
begin
  if to_regclass('public.gates') is not null then
    execute $p$
      drop policy if exists "Platform admins can read all gates" on public.gates;
      create policy "Platform admins can read all gates"
        on public.gates for select
        using (public.is_platform_admin());
    $p$;
  end if;

  if to_regclass('public.broadcasts') is not null then
    execute $p$
      drop policy if exists "Platform admins can read all broadcasts" on public.broadcasts;
      create policy "Platform admins can read all broadcasts"
        on public.broadcasts for select
        using (public.is_platform_admin());
    $p$;
  end if;

  if to_regclass('public.staff_directory') is not null then
    execute $p$
      drop policy if exists "Platform admins can read all staff" on public.staff_directory;
      create policy "Platform admins can read all staff"
        on public.staff_directory for select
        using (public.is_platform_admin());
    $p$;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Console RPCs (security definer — includes auth.users email)
-- ---------------------------------------------------------------------------

create or replace function public.platform_console_stats()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_payments_paid bigint := 0;
  v_payments_pending bigint := 0;
  v_revenue_paise bigint := 0;
begin
  if auth.uid() is null or not public.is_platform_admin() then
    raise exception 'Not a platform admin';
  end if;

  select
    count(*) filter (where status = 'confirmed'),
    count(*) filter (where status = 'pending_payment'),
    coalesce(sum(amount_paise) filter (where status = 'confirmed'), 0)
  into v_payments_paid, v_payments_pending, v_revenue_paise
  from public.payments;

  return jsonb_build_object(
    'societies', (select count(*)::int from public.societies),
    'users', (select count(*)::int from public.profiles),
    'users_active', (
      select count(*)::int from public.profiles where status = 'active' and society_id is not null
    ),
    'users_pending', (
      select count(*)::int from public.profiles where status = 'pending'
    ),
    'admins', (select count(*)::int from public.profiles where role = 'admin'),
    'guards', (select count(*)::int from public.profiles where role = 'guard'),
    'residents', (select count(*)::int from public.profiles where role = 'resident'),
    'visitors', (select count(*)::int from public.visitors),
    'complaints_open', (
      select count(*)::int from public.complaints where status in ('open', 'in_progress')
    ),
    'complaints_total', (select count(*)::int from public.complaints),
    'amenity_bookings', (select count(*)::int from public.amenity_bookings),
    'notices', (select count(*)::int from public.notices),
    'payments_paid', v_payments_paid::int,
    'payments_pending', v_payments_pending::int,
    'revenue_paise', v_revenue_paise
  );
end;
$$;

create or replace function public.platform_console_users(
  p_limit integer default 200,
  p_offset integer default 0
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_limit integer := greatest(1, least(coalesce(p_limit, 200), 500));
  v_offset integer := greatest(0, coalesce(p_offset, 0));
begin
  if auth.uid() is null or not public.is_platform_admin() then
    raise exception 'Not a platform admin';
  end if;

  return coalesce(
    (
      select jsonb_agg(row_to_json(t)::jsonb order by t.created_at desc)
      from (
        select
          p.id,
          p.full_name,
          p.role,
          p.status,
          p.phone,
          p.society_id,
          p.flat_id,
          p.avatar_url,
          p.created_at,
          s.name as society_name,
          u.email,
          exists (
            select 1 from public.platform_admins pa where pa.user_id = p.id
          ) as is_platform_admin
        from public.profiles p
        left join public.societies s on s.id = p.society_id
        left join auth.users u on u.id = p.id
        order by p.created_at desc
        limit v_limit
        offset v_offset
      ) t
    ),
    '[]'::jsonb
  );
end;
$$;

create or replace function public.platform_console_societies(
  p_limit integer default 100,
  p_offset integer default 0
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_limit integer := greatest(1, least(coalesce(p_limit, 100), 300));
  v_offset integer := greatest(0, coalesce(p_offset, 0));
begin
  if auth.uid() is null or not public.is_platform_admin() then
    raise exception 'Not a platform admin';
  end if;

  return coalesce(
    (
      select jsonb_agg(row_to_json(t)::jsonb order by t.created_at desc nulls last)
      from (
        select
          s.id,
          s.name,
          s.address,
          s.city,
          s.area,
          s.is_discoverable,
          s.created_at,
          (
            select count(*)::int
            from public.profiles p
            where p.society_id = s.id
          ) as member_count,
          (
            select count(*)::int
            from public.profiles p
            where p.society_id = s.id and p.role = 'admin'
          ) as admin_count
        from public.societies s
        order by s.created_at desc nulls last
        limit v_limit
        offset v_offset
      ) t
    ),
    '[]'::jsonb
  );
end;
$$;

revoke all on function public.platform_console_stats() from public;
revoke all on function public.platform_console_users(integer, integer) from public;
revoke all on function public.platform_console_societies(integer, integer) from public;

grant execute on function public.platform_console_stats() to authenticated;
grant execute on function public.platform_console_users(integer, integer) to authenticated;
grant execute on function public.platform_console_societies(integer, integer) to authenticated;
