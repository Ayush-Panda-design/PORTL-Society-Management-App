-- Amenity recurring bookings, waitlists, and cancellation penalties → payments.

-- ---------------------------------------------------------------------------
-- Amenity settings for waitlist / cancel penalty / recurring
-- ---------------------------------------------------------------------------

alter table public.amenities
  add column if not exists allow_waitlist boolean not null default true,
  add column if not exists cancel_penalty_paise integer not null default 0
    check (cancel_penalty_paise >= 0),
  add column if not exists cancel_penalty_hours integer not null default 24
    check (cancel_penalty_hours between 0 and 168),
  add column if not exists allow_recurring boolean not null default false;

alter table public.amenity_bookings
  add column if not exists recurring_series_id uuid,
  add column if not exists from_waitlist boolean not null default false;

-- ---------------------------------------------------------------------------
-- Waitlist
-- ---------------------------------------------------------------------------

create table if not exists public.amenity_waitlist (
  id uuid primary key default gen_random_uuid(),
  amenity_id uuid not null references public.amenities (id) on delete cascade,
  flat_id uuid not null references public.flats (id) on delete cascade,
  date date not null,
  slot text not null,
  requested_by uuid references public.profiles (id) on delete set null,
  position integer not null,
  status text not null default 'waiting'
    check (status in ('waiting', 'offered', 'booked', 'cancelled', 'expired')),
  created_at timestamptz not null default now(),
  unique (amenity_id, date, slot, flat_id)
);

create index if not exists amenity_waitlist_slot_idx
  on public.amenity_waitlist (amenity_id, date, slot, status, position);

alter table public.amenity_waitlist enable row level security;

drop policy if exists "Members manage own waitlist" on public.amenity_waitlist;
create policy "Members manage own waitlist"
  on public.amenity_waitlist for all
  using (
    exists (
      select 1 from public.amenities a
      where a.id = amenity_id and a.society_id = public.current_society_id()
    )
    and (
      (public.is_resident() and flat_id = public.current_flat_id())
      or public.is_admin()
      or public.has_permission('amenities.manage')
    )
  )
  with check (
    exists (
      select 1 from public.amenities a
      where a.id = amenity_id and a.society_id = public.current_society_id()
    )
    and (
      (public.is_resident() and flat_id = public.current_flat_id())
      or public.is_admin()
      or public.has_permission('amenities.manage')
    )
  );

create or replace function public.join_amenity_waitlist(
  p_amenity_id uuid,
  p_flat_id uuid,
  p_date date,
  p_slot text
)
returns public.amenity_waitlist
language plpgsql
security definer
set search_path = public
as $$
declare
  v_amenity public.amenities%rowtype;
  v_taken int;
  v_capacity int;
  v_pos int;
  v_row public.amenity_waitlist;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select * into v_amenity from public.amenities where id = p_amenity_id;
  if not found then
    raise exception 'Amenity not found';
  end if;

  if not coalesce(v_amenity.allow_waitlist, true) then
    raise exception 'Waitlist is not enabled for this amenity';
  end if;

  if public.is_resident() and p_flat_id is distinct from public.current_flat_id() then
    raise exception 'You can only join waitlist for your own flat';
  elsif not (public.is_resident() or public.is_admin()) then
    raise exception 'Not allowed';
  end if;

  perform 1 from public.amenities where id = p_amenity_id for update;

  v_capacity := greatest(1, coalesce(v_amenity.capacity, 1));
  select count(*)::int into v_taken
  from public.amenity_bookings
  where amenity_id = p_amenity_id
    and date = p_date
    and slot = p_slot
    and status = 'booked';

  if v_taken < v_capacity then
    raise exception 'Slot still has capacity — book directly';
  end if;

  select coalesce(max(position), 0) + 1 into v_pos
  from public.amenity_waitlist
  where amenity_id = p_amenity_id
    and date = p_date
    and slot = p_slot
    and status = 'waiting';

  insert into public.amenity_waitlist (
    amenity_id, flat_id, date, slot, requested_by, position, status
  )
  values (
    p_amenity_id, p_flat_id, p_date, p_slot, auth.uid(), v_pos, 'waiting'
  )
  on conflict (amenity_id, date, slot, flat_id) do update
    set status = 'waiting',
        position = excluded.position,
        requested_by = auth.uid()
  returning * into v_row;

  return v_row;
end;
$$;

revoke all on function public.join_amenity_waitlist(uuid, uuid, date, text) from public;
grant execute on function public.join_amenity_waitlist(uuid, uuid, date, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Recurring series
-- ---------------------------------------------------------------------------

create table if not exists public.amenity_recurring_series (
  id uuid primary key default gen_random_uuid(),
  amenity_id uuid not null references public.amenities (id) on delete cascade,
  flat_id uuid not null references public.flats (id) on delete cascade,
  slot text not null,
  -- ISO weekday 1=Mon … 7=Sun
  weekday integer not null check (weekday between 1 and 7),
  start_date date not null,
  end_date date,
  created_by uuid references public.profiles (id) on delete set null,
  status text not null default 'active'
    check (status in ('active', 'cancelled')),
  created_at timestamptz not null default now()
);

alter table public.amenity_bookings
  drop constraint if exists amenity_bookings_recurring_series_id_fkey;

alter table public.amenity_bookings
  add constraint amenity_bookings_recurring_series_id_fkey
  foreign key (recurring_series_id)
  references public.amenity_recurring_series (id)
  on delete set null;

alter table public.amenity_recurring_series enable row level security;

drop policy if exists "Members manage recurring series" on public.amenity_recurring_series;
create policy "Members manage recurring series"
  on public.amenity_recurring_series for all
  using (
    exists (
      select 1 from public.amenities a
      where a.id = amenity_id and a.society_id = public.current_society_id()
    )
    and (
      (public.is_resident() and flat_id = public.current_flat_id())
      or public.is_admin()
      or public.has_permission('amenities.manage')
    )
  )
  with check (
    exists (
      select 1 from public.amenities a
      where a.id = amenity_id and a.society_id = public.current_society_id()
    )
    and (
      (public.is_resident() and flat_id = public.current_flat_id())
      or public.is_admin()
      or public.has_permission('amenities.manage')
    )
  );

create or replace function public.create_recurring_amenity_bookings(
  p_amenity_id uuid,
  p_flat_id uuid,
  p_slot text,
  p_weekday integer,
  p_start_date date,
  p_occurrences integer default 4
)
returns public.amenity_recurring_series
language plpgsql
security definer
set search_path = public
as $$
declare
  v_amenity public.amenities%rowtype;
  v_series public.amenity_recurring_series;
  v_count integer := greatest(1, least(12, coalesce(p_occurrences, 4)));
  v_date date;
  v_made integer := 0;
  v_cursor date;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select * into v_amenity from public.amenities where id = p_amenity_id;
  if not found then
    raise exception 'Amenity not found';
  end if;

  if not coalesce(v_amenity.allow_recurring, false) then
    raise exception 'Recurring bookings are not enabled for this amenity';
  end if;

  if public.is_resident() and p_flat_id is distinct from public.current_flat_id() then
    raise exception 'You can only book for your own flat';
  elsif not (public.is_resident() or public.is_admin()) then
    raise exception 'Not allowed';
  end if;

  if p_weekday < 1 or p_weekday > 7 then
    raise exception 'Weekday must be 1–7';
  end if;

  insert into public.amenity_recurring_series (
    amenity_id, flat_id, slot, weekday, start_date, end_date, created_by, status
  )
  values (
    p_amenity_id, p_flat_id, p_slot, p_weekday, p_start_date,
    null, auth.uid(), 'active'
  )
  returning * into v_series;

  -- Advance to first matching weekday on/after start
  v_cursor := p_start_date;
  while extract(isodow from v_cursor)::int <> p_weekday loop
    v_cursor := v_cursor + 1;
  end loop;

  while v_made < v_count loop
    v_date := v_cursor;
    begin
      perform public.book_amenity_slot(p_amenity_id, p_flat_id, v_date, p_slot);
      update public.amenity_bookings
      set recurring_series_id = v_series.id
      where amenity_id = p_amenity_id
        and flat_id = p_flat_id
        and date = v_date
        and slot = p_slot
        and status = 'booked'
        and recurring_series_id is null;
      v_made := v_made + 1;
    exception
      when others then
        -- Skip full / invalid dates; continue series
        null;
    end;
    v_cursor := v_cursor + 7;
  end loop;

  update public.amenity_recurring_series
  set end_date = v_cursor - 7
  where id = v_series.id
  returning * into v_series;

  return v_series;
end;
$$;

revoke all on function public.create_recurring_amenity_bookings(uuid, uuid, text, integer, date, integer) from public;
grant execute on function public.create_recurring_amenity_bookings(uuid, uuid, text, integer, date, integer) to authenticated;

-- ---------------------------------------------------------------------------
-- Cancel with penalty + promote waitlist
-- ---------------------------------------------------------------------------

create or replace function public.cancel_amenity_booking(p_booking_id uuid)
returns public.amenity_bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.amenity_bookings;
  v_amenity public.amenities%rowtype;
  v_today date := (timezone('utc', now()))::date;
  v_slot_start timestamptz;
  v_hours_until numeric;
  v_penalty integer;
  v_wait public.amenity_waitlist;
  v_payer uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select b.* into v_row
  from public.amenity_bookings b
  where b.id = p_booking_id
  for update;

  if not found then
    raise exception 'Booking not found';
  end if;

  if v_row.status = 'cancelled' then
    return v_row;
  end if;

  select * into v_amenity from public.amenities where id = v_row.amenity_id;
  if v_amenity.society_id is distinct from public.current_society_id() then
    raise exception 'Booking is not in your society';
  end if;

  if public.is_admin() or public.has_permission('amenities.manage') then
    null;
  elsif public.is_resident() and v_row.flat_id = public.current_flat_id() then
    null;
  else
    raise exception 'Not allowed to cancel this booking';
  end if;

  if v_row.date < v_today then
    raise exception 'Past bookings cannot be cancelled';
  end if;

  -- Slot start ≈ date + first HH:MM in "HH:MM-HH:MM"
  begin
    v_slot_start := (v_row.date::text || ' ' || split_part(v_row.slot, '-', 1) || ':00')::timestamptz;
  exception
    when others then
      v_slot_start := (v_row.date::timestamp + interval '12 hours') at time zone 'utc';
  end;

  v_hours_until := extract(epoch from (v_slot_start - now())) / 3600.0;
  v_penalty := coalesce(v_amenity.cancel_penalty_paise, 0);

  update public.amenity_bookings
  set
    status = 'cancelled',
    cancelled_at = timezone('utc', now())
  where id = p_booking_id
  returning * into v_row;

  -- Late cancel → fine payment (pending) tied to bookings module
  if v_penalty > 0
     and v_hours_until < coalesce(v_amenity.cancel_penalty_hours, 24)
     and v_hours_until >= 0 then
    select id into v_payer
    from public.profiles
    where flat_id = v_row.flat_id
      and role = 'resident'
      and status = 'active'
    order by created_at
    limit 1;

    if v_payer is not null then
      insert into public.payments (
        society_id, payer_id, purpose, reference_id, amount_paise, status, expires_at
      )
      values (
        v_amenity.society_id,
        v_payer,
        'fine',
        v_row.id,
        v_penalty,
        'pending_payment',
        now() + interval '7 days'
      );
    end if;
  end if;

  -- Promote next waitlisted flat into a booking
  if coalesce(v_amenity.allow_waitlist, true) then
    select * into v_wait
    from public.amenity_waitlist
    where amenity_id = v_row.amenity_id
      and date = v_row.date
      and slot = v_row.slot
      and status = 'waiting'
    order by position
    limit 1
    for update skip locked;

    if found then
      begin
        perform public.book_amenity_slot(
          v_row.amenity_id, v_wait.flat_id, v_row.date, v_row.slot
        );
        update public.amenity_bookings
        set from_waitlist = true
        where amenity_id = v_row.amenity_id
          and flat_id = v_wait.flat_id
          and date = v_row.date
          and slot = v_row.slot
          and status = 'booked';

        update public.amenity_waitlist
        set status = 'booked'
        where id = v_wait.id;
      exception
        when others then
          update public.amenity_waitlist
          set status = 'offered'
          where id = v_wait.id;
      end;
    end if;
  end if;

  return v_row;
end;
$$;

revoke all on function public.cancel_amenity_booking(uuid) from public;
grant execute on function public.cancel_amenity_booking(uuid) to authenticated;
