-- Admin amenity bookings (joined identity + payment), payment RLS, ledger, offline/refund.

-- ---------------------------------------------------------------------------
-- Admins can read society payments (needed for joined booking view + ledger)
-- ---------------------------------------------------------------------------

drop policy if exists "Admins can read society payments" on public.payments;
create policy "Admins can read society payments"
  on public.payments for select
  using (
    society_id = public.current_society_id()
    and (
      public.is_admin()
      or public.has_permission('payments.view')
      or public.has_permission('payments.manage')
    )
  );

-- ---------------------------------------------------------------------------
-- Joined admin booking view (booking + resident + payment)
-- ---------------------------------------------------------------------------

create or replace view public.admin_amenity_bookings_view
with (security_invoker = true)
as
select
  b.id,
  b.amenity_id,
  b.flat_id,
  b.date,
  b.slot,
  b.status,
  b.created_at,
  b.cancelled_at,
  b.booked_by,
  b.recurring_series_id,
  b.from_waitlist,
  am.society_id,
  am.name as amenity_name,
  am.fee_paise as amenity_fee_paise,
  am.cancel_penalty_paise,
  am.cancel_penalty_hours,
  f.number as flat_number,
  t.name as tower_name,
  p.full_name as resident_name,
  p.phone as resident_phone,
  pay.id as payment_id,
  pay.amount_paise,
  pay.paid_paise,
  pay.status as payment_status,
  pay.razorpay_order_id,
  pay.razorpay_payment_id,
  pay.created_at as payment_created_at,
  fine.amount_paise as cancel_penalty_charged_paise,
  fine.status as cancel_penalty_payment_status
from public.amenity_bookings b
inner join public.amenities am on am.id = b.amenity_id
left join public.profiles p on p.id = b.booked_by
left join public.flats f on f.id = b.flat_id
left join public.towers t on t.id = f.tower_id
left join lateral (
  select py.*
  from public.payments py
  where py.reference_id = b.id
    and py.purpose = 'amenity_booking'
  order by py.created_at desc
  limit 1
) pay on true
left join lateral (
  select py.*
  from public.payments py
  where py.reference_id = b.id
    and py.purpose = 'fine'
  order by py.created_at desc
  limit 1
) fine on true;

grant select on public.admin_amenity_bookings_view to authenticated;

-- ---------------------------------------------------------------------------
-- Society payment statement (admin ledger)
-- ---------------------------------------------------------------------------

create or replace function public.fetch_society_payment_statement(
  p_from timestamptz default null,
  p_to timestamptz default null,
  p_purpose text default null
)
returns setof public.payment_ledger
language sql
stable
security definer
set search_path = public
as $$
  select pl.*
  from public.payment_ledger pl
  where pl.society_id = public.current_society_id()
    and (
      public.is_admin()
      or public.has_permission('payments.view')
      or public.has_permission('payments.manage')
    )
    and (p_from is null or pl.created_at >= p_from)
    and (p_to is null or pl.created_at <= p_to)
    and (p_purpose is null or pl.purpose = p_purpose)
  order by pl.created_at desc;
$$;

revoke all on function public.fetch_society_payment_statement(timestamptz, timestamptz, text) from public;
grant execute on function public.fetch_society_payment_statement(timestamptz, timestamptz, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Admin offline confirm + refund
-- ---------------------------------------------------------------------------

alter table public.payments drop constraint if exists payments_status_check;
alter table public.payments
  add constraint payments_status_check
  check (status in (
    'pending_payment',
    'confirmed',
    'expired',
    'failed',
    'partially_paid',
    'refunded'
  ));

create or replace function public.admin_record_offline_payment(
  p_payment_id uuid,
  p_method text default 'cash',
  p_note text default null
)
returns public.payments
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.payments;
  v_method text := coalesce(nullif(trim(p_method), ''), 'cash');
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select * into v_row from public.payments where id = p_payment_id for update;
  if not found then
    raise exception 'Payment not found';
  end if;

  if v_row.society_id is distinct from public.current_society_id() then
    raise exception 'Payment is not in your society';
  end if;

  if not (public.is_admin() or public.has_permission('payments.manage')) then
    raise exception 'Not allowed';
  end if;

  if v_row.status not in ('pending_payment', 'failed', 'expired', 'partially_paid') then
    raise exception 'Payment cannot be marked offline-paid from status %', v_row.status;
  end if;

  update public.payments
  set
    status = 'confirmed',
    paid_paise = v_row.amount_paise,
    razorpay_payment_id = coalesce(
      nullif(trim(v_row.razorpay_payment_id), ''),
      'offline:' || v_row.id::text
    ),
    notes = coalesce(
      p_note,
      'Marked paid offline (' || v_method || ') by admin'
    )
  where id = p_payment_id
  returning * into v_row;

  return v_row;
end;
$$;

revoke all on function public.admin_record_offline_payment(uuid, text, text) from public;
grant execute on function public.admin_record_offline_payment(uuid, text, text) to authenticated;

create or replace function public.admin_refund_payment(
  p_payment_id uuid,
  p_note text default null
)
returns public.payments
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.payments;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select * into v_row from public.payments where id = p_payment_id for update;
  if not found then
    raise exception 'Payment not found';
  end if;

  if v_row.society_id is distinct from public.current_society_id() then
    raise exception 'Payment is not in your society';
  end if;

  if not (public.is_admin() or public.has_permission('payments.manage')) then
    raise exception 'Not allowed';
  end if;

  if v_row.status is distinct from 'confirmed' then
    raise exception 'Only confirmed payments can be refunded';
  end if;

  update public.payments
  set
    status = 'refunded',
    notes = coalesce(p_note, 'Refunded by admin')
  where id = p_payment_id
  returning * into v_row;

  return v_row;
end;
$$;

revoke all on function public.admin_refund_payment(uuid, text) from public;
grant execute on function public.admin_refund_payment(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Amenity revenue snapshot (current calendar month, UTC)
-- ---------------------------------------------------------------------------

create or replace function public.fetch_admin_amenity_revenue(p_society_id uuid)
returns table (
  amenity_id uuid,
  amenity_name text,
  booking_count bigint,
  collected_paise bigint,
  pending_paise bigint,
  failed_or_pending_count bigint
)
language sql
stable
security definer
set search_path = public
as $$
  with month_bounds as (
    select
      date_trunc('month', timezone('utc', now())) as start_at,
      date_trunc('month', timezone('utc', now())) + interval '1 month' as end_at
  ),
  society_amenities as (
    select a.id, a.name
    from public.amenities a
    where a.society_id = p_society_id
  ),
  month_bookings as (
    select b.*
    from public.amenity_bookings b
    inner join society_amenities sa on sa.id = b.amenity_id
    cross join month_bounds mb
    where b.date >= mb.start_at::date
      and b.date < mb.end_at::date
      and b.status = 'booked'
  ),
  month_payments as (
    select py.*
    from public.payments py
    cross join month_bounds mb
    where py.society_id = p_society_id
      and py.purpose = 'amenity_booking'
      and py.created_at >= mb.start_at
      and py.created_at < mb.end_at
  )
  select
    sa.id as amenity_id,
    sa.name as amenity_name,
    (select count(*) from month_bookings mb where mb.amenity_id = sa.id) as booking_count,
    coalesce((
      select sum(mp.amount_paise)::bigint
      from month_payments mp
      inner join public.amenity_bookings ab on ab.id = mp.reference_id
      where ab.amenity_id = sa.id and mp.status = 'confirmed'
    ), 0) as collected_paise,
    coalesce((
      select sum(greatest(mp.amount_paise - coalesce(mp.paid_paise, 0), 0))::bigint
      from month_payments mp
      inner join public.amenity_bookings ab on ab.id = mp.reference_id
      where ab.amenity_id = sa.id
        and mp.status in ('pending_payment', 'failed', 'expired', 'partially_paid')
    ), 0) as pending_paise,
    coalesce((
      select count(*)::bigint
      from month_payments mp
      inner join public.amenity_bookings ab on ab.id = mp.reference_id
      where ab.amenity_id = sa.id
        and mp.status in ('pending_payment', 'failed', 'expired', 'partially_paid')
    ), 0) as failed_or_pending_count
  from society_amenities sa
  where p_society_id = public.current_society_id()
    and (
      public.is_admin()
      or public.has_permission('payments.view')
      or public.has_permission('payments.manage')
      or public.has_permission('amenities.manage')
    );
$$;

revoke all on function public.fetch_admin_amenity_revenue(uuid) from public;
grant execute on function public.fetch_admin_amenity_revenue(uuid) to authenticated;
