-- Amenity booking overhaul:
-- capacity = concurrent spots per slot, soft-cancel, booking horizon, per-flat limits.

-- ---------------------------------------------------------------------------
-- Amenities: horizon + per-flat cap; capacity becomes enforceable spots
-- ---------------------------------------------------------------------------

alter table public.amenities
  add column if not exists booking_horizon_days integer not null default 7,
  add column if not exists max_active_bookings_per_flat integer not null default 2;

-- Null capacity previously meant "display only"; treat as exclusive-use (1 spot).
update public.amenities
set capacity = 1
where capacity is null;

alter table public.amenities
  alter column capacity set default 1;

alter table public.amenities
  drop constraint if exists amenities_booking_horizon_check;

alter table public.amenities
  add constraint amenities_booking_horizon_check
  check (booking_horizon_days between 1 and 14);

alter table public.amenities
  drop constraint if exists amenities_capacity_positive_check;

alter table public.amenities
  add constraint amenities_capacity_positive_check
  check (capacity is null or capacity >= 1);

alter table public.amenities
  drop constraint if exists amenities_max_active_bookings_check;

alter table public.amenities
  add constraint amenities_max_active_bookings_check
  check (
    max_active_bookings_per_flat is null
    or max_active_bookings_per_flat >= 1
  );

-- ---------------------------------------------------------------------------
-- Bookings: soft-cancel metadata + status check
-- ---------------------------------------------------------------------------

alter table public.amenity_bookings
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists cancelled_at timestamptz,
  add column if not exists booked_by uuid references auth.users (id) on delete set null;

alter table public.amenity_bookings
  drop constraint if exists amenity_bookings_status_check;

alter table public.amenity_bookings
  add constraint amenity_bookings_status_check
  check (status in ('booked', 'cancelled'));

-- Replace exclusive slot lock with: one active booking per flat per slot,
-- and capacity enforced in book_amenity_slot RPC.
alter table public.amenity_bookings
  drop constraint if exists amenity_bookings_amenity_id_date_slot_key;

drop index if exists public.amenity_bookings_active_slot_uidx;
drop index if exists public.amenity_bookings_active_flat_slot_uidx;

create unique index amenity_bookings_active_flat_slot_uidx
  on public.amenity_bookings (amenity_id, date, slot, flat_id)
  where status = 'booked';

create index if not exists amenity_bookings_flat_status_date_idx
  on public.amenity_bookings (flat_id, status, date);

create index if not exists amenity_bookings_amenity_date_status_idx
  on public.amenity_bookings (amenity_id, date, status);

-- ---------------------------------------------------------------------------
-- book_amenity_slot — atomic capacity + horizon + per-flat limit checks
-- ---------------------------------------------------------------------------

create or replace function public.book_amenity_slot(
  p_amenity_id uuid,
  p_flat_id uuid,
  p_date date,
  p_slot text
)
returns public.amenity_bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  v_amenity public.amenities%rowtype;
  v_slots jsonb;
  v_capacity int;
  v_horizon int;
  v_max_active int;
  v_taken int;
  v_active_flat int;
  v_today date := (timezone('utc', now()))::date;
  v_row public.amenity_bookings;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select * into v_amenity from public.amenities where id = p_amenity_id;
  if not found then
    raise exception 'Amenity not found';
  end if;

  if v_amenity.society_id is distinct from public.current_society_id() then
    raise exception 'Amenity is not in your society';
  end if;

  -- Residents book their own flat; admins may book any flat in society.
  if public.is_resident() then
    if p_flat_id is distinct from public.current_flat_id() then
      raise exception 'You can only book for your own flat';
    end if;
  elsif not public.is_admin() then
    raise exception 'Not allowed to book amenities';
  end if;

  if not public.flat_belongs_to_society(p_flat_id, v_amenity.society_id) then
    raise exception 'Flat is not in this society';
  end if;

  if p_slot is null or length(trim(p_slot)) = 0 then
    raise exception 'Slot is required';
  end if;

  v_slots := case jsonb_typeof(v_amenity.slots)
    when 'array' then v_amenity.slots
    when 'string' then coalesce((v_amenity.slots #>> '{}')::jsonb, '[]'::jsonb)
    else '[]'::jsonb
  end;

  if not exists (
    select 1
    from jsonb_array_elements_text(v_slots) as s(slot_label)
    where s.slot_label = p_slot
  ) then
    raise exception 'That slot is not offered for this amenity';
  end if;

  v_horizon := greatest(1, least(14, coalesce(v_amenity.booking_horizon_days, 7)));
  if p_date < v_today then
    raise exception 'Cannot book a past date';
  end if;
  if p_date > (v_today + (v_horizon - 1)) then
    raise exception 'That date is outside the booking window';
  end if;

  v_capacity := greatest(1, coalesce(v_amenity.capacity, 1));
  v_max_active := v_amenity.max_active_bookings_per_flat;

  -- Lock amenity row so concurrent bookers see consistent counts.
  perform 1 from public.amenities where id = p_amenity_id for update;

  select count(*)::int into v_taken
  from public.amenity_bookings
  where amenity_id = p_amenity_id
    and date = p_date
    and slot = p_slot
    and status = 'booked';

  if v_taken >= v_capacity then
    raise exception 'That slot is full';
  end if;

  if exists (
    select 1
    from public.amenity_bookings
    where amenity_id = p_amenity_id
      and date = p_date
      and slot = p_slot
      and flat_id = p_flat_id
      and status = 'booked'
  ) then
    raise exception 'Your flat already booked this slot';
  end if;

  if v_max_active is not null then
    select count(*)::int into v_active_flat
    from public.amenity_bookings
    where amenity_id = p_amenity_id
      and flat_id = p_flat_id
      and status = 'booked'
      and date >= v_today;

    if v_active_flat >= v_max_active then
      raise exception
        'Your flat already has the maximum of % active booking(s) for this amenity',
        v_max_active;
    end if;
  end if;

  insert into public.amenity_bookings (
    amenity_id,
    flat_id,
    date,
    slot,
    status,
    booked_by
  )
  values (
    p_amenity_id,
    p_flat_id,
    p_date,
    p_slot,
    'booked',
    auth.uid()
  )
  returning * into v_row;

  return v_row;
exception
  when unique_violation then
    raise exception 'Your flat already booked this slot';
end;
$$;

revoke all on function public.book_amenity_slot(uuid, uuid, date, text) from public;
grant execute on function public.book_amenity_slot(uuid, uuid, date, text) to authenticated;

-- ---------------------------------------------------------------------------
-- cancel_amenity_booking — soft-cancel; frees capacity for others
-- ---------------------------------------------------------------------------

create or replace function public.cancel_amenity_booking(p_booking_id uuid)
returns public.amenity_bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.amenity_bookings;
  v_society uuid;
  v_today date := (timezone('utc', now()))::date;
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

  select a.society_id into v_society
  from public.amenities a
  where a.id = v_row.amenity_id;

  if v_society is distinct from public.current_society_id() then
    raise exception 'Booking is not in your society';
  end if;

  if public.is_admin() then
    null; -- allowed
  elsif public.is_resident() and v_row.flat_id = public.current_flat_id() then
    null; -- allowed
  else
    raise exception 'Not allowed to cancel this booking';
  end if;

  if v_row.date < v_today then
    raise exception 'Past bookings cannot be cancelled';
  end if;

  update public.amenity_bookings
  set
    status = 'cancelled',
    cancelled_at = timezone('utc', now())
  where id = p_booking_id
  returning * into v_row;

  return v_row;
end;
$$;

revoke all on function public.cancel_amenity_booking(uuid) from public;
grant execute on function public.cancel_amenity_booking(uuid) to authenticated;
