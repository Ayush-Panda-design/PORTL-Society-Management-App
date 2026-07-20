-- Notice categories + acknowledgment / read-receipt tracking for critical notices.

-- ---------------------------------------------------------------------------
-- Notices: category + requires acknowledgment
-- ---------------------------------------------------------------------------

alter table public.notices
  add column if not exists category text not null default 'general'
    check (category in ('urgent', 'general', 'event')),
  add column if not exists requires_ack boolean not null default false;

-- Backfill: treat existing "alert-like" titles as urgent when possible
update public.notices
set category = 'urgent',
    requires_ack = true
where requires_ack = false
  and (
    lower(title) like '%urgent%'
    or lower(title) like '%emergency%'
    or lower(title) like '%shutoff%'
    or lower(title) like '%shut-off%'
    or lower(title) like '%fire drill%'
    or lower(title) like '%evacuate%'
  );

-- ---------------------------------------------------------------------------
-- Acknowledgments (server-side read receipts)
-- ---------------------------------------------------------------------------

create table if not exists public.notice_acknowledgments (
  id uuid primary key default gen_random_uuid(),
  notice_id uuid not null references public.notices (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  acknowledged_at timestamptz not null default now(),
  unique (notice_id, user_id)
);

create index if not exists notice_acknowledgments_notice_idx
  on public.notice_acknowledgments (notice_id);

alter table public.notice_acknowledgments enable row level security;

drop policy if exists "Users can ack notices" on public.notice_acknowledgments;
create policy "Users can ack notices"
  on public.notice_acknowledgments for insert
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.notices n
      where n.id = notice_id
        and n.society_id = public.current_society_id()
    )
  );

drop policy if exists "Users can read own acks" on public.notice_acknowledgments;
create policy "Users can read own acks"
  on public.notice_acknowledgments for select
  using (
    user_id = auth.uid()
    or (
      public.has_permission('notices.manage')
      and exists (
        select 1 from public.notices n
        where n.id = notice_id
          and n.society_id = public.current_society_id()
      )
    )
  );

create or replace function public.acknowledge_notice(p_notice_id uuid)
returns public.notice_acknowledgments
language plpgsql
security definer
set search_path = public
as $$
declare
  v_notice public.notices;
  v_row public.notice_acknowledgments;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select * into v_notice from public.notices where id = p_notice_id;
  if not found then
    raise exception 'Notice not found';
  end if;

  if v_notice.society_id is distinct from public.current_society_id() then
    raise exception 'Notice is not in your society';
  end if;

  insert into public.notice_acknowledgments (notice_id, user_id)
  values (p_notice_id, auth.uid())
  on conflict (notice_id, user_id) do update
    set acknowledged_at = now()
  returning * into v_row;

  return v_row;
end;
$$;

revoke all on function public.acknowledge_notice(uuid) from public;
grant execute on function public.acknowledge_notice(uuid) to authenticated;

create or replace function public.notice_ack_stats(p_notice_id uuid)
returns table (
  acknowledged_count bigint,
  target_count bigint
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_notice public.notices;
begin
  select * into v_notice from public.notices where id = p_notice_id;
  if not found then
    raise exception 'Notice not found';
  end if;

  if v_notice.society_id is distinct from public.current_society_id() then
    raise exception 'Notice is not in your society';
  end if;

  if not public.has_permission('notices.manage') then
    raise exception 'Not allowed';
  end if;

  return query
  select
    (
      select count(*)::bigint
      from public.notice_acknowledgments a
      where a.notice_id = p_notice_id
    ) as acknowledged_count,
    (
      select count(*)::bigint
      from public.profiles p
      where p.society_id = v_notice.society_id
        and p.status = 'active'
        and p.role = 'resident'
        and (
          v_notice.target_audience is null
          or v_notice.target_audience = 'all'
          or (
            v_notice.target_audience = 'tower'
            and exists (
              select 1
              from public.flats f
              where f.id = p.flat_id
                and f.tower_id = v_notice.target_tower_id
            )
          )
        )
    ) as target_count;
end;
$$;

revoke all on function public.notice_ack_stats(uuid) from public;
grant execute on function public.notice_ack_stats(uuid) to authenticated;
