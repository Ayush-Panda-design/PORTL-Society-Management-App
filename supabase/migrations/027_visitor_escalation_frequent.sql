-- Visitor auto-escalation + frequent visitor quick-approve list.

-- ---------------------------------------------------------------------------
-- Visitors: escalation columns
-- ---------------------------------------------------------------------------

alter table public.visitors
  add column if not exists escalation_level integer not null default 0
    check (escalation_level between 0 and 2),
  add column if not exists escalated_at timestamptz,
  add column if not exists frequent_visitor_id uuid;

-- ---------------------------------------------------------------------------
-- Frequent visitors (cook / driver / regular help)
-- ---------------------------------------------------------------------------

create table if not exists public.frequent_visitors (
  id uuid primary key default gen_random_uuid(),
  society_id uuid not null references public.societies (id) on delete cascade,
  flat_id uuid not null references public.flats (id) on delete cascade,
  name text not null,
  phone text,
  photo_url text,
  type text not null default 'service'
    check (type in ('guest', 'delivery', 'cab', 'service')),
  purpose text,
  visit_count integer not null default 0,
  last_visited_at timestamptz,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (flat_id, name, phone)
);

alter table public.visitors
  drop constraint if exists visitors_frequent_visitor_id_fkey;

alter table public.visitors
  add constraint visitors_frequent_visitor_id_fkey
  foreign key (frequent_visitor_id)
  references public.frequent_visitors (id)
  on delete set null;

create index if not exists frequent_visitors_flat_idx
  on public.frequent_visitors (flat_id);

alter table public.frequent_visitors enable row level security;

drop policy if exists "Flat residents manage frequent visitors" on public.frequent_visitors;
create policy "Flat residents manage frequent visitors"
  on public.frequent_visitors for all
  using (
    society_id = public.current_society_id()
    and (
      (public.is_resident() and flat_id = public.current_flat_id())
      or public.is_admin()
      or public.has_permission('visitors.manage')
    )
  )
  with check (
    society_id = public.current_society_id()
    and (
      (public.is_resident() and flat_id = public.current_flat_id())
      or public.is_admin()
      or public.has_permission('visitors.manage')
    )
  );

drop policy if exists "Guards can read frequent visitors" on public.frequent_visitors;
create policy "Guards can read frequent visitors"
  on public.frequent_visitors for select
  using (
    society_id = public.current_society_id()
    and public.is_guard()
  );

-- Quick-approve: creates an approved visitor from a frequent entry
create or replace function public.quick_approve_frequent_visitor(
  p_frequent_visitor_id uuid,
  p_validity_hours integer default 12
)
returns public.visitors
language plpgsql
security definer
set search_path = public
as $$
declare
  v_fv public.frequent_visitors;
  v_row public.visitors;
  v_hours integer := greatest(1, least(168, coalesce(p_validity_hours, 12)));
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select * into v_fv
  from public.frequent_visitors
  where id = p_frequent_visitor_id
  for update;

  if not found then
    raise exception 'Frequent visitor not found';
  end if;

  if v_fv.society_id is distinct from public.current_society_id() then
    raise exception 'Not in your society';
  end if;

  if public.is_resident() then
    if v_fv.flat_id is distinct from public.current_flat_id() then
      raise exception 'Not your flat';
    end if;
  elsif not (public.is_admin() or public.has_permission('visitors.manage')) then
    raise exception 'Not allowed';
  end if;

  insert into public.visitors (
    name, phone, photo_url, purpose, type, status,
    flat_id, created_by, society_id, expires_at,
    responded_at, frequent_visitor_id
  )
  values (
    v_fv.name,
    v_fv.phone,
    v_fv.photo_url,
    coalesce(v_fv.purpose, 'Frequent visitor'),
    v_fv.type,
    'approved',
    v_fv.flat_id,
    auth.uid(),
    v_fv.society_id,
    now() + make_interval(hours => v_hours),
    now(),
    v_fv.id
  )
  returning * into v_row;

  update public.frequent_visitors
  set
    visit_count = visit_count + 1,
    last_visited_at = now()
  where id = v_fv.id;

  return v_row;
end;
$$;

revoke all on function public.quick_approve_frequent_visitor(uuid, integer) from public;
grant execute on function public.quick_approve_frequent_visitor(uuid, integer) to authenticated;

-- ---------------------------------------------------------------------------
-- Escalation: pending too long → notify flat members (lvl 1) then admins (lvl 2)
-- ---------------------------------------------------------------------------

create or replace function public.escalate_pending_visitors()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.visitors;
  v_minutes integer;
  v_count integer := 0;
begin
  for r in
    select v.*
    from public.visitors v
    where v.status = 'pending'
      and v.escalation_level < 2
    for update skip locked
  loop
    select coalesce(s.visitor_escalation_minutes, 10)
    into v_minutes
    from public.society_settings s
    where s.society_id = r.society_id;

    if not found then
      v_minutes := 10;
    end if;

    -- Level 0 → 1 after N minutes; 1 → 2 after another N minutes from escalated_at
    if r.escalation_level = 0
       and r.created_at < now() - make_interval(mins => v_minutes) then
      update public.visitors
      set
        escalation_level = 1,
        escalated_at = now()
      where id = r.id;
      v_count := v_count + 1;
    elsif r.escalation_level = 1
          and coalesce(r.escalated_at, r.created_at)
              < now() - make_interval(mins => v_minutes) then
      update public.visitors
      set
        escalation_level = 2,
        escalated_at = now()
      where id = r.id;
      v_count := v_count + 1;
    end if;
  end loop;

  return v_count;
end;
$$;

revoke all on function public.escalate_pending_visitors() from public;
revoke all on function public.escalate_pending_visitors() from authenticated;
revoke all on function public.escalate_pending_visitors() from anon;
grant execute on function public.escalate_pending_visitors() to service_role;

do $$
begin
  if to_regprocedure('cron.schedule(text, text, text)') is null then
    raise notice 'pg_cron not available — skip escalate-pending-visitors';
    return;
  end if;

  if exists (select 1 from cron.job where jobname = 'escalate-pending-visitors') then
    perform cron.unschedule('escalate-pending-visitors');
  end if;

  perform cron.schedule(
    'escalate-pending-visitors',
    '*/2 * * * *',
    $cron$select public.escalate_pending_visitors();$cron$
  );
exception
  when undefined_table then
    raise notice 'cron.job not available — skip escalate-pending-visitors';
  when insufficient_privilege then
    raise notice 'Insufficient privilege for pg_cron — skip escalate-pending-visitors';
end;
$$;

-- Broaden admin update policy so visitor managers (committee) can act too.
drop policy if exists "Admins can update society visitors" on public.visitors;
create policy "Admins can update society visitors"
  on public.visitors for update
  using (
    society_id = public.current_society_id()
    and (
      public.is_admin()
      or public.has_permission('visitors.manage')
    )
  )
  with check (
    society_id = public.current_society_id()
    and (
      public.is_admin()
      or public.has_permission('visitors.manage')
    )
  );
