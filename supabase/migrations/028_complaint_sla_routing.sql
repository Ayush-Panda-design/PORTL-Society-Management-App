-- Complaint SLA timers, category auto-routing, reopen + satisfaction rating.

-- ---------------------------------------------------------------------------
-- SLA defaults per priority (hours until due)
-- ---------------------------------------------------------------------------

create table if not exists public.complaint_sla_policies (
  society_id uuid not null references public.societies (id) on delete cascade,
  priority text not null
    check (priority in ('low', 'medium', 'high', 'critical')),
  resolve_within_hours integer not null check (resolve_within_hours between 1 and 720),
  primary key (society_id, priority)
);

alter table public.complaint_sla_policies enable row level security;

drop policy if exists "Members can read SLA policies" on public.complaint_sla_policies;
create policy "Members can read SLA policies"
  on public.complaint_sla_policies for select
  using (society_id = public.current_society_id());

drop policy if exists "Admins manage SLA policies" on public.complaint_sla_policies;
create policy "Admins manage SLA policies"
  on public.complaint_sla_policies for all
  using (society_id = public.current_society_id() and public.is_admin())
  with check (society_id = public.current_society_id() and public.is_admin());

-- Category → staff / profile routing
create table if not exists public.complaint_category_routing (
  id uuid primary key default gen_random_uuid(),
  society_id uuid not null references public.societies (id) on delete cascade,
  category text not null,
  assignee_id uuid references public.profiles (id) on delete set null,
  unique (society_id, category)
);

alter table public.complaint_category_routing enable row level security;

drop policy if exists "Members can read complaint routing" on public.complaint_category_routing;
create policy "Members can read complaint routing"
  on public.complaint_category_routing for select
  using (society_id = public.current_society_id());

drop policy if exists "Admins manage complaint routing" on public.complaint_category_routing;
create policy "Admins manage complaint routing"
  on public.complaint_category_routing for all
  using (society_id = public.current_society_id() and public.is_admin())
  with check (society_id = public.current_society_id() and public.is_admin());

-- ---------------------------------------------------------------------------
-- Complaints: SLA + reopen + rating columns
-- ---------------------------------------------------------------------------

alter table public.complaints
  drop constraint if exists complaints_status_check;

alter table public.complaints
  add column if not exists sla_due_at timestamptz,
  add column if not exists resolved_at timestamptz,
  add column if not exists reopened_at timestamptz,
  add column if not exists reopen_count integer not null default 0,
  add column if not exists satisfaction_rating integer
    check (satisfaction_rating is null or satisfaction_rating between 1 and 5),
  add column if not exists satisfaction_comment text,
  add column if not exists rated_at timestamptz;

-- Allow reopened as a first-class status (still open work)
do $$
begin
  alter table public.complaints
    add constraint complaints_status_check
    check (status in ('open', 'in_progress', 'resolved', 'reopened'));
exception
  when duplicate_object then null;
end;
$$;

create or replace function public.seed_default_complaint_slas(p_society_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.complaint_sla_policies (society_id, priority, resolve_within_hours)
  values
    (p_society_id, 'low', 168),
    (p_society_id, 'medium', 72),
    (p_society_id, 'high', 24),
    (p_society_id, 'critical', 8)
  on conflict (society_id, priority) do nothing;
end;
$$;

revoke all on function public.seed_default_complaint_slas(uuid) from public;
grant execute on function public.seed_default_complaint_slas(uuid) to authenticated;

-- On insert: set SLA due + auto-assign from category routing
create or replace function public.complaints_before_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_society uuid;
  v_hours integer;
  v_assignee uuid;
  v_priority text := coalesce(new.priority, 'medium');
begin
  v_society := public.complaint_society_id(new.flat_id);

  perform public.seed_default_complaint_slas(v_society);

  select resolve_within_hours into v_hours
  from public.complaint_sla_policies
  where society_id = v_society and priority = v_priority;

  if v_hours is not null then
    new.sla_due_at := now() + make_interval(hours => v_hours);
  end if;

  if new.assigned_to is null then
    select assignee_id into v_assignee
    from public.complaint_category_routing
    where society_id = v_society
      and lower(category) = lower(new.category);

    if v_assignee is not null then
      new.assigned_to := v_assignee;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists complaints_before_insert on public.complaints;
create trigger complaints_before_insert
  before insert on public.complaints
  for each row execute function public.complaints_before_insert();

create or replace function public.complaints_before_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_society uuid;
  v_hours integer;
begin
  if old.status is distinct from new.status then
    if new.status = 'resolved' and old.status is distinct from 'resolved' then
      new.resolved_at := now();
    end if;
    if new.status = 'reopened' then
      new.reopened_at := now();
      new.reopen_count := coalesce(old.reopen_count, 0) + 1;
      new.resolved_at := null;
      new.satisfaction_rating := null;
      new.satisfaction_comment := null;
      new.rated_at := null;
      v_society := public.complaint_society_id(new.flat_id);
      select resolve_within_hours into v_hours
      from public.complaint_sla_policies
      where society_id = v_society
        and priority = coalesce(new.priority, 'medium');
      if v_hours is not null then
        new.sla_due_at := now() + make_interval(hours => v_hours);
      end if;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists complaints_before_update on public.complaints;
create trigger complaints_before_update
  before update on public.complaints
  for each row execute function public.complaints_before_update();

-- Resident reopen + satisfaction rating RPCs
create or replace function public.reopen_complaint(
  p_complaint_id uuid,
  p_reason text default null
)
returns public.complaints
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.complaints;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select * into v_row from public.complaints where id = p_complaint_id for update;
  if not found then
    raise exception 'Complaint not found';
  end if;

  if not (
    (public.is_resident() and v_row.flat_id = public.current_flat_id())
    or public.is_admin()
    or public.has_permission('complaints.manage')
  ) then
    raise exception 'Not allowed to reopen';
  end if;

  if v_row.status is distinct from 'resolved' then
    raise exception 'Only resolved complaints can be reopened';
  end if;

  update public.complaints
  set status = 'reopened'
  where id = p_complaint_id
  returning * into v_row;

  if p_reason is not null and length(trim(p_reason)) > 0 then
    insert into public.complaint_comments (complaint_id, author_id, content)
    values (p_complaint_id, auth.uid(), 'Reopened: ' || trim(p_reason));
  end if;

  perform public.log_audit(
    'complaint.reopen',
    'complaint',
    p_complaint_id,
    jsonb_build_object('reason', p_reason),
    public.complaint_society_id(v_row.flat_id)
  );

  return v_row;
end;
$$;

revoke all on function public.reopen_complaint(uuid, text) from public;
grant execute on function public.reopen_complaint(uuid, text) to authenticated;

create or replace function public.rate_complaint(
  p_complaint_id uuid,
  p_rating integer,
  p_comment text default null
)
returns public.complaints
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.complaints;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if p_rating is null or p_rating < 1 or p_rating > 5 then
    raise exception 'Rating must be 1–5';
  end if;

  select * into v_row from public.complaints where id = p_complaint_id for update;
  if not found then
    raise exception 'Complaint not found';
  end if;

  if not (public.is_resident() and v_row.flat_id = public.current_flat_id()) then
    raise exception 'Only the reporting flat can rate';
  end if;

  if v_row.status is distinct from 'resolved' then
    raise exception 'Rate only after resolution';
  end if;

  if v_row.satisfaction_rating is not null then
    raise exception 'Already rated';
  end if;

  update public.complaints
  set
    satisfaction_rating = p_rating,
    satisfaction_comment = nullif(trim(coalesce(p_comment, '')), ''),
    rated_at = now()
  where id = p_complaint_id
  returning * into v_row;

  return v_row;
end;
$$;

revoke all on function public.rate_complaint(uuid, integer, text) from public;
grant execute on function public.rate_complaint(uuid, integer, text) to authenticated;
