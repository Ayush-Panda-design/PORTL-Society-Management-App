-- Lightweight permissions (committee roles) + audit log for admin accountability.
-- Keeps profiles.role as resident/guard/admin; grants are additive permission keys.

-- ---------------------------------------------------------------------------
-- Society settings (escalation timers, etc.)
-- ---------------------------------------------------------------------------

create table if not exists public.society_settings (
  society_id uuid primary key references public.societies (id) on delete cascade,
  visitor_escalation_minutes integer not null default 10
    check (visitor_escalation_minutes between 1 and 180),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.society_settings enable row level security;

drop policy if exists "Members can read society settings" on public.society_settings;
create policy "Members can read society settings"
  on public.society_settings for select
  using (society_id = public.current_society_id());

drop policy if exists "Admins can upsert society settings" on public.society_settings;
create policy "Admins can upsert society settings"
  on public.society_settings for all
  using (society_id = public.current_society_id() and public.is_admin())
  with check (society_id = public.current_society_id() and public.is_admin());

-- ---------------------------------------------------------------------------
-- Member permissions (committee / treasurer / secretary style)
-- ---------------------------------------------------------------------------

create table if not exists public.society_member_permissions (
  id uuid primary key default gen_random_uuid(),
  society_id uuid not null references public.societies (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  permission text not null
    check (permission in (
      'notices.manage',
      'polls.manage',
      'complaints.manage',
      'payments.manage',
      'payments.view',
      'audit.view',
      'visitors.manage',
      'flats.manage',
      'members.review',
      'amenities.manage'
    )),
  granted_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (society_id, user_id, permission)
);

create index if not exists society_member_permissions_user_idx
  on public.society_member_permissions (user_id, society_id);

alter table public.society_member_permissions enable row level security;

drop policy if exists "Members can read own permissions" on public.society_member_permissions;
create policy "Members can read own permissions"
  on public.society_member_permissions for select
  using (
    society_id = public.current_society_id()
    and (
      user_id = auth.uid()
      or public.is_admin()
    )
  );

drop policy if exists "Admins manage permissions" on public.society_member_permissions;
create policy "Admins manage permissions"
  on public.society_member_permissions for all
  using (society_id = public.current_society_id() and public.is_admin())
  with check (society_id = public.current_society_id() and public.is_admin());

create or replace function public.has_permission(p_permission text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.is_admin()
    or exists (
      select 1
      from public.society_member_permissions p
      where p.user_id = auth.uid()
        and p.society_id = public.current_society_id()
        and p.permission = p_permission
    );
$$;

revoke all on function public.has_permission(text) from public;
grant execute on function public.has_permission(text) to authenticated;

-- Preset role bundles for RWA committee roles
create or replace function public.grant_committee_role(
  p_user_id uuid,
  p_role text
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_society uuid := public.current_society_id();
  v_perms text[];
  v_perm text;
  v_count integer := 0;
begin
  if not public.is_admin() then
    raise exception 'Only admins can grant committee roles';
  end if;

  if p_role = 'secretary' then
    v_perms := array[
      'notices.manage', 'polls.manage', 'members.review', 'audit.view'
    ];
  elsif p_role = 'treasurer' then
    v_perms := array[
      'payments.manage', 'payments.view', 'audit.view', 'amenities.manage'
    ];
  elsif p_role = 'committee' then
    v_perms := array[
      'notices.manage', 'polls.manage', 'complaints.manage',
      'visitors.manage', 'audit.view'
    ];
  else
    raise exception 'Unknown committee role';
  end if;

  foreach v_perm in array v_perms loop
    insert into public.society_member_permissions (
      society_id, user_id, permission, granted_by
    )
    values (v_society, p_user_id, v_perm, auth.uid())
    on conflict (society_id, user_id, permission) do nothing;
    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

revoke all on function public.grant_committee_role(uuid, text) from public;
grant execute on function public.grant_committee_role(uuid, text) to authenticated;

-- Allow committee secretaries to manage notices / polls (alongside admins)
drop policy if exists "Admins can insert notices" on public.notices;
create policy "Managers can insert notices"
  on public.notices for insert
  with check (
    society_id = public.current_society_id()
    and public.has_permission('notices.manage')
  );

drop policy if exists "Admins can update notices" on public.notices;
create policy "Managers can update notices"
  on public.notices for update
  using (
    society_id = public.current_society_id()
    and public.has_permission('notices.manage')
  )
  with check (
    society_id = public.current_society_id()
    and public.has_permission('notices.manage')
  );

drop policy if exists "Admins can delete notices" on public.notices;
create policy "Managers can delete notices"
  on public.notices for delete
  using (
    society_id = public.current_society_id()
    and public.has_permission('notices.manage')
  );

drop policy if exists "Admins can insert polls" on public.polls;
create policy "Managers can insert polls"
  on public.polls for insert
  with check (
    society_id = public.current_society_id()
    and public.has_permission('polls.manage')
  );

drop policy if exists "Admins can update polls" on public.polls;
create policy "Managers can update polls"
  on public.polls for update
  using (
    society_id = public.current_society_id()
    and public.has_permission('polls.manage')
  )
  with check (
    society_id = public.current_society_id()
    and public.has_permission('polls.manage')
  );

drop policy if exists "Admins can delete polls" on public.polls;
create policy "Managers can delete polls"
  on public.polls for delete
  using (
    society_id = public.current_society_id()
    and public.has_permission('polls.manage')
  );

-- ---------------------------------------------------------------------------
-- Audit log
-- ---------------------------------------------------------------------------

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  society_id uuid not null references public.societies (id) on delete cascade,
  actor_id uuid references public.profiles (id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists audit_logs_society_created_idx
  on public.audit_logs (society_id, created_at desc);

create index if not exists audit_logs_entity_idx
  on public.audit_logs (entity_type, entity_id);

alter table public.audit_logs enable row level security;

drop policy if exists "Admins and auditors can read audit logs" on public.audit_logs;
create policy "Admins and auditors can read audit logs"
  on public.audit_logs for select
  using (
    society_id = public.current_society_id()
    and public.has_permission('audit.view')
  );

-- Inserts only via security definer helper (no direct client inserts)
create or replace function public.log_audit(
  p_action text,
  p_entity_type text,
  p_entity_id uuid default null,
  p_metadata jsonb default '{}'::jsonb,
  p_society_id uuid default null
)
returns public.audit_logs
language plpgsql
security definer
set search_path = public
as $$
declare
  v_society uuid := coalesce(p_society_id, public.current_society_id());
  v_row public.audit_logs;
begin
  if v_society is null then
    raise exception 'Society required for audit log';
  end if;

  insert into public.audit_logs (
    society_id, actor_id, action, entity_type, entity_id, metadata
  )
  values (
    v_society,
    auth.uid(),
    p_action,
    p_entity_type,
    p_entity_id,
    coalesce(p_metadata, '{}'::jsonb)
  )
  returning * into v_row;

  return v_row;
end;
$$;

revoke all on function public.log_audit(text, text, uuid, jsonb, uuid) from public;
grant execute on function public.log_audit(text, text, uuid, jsonb, uuid) to authenticated;
grant execute on function public.log_audit(text, text, uuid, jsonb, uuid) to service_role;

-- Generic AFTER trigger helper for key admin tables
create or replace function public.audit_row_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_society uuid;
  v_entity_id uuid;
  v_action text;
  v_meta jsonb;
  v_row jsonb;
  v_flat_id uuid;
  v_tower_id uuid;
begin
  if tg_op = 'DELETE' then
    v_row := to_jsonb(old);
    v_entity_id := old.id;
    v_action := tg_argv[0] || '.delete';
    v_meta := v_row;
  elsif tg_op = 'INSERT' then
    v_row := to_jsonb(new);
    v_entity_id := new.id;
    v_action := tg_argv[0] || '.create';
    v_meta := v_row;
  else
    v_row := to_jsonb(new);
    v_entity_id := new.id;
    v_action := tg_argv[0] || '.update';
    v_meta := jsonb_build_object('old', to_jsonb(old), 'new', v_row);
  end if;

  -- Resolve society via jsonb so this trigger is safe on tables that lack
  -- tower_id / flat_id / society_id (avoids: record "new" has no field "tower_id")
  if v_row ? 'society_id' and nullif(v_row ->> 'society_id', '') is not null then
    v_society := (v_row ->> 'society_id')::uuid;
  elsif tg_argv[0] = 'complaint' then
    v_flat_id := nullif(v_row ->> 'flat_id', '')::uuid;
    if v_flat_id is not null then
      v_society := public.complaint_society_id(v_flat_id);
    end if;
  elsif tg_argv[0] = 'flat' then
    v_tower_id := nullif(v_row ->> 'tower_id', '')::uuid;
    if v_tower_id is not null then
      select t.society_id into v_society
      from public.towers t
      where t.id = v_tower_id;
    end if;
  else
    v_society := public.current_society_id();
  end if;

  if v_society is null then
    return coalesce(new, old);
  end if;

  -- Only log when an authenticated actor is present (skip system/cron noise)
  if auth.uid() is null then
    return coalesce(new, old);
  end if;

  insert into public.audit_logs (
    society_id, actor_id, action, entity_type, entity_id, metadata
  )
  values (
    v_society,
    auth.uid(),
    v_action,
    tg_argv[0],
    v_entity_id,
    v_meta
  );

  return coalesce(new, old);
end;
$$;

drop trigger if exists audit_notices on public.notices;
create trigger audit_notices
  after insert or update or delete on public.notices
  for each row execute function public.audit_row_change('notice');

drop trigger if exists audit_complaints on public.complaints;
create trigger audit_complaints
  after insert or update or delete on public.complaints
  for each row execute function public.audit_row_change('complaint');

drop trigger if exists audit_flats on public.flats;
create trigger audit_flats
  after insert or update or delete on public.flats
  for each row execute function public.audit_row_change('flat');

drop trigger if exists audit_visitors_admin on public.visitors;
create trigger audit_visitors_admin
  after update on public.visitors
  for each row
  when (old.status is distinct from new.status)
  execute function public.audit_row_change('visitor');
