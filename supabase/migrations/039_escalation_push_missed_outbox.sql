-- Push outbox for cron-driven visitor escalation + waitlist promote.
-- Mark missed visitors when pending expires unanswered.

-- ---------------------------------------------------------------------------
-- push_outbox
-- ---------------------------------------------------------------------------

create table if not exists public.push_outbox (
  id uuid primary key default gen_random_uuid(),
  society_id uuid not null references public.societies (id) on delete cascade,
  user_ids uuid[] not null default '{}',
  title text not null,
  body text not null,
  data jsonb not null default '{}'::jsonb,
  channel_id text,
  category_id text,
  created_at timestamptz not null default now(),
  processed_at timestamptz,
  error text
);

create index if not exists push_outbox_pending_idx
  on public.push_outbox (created_at)
  where processed_at is null;

alter table public.push_outbox enable row level security;
-- No client policies — service_role / security definer only.

create or replace function public.enqueue_push(
  p_society_id uuid,
  p_user_ids uuid[],
  p_title text,
  p_body text,
  p_data jsonb default '{}'::jsonb,
  p_channel_id text default null,
  p_category_id text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_ids uuid[] := array(
    select distinct x
    from unnest(coalesce(p_user_ids, '{}'::uuid[])) as x
    where x is not null
  );
begin
  if p_society_id is null or cardinality(v_ids) = 0 then
    return null;
  end if;

  insert into public.push_outbox (
    society_id, user_ids, title, body, data, channel_id, category_id
  )
  values (
    p_society_id,
    v_ids,
    p_title,
    p_body,
    coalesce(p_data, '{}'::jsonb),
    p_channel_id,
    p_category_id
  )
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.enqueue_push(uuid, uuid[], text, text, jsonb, text, text) from public;
grant execute on function public.enqueue_push(uuid, uuid[], text, text, jsonb, text, text) to service_role;

-- ---------------------------------------------------------------------------
-- escalate_pending_visitors — bump level + enqueue re-notify + mark missed @ L2
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
  v_recipients uuid[];
  v_title text;
  v_body text;
  v_new_level integer;
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

    v_new_level := null;

    if r.escalation_level = 0
       and r.created_at < now() - make_interval(mins => v_minutes) then
      v_new_level := 1;
      update public.visitors
      set
        escalation_level = 1,
        escalated_at = now()
      where id = r.id;
      v_count := v_count + 1;
    elsif r.escalation_level = 1
          and coalesce(r.escalated_at, r.created_at)
              < now() - make_interval(mins => v_minutes) then
      v_new_level := 2;
      update public.visitors
      set
        escalation_level = 2,
        escalated_at = now(),
        is_missed = true
      where id = r.id;
      v_count := v_count + 1;
    end if;

    if v_new_level is null then
      continue;
    end if;

    if v_new_level = 1 then
      select coalesce(array_agg(p.id), '{}'::uuid[])
      into v_recipients
      from public.profiles p
      where p.flat_id = r.flat_id
        and p.society_id = r.society_id
        and p.status = 'active'
        and p.role in ('resident', 'admin');

      v_title := 'Visitor still waiting';
      v_body := r.name || ' is still at the gate — please approve or reject.';
    else
      select coalesce(array_agg(p.id), '{}'::uuid[])
      into v_recipients
      from public.profiles p
      where p.society_id = r.society_id
        and p.status = 'active'
        and (
          p.role = 'admin'
          or exists (
            select 1
            from public.society_member_permissions smp
            where smp.user_id = p.id
              and smp.society_id = r.society_id
              and smp.permission = 'visitors.manage'
          )
        );

      v_title := 'Visitor escalated';
      v_body := r.name || ' was missed by the flat — committee/admin follow-up needed.';
    end if;

    perform public.enqueue_push(
      r.society_id,
      v_recipients,
      v_title,
      v_body,
      jsonb_build_object(
        'type', 'visitor_escalated',
        'visitorId', r.id,
        'flatId', r.flat_id,
        'societyId', r.society_id,
        'visitorName', r.name,
        'escalationLevel', v_new_level
      ),
      'visitor',
      case when v_new_level = 1 then 'visitor_pending' else null end
    );
  end loop;

  return v_count;
end;
$$;

revoke all on function public.escalate_pending_visitors() from public;
revoke all on function public.escalate_pending_visitors() from authenticated;
revoke all on function public.escalate_pending_visitors() from anon;
grant execute on function public.escalate_pending_visitors() to service_role;

-- ---------------------------------------------------------------------------
-- mark_missed_expired_visitors — pending past expires_at
-- ---------------------------------------------------------------------------

create or replace function public.mark_missed_expired_visitors()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  with updated as (
    update public.visitors
    set is_missed = true
    where status = 'pending'
      and coalesce(is_missed, false) = false
      and expires_at is not null
      and expires_at < now()
    returning id
  )
  select count(*)::integer into v_count from updated;

  return coalesce(v_count, 0);
end;
$$;

revoke all on function public.mark_missed_expired_visitors() from public;
grant execute on function public.mark_missed_expired_visitors() to service_role;

do $$
begin
  if to_regprocedure('cron.schedule(text, text, text)') is null then
    raise notice 'pg_cron not available — skip mark-missed-expired-visitors';
    return;
  end if;

  if exists (select 1 from cron.job where jobname = 'mark-missed-expired-visitors') then
    perform cron.unschedule('mark-missed-expired-visitors');
  end if;

  perform cron.schedule(
    'mark-missed-expired-visitors',
    '*/5 * * * *',
    $cron$select public.mark_missed_expired_visitors();$cron$
  );
exception
  when undefined_table then
    raise notice 'cron.job not available — skip mark-missed-expired-visitors';
  when insufficient_privilege then
    raise notice 'Insufficient privilege for pg_cron — skip mark-missed-expired-visitors';
end;
$$;

-- ---------------------------------------------------------------------------
-- Waitlist promote → push outbox (trigger)
-- ---------------------------------------------------------------------------

create or replace function public.amenity_waitlist_push_on_promote()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_society uuid;
  v_amenity_name text;
  v_user uuid;
begin
  if tg_op <> 'UPDATE' then
    return new;
  end if;

  if new.status not in ('booked', 'offered') then
    return new;
  end if;

  if old.status is not distinct from new.status then
    return new;
  end if;

  if old.status <> 'waiting' then
    return new;
  end if;

  v_user := new.requested_by;
  if v_user is null then
    select p.id into v_user
    from public.profiles p
    where p.flat_id = new.flat_id
      and p.status = 'active'
    order by case when p.role = 'resident' then 0 else 1 end
    limit 1;
  end if;

  if v_user is null then
    return new;
  end if;

  select a.society_id, a.name
  into v_society, v_amenity_name
  from public.amenities a
  where a.id = new.amenity_id;

  if v_society is null then
    return new;
  end if;

  perform public.enqueue_push(
    v_society,
    array[v_user],
    case
      when new.status = 'booked' then 'Waitlist booked'
      else 'Waitlist slot available'
    end,
    coalesce(v_amenity_name, 'Amenity')
      || ' · '
      || new.date::text
      || ' '
      || new.slot
      || case
           when new.status = 'booked' then ' — you were promoted from the waitlist.'
           else ' — open Amenities to confirm.'
         end,
    jsonb_build_object(
      'type', 'amenity_waitlist',
      'societyId', v_society,
      'amenityId', new.amenity_id,
      'status', new.status
    ),
    'default',
    null
  );

  return new;
end;
$$;

drop trigger if exists amenity_waitlist_push_on_promote on public.amenity_waitlist;
create trigger amenity_waitlist_push_on_promote
  after update on public.amenity_waitlist
  for each row
  execute function public.amenity_waitlist_push_on_promote();

-- ---------------------------------------------------------------------------
-- Claim helpers for edge dispatcher (service_role)
-- ---------------------------------------------------------------------------

create or replace function public.claim_push_outbox(p_limit integer default 50)
returns setof public.push_outbox
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  with picked as (
    select id
    from public.push_outbox
    where processed_at is null
    order by created_at asc
    limit greatest(coalesce(p_limit, 50), 1)
    for update skip locked
  )
  select o.*
  from public.push_outbox o
  join picked p on p.id = o.id;
end;
$$;

revoke all on function public.claim_push_outbox(integer) from public;
grant execute on function public.claim_push_outbox(integer) to service_role;

create or replace function public.mark_push_outbox_processed(
  p_id uuid,
  p_error text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.push_outbox
  set
    processed_at = now(),
    error = p_error
  where id = p_id;
end;
$$;

revoke all on function public.mark_push_outbox_processed(uuid, text) from public;
grant execute on function public.mark_push_outbox_processed(uuid, text) to service_role;
